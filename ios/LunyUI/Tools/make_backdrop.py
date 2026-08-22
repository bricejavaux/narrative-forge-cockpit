#!/usr/bin/env python3
"""
Produit le fond decoratif de l'ecran Bibliotheque.

    python3 Tools/make_backdrop.py [source.png]

Defaut : Resources/luny_background_source_portrait.png
Sortie  : Resources/backdrop-library.png, 320x480

Pourquoi 320x480 et pas plus : l'iPhone 3GS n'est pas Retina, son ecran fait
320x480 points ET pixels. Livrer plus grand ne ferait qu'alourdir le bundle et
le decodage pour un resultat identique.

L'image est livree TELLE QUELLE, sans teinte appliquee. Le melange vers la
couleur de fond se fait a l'execution, par l'alpha de la vue :

  - une seule image sert les palettes qui la veulent, au lieu d'une par theme ;
  - l'opacite se regle dans le code sans regenerer quoi que ce soit ;
  - et le reglage reste verifiable au contraste, palette par palette.

Reduction par Lanczos direct : le facteur n'est que de 2,4 environ, le
prefiltre par moyenne de surface des icones ne se justifie pas ici.
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lunypng import read_png, write_png  # noqa: E402
from lunyresize import resize_rgb  # noqa: E402

DEFAULT_SOURCE = "luny_background_source_portrait.png"
OUTPUT = "backdrop-library.png"
WIDTH, HEIGHT = 320, 480


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    resources = os.path.normpath(os.path.join(here, "..", "Resources"))
    source = sys.argv[1] if len(sys.argv) > 1 else os.path.join(resources, DEFAULT_SOURCE)

    if not os.path.exists(source):
        raise SystemExit("source introuvable : %s" % source)

    print("source : %s" % source)
    width, height, rows = read_png(source)
    print("  %d x %d" % (width, height))

    ratio_src = width / float(height)
    ratio_dst = WIDTH / float(HEIGHT)

    if abs(ratio_src - ratio_dst) > 0.01:
        print("  ATTENTION : rapport %.4f contre %.4f attendu, l'image sera deformee"
              % (ratio_src, ratio_dst))

    start = time.time()

    # Lanczos direct : le facteur de reduction n'est que de 2,4 environ, le
    # support du noyau reste donc court et le cout raisonnable. Le prefiltre
    # par moyenne de surface utilise pour les icones ne se justifie qu'a
    # partir de facteurs bien plus grands.
    out = resize_rgb(width, height, rows, WIDTH, HEIGHT)
    write_png(os.path.join(resources, OUTPUT), WIDTH, HEIGHT, out)

    print("  %s ecrit en %.1f s (%d octets)"
          % (OUTPUT, time.time() - start,
             os.path.getsize(os.path.join(resources, OUTPUT))))


if __name__ == "__main__":
    main()
