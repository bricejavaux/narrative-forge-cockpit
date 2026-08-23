#!/usr/bin/env python3
"""
Noms de packs : espace, virgule, accent, apostrophe.

Tous les packs essayes jusqu'ici s'appelaient `two-branches`,
`IDRISS_ET_COLETTE`, `audio-demo`. « Margot, Apprentie véto en Australie » a
revele quatre defauts d'un coup, chacun a une etape differente de la chaine.
Chacun a son test ci-dessous, et les quatre noms d'essai portent les
caracteres reels, pas des approximations ASCII.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import packcore
import packlibrary
import packnames
import packtransport

# Les noms qui comptent. Le premier est le pack reel qui a fait tomber le
# transfert ; les suivants isolent un caractere chacun.
AUSTRALIE = "Margot, Apprentie véto en Australie"
APOSTROPHE = "Margot, l'apprentie"
CANADA = "7+ Margot, Apprentie véto au Canada"


class TestTranslitteration(unittest.TestCase):

    def test_le_pack_qui_a_revele_le_defaut(self):
        self.assertEqual(packnames.safe_name(AUSTRALIE),
                         "Margot_Apprentie_veto_en_Australie")

    def test_apostrophe(self):
        self.assertEqual(packnames.safe_name(APOSTROPHE), "Margot_l_apprentie")

    def test_un_seul_souligne_par_groupe_ecarte(self):
        """« Margot, Apprentie » ne doit pas donner « Margot__Apprentie »."""
        self.assertNotIn("__", packnames.safe_name(CANADA))
        self.assertEqual(packnames.safe_name(CANADA),
                         "7_Margot_Apprentie_veto_au_Canada")

    def test_les_noms_deja_simples_ne_bougent_pas(self):
        """
        Aucun remue-menage sur l'existant : les packs deja sur l'appareil
        doivent continuer de correspondre a leur dossier local.
        """
        for nom in ("two-branches", "IDRISS_ET_COLETTE", "audio-demo",
                    "test-pack", "cycle", "degraded", "random"):
            self.assertEqual(packnames.safe_name(nom), nom)
            self.assertTrue(packnames.is_safe(nom))

    def test_un_nom_ne_commence_jamais_par_un_tiret_ni_un_point(self):
        """Un `-` initial serait pris pour une option, un `.` cacherait le pack."""
        for nom in ("-rf", "--force", ".cache", "..", "-"):
            propre = packnames.safe_name(nom)
            self.assertFalse(propre.startswith(("-", ".")), nom)

    def test_un_nom_entierement_ecarte_retombe_sur_un_defaut(self):
        for nom in ("", "   ", "日本語", "///"):
            self.assertEqual(packnames.safe_name(nom), packnames.DEFAUT)

    def test_la_longueur_est_bornee(self):
        self.assertEqual(len(packnames.safe_name("a" * 200)),
                         packnames.LONGUEUR_MAX)

    def test_aucun_caractere_special_de_shell_ne_survit(self):
        dangereux = "a b,c'd\"e$f`g*h?i;j|k&l\\m\nn\to(p)q[r]s{t}u<v>w"
        propre = packnames.safe_name(dangereux)

        for caractere in propre:
            self.assertIn(caractere, packnames.AUTORISES, repr(caractere))


class TestCorrespondance(unittest.TestCase):
    """
    HFS+ renormalise les accents : un nom envoye en NFC revient en NFD.
    Mesure sur l'appareil :

        envoye  b' Apprentie v\\xc3\\xa9'     (NFC)
        relu    b' Apprentie ve\\xcc\\x81'    (NFD)

    Sans normalisation dans la cle, un pack transfere avec succes revenait
    « absent de l'appareil » a chaque inventaire, et se reproposait pour un
    nouvel envoi.
    """

    def test_nfc_et_nfd_donnent_la_meme_cle(self):
        import unicodedata

        nfc = unicodedata.normalize("NFC", AUSTRALIE)
        nfd = unicodedata.normalize("NFD", AUSTRALIE)

        self.assertNotEqual(nfc, nfd, "les deux formes doivent bien differer")
        self.assertEqual(packnames.key(nfc), packnames.key(nfd))

    def test_le_dossier_local_riche_correspond_au_pack_distant_translittere(self):
        local = packlibrary.LocalPack("/poste/" + AUSTRALIE, "dossier", AUSTRALIE)
        distant = packlibrary.RemotePack("Margot_Apprentie_veto_en_Australie",
                                         "documents")

        rows = {r.key: r for r in packlibrary.build_diff([local], [distant])}

        self.assertEqual(len(rows), 1, "le pack ne doit pas apparaitre deux fois")
        self.assertEqual(list(rows.values())[0].status, packlibrary.DiffRow.BOTH)

    def test_un_pack_depose_autrefois_sous_son_nom_riche_est_reconnu(self):
        """
        Le cas de reprise : l'appareil porte encore un dossier au nom complet.
        Il doit correspondre, sinon l'outil proposerait un doublon.
        """
        import unicodedata

        local = packlibrary.LocalPack("/poste/" + AUSTRALIE, "dossier", AUSTRALIE)
        distant = packlibrary.RemotePack(unicodedata.normalize("NFD", AUSTRALIE),
                                         "documents")

        rows = packlibrary.build_diff([local], [distant])

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].status, packlibrary.DiffRow.BOTH)

    def test_le_titre_n_est_jamais_translittere(self):
        pack = packlibrary.LocalPack("/poste/" + AUSTRALIE, "dossier", AUSTRALIE,
                                     title=AUSTRALIE)

        self.assertEqual(pack.title, AUSTRALIE)
        self.assertEqual(pack.transfer_name, "Margot_Apprentie_veto_en_Australie")
        self.assertTrue(pack.renamed)

    def test_sans_titre_c_est_le_nom_d_origine_qui_s_affiche(self):
        """Et non sa version translitteree : l'utilisateur voit le premier."""
        pack = packlibrary.LocalPack("/poste/" + AUSTRALIE, "dossier", AUSTRALIE)

        self.assertEqual(pack.title, AUSTRALIE)

    def test_deux_noms_qui_se_reduisent_au_meme_sont_signales_ambigus(self):
        """
        La translitteration peut faire converger deux entrees distinctes. Le
        mecanisme des noms ambigus existait deja pour la casse ; il couvre
        celui-ci sans rien de special, et refuse toute pre-selection.
        """
        a = packlibrary.LocalPack("/poste/Margot, apprentie", "dossier",
                                  "Margot, apprentie")
        b = packlibrary.LocalPack("/poste/Margot; apprentie", "dossier",
                                  "Margot; apprentie")

        rows = packlibrary.build_diff([a, b], [])

        self.assertEqual(len(rows), 1)
        self.assertTrue(rows[0].ambiguous)
        self.assertFalse(rows[0].preselect_send)


