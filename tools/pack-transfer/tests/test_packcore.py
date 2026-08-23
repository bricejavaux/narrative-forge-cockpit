#!/usr/bin/env python3
"""
Non-regression de packcore, et conversion reelle.

Deux choses sont verifiees ici :

1. que l'injection du chemin de ffmpeg n'a rien casse — c'est l'une des deux
   seules modifications apportees a un module deja eprouve sur l'appareil ;
2. que la conversion `.ogg -> .mp3` FONCTIONNE. Le README de l'outil notait
   jusqu'ici que seul son chemin d'echec avait ete verifie, ffmpeg etant
   absent de la machine. Il est installe depuis : ces tests executent la vraie
   commande, sur un vrai fichier Ogg, et verifient le resultat avec ffprobe.

Les tests qui exigent ffmpeg s'annoncent ignores plutot que de passer en
silence quand il manque.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import packcore
import packtransport

FFMPEG = shutil.which("ffmpeg")
FFPROBE = shutil.which("ffprobe")
besoin_ffmpeg = unittest.skipIf(FFMPEG is None, "ffmpeg absent de cette machine")


def silence(_message):
    pass


class Journal(object):
    def __init__(self):
        self.lignes = []

    def __call__(self, message):
        self.lignes.append(message)

    @property
    def texte(self):
        return "\n".join(self.lignes)


def make_ogg(path, seconds=1):
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "lavfi",
                    "-i", "sine=frequency=440:duration=%d" % seconds,
                    "-c:a", "libvorbis", path], check=True)


def make_bmp(path):
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "lavfi",
                    "-i", "color=c=red:s=32x32:d=1", "-frames:v", "1",
                    path], check=True)


def write_story(pack_dir, stages):
    os.makedirs(os.path.join(pack_dir, "assets"), exist_ok=True)

    with open(os.path.join(pack_dir, "story.json"), "w", encoding="utf-8") as handle:
        json.dump({"format": "v1", "title": "Essai", "version": 1,
                   "stageNodes": stages}, handle)


class TestInjectionFfmpeg(unittest.TestCase):
    """Le chemin de ffmpeg doit etre injectable : un .exe ne l'a pas dans le PATH."""

    def setUp(self):
        self._sauvegarde = packcore.FFMPEG_BINARY

    def tearDown(self):
        packcore.FFMPEG_BINARY = self._sauvegarde

    def test_par_defaut_cherche_dans_le_path(self):
        packcore.FFMPEG_BINARY = None
        self.assertEqual(packcore.ffmpeg_path(), shutil.which("ffmpeg"))

    def test_chemin_injecte_est_retenu(self):
        packcore.FFMPEG_BINARY = __file__      # un fichier qui existe
        self.assertEqual(packcore.ffmpeg_path(), __file__)

    def test_chemin_injecte_inexistant_vaut_absence(self):
        """Mieux vaut None qu'un chemin qui echouera a l'execution."""
        packcore.FFMPEG_BINARY = "/n/existe/pas/ffmpeg.exe"
        self.assertIsNone(packcore.ffmpeg_path())


class TestEspaceDisque(unittest.TestCase):
    """
    Lecture de `df`, sans appareil.

    L'analyse est volontairement tolerante : sur ce systeme minimal, `df` peut
    venir de busybox comme de BSD, et un nom de volume long renvoie les
    chiffres a la ligne suivante. Le repli — « espace disque non disponible »
    — vaut mieux qu'un chiffre faux.
    """

    KILO = ("Filesystem 1024-blocks     Used Available Capacity Mounted on\n"
            "/dev/disk0s2s2  14371500  9231944   4894556      66% /var\n")

    BSD_512 = ("Filesystem  512-blocks      Used     Avail Capacity  Mounted on\n"
               "/dev/disk0s2s2  28743000  18463888   9789112    66%    /var\n")

    REPLIEE = ("Filesystem           1024-blocks Used Available Capacity Mounted on\n"
               "/dev/disk0s2s2\n"
               "                        14371500 9231944 4894556  66% /var\n")

    def test_sortie_en_kilo_octets(self):
        libre, total = packcore.parse_df(self.KILO)

        self.assertEqual(libre, 4894556 * 1024)
        self.assertEqual(total, 14371500 * 1024)

    def test_les_blocs_de_512_octets_ne_doublent_pas_la_capacite(self):
        """Un `df` BSD sans `-k` compte en blocs de 512 : l'en-tete le dit."""
        libre, total = packcore.parse_df(self.BSD_512, bloc_par_defaut=512)

        self.assertEqual(total, 14371500 * 1024)

    def test_une_ligne_repliee_est_lue_quand_meme(self):
        self.assertEqual(packcore.parse_df(self.REPLIEE),
                         (4894556 * 1024, 14371500 * 1024))

    def test_une_sortie_illisible_ne_donne_pas_un_chiffre_faux(self):
        for sortie in ("", "sh: df: not found", "Filesystem\n", None,
                       "Filesystem 1024-blocks\n/dev/disk0s2s2 abc def ghi"):
            self.assertIsNone(packcore.parse_df(sortie), repr(sortie))

    def test_des_chiffres_incoherents_sont_refuses(self):
        """Plus de libre que de total : la lecture est fausse, pas la mesure."""
        self.assertIsNone(packcore.parse_df(
            "Filesystem 1024-blocks Used Available\n/dev/x 100 10 900\n"))

    def test_affichage_en_gigaoctets(self):
        self.assertEqual(packcore.human_disk(4894556 * 1024), "4.7 Go")
        self.assertEqual(packcore.human_disk(512 * 1024 * 1024), "512 Mo")


