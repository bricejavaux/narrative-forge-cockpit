"""
Bibliotheque locale, bibliotheque de l'appareil, et difference entre les deux.

Aucune interface et aucun reseau ici : `scan_local` lit des dossiers et des
ZIP, `build_diff` compare deux listes. Tout est donc verifiable sans paramiko,
sans Pillow et sans 3GS — ce qui compte, l'environnement de developpement
n'ayant aucun des trois.

----------------------------------------------------------------------------
La regle de correspondance, et pourquoi ce n'est pas le titre
----------------------------------------------------------------------------

Deux noms circulent pour un meme pack :

    le TITRE          champ "title" de story.json, lisible, accentue,
                      parfois vide, parfois identique d'un pack a l'autre
    le NOM DE DOSSIER celui que le pack occupe sur l'appareil

L'appareil ne connait QUE le second. `remote_inventory` liste des noms de
repertoire ; l'app, elle, affiche le titre lu dans story.json. Comparer des
titres a des noms de repertoire reviendrait a comparer deux choses qui n'ont
aucune raison de coincider.

La cle de correspondance est donc le **nom de transfert** : le nom de
repertoire que le pack occuperait sur l'appareil s'il etait envoye. Il se
calcule exactement comme le fait le transfert reel :

    dossier   -> son nom de base
    ZIP       -> le dossier contenant story.json dans l'archive, ou le nom de
                 l'archive si story.json est a sa racine

Cette derniere regle n'est pas un choix : c'est ce que fait deja
`packcore.extract_zip`, qui extrait dans `<racine>/<nom-du-zip>/` puis
descend jusqu'au story.json. La faire diverger ferait afficher un diff qui ne
correspondrait pas au transfert.

Le titre reste affiche partout — c'est lui qui parle a l'utilisateur — mais il
n'entre jamais dans la comparaison.

**Casse.** La comparaison est insensible a la casse. Le systeme de fichiers de
cet iOS est HFS+, insensible a la casse par defaut : `MonPack` et `monpack`
y sont le meme repertoire, et les traiter comme deux packs distincts
proposerait un ajout qui ecraserait en silence.

**Noms ambigus.** Deux entrees locales qui donnent le meme nom de transfert
sont un vrai piege : la seconde ecraserait la premiere sans le dire. Elles
sont marquees ambigues, decrites, et **jamais pre-cochees** — voir
`DiffRow.ambiguous`. Aucune tentative de les departager automatiquement : le
seul choix sur lequel l'outil ne doit pas parier est celui-la.
"""

import json
import os
import posixpath
import zipfile

AUDIO_TO_CONVERT = (".ogg", ".oga")
IMAGE_TO_CONVERT = (".bmp",)

# Emplacements distants, repris de packcore. Le bundle est protege : il
# appartient a root, l'app tourne en mobile, et un pack qu'on y depose est
# efface au prochain `make package install`.
PROTECTED_LOCATION = "bundle"


def normalise(name):
    """Cle de comparaison : casse ignoree, espaces de bord retires."""
    return (name or "").strip().lower()


# ------------------------------------------------------------------ #
# Modeles                                                             #
# ------------------------------------------------------------------ #

class LocalPack(object):
    """Un pack trouve sur le poste : dossier ou archive ZIP."""

    def __init__(self, source_path, kind, transfer_name, title=None,
                 node_count=0, to_convert=None, cover_asset=None, error=None):
        self.source_path = source_path
        self.kind = kind                      # "dossier" ou "zip"
        self.transfer_name = transfer_name
        self.title = title or transfer_name
        self.node_count = node_count
        self.to_convert = to_convert or []
        self.cover_asset = cover_asset
        self.error = error

    @property
    def key(self):
        return normalise(self.transfer_name)

    @property
    def valid(self):
        return self.error is None

    @property
    def needs_conversion(self):
        return bool(self.to_convert)

    @property
    def state_label(self):
        if self.error:
            return self.error
        if self.to_convert:
            return "conversion necessaire (%d fichier%s)" % (
                len(self.to_convert), "s" if len(self.to_convert) > 1 else "")
        return "pret tel quel"

    def __repr__(self):
        return "LocalPack(%r, %s)" % (self.transfer_name, self.state_label)


