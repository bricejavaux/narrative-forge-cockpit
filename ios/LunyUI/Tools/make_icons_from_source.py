#!/usr/bin/env python3
"""
Genere toutes les icones de l'app par reduction d'une source unique.

Remplace make_icons.py comme source des AppIcon*. L'ancien generateur
programmatique (croissant de lune dessine au code) reste dans Tools/ comme
solution de secours si la source venait a manquer.

    python3 Tools/make_icons_from_source.py [chemin/vers/source.png]

Par defaut : Resources/luny_icon_source_clean.png

L'arrondi est ECRIT dans le canal alpha des fichiers produits.

Ce point a d'abord ete tranche a l'envers, et la mesure a corrige : ce
SpringBoard n'applique AUCUN masque. Les icones systeme paraissent arrondies
parce qu'Apple les livre deja masquees — le PNG de Musique porte lui-meme
ses coins transparents. Verifie en decodant son fichier et son rendu en
cache, tous deux a 88 % de pixels opaques, contre 97 % pour une icone
carree. Voir NOTES.md.

Reduction en deux temps, pour une raison de cout : un Lanczos direct depuis
une source de 1024 px demande une centaine de coefficients par pixel de
sortie, ce qui est hors de portee en Python pur sur 17 tailles. On preleve
donc d'abord une moyenne de surface exacte (table de sommes cumulees) jusqu'a
deux fois la taille visee, puis on termine au Lanczos. Le prefiltrage par
moyenne de surface est justement ce qu'il faut avant une reduction : il
supprime les frequences que le noyau ne pourrait pas representer.
"""

import os
import sys
import time
from array import array

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lunypng import read_png, write_png  # noqa: E402
from lunyresize import resize_rgb, rounded_mask  # noqa: E402
from make_icons import TARGETS  # noqa: E402

DEFAULT_SOURCE = "luny_icon_source_clean.png"

# Rognage applique avant toute reduction.
#
# La source fournie n'est pas un carre plein : la silhouette arrondie de
# l'icone y est cuite, avec du BLANC dans les quatre coins, et un biseau
# sombre longe le bord. Mesure sur le fichier : coins a (251,251,251), rayon
# d'arrondi ~209 px sur 1159, soit 18 % du cote.
#
# Laisse tel quel, cela donnerait exactement ce qu'une icone iOS ne doit pas
# avoir : iOS pose son propre masque, le blanc des coins apparaitrait en
# coins clairs a l'interieur de ce masque, et le biseau se lirait comme un
# second contour dessine.
#
# On retire donc la marge jusqu'au plus grand carre central exempt de blanc.
# C'est purement soustractif — aucun pixel n'est invente — et cela supprime
# d'un meme geste les coins blancs et le biseau. Cout : 36 % de la surface.
#
# Valeur mesuree, pas devinee : voir la recherche par dichotomie dans
# NOTES.md. A recalculer si la source change.
CROP_MARGIN = 115

# Rayon de l'arrondi, en fraction du cote.
#
# Mesure sur l'icone systeme de Musique, prise comme reference de ce que
# l'appareil affiche : un cercle ajuste sur son canal alpha donne 13,0 px
# pour 59 de large, soit 0,2203. Son bord droit porte en outre une marge
# transparente d'environ 1 px, reprise ici.
ICON_CORNER_RATIO = 0.2203
ICON_EDGE_INSET = 1.0

# Marge de securite laissee autour de l'illustration, en fraction du cote.
#
# L'arc mord au plus profond sur la diagonale, a R(1-1/racine(2)) du coin,
# soit ~0,065 du cote pour R=0,2203 — environ 0,046 par axe. Une marge de
# 5 % place donc toute la morsure hors de l'illustration, ce qui garde la
# lune entiere.
#
# La marge est remplie par prolongement du bord, et non par un aplat : le
# ciel et les nuages sont degrades, un aplat se verrait comme un cadre.
ICON_SAFE_MARGIN = 0.05