class TestArchiveReelle(unittest.TestCase):
    """
    Le vrai fichier, quand il est la.

    Les tests precedents fabriquent leurs noms ; celui-ci lit l'archive qui a
    fait tomber le transfert, avec ses octets d'origine. Il est saute ailleurs
    que sur ce poste — mais c'est ici qu'il devait exister.
    """

    ARCHIVE = ("/mnt/c/Users/javau/Downloads/Histoires/"
               "Margot, Apprentie véto en Australie.zip")

    def setUp(self):
        if not os.path.isfile(self.ARCHIVE):
            self.skipTest("archive absente de ce poste")

        self.pack = packlibrary.read_zip_pack(self.ARCHIVE)

    def test_l_archive_est_exploitable(self):
        self.assertTrue(self.pack.valid, self.pack.error)
        self.assertEqual(self.pack.node_count, 45)

    def test_le_titre_garde_sa_virgule_et_son_accent(self):
        self.assertEqual(self.pack.title, AUSTRALIE)

    def test_le_dossier_envoye_est_translittere(self):
        self.assertEqual(self.pack.transfer_name,
                         "Margot_Apprentie_veto_en_Australie")
        self.assertTrue(self.pack.renamed)

    def test_le_nom_envoye_traverse_un_shell_sans_dommage(self):
        import shlex

        cible = packtransport.quote_remote(
            "/var/mobile/Documents/packs/" + self.pack.transfer_name)

        self.assertEqual(len(shlex.split(cible)), 1)


