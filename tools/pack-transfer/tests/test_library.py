#!/usr/bin/env python3
"""
Balayage local, regle de correspondance et difference des deux bibliotheques.

Aucun reseau, aucun Pillow, aucun appareil : tout ce qui est teste ici est de
la logique pure, et c'est precisement la part que l'environnement de
developpement PEUT valider.
"""

import json
import os
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import packlibrary as pl


def story(title="Un titre", stages=None):
    return {
        "format": "v1",
        "title": title,
        "version": 1,
        "stageNodes": stages if stages is not None else [
            {"uuid": "n1", "squareOne": True, "image": "cover.jpg", "audio": "a.mp3"},
            {"uuid": "n2", "image": "autre.jpg"},
        ],
    }


def write_pack_dir(root, name, data=None, assets=()):
    chemin = os.path.join(root, name)
    os.makedirs(os.path.join(chemin, "assets"), exist_ok=True)

    with open(os.path.join(chemin, "story.json"), "w", encoding="utf-8") as handle:
        json.dump(data if data is not None else story(), handle)

    for asset in assets:
        with open(os.path.join(chemin, "assets", asset), "wb") as handle:
            handle.write(b"x")

    return chemin


def write_zip(root, filename, inner_prefix, data=None, assets=()):
    chemin = os.path.join(root, filename)

    with zipfile.ZipFile(chemin, "w") as archive:
        base = (inner_prefix + "/") if inner_prefix else ""
        archive.writestr(base + "story.json",
                         json.dumps(data if data is not None else story()))
        for asset in assets:
            archive.writestr(base + "assets/" + asset, b"x")

    return chemin


class TestNomDeTransfert(unittest.TestCase):
    """
    La cle de comparaison est le nom de DOSSIER que le pack occupera sur
    l'appareil, jamais le titre : l'appareil ne connait que le premier.
    """

    def test_dossier_prend_son_nom_de_base(self):
        with tempfile.TemporaryDirectory() as tmp:
            write_pack_dir(tmp, "MonPack", story(title="Titre tres different"))
            pack = pl.read_directory_pack(os.path.join(tmp, "MonPack"))

        self.assertEqual(pack.transfer_name, "MonPack")
        self.assertEqual(pack.title, "Titre tres different")

    def test_zip_avec_story_a_la_racine_prend_le_nom_de_l_archive(self):
        """Comme packcore.extract_zip, qui extrait dans <racine>/<nom-du-zip>/."""
        with tempfile.TemporaryDirectory() as tmp:
            chemin = write_zip(tmp, "IDRISS_ET_COLETTE.zip", "")
            pack = pl.read_zip_pack(chemin)

        self.assertEqual(pack.transfer_name, "IDRISS_ET_COLETTE")

    def test_zip_avec_dossier_interne_prend_le_dossier_interne(self):
        with tempfile.TemporaryDirectory() as tmp:
            chemin = write_zip(tmp, "archive-quelconque.zip", "LE_VRAI_NOM")
            pack = pl.read_zip_pack(chemin)

        self.assertEqual(pack.transfer_name, "LE_VRAI_NOM")

    def test_story_le_moins_profond_l_emporte(self):
        """Sans tri, le resultat dependrait de l'ordre du catalogue ZIP."""
        with tempfile.TemporaryDirectory() as tmp:
            chemin = os.path.join(tmp, "a.zip")

            with zipfile.ZipFile(chemin, "w") as archive:
                archive.writestr("profond/encore/story.json", json.dumps(story()))
                archive.writestr("surface/story.json", json.dumps(story()))

            pack = pl.read_zip_pack(chemin)

        self.assertEqual(pack.transfer_name, "surface")


class TestDetectionConversion(unittest.TestCase):

    def test_ogg_et_bmp_signales(self):
        with tempfile.TemporaryDirectory() as tmp:
            write_pack_dir(tmp, "p", assets=("a.ogg", "b.oga", "c.bmp", "d.mp3"))
            pack = pl.read_directory_pack(os.path.join(tmp, "p"))

        self.assertEqual(pack.to_convert, ["a.ogg", "b.oga", "c.bmp"])
        self.assertTrue(pack.needs_conversion)
        self.assertIn("conversion necessaire", pack.state_label)

    def test_pack_deja_au_bon_format(self):
        with tempfile.TemporaryDirectory() as tmp:
            write_pack_dir(tmp, "p", assets=("a.mp3", "b.jpg"))
            pack = pl.read_directory_pack(os.path.join(tmp, "p"))

        self.assertFalse(pack.needs_conversion)
        self.assertEqual(pack.state_label, "pret tel quel")

    def test_extension_en_majuscules(self):
        with tempfile.TemporaryDirectory() as tmp:
            write_pack_dir(tmp, "p", assets=("A.OGG",))
            pack = pl.read_directory_pack(os.path.join(tmp, "p"))

        self.assertEqual(pack.to_convert, ["A.OGG"])

    def test_conversion_detectee_aussi_dans_un_zip(self):
        with tempfile.TemporaryDirectory() as tmp:
            chemin = write_zip(tmp, "z.zip", "pack", assets=("son.ogg", "img.jpg"))
            pack = pl.read_zip_pack(chemin)

        self.assertEqual(pack.to_convert, ["son.ogg"])


