# Transfert de packs vers le 3GS

Outil de poste de travail, **distinct de l'app iOS** : il convertit un pack au
format lisible par l'appareil et l'y dépose, en réutilisant la clé SSH déjà
configurée.

```
packcore.py      logique : validation, conversion, inventaire, envoi, suppression
packtransport.py transport : binaires ssh/scp du système, ou paramiko en Python pur
packlibrary.py   balayage local, inventaire distant, différence entre les deux
packconfig.py    réglages mémorisés, localisation des ressources embarquées
packcli.py       ligne de commande
packgui.py       fenêtre Tkinter — même logique, même journal
packgui_win.py   application Windows autoportante — voir README-windows.md
tests/           82 tests, exécutables sans appareil ni réseau
```

**Application Windows** : `packgui_win.py` est une variante autoportante à
deux volets (poste ↔ appareil), destinée à être empaquetée en `.exe` unique.
Elle réutilise le même `packcore`. Tout ce qui la concerne — construction,
ffmpeg embarqué, règle de correspondance, limites de vérification — est dans
**[README-windows.md](README-windows.md)**.

```sh
python3 -m unittest discover -s tests -p "test_*.py"
```

---

## Prérequis

| paquet | rôle | sans lui |
|---|---|---|
| `python3-tk` | fenêtre Tkinter | la fenêtre ne démarre pas ; la ligne de commande fonctionne. **Pas livré avec Python sur Debian/Ubuntu** malgré son statut de bibliothèque standard |
| `ffmpeg` | `.ogg` → `.mp3`, `.bmp` → `.png` | les fichiers sont copiés tels quels et signalés dans le journal |
| `python3-pil` | `.bmp` → `.png` (préféré à ffmpeg) | ffmpeg prend le relais |

```sh
sudo apt install python3-tk ffmpeg python3-pil
```

État sur la machine de développement, **mis à jour** : `python3-tk` et
`ffmpeg` sont installés. Les conversions réelles ont donc enfin tourné, et
sont désormais couvertes par des tests automatiques — voir plus bas.
`python3-pil` manque toujours : la conversion `.bmp` passe donc par ffmpeg et
non par Pillow, ce qui est le repli prévu.

Côté SSH, rien à faire : `~/.ssh/config` contient déjà l'entrée pour
`192.168.1.98` avec `id_rsa_3gs`. Aucun mot de passe n'est demandé.

---

## Lancer depuis WSL

```sh
cd tools/pack-transfer

python3 packgui.py                      # fenêtre
python3 packcli.py liste                # inventaire de l'appareil
python3 packcli.py envoyer <dossier>    # convertir puis transférer
python3 packcli.py envoyer <pack.zip>
python3 packcli.py supprimer <nom>
```

WSLg est présent (`DISPLAY=:0`, `/mnt/wslg`) et la fenêtre s'affiche : sondée
en instrumentant `mainloop`, elle est mappée et visible en 720×640. Si rien ne
s'ouvre chez vous, lancer avec `LUNY_GUI_TRACE=1` pour situer le blocage
(`NOTES.md`), ou se rabattre sur `packcli.py`, qui fait strictement la même
chose.

---

## Où atterrissent les packs

| destination | par défaut | survit à `make package install` | supprimable depuis l'app |
|---|---|---|---|
| `/var/mobile/Documents/packs/` | **oui** | oui | oui, par appui long |
| `/Applications/LunyUI.app/packs/` | non (`--cible bundle`) | **non** | non |

Le défaut n'est pas celui qu'indiquait la demande initiale, et c'est délibéré :
un pack déposé dans le bundle est **effacé au prochain `make package install`**,
puisque le `.deb` remplace tout le `.app`. Il est en outre indélébile depuis
l'app — `/Applications` appartient à `root` alors que l'app tourne en `mobile`.
`Documents` n'a aucun de ces deux défauts et alimente déjà la suppression par
appui long. Le bundle reste accessible par `--cible bundle` pour qui le veut
quand même.

Les fichiers transférés dans `Documents` sont donnés à `mobile`, sans quoi
l'app ne pourrait ni les lire ni les effacer.