class TestQuotageDistant(unittest.TestCase):
    """
    Le quotage POSIX, verifie contre l'appareil avant d'etre fige ici.

        mkdir -p '/tmp/luny-essai/Margot, l'\\''apprentie'   -> cree

    et, avec les guillemets simples ecrits a la main de la version
    precedente :

        sh: -c: line 0: unexpected EOF while looking for matching `''
    """

    def test_un_chemin_ordinaire_est_simplement_entoure(self):
        self.assertEqual(packtransport.quote_remote("/var/mobile/packs"),
                         "'/var/mobile/packs'")

    def test_l_espace_et_la_virgule_sont_neutralises(self):
        protege = packtransport.quote_remote("/packs/" + AUSTRALIE)

        self.assertTrue(protege.startswith("'") and protege.endswith("'"))
        self.assertIn(AUSTRALIE, protege)

    def test_l_apostrophe_ferme_et_rouvre_la_chaine(self):
        self.assertEqual(packtransport.quote_remote("/packs/l'ete"),
                         "'/packs/l'\\''ete'")

    def test_le_resultat_survit_a_une_relecture_par_un_shell(self):
        """
        Preuve par le shell : ce que `sh` rend doit etre le chemin d'origine,
        caractere pour caractere.
        """
        import shlex

        for nom in (AUSTRALIE, APOSTROPHE, CANADA, "a b'c\"d $e `f` *g",
                    "/packs/normal"):
            chemin = "/var/mobile/Documents/packs/" + nom
            relu = shlex.split(packtransport.quote_remote(chemin))

            self.assertEqual(relu, [chemin], nom)


class TestCommandesDistantes(unittest.TestCase):
    """Les commandes reellement envoyees, avec un transport en carton."""

    class Faux(object):
        host = "faux"

        def __init__(self):
            self.commandes = []

        def run(self, commande, timeout=60):
            self.commandes.append(commande)
            return packtransport.Result(0, b"")

        def send_dir(self, local_dir, base, name=None, timeout=600, log=None):
            self.envoi = (local_dir, base, name)
            return packtransport.Result(0, b"")

    def _shell_lisible(self, commande):
        """Un shell doit savoir relire la commande : sinon elle est cassee."""
        import shlex
        return shlex.split(commande)

    def test_suppression_d_un_pack_au_nom_riche(self):
        faux = self.Faux()
        packcore.remote_delete(AUSTRALIE, "documents", lambda _m: None,
                               transport=faux)

        commande = faux.commandes[0]
        morceaux = self._shell_lisible(commande)

        self.assertEqual(morceaux[0], "rm")
        self.assertEqual(morceaux[-1],
                         "/var/mobile/Documents/packs/" + AUSTRALIE)

    def test_suppression_d_un_pack_avec_apostrophe(self):
        """Le cas ou la version precedente produisait une commande tronquee."""
        faux = self.Faux()
        packcore.remote_delete(APOSTROPHE, "documents", lambda _m: None,
                               transport=faux)

        morceaux = self._shell_lisible(faux.commandes[0])

        self.assertEqual(morceaux[-1],
                         "/var/mobile/Documents/packs/" + APOSTROPHE)

    def test_preparation_du_dossier_avant_transfert(self):
        import tempfile

        faux = self.Faux()

        with tempfile.TemporaryDirectory() as tmp:
            dossier = os.path.join(tmp, "Margot_Apprentie_veto_en_Australie")
            os.makedirs(dossier)

            packcore.remote_send(dossier, "documents", lambda _m: None,
                                 transport=faux)

        for commande in faux.commandes:
            self._shell_lisible(commande)       # ne doit jamais lever

        self.assertIn("mkdir -p '/var/mobile/Documents/packs'",
                      faux.commandes[0])
        self.assertIn("rm -rf '/var/mobile/Documents/packs/"
                      "Margot_Apprentie_veto_en_Australie'", faux.commandes[0])

    def test_l_espace_disque_est_lu_sur_un_chemin_protege(self):
        faux = self.Faux()
        packcore.remote_disk(transport=faux)

        self.assertIn("'/var/mobile/Documents/packs'", faux.commandes[0])


class TestCibleScp(unittest.TestCase):
    """
    La cible remise a scp : `user@host:<chemin>`. La partie apres le `:` est
    interpretee par le shell de l'appareil, jamais par celui du poste — c'est
    la distinction qui manquait, et le defaut exact du rapport :

        root@192.168.1.98:/var/mobile/Documents/packs/Margot, Apprentie veto…
        -> scp: ambiguous target
    """

    def _argv(self, nom):
        appels = {}
        transport = packtransport.SystemTransport(host="1.2.3.4")

        import packproc
        reel = packproc.run

        def espion(cmd, **kwargs):
            appels["cmd"] = list(cmd)
            import subprocess
            return subprocess.CompletedProcess(cmd, 0, b"", b"")

        packproc.run = espion
        try:
            transport.send_dir("/poste/pack", "/var/mobile/Documents/packs", nom)
        finally:
            packproc.run = reel

        return appels["cmd"]

    def test_la_cible_est_protegee(self):
        cible = self._argv(AUSTRALIE)[-1]

        self.assertEqual(
            cible,
            "root@1.2.3.4:'/var/mobile/Documents/packs/%s'" % AUSTRALIE)

    def test_le_shell_distant_ne_voit_qu_une_seule_cible(self):
        """
        Le defaut se resume a ceci : combien de mots le shell distant
        compte-t-il ? Deux ou plus, et scp refuse.
        """
        import shlex

        for nom in (AUSTRALIE, APOSTROPHE, CANADA):
            cible = self._argv(nom)[-1]
            chemin_distant = cible.split(":", 1)[1]

            self.assertEqual(len(shlex.split(chemin_distant)), 1, nom)

    def test_un_nom_simple_donne_toujours_le_meme_chemin(self):
        cible = self._argv("two-branches")[-1]

        self.assertEqual(
            cible, "root@1.2.3.4:'/var/mobile/Documents/packs/two-branches'")