class TestNoeudDEntree(unittest.TestCase):

    def test_squareOne_l_emporte_sur_l_ordre(self):
        data = story(stages=[
            {"uuid": "premier", "image": "pas-celle-ci.jpg"},
            {"uuid": "vrai-depart", "squareOne": True, "image": "couverture.jpg"},
        ])

        with tempfile.TemporaryDirectory() as tmp:
            write_pack_dir(tmp, "p", data)
            pack = pl.read_directory_pack(os.path.join(tmp, "p"))

        self.assertEqual(pack.cover_asset, "couverture.jpg")

    def test_sans_squareOne_le_premier_fait_foi(self):
        data = story(stages=[{"uuid": "a", "image": "premiere.jpg"},
                             {"uuid": "b", "image": "seconde.jpg"}])

        with tempfile.TemporaryDirectory() as tmp:
            write_pack_dir(tmp, "p", data)
            pack = pl.read_directory_pack(os.path.join(tmp, "p"))

        self.assertEqual(pack.cover_asset, "premiere.jpg")

    def test_pack_sans_noeud(self):
        with tempfile.TemporaryDirectory() as tmp:
            write_pack_dir(tmp, "p", story(stages=[]))
            pack = pl.read_directory_pack(os.path.join(tmp, "p"))

        self.assertIsNone(pack.cover_asset)
        self.assertTrue(pack.valid)


class TestEntreesInvalides(unittest.TestCase):
    """Une entree invalide est RENDUE avec sa raison, jamais filtree en silence."""

    def test_dossier_sans_story(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, "pas-un-pack"))
            packs = pl.scan_local(tmp)

        self.assertEqual(len(packs), 1)
        self.assertFalse(packs[0].valid)
        self.assertIn("story.json absent", packs[0].error)

    def test_story_illisible(self):
        with tempfile.TemporaryDirectory() as tmp:
            chemin = os.path.join(tmp, "casse")
            os.makedirs(chemin)
            with open(os.path.join(chemin, "story.json"), "w") as handle:
                handle.write("{ pas du json")

            pack = pl.read_directory_pack(chemin)

        self.assertFalse(pack.valid)
        self.assertIn("illisible", pack.error)

    def test_racine_non_objet(self):
        with tempfile.TemporaryDirectory() as tmp:
            chemin = os.path.join(tmp, "liste")
            os.makedirs(chemin)
            with open(os.path.join(chemin, "story.json"), "w") as handle:
                json.dump([1, 2, 3], handle)

            pack = pl.read_directory_pack(chemin)

        self.assertFalse(pack.valid)

    def test_zip_abime(self):
        with tempfile.TemporaryDirectory() as tmp:
            chemin = os.path.join(tmp, "faux.zip")
            with open(chemin, "wb") as handle:
                handle.write(b"ceci n'est pas une archive")

            pack = pl.read_zip_pack(chemin)

        self.assertFalse(pack.valid)
        self.assertIn("illisible", pack.error)


