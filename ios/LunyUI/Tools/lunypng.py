"""
Ecriture de PNG en Python pur (zlib + struct).

Aucun outil d'edition d'image n'est disponible dans cet environnement (ni
ImageMagick, ni PIL) : ce module est le denominateur commun de
make_icons.py et make_pack_assets.py.
"""

import struct
import zlib


def write_png(path, width, height, rows):
    """
    rows : sequence de `height` objets bytes, chacun de longueur width*3
           (RGB 8 bits, sans octet de filtre — il est ajoute ici).
    """
    for index, row in enumerate(rows):
        if len(row) != width * 3:
            raise ValueError(
                "ligne %d : %d octets, attendu %d" % (index, len(row), width * 3)
            )
    if len(rows) != height:
        raise ValueError("%d lignes, attendu %d" % (len(rows), height))

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b"".join(b"\x00" + row for row in rows)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # RGB 8 bits
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as handle:
        handle.write(png)
