#!/usr/bin/env python3
"""
Protocole SCP historique, verifie a l'octet pres.

Ces tests portent sur le seul morceau de l'outil que l'environnement de
developpement ne peut pas essayer pour de vrai : ni paramiko, ni 3GS, ni
Windows. Le protocole etant entierement deterministe, il se verifie
integralement contre un faux canal — ce qui reste, apres, est la connexion
elle-meme, pas le dialogue.
"""

import os
import re
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import packtransport as pt


class FakeChannel(object):
    """
    Canal minimal : accumule ce qu'on lui ecrit, et rend les accuses qu'on lui
    a prepares. `send_limit` simule une ecriture partielle, comportement normal
    d'une socket et principale source de corruption silencieuse si on l'ignore.
    """

    def __init__(self, acks=None, send_limit=None):
        self.sent = b""
        self.acks = list(acks) if acks is not None else None
        self.send_limit = send_limit
        self.sends = 0

    def send(self, data):
        data = bytes(data)

        if self.send_limit is not None:
            data = data[:self.send_limit]

        self.sent += data
        self.sends += 1
        return len(data)

    def recv(self, n):
        # Par defaut, le puits accuse tout favorablement.
        if self.acks is None:
            return b"\x00" if n == 1 else b""

        if not self.acks:
            return b""

        return self.acks.pop(0)


def make_pack(root, files):
    for nom, contenu in files.items():
        chemin = os.path.join(root, nom)
        os.makedirs(os.path.dirname(chemin), exist_ok=True)
        with open(chemin, "wb") as handle:
            handle.write(contenu)


class TestScpStream(unittest.TestCase):

    def test_flux_complet_d_un_pack(self):
        """Le flux exact attendu par `scp -rt` pour un pack a deux fichiers."""
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "monpack")
            make_pack(pack, {
                "story.json": b'{"a":1}',
                "assets/son.mp3": b"AUDIO",
            })

            canal = FakeChannel()
            total = pt.scp_send_directory(canal, pack, "monpack")

        attendu = (
            b"D0755 0 monpack\n"
            b"C0644 7 story.json\n" b'{"a":1}' b"\x00"
            b"D0755 0 assets\n"
            b"C0644 5 son.mp3\n" b"AUDIO" b"\x00"
            b"E\n"
            b"E\n"
        )

        self.assertEqual(canal.sent, attendu)
        self.assertEqual(total, 12)

    def test_fichiers_avant_sous_dossiers_et_ordre_stable(self):
        """Un envoi doit etre reproductible : tri explicite, pas l'ordre du disque."""
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            make_pack(pack, {
                "zebre.txt": b"z",
                "alpha.txt": b"a",
                "sous/b.txt": b"b",
                "autre/a.txt": b"a",
            })

            canal = FakeChannel()
            pt.scp_send_directory(canal, pack, "p")

        # Les lignes de controle ne peuvent pas s'extraire par un simple
        # split : le CONTENU d'un fichier precede l'en-tete suivant sans
        # saut de ligne intermediaire.
        ordre = re.findall(rb"[CD]\d{4} \d+ [^\n]+", canal.sent)

        self.assertEqual(ordre, [
            b"D0755 0 p",
            b"C0644 1 alpha.txt",
            b"C0644 1 zebre.txt",
            b"D0755 0 autre",
            b"C0644 1 a.txt",
            b"D0755 0 sous",
            b"C0644 1 b.txt",
        ])

    def test_ecriture_partielle_ne_perd_aucun_octet(self):
        """`send` peut n'ecrire qu'une partie : tout doit finir par passer."""
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            make_pack(pack, {"gros.bin": b"X" * 5000})

            canal = FakeChannel(send_limit=7)
            pt.scp_send_directory(canal, pack, "p")

        self.assertIn(b"C0644 5000 gros.bin\n", canal.sent)
        self.assertEqual(canal.sent.count(b"X"), 5000)
        self.assertTrue(canal.sends > 700, "l'ecriture partielle n'a pas ete exercee")

    def test_accuse_negatif_remonte_le_message_du_distant(self):
        canal = FakeChannel(acks=[b"\x00", b"\x01"] + [bytes([c]) for c in b"disque plein\n"])

        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            make_pack(pack, {"a.txt": b"a"})

            with self.assertRaises(pt.ScpError) as cm:
                pt.scp_send_directory(canal, pack, "p")

        self.assertIn("disque plein", str(cm.exception))

    def test_canal_ferme_est_signale(self):
        canal = FakeChannel(acks=[])

        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            make_pack(pack, {"a.txt": b"a"})

            with self.assertRaises(pt.ScpError):
                pt.scp_send_directory(canal, pack, "p")

    def test_nom_avec_saut_de_ligne_refuse(self):
        """Un saut de ligne couperait la ligne de controle en deux."""
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            make_pack(pack, {"a.txt": b"a"})

            with self.assertRaises(pt.ScpError):
                pt.scp_send_directory(FakeChannel(), pack, "mon\npack")

    def test_espaces_dans_le_nom_acceptes(self):
        """Un espace est parfaitement legal : le nom est le reste de la ligne."""
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "p")
            make_pack(pack, {"a.txt": b"a"})

            canal = FakeChannel()
            pt.scp_send_directory(canal, pack, "Mon Pack")

        self.assertTrue(canal.sent.startswith(b"D0755 0 Mon Pack\n"))

    def test_dossier_absent(self):
        with self.assertRaises(pt.ScpError):
            pt.scp_send_directory(FakeChannel(), "/n/existe/pas", "p")

    def test_dossier_vide_produit_un_D_et_un_E(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "vide")
            os.makedirs(pack)

            canal = FakeChannel()
            total = pt.scp_send_directory(canal, pack, "vide")

        self.assertEqual(canal.sent, b"D0755 0 vide\nE\n")
        self.assertEqual(total, 0)


class TestResult(unittest.TestCase):
    """`Result` doit imiter CompletedProcess : packcore lit `.stdout` en octets."""

    def test_stdout_est_toujours_en_octets(self):
        self.assertEqual(pt.Result(0, "texte").stdout, b"texte")
        self.assertEqual(pt.Result(0, b"octets").stdout, b"octets")

    def test_decodage_comme_les_appelants_existants(self):
        resultat = pt.Result(1, "erreur distante")
        self.assertEqual(resultat.stdout.decode("utf-8", "replace").strip(),
                         "erreur distante")


if __name__ == "__main__":
    unittest.main(verbosity=2)
