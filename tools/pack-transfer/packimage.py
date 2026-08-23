"""
Lecture, recadrage et composition d'images, en Python pur (zlib + struct).

----------------------------------------------------------------------------
Pourquoi ce module existe
----------------------------------------------------------------------------

Le filigrane de l'en-tete passait par Pillow. Deux ennuis, tous deux
constates :

1. Pillow est une dependance de plus a installer avant d'empaqueter. Absente,
   `_header_artwork` rendait `None` et le bandeau restait vide **sans un mot**
   — exactement le symptome « l'image est dans le build mais ne s'affiche
   pas ». L'environnement de developpement de cet outil n'a pas Pillow : le
   defaut n'y etait donc pas reproductible, et c'est precisement ce qui a
   permis a une correction non verifiee de partir deux fois.

2. Rien de ce qui touchait au decor n'etait verifiable ici.

Ce module ne depend que de la bibliotheque standard. Le rendu du bandeau se
teste donc sur n'importe quelle machine, et l'application n'a plus besoin de
Pillow pour son decor. Pillow reste employe pour les VIGNETTES de couverture,
qui sont souvent des JPEG — un decodeur JPEG en Python pur serait, lui,
deraisonnable.

Le resultat est remis a Tk en PNG encode en base64, la forme que
`tk.PhotoImage(data=…)` reconnait — donc sans fichier temporaire, ce qui
compte pour une application posee sur un bureau sans droit d'ecriture garanti
a cote d'elle.

----------------------------------------------------------------------------
Cout
----------------------------------------------------------------------------

Decoder la source (772x1159) prend ~1 s en Python pur. C'est trop pour le fil
principal : l'appelant fait ce travail dans un fil de fond et ne repasse au
fil principal que pour construire l'objet Tk (voir packgui_win).
"""

import base64
import struct
import zlib


class Raster(object):
    """Une image RVB 8 bits : `rows[y]` fait `width * 3` octets."""

    def __init__(self, width, height, rows):
        self.width = width
        self.height = height
        self.rows = rows

    def pixel(self, x, y):
        row = self.rows[y]
        return row[3 * x], row[3 * x + 1], row[3 * x + 2]


# ------------------------------------------------------------------ #
# Lecture PNG                                                         #
# ------------------------------------------------------------------ #

def read_png(path):
    """
    Decode un PNG non entrelace en Raster.

    Couvre ce qu'on rencontre : profondeur 8 ou 16 bits, gris, palette, RVB,
    avec ou sans alpha. L'alpha est compose sur le noir — les sources de ce
    projet sont opaques, et un fond nocturne ne s'en distingue pas.

    L'entrelacement Adam7 est REFUSE explicitement plutot que decode de
    travers : mieux vaut un message qu'une image brouillee.
    """
    with open(path, "rb") as handle:
        data = handle.read()

    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("%s : signature PNG absente" % path)

    pos = 8
    idat = bytearray()
    palette = None
    width = height = depth = color_type = interlace = None

    while pos + 8 <= len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        tag = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length

        if tag == b"IHDR":
            (width, height, depth, color_type,
             _comp, _filt, interlace) = struct.unpack(">IIBBBBB", chunk)
        elif tag == b"PLTE":
            palette = chunk
        elif tag == b"IDAT":
            idat += chunk
        elif tag == b"IEND":
            break

    if width is None:
        raise ValueError("%s : en-tete IHDR absent" % path)
    if interlace:
        raise ValueError("%s : PNG entrelace (Adam7) non pris en charge" % path)
    if depth not in (8, 16):
        raise ValueError("%s : profondeur %d bits non prise en charge" % (path, depth))

    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color_type]
    sample = depth // 8
    pixel_bytes = channels * sample
    stride = width * pixel_bytes

    raw = zlib.decompress(bytes(idat))
    lignes = _unfilter(raw, height, stride, pixel_bytes)

    return _to_rgb(lignes, width, height, color_type, depth, palette)