class TestBanniereSsh(unittest.TestCase):
    """
    Une suppression reussie ne doit pas etre annoncee « ECHEC ».

    Les deux flux sont fusionnes, et `remote_delete` tient toute sortie pour
    un echec — regle saine, le shell distant ne parlant qu'en cas de probleme.
    Mais ssh, lui, ecrivait sur stderr a chaque commande :

        Warning: Permanently added '192.168.1.98' (RSA) to the list of
        known hosts.

    a chaque fois, puisque le fichier des hotes connus est /dev/null. Une
    suppression reussie ressortait donc en echec, avec la banniere en guise
    de motif. Constate contre l'appareil.
    """

    def test_le_bavardage_de_ssh_est_coupe(self):
        options = packtransport.SystemTransport(host="1.2.3.4").options()

        self.assertIn("LogLevel=ERROR", options)

    def test_les_messages_d_erreur_restent(self):
        """
        `ERROR` ne masque que l'information : tout le diagnostic de connexion
        repose sur des messages de niveau erreur, et doit survivre.
        """
        for sortie in ("Unable to negotiate with 192.168.1.98 port 22: no "
                       "matching host key type found. Their offer: ssh-rsa",
                       "Permission denied (publickey)."):
            genre, conseil = packtransport.classify_failure(sortie)

            self.assertIn(genre, (packtransport.PANNE_NEGOCIATION,
                                  packtransport.PANNE_AUTH))
            self.assertTrue(conseil)


class TestInventaireAvecEspaces(unittest.TestCase):
    """
    `find … -exec ls -l {} \\;` sur un nom a espaces. Ligne reelle relevee sur
    l'appareil :

        -rw-r--r-- 1 root wheel 2 Aug 23 15:23 /tmp/…/Margot, Apprentie véto
        en Australie/story.json

    `split()` puis `parts[-1]` en tirait `Australie/story.json`.
    """

    class Faux(object):
        host = "faux"

        def __init__(self, lignes):
            self.lignes = lignes

        def run(self, commande, timeout=60):
            return packtransport.Result(0, "\n".join(self.lignes).encode("utf-8"))

    def test_un_pack_au_nom_a_espaces_est_compte_correctement(self):
        base = "/var/mobile/Documents/packs"
        lignes = [
            "-rw-r--r-- 1 mobile mobile 3643 Aug 23 15:23 %s/%s/story.json"
            % (base, AUSTRALIE),
            "-rw-r--r-- 1 mobile mobile 1024 Aug 23 15:23 %s/%s/assets/a.mp3"
            % (base, AUSTRALIE),
        ]

        rows = packcore.remote_inventory(transport=self.Faux(lignes))

        self.assertEqual(len(rows), 1)
        nom, emplacement, fichiers, octets = rows[0]

        self.assertEqual(nom, AUSTRALIE)
        self.assertEqual(emplacement, "documents")
        self.assertEqual(fichiers, 2)
        self.assertEqual(octets, 3643 + 1024)

    def test_les_noms_simples_restent_lus_comme_avant(self):
        base = "/Applications/LunyUI.app/packs"
        lignes = ["-rw-r--r-- 1 root root 754 Aug 21 08:00 %s/cycle/story.json"
                  % base]

        rows = packcore.remote_inventory(transport=self.Faux(lignes))

        self.assertEqual(rows, [("cycle", "bundle", 1, 754)])

    def test_une_ligne_tronquee_est_ignoree_sans_bruit(self):
        rows = packcore.remote_inventory(
            transport=self.Faux(["", "total 0", "-rw-r--r-- 1 mobile"]))

        self.assertEqual(rows, [])


if __name__ == "__main__":
    unittest.main()