class TestFiltres(unittest.TestCase):
    """
    Les deux filtres du volet local.

    Le balayage rend tout, y compris les dossiers qui ne sont pas des packs :
    c'est voulu. Passe quelques dizaines d'entrees, ce meme principe noie les
    vrais packs, d'ou ces filtres — qui masquent, sans jamais rien oublier.
    """

    def rows(self):
        locaux = [
            pl.LocalPack("/faux/nouveau", "dossier", "nouveau"),
            pl.LocalPack("/faux/commun", "dossier", "commun"),
            pl.LocalPack("/faux/PS2", "dossier", "PS2", error="story.json absent"),
        ]
        distants = [pl.RemotePack("commun", "documents"),
                    pl.RemotePack("orphelin", "documents")]

        return pl.build_diff(locaux, distants)

    def cles(self, lignes):
        return [r.key for r in lignes]

    def test_sans_filtre_toutes_les_lignes_locales_sont_visibles(self):
        visibles, masquees = pl.filter_rows(self.rows())

        self.assertEqual(sorted(self.cles(visibles)), ["commun", "nouveau", "ps2"])
        self.assertEqual(masquees, [])

    def test_une_ligne_distante_seule_n_apparait_dans_aucune_des_deux_listes(self):
        """Le volet gauche montre la bibliotheque du poste, elle seule."""
        visibles, masquees = pl.filter_rows(self.rows())

        self.assertNotIn("orphelin", self.cles(visibles))
        self.assertNotIn("orphelin", self.cles(masquees))

    def test_compatibles_seuls_ecarte_les_entrees_sans_story(self):
        visibles, masquees = pl.filter_rows(self.rows(), compatibles_seuls=True)

        self.assertEqual(sorted(self.cles(visibles)), ["commun", "nouveau"])
        self.assertEqual(self.cles(masquees), ["ps2"])

    def test_absents_de_l_appareil(self):
        visibles, _ = pl.filter_rows(self.rows(), presence=pl.PRESENCE_ABSENTS)

        self.assertEqual(sorted(self.cles(visibles)), ["nouveau", "ps2"])

    def test_deja_sur_l_appareil(self):
        visibles, _ = pl.filter_rows(self.rows(), presence=pl.PRESENCE_PRESENTS)

        self.assertEqual(self.cles(visibles), ["commun"])

    def test_les_deux_filtres_se_combinent(self):
        visibles, masquees = pl.filter_rows(
            self.rows(), compatibles_seuls=True, presence=pl.PRESENCE_ABSENTS)

        self.assertEqual(self.cles(visibles), ["nouveau"])
        self.assertEqual(sorted(self.cles(masquees)), ["commun", "ps2"])

    def test_rien_n_est_perdu(self):
        """Chaque ligne locale est dans l'une des deux listes, jamais nulle part."""
        lignes = self.rows()
        locales = {r.key for r in lignes if r.local is not None}

        for compat in (False, True):
            for presence in pl.PRESENCES:
                visibles, masquees = pl.filter_rows(lignes, compat, presence)
                vues = set(self.cles(visibles)) | set(self.cles(masquees))

                self.assertEqual(vues, locales, "%s / %s" % (compat, presence))

    def test_une_valeur_de_filtre_abimee_retombe_sur_tous(self):
        """Le reglage vient d'un fichier : il peut contenir n'importe quoi."""
        visibles, masquees = pl.filter_rows(self.rows(), presence="n'importe quoi")

        self.assertEqual(len(visibles), 3)
        self.assertEqual(masquees, [])


class TestDiff(unittest.TestCase):

    def rows(self, locaux, distants):
        return {r.key: r for r in pl.build_diff(locaux, distants)}

    def local(self, name, **kw):
        return pl.LocalPack("/faux/" + name, "dossier", name, **kw)

    def test_local_seul_est_pre_coche(self):
        rows = self.rows([self.local("nouveau")], [])
        ligne = rows["nouveau"]

        self.assertEqual(ligne.status, pl.DiffRow.LOCAL_ONLY)
        self.assertTrue(ligne.preselect_send)
        self.assertFalse(ligne.preselect_delete)

    def test_des_deux_cotes_n_est_jamais_pre_coche(self):
        """Reenvoyer est un ecrasement : l'outil n'a pas a le decider."""
        rows = self.rows([self.local("commun")],
                         [pl.RemotePack("commun", "documents", 3, 100)])
        ligne = rows["commun"]

        self.assertEqual(ligne.status, pl.DiffRow.BOTH)
        self.assertFalse(ligne.preselect_send)
        self.assertIn("ecrase", ligne.note)

    def test_distant_seul_n_est_jamais_pre_coche(self):
        rows = self.rows([], [pl.RemotePack("orphelin", "documents", 2, 50)])
        ligne = rows["orphelin"]

        self.assertEqual(ligne.status, pl.DiffRow.REMOTE_ONLY)
        self.assertFalse(ligne.preselect_send)
        self.assertFalse(ligne.preselect_delete)

    def test_pack_invalide_jamais_pre_coche(self):
        rows = self.rows([self.local("casse", error="story.json absent")], [])
        self.assertFalse(rows["casse"].preselect_send)

    def test_correspondance_insensible_a_la_casse(self):
        """HFS+ est insensible a la casse : MonPack et monpack sont le meme dossier."""
        rows = self.rows([self.local("MonPack")],
                         [pl.RemotePack("monpack", "documents", 1, 1)])

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows["monpack"].status, pl.DiffRow.BOTH)

    def test_noms_ambigus_signales_et_jamais_pre_coches(self):
        rows = self.rows([self.local("Doublon"), self.local("doublon")], [])
        ligne = rows["doublon"]

        self.assertTrue(ligne.ambiguous)
        self.assertFalse(ligne.preselect_send)
        self.assertIn("nom ambigu", ligne.note)

    def test_present_aux_deux_emplacements_donne_deux_lignes_distantes(self):
        """L'app affiche alors deux tuiles : le doublon doit se voir."""
        rows = self.rows([], [pl.RemotePack("double", "bundle", 1, 1),
                              pl.RemotePack("double", "documents", 1, 1)])
        ligne = rows["double"]

        self.assertEqual(len(ligne.remotes), 2)
        self.assertEqual([r.location for r in ligne.remotes], ["bundle", "documents"])
        self.assertEqual(len(ligne.deletable_remotes), 1)

    def test_bundle_protege(self):
        rows = self.rows([], [pl.RemotePack("livre", "bundle", 1, 1)])
        ligne = rows["livre"]

        self.assertTrue(ligne.remotes[0].protected)
        self.assertEqual(ligne.deletable_remotes, [])
        self.assertIn("non supprimable", ligne.remotes[0].state_label)