class RemotePack(object):
    """Un pack present sur l'appareil, dans l'un des deux emplacements."""

    def __init__(self, name, location, file_count=0, size=0):
        self.name = name
        self.location = location
        self.file_count = file_count
        self.size = size

    @property
    def key(self):
        return normalise(self.name)

    @property
    def protected(self):
        return self.location == PROTECTED_LOCATION

    @property
    def state_label(self):
        if self.protected:
            return "livre avec l'app — non supprimable"
        return "%d fichier%s" % (self.file_count, "s" if self.file_count > 1 else "")

    def __repr__(self):
        return "RemotePack(%r, %s)" % (self.name, self.location)


class DiffRow(object):
    """
    Une ligne de comparaison. `remotes` est une LISTE : un meme nom peut
    exister aux deux emplacements a la fois, et l'app affiche alors deux
    tuiles. Masquer ce doublon derriere une seule ligne cacherait exactement
    ce que l'utilisateur doit voir.
    """

    LOCAL_ONLY = "local_seul"
    BOTH = "des_deux_cotes"
    REMOTE_ONLY = "appareil_seul"

    def __init__(self, key, local=None, remotes=None, ambiguous_with=None):
        self.key = key
        self.local = local
        self.remotes = remotes or []
        self.ambiguous_with = ambiguous_with or []

    @property
    def ambiguous(self):
        return bool(self.ambiguous_with)

    @property
    def status(self):
        if self.local is not None and self.remotes:
            return self.BOTH
        if self.local is not None:
            return self.LOCAL_ONLY
        return self.REMOTE_ONLY

    @property
    def deletable_remotes(self):
        return [r for r in self.remotes if not r.protected]

    @property
    def preselect_send(self):
        """
        Pre-coche uniquement l'ajout franc : present ici, absent la-bas, pack
        valide, nom non ambigu.

        Un pack present des deux cotes n'est PAS pre-coche : reenvoyer est un
        ecrasement, et l'outil n'a pas a le decider. Un nom ambigu ne l'est
        jamais non plus.
        """
        return (self.status == self.LOCAL_ONLY
                and self.local is not None
                and self.local.valid
                and not self.ambiguous)

    @property
    def preselect_delete(self):
        """Jamais. Une suppression se demande, elle ne se propose pas cochee."""
        return False

    @property
    def note(self):
        if self.ambiguous:
            return ("nom ambigu : %s donnent le meme dossier « %s » — "
                    "aucun n'est pre-selectionne"
                    % (" et ".join(self.ambiguous_with), self.key))
        if self.status == self.BOTH:
            return "deja sur l'appareil — cocher pour reenvoyer (ecrase)"
        if self.status == self.LOCAL_ONLY:
            return "absent de l'appareil"
        return "sur l'appareil seulement"

    @property
    def title(self):
        if self.local is not None:
            return self.local.title
        return self.remotes[0].name if self.remotes else self.key

    def __repr__(self):
        return "DiffRow(%r, %s)" % (self.key, self.status)


# ------------------------------------------------------------------ #
# Lecture d'un story.json                                             #
# ------------------------------------------------------------------ #

def entry_stage(story):
    """
    Noeud d'entree : celui marque `squareOne`, sinon le premier du tableau.

    C'est la regle de STUdio (SPEC_story_json.md §3.4) : a la lecture, le
    noeud portant `squareOne` est deplace en tete, et faute d'un tel noeud le
    premier element fait foi.
    """
    stages = story.get("stageNodes") or []

    for stage in stages:
        if isinstance(stage, dict) and stage.get("squareOne"):
            return stage

    return stages[0] if stages and isinstance(stages[0], dict) else None


def _needs_conversion(names):
    out = []

    for name in sorted(names):
        ext = os.path.splitext(name)[1].lower()
        if ext in AUDIO_TO_CONVERT or ext in IMAGE_TO_CONVERT:
            out.append(name)

    return out


def _describe(story, asset_names, transfer_name, source_path, kind):
    stage = entry_stage(story)
    title = story.get("title")

    return LocalPack(
        source_path=source_path,
        kind=kind,
        transfer_name=transfer_name,
        title=(title.strip() if isinstance(title, str) and title.strip()
               else transfer_name),
        node_count=len(story.get("stageNodes") or []),
        to_convert=_needs_conversion(asset_names),
        cover_asset=(stage or {}).get("image"))