class TestEspaceDisqueDistant(unittest.TestCase):
    """Le meme, avec le transport en carton : deux tentatives, puis repli."""

    class Faux(object):
        def __init__(self, reponses):
            self.reponses = list(reponses)
            self.commandes = []

        def run(self, commande, timeout=60):
            self.commandes.append(commande)
            code, sortie = self.reponses.pop(0)

            return packtransport.Result(code, sortie.encode("utf-8"))

    def test_df_k_suffit(self):
        faux = self.Faux([(0, TestEspaceDisque.KILO)])
        mesure = packcore.remote_disk(transport=faux)

        self.assertEqual(mesure, (4894556 * 1024, 14371500 * 1024))
        self.assertEqual(len(faux.commandes), 1)
        self.assertIn("df -k", faux.commandes[0])

    def test_repli_sur_df_seul_quand_l_option_est_refusee(self):
        faux = self.Faux([(1, "df: illegal option -- k"),
                          (0, TestEspaceDisque.BSD_512)])
        mesure = packcore.remote_disk(transport=faux)

        self.assertEqual(mesure, (4894556 * 1024, 14371500 * 1024))
        self.assertEqual(len(faux.commandes), 2)

    def test_df_absent_rend_none_et_le_dit(self):
        faux = self.Faux([(127, "sh: df: not found"), (127, "sh: df: not found")])
        messages = []

        self.assertIsNone(packcore.remote_disk(log=messages.append, transport=faux))
        self.assertTrue(any("non disponible" in m for m in messages), messages)


class TestValidation(unittest.TestCase):

    def test_pack_correct(self):
        with tempfile.TemporaryDirectory() as tmp:
            write_story(tmp, [{"uuid": "a"}])
            journal = Journal()
            self.assertIsNotNone(packcore.validate_pack(tmp, journal))
            self.assertIn("validation OK", journal.texte)

    def test_story_absent(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIsNone(packcore.validate_pack(tmp, silence))

    def test_version_absente_est_signalee(self):
        """Le moteur refuse un pack sans version : le taire serait un piege."""
        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, "assets"))
            with open(os.path.join(tmp, "story.json"), "w") as handle:
                json.dump({"title": "Sans version", "stageNodes": []}, handle)

            journal = Journal()
            packcore.validate_pack(tmp, journal)

        self.assertIn("version", journal.texte)
        self.assertIn("refusera", journal.texte)


