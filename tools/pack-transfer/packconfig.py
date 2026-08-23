"""
Reglages memorises a cote de l'application, et localisation des ressources.

Rien de tout ceci ne doit dependre de WSL. L'outil d'origine s'appuyait sur
`~/.ssh/config` et sur un `ffmpeg` present dans le PATH : deux hypotheses
raisonnables sous Linux, fausses pour un .exe unique pose sur un bureau
Windows. Les chemins sont donc calcules a partir de l'EMPLACEMENT DE
L'APPLICATION, jamais du repertoire courant ni du profil utilisateur.
"""

import datetime
import json
import os
import sys

CONFIG_NAME = "luny-transfer.json"

# Version de l'outil. Aucune n'existait : celle-ci part donc de 1.0.0, qui
# correspond a la premiere version reellement utilisee contre l'appareil.
# A relever a la main — un numero derive d'un git describe mentirait dans un
# .exe recopie sur un autre poste, ou aucun depot n'existe.
VERSION = "1.0.0"

AUTEUR = "Brice avec Claude"

DEFAULTS = {
    "host": "192.168.1.98",
    "user": "root",
    "key_path": "",
    "target": "documents",
    "last_local_dir": "",
    "port": 22,
    # auto     : paramiko si une cle est renseignee et qu'il est installe
    # paramiko : impose paramiko meme sans cle ; s'il manque, repli sur les
    #            binaires du systeme, annonce dans le journal
    # systeme  : impose les binaires ssh/scp du poste
    #
    # Le choix existe parce que les deux transports ne rencontrent pas les
    # memes murs sur ce vieux serveur : pouvoir basculer sans reconstruire
    # l'application evite de rester bloque.
    "transport": "auto",
    # Etat des filtres du volet gauche. Memorise comme le reste : une
    # bibliotheque qui a besoin d'etre filtree en a besoin a chaque
    # lancement, pas seulement au premier.
    "filtre_compatibles": False,
    "filtre_presence": "tous",
}

TRANSPORTS = ("auto", "paramiko", "systeme")


def frozen():
    """Vrai si l'on tourne depuis un binaire PyInstaller."""
    return getattr(sys, "frozen", False)


def app_dir():
    """
    Repertoire de l'application, au sens ou l'utilisateur l'entend.

    En mode `--onefile`, PyInstaller extrait le code dans un dossier temporaire
    expose par `sys._MEIPASS`, mais `sys.executable` reste le .exe pose par
    l'utilisateur. C'est bien ce dernier qu'il faut ici : ecrire la
    configuration a cote du code extrait la ferait disparaitre a chaque
    lancement.
    """
    if frozen():
        return os.path.dirname(os.path.abspath(sys.executable))

    return os.path.dirname(os.path.abspath(__file__))


def resource_dir():
    """
    Repertoire des ressources EMBARQUEES (ffmpeg, illustration).

    Distinct de `app_dir` : en `--onefile` elles vivent dans le dossier
    temporaire d'extraction, pas a cote du .exe.
    """
    meipass = getattr(sys, "_MEIPASS", None)

    return meipass if meipass else os.path.dirname(os.path.abspath(__file__))


def config_path():
    return os.path.join(app_dir(), CONFIG_NAME)


def build_date():
    """
    Date de construction, au format AAAA-MM-JJ.

    Lue sur le fichier lui-meme : l'executable gele pour une version
    empaquetee, le script pour un lancement depuis les sources. C'est la seule
    date qui ne puisse pas mentir — une constante inscrite dans le code
    resterait celle du jour ou on a pense a la changer.
    """
    try:
        if frozen():
            reference = os.path.abspath(sys.executable)
        else:
            reference = os.path.abspath(__file__)

        horodatage = os.path.getmtime(reference)
    except OSError:
        return "date inconnue"

    return datetime.date.fromtimestamp(horodatage).isoformat()


def readme_path():
    """
    Le README a ouvrir depuis le pied de fenetre, ou None.

    Cherche d'abord la version Windows — c'est celle qui parle a l'utilisateur
    de cet executable — puis le README general.
    """
    noms = ("README-windows.md", "README.md")

    for base in (app_dir(), resource_dir(), os.path.dirname(os.path.abspath(__file__))):
        for nom in noms:
            chemin = os.path.join(base, nom)
            if os.path.isfile(chemin):
                return chemin

    return None


def load():
    """Les reglages memorises, completes par les valeurs par defaut."""
    values = dict(DEFAULTS)
    path = config_path()

    if not os.path.isfile(path):
        return values

    try:
        with open(path, encoding="utf-8") as handle:
            stored = json.load(handle)
    except (ValueError, OSError):
        # Un fichier abime ne doit pas empecher l'outil de demarrer : on
        # repart des defauts, et la premiere sauvegarde le remplacera.
        return values

    if isinstance(stored, dict):
        for key in DEFAULTS:
            if key in stored:
                values[key] = stored[key]

    return values