### Doublons de nom

L'app lit les deux emplacements. Transférer un pack qui porte le nom d'un pack
livré fait donc apparaître **deux tuiles**. L'outil refuse par défaut un nom
déjà présent et le signale ; `--force` (ou la case « remplacer ») passe outre.

---

## Le pipeline

1. **Validation** — `story.json` présent, JSON lisible, racine objet. Le nombre
   de nœuds, le titre et la version sont affichés ; un `version` absent est
   signalé, car le moteur refuse alors le pack.
2. **Conversion** — `.ogg`/`.oga` → `.mp3` (ffmpeg, 96 kb/s), `.bmp` → `.png`
   (Pillow, sinon ffmpeg). Les références de `story.json` sont réécrites **en
   mémoire** ; l'original n'est jamais touché, la sortie va dans
   `build/<nom>/`.
3. **Journal** — chaque fichier converti apparaît avec sa taille avant et
   après.
4. **Transfert** — `scp` vers l'emplacement choisi.
5. **Comptes rendus séparés** — la conversion et le transfert concluent
   chacun pour soi ; il n'y a pas de « terminé » global qui masquerait un
   échec partiel.

### Un fichier qui résiste n'arrête rien

Un Ogg vide ou corrompu est nommé dans le journal, **recopié tel quel**, sa
référence laissée intacte, et le transfert continue. Le pack reste jouable :
simplement, cette piste tombera sur le minuteur simulé de l'app plutôt que sur
une vraie lecture.

---

## Ce qui a été testé, et ce qui ne l'a pas été

**Testé de bout en bout sur le 3GS :**

- inventaire distant, avec nombre de fichiers et taille par pack ;
- envoi d'`audio-demo` (4,4 Mo) puis relecture par la bibliothèque de l'app,
  qui l'a bien vu apparaître comme entrée supprimable ;
- envoi depuis une archive ZIP, nom du pack repris du dossier interne ;
- refus d'un nom déjà présent, puis remplacement avec `--force` ;
- suppression distante, bundle épargné par défaut ;
- **robustesse** : `two-branches` et ses cinq `.ogg` de 0 octet — chacun
  nommé dans le journal, transfert mené à son terme, pack toujours accepté
  par le moteur ensuite.

**Depuis, `python3-tk` a été installé** et la fenêtre a pu être sondée : elle
s'affiche bien, en 720×640, avant comme après correction. La panne signalée
n'a pas été reproduite — l'explication la plus probable étant que la tentative
précédait l'installation du paquet. Un vrai défaut de sûreté vis-à-vis des
fils a néanmoins été trouvé et corrigé au passage : voir `NOTES.md`.

**La conversion réelle a depuis été exécutée**, ffmpeg ayant été installé.
Ce point, longtemps ouvert, est clos et couvert par `tests/test_packcore.py` :

- `.ogg` → `.mp3` sur un vrai fichier Vorbis, résultat confirmé `mp3` par
  `ffprobe`, et référence réécrite dans `story.json` ;
- `.bmp` → `.png`, référence réécrite également ;
- l'original n'est **jamais** modifié — vérifié taille et contenu ;
- un `.ogg` de 0 octet est recopié tel quel sans arrêter le reste, et la
  piste voisine est bien convertie malgré lui ;
- ffmpeg absent : le fichier passe tel quel, le journal le dit.

```sh
python3 -m unittest discover -s tests -p "test_*.py"
```

---

## Deux surprises de l'appareil, notées pour la suite

**`scp` doit forcer le protocole historique.** Le `scp` récent passe par SFTP,
et le serveur SFTP de cet iOS 6 ne sait pas créer de répertoire : toute copie
de dossier échoue en `path canonicalization failed`. L'outil emploie donc
`scp -O`, qui s'appuie sur le binaire `scp` distant.

**L'appareil coupe son Wi-Fi en veille.** Une commande peut échouer en
`No route to host` ou `timed out during banner exchange` simplement parce que
l'écran s'est éteint. Réveiller l'appareil et relancer. Le journal le rappelle
quand la connexion échoue.