@besoin_ffmpeg
class TestConversionReelle(unittest.TestCase):
    """
    La vraie commande ffmpeg, sur de vrais fichiers.

    Jusqu'ici seul le chemin d'echec avait ete verifie — ffmpeg manquait sur
    la machine de developpement. Ce n'est plus le cas.
    """

    def test_ogg_devient_un_mp3_lisible(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            write_story(pack, [{"uuid": "a", "audio": "voix.ogg"}])
            make_ogg(os.path.join(pack, "assets", "voix.ogg"))

            journal = Journal()
            sortie = packcore.convert_pack(pack, os.path.join(tmp, "build"), journal)

            self.assertIsNotNone(sortie)
            mp3 = os.path.join(sortie, "assets", "voix.mp3")

            self.assertTrue(os.path.isfile(mp3), journal.texte)
            self.assertGreater(os.path.getsize(mp3), 0)
            self.assertIn("converti", journal.texte)

            # La reference doit avoir suivi, sinon le pack pointe dans le vide.
            with open(os.path.join(sortie, "story.json"), encoding="utf-8") as handle:
                story = json.load(handle)

            self.assertEqual(story["stageNodes"][0]["audio"], "voix.mp3")

            if FFPROBE:
                proc = subprocess.run(
                    [FFPROBE, "-v", "error", "-select_streams", "a:0",
                     "-show_entries", "stream=codec_name", "-of", "csv=p=0", mp3],
                    stdout=subprocess.PIPE)
                self.assertEqual(proc.stdout.decode().strip(), "mp3")

    def test_l_original_n_est_jamais_touche(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            write_story(pack, [{"uuid": "a", "audio": "voix.ogg"}])
            source = os.path.join(pack, "assets", "voix.ogg")
            make_ogg(source)
            avant = os.path.getsize(source)

            packcore.convert_pack(pack, os.path.join(tmp, "build"), silence)

            self.assertTrue(os.path.isfile(source))
            self.assertEqual(os.path.getsize(source), avant)

            with open(os.path.join(pack, "story.json"), encoding="utf-8") as handle:
                self.assertEqual(json.load(handle)["stageNodes"][0]["audio"], "voix.ogg")

    def test_bmp_devient_png(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            write_story(pack, [{"uuid": "a", "image": "fond.bmp"}])
            make_bmp(os.path.join(pack, "assets", "fond.bmp"))

            journal = Journal()
            sortie = packcore.convert_pack(pack, os.path.join(tmp, "build"), journal)

            self.assertTrue(os.path.isfile(os.path.join(sortie, "assets", "fond.png")),
                            journal.texte)

            with open(os.path.join(sortie, "story.json"), encoding="utf-8") as handle:
                self.assertEqual(json.load(handle)["stageNodes"][0]["image"], "fond.png")

    def test_ogg_de_zero_octet_recopie_et_n_arrete_rien(self):
        """
        Comportement deja eprouve sur l'appareil avec `two-branches` : un
        fichier vide est nomme, recopie tel quel, sa reference laissee
        intacte, et le pack reste jouable.
        """
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            write_story(pack, [{"uuid": "a", "audio": "vide.ogg"},
                               {"uuid": "b", "audio": "bon.ogg"}])
            open(os.path.join(pack, "assets", "vide.ogg"), "wb").close()
            make_ogg(os.path.join(pack, "assets", "bon.ogg"))

            journal = Journal()
            sortie = packcore.convert_pack(pack, os.path.join(tmp, "build"), journal)

            self.assertIsNotNone(sortie)
            self.assertIn("0 octet", journal.texte)
            self.assertTrue(os.path.isfile(os.path.join(sortie, "assets", "vide.ogg")))
            # L'autre piste a bien ete convertie malgre l'echec de la premiere.
            self.assertTrue(os.path.isfile(os.path.join(sortie, "assets", "bon.mp3")))

            with open(os.path.join(sortie, "story.json"), encoding="utf-8") as handle:
                story = json.load(handle)

            self.assertEqual(story["stageNodes"][0]["audio"], "vide.ogg")
            self.assertEqual(story["stageNodes"][1]["audio"], "bon.mp3")

    def test_ffmpeg_absent_laisse_le_fichier_tel_quel(self):
        """Chemin d'echec : le pack passe, muet pour cette piste."""
        sauvegarde = packcore.FFMPEG_BINARY
        packcore.FFMPEG_BINARY = "/n/existe/pas/ffmpeg"

        try:
            with tempfile.TemporaryDirectory() as tmp:
                pack = os.path.join(tmp, "p")
                write_story(pack, [{"uuid": "a", "audio": "voix.ogg"}])
                make_ogg(os.path.join(pack, "assets", "voix.ogg"))

                journal = Journal()
                sortie = packcore.convert_pack(pack, os.path.join(tmp, "build"), journal)

                self.assertIsNotNone(sortie)
                self.assertIn("ffmpeg absent", journal.texte)
                self.assertTrue(os.path.isfile(os.path.join(sortie, "assets", "voix.ogg")))
        finally:
            packcore.FFMPEG_BINARY = sauvegarde

    def test_fichier_deja_au_bon_format_recopie_sans_toucher(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            write_story(pack, [{"uuid": "a", "audio": "deja.mp3"}])
            with open(os.path.join(pack, "assets", "deja.mp3"), "wb") as handle:
                handle.write(b"MP3")

            journal = Journal()
            sortie = packcore.convert_pack(pack, os.path.join(tmp, "build"), journal)

            self.assertIn("1 copie", journal.texte)
            with open(os.path.join(sortie, "assets", "deja.mp3"), "rb") as handle:
                self.assertEqual(handle.read(), b"MP3")


class TestExtractionZip(unittest.TestCase):

    def test_archive_illisible(self):
        with tempfile.TemporaryDirectory() as tmp:
            faux = os.path.join(tmp, "faux.zip")
            with open(faux, "wb") as handle:
                handle.write(b"pas une archive")

            self.assertIsNone(packcore.extract_zip(faux, tmp, silence))


if __name__ == "__main__":
    unittest.main(verbosity=2)