def save(values):
    """Ecrit les reglages. Retourne None si tout va bien, sinon le message."""
    path = config_path()
    retenu = {key: values.get(key, DEFAULTS[key]) for key in DEFAULTS}

    try:
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(retenu, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
    except OSError as error:
        return "reglages non enregistres (%s)" % error

    return None


# ------------------------------------------------------------------ #
# Ressources embarquees                                               #
# ------------------------------------------------------------------ #

def ffmpeg_binary():
    """
    Chemin du ffmpeg livre avec l'application, ou None.

    Cherche a cote de l'application ET dans le dossier de ressources : le
    premier couvre une installation posee a la main, le second le mode
    `--onefile` ou `--add-binary` place le fichier dans `sys._MEIPASS`.

    Aucun repli sur le PATH ici. Le repli existe, mais il est decide par
    `packcore.ffmpeg_path()` : si cette fonction rend None, packcore cherche
    dans le PATH, ce qui laisse l'outil utilisable sous Linux sans rien
    embarquer.
    """
    noms = ("ffmpeg.exe", "ffmpeg")

    for base in (resource_dir(), app_dir()):
        for nom in noms:
            chemin = os.path.join(base, nom)
            if os.path.isfile(chemin):
                return chemin

    return None


# Nom de l'illustration, dans l'ordre de preference. UNE SEULE definition :
# `luny-transfer.spec` l'importe pour savoir quel fichier embarquer, et
# `artwork_path()` ci-dessous l'importe pour savoir quel fichier chercher.
# Avant cette version, le nom etait ecrit une fois dans le .spec et une
# seconde fois ici — deux litteraux identiques par coincidence, jamais lies.
# Un dossier construit et un chemin lu qui « doivent utiliser exactement le
# meme nom » sans qu'aucun mecanisme ne le garantisse driftent tot ou tard.
ARTWORK_NAMES = ("luny_background_source_portrait.png", "luny-artwork.png")

# Destination des ressources dans le paquet : la RACINE, jamais un
# sous-dossier. C'est cette valeur, passee telle quelle a `datas=[(source,
# RESOURCE_DEST)]` dans le .spec, qui rend valide la lecture par un simple
# `os.path.join(resource_dir(), nom)` ici — sans elle, un sous-dossier cote
# empaquetage romprait la correspondance en silence, le fichier existant bel
# et bien dans le paquet mais pas au chemin cherche.
RESOURCE_DEST = "."


def repo_root():
    """
    Racine du depot, `narrative-forge-cockpit`.

    N'a de sens QUE lance depuis les sources ou au moment de la construction
    — jamais depuis un executable gele, ou aucun depot n'existe forcement a
    cote. Employe par `build_source` et par le repli de developpement de
    `artwork_path`.
    """
    return os.path.abspath(os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", ".."))


def build_source(spec_dir=None):
    """
    Chemin SOURCE de l'illustration au moment de la CONSTRUCTION.

    Appelee par `luny-transfer.spec` pour peupler `datas`, et par
    `artwork_path()` ci-dessous comme dernier repli quand on tourne depuis les
    sources sans rien avoir copie. Le nom cherche est `ARTWORK_NAMES[0]` dans
    les deux cas : c'est la meme fonction, pas une copie.

    Deux emplacements, dans cet ordre : a cote du `.spec` — c'est la qu'une
    image retouchee serait rangee — puis dans les ressources de l'app iOS, ou
    vit l'originale. `spec_dir` est le repertoire du `.spec` (`SPECPATH` cote
    PyInstaller) ; par defaut, le repertoire de ce fichier, qui est le meme
    lorsqu'on tourne depuis les sources.
    """
    ici = spec_dir or os.path.dirname(os.path.abspath(__file__))

    candidats = [
        os.path.join(ici, ARTWORK_NAMES[0]),
        os.path.join(repo_root(), "ios", "LunyUI", "Resources", ARTWORK_NAMES[0]),
    ]

    for chemin in candidats:
        if os.path.isfile(chemin):
            return os.path.normpath(chemin)

    return None


def artwork_path():
    """
    Illustration fusee/lune/nuages, celle deja produite pour l'app iOS.

    Cherchee d'abord parmi les ressources embarquees (`resource_dir`, donc
    `sys._MEIPASS` en `--onefile`), puis a cote de l'executable, puis —
    lance depuis les sources — via `build_source`, qui la trouve dans le
    depot sans qu'on ait besoin de la dupliquer.
    """
    for base in (resource_dir(), app_dir()):
        for nom in ARTWORK_NAMES:
            chemin = os.path.join(base, nom)
            if os.path.isfile(chemin):
                return chemin

    return build_source()


def _lister(base, limite=12):
    """Contenu d'un dossier, tronque, ou le message d'erreur s'il est illisible."""
    try:
        noms = sorted(os.listdir(base))
    except OSError as error:
        return ["illisible (%s)" % error]

    if not noms:
        return ["(vide)"]

    lignes = ["%s" % nom for nom in noms[:limite]]

    if len(noms) > limite:
        lignes.append("... et %d de plus" % (len(noms) - limite))

    return lignes


def describe_resource_search():
    """
    Diagnostic a afficher quand `artwork_path()` (ou toute autre recherche de
    ressource embarquee) ne trouve rien.

    Le journal se contentait jusqu'ici d'annoncer le repertoire cherche, sans
    dire ce qu'il contenait reellement. Cela laissait une seule question sans
    reponse — le fichier a-t-il ete embarque sous un autre nom, dans un autre
    dossier, ou pas du tout ? — et c'est precisement la question qui a coute
    plusieurs allers-retours sur ce meme decor. Le contenu REEL des deux
    dossiers vraiment inspectes tranche la question sans avoir a reconstruire
    l'executable une fois de plus pour le savoir.
    """
    blocs = []

    for etiquette, base in (("ressources embarquees", resource_dir()),
                            ("a cote de l'executable", app_dir())):
        blocs.append("%s (%s) :" % (etiquette, base))
        blocs.extend("  " + ligne for ligne in _lister(base))

    return "\n".join(blocs)
