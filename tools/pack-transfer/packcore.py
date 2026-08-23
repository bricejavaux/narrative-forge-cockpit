"""
Coeur de l'outil de transfert de packs vers le 3GS.

Aucune interface ici : validation, conversion, inventaire distant, envoi et
suppression. La ligne de commande (packcli.py) et la fenetre (packgui.py)
appellent les memes fonctions et recoivent leurs messages par le meme
rappel `log`, pour qu'aucune des deux ne puisse deriver de l'autre.
"""

import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile

import packtransport

HOST = packtransport.DEFAULT_HOST

# ------------------------------------------------------------------ #
# Deux points d'injection, et deux seulement                          #
# ------------------------------------------------------------------ #
#
# Le reste de ce module est inchange : la validation, la conversion, la
# protection du bundle et le refus de doublon ont ete eprouves sur l'appareil
# et n'avaient aucune raison d'etre reecrits. Seules deux hypotheses ne
# tenaient plus pour une application Windows autoporteuse :
#
#   1. « ffmpeg est dans le PATH ». Faux pour un .exe unique : le binaire est
#      livre a cote de l'application et appele par son chemin.
#   2. « les binaires ssh et scp existent ». Faux aussi : Windows n'en a pas
#      forcement, et un outil autoporteur ne peut pas l'exiger. D'ou un
#      transport interchangeable (packtransport).
#
# Les deux defauts conservent le comportement historique, donc packcli.py et
# packgui.py continuent de fonctionner sous WSL sans modification.

FFMPEG_BINARY = None      # None -> recherche dans le PATH
TRANSPORT = None          # None -> binaires ssh/scp du systeme


def ffmpeg_path():
    """Chemin du binaire ffmpeg utilisable, ou None."""
    if FFMPEG_BINARY:
        return FFMPEG_BINARY if os.path.isfile(FFMPEG_BINARY) else None

    return shutil.which("ffmpeg")


def default_transport():
    global TRANSPORT

    if TRANSPORT is None:
        TRANSPORT = packtransport.SystemTransport(HOST)

    return TRANSPORT

# Emplacements possibles sur l'appareil.
#
# Documents est le defaut, et ce n'est pas un detail : un pack pose dans le
# bundle est efface au prochain `make package install` (le .deb remplace tout
# le .app), et l'app ne peut pas l'en supprimer — /Applications appartient a
# root alors que l'app tourne en mobile. Documents survit aux reinstallations
# et alimente la suppression par appui long deja en place.
TARGETS = {
    "documents": "/var/mobile/Documents/packs",
    "bundle": "/Applications/LunyUI.app/packs",
}
DEFAULT_TARGET = "documents"

AUDIO_TO_CONVERT = (".ogg", ".oga")
IMAGE_TO_CONVERT = (".bmp",)


def human(size):
    for unit in ("o", "Ko", "Mo"):
        if size < 1024 or unit == "Mo":
            return "%.0f %s" % (size, unit) if unit == "o" else "%.1f %s" % (size, unit)
        size /= 1024.0


def have(binary):
    return shutil.which(binary) is not None


# ------------------------------------------------------------------ #
# Validation                                                          #
# ------------------------------------------------------------------ #

def validate_pack(pack_dir, log):
    """Retourne le dict story.json, ou None si le pack est inexploitable."""
    story_path = os.path.join(pack_dir, "story.json")

    if not os.path.isfile(story_path):
        log("ECHEC validation : story.json absent de %s" % pack_dir)
        return None

    try:
        with open(story_path, encoding="utf-8") as handle:
            story = json.load(handle)
    except ValueError as error:
        log("ECHEC validation : story.json illisible (%s)" % error)
        return None

    if not isinstance(story, dict):
        log("ECHEC validation : la racine de story.json n'est pas un objet")
        return None

    stages = story.get("stageNodes") or []
    log("validation OK : %d noeud(s), titre %r, version %s"
        % (len(stages), story.get("title"), story.get("version")))

    if story.get("version") is None:
        log("  attention : champ \"version\" absent — le moteur refusera ce pack")

    return story


def referenced_assets(story):
    names = set()
    for stage in story.get("stageNodes") or []:
        for key in ("image", "audio"):
            value = stage.get(key)
            if value:
                names.add(value)
    return names


# ------------------------------------------------------------------ #
# Conversion                                                          #
# ------------------------------------------------------------------ #

def _run(cmd):
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return proc.returncode, proc.stdout.decode("utf-8", "replace")


def _convert_audio(src, dst, log):
    binaire = ffmpeg_path()

    if binaire is None:
        log("  ffmpeg absent : %s laisse tel quel" % os.path.basename(src))
        return False

    code, output = _run([binaire, "-y", "-loglevel", "error",
                         "-i", src, "-codec:a", "libmp3lame", "-b:a", "96k", dst])

    if code != 0 or not os.path.exists(dst) or os.path.getsize(dst) == 0:
        detail = output.strip().splitlines()
        log("  ECHEC conversion audio : %s — %s"
            % (os.path.basename(src), detail[-1] if detail else "ffmpeg code %d" % code))
        if os.path.exists(dst):
            os.remove(dst)
        return False

    return True


