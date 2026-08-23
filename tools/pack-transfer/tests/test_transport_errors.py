#!/usr/bin/env python3
"""
Classement des pannes de connexion, et reglages portes par le transport.

Ces tests existent a cause d'une panne reelle : au premier essai contre
l'appareil physique depuis Windows, la connexion a ete refusee en

    Unable to negotiate with 192.168.1.98 port 22:
    no matching host key type found. Their offer: ssh-rsa,ssh-dss

et l'outil a conseille de « reveiller l'ecran et reessayer » — un conseil sans
rapport, et trompeur, puisque aucune tentative supplementaire ne pouvait
aboutir.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import packtransport as pt


class TestClassement(unittest.TestCase):

    def test_le_message_exact_rapporte_par_l_utilisateur(self):
        genre, conseil = pt.classify_failure(
            "Unable to negotiate with 192.168.1.98 port 22: "
            "no matching host key type found. Their offer: ssh-rsa,ssh-dss")

        self.assertEqual(genre, pt.PANNE_NEGOCIATION)
        self.assertIn("ssh-rsa", conseil)
        # Le conseil trompeur ne doit surtout pas reapparaitre ici.
        self.assertNotIn("reveiller", conseil)

    def test_paramiko_dit_la_meme_chose_autrement(self):
        """Les deux clients ont des libelles differents pour la meme panne."""
        for message in ("Incompatible ssh peer (no acceptable host key)",
                        "Incompatible ssh peer (no acceptable kex algorithm)"):
            self.assertEqual(pt.classify_failure(message)[0], pt.PANNE_NEGOCIATION)

    def test_pannes_reseau(self):
        for message in ("ssh: connect to host 192.168.1.98 port 22: No route to host",
                        "ssh: connect to host x port 22: Connection timed out",
                        "kex_exchange_identification: read: Connection reset by peer",
                        "Connection refused",
                        "timed out during banner exchange"):
            genre, conseil = pt.classify_failure(message)
            self.assertEqual(genre, pt.PANNE_RESEAU, message)
            # Ici, et ici seulement, le conseil sur la veille a un sens.
            self.assertIn("reveiller", conseil)

    def test_pannes_d_authentification(self):
        for message in ("root@192.168.1.98: Permission denied (publickey).",
                        "Authentication failed.",
                        "Too many authentication failures"):
            genre, conseil = pt.classify_failure(message)
            self.assertEqual(genre, pt.PANNE_AUTH, message)
            self.assertIn("authorized_keys", conseil)

    def test_la_negociation_l_emporte_sur_le_reseau(self):
        """
        Un message de negociation contient souvent le mot « connection ».
        Le classer en reseau ramenerait le mauvais conseil.
        """
        genre, _ = pt.classify_failure(
            "Connection to 192.168.1.98 closed: Unable to negotiate: "
            "no matching host key type found")
        self.assertEqual(genre, pt.PANNE_NEGOCIATION)

    def test_message_inconnu_ne_ment_pas(self):
        genre, conseil = pt.classify_failure("quelque chose d'inedit")
        self.assertEqual(genre, pt.PANNE_INCONNUE)
        self.assertIn("non reconnue", conseil)

    def test_vide(self):
        self.assertEqual(pt.classify_failure("")[0], pt.PANNE_INCONNUE)
        self.assertEqual(pt.classify_failure(None)[0], pt.PANNE_INCONNUE)


class TestOptionsSysteme(unittest.TestCase):
    """
    Le transport systeme doit porter sa configuration en ligne de commande.

    C'est la cause exacte de la panne : sous WSL, `~/.ssh/config` fournissait
    `HostKeyAlgorithms=+ssh-rsa`. Sous Windows ce fichier n'existe pas.
    """

    def options(self, **kw):
        return pt.SystemTransport(host="1.2.3.4", **kw).options()

    def texte(self, **kw):
        return " ".join(self.options(**kw))

    def test_les_cles_d_hote_historiques_sont_reactivees(self):
        self.assertIn("HostKeyAlgorithms=+ssh-rsa,ssh-dss", self.options())

    def test_ajout_et_non_remplacement(self):
        """Le « + » preserve les defauts : un hote moderne reste bien servi."""
        for option in self.options():
            if option.startswith("HostKeyAlgorithms="):
                self.assertTrue(option.startswith("HostKeyAlgorithms=+"), option)

    def test_type_de_cle_publique_accepte(self):
        self.assertIn("PubkeyAcceptedKeyTypes=+ssh-rsa", self.options())

    def test_aucune_dependance_a_un_fichier_de_config(self):
        texte = self.texte()
        self.assertIn("UserKnownHostsFile=%s" % os.devnull, texte)
        self.assertIn("StrictHostKeyChecking=no", texte)

    def test_la_cle_est_transmise_quand_elle_est_renseignee(self):
        opts = self.options(key_path="/chemin/vers/cle")
        self.assertIn("-i", opts)
        self.assertIn("/chemin/vers/cle", opts)
        self.assertIn("IdentitiesOnly=yes", opts)

    def test_aucune_cle_aucune_option_i(self):
        self.assertNotIn("-i", self.options())

    def test_port_non_standard(self):
        self.assertIn("Port=2222", self.options(port=2222))
        self.assertNotIn("Port=22", self.texte(port=22))

    def test_les_memes_options_servent_a_ssh_et_a_scp(self):
        """
        Une divergence entre les deux ferait reussir l'inventaire et echouer
        le transfert — panne particulierement penible a diagnostiquer.
        """
        import inspect
        source = inspect.getsource(pt.SystemTransport)
        self.assertEqual(source.count("self.options()"), 2)



class TestMurDeSignature(unittest.TestCase):
    """
    Second mur, distinct du premier et facilement confondu avec lui.

    L'appareil est un OpenSSH 6.7 : les signatures RSA-SHA2 et l'extension
    `server-sig-algs` datent de la 7.2. Il n'accepte donc que `ssh-rsa`, sans
    pouvoir le dire, et refuse ce que paramiko propose en premier. L'echec se
    presente comme un « Permission denied », c'est-a-dire comme une mauvaise
    cle — alors que la meme cle passe en ligne de commande, OpenSSH retombant
    seul sur ssh-rsa.
    """

    def test_les_signatures_modernes_sont_nommees(self):
        self.assertEqual(pt.MODERN_PUBKEY_SIGNATURES,
                         ("rsa-sha2-512", "rsa-sha2-256"))

    def test_le_refus_de_signature_se_classe_en_authentification(self):
        genre, conseil = pt.classify_failure(
            "userauth_pubkey: unsupported public key algorithm: rsa-sha2-512")
        self.assertEqual(genre, pt.PANNE_AUTH)

    def test_le_conseil_distingue_la_cle_de_la_signature(self):
        """
        Le conseil doit dire quoi faire du fait que la cle marche DEHORS :
        c'est l'indice qui separe les deux causes.
        """
        conseil = pt._CONSEILS[pt.PANNE_AUTH]
        self.assertIn("ligne de commande", conseil)
        self.assertIn("ssh-rsa", conseil)
        self.assertIn("authorized_keys", conseil)

    def test_AuthError_est_distincte(self):
        """
        Seule cette panne merite une seconde tentative : les autres ne
        gagneraient rien a etre reessayees.
        """
        self.assertTrue(issubclass(pt.AuthError, pt.TransportError))
        self.assertFalse(issubclass(pt.ScpError, pt.AuthError))


class TestCommandeAffichee(unittest.TestCase):
    """
    L'outil doit dire ce qu'il execute. Diagnostiquer le refus precedent a
    demande de reconstruire la commande a la main hors de l'app.
    """

    def test_la_commande_systeme_est_recopiable(self):
        detail = pt.SystemTransport(host="1.2.3.4", key_path="/c/k").detail()

        self.assertTrue(detail.startswith("ssh "))
        for attendu in ("-F", "UserKnownHostsFile", "StrictHostKeyChecking=no",
                        "HostKeyAlgorithms=+ssh-rsa,ssh-dss",
                        "PubkeyAcceptedKeyTypes=+ssh-rsa",
                        "-i", "/c/k", "root@1.2.3.4"):
            self.assertIn(attendu, detail)

    def test_la_commande_correspond_a_ce_qui_est_execute(self):
        """
        `detail()` doit decrire `argv()`, pas une approximation : une
        divergence rendrait le journal trompeur, ce qui est pire que rien.
        """
        transport = pt.SystemTransport(host="1.2.3.4", key_path="/c/k")

        for element in transport.argv():
            self.assertIn(element.strip("<>"), transport.detail())

    def test_sans_cle_la_config_du_systeme_reste_employee(self):
        """
        Non-regression packcli : sans cle renseignee, l'outil depend encore de
        `~/.ssh/config` pour savoir laquelle employer. Couper la configuration
        casserait l'usage historique sous WSL.
        """
        self.assertNotIn("-F", pt.SystemTransport(host="1.2.3.4").options())

    def test_avec_cle_aucune_config_exterieure_n_est_lue(self):
        self.assertIn("-F", pt.SystemTransport(host="1.2.3.4", key_path="/c/k").options())

    def test_paramiko_annonce_ses_parametres(self):
        detail = pt.ParamikoTransport(host="1.2.3.4", key_path="/c/k").detail()

        self.assertIn("paramiko", detail)
        self.assertIn("root@1.2.3.4", detail)
        self.assertIn("/c/k", detail)
        self.assertIn("ssh-rsa", detail)

if __name__ == "__main__":
    unittest.main(verbosity=2)