# ------------------------------------------------------------------ #
# Dossiers                                                            #
# ------------------------------------------------------------------ #

def read_directory_pack(path):
    """Un dossier de pack, valide ou non. Retourne toujours un LocalPack."""
    name = os.path.basename(os.path.normpath(path))
    story_path = os.path.join(path, "story.json")

    if not os.path.isfile(story_path):
        return LocalPack(path, "dossier", name, error="story.json absent")

    try:
        with open(story_path, encoding="utf-8") as handle:
            story = json.load(handle)
    except (ValueError, OSError) as error:
        return LocalPack(path, "dossier", name, error="story.json illisible (%s)" % error)

    if not isinstance(story, dict):
        return LocalPack(path, "dossier", name,
                         error="la racine de story.json n'est pas un objet")

    assets_dir = os.path.join(path, "assets")
    assets = sorted(os.listdir(assets_dir)) if os.path.isdir(assets_dir) else []

    return _describe(story, assets, name, path, "dossier")


# ------------------------------------------------------------------ #
# Archives ZIP                                                        #
# ------------------------------------------------------------------ #

def zip_story_member(archive, zip_path):
    """
    Le membre `story.json` le moins profond de l'archive, et son prefixe.

    « Le moins profond » reproduit `packcore.extract_zip`, qui descend
    l'arborescence extraite et s'arrete au premier story.json rencontre. Sans
    ce tri, une archive contenant plusieurs packs donnerait un resultat
    dependant de l'ordre du catalogue ZIP, donc instable d'une machine a
    l'autre.
    """
    candidates = [n for n in archive.namelist()
                  if posixpath.basename(n) == "story.json" and not n.endswith("/")]

    if not candidates:
        return None, None

    candidates.sort(key=lambda n: (n.count("/"), n))
    member = candidates[0]
    prefix = posixpath.dirname(member)

    return member, prefix


def zip_transfer_name(zip_path, prefix):
    """
    Nom du dossier que ce ZIP occupera sur l'appareil.

    story.json a la racine de l'archive -> le nom de l'archive, car
    `extract_zip` extrait dans `<racine>/<nom-du-zip>/` et y trouve le
    story.json sans descendre. Sinon -> le dernier segment du prefixe.
    """
    if not prefix:
        return os.path.splitext(os.path.basename(zip_path))[0]

    return posixpath.basename(prefix.rstrip("/"))


def read_zip_pack(path):
    """Un ZIP de pack, lu SANS extraction : une archive peut peser 12 Mo."""
    name_fallback = os.path.splitext(os.path.basename(path))[0]

    try:
        with zipfile.ZipFile(path) as archive:
            member, prefix = zip_story_member(archive, path)

            if member is None:
                return LocalPack(path, "zip", name_fallback,
                                 error="aucun story.json dans l'archive")

            transfer_name = zip_transfer_name(path, prefix)

            try:
                story = json.loads(archive.read(member).decode("utf-8"))
            except (ValueError, UnicodeDecodeError) as error:
                return LocalPack(path, "zip", transfer_name,
                                 error="story.json illisible (%s)" % error)

            if not isinstance(story, dict):
                return LocalPack(path, "zip", transfer_name,
                                 error="la racine de story.json n'est pas un objet")

            assets_prefix = posixpath.join(prefix, "assets") if prefix else "assets"
            assets = [posixpath.basename(n) for n in archive.namelist()
                      if n.startswith(assets_prefix + "/") and not n.endswith("/")]

            return _describe(story, assets, transfer_name, path, "zip")

    except (zipfile.BadZipFile, OSError) as error:
        return LocalPack(path, "zip", name_fallback,
                         error="archive illisible (%s)" % error)


# ------------------------------------------------------------------ #
# Balayage                                                            #
# ------------------------------------------------------------------ #

def scan_local(directory, log=None):
    """
    Les packs d'un repertoire du poste : sous-dossiers et fichiers ZIP.

    Les entrees invalides sont RENDUES, pas filtrees : un dossier qu'on
    croyait etre un pack et qui n'en est pas doit se voir, avec sa raison.
    Les taire donnerait une liste courte et inexplicable.
    """
    packs = []

    if not directory or not os.path.isdir(directory):
        if log:
            log("dossier introuvable : %s" % directory)
        return packs

    for entry in sorted(os.listdir(directory)):
        path = os.path.join(directory, entry)

        if os.path.isdir(path):
            packs.append(read_directory_pack(path))
        elif entry.lower().endswith(".zip"):
            packs.append(read_zip_pack(path))

    if log:
        valides = [p for p in packs if p.valid]
        log("%d entree(s) examinee(s), %d pack(s) exploitable(s)"
            % (len(packs), len(valides)))

        for pack in packs:
            if not pack.valid:
                log("  ignore : %s — %s" % (os.path.basename(pack.source_path), pack.error))

    return packs