def _unfilter(raw, height, stride, pixel_bytes):
    """Les cinq filtres de la specification PNG, appliques ligne a ligne."""
    lignes = []
    precedente = bytearray(stride)
    offset = 0

    for _y in range(height):
        filtre = raw[offset]
        offset += 1
        ligne = bytearray(raw[offset:offset + stride])
        offset += stride

        if filtre == 1:
            for i in range(pixel_bytes, stride):
                ligne[i] = (ligne[i] + ligne[i - pixel_bytes]) & 0xFF
        elif filtre == 2:
            for i in range(stride):
                ligne[i] = (ligne[i] + precedente[i]) & 0xFF
        elif filtre == 3:
            for i in range(stride):
                gauche = ligne[i - pixel_bytes] if i >= pixel_bytes else 0
                ligne[i] = (ligne[i] + ((gauche + precedente[i]) >> 1)) & 0xFF
        elif filtre == 4:
            for i in range(stride):
                gauche = ligne[i - pixel_bytes] if i >= pixel_bytes else 0
                haut = precedente[i]
                diag = precedente[i - pixel_bytes] if i >= pixel_bytes else 0
                p = gauche + haut - diag
                pa, pb, pc = abs(p - gauche), abs(p - haut), abs(p - diag)
                if pa <= pb and pa <= pc:
                    pred = gauche
                elif pb <= pc:
                    pred = haut
                else:
                    pred = diag
                ligne[i] = (ligne[i] + pred) & 0xFF
        elif filtre != 0:
            raise ValueError("filtre PNG %d inconnu" % filtre)

        lignes.append(ligne)
        precedente = ligne

    return lignes


def _to_rgb(lignes, width, height, color_type, depth, palette):
    """Ramene n'importe quel type de couleur PNG a du RVB 8 bits opaque."""
    pas = depth // 8
    sortie = []

    for ligne in lignes:
        rgb = bytearray(width * 3)

        for x in range(width):
            if color_type == 3:
                index = ligne[x]
                r, g, b = palette[3 * index], palette[3 * index + 1], palette[3 * index + 2]
            elif color_type in (0, 4):
                canaux = 2 if color_type == 4 else 1
                v = ligne[x * canaux * pas]
                r = g = b = v
            else:
                canaux = 4 if color_type == 6 else 3
                base = x * canaux * pas
                r, g, b = ligne[base], ligne[base + pas], ligne[base + 2 * pas]

            rgb[3 * x], rgb[3 * x + 1], rgb[3 * x + 2] = r, g, b

        sortie.append(bytes(rgb))

    return Raster(width, height, sortie)


# ------------------------------------------------------------------ #
# Recadrage et echelle                                                #
# ------------------------------------------------------------------ #

def crop(source, x0, y0, x1, y1):
    x0 = max(0, min(int(x0), source.width))
    x1 = max(x0 + 1, min(int(x1), source.width))
    y0 = max(0, min(int(y0), source.height))
    y1 = max(y0 + 1, min(int(y1), source.height))

    rows = [source.rows[y][3 * x0:3 * x1] for y in range(y0, y1)]

    return Raster(x1 - x0, y1 - y0, rows)


def scale(source, width, height, samples=3):
    """
    Reechantillonnage par moyenne d'un petit bloc.

    Le plus proche voisin creperait des escaliers sur une illustration lissee ;
    une moyenne de TOUS les pixels de la zone coute, elle, un parcours complet
    de la source a chaque appel. Une moyenne de `samples * samples` points
    repartis dans la zone donne un resultat visuellement identique pour un
    cout constant — ici 9 lectures par pixel produit.
    """
    width = max(1, int(width))
    height = max(1, int(height))
    fx = source.width / float(width)
    fy = source.height / float(height)
    n = max(1, int(samples))
    total = float(n * n)

    rows = []

    for y in range(height):
        ligne = bytearray(width * 3)

        # Points d'echantillonnage verticaux, calcules une fois par ligne.
        ys = []
        for j in range(n):
            sy = int((y + (j + 0.5) / n) * fy)
            ys.append(source.rows[min(sy, source.height - 1)])

        for x in range(width):
            r = g = b = 0
            for j in range(n):
                src = ys[j]
                for i in range(n):
                    sx = min(int((x + (i + 0.5) / n) * fx), source.width - 1)
                    base = 3 * sx
                    r += src[base]
                    g += src[base + 1]
                    b += src[base + 2]

            base = 3 * x
            ligne[base] = int(r / total)
            ligne[base + 1] = int(g / total)
            ligne[base + 2] = int(b / total)

        rows.append(bytes(ligne))

    return Raster(width, height, rows)