def _convert_image(src, dst, log):
    try:
        from PIL import Image
    except ImportError:
        Image = None

    if Image is not None:
        try:
            Image.open(src).convert("RGB").save(dst, "PNG")
            return True
        except Exception as error:
            log("  ECHEC conversion image (Pillow) : %s — %s"
                % (os.path.basename(src), error))
            return False

    binaire = ffmpeg_path()

    if binaire is None:
        log("  ni Pillow ni ffmpeg : %s laisse tel quel" % os.path.basename(src))
        return False

    code, output = _run([binaire, "-y", "-loglevel", "error", "-i", src, dst])

    if code != 0 or not os.path.exists(dst) or os.path.getsize(dst) == 0:
        detail = output.strip().splitlines()
        log("  ECHEC conversion image : %s — %s"
            % (os.path.basename(src), detail[-1] if detail else "ffmpeg code %d" % code))
        if os.path.exists(dst):
            os.remove(dst)
        return False

    return True


def convert_pack(pack_dir, build_root, log):
    """
    Ecrit une copie convertie dans build_root/<nom>/ et retourne son chemin.

    L'entree n'est jamais modifiee. Un fichier dont la conversion echoue est
    recopie tel quel et sa reference laissee intacte : le pack reste
    exploitable, simplement muet pour cette piste. C'est le comportement
    voulu — un Ogg corrompu ne doit pas faire echouer tout le transfert.
    """
    story = validate_pack(pack_dir, log)
    if story is None:
        return None

    name = os.path.basename(os.path.normpath(pack_dir))
    out_dir = os.path.join(build_root, name)

    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(os.path.join(out_dir, "assets"), exist_ok=True)

    src_assets = os.path.join(pack_dir, "assets")
    renames = {}
    converted = failed = copied = 0

    if os.path.isdir(src_assets):
        for filename in sorted(os.listdir(src_assets)):
            src = os.path.join(src_assets, filename)
            if not os.path.isfile(src):
                continue

            stem, ext = os.path.splitext(filename)
            lower = ext.lower()
            before = os.path.getsize(src)

            if lower in AUDIO_TO_CONVERT:
                target = stem + ".mp3"
                dst = os.path.join(out_dir, "assets", target)
                if before == 0:
                    log("  IGNORE : %s fait 0 octet, rien a convertir" % filename)
                    shutil.copyfile(src, os.path.join(out_dir, "assets", filename))
                    failed += 1
                    continue
                if _convert_audio(src, dst, log):
                    after = os.path.getsize(dst)
                    log("  converti : %s (%s) -> %s (%s)"
                        % (filename, human(before), target, human(after)))
                    renames[filename] = target
                    converted += 1
                else:
                    shutil.copyfile(src, os.path.join(out_dir, "assets", filename))
                    failed += 1

            elif lower in IMAGE_TO_CONVERT:
                target = stem + ".png"
                dst = os.path.join(out_dir, "assets", target)
                if _convert_image(src, dst, log):
                    after = os.path.getsize(dst)
                    log("  converti : %s (%s) -> %s (%s)"
                        % (filename, human(before), target, human(after)))
                    renames[filename] = target
                    converted += 1
                else:
                    shutil.copyfile(src, os.path.join(out_dir, "assets", filename))
                    failed += 1

            else:
                shutil.copyfile(src, os.path.join(out_dir, "assets", filename))
                copied += 1

    # Reecriture des references, en memoire uniquement.
    for stage in story.get("stageNodes") or []:
        for key in ("image", "audio"):
            value = stage.get(key)
            if value in renames:
                stage[key] = renames[value]

    with open(os.path.join(out_dir, "story.json"), "w", encoding="utf-8") as handle:
        json.dump(story, handle, indent=4, ensure_ascii=False)
        handle.write("\n")

    log("CONVERSION terminee : %d converti(s), %d echec(s), %d copie(s) tel(s) quel(s)"
        % (converted, failed, copied))

    missing = referenced_assets(story) - set(os.listdir(os.path.join(out_dir, "assets")))
    if missing:
        log("  attention : reference(s) sans fichier -> %s" % ", ".join(sorted(missing)))

    return out_dir


def extract_zip(zip_path, work_root, log):
    """Extrait un ZIP et retourne le dossier contenant story.json."""
    out = os.path.join(work_root, os.path.splitext(os.path.basename(zip_path))[0])

    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)

    try:
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(out)
    except zipfile.BadZipFile as error:
        log("ECHEC : archive illisible (%s)" % error)
        return None

    for root, _dirs, files in os.walk(out):
        if "story.json" in files:
            log("archive extraite : story.json trouve dans %s" % root)
            return root

    log("ECHEC : aucun story.json dans l'archive")
    return None


# ------------------------------------------------------------------ #
# Appareil                                                            #
# ------------------------------------------------------------------ #