def remote_packs_from_rows(rows):
    """Convertit la sortie de packcore.remote_inventory en RemotePack."""
    return [RemotePack(name, where, count, size) for name, where, count, size in rows]


# ------------------------------------------------------------------ #
# Filtres du volet local                                              #
# ------------------------------------------------------------------ #
#
# Un balayage rend TOUT ce qu'il a vu, y compris les dossiers qui ne sont pas
# des packs : c'est voulu, un dossier qu'on croyait exploitable doit se voir
# avec sa raison. Mais passe quelques dizaines d'entrees, ce meme principe
# noie les vrais packs au milieu de `ffmpeg-extracted`, `PS2` et compagnie.
#
# Les filtres tranchent : le balayage garde son honnetete, l'affichage se
# reduit a la demande. Rien n'est jamais supprime de `rows` — masquer et
# oublier ne sont pas la meme chose, et `filter_rows` rend d'ailleurs les
# deux listes pour que l'interface puisse dire ce qu'elle cache.

PRESENCE_TOUS = "tous"
PRESENCE_ABSENTS = "absents"
PRESENCE_PRESENTS = "presents"

PRESENCES = (PRESENCE_TOUS, PRESENCE_ABSENTS, PRESENCE_PRESENTS)

PRESENCE_LIBELLES = {
    PRESENCE_TOUS: "tous",
    PRESENCE_ABSENTS: "absents de l'appareil",
    PRESENCE_PRESENTS: "deja sur l'appareil",
}


def filter_rows(rows, compatibles_seuls=False, presence=PRESENCE_TOUS):
    """
    Partage les lignes LOCALES en (visibles, masquees).

    Ne concerne que le volet gauche : une ligne sans pack local n'a rien a y
    faire et n'est rendue dans aucune des deux listes.

    Les deux filtres se combinent, et le second se lit sur `status`, donc sur
    l'inventaire distant reel — un pack cesse d'etre « absent » des qu'il a
    ete transfere et que l'inventaire a ete rafraichi.
    """
    if presence not in PRESENCES:
        presence = PRESENCE_TOUS

    visibles = []
    masquees = []

    for row in rows:
        if row.local is None:
            continue

        garde = True

        if compatibles_seuls and not row.local.valid:
            garde = False

        if presence == PRESENCE_ABSENTS and row.status != DiffRow.LOCAL_ONLY:
            garde = False
        elif presence == PRESENCE_PRESENTS and row.status != DiffRow.BOTH:
            garde = False

        (visibles if garde else masquees).append(row)

    return visibles, masquees


# ------------------------------------------------------------------ #
# Difference                                                          #
# ------------------------------------------------------------------ #

def build_diff(local_packs, remote_packs):
    """
    Compare les deux bibliotheques et retourne des DiffRow tries par cle.

    Les trois cas de la demande, et leur pre-selection :

        ici seulement       -> propose a l'ajout, PRE-COCHE
        des deux cotes      -> affiche des deux cotes, AUCUNE pre-selection
        appareil seulement  -> supprimable a droite, JAMAIS pre-coche
    """
    # Les noms ambigus se detectent avant toute comparaison : un doublon local
    # fausserait la ligne au lieu d'etre signale.
    par_cle = {}

    for pack in local_packs:
        par_cle.setdefault(pack.key, []).append(pack)

    rows = {}

    for key, packs in par_cle.items():
        ambigus = []

        if len(packs) > 1:
            ambigus = [os.path.basename(p.source_path) for p in packs]

        # La premiere entree, dans l'ordre de balayage, represente la ligne.
        # Le drapeau d'ambiguite empeche de toute facon toute action
        # automatique dessus.
        rows[key] = DiffRow(key, local=packs[0], ambiguous_with=ambigus)

    for remote in remote_packs:
        row = rows.get(remote.key)

        if row is None:
            row = DiffRow(remote.key)
            rows[remote.key] = row

        row.remotes.append(remote)

    for row in rows.values():
        row.remotes.sort(key=lambda r: r.location)

    return [rows[k] for k in sorted(rows)]