def cover(source, width, height, focus=0.5, samples=3):
    """
    Remplit `width x height` sans deformer : recadre puis met a l'echelle.

    `focus` designe, en fraction de la dimension recadree, le point a garder
    au centre. Il n'est pas decoratif : un portrait rendu dans un bandeau
    large ne peut montrer qu'une TRANCHE de la scene, et laisser cette tranche
    au sommet de l'image ne donne que du ciel — c'est le defaut qui rendait le
    filigrane invisible, la bande retenue mesurant 4,7 % de la hauteur de la
    source et ne contenant aucun motif.
    """
    voulu = width / float(height)
    actuel = source.width / float(source.height)

    if actuel > voulu:
        # Source trop large : on rogne sur les cotes.
        garde = source.height * voulu
        centre = source.width * focus
        x0 = max(0, min(centre - garde / 2.0, source.width - garde))
        recadre = crop(source, x0, 0, x0 + garde, source.height)
    else:
        # Source trop haute : on rogne en hauteur — le cas du portrait.
        garde = source.width / voulu
        centre = source.height * focus
        y0 = max(0, min(centre - garde / 2.0, source.height - garde))
        recadre = crop(source, 0, y0, source.width, y0 + garde)

    return scale(recadre, width, height, samples)


# ------------------------------------------------------------------ #
# Composition                                                         #
# ------------------------------------------------------------------ #

def hex_rgb(couleur):
    couleur = couleur.lstrip("#")
    return (int(couleur[0:2], 16), int(couleur[2:4], 16), int(couleur[4:6], 16))


def solid(width, height, couleur):
    r, g, b = hex_rgb(couleur) if isinstance(couleur, str) else couleur
    ligne = bytes(bytearray([r, g, b] * width))

    return Raster(width, height, [ligne] * height)


def blend_into(fond, motif, x, alpha=1.0, fade=0):
    """
    Pose `motif` sur `fond` a l'abscisse `x`, opacite `alpha`.

    `fade` : largeur, en pixels, du fondu lineaire sur le bord GAUCHE du
    motif. C'est lui qui evite l'effet vignette collee — l'illustration sort
    du fond au lieu d'y etre posee — et c'est aussi lui qui garantit que le
    cote ou vit le texte reste du fond pur, donc au contraste mesure pour
    l'app.

    `fond` est modifie et retourne.
    """
    x = int(x)
    fade = max(0, int(fade))

    for dy in range(motif.height):
        y = dy
        if y < 0 or y >= fond.height:
            continue

        cible = bytearray(fond.rows[y])
        source = motif.rows[dy]

        for dx in range(motif.width):
            cx = x + dx
            if cx < 0 or cx >= fond.width:
                continue

            a = alpha * (min(1.0, dx / float(fade)) if fade else 1.0)
            if a <= 0:
                continue

            base_c = 3 * cx
            base_s = 3 * dx

            for c in range(3):
                fondu = cible[base_c + c]
                cible[base_c + c] = int(round(fondu + a * (source[base_s + c] - fondu)))

        fond.rows[y] = bytes(cible)

    return fond


# ------------------------------------------------------------------ #
# Sortie vers Tk                                                      #
# ------------------------------------------------------------------ #

def to_png_bytes(raster):
    """L'image encodee en PNG, en memoire."""
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    brut = b"".join(b"\x00" + row for row in raster.rows)
    ihdr = struct.pack(">IIBBBBB", raster.width, raster.height, 8, 2, 0, 0, 0)

    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(brut, 6))
            + chunk(b"IEND", b""))


def to_tk_data(raster):
    """
    La forme acceptee par `tk.PhotoImage(data=…)` : du PNG encode en base64.

    Le PPM avait ete essaye d'abord, en se disant que le format le plus simple
    serait le plus sur. Tk le lit — mais seulement depuis un FICHIER : passe en
    base64 a `data=`, il repond « couldn't recognize image data ». Le PNG, lui,
    est reconnu sous les deux formes par Tk 8.6. Le detour par un fichier
    temporaire est ainsi evite, ce qui compte pour une application posee sur un
    bureau, sans droit d'ecriture garanti a cote d'elle.
    """
    return base64.b64encode(to_png_bytes(raster)).decode("ascii")


def write_png(path, raster):
    """Ecrit un PNG. Sert aux tests et a l'inspection du rendu hors interface."""
    with open(path, "wb") as handle:
        handle.write(to_png_bytes(raster))