def _ssh(args, timeout=60, transport=None):
    """
    Une commande distante. `args` reste une liste, comme avant, et reste
    toujours d'un seul element chez les appelants : elle est simplement jointe
    avant d'etre remise au transport. Le retour garde la forme d'un
    CompletedProcess (`.returncode`, `.stdout` en octets), pour qu'aucun
    appelant n'ait a changer.
    """
    commande = " ".join(args) if isinstance(args, (list, tuple)) else args

    return (transport or default_transport()).run(commande, timeout=timeout)


def device_reachable(log, transport=None):
    """
    Une commande triviale, et un diagnostic qui nomme la BONNE cause.

    La version precedente concluait toujours « l'appareil coupe son Wi-Fi en
    veille : reveiller l'ecran et reessayer ». Devant un refus d'algorithme —
    la panne reellement rencontree au premier essai sous Windows — ce conseil
    envoyait chercher un probleme qui n'existait pas, et laissait croire qu'une
    nouvelle tentative pouvait aboutir. Elle ne pouvait pas.
    """
    try:
        proc = _ssh(["echo ok"], timeout=25, transport=transport)
    except subprocess.TimeoutExpired:
        log("ECHEC : le 3GS ne repond pas (delai depasse)")
        log("  %s" % packtransport._CONSEILS[packtransport.PANNE_RESEAU])
        return False

    if proc.returncode != 0:
        detail = proc.stdout.decode("utf-8", "replace").strip()
        genre, conseil = packtransport.classify_failure(detail)

        log("ECHEC (%s) : %s" % (genre, detail or "code %d" % proc.returncode))
        log("  %s" % conseil)
        return False

    return True


def remote_inventory(log=None, transport=None):
    """[(nom, emplacement, nb_fichiers, octets)] pour les deux emplacements."""
    listing = " ".join(TARGETS.values())
    proc = _ssh([r"find %s -type f -exec ls -l {} \; 2>/dev/null" % listing],
                transport=transport)
    packs = {}

    for line in proc.stdout.decode("utf-8", "replace").splitlines():
        parts = line.split()
        if len(parts) < 9:
            continue
        try:
            size = int(parts[4])
        except ValueError:
            continue
        path = parts[-1]

        for key, base in TARGETS.items():
            if path.startswith(base + "/"):
                name = path[len(base) + 1:].split("/")[0]
                entry = packs.setdefault((name, key), [0, 0])
                entry[0] += 1
                entry[1] += size

    rows = [(n, k, c, s) for (n, k), (c, s) in sorted(packs.items())]

    if log:
        if not rows:
            log("aucun pack sur l'appareil")
        for name, where, count, size in rows:
            log("  %-16s %-10s %3d fichier(s)  %s" % (name, where, count, human(size)))

    return rows


def remote_send(local_dir, target, log, transport=None):
    tr = transport or default_transport()
    base = TARGETS[target]
    name = os.path.basename(os.path.normpath(local_dir))
    remote = "%s/%s" % (base, name)

    proc = _ssh(["mkdir -p '%s' && rm -rf '%s'" % (base, remote)], transport=tr)
    if proc.returncode != 0:
        log("ECHEC transfert : preparation du dossier distant — %s"
            % proc.stdout.decode("utf-8", "replace").strip())
        return False

    # Le transport choisit comment : binaire `scp -O` du poste, ou protocole
    # SCP historique parle en Python. Dans les deux cas c'est bien le
    # protocole HISTORIQUE, jamais SFTP — le serveur SFTP de cet iOS 6 ne sait
    # pas creer de repertoire et echoue en « path canonicalization failed »
    # des qu'on lui envoie un dossier.
    envoi = tr.send_dir(local_dir, base, name, timeout=600, log=log)

    if envoi.returncode != 0:
        log("ECHEC transfert : %s" % envoi.stdout.decode("utf-8", "replace").strip())
        return False

    # Sans cela l'app, qui tourne en mobile, ne pourrait pas lire un pack
    # depose par root dans Documents — ni le supprimer.
    if target == "documents":
        _ssh(["chown -R mobile:mobile '%s' '%s'" % (base, remote)], transport=tr)

    log("TRANSFERT OK : %s -> %s:%s" % (name, tr.host, remote))
    return True


def remote_delete(name, target, log, transport=None):
    remote = "%s/%s" % (TARGETS[target], name)
    proc = _ssh(["rm -rf '%s'" % remote], transport=transport)
    output = proc.stdout.decode("utf-8", "replace").strip()

    if proc.returncode != 0 or output:
        log("ECHEC suppression : %s — %s" % (name, output or "code %d" % proc.returncode))
        if target == "bundle":
            log("  le bundle appartient a root en lecture seule pour l'app ;"
                " la suppression exige un acces root, ici disponible")
        return False

    log("SUPPRESSION OK : %s (%s)" % (name, target))
    return True


def remote_uicache(log, transport=None):
    proc = _ssh(["su mobile -c 'uicache -a'"], timeout=90, transport=transport)

    if proc.returncode != 0:
        log("uicache : echec — %s" % proc.stdout.decode("utf-8", "replace").strip())
        return False

    log("uicache execute")
    return True
