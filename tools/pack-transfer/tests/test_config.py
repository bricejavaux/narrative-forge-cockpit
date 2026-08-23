#!/usr/bin/env python3
"""
Localisation des ressources, y compris dans un executable gele.

L'hypothese avancee pour expliquer le decor absent etait celle-ci : un chemin
relatif qui ne correspondrait pas au dossier temporaire ou `--onefile`
extrait ses ressources. Elle etait fausse — `resource_dir()` lisait deja
`sys._MEIPASS`, et la cause reelle etait le recadrage (voir test_packimage).

Elle reste neanmoins la panne classique de ce mode d'empaquetage, et rien ne
la verifiait. Ces tests SIMULENT un executable gele : `sys.frozen`,
`sys._MEIPASS` et `sys.executable` sont poses comme PyInstaller les pose au
lancement, et l'on regarde ou l'outil va chercher chaque chose.
"""

import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import packconfig


class Gele(object):
    """
    Contexte : « on tourne depuis un .exe --onefile ».

    Reproduit les trois marqueurs que PyInstaller pose, et les retire ensuite
    — un `sys.frozen` oublie fausserait tous les tests suivants du meme
    processus.
    """

    def __init__(self, meipass, exe_dir):
        self.meipass = meipass
        self.exe = os.path.join(exe_dir, "luny-transfer.exe")

    def __enter__(self):
        self._frozen = getattr(sys, "frozen", None)
        self._mei = getattr(sys, "_MEIPASS", None)
        self._exe = sys.executable

        sys.frozen = True
        sys._MEIPASS = self.meipass
        sys.executable = self.exe

        return self

    def __exit__(self, *_erreur):
        if self._frozen is None:
            del sys.frozen
        else:
            sys.frozen = self._frozen

        if self._mei is None:
            del sys._MEIPASS
        else:
            sys._MEIPASS = self._mei

        sys.executable = self._exe

        return False


class TestExecutableGele(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.meipass = os.path.join(self.tmp, "_MEI123456")
        self.bureau = os.path.join(self.tmp, "Bureau")
        os.makedirs(self.meipass)
        os.makedirs(self.bureau)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _poser(self, dossier, nom, contenu=b"x"):
        chemin = os.path.join(dossier, nom)

        with open(chemin, "wb") as handle:
            handle.write(contenu)

        return chemin

    def test_les_reglages_restent_a_cote_de_l_exe(self):
        """
        Et surtout PAS dans le dossier d'extraction : celui-ci est efface a
        chaque sortie, la configuration disparaitrait a chaque lancement.
        """
        with Gele(self.meipass, self.bureau):
            self.assertEqual(packconfig.app_dir(), self.bureau)
            self.assertEqual(os.path.dirname(packconfig.config_path()), self.bureau)

    def test_les_ressources_sont_cherchees_dans_le_dossier_d_extraction(self):
        with Gele(self.meipass, self.bureau):
            self.assertEqual(packconfig.resource_dir(), self.meipass)

    def test_l_illustration_est_trouvee_dans_le_dossier_d_extraction(self):
        """
        Le cas exact d'un `--onefile` : l'image n'est ni dans le repertoire
        courant, ni a cote de l'exe, mais dans `sys._MEIPASS`.
        """
        attendu = self._poser(self.meipass, "luny_background_source_portrait.png")

        with Gele(self.meipass, self.bureau):
            self.assertEqual(packconfig.artwork_path(), attendu)

    def test_l_illustration_posee_a_la_main_a_cote_de_l_exe_est_trouvee_aussi(self):
        """Installation deballee, sans `--onefile`."""
        attendu = self._poser(self.bureau, "luny_background_source_portrait.png")

        with Gele(self.meipass, self.bureau):
            self.assertEqual(packconfig.artwork_path(), attendu)

    def test_ffmpeg_est_trouve_dans_le_dossier_d_extraction(self):
        attendu = self._poser(self.meipass, "ffmpeg.exe")

        with Gele(self.meipass, self.bureau):
            self.assertEqual(packconfig.ffmpeg_binary(), attendu)

    def test_le_readme_embarque_est_trouve(self):
        attendu = self._poser(self.meipass, "README-windows.md", b"# lisezmoi")

        with Gele(self.meipass, self.bureau):
            self.assertEqual(packconfig.readme_path(), attendu)

    def test_rien_d_embarque_ne_fait_pas_tomber_l_outil(self):
        """Un decor absent doit rendre None, jamais lever."""
        with Gele(self.meipass, self.bureau):
            self.assertIsNone(packconfig.ffmpeg_binary())

            # L'illustration a un dernier repli : le depot, quand on tourne
            # depuis les sources. Il ne doit pas designer autre chose qu'un
            # fichier existant.
            chemin = packconfig.artwork_path()
            self.assertTrue(chemin is None or os.path.isfile(chemin))


class TestIdentite(unittest.TestCase):

    def test_la_version_est_lisible(self):
        morceaux = packconfig.VERSION.split(".")

        self.assertEqual(len(morceaux), 3)
        self.assertTrue(all(m.isdigit() for m in morceaux), packconfig.VERSION)

    def test_la_date_de_build_a_la_bonne_forme(self):
        import datetime

        datetime.date.fromisoformat(packconfig.build_date())

    def test_l_auteur_est_annonce(self):
        self.assertEqual(packconfig.AUTEUR, "Brice avec Claude")


class TestReglages(unittest.TestCase):

    def test_les_filtres_ont_une_valeur_par_defaut(self):
        """
        Sans elles, un fichier de reglages ecrit par une version anterieure
        ferait tomber l'interface a la lecture.
        """
        valeurs = packconfig.load()

        self.assertIn("filtre_compatibles", valeurs)
        self.assertIn("filtre_presence", valeurs)

    def test_un_fichier_ancien_est_complete_sans_erreur(self):
        import json

        with tempfile.TemporaryDirectory() as tmp:
            chemin = os.path.join(tmp, packconfig.CONFIG_NAME)

            with open(chemin, "w", encoding="utf-8") as handle:
                json.dump({"host": "10.0.0.1"}, handle)

            reel = packconfig.config_path
            packconfig.config_path = lambda: chemin

            try:
                valeurs = packconfig.load()
            finally:
                packconfig.config_path = reel

        self.assertEqual(valeurs["host"], "10.0.0.1")
        self.assertEqual(valeurs["filtre_presence"], "tous")


if __name__ == "__main__":
    unittest.main()