class TestRecapitulatif(unittest.TestCase):

    def test_compte_les_conversions_separement(self):
        locaux = [pl.LocalPack("/a", "dossier", "avec", to_convert=["x.ogg"]),
                  pl.LocalPack("/b", "dossier", "sans")]
        rows = pl.build_diff(locaux, [])
        resume = pl.summarise(rows, {"avec", "sans"}, set())

        self.assertEqual(resume["envois"], 2)
        self.assertEqual(resume["conversions"], 1)
        self.assertIn("dont 1 avec conversion", pl.summary_text(resume))

    def test_une_suppression_protegee_est_comptee_a_part(self):
        """Le recapitulatif ne doit pas promettre une suppression qui n'aura pas lieu."""
        rows = pl.build_diff([], [pl.RemotePack("livre", "bundle", 1, 1)])
        resume = pl.summarise(rows, set(), {"livre"})

        self.assertEqual(resume["suppressions"], 0)
        self.assertEqual(resume["protegees"], 1)
        self.assertIn("protege", pl.summary_text(resume))

    def test_rien_de_selectionne(self):
        rows = pl.build_diff([], [])
        self.assertEqual(pl.summary_text(pl.summarise(rows, set(), set())),
                         "rien de selectionne")

    def test_pack_invalide_exclu_du_compte_d_envoi(self):
        locaux = [pl.LocalPack("/a", "dossier", "casse", error="story.json absent")]
        rows = pl.build_diff(locaux, [])
        resume = pl.summarise(rows, {"casse"}, set())

        self.assertEqual(resume["envois"], 0)


class TestInitiale(unittest.TestCase):
    """Meme regle que la tuile de l'app iOS : un pack ne doit pas changer de lettre."""

    def test_article_detache_saute(self):
        self.assertEqual(pl.cover_initial("La nuit du renard"), "N")

    def test_article_elide_saute(self):
        self.assertEqual(pl.cover_initial("L'etoile qui baille"), "E")
        self.assertEqual(pl.cover_initial("L’etoile qui baille"), "E")

    def test_titre_sans_article(self):
        self.assertEqual(pl.cover_initial("IDRISS ET COLETTE"), "I")

    def test_titre_reduit_a_son_article(self):
        self.assertEqual(pl.cover_initial("Le"), "L")

    def test_titre_vide(self):
        self.assertEqual(pl.cover_initial(""), "?")
        self.assertEqual(pl.cover_initial(None), "?")


class TestCouverture(unittest.TestCase):

    # La lecture doit rester DANS le with : la couverture est lue a la
    # demande, sur le fichier d'origine, et non gardee en memoire au balayage.
    # C'est voulu — une bibliotheque de cinquante packs ne doit pas charger
    # cinquante images pour afficher une liste.

    def test_lue_dans_un_dossier(self):
        with tempfile.TemporaryDirectory() as tmp:
            chemin = write_pack_dir(tmp, "p", assets=("cover.jpg",))
            pack = pl.read_directory_pack(chemin)
            self.assertEqual(pl.read_cover_bytes(pack), b"x")

    def test_lue_dans_un_zip_sans_extraction(self):
        with tempfile.TemporaryDirectory() as tmp:
            chemin = write_zip(tmp, "z.zip", "pack", assets=("cover.jpg",))
            pack = pl.read_zip_pack(chemin)
            self.assertEqual(pl.read_cover_bytes(pack), b"x")

    def test_couverture_referencee_mais_absente(self):
        with tempfile.TemporaryDirectory() as tmp:
            chemin = write_pack_dir(tmp, "p", assets=())
            pack = pl.read_directory_pack(chemin)
            self.assertIsNone(pl.read_cover_bytes(pack))

    def test_source_disparue_ne_leve_pas(self):
        """Un dossier efface entre le balayage et l'affichage : repli, pas erreur."""
        with tempfile.TemporaryDirectory() as tmp:
            chemin = write_pack_dir(tmp, "p", assets=("cover.jpg",))
            pack = pl.read_directory_pack(chemin)

        self.assertIsNone(pl.read_cover_bytes(pack))


if __name__ == "__main__":
    unittest.main(verbosity=2)
