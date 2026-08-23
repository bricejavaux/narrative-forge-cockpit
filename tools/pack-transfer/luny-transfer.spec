# -*- mode: python ; coding: utf-8 -*-
"""
Recette d'empaquetage PyInstaller, versionnee avec le code.

    pyinstaller luny-transfer.spec

Pourquoi un fichier plutot qu'une ligne de commande
---------------------------------------------------

La ligne de commande du README devait etre recopiee a la main a chaque
construction, avec ses `--add-data` et ses points-virgules. Une option oubliee
donne un executable qui DEMARRE — donc qui a l'air correct — et auquel il
manque simplement une ressource. C'est precisement le genre de panne qui a
coute deux allers-retours sur le decor de l'en-tete.

Ici, la liste des ressources est ecrite une fois, relue par le programme de
construction, et le fichier est verifie avant que le travail commence.

`datas` et `binaries`, la difference qui compte
-----------------------------------------------

    datas     ressources quelconques — l'illustration, le README
    binaries  executables et bibliotheques — ffmpeg.exe, et lui seul

Une image rangee dans `binaries` passe par l'analyse des dependances
binaires : selon les versions, elle est ignoree, ou embarquee sans que rien ne
le dise. Elle n'a rien a y faire.

Dans les deux cas, `--onefile` extrait le contenu dans un dossier temporaire
expose par `sys._MEIPASS`, ou `packconfig.resource_dir()` va le chercher.
"""

import os

ICI = os.path.abspath(SPECPATH)                                    # noqa: F821
DEPOT = os.path.abspath(os.path.join(ICI, "..", ".."))

NOM = "luny-transfer"
ILLUSTRATION = "luny_background_source_portrait.png"


def premier_existant(*chemins):
    for chemin in chemins:
        if chemin and os.path.isfile(chemin):
            return chemin
    return None


# --- Illustration ---------------------------------------------------------
#
# Cherchee a cote du .spec d'abord — c'est la que l'on copie une image
# retouchee — puis dans les ressources de l'app iOS, ou vit l'originale. Le
# depot n'a donc pas a en garder deux exemplaires.

illustration = premier_existant(
    os.path.join(ICI, ILLUSTRATION),
    os.path.join(DEPOT, "ios", "LunyUI", "Resources", ILLUSTRATION),
)

if illustration is None:
    # Volontairement fatal. Un executable sans decor demarre normalement et ne
    # signale rien : l'absence ne se verrait qu'a l'ecran, une fois le fichier
    # livre. Mieux vaut refuser de construire.
    raise SystemExit(
        "%s introuvable.\n"
        "Cherche dans :\n  %s\n  %s\n"
        "Copier l'image a cote de ce fichier .spec, ou retablir les "
        "ressources de l'app iOS." % (
            ILLUSTRATION, ICI,
            os.path.join(DEPOT, "ios", "LunyUI", "Resources")))

datas = [(illustration, ".")]

# --- README ---------------------------------------------------------------
#
# Embarque pour que le lien du pied de fenetre fonctionne aussi depuis un .exe
# recopie seul sur un autre poste.

for nom in ("README-windows.md", "README.md"):
    chemin = os.path.join(ICI, nom)
    if os.path.isfile(chemin):
        datas.append((chemin, "."))

# --- ffmpeg ---------------------------------------------------------------
#
# Absent du depot (binaire de plusieurs dizaines de megaoctets, non
# redistribue). Sans lui, l'application se construit et fonctionne : les .ogg
# et .bmp sont alors transferes tels quels, et le journal l'annonce des le
# demarrage. Ce n'est donc pas une erreur de construction, mais cela doit se
# voir.

binaries = []
ffmpeg = premier_existant(os.path.join(ICI, "ffmpeg.exe"),
                          os.path.join(ICI, "ffmpeg"))

if ffmpeg:
    binaries.append((ffmpeg, "."))
else:
    print("[luny-transfer] ATTENTION : ffmpeg.exe absent de %s — "
          "l'executable ne saura pas convertir les .ogg ni les .bmp." % ICI)


a = Analysis(                                                      # noqa: F821
    ["packgui_win.py"],
    pathex=[ICI],
    binaries=binaries,
    datas=datas,
    # Les modules de l'outil sont importes par leur nom depuis le meme
    # repertoire ; `pathex` suffit a les faire trouver. paramiko est nomme
    # explicitement : il n'est importe qu'a l'appel, dans une fonction, et
    # l'analyse statique ne le verrait pas.
    hiddenimports=["paramiko"],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)                                                  # noqa: F821

exe = EXE(                                                         # noqa: F821
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name=NOM,
    debug=False,
    strip=False,
    upx=True,
    runtime_tmpdir=None,
    # Sans console : c'est une application de bureau. Les fenetres de console
    # des sous-processus sont supprimees par packproc, pas par ce reglage —
    # les deux sont necessaires.
    console=False,
    disable_windowed_traceback=False,
)