def summarise(rows, to_send, to_delete):
    """
    Recapitulatif d'avant execution.

    `to_send` et `to_delete` sont des ensembles de cles ; `to_delete` peut
    contenir des cles dont le seul exemplaire distant est protege, et le
    compte doit alors dire la verite plutot que promettre une suppression qui
    n'aura pas lieu.
    """
    envois = [r for r in rows if r.key in to_send and r.local is not None and r.local.valid]
    conversions = [r for r in envois if r.local.needs_conversion]

    suppressions = []
    protegees = []

    for row in rows:
        if row.key not in to_delete:
            continue
        if row.deletable_remotes:
            suppressions.append(row)
        elif row.remotes:
            protegees.append(row)

    return {
        "envois": len(envois),
        "conversions": len(conversions),
        "suppressions": len(suppressions),
        "protegees": len(protegees),
        "lignes_envoi": envois,
        "lignes_suppression": suppressions,
        "lignes_protegees": protegees,
    }


def summary_text(resume):
    morceaux = []

    if resume["envois"]:
        detail = (" (dont %d avec conversion)" % resume["conversions"]
                  if resume["conversions"] else "")
        morceaux.append("%d pack%s a envoyer%s"
                        % (resume["envois"], "s" if resume["envois"] > 1 else "", detail))

    if resume["suppressions"]:
        morceaux.append("%d pack%s a supprimer"
                        % (resume["suppressions"],
                           "s" if resume["suppressions"] > 1 else ""))

    if resume["protegees"]:
        morceaux.append("%d protege%s par le bundle, ignore%s"
                        % (resume["protegees"],
                           "s" if resume["protegees"] > 1 else "",
                           "s" if resume["protegees"] > 1 else ""))

    return ", ".join(morceaux) if morceaux else "rien de selectionne"


# ------------------------------------------------------------------ #
# Couverture et initiale de repli                                     #
# ------------------------------------------------------------------ #

ARTICLES = ("la", "le", "les", "un", "une", "des", "du", "de")


def cover_initial(title):
    """
    Initiale de repli, quand aucune couverture n'est lisible.

    Meme regle que la tuile de l'app iOS (LunyLibraryCell) : on saute
    l'article initial, elide ou non, faute de quoi des titres francais donnent
    tous la meme lettre — « La nuit du renard », « Le phare endormi »,
    « L'etoile qui baille » commencent tous par L. Garder les deux regles
    identiques evite qu'un pack change de lettre entre l'outil et l'appareil.
    """
    trimmed = (title or "").strip()

    if not trimmed:
        return "?"

    candidate = trimmed

    if len(trimmed) >= 2 and trimmed[1] in ("'", "’"):
        candidate = trimmed[2:]

    if candidate == trimmed:
        morceaux = trimmed.split(None, 1)

        if len(morceaux) == 2 and morceaux[0].lower() in ARTICLES:
            candidate = morceaux[1]

    candidate = candidate.strip() or trimmed

    return candidate[0].upper()


def read_cover_bytes(pack):
    """
    Octets de l'image du noeud d'entree, ou None.

    Un ZIP n'est jamais extrait pour cela : l'image est lue directement dans
    l'archive. Une archive de pack pese couramment plus de 10 Mo, et en
    extraire une pour afficher une vignette de 96 pixels serait absurde.
    """
    if pack is None or not pack.cover_asset or not pack.valid:
        return None

    try:
        if pack.kind == "dossier":
            chemin = os.path.join(pack.source_path, "assets", pack.cover_asset)

            if not os.path.isfile(chemin):
                return None

            with open(chemin, "rb") as handle:
                return handle.read()

        with zipfile.ZipFile(pack.source_path) as archive:
            _member, prefix = zip_story_member(archive, pack.source_path)
            vise = posixpath.join(prefix, "assets", pack.cover_asset) if prefix \
                else posixpath.join("assets", pack.cover_asset)

            for nom in archive.namelist():
                if nom == vise:
                    return archive.read(nom)

    except (OSError, zipfile.BadZipFile, KeyError):
        return None

    return None
