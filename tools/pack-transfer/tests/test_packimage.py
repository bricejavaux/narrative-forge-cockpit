#!/usr/bin/env python3
"""
Le moteur d'image, et surtout la regression qui a motive son ecriture.

Le decor de l'en-tete a ete livre deux fois comme corrige alors qu'il ne
s'affichait pas. Aucun test ne pouvait le voir : l'ancien code passait par
Pillow, absent de cet environnement, et ne verifiait qu'une CONSTANTE
d'opacite — laquelle etait juste. Le defaut etait dans le RECADRAGE.

Ces tests regardent donc les pixels produits, et pas les reglages.
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import packconfig
import packimage


def damier(largeur, hauteur, a=(255, 0, 0), b=(0, 0, 255), pas=4):
    rows = []

    for y in range(hauteur):
        ligne = bytearray()
        for x in range(largeur):
            couleur = a if ((x // pas) + (y // pas)) % 2 == 0 else b
            ligne += bytes(couleur)
        rows.append(bytes(ligne))

    return packimage.Raster(largeur, hauteur, rows)


class TestAllerRetourPng(unittest.TestCase):

    def test_ecriture_puis_relecture_conservent_les_pixels(self):
        source = damier(37, 23)

        with tempfile.TemporaryDirectory() as tmp:
            chemin = os.path.join(tmp, "damier.png")
            packimage.write_png(chemin, source)
            relu = packimage.read_png(chemin)

        self.assertEqual((relu.width, relu.height), (37, 23))

        for y in (0, 5, 22):
            for x in (0, 4, 36):
                self.assertEqual(relu.pixel(x, y), source.pixel(x, y),
                                 "pixel (%d, %d)" % (x, y))

    def test_un_fichier_qui_n_est_pas_un_png_est_refuse_clairement(self):
        with tempfile.TemporaryDirectory() as tmp:
            chemin = os.path.join(tmp, "faux.png")
            with open(chemin, "wb") as handle:
                handle.write(b"ceci n'est pas une image")

            with self.assertRaises(ValueError):
                packimage.read_png(chemin)


class TestEchelle(unittest.TestCase):

    def test_les_dimensions_demandees_sont_rendues(self):
        petit = packimage.scale(damier(80, 60), 20, 15)

        self.assertEqual((petit.width, petit.height), (20, 15))
        self.assertEqual(len(petit.rows), 15)
        self.assertEqual(len(petit.rows[0]), 20 * 3)

    def test_une_couleur_unie_le_reste(self):
        uni = packimage.scale(packimage.solid(50, 50, "#F0B357"), 12, 12)

        self.assertEqual(uni.pixel(6, 6), packimage.hex_rgb("#F0B357"))


class TestCadrage(unittest.TestCase):
    """
    `cover` recadre pour remplir sans deformer, et `focus` dit OU.

    C'est exactement le reglage qui manquait : le recadrage etait fige sur le
    haut de l'image, et le haut de cette illustration est un ciel vide.
    """

    def _source(self):
        # Portrait : haut rouge, bas vert. Rapport 1:3, comme l'illustration.
        rows = []
        for y in range(90):
            couleur = (255, 0, 0) if y < 45 else (0, 255, 0)
            rows.append(bytes(bytearray(list(couleur) * 30)))
        return packimage.Raster(30, 90, rows)

    def test_le_haut_est_pris_quand_le_focus_est_en_haut(self):
        bande = packimage.cover(self._source(), 30, 5, focus=0.0)
        self.assertEqual(bande.pixel(15, 2), (255, 0, 0))

    def test_le_bas_est_pris_quand_le_focus_est_en_bas(self):
        bande = packimage.cover(self._source(), 30, 5, focus=1.0)
        self.assertEqual(bande.pixel(15, 2), (0, 255, 0))

    def test_le_recadrage_ne_sort_jamais_de_l_image(self):
        for focus in (-3.0, 0.5, 4.0):
            bande = packimage.cover(self._source(), 60, 10, focus=focus)
            self.assertEqual((bande.width, bande.height), (60, 10))


class TestComposition(unittest.TestCase):

    def test_le_fondu_part_du_fond_et_arrive_au_motif(self):
        fond = packimage.solid(40, 4, "#0B1024")
        motif = packimage.solid(40, 4, "#FFFFFF")

        compose = packimage.blend_into(fond, motif, 0, alpha=1.0, fade=20)

        self.assertEqual(compose.pixel(0, 2), packimage.hex_rgb("#0B1024"))
        self.assertEqual(compose.pixel(39, 2), (255, 255, 255))

        # Strictement croissant sur la zone de fondu : c'est ce degrade qui
        # fait sortir l'illustration du fond au lieu de l'y coller.
        valeurs = [compose.pixel(x, 2)[0] for x in range(0, 20)]
        self.assertEqual(valeurs, sorted(valeurs))
        self.assertLess(valeurs[0], valeurs[-1])

    def test_l_opacite_est_respectee(self):
        compose = packimage.blend_into(
            packimage.solid(10, 2, "#000000"),
            packimage.solid(10, 2, "#FFFFFF"), 0, alpha=0.5)

        self.assertEqual(compose.pixel(5, 1), (128, 128, 128))

    def test_un_motif_qui_deborde_ne_leve_pas(self):
        compose = packimage.blend_into(
            packimage.solid(10, 2, "#000000"),
            packimage.solid(8, 2, "#FFFFFF"), 6)

        self.assertEqual(compose.width, 10)
        self.assertEqual(compose.pixel(9, 0), (255, 255, 255))


class TestSortieTk(unittest.TestCase):

    def test_les_donnees_sont_du_png_en_base64(self):
        import base64

        donnees = packimage.to_tk_data(damier(6, 6))
        brut = base64.b64decode(donnees)

        # Le PPM avait ete essaye d'abord : Tk le lit depuis un fichier, mais
        # repond « couldn't recognize image data » quand on le lui passe en
        # base64. Ce test fige le format qui, lui, fonctionne.
        self.assertEqual(brut[:8], b"\x89PNG\r\n\x1a\n")


class TestDecorReel(unittest.TestCase):
    """
    Le rendu exact de l'en-tete, sur l'illustration reelle.

    C'est LE test de non-regression du defaut signale : il echouerait sur
    l'ancien cadrage, qui produisait un aplat.
    """

    def setUp(self):
        self.chemin = packconfig.artwork_path()

        if not self.chemin:
            self.skipTest("illustration absente de cet environnement")

    def test_le_decor_contient_des_couleurs_franches(self):
        source = packimage.read_png(self.chemin)
        hauteur = 120
        largeur = int(round(hauteur * source.width / float(source.height)))

        bande = packimage.blend_into(
            packimage.solid(largeur, hauteur, "#0B1024"),
            packimage.scale(source, largeur, hauteur), 0, alpha=0.85, fade=46)

        couleurs = set()
        saturation = 0

        for y in range(0, hauteur, 2):
            for x in range(0, largeur, 2):
                r, g, b = bande.pixel(x, y)
                couleurs.add((r, g, b))
                saturation = max(saturation, max(r, g, b) - min(r, g, b))

        self.assertGreater(len(couleurs), 200, "bande quasi unie")
        self.assertGreater(saturation, 60, "aucune couleur franche")

    def test_l_ancien_cadrage_produisait_bien_un_aplat(self):
        """
        La preuve du diagnostic, gardee sous forme executable.

        Reproduit l'ancien calcul — bandeau 1180x84, donc rapport 14,05, donc
        les 54 premieres lignes de la source, fondues a 15 % — et montre que
        le resultat ne contient quasiment aucune couleur. Le defaut n'etait ni
        le chemin de la ressource, ni Pillow, ni PyInstaller.
        """
        source = packimage.read_png(self.chemin)

        largeur, hauteur = 1180, 84
        rapport = largeur / float(hauteur)
        bande_source = int(source.width / rapport)

        self.assertLess(bande_source / float(source.height), 0.05,
                        "l'ancienne bande devait couvrir moins de 5 % de l'image")

        haut = packimage.crop(source, 0, 0, source.width, bande_source)
        ancien = packimage.blend_into(
            packimage.solid(largeur, hauteur, "#0B1024"),
            packimage.scale(haut, largeur, hauteur), 0, alpha=0.15)

        couleurs = set()
        saturation = 0

        for y in range(0, hauteur, 4):
            for x in range(0, largeur, 4):
                r, g, b = ancien.pixel(x, y)
                couleurs.add((r, g, b))
                saturation = max(saturation, max(r, g, b) - min(r, g, b))

        # Mesures relevees sur l'illustration reelle :
        #
        #                      couleurs distinctes   saturation maximale
        #   ancien rendu               50                    26
        #   rendu actuel            1 949                   166
        #
        # 50 teintes sur 1180x84 pixels, et pas une seule couleur franche :
        # un degrade de ciel, rien d'autre. Le rendu actuel est mesure par
        # `test_le_decor_contient_des_couleurs_franches` ci-dessus, sur une
        # surface quinze fois plus petite.
        self.assertLess(len(couleurs), 80)
        self.assertLess(saturation, 30,
                        "l'ancien rendu etait bien un aplat, sans motif")


if __name__ == "__main__":
    unittest.main()
