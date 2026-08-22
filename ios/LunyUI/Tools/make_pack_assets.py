#!/usr/bin/env python3
"""
Construit les packs embarques dans l'app depuis les fixtures du moteur.

Pourquoi ce script existe : les assets de luny-engine/tests/packs/ font tous
0 octet. C'est correct pour le moteur, qui ne verifie que la presence du
fichier et son extension sans jamais le decoder — mais UIImage renvoie nil sur
un fichier vide, et l'ecran n'aurait donc rien a afficher.

Regle de construction, a ne pas assouplir : la copie embarquee reflete
*exactement* la liste de fichiers de la fixture. Seul le contenu des .png est
remplace par une vraie image ; tout le reste est copie octet pour octet, et
aucun fichier n'est ajoute. C'est ce qui garantit que le pack embarque se
comporte comme la fixture — "degraded" reference par exemple absent.mp3 et
sans-extension qui n'existent pas, et cette absence est precisement ce que le
moteur y teste.

Les fixtures elles-memes ne sont jamais modifiees.

Usage :  python3 Tools/make_pack_assets.py
"""

import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lunypng import write_png  # noqa: E402

WIDTH, HEIGHT = 240, 240
ART_BASE = (0x06, 0x08, 0x12)

# Un accent de la palette par pack, pour que les ecrans restent distinguables.
PACK_ACCENTS = {
    "two-branches": (0xF0, 0xB3, 0x57),  # ambre
    "random": (0x8F, 0xC7, 0xA8),        # sauge
    "degraded": (0xD9, 0x8F, 0xA6),      # rose
    "cycle": (0x7F, 0xA6, 0xE0),         # bleu
}

# Glyphes 5x7, dessines a la main : pas de police disponible sans PIL.
GLYPHS = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
}

GLYPH_W, GLYPH_H = 5, 7


def letter_for_asset(filename):
    """
    cover.png -> C, option-a.png -> A, option-b.png -> B, present.png -> P.
    Le dernier segment prime pour que option-a et option-b ne donnent pas
    tous deux "O".
    """
    stem = os.path.splitext(filename)[0]
    segment = stem.split("-")[-1] if "-" in stem else stem
    letter = segment[:1].upper()
    return letter if letter in GLYPHS else "?"


def blend(accent, base, k):
    return tuple(int(round(a * k + b * (1.0 - k))) for a, b in zip(accent, base))


def render(accent, letter):
    """Aplat teinte + cadre accent + lettre centree."""
    background = blend(accent, ART_BASE, 0.18)
    border_color = blend(accent, background, 0.55)
    scale = min(WIDTH // (GLYPH_W * 2), HEIGHT // (GLYPH_H * 2))
    glyph = GLYPHS[letter]
    glyph_w, glyph_h = GLYPH_W * scale, GLYPH_H * scale
    left, top = (WIDTH - glyph_w) // 2, (HEIGHT - glyph_h) // 2
    border = 6

    rows = []
    for y in range(HEIGHT):
        row = bytearray()
        for x in range(WIDTH):
            if x < border or x >= WIDTH - border or y < border or y >= HEIGHT - border:
                pixel = border_color
            else:
                pixel = background
                if left <= x < left + glyph_w and top <= y < top + glyph_h:
                    if glyph[(y - top) // scale][(x - left) // scale] == "1":
                        pixel = accent
            row += bytes(pixel)
        rows.append(bytes(row))
    return rows


def build_pack(name, fixtures_dir, out_root):
    src = os.path.join(fixtures_dir, name)
    dst = os.path.join(out_root, name)

    if not os.path.isdir(src):
        raise SystemExit("fixture introuvable : %s" % src)

    # Reconstruction complete : garantit que la copie ne conserve aucun
    # fichier absent de la fixture.
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    os.makedirs(dst)

    shutil.copyfile(os.path.join(src, "story.json"), os.path.join(dst, "story.json"))
    print("  %s/story.json" % name)

    src_assets = os.path.join(src, "assets")
    if not os.path.isdir(src_assets):
        print("  %s : pas de dossier assets/ dans la fixture, aucun cree" % name)
        return

    dst_assets = os.path.join(dst, "assets")
    os.makedirs(dst_assets)
    accent = PACK_ACCENTS.get(name, (0xF0, 0xB3, 0x57))

    for filename in sorted(os.listdir(src_assets)):
        src_file = os.path.join(src_assets, filename)
        dst_file = os.path.join(dst_assets, filename)

        if filename.lower().endswith(".png"):
            letter = letter_for_asset(filename)
            write_png(dst_file, WIDTH, HEIGHT, render(accent, letter))
            print("  %s/assets/%-16s image %dx%d, lettre %s" % (name, filename, WIDTH, HEIGHT, letter))
        else:
            shutil.copyfile(src_file, dst_file)
            print("  %s/assets/%-16s copie tel quel (%d o)" % (name, filename, os.path.getsize(dst_file)))


# Le pack de demonstration audio n'est pas une fixture : il est ecrit pour
# cette app. Seules ses images sont (re)generees ici — ses pistes viennent de
# make_demo_audio.py, et son dossier ne doit donc jamais etre efface.
AUDIO_DEMO_IMAGES = {
    "cover.png": ((0x7F, 0xA6, 0xE0), "B"),
    "story.png": ((0x8F, 0xC7, 0xA8), "C"),
    "long.png": ((0xD9, 0x8F, 0xA6), "?"),
}


def build_audio_demo_images(out_root):
    out_dir = os.path.join(out_root, "audio-demo", "assets")

    if not os.path.isdir(out_dir):
        print("  audio-demo : dossier absent, lancer make_demo_audio.py d'abord")
        return

    for name in sorted(AUDIO_DEMO_IMAGES):
        accent, letter = AUDIO_DEMO_IMAGES[name]
        write_png(os.path.join(out_dir, name), WIDTH, HEIGHT, render(accent, letter))
        print("  audio-demo/assets/%-14s image %dx%d, lettre %s" % (name, WIDTH, HEIGHT, letter))


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    fixtures = os.path.normpath(os.path.join(here, "..", "..", "..", "luny-engine", "tests", "packs"))
    out_root = os.path.normpath(os.path.join(here, "..", "Resources", "packs"))
    os.makedirs(out_root, exist_ok=True)

    for name in sorted(PACK_ACCENTS):
        build_pack(name, fixtures, out_root)

    build_audio_demo_images(out_root)


if __name__ == "__main__":
    main()
