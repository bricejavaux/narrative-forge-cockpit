#!/usr/bin/env python3
"""
Generateur d'icones LunyUI.

Aucun outil d'edition d'image n'est disponible dans cet environnement (ni
ImageMagick, ni PIL, ni cairosvg) : ce script encode les PNG a la main avec
zlib + struct, sans dependance tierce.

Principe : une seule source haute resolution (720x720) est rendue une fois,
puis reduite a chaque taille cible par moyenne de surface exacte (table de
sommes cumulees). Ce n'est donc pas le meme petit fichier recopie — chaque
taille est un reechantillonnage propre du master, et la reduction fait
office d'anticrenelage.

Motif : croissant de lune ambre sur fond nuit degrade. Volontairement
grossier — a 29x29 tout detail fin devient une bouillie de pixels.

Usage :  python3 Tools/make_icons.py
"""

import math
import os
import sys
from array import array

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lunypng import write_png  # noqa: E402

# --- Palette (mockup/luny_maquette_v3.html) --------------------------------
NIGHT_TOP = (0x13, 0x1A, 0x38)   # haut du degrade, proche de #0B1024 eclairci
NIGHT_BOTTOM = (0x08, 0x0C, 0x1C)  # bas du degrade
AMBER = (0xF0, 0xB3, 0x57)       # accent ambre

MASTER = 720

# --- Geometrie du croissant, en fraction du cote ---------------------------
# Croissant = disque exterieur moins disque interieur, legerement decale vers
# le haut pour donner l'inclinaison. Les centres sont choisis pour que la
# masse du croissant (et non celle du disque) tombe au centre de l'icone.
OUTER_CX, OUTER_CY, OUTER_R = 0.625, 0.480, 0.300
INNER_CX, INNER_CY, INNER_R = 0.785, 0.440, 0.300
GLOW_CX, GLOW_CY, GLOW_R, GLOW_STRENGTH = 0.44, 0.50, 0.64, 0.30

TARGETS = {
    "AppIcon29x29.png": 29,
    "AppIcon29x29@2x.png": 58,
    "AppIcon29x29@3x.png": 87,
    "AppIcon40x40.png": 40,
    "AppIcon40x40@2x.png": 80,
    "AppIcon40x40@3x.png": 120,
    "AppIcon50x50.png": 50,
    "AppIcon50x50@2x.png": 100,
    "AppIcon57x57.png": 57,
    "AppIcon57x57@2x.png": 114,
    "AppIcon57x57@3x.png": 171,
    "AppIcon60x60.png": 60,
    "AppIcon60x60@2x.png": 120,
    "AppIcon60x60@3x.png": 180,
    "AppIcon72x72.png": 72,
    "AppIcon72x72@2x.png": 144,
    "AppIcon76x76.png": 76,
    "AppIcon76x76@2x.png": 152,
    # Noms historiques : c'est Icon.png (57x57) qui est reellement charge sur
    # un 3GS, ecran 320x480 non-Retina.
    "Icon.png": 57,
    "Icon@2x.png": 114,
    "Icon-Small.png": 29,
    "Icon-Small@2x.png": 58,
}


def render_master(size):
    """Rend le master en RGB, retourne trois array('H') de taille size*size."""
    red = array("H", bytes(2 * size * size))
    green = array("H", bytes(2 * size * size))
    blue = array("H", bytes(2 * size * size))

    ocx, ocy, orr = OUTER_CX * size, OUTER_CY * size, OUTER_R * size
    icx, icy, irr = INNER_CX * size, INNER_CY * size, INNER_R * size
    gcx, gcy, grr = GLOW_CX * size, GLOW_CY * size, GLOW_R * size

    orr2, irr2 = orr * orr, irr * irr

    for y in range(size):
        t = y / (size - 1)
        base_r = NIGHT_TOP[0] + (NIGHT_BOTTOM[0] - NIGHT_TOP[0]) * t
        base_g = NIGHT_TOP[1] + (NIGHT_BOTTOM[1] - NIGHT_TOP[1]) * t
        base_b = NIGHT_TOP[2] + (NIGHT_BOTTOM[2] - NIGHT_TOP[2]) * t
        row = y * size
        dy_o = y - ocy
        dy_i = y - icy
        dy_g = y - gcy
        dy_o2 = dy_o * dy_o
        dy_i2 = dy_i * dy_i

        for x in range(size):
            dx_o = x - ocx
            dx_i = x - icx

            # Croissant : dans le disque exterieur, hors du disque soustrait.
            if dx_o * dx_o + dy_o2 <= orr2 and dx_i * dx_i + dy_i2 > irr2:
                r, g, b = AMBER
            else:
                # Halo ambre derriere le croissant, decroissance quadratique.
                dx_g = x - gcx
                dist = math.sqrt(dx_g * dx_g + dy_g * dy_g)
                k = 1.0 - dist / grr
                if k < 0.0:
                    k = 0.0
                k = k * k * GLOW_STRENGTH
                r = base_r + (AMBER[0] - base_r) * k
                g = base_g + (AMBER[1] - base_g) * k
                b = base_b + (AMBER[2] - base_b) * k

            i = row + x
            red[i] = int(r)
            green[i] = int(g)
            blue[i] = int(b)

    return red, green, blue


def summed_area(channel, size):
    """Table de sommes cumulees (size+1)^2, pour une moyenne de surface O(1)."""
    w = size + 1
    sat = array("q", bytes(8 * w * w))
    for y in range(size):
        row_sum = 0
        cur = (y + 1) * w
        prev = y * w
        src = y * size
        for x in range(size):
            row_sum += channel[src + x]
            sat[cur + x + 1] = sat[prev + x + 1] + row_sum
    return sat


def box_average(sat, size, x0, y0, x1, y1):
    w = size + 1
    total = sat[y1 * w + x1] - sat[y0 * w + x1] - sat[y1 * w + x0] + sat[y0 * w + x0]
    count = (x1 - x0) * (y1 - y0)
    return total // count if count else 0


def downsample(sats, master, target):
    """Reduit le master a target x target par moyenne de surface exacte."""
    rows = []
    for oy in range(target):
        y0 = (oy * master) // target
        y1 = max(y0 + 1, ((oy + 1) * master) // target)
        row = bytearray()
        for ox in range(target):
            x0 = (ox * master) // target
            x1 = max(x0 + 1, ((ox + 1) * master) // target)
            for sat in sats:
                row.append(box_average(sat, master, x0, y0, x1, y1))
        rows.append(bytes(row))
    return rows



def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Resources")
    out_dir = os.path.normpath(out_dir)

    print("rendu du master %dx%d..." % (MASTER, MASTER))
    channels = render_master(MASTER)

    print("tables de sommes cumulees...")
    sats = [summed_area(c, MASTER) for c in channels]

    # Un seul reechantillonnage par taille distincte, reutilise pour les
    # noms de fichiers qui partagent la meme dimension (60@2x et 40@3x font
    # tous deux 120 px, par exemple).
    cache = {}
    for name in sorted(TARGETS):
        size = TARGETS[name]
        if size not in cache:
            cache[size] = downsample(sats, MASTER, size)
        write_png(os.path.join(out_dir, name), size, size, cache[size])
        print("  %-24s %dx%d" % (name, size, size))


if __name__ == "__main__":
    main()
