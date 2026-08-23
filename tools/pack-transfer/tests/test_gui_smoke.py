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

    def __init__(self, lignes=None):
        self.commandes = []
        # Modifiable en cours de test : l'inventaire d'un appareil change
        # entre deux rafraichissements, et c'est exactement ce qu'il faut
        # pouvoir simuler.
        self.lignes = list(self.LIGNES if lignes is None else lignes)

    def run(self, command, timeout=60):
        self.commandes.append(command)

        if command.startswith("find"):
            return packtransport.Result(0, "\n".join(self.lignes))

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

    def test_opacite_du_filigrane_sous_le_seuil_mesure(self):
        """
        0,15 est le plafond mesure : a 0,20 le sous-titre #94A0C6 tombe a
        4,48:1 sur le pixel le plus clair du bandeau, sous le seuil AA.
        """
        import packgui_win

        self.assertLessEqual(packgui_win.Application.BANDEAU_ALPHA, 0.15)

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
