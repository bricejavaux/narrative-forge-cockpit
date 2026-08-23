"""
Noms de dossier sur l'appareil : la regle, et pourquoi elle est si stricte.

----------------------------------------------------------------------------
Quatre faits, tous mesures contre le vrai 3GS
----------------------------------------------------------------------------

Le pack « Margot, Apprentie veto en Australie » a revele quatre defauts d'un
coup. Aucun ne pouvait apparaitre avant : tous les packs essayes jusque-la
s'appelaient `two-branches`, `IDRISS_ET_COLETTE`, `audio-demo` — que des
caracteres sans histoire.

1. **L'espace casse scp.** Le chemin distant n'etait pas protege ; le shell de
   l'appareil le decoupait en quatre mots et scp repondait
   `scp: ambiguous target`. C'est le defaut signale.

2. **L'apostrophe casse le quotage.** Les commandes distantes entouraient les
   chemins de guillemets SIMPLES, ce qui suffit pour l'espace, la virgule et
   l'accent, mais pas pour `'`. Sur « Margot, l'apprentie », l'appareil a
   repondu :

       sh: -c: line 0: unexpected EOF while looking for matching `''

   Dans un `rm -rf`, ce n'est pas un detail de confort.

3. **L'espace casse aussi l'inventaire.** `remote_inventory` lisait le chemin
   comme le DERNIER champ d'une ligne `ls -l`. Sur ce nom, le dernier champ
   valait `Australie/story.json`.

4. **HFS+ renormalise les accents.** Un nom envoye en NFC (`é` = U+00E9)
   revient en NFD (`e` + U+0301). Verifie :

       envoye  b' Apprentie v\\xc3\\xa9'      (NFC)
       relu    b' Apprentie ve\\xcc\\x81'     (NFD)

   Les octets different, donc la comparaison local/distant echouait, donc le
   pack apparaissait eternellement « absent de l'appareil » et se
   reproposait a chaque fois — meme apres un transfert reussi.

Les trois premiers sont corriges la ou ils se produisent : quotage POSIX
(`packtransport.quote_remote`) et lecture de `ls -l` en champs bornes. Le
quatrieme ne se corrige pas a la source — c'est le systeme de fichiers de
l'appareil qui decide.

----------------------------------------------------------------------------
D'ou la regle
----------------------------------------------------------------------------

**Le nom de DOSSIER est translittere ; le titre, lui, n'est jamais touche.**

    « Margot, Apprentie véto en Australie »
      -> dossier  Margot_Apprentie_veto_en_Australie
      -> titre    Margot, Apprentie véto en Australie   (story.json, intact)

C'est le titre que l'app affiche : `LunyLibraryItem` lit `story.json` et ne
retombe sur le nom de dossier que si le titre est vide. La translitteration
est donc invisible pour l'enfant, et le nom de dossier redevient ce qu'il
aurait toujours du etre — un identifiant.

Ce choix ne remplace pas le quotage, il s'y ajoute. Le quotage reste
indispensable pour les packs deja presents sur l'appareil sous un nom riche :
sans lui, impossible de les supprimer.

**La comparaison des deux bibliotheques passe par la meme fonction.** Un pack
depose autrefois sous « Margot, Apprentie véto en Australie » et un dossier
local du meme nom donnent la meme cle : le pack est reconnu comme present, et
non propose une seconde fois.

Deux entrees locales qui se reduisent au meme nom sont un vrai piege — la
seconde ecraserait la premiere. Elles ne sont pas departagees ici : elles
ressortent comme **noms ambigus** dans `packlibrary.build_diff`, decrites et
jamais pre-cochees.
"""

import posixpath
import unicodedata

# Ce que l'on garde tel quel. Volontairement etroit : ce jeu passe sans
# encombre un shell POSIX, le protocole SCP historique, HFS+ et l'API de
# fichiers de l'app. Tout le reste devient `_`.
AUTORISES = set("abcdefghijklmnopqrstuvwxyz"
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                "0123456789._-")

# Au-dela, le nom cesse d'etre lisible d'un coup d'oeil dans l'inventaire, et
# HFS+ commence a poser ses propres limites.
LONGUEUR_MAX = 64

DEFAUT = "pack"


def safe_name(name, fallback=DEFAUT):
    """
    Le nom de dossier retenu pour l'appareil.

    Les accents sont retires par decomposition Unicode plutot que par une
    table de correspondance : `é` devient `e`, `ü` devient `u`, et un
    caractere sans equivalent latin devient `_` au lieu de disparaitre en
    silence.
    """
    name = (name or "").strip()

    # NFKD separe la lettre de son accent ; `Mn` est la categorie des marques
    # combinantes, celles qu'on jette. C'est aussi ce qui rend la fonction
    # insensible a la difference NFC/NFD imposee par HFS+ : les deux formes
    # se reduisent au meme resultat.
    decompose = unicodedata.normalize("NFKD", name)
    sans_accent = "".join(c for c in decompose
                          if not unicodedata.combining(c))

    propre = "".join(c if c in AUTORISES else "_" for c in sans_accent)

    # Un `_` par groupe de caracteres ecartes, pas un par caractere :
    # « Margot, Apprentie » donnerait sinon « Margot__Apprentie ».
    morceaux = [m for m in propre.split("_") if m]
    propre = "_".join(morceaux)

    # Un nom qui commence par `-` serait pris pour une option par les
    # utilitaires distants ; un nom qui commence par `.` serait cache.
    propre = propre.lstrip("-.")[:LONGUEUR_MAX].rstrip("._-")

    return propre or fallback


def is_safe(name):
    """Vrai si le nom traverse la chaine sans etre modifie."""
    return bool(name) and safe_name(name) == name


def key(name):
    """
    Cle de comparaison entre les deux bibliotheques.

    Casse ignoree — le systeme de fichiers de cet iOS est HFS+, insensible a
    la casse : `MonPack` et `monpack` y sont le meme repertoire, et les
    traiter comme deux packs distincts proposerait un ajout qui ecraserait en
    silence.

    Et translitteration appliquee AUX DEUX COTES, ce qui fait correspondre un
    dossier local « Margot, Apprentie véto en Australie » avec un pack depose
    autrefois sur l'appareil sous ce meme nom riche, quelle que soit la forme
    de normalisation Unicode que le systeme de fichiers lui a donnee.
    """
    return safe_name(name).lower()


def remote_path(base, name):
    """Chemin distant d'un pack. Toujours en separateurs POSIX."""
    return posixpath.join(base, name)