def summed_area(rows, width, height, channel):
    """Table (width+1)x(height+1) des sommes cumulees d'un canal."""
    w = width + 1
    sat = array("q", bytes(8 * w * (height + 1)))

    for y in range(height):
        row = rows[y]
        running = 0
        cur = (y + 1) * w
        prev = y * w
        for x in range(width):
            running += row[x * 3 + channel]
            sat[cur + x + 1] = sat[prev + x + 1] + running

    return sat


def area_reduce(rows, width, height, target):
    """Moyenne de surface exacte vers target x target."""
    sats = [summed_area(rows, width, height, c) for c in range(3)]
    w = width + 1
    out = []

    for oy in range(target):
        y0 = (oy * height) // target
        y1 = max(y0 + 1, ((oy + 1) * height) // target)
        row = bytearray()

        for ox in range(target):
            x0 = (ox * width) // target
            x1 = max(x0 + 1, ((ox + 1) * width) // target)
            count = (x1 - x0) * (y1 - y0)

            for sat in sats:
                total = (sat[y1 * w + x1] - sat[y0 * w + x1]
                         - sat[y1 * w + x0] + sat[y0 * w + x0])
                row.append(total // count)

        out.append(bytes(row))

    return out


def inset_with_edge_padding(rows, width, height, margin):
    """
    Reduit l'illustration puis la recentre, la marge etant remplie en
    prolongeant les pixels de bord vers l'exterieur.
    """
    inner = int(round(width * (1.0 - 2.0 * margin)))
    offset = (width - inner) // 2
    shrunk = resize_rgb(width, height, rows, inner, inner)

    out = []
    for y in range(height):
        src_y = min(max(y - offset, 0), inner - 1)
        line = shrunk[src_y]
        row = bytearray()
        row += line[0:3] * offset                       # bord gauche prolonge
        row += line
        row += line[(inner - 1) * 3:inner * 3] * (width - offset - inner)
        out.append(bytes(row))

    return out


def make_size(rows, width, height, target):
    prefilter = min(width, target * 2)

    if prefilter < width:
        rows = area_reduce(rows, width, height, prefilter)
        width = height = prefilter

    return resize_rgb(width, height, rows, target, target)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    resources = os.path.normpath(os.path.join(here, "..", "Resources"))
    source = sys.argv[1] if len(sys.argv) > 1 else os.path.join(resources, DEFAULT_SOURCE)

    if not os.path.exists(source):
        raise SystemExit(
            "source introuvable : %s\n"
            "Deposer l'image de reference a cet emplacement, ou passer son chemin "
            "en argument." % source)

    print("source : %s" % source)
    width, height, rows = read_png(source)
    print("  %d x %d" % (width, height))

    if width != height:
        print("  ATTENTION : source non carree, les icones seront deformees")

    if CROP_MARGIN > 0:
        if 2 * CROP_MARGIN >= min(width, height):
            raise SystemExit("CROP_MARGIN=%d trop grand pour une source %dx%d"
                             % (CROP_MARGIN, width, height))

        rows = [row[CROP_MARGIN * 3:(width - CROP_MARGIN) * 3]
                for row in rows[CROP_MARGIN:height - CROP_MARGIN]]
        width -= 2 * CROP_MARGIN
        height -= 2 * CROP_MARGIN
        print("  rognee de %d px par cote -> %d x %d (coins blancs et biseau retires)"
              % (CROP_MARGIN, width, height))

    if ICON_SAFE_MARGIN > 0:
        rows = inset_with_edge_padding(rows, width, height, ICON_SAFE_MARGIN)
        print("  illustration rentree de %.0f %% par cote, marge prolongee depuis le bord"
              % (ICON_SAFE_MARGIN * 100))

    cache = {}
    masks = {}

    for name in sorted(TARGETS):
        size = TARGETS[name]

        if size not in masks:
            masks[size] = rounded_mask(size, ICON_CORNER_RATIO, ICON_EDGE_INSET)

        if size not in cache:
            start = time.time()
            cache[size] = make_size(rows, width, height, size)
            print("  %3d px genere en %5.1f s" % (size, time.time() - start))

        write_png(os.path.join(resources, name), size, size, cache[size],
                  alpha_rows=masks[size])

    print("%d fichiers ecrits" % len(TARGETS))


if __name__ == "__main__":
    main()
