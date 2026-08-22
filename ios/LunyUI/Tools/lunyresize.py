"""
Reechantillonnage Lanczos-3, en Python pur.

Aucun outil d'image n'est installe sur cette machine (ni ImageMagick, ni PIL)
et l'ensemble des generateurs de ce projet tient sans dependance : ce module
complete lunypng.py pour permettre de produire les icones par reduction d'une
source unique plutot que par dessin programmatique.

Le noyau est separable : on reduit d'abord horizontalement, puis
verticalement. En reduction, le support du noyau est dilate du facteur
d'echelle — sans cela on sous-echantillonne et on recolte du crenelage au
lieu d'une image lissee.

Le calcul se fait dans l'espace sRGB, sans linearisation, ce qui correspond au
comportement de Image.LANCZOS de Pillow : le but est un resultat comparable a
l'outil de reference, pas une reduction photometriquement exacte.
"""

import math

LANCZOS_A = 3


def _kernel(x):
    if x == 0.0:
        return 1.0
    if x <= -LANCZOS_A or x >= LANCZOS_A:
        return 0.0
    px = math.pi * x
    return (LANCZOS_A * math.sin(px) * math.sin(px / LANCZOS_A)) / (px * px)


def _weights(src_size, dst_size):
    """Pour chaque pixel de sortie : (premier index source, liste de poids)."""
    scale = src_size / dst_size
    support = LANCZOS_A * (scale if scale > 1.0 else 1.0)
    plan = []

    for i in range(dst_size):
        centre = (i + 0.5) * scale
        start = int(math.floor(centre - support + 0.5))
        end = int(math.ceil(centre + support - 0.5))
        start = max(start, 0)
        end = min(end, src_size - 1)

        raw = []
        for j in range(start, end + 1):
            distance = (j + 0.5 - centre) / (scale if scale > 1.0 else 1.0)
            raw.append(_kernel(distance))

        total = sum(raw)
        if total == 0.0:
            raw = [1.0]
            start = min(max(int(centre), 0), src_size - 1)
            total = 1.0

        plan.append((start, [w / total for w in raw]))

    return plan


def _clamp_byte(value):
    if value < 0.0:
        return 0
    if value > 255.0:
        return 255
    return int(value + 0.5)


def resize_rgb(src_width, src_height, rows, dst_width, dst_height):
    """rows : lignes RGB (bytes de longueur src_width*3). Retourne les memes."""
    # Passe horizontale : src_height lignes de dst_width pixels, en flottants.
    plan_x = _weights(src_width, dst_width)
    intermediate = []

    for y in range(src_height):
        row = rows[y]
        line = []
        for start, weights in plan_x:
            r = g = b = 0.0
            for k, w in enumerate(weights):
                i = (start + k) * 3
                r += row[i] * w
                g += row[i + 1] * w
                b += row[i + 2] * w
            line.append((r, g, b))
        intermediate.append(line)

    # Passe verticale.
    plan_y = _weights(src_height, dst_height)
    out = []

    for start, weights in plan_y:
        row = bytearray()
        for x in range(dst_width):
            r = g = b = 0.0
            for k, w in enumerate(weights):
                pr, pg, pb = intermediate[start + k][x]
                r += pr * w
                g += pg * w
                b += pb * w
            row += bytes((_clamp_byte(r), _clamp_byte(g), _clamp_byte(b)))
        out.append(bytes(row))

    return out
