#!/usr/bin/env python3
"""
Montage de la fenetre, de bout en bout, avec un faux appareil.

Ce test ne juge AUCUN rendu : il ne dit pas si la fenetre est belle, ni si
elle ressemble a ce qu'elle donnera sous Windows. Il verifie ce qu'un
lancement a la main verifierait mal — que la chaine complete se monte sans
exception et produit les bons comptes :

    faux transport -> remote_inventory -> RemotePack -> build_diff -> widgets

Il a deja paye : le premier lancement est tombe sur `self._w`, qui est le nom
Tcl interne d'un widget dans tkinter.Misc. L'ecraser avec une largeur cassait
tous les boutons, et rien dans les tests de logique ne pouvait le voir.

Ignore s'il n'y a pas d'affichage : c'est le cas d'une machine sans serveur X,
et ce n'est pas un echec.
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import packimage
import packlibrary
import packtransport

try:
    import tkinter as tk
    _tk_absent = None
except ImportError as error:      # pragma: no cover
    tk = None
    _tk_absent = str(error)


def affichage_disponible():
    if tk is None:
        return False
    if not (os.environ.get("DISPLAY") or sys.platform.startswith("win")):
        return False
    try:
        racine = tk.Tk()
        racine.destroy()
        return True
    except Exception:
        return False


besoin_affichage = unittest.skipUnless(
    affichage_disponible(), "aucun affichage disponible (%s)" % (_tk_absent or "DISPLAY"))


class FauxAppareil(object):
    """
    Un 3GS en carton. Repond a `echo ok` et rend un inventaire fabrique au
    format exact que `remote_inventory` sait lire, c'est-a-dire des lignes
    `ls -l`.
    """

    host = "faux"
    user = "root"

    LIGNES = [
        "-rw-r--r-- 1 mobile mobile  3643 Aug 22 12:51 "
        "/var/mobile/Documents/packs/test-pack/story.json",
        "-rw-r--r-- 1 mobile mobile  1024 Aug 22 12:51 "
        "/var/mobile/Documents/packs/test-pack/assets/a.mp3",
        "-rw-r--r-- 1 root root       754 Aug 21 08:00 "
        "/Applications/LunyUI.app/packs/cycle/story.json",
        "-rw-r--r-- 1 mobile mobile  2048 Aug 22 20:47 "
        "/var/mobile/Documents/packs/commun/story.json",
    ]

    # Sortie de `df -k` telle qu'un systeme de ce genre la rend. `None`
    # simule l'utilitaire absent — le cas explicitement prevu par la demande,
    # et deja rencontre sur cet appareil pour d'autres commandes.
    DF = ("Filesystem 1024-blocks     Used Available Capacity Mounted on\n"
          "/dev/disk0s2s2  14371500  9231944   4894556      66% /var\n")

    def __init__(self, lignes=None, df=DF):
        self.commandes = []
        # Modifiables en cours de test : l'inventaire d'un appareil change
        # entre deux rafraichissements, et c'est exactement ce qu'il faut
        # pouvoir simuler.
        self.lignes = list(self.LIGNES if lignes is None else lignes)
        self.df = df

    def run(self, command, timeout=60):
        self.commandes.append(command)

        if command.startswith("find"):
            return packtransport.Result(0, "\n".join(self.lignes))

        if command.startswith("df"):
            if self.df is None:
                return packtransport.Result(1, b"sh: df: not found\n")
            return packtransport.Result(0, self.df.encode("utf-8"))

        return packtransport.Result(0, b"ok\n")

    def send_dir(self, local_dir, base, name=None, timeout=600, log=None):
        return packtransport.Result(0, b"")


def make_pack(root, name):
    import json
    chemin = os.path.join(root, name)
    os.makedirs(os.path.join(chemin, "assets"), exist_ok=True)

    with open(os.path.join(chemin, "story.json"), "w", encoding="utf-8") as handle:
        json.dump({"title": name, "version": 1,
                   "stageNodes": [{"uuid": "n1", "squareOne": True}]}, handle)

    return chemin


@besoin_affichage
class TestMontage(unittest.TestCase):

    # UNE SEULE racine Tk pour toute la classe.
    #
    # En creer et en detruire une par test faisait tomber Tcl par
    # intermittence en « async handler deleted by the wrong thread » : plusieurs
    # interpreteurs Tk successifs dans un meme processus, avec des fils de
    # travail encore vivants, ne cohabitent pas. Un seul interpreteur, monte
    # une fois, supprime la classe entiere du probleme.

    @classmethod
    def setUpClass(cls):
        cls.racine = tk.Tk()
        cls.racine.withdraw()       # inutile de la montrer pour la construire

    @classmethod
    def tearDownClass(cls):
        cls.racine.destroy()

    def setUp(self):
        import packcore
        self._transport = packcore.TRANSPORT
        self.faux = FauxAppareil()
        self.app = None

    def make_app(self):
        """
        Le faux appareil est branche APRES la construction, et non avant.

        `Application.__init__` appelle `_apply_runtime_config()`, qui repose
        `packcore.TRANSPORT` a partir des reglages : un faux pose avant serait
        ecrase. C'est le comportement voulu de l'application, pas un defaut —
        constate en ecrivant ce test.

        L'inventaire automatique est programme par `after(400, ...)` et ne
        partira qu'au premier tour de boucle, c'est-a-dire dans `pomper()` :
        l'injection est donc deterministe malgre l'apparence de course.
        """
        import packcore
        import packgui_win

        app = packgui_win.Application(self.racine)
        packcore.TRANSPORT = self.faux
        self.app = app
        return app

    def tearDown(self):
        import packcore

        # Detruire la fenetre pendant qu'un fil de fond tourne encore fait
        # tomber Tcl en « async handler deleted by the wrong thread ». On
        # attend donc le calme, puis on arrete la boucle de vidage avant de
        # detruire quoi que ce soit.
        if self.app is not None:
            self.attendre_calme(self.app, secondes=10.0)
            self.app.shutdown()
            self.pomper(0.2)

        packcore.TRANSPORT = self._transport

        if self.app is not None:
            # Seul le cadre de l'application est detruit ; la racine, partagee,
            # survit jusqu'a tearDownClass.
            self.app.destroy()
            self.app = None

        self.pomper(0.1)

    def pomper(self, secondes=3.0):
        """Fait tourner la boucle Tk sans bloquer, le temps que les fils rendent."""
        import time
        fin = time.time() + secondes

        while time.time() < fin:
            self.racine.update()
            time.sleep(0.02)

    def attendre_calme(self, app, secondes=8.0):
        """
        Pompe jusqu'a ce qu'aucun travail de fond ne tourne, puis un peu plus.

        Attendre une DUREE fixe rendait ces tests capricieux : l'inventaire
        automatique est programme a 400 ms et peut chevaucher le balayage
        local, auquel cas `_work` refuse la seconde demande. On attend donc
        l'etat, pas l'horloge.
        """
        import time
        fin = time.time() + secondes

        while time.time() < fin:
            self.racine.update()

            if not app.busy:
                # Laisse la file se vider : c'est elle qui reconstruit les
                # lignes, cote fil principal.
                self.pomper(0.4)

                if not app.busy:
                    return True

            time.sleep(0.02)

        return False

    def demander(self, app, action, secondes=8.0):
        """
        Lance une action de fond en s'assurant qu'elle est bien PRISE.

        `_work` refuse poliment si une operation tourne deja ; une demande
        perdue ferait echouer le test pour une raison qui n'a rien a voir avec
        ce qu'il verifie.
        """
        import time
        fin = time.time() + secondes

        while time.time() < fin:
            if not app.busy:
                action()
                self.pomper(0.1)
                return self.attendre_calme(app)

            self.racine.update()
            time.sleep(0.02)

        self.fail("l'application est restee occupee")

    def test_fenetre_se_monte_et_affiche_le_diff(self):
        app = self.make_app()

        with tempfile.TemporaryDirectory() as tmp:
            make_pack(tmp, "nouveau")     # local seul
            make_pack(tmp, "commun")      # des deux cotes

            self.demander(app, lambda: app.scan_local(tmp))

            cles = {r.key: r for r in app.rows}

            # Les trois cas de la demande doivent coexister.
            self.assertEqual(cles["nouveau"].status, "local_seul")
            self.assertEqual(cles["commun"].status, "des_deux_cotes")
            self.assertEqual(cles["test-pack"].status, "appareil_seul")
            self.assertEqual(cles["cycle"].status, "appareil_seul")

            # Pre-selection : le local seul, et lui seul.
            self.assertTrue(app.send_vars["nouveau"].get())
            self.assertFalse(app.send_vars["commun"].get())

            # Aucune suppression pre-cochee, jamais.
            self.assertTrue(all(not v.get() for v in app.delete_vars.values()))

            # Le pack du bundle n'est pas proposable a la suppression.
            self.assertEqual(cles["cycle"].deletable_remotes, [])

            self.assertIn("1 pack a envoyer", app.summary_label.cget("text"))

    def test_le_faux_appareil_a_bien_ete_interroge(self):
        app = self.make_app()

        # L'inventaire est programme a 400 ms : attendre le « calme » tout de
        # suite reviendrait a constater qu'il n'a pas encore commence.
        self.pomper(1.0)
        self.attendre_calme(app)

        self.assertTrue(any(c.startswith("find") for c in self.faux.commandes),
                        "l'inventaire distant n'a pas ete demande")

    def test_pre_selection_non_collante_quand_le_distant_arrive_apres(self):
        """
        Regression : le balayage local peut finir AVANT l'inventaire distant.

        Un pack est alors « local seul », donc pre-coche. Quand l'inventaire
        arrive et le revele present sur l'appareil, il doit se DECOCHER : la
        premiere version reportait l'etat des cases et le laissait coche,
        c'est-a-dire pre-selectionne pour un ecrasement que personne n'avait
        demande.
        """
        # L'appareil ne contient PAS encore « commun ».
        self.faux.lignes = [l for l in FauxAppareil.LIGNES if "/commun/" not in l]

        app = self.make_app()

        with tempfile.TemporaryDirectory() as tmp:
            make_pack(tmp, "commun")

            self.demander(app, lambda: app.scan_local(tmp))

            self.assertTrue(app.send_vars["commun"].get(),
                            "un pack absent de l'appareil doit etre pre-coche")

            # L'appareil se revele finalement le contenir.
            self.faux.lignes = list(FauxAppareil.LIGNES)
            self.demander(app, app.refresh_remote)

            self.assertEqual(
                {r.key: r.status for r in app.rows}["commun"], "des_deux_cotes")
            self.assertFalse(app.send_vars["commun"].get(),
                             "la pre-selection automatique ne doit pas coller")

    def test_choix_explicite_survit_a_une_reconstruction(self):
        """L'inverse doit tenir aussi : un clic de l'utilisateur ne se perd pas."""
        app = self.make_app()

        with tempfile.TemporaryDirectory() as tmp:
            make_pack(tmp, "commun")

            self.demander(app, lambda: app.scan_local(tmp))

            # L'utilisateur demande explicitement le reenvoi.
            app.user_send["commun"] = True
            app.rebuild_rows()

            self.assertTrue(app.send_vars["commun"].get())

    def test_bandeau_porte_le_titre_et_survit_au_redimensionnement(self):
        """
        Le titre est un objet de CANEVAS, pas un Label : c'est ce qui permet
        au filigrane de passer derriere lui. Il doit donc exister comme tel,
        et resister a un changement de largeur.
        """
        import packgui_win

        app = self.make_app()

        # La racine est retiree de l'ecran : sa geometrie n'est jamais
        # calculee, `winfo_width` reste a 1 et <Configure> ne porte aucune
        # largeur utile. On appelle donc le trace avec un evenement fabrique —
        # ce qui teste la logique de dessin, et non le gestionnaire de
        # fenetres.
        class FauxEvenement(object):
            def __init__(self, width):
                self.width = width

        def textes_du_bandeau():
            return [app.header.itemcget(i, "text")
                    for i in app.header.find_all()
                    if app.header.type(i) == "text"]

        app._redraw_header(FauxEvenement(1000))

        self.assertIn("Gestion de la bibliotheque LunyUI", textes_du_bandeau())

        # Une seconde largeur ne doit ni dupliquer ni perdre le titre.
        app._redraw_header(FauxEvenement(1400))

        self.assertEqual(
            textes_du_bandeau().count("Gestion de la bibliotheque LunyUI"), 1)

        # Meme largeur : le trace doit etre saute, sans rien casser.
        app._redraw_header(FauxEvenement(1400))
        self.assertEqual(
            textes_du_bandeau().count("Gestion de la bibliotheque LunyUI"), 1)

    # ---------------------------------------------------------------- #
    # Le decor de l'en-tete                                            #
    # ---------------------------------------------------------------- #
    #
    # Ces deux tests remplacent l'ancien controle d'opacite. Celui-ci
    # verifiait une CONSTANTE, et la constante etait juste : le decor avait
    # bien l'opacite prevue. Il etait recadre sur une zone vide, ce qu'aucune
    # verification de constante ne pouvait voir — et c'est ainsi qu'un decor
    # invisible est passe deux fois.
    #
    # On regarde donc maintenant les PIXELS reellement remis a Tk.

    def _attendre_decor(self, app, secondes=25.0):
        """L'illustration est preparee dans un fil ; on attend qu'elle arrive."""
        import time
        fin = time.time() + secondes

        while time.time() < fin:
            self.racine.update()

            if app._header_image is not None:
                return app._header_image

            time.sleep(0.05)

        return None

    def test_le_decor_de_l_en_tete_montre_vraiment_l_illustration(self):
        """
        Le defaut d'origine : l'image etait chargee, recadree sur les 4,7 %
        superieurs de la source — un ciel uni — puis fondue a 15 %. Le
        resultat etait un aplat #24293B sur toute la largeur. Present dans le
        build, invisible a l'ecran.

        On compte donc les couleurs distinctes et on cherche une teinte
        SATUREE : le ciel n'en a aucune, la fusee en est faite.
        """
        import packconfig
        import packgui_win

        if not packconfig.artwork_path():
            self.skipTest("illustration absente de cet environnement")

        app = self.make_app()
        image = self._attendre_decor(app)

        self.assertIsNotNone(image, "l'illustration n'a jamais atteint Tk")

        attendue = packgui_win.Application.BANDEAU_HAUTEUR
        self.assertEqual(image.height(), attendue)
        self.assertGreater(image.width(), 40)

        couleurs = set()
        sature = 0

        for x in range(0, image.width(), 2):
            for y in range(0, image.height(), 2):
                r, g, b = image.get(x, y)[:3]
                couleurs.add((r, g, b))
                sature = max(sature, max(r, g, b) - min(r, g, b))

        self.assertGreater(len(couleurs), 200,
                           "bande quasi unie : le recadrage ne montre rien")
        self.assertGreater(sature, 60,
                           "aucune couleur franche : ce n'est pas l'illustration")

    def test_le_decor_laisse_le_texte_sur_du_fond_pur(self):
        """
        L'illustration est posee a DROITE, et le titre commence a gauche. Cet
        ecart est ce qui permet de l'afficher a 0,85 sans toucher aux
        contrastes mesures pour l'app — 15,96:1 pour #E7ECFA sur #0B1024.

        Verifie sur la largeur la plus etroite acceptee : c'est la que le
        risque de recouvrement est le plus grand.
        """
        import packconfig
        import packgui_win

        if not packconfig.artwork_path():
            self.skipTest("illustration absente de cet environnement")

        app = self.make_app()
        image = self._attendre_decor(app)
        self.assertIsNotNone(image)

        largeur = packgui_win.Application.BANDEAU_LARGEUR_MINI
        debut = largeur - image.width() - packgui_win.Application.BANDEAU_MARGE

        # Le titre est en 15 points gras ; 420 px le couvrent largement.
        self.assertGreater(debut, 420,
                           "l'illustration mordrait sur le titre")

        # Et le bord gauche du decor doit etre fondu vers le fond, sinon il
        # apparait comme une vignette collee.
        gauche = image.get(0, image.height() // 2)[:3]
        self.assertEqual(tuple(gauche), packimage.hex_rgb(packgui_win.FOND))

    # ---------------------------------------------------------------- #
    # Ce que les cases veulent dire                                    #
    # ---------------------------------------------------------------- #

    def _textes(self, widget):
        """Tous les libelles affiches, a plat."""
        trouves = []

        try:
            texte = widget.cget("text")
            if texte:
                trouves.append(str(texte))
        except tk.TclError:
            pass

        for enfant in widget.winfo_children():
            trouves.extend(self._textes(enfant))

        return trouves

    def test_chaque_volet_dit_ce_qu_une_case_cochee_provoque(self):
        """
        A gauche cocher ajoute, a droite cocher supprime. Rien dans une case
        ne le dit : la phrase doit etre a l'ecran, dans chaque volet.
        """
        app = self.make_app()
        textes = self._textes(app)

        self.assertIn("Cocher = sera ajoute a l'appareil", textes)
        self.assertIn("Cocher = sera supprime de l'appareil", textes)

    def test_les_deux_cases_ne_se_ressemblent_pas(self):
        """
        La phrase seule ne suffit pas : elle est lue une fois, la case est
        cliquee vingt fois. Signe et couleur doivent differer.
        """
        import packgui_win

        ajout = packgui_win.CheckBox.GENRES["ajout"]
        suppression = packgui_win.CheckBox.GENRES["suppression"]

        self.assertNotEqual(ajout[0], suppression[0])      # couleur
        self.assertNotEqual(ajout[1], suppression[1])      # pictogramme
        self.assertEqual(ajout[0], packgui_win.SUCCES)
        self.assertEqual(suppression[0], packgui_win.ALERTE)

    # ---------------------------------------------------------------- #
    # Filtres du volet local                                           #
    # ---------------------------------------------------------------- #

    def _bibliotheque_melangee(self, tmp):
        """Deux vrais packs, deux dossiers qui n'en sont pas."""
        make_pack(tmp, "nouveau")     # local seul
        make_pack(tmp, "commun")      # deja sur l'appareil

        for bruit in ("ffmpeg-extracted", "PS2"):
            os.makedirs(os.path.join(tmp, bruit), exist_ok=True)
            with open(os.path.join(tmp, bruit, "note.txt"), "w") as handle:
                handle.write("pas un pack")

    def test_filtre_compatibles_masque_les_entrees_sans_story(self):
        app = self.make_app()

        with tempfile.TemporaryDirectory() as tmp:
            self._bibliotheque_melangee(tmp)
            self.demander(app, lambda: app.scan_local(tmp))

            # `rows` porte aussi les packs presents sur le seul appareil ;
            # le volet gauche n'affiche que les quatre entrees locales.
            locales = [r for r in app.rows if r.local is not None]
            self.assertEqual(len(locales), 4)
            self.assertEqual(app.hidden_rows, [])

            app.filtre_compat_var.set(True)
            app.rebuild_rows()

            self.assertEqual({r.key for r in app.hidden_rows},
                             {"ffmpeg-extracted", "ps2"})
            self.assertEqual(set(app.send_vars), {"nouveau", "commun"})

            # Le compteur doit AVOUER ce qu'il cache.
            self.assertIn("masque", app.left_count.cget("text"))

    def test_filtre_de_presence_isole_ce_qui_reste_a_transferer(self):
        app = self.make_app()

        with tempfile.TemporaryDirectory() as tmp:
            self._bibliotheque_melangee(tmp)
            self.demander(app, lambda: app.scan_local(tmp))

            app.filtre_presence_var.set(packlibrary.PRESENCE_ABSENTS)
            app.rebuild_rows()

            # Les deux dossiers qui ne sont pas des packs sont bien absents de
            # l'appareil : ce filtre-la ne les concerne pas, c'est celui des
            # entrees compatibles qui s'en charge. Les combiner est le geste
            # utile, et il a son propre test.
            self.assertEqual(set(app.send_vars),
                             {"nouveau", "ffmpeg-extracted", "ps2"})

            app.filtre_presence_var.set(packlibrary.PRESENCE_PRESENTS)
            app.rebuild_rows()

            self.assertEqual(set(app.send_vars), {"commun"})

    def test_les_deux_filtres_se_combinent(self):
        app = self.make_app()

        with tempfile.TemporaryDirectory() as tmp:
            self._bibliotheque_melangee(tmp)
            self.demander(app, lambda: app.scan_local(tmp))

            app.filtre_compat_var.set(True)
            app.filtre_presence_var.set(packlibrary.PRESENCE_ABSENTS)
            app.rebuild_rows()

            self.assertEqual(set(app.send_vars), {"nouveau"})

    def test_un_pack_coche_puis_masque_reste_selectionne_et_annonce(self):
        """
        Le piege du filtre : masquer n'est pas deselectionner.

        Un pack coche puis cache par un filtre partirait sans etre relu — ou,
        pire, ne partirait pas alors qu'il a ete demande. Il reste donc dans la
        selection, et le recapitulatif dit combien de lignes sont dans ce cas.
        """
        app = self.make_app()

        with tempfile.TemporaryDirectory() as tmp:
            self._bibliotheque_melangee(tmp)
            self.demander(app, lambda: app.scan_local(tmp))

            app.user_send["commun"] = True          # choix explicite
            app.rebuild_rows()
            self.assertIn("commun", app._selection()[0])

            app.filtre_presence_var.set(packlibrary.PRESENCE_ABSENTS)
            app.rebuild_rows()

            self.assertNotIn("commun", app.send_vars)       # plus a l'ecran
            self.assertIn("commun", app._selection()[0])    # toujours demande
            self.assertEqual([r.key for r in app._masques_selectionnes()],
                             ["commun"])
            self.assertIn("masque", app.summary_label.cget("text"))

    def test_les_filtres_sont_memorises(self):
        import packconfig

        app = self.make_app()
        ecrits = []

        reel = packconfig.save
        packconfig.save = lambda valeurs: ecrits.append(dict(valeurs))

        try:
            app.filtre_compat_var.set(True)
            app.filtre_presence_var.set(packlibrary.PRESENCE_PRESENTS)
            app._filters_changed()
        finally:
            packconfig.save = reel

        self.assertTrue(app.config_values["filtre_compatibles"])
        self.assertEqual(app.config_values["filtre_presence"],
                         packlibrary.PRESENCE_PRESENTS)
        self.assertTrue(ecrits, "le choix n'a pas ete enregistre")

    # ---------------------------------------------------------------- #
    # Espace disque et rafraichissement                                #
    # ---------------------------------------------------------------- #

    def test_espace_disque_affiche_apres_inventaire(self):
        app = self.make_app()
        self.demander(app, app.refresh_remote)

        self.assertIsNotNone(app.disk)
        texte = app.disk_label.cget("text")

        self.assertIn("libres sur", texte)
        self.assertIn("Go", texte)

    def test_df_absent_donne_un_repli_explicite(self):
        """
        Cet appareil minimal a deja rendu plusieurs utilitaires absents. Un
        `df` qui echoue ne doit ni bloquer l'inventaire ni laisser un champ
        vide dont personne ne sait s'il charge encore.
        """
        self.faux.df = None

        app = self.make_app()
        self.demander(app, app.refresh_remote)

        self.assertIsNone(app.disk)
        self.assertEqual(app.disk_label.cget("text"),
                         "espace disque non disponible")
        # L'inventaire, lui, a bien abouti.
        self.assertTrue(app.remote_packs)

    def test_l_inventaire_est_relance_apres_un_transfert(self):
        """
        Le volet droit doit refleter le nouvel etat sans action
        supplementaire. On fait donc changer l'appareil PENDANT le transfert :
        si l'inventaire n'etait pas relance, l'ancien etat resterait affiche.
        """
        app = self.make_app()

        with tempfile.TemporaryDirectory() as tmp:
            make_pack(tmp, "nouveau")
            self.demander(app, lambda: app.scan_local(tmp))

            resume = packlibrary.summarise(app.rows, {"nouveau"}, set())

            apres = list(FauxAppareil.LIGNES) + [
                "-rw-r--r-- 1 mobile mobile 2048 Aug 23 10:00 "
                "/var/mobile/Documents/packs/nouveau/story.json"]
            self.faux.lignes = apres

            self.demander(app, lambda: app._work(
                lambda: app._run(resume, "documents")))

            self.assertIn("nouveau", {p.key for p in app.remote_packs})
            self.assertEqual({r.key: r.status for r in app.rows}["nouveau"],
                             "des_deux_cotes")

    # ---------------------------------------------------------------- #
    # Taille de la fenetre                                             #
    # ---------------------------------------------------------------- #

    def test_geometrie_proportionnelle_a_l_ecran(self):
        """
        Fonction pure : verifiable sans ouvrir la moindre fenetre.

        Les trois cas qui comptent — un grand ecran ou 1080x760 etait etrique,
        un portable ou 80 % passe encore, un petit ecran ou le plancher de
        1000x700 ne doit PAS faire deborder la fenetre.
        """
        import packgui_win

        largeur, hauteur, x, y = packgui_win.geometrie(2560, 1440)
        self.assertEqual((largeur, hauteur), (2048, 1152))
        self.assertEqual(x, (2560 - 2048) // 2)
        self.assertGreaterEqual(y, 0)

        largeur, hauteur, _x, _y = packgui_win.geometrie(1920, 1080)
        self.assertEqual((largeur, hauteur), (1536, 864))

        for ecran in ((1366, 768), (1280, 720), (1024, 640)):
            largeur, hauteur, x, y = packgui_win.geometrie(*ecran)

            self.assertLessEqual(largeur, ecran[0], "deborde en largeur sur %s" % (ecran,))
            self.assertLessEqual(hauteur, ecran[1], "deborde en hauteur sur %s" % (ecran,))
            self.assertGreaterEqual(x, 0)
            self.assertGreaterEqual(y, 0)

    # ---------------------------------------------------------------- #
    # Pied de fenetre                                                  #
    # ---------------------------------------------------------------- #

    def test_le_pied_porte_version_date_et_auteur(self):
        import packconfig

        app = self.make_app()
        textes = " | ".join(self._textes(app))

        self.assertIn(packconfig.VERSION, textes)
        self.assertIn(packconfig.build_date(), textes)
        self.assertIn("Brice avec Claude", textes)
        self.assertIn("README", textes)

    def test_choix_du_transport(self):
        """
        Le reglage doit pouvoir imposer un transport.

        Il existe parce que les deux ne rencontrent pas les memes murs sur ce
        serveur ancien : un blocage sur l'un ne doit pas exiger de
        reconstruire l'application pour essayer l'autre.
        """
        import packconfig
        import packtransport

        app = self.make_app()
        dispo = packtransport.ParamikoTransport.available()

        cas = [
            # (transport demande, cle renseignee, classe attendue)
            ("systeme", "/c/cle", packtransport.SystemTransport),
            ("systeme", "",       packtransport.SystemTransport),
            ("auto",    "",       packtransport.SystemTransport),
            ("paramiko", "/c/cle",
             packtransport.ParamikoTransport if dispo else packtransport.SystemTransport),
            ("auto", "/c/cle",
             packtransport.ParamikoTransport if dispo else packtransport.SystemTransport),
            # Valeur abimee dans le fichier de config : on retombe sur auto.
            ("n'importe quoi", "", packtransport.SystemTransport),
        ]

        for demande, cle, attendu in cas:
            app.config_values["transport"] = demande
            app.config_values["key_path"] = cle

            self.assertIsInstance(app._make_transport(), attendu,
                                  "transport=%r cle=%r" % (demande, cle))

    def test_la_cle_atteint_le_transport_systeme(self):
        """
        Sous Windows il n'y a pas de `~/.ssh/config` pour designer la cle :
        si elle n'atteint pas la ligne de commande, l'authentification echoue
        sans que rien ne l'explique.
        """
        import packtransport

        app = self.make_app()
        app.config_values["transport"] = "systeme"
        app.config_values["key_path"] = "/chemin/vers/ma_cle"

        transport = app._make_transport()
        options = transport.options()

        self.assertIn("-i", options)
        self.assertIn("/chemin/vers/ma_cle", options)
        self.assertIn("-F", options)

    def test_bouton_plat_ne_casse_pas_le_nom_tcl_du_widget(self):
        """
        Regression directe du defaut trouve au premier lancement : un
        FlatButton doit rester un widget utilisable apres construction.
        """
        import packgui_win

        cadre = tk.Frame(self.racine, bg=packgui_win.FOND)   # sans Application
        bouton = packgui_win.FlatButton(cadre, "Essai", None, width=90, height=26)

        # Chacun de ces appels passe par le nom Tcl du widget.
        bouton.set_text("Autre")
        bouton.set_enabled(False)
        bouton.set_enabled(True)

        self.assertTrue(bouton.winfo_exists())
        self.assertIsInstance(bouton._largeur, int)


if __name__ == "__main__":
    unittest.main(verbosity=2)
