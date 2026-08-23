#!/usr/bin/env python3
"""Injecte un schema d'URL de mise au point dans l'Info.plist MIS EN SCENE.

Pourquoi ce detour plutot qu'une entree permanente dans Resources/Info.plist :
un schema d'URL est une porte d'entree publique. Toute autre application de
l'appareil peut l'appeler. L'app livree n'a aucune raison d'en exposer une,
et ce script n'est donc invoque par le Makefile que pour LUNY_DEBUG=1.

A quoi il sert : `uiopen` de l'appareil ne sait lancer qu'une URL — il refuse
un identifiant de paquet, verifie sur ce 3GS ("usage: uiopen <url>"). Sans
schema, aucun moyen de demarrer l'app depuis le poste de travail, donc aucun
moyen de relever la disposition reelle sans un doigt sur la vitre.

    uiopen lunydebug://audit

Le fichier vise est celui du repertoire de mise en scene de Theos, pas la
source versionnee : rien de ce que fait ce script n'entre dans le depot.
"""

import plistlib
import sys

SCHEME = "lunydebug"


def main(path):
    with open(path, "rb") as handle:
        info = plistlib.load(handle)

    types = info.setdefault("CFBundleURLTypes", [])

    # Idempotent : une reconstruction sans nettoyage ne doit pas empiler les
    # entrees.
    for entry in types:
        if SCHEME in entry.get("CFBundleURLSchemes", []):
            print(f"inject_debug_url_scheme: {SCHEME}:// deja present")
            return 0

    types.append(
        {
            "CFBundleURLName": "com.yourcompany.lunyui.debug",
            "CFBundleURLSchemes": [SCHEME],
        }
    )

    # XML et non binaire : l'Info.plist du projet est en XML, et le garder
    # lisible permet de verifier le resultat avec un simple cat sur l'appareil.
    with open(path, "wb") as handle:
        plistlib.dump(info, handle)

    print(f"inject_debug_url_scheme: {SCHEME}:// ajoute a {path}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
