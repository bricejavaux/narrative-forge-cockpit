#!/usr/bin/env python3
"""
Aucune fenetre de console, quel que soit le binaire appele.

Le defaut : une application `--windowed` n'a pas de console, donc Windows en
CREE une pour chaque processus console qu'elle lance. Un transfert enchaine
des dizaines d'appels a ffmpeg, ssh et scp : autant de fenetres noires qui
clignotent et volent le focus.

Deux verrous, verifies ici :

1. `packproc.no_window_kwargs` calcule bien les bons drapeaux pour Windows.
   Verifiable depuis Linux grace au parametre `platform`, sans quoi ce test
   ne pourrait exister dans cet environnement.

2. Tous les appels externes passent par `packproc`. C'est le point qui compte
   vraiment : le calcul peut etre juste et un appel oublie suffit a
   reintroduire le defaut. Le dernier test relit donc le code source.
"""

import os
import re
import subprocess
import sys
import unittest

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RACINE)

import packcore
import packproc
import packtransport


class TestDrapeaux(unittest.TestCase):

    def test_sous_windows_la_console_est_interdite(self):
        kwargs = packproc.no_window_kwargs(platform="win32")

        self.assertIn("creationflags", kwargs)
        self.assertEqual(kwargs["creationflags"] & 0x08000000, 0x08000000,
                         "CREATE_NO_WINDOW absent")

    def test_ailleurs_rien_n_est_ajoute(self):
        """
        Sous Linux, ces reglages n'existent pas. Les poser ferait echouer
        `subprocess` — packcli et packgui doivent continuer de tourner sous
        WSL exactement comme avant.
        """
        for plateforme in ("linux", "darwin"):
            self.assertEqual(packproc.no_window_kwargs(platform=plateforme), {})

    def test_la_sortie_d_erreur_est_toujours_recuperee(self):
        """
        Sans console pour la recevoir, une stderr non redirigee serait perdue
        — et c'est elle qui porte le message d'echec de ffmpeg comme de ssh.
        """
        proc = packproc.run([sys.executable, "-c",
                             "import sys; sys.stderr.write('bruit')"])

        self.assertEqual(proc.stdout, b"bruit")


class TestPassagesObliges(unittest.TestCase):
    """Chaque appelant passe-t-il reellement par packproc ?"""

    def setUp(self):
        self.appels = []
        self._reel = packproc.run

        def espion(cmd, **kwargs):
            self.appels.append(list(cmd))
            return subprocess.CompletedProcess(cmd, 0, b"", b"")

        packproc.run = espion

    def tearDown(self):
        packproc.run = self._reel

    def test_ffmpeg(self):
        packcore._run(["ffmpeg", "-version"])

        self.assertEqual(self.appels, [["ffmpeg", "-version"]])

    def test_ssh(self):
        transport = packtransport.SystemTransport(host="1.2.3.4")
        transport.run("echo ok")

        self.assertEqual(len(self.appels), 1)
        self.assertEqual(self.appels[0][0], "ssh")

    def test_scp(self):
        transport = packtransport.SystemTransport(host="1.2.3.4")
        transport.send_dir("/tmp/pack", "/var/mobile/Documents/packs", "pack")

        self.assertEqual(len(self.appels), 1)
        self.assertEqual(self.appels[0][0], "scp")


class TestAucunAppelDirect(unittest.TestCase):
    """
    Le garde-fou.

    Un seul `subprocess.run` ecrit en direct dans un module de l'outil, et les
    fenetres reviennent — pour ce binaire-la seulement, donc de facon d'autant
    plus difficile a relier a sa cause. Ce test relit le code plutot que
    d'esperer qu'on y pense.
    """

    MODULES = ("packcore.py", "packtransport.py", "packgui_win.py",
               "packgui.py", "packcli.py", "packlibrary.py", "packconfig.py")

    APPEL_DIRECT = re.compile(r"\bsubprocess\.(run|call|check_output|Popen)\s*\(")

    def test_aucun_module_n_appelle_subprocess_directement(self):
        fautifs = []

        for nom in self.MODULES:
            chemin = os.path.join(RACINE, nom)

            if not os.path.isfile(chemin):
                continue

            with open(chemin, encoding="utf-8") as handle:
                for numero, ligne in enumerate(handle, 1):
                    if self.APPEL_DIRECT.search(ligne):
                        fautifs.append("%s:%d  %s" % (nom, numero, ligne.strip()))

        self.assertEqual(fautifs, [],
                         "ces appels ouvriraient une console sous Windows :\n"
                         + "\n".join(fautifs))


if __name__ == "__main__":
    unittest.main()
