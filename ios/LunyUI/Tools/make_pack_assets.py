#!/usr/bin/env python3
"""
Genere les images du pack de test embarque dans l'app.

Pourquoi ce script existe : les assets de luny-engine/tests/packs/two-branches
font 0 octet. C'est correct pour le moteur, qui ne verifie que la presence du
fichier et son extension sans jamais le decoder — mais UIImage renvoie nil sur
un fichier vide, et l'ecran n'aurait donc rien a afficher.

Les fixtures du moteur ne sont pas touchees (les tests du moteur en dependent) :
seule la copie du pack embarquee dans Resources/packs/ recoit de vraies images.
Le story.json, lui, est copie a l'identique.

Chaque image porte l'initiale du nom de son noeud sur un aplat de la palette,
dans le meme esprit que les couvertures de la grille.

Usage :  python3 Tools/make_pack_assets.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lunypng import write_png  # noqa: E402

WIDTH, HEIGHT = 240, 240

ART_BASE = (0x06, 0x08, 0x12)

# Un asset par noeud porteur d'image dans two-branches/story.json, avec
# l'accent correspondant a sa place dans la grille.
ASSETS = {
    "cover.png": ((0xF0, 0xB3, 0x57), "C"),      # ambre  — Couverture
    "option-a.png": ((0x8F, 0xC7, 0xA8), "A"),   # sauge  — Option A
    "option-b.png": ((0xD9, 0x8F, 0xA6), "B"),   # rose   — Option B
}

# Glyphes 5x7, dessines a la main : pas de police disponible sans PIL.
GLYPHS = {
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
}

GLYPH_W, GLYPH_H = 5, 7


def blend(accent, base, k):
    return tuple(int(round(a * k + b * (1.0 - k))) for a, b in zip(accent, base))


def render(accent, letter):
    """Aplat teinte + cadre accent + initiale centree."""
    background = blend(accent, ART_BASE, 0.18)
    scale = min(WIDTH // (GLYPH_W * 2), HEIGHT // (GLYPH_H * 2))
    glyph = GLYPHS[letter]
    glyph_px_w = GLYPH_W * scale
    glyph_px_h = GLYPH_H * scale
    left = (WIDTH - glyph_px_w) // 2
    top = (HEIGHT - glyph_px_h) // 2
    border = 6

    rows = []
    for y in range(HEIGHT):
        row = bytearray()
        for x in range(WIDTH):
            on_border = (
                x < border or x >= WIDTH - border or y < border or y >= HEIGHT - border
            )
            if on_border:
                pixel = blend(accent, background, 0.55)
            else:
                pixel = background
                gx = (x - left) // scale
                gy = (y - top) // scale
                if 0 <= gx < GLYPH_W and 0 <= gy < GLYPH_H:
                    if left <= x < left + glyph_px_w and top <= y < top + glyph_px_h:
                        if glyph[gy][gx] == "1":
                            pixel = accent
            row += bytes(pixel)
        rows.append(bytes(row))
    return rows


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.normpath(
        os.path.join(here, "..", "Resources", "packs", "two-branches", "assets")
    )
    os.makedirs(out_dir, exist_ok=True)

    for name in sorted(ASSETS):
        accent, letter = ASSETS[name]
        write_png(os.path.join(out_dir, name), WIDTH, HEIGHT, render(accent, letter))
        print("  %-16s %dx%d" % (name, WIDTH, HEIGHT))

    # Le moteur exige que tout asset reference existe sous assets/ : les .ogg
    # doivent donc etre presents meme sans audio dans cette iteration. Ils
    # restent vides, personne ne les decode.
    for name in ("cover.ogg", "option-a.ogg", "option-b.ogg", "story-a.ogg", "story-b.ogg"):
        path = os.path.join(out_dir, name)
        if not os.path.exists(path):
            open(path, "wb").close()
            print("  %-16s (vide, place-tenu audio)" % name)


if __name__ == "__main__":
    main()
