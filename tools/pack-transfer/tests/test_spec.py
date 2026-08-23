#!/usr/bin/env python3
"""
Correspondance entre ce que `luny-transfer.spec` embarque et ce que
`packconfig.artwork_path()` cherche a l'execution.

----------------------------------------------------------------------------
Ce que ce fichier ne peut pas prouver, et pourquoi il existe quand meme
----------------------------------------------------------------------------

Un build recent a produit un executable qui demarre, ffmpeg trouve au bon
endroit (« ffmpeg : C:\\...\\_MEIxxxxxx\\ffmpeg.exe »), et l'illustration
introuvable — alors que le nom de fichier ecrit dans le `.spec` et celui
cherche par `packconfig.artwork_path()` etaient, relus a l'oeil, identiques.

Cet environnement n'a ni PyInstaller ni Windows : aucun test ici ne peut
lancer une VRAIE construction et verifier que PyInstaller embarque
reellement ce qu'on lui demande, ni ce que produit son cache de build. Ce
que ces tests VERIFIENT, exactement :

1. Le nom cherche par le `.spec` et celui cherche par `artwork_path()` sont
   la MEME valeur Python — pas deux litteraux qui se ressemblent — parce que
   le `.spec` importe desormais `packconfig` au lieu de recopier le nom.
   Ce test execute reellement cette partie du `.spec` (la resolution de
   ressources, pas `Analysis`/`EXE`, qui n'existent que dans le processus
   PyInstaller) et lit la valeur produite.
2. La destination des donnees dans le paquet (`"."`, racine, jamais un
   sous-dossier) est la meme constante que celle qui rend
   `os.path.join(resource_dir(), nom)` correct cote lecture.
3. Bout en bout : le fichier resolu par le `.spec` place dans un dossier
   `_MEIPASS` simule est retrouve par `artwork_path()` avec le meme dossier
   gele — la meme preuve que ce que fait reellement `--onefile`, sans le
   binaire de PyInstaller.
4. Garde-fou : plus aucun nom de fichier illustration n'est ecrit en dur
   dans le `.spec` — si quelqu'un en recopie un a l'avenir sans passer par
   `packconfig`, ce test le signale avant que le decor ne redevienne
   invisible pour une quatrieme fois.

Si le decor manque encore apres cette version, la cause n'est PLUS la
correspondance des noms (verifiee ici, executee, pas seulement lue) : elle
est dans le comportement de PyInstaller lui-meme sur ce poste — voir
NOTES.md, qui documente l'hypothese retenue (cache de build perime) et le
diagnostic desormais disponible dans le journal de l'application
(`packconfig.describe_resource_search`).
"""

import os
import shutil
import sys
import tempfile
import unittest

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RACINE)

import packconfig


SPEC_PATH = os.path.join(RACINE, "luny-transfer.spec")


class FauxAnalysis(object):
    """
    Le strict necessaire pour que le `.spec` s'execute jusqu'au bout sans le
    vrai PyInstaller : capter `datas`/`binaries`, ne rien construire.
    """

    def __init__(self, *_args, **kwargs):
        self.kw = kwargs
        self.pure = []
        self.scripts = []
        self.binaries = []
        self.datas = []


def executer_spec(spec_dir):
    """
    Execute REELLEMENT `luny-transfer.spec` avec `SPECPATH` pointe vers
    `spec_dir`, en simulant seulement les trois fonctions que fournit
    PyInstoller (`Analysis`, `PYZ`, `EXE`) — pas la resolution des ressources,
    qui est le code du depot, execute sans modification.

    Rend le dictionnaire d'environnement du `exec`, d'ou l'on relit `datas`,
    `illustration`, etc.
    """
    env = {
        "SPECPATH": spec_dir,
        "Analysis": FauxAnalysis,
        "PYZ": lambda *a, **k: "PYZ",
        "EXE": lambda *a, **k: ("EXE", k),
    }

    with open(SPEC_PATH, encoding="utf-8") as handle:
        source = handle.read()

    exec(compile(source, SPEC_PATH, "exec"), env)          # noqa: S102

    return env


class Gele(object):
    """Simule `sys.frozen` / `sys._MEIPASS`, comme PyInstoller les pose."""

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


