"""
Lancement de processus externes SANS fenetre de console.

----------------------------------------------------------------------------
Le defaut
----------------------------------------------------------------------------

Une application Windows construite avec `--windowed` n'a pas de console. Mais
chacun de ses `subprocess.run` en OUVRE une : Windows cree une console pour
tout processus console lance depuis un programme qui n'en a pas. D'ou les
fenetres noires qui clignotent pendant un transfert — une par appel a
`ffmpeg`, `ssh` ou `scp`, et un transfert en enchaine des dizaines.

Ce n'est pas un defaut d'affichage anodin : chaque fenetre vole le focus au
passage, ce qui rend l'application inutilisable pendant une conversion.

----------------------------------------------------------------------------
La correction
----------------------------------------------------------------------------

Deux verrous, poses ensemble parce qu'ils ne couvrent pas les memes cas :

`CREATE_NO_WINDOW`   empeche la creation de la console. Present depuis
                     Python 3.7, et sous Windows uniquement — d'ou la lecture
                     par `getattr` plutot qu'en dur.

`STARTF_USESHOWWINDOW` + `SW_HIDE` : la ceinture. Certains lanceurs et
                     certains binaires reprennent la main sur l'affichage de
                     leur fenetre ; ce drapeau la garde masquee.

Sur tout autre systeme, ces reglages n'existent pas et la fonction rend un
dictionnaire vide : le comportement sous Linux est strictement inchange.

Tout appel a un binaire externe de cet outil passe par ici. Un appel qui
l'oublierait reintroduirait le defaut a lui seul, c'est pourquoi il n'existe
qu'un seul point de passage.
"""

import subprocess
import sys


def no_window_kwargs(platform=None):
    """
    Les arguments a ajouter a `subprocess.*` pour qu'aucune console n'ouvre.

    `platform` n'est la que pour les tests : il permet de verifier le calcul
    fait pour Windows depuis une machine Linux, ou les constantes n'existent
    pas.
    """
    platform = sys.platform if platform is None else platform

    if not platform.startswith("win"):
        return {}

    kwargs = {}

    drapeau = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
    kwargs["creationflags"] = drapeau

    startupinfo = getattr(subprocess, "STARTUPINFO", None)

    if startupinfo is not None:
        info = startupinfo()
        info.dwFlags |= getattr(subprocess, "STARTF_USESHOWWINDOW", 1)
        info.wShowWindow = getattr(subprocess, "SW_HIDE", 0)
        kwargs["startupinfo"] = info

    return kwargs


def run(cmd, **kwargs):
    """
    `subprocess.run`, la fenetre en moins.

    La sortie d'erreur est fusionnee avec la sortie standard par defaut :
    c'est ce qu'attendent tous les appelants de cet outil, et sans console
    pour la recevoir, une stderr non redirigee serait perdue.
    """
    kwargs.setdefault("stdout", subprocess.PIPE)
    kwargs.setdefault("stderr", subprocess.STDOUT)
    kwargs.update(no_window_kwargs())

    return subprocess.run(cmd, **kwargs)


def open_document(path):
    """
    Ouvre un fichier avec l'application par defaut du systeme.

    Sert au lien vers le README depuis le pied de fenetre. Retourne None si
    tout va bien, sinon le message a afficher — l'echec d'un lien d'aide ne
    doit jamais faire tomber l'application.
    """
    import os

    try:
        if sys.platform.startswith("win"):
            os.startfile(path)          # noqa: S606 — API Windows dediee
        elif sys.platform == "darwin":
            run(["open", path], timeout=15)
        else:
            run(["xdg-open", path], timeout=15)
    except Exception as error:
        return "impossible d'ouvrir %s (%s)" % (path, error)

    return None
