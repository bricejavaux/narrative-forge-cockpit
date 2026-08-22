"""
Ecriture de PNG en Python pur (zlib + struct).

Aucun outil d'edition d'image n'est disponible dans cet environnement (ni
ImageMagick, ni PIL) : ce module est le denominateur commun de
make_icons.py et make_pack_assets.py.
"""

import struct
import zlib


def write_png(path, width, height, rows, alpha_rows=None):
    """
    rows : sequence de `height` objets bytes, chacun de longueur width*3
           (RGB 8 bits, sans octet de filtre — il est ajoute ici).

    alpha_rows : facultatif, `height` objets bytes de longueur width. Fournis,
           le fichier est ecrit en RVBA. C'est indispensable pour les icones :
           ce SpringBoard n'applique aucun masque, l'arrondi doit donc etre
           porte par le canal alpha du fichier (voir NOTES.md).
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

    if alpha_rows is None:
        raw = b"".join(b"\x00" + row for row in rows)
        colour_type = 2                                    # RVB
    else:
        if len(alpha_rows) != height:
            raise ValueError("%d lignes d'alpha, attendu %d" % (len(alpha_rows), height))
        melange = []
        for row, alpha in zip(rows, alpha_rows):
            if len(alpha) != width:
                raise ValueError("ligne d'alpha de %d octets, attendu %d"
                                 % (len(alpha), width))
            out = bytearray()
            for x in range(width):
                out += row[x * 3:x * 3 + 3]
                out.append(alpha[x])
            melange.append(bytes(out))
        raw = b"".join(b"\x00" + row for row in melange)
        colour_type = 6                                    # RVBA

    ihdr = struct.pack(">IIBBBBB", width, height, 8, colour_type, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as handle:
        handle.write(png)


def read_png(path):
    """
    Decode un PNG en (largeur, hauteur, lignes RGB).

    Couvre ce qu'on rencontre en pratique : profondeur 8 ou 16 bits, niveaux
    de gris, palette, RVB, avec ou sans alpha, non entrelace. L'entrelacement
    Adam7 est refuse explicitement plutot que decode de travers.

    L'alpha est compose sur du noir : une icone iOS est opaque, et le fond de
    cette source est deja nocturne. Un avertissement signale le cas ou la
    source n'etait pas deja opaque.
    """
    data = open(path, "rb").read()

    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("%s : signature PNG absente" % path)

    pos = 8
    idat = bytearray()
    palette = None
    trns = None
    width = height = depth = color_type = interlace = None

    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        tag = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length

        if tag == b"IHDR":
            width, height, depth, color_type, _comp, _filt, interlace = struct.unpack(">IIBBBBB", chunk)
        elif tag == b"PLTE":
            palette = chunk
        elif tag == b"tRNS":
            trns = chunk
        elif tag == b"IDAT":
            idat += chunk
        elif tag == b"IEND":
            break

    if interlace:
        raise ValueError("%s : PNG entrelace (Adam7) non pris en charge" % path)
    if depth not in (8, 16):
        raise ValueError("%s : profondeur %d bits non prise en charge" % (path, depth))

    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color_type]
    sample_bytes = depth // 8
    pixel_bytes = channels * sample_bytes
    stride = width * pixel_bytes

    raw = zlib.decompress(bytes(idat))
    out = bytearray(stride * height)
    previous = bytearray(stride)
    offset = 0

    for y in range(height):
        filter_type = raw[offset]
        offset += 1
        line = bytearray(raw[offset:offset + stride])
        offset += stride

        # Defiltrage PNG : les cinq types de la specification.
        if filter_type == 1:
            for i in range(pixel_bytes, stride):
                line[i] = (line[i] + line[i - pixel_bytes]) & 0xFF
        elif filter_type == 2:
            for i in range(stride):
                line[i] = (line[i] + previous[i]) & 0xFF
        elif filter_type == 3:
            for i in range(stride):
                left = line[i - pixel_bytes] if i >= pixel_bytes else 0
                line[i] = (line[i] + ((left + previous[i]) >> 1)) & 0xFF
        elif filter_type == 4:
            for i in range(stride):
                left = line[i - pixel_bytes] if i >= pixel_bytes else 0
                up = previous[i]
                upleft = previous[i - pixel_bytes] if i >= pixel_bytes else 0
                p = left + up - upleft
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - upleft)
                pred = left if (pa <= pb and pa <= pc) else (up if pb <= pc else upleft)
                line[i] = (line[i] + pred) & 0xFF
        elif filter_type != 0:
            raise ValueError("filtre PNG %d inconnu ligne %d" % (filter_type, y))

        out[y * stride:(y + 1) * stride] = line
        previous = line

    # Conversion vers RGB 8 bits.
    rows = []
    had_alpha = False

    for y in range(height):
        base = y * stride
        row = bytearray()

        for x in range(width):
            i = base + x * pixel_bytes
            samples = [out[i + c * sample_bytes] for c in range(channels)]  # octet de poids fort si 16 bits

            if color_type == 0:
                r = g = b = samples[0]; a = 255
            elif color_type == 2:
                r, g, b = samples; a = 255
            elif color_type == 3:
                idx = samples[0]
                r, g, b = palette[idx * 3:idx * 3 + 3]
                a = trns[idx] if (trns and idx < len(trns)) else 255
            elif color_type == 4:
                r = g = b = samples[0]; a = samples[1]
            else:
                r, g, b, a = samples

            if a != 255:
                had_alpha = True
                r = (r * a) // 255
                g = (g * a) // 255
                b = (b * a) // 255

            row += bytes((r, g, b))

        rows.append(bytes(row))

    if had_alpha:
        print("  note : la source comporte de la transparence, composee sur du noir")

    return width, height, rows