class TestLeSpecExisteEtSExecute(unittest.TestCase):

    def setUp(self):
        if not os.path.isfile(SPEC_PATH):
            self.skipTest("luny-transfer.spec absent")

    def test_le_spec_ne_recopie_plus_le_nom_en_dur(self):
        """
        Garde-fou structurel : c'est la duplication du nom, pas une faute de
        frappe dedans, qui a permis aux deux cotes de diverger sans que rien
        ne le remarque. La reparation retire la duplication elle-meme ; ce
        test verifie qu'elle n'a pas ete reintroduite.
        """
        with open(SPEC_PATH, encoding="utf-8") as handle:
            source = handle.read()

        for nom in packconfig.ARTWORK_NAMES:
            self.assertNotIn(
                '"%s"' % nom, source,
                "%r est recopie en dur dans le .spec — il doit venir de "
                "packconfig.ARTWORK_NAMES, importe, pas duplique" % nom)

        self.assertIn("import packconfig", source)
        self.assertIn("packconfig.build_source", source)

    def test_le_spec_embarque_le_nom_que_artwork_path_cherchera(self):
        """
        Execute la resolution de ressources du `.spec` pour de vrai, sur le
        depot reel, et compare a `packconfig.ARTWORK_NAMES[0]` — le nom que
        `artwork_path()` cherchera au demarrage. Les deux doivent etre la
        MEME valeur, pas deux chaines qui se ressemblent.
        """
        env = executer_spec(RACINE)

        noms_embarques = [os.path.basename(source) for source, _dest in env["datas"]]

        self.assertIn(packconfig.ARTWORK_NAMES[0], noms_embarques)

    def test_la_destination_est_la_racine_du_paquet(self):
        """
        `"."`, jamais un sous-dossier : c'est ce qui rend
        `os.path.join(resource_dir(), nom)` correct cote lecture. Un
        sous-dossier cote empaquetage romprait la correspondance en silence
        — le fichier existerait bel et bien dans le paquet, mais pas au
        chemin cherche.
        """
        env = executer_spec(RACINE)

        for source, dest in env["datas"]:
            if os.path.basename(source) == packconfig.ARTWORK_NAMES[0]:
                self.assertEqual(dest, packconfig.RESOURCE_DEST)
                return

        self.fail("l'illustration n'est pas dans datas")


class TestBoutEnBoutAvecUnMeipassSimule(unittest.TestCase):
    """
    La preuve la plus proche d'une vraie construction --onefile atteignable
    sans PyInstoller ni Windows : le fichier resolu par le `.spec` est copie
    la ou `--onefile` le placerait reellement (`_MEIPASS`, a plat), et on
    verifie que `packconfig.artwork_path()`, en mode gele, le retrouve.
    """

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.spec_dir = os.path.join(self.tmp, "tools", "pack-transfer")
        self.meipass = os.path.join(self.tmp, "_MEI999999")
        self.bureau = os.path.join(self.tmp, "Bureau")

        os.makedirs(self.spec_dir)
        os.makedirs(self.meipass)
        os.makedirs(self.bureau)

        # Une source minimale, distincte de la vraie — son contenu n'importe
        # pas ici, seul son NOM DE FICHIER compte pour ce test.
        with open(os.path.join(self.spec_dir, packconfig.ARTWORK_NAMES[0]),
                  "wb") as handle:
            handle.write(b"PNG factice pour le test")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_le_fichier_pose_a_cote_du_spec_est_retrouve_une_fois_gele(self):
        env = executer_spec(self.spec_dir)

        # Ce que ferait --onefile : chaque entree de `datas` est extraite a
        # plat sous `_MEIPASS/<basename>`. On le reproduit a la main, sans
        # PyInstoller, pour tester la lecture dans les memes conditions.
        for source, dest in env["datas"]:
            self.assertEqual(dest, ".",
                             "cette simulation ne sait copier qu'a plat")
            shutil.copy(source, os.path.join(self.meipass,
                                             os.path.basename(source)))

        with Gele(self.meipass, self.bureau):
            self.assertEqual(
                packconfig.artwork_path(),
                os.path.join(self.meipass, packconfig.ARTWORK_NAMES[0]))

    def test_absent_partout_donne_un_diagnostic_qui_liste_les_dossiers(self):
        """
        Le repli quand rien n'est trouve : `describe_resource_search()` doit
        vraiment lister ce que contiennent les DEUX dossiers inspectes, pas
        se contenter de les nommer. C'est ce qui manquait au journal lors du
        defaut signale.

        `repo_root` est isole pour la duree du test : sans quoi le dernier
        repli d'`artwork_path()` (« lance depuis les sources ») retrouverait
        la vraie illustration de CE depot, et ne testerait plus le cas ou
        rien n'est trouve nulle part — celui d'un poste Windows sans depot.
        """
        vide_meipass = os.path.join(self.tmp, "_MEI000000")
        os.makedirs(vide_meipass)

        reel = packconfig.repo_root
        packconfig.repo_root = lambda: self.tmp

        try:
            with Gele(vide_meipass, self.bureau):
                self.assertIsNone(packconfig.artwork_path())

                diagnostic = packconfig.describe_resource_search()
        finally:
            packconfig.repo_root = reel

        self.assertIn(vide_meipass, diagnostic)
        self.assertIn(self.bureau, diagnostic)
        self.assertIn("(vide)", diagnostic)


if __name__ == "__main__":
    unittest.main()
