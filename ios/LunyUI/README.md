# LunyUI — bibliothèque et lecteur de packs

Grille de couvertures poussant un écran de lecture branché sur `luny-engine`.

---

## État

Intégré au projet Theos réel et **vérifié par un build armv7** (`make clean
&& make package install`, cible `iphone:clang:10.3:6.0`). Le paquet
s'installe sur le 3GS de test et l'app ne produit aucun rapport de crash.

Le moteur, lui, est vérifié **sur le 3GS**. Le CLI de `luny-engine` compilé
en armv7 avec la même chaîne rejoue sur l'appareil des sorties identiques
octet pour octet à `tests/expected/nominal_deux_branches` et
`tests/expected/tirage_graine_3` — ce dernier exerçant le générateur
aléatoire, donc les helpers de division de `LunyARMSupport.c`. La rotation
circulaire de la molette y est vérifiée de même sur le pack `random` :
`wheel_left` depuis l'option 0 va à la dernière, `wheel_right` depuis la
dernière revient à 0.

Ce que rien de tout cela **ne** prouve : le rendu visuel à l'écran. Aucune
session n'a de capture d'écran de l'appareil ; `uiopen` n'accepte qu'une URL
et l'app n'enregistre pas de schéma, donc elle ne peut être ni lancée ni
pilotée à distance. La confirmation visuelle (grille, image et bouton OK du
détail, icône sur SpringBoard) reste à faire à la main.

Les contraintes d'iOS 6 rencontrées, et les choix de code faits faute
d'élément, sont dans `NOTES.md`.

---

## Contenu

```
ios/LunyUI/
├── main.m                      handler d'exception -> /tmp/LunyUI-crash.txt
├── XXAppDelegate.h/.m          fenetre, UINavigationController, barre sombre
├── RootViewController.h/.m     grille de bibliotheque (UICollectionView, 2 colonnes)
├── LunyLibraryCell.h/.m        tuile : couverture a initiale, titre, nombre de noeuds
├── LunyLibraryItem.h/.m        4 packs embarques, metadonnees lues du moteur
├── DetailViewController.h/.m   lecteur de pack, branche sur luny-engine
├── LunyTheme.h/.m              tokens de couleur, source unique de la palette
├── LunyDebug.h                 interrupteur de la telemetrie (0 par defaut)
├── LunyAudioTrack.h/.m         piste du noeud : AVAudioPlayer ou repli simule
├── LunySimulatedAudio.h/.m     durees fabriquees, utilisees par le repli
├── LunyARMSupport.c            helpers de division entiere armv7 (voir plus bas)
├── Tools/lunypng.py            ecriture de PNG en Python pur
├── Tools/make_icons.py         generateur d'icones
├── Tools/make_pack_assets.py   construit les packs embarques
├── Tools/make_demo_audio.py    WAV reels du pack audio-demo
├── NOTES.md                    contraintes iOS 6 vs choix de code
└── Resources/                  icones, Info.plist, packs/ (4 packs)
```

## Moteur narratif

`DetailViewController` charge un pack via `luny-engine` (C99) et n'affiche que
ce que le moteur renvoie. Aucune logique de graphe cote UI — l'ecran est un
miroir de `luny_current_stage()`.

Disposition reprise de la maquette : zone d'art 320x240 en haut, panneau de
commandes compact dessous (barre de progression, molette gauche / bouton
central / molette droite, points de pagination).

Trois commandes de graphe, chacune conditionnee par le drapeau qui la
concerne : molette (`wheel` + contexte ActionNode), bouton central (`ok`), et
« Debut » (`home`, via `luny_home()`). « Debut » recommence l'histoire au
noeud d'entree ; le bouton retour de la barre de navigation, lui, la quitte —
deux gestes distincts, volontairement separes a l'ecran (cf. `NOTES.md`
§2.20).

Le bouton central change de metier selon `controlSettings.ok` du noeud, sans
aucun reglage :

| etat du pack | bouton | role |
|---|---|---|
| `ok` actif | ambre, « Choisir » | valide un choix dans un menu |
| `ok` inactif | vert sauge, « Lire » / « Pause » | pilote la piste |

**Audio.** `LunyAudioTrack` choisit au chargement entre lecture reelle
(`AVAudioPlayer`, si l'extension est decodable par iOS et le fichier
ouvrable) et repli sur minuteur a duree fabriquee. Le repli est affiche
« (simulé) », jamais silencieux.

**iOS ne decode pas l'Ogg Vorbis** — aucune version. Le format STUdio
l'autorise pourtant, et le moteur l'accepte : un pack converti en `.ogg`
restera muet tant qu'une conversion cote PC n'aura pas eu lieu (`NOTES.md`
§1.10). Seul `audio-demo` a de vraies pistes, en WAV.

En fin de piste,
`luny_audio_ended()` est emis — depuis le decodeur en lecture reelle, depuis
le minuteur sinon. Si le moteur repond
`IGNORED_NO_TRANSITION`, l'histoire est finie et l'app revient a la
bibliotheque (reserve documentee en `NOTES.md` §2.17).

La telemetrie technique (uuid, nom d'evenement, statut brut) est compilee
hors du binaire par defaut :

```sh
make LUNY_DEBUG=1 package install   # la retablit, ne pas livrer ainsi
```

## Palettes

Deux jeux de couleurs coexistent, bascule a la compilation :

```sh
make package install                      # sombre (defaut) : nuit et ambre
make LUNY_THEME_LIGHT=1 package install   # claire : bois et creme
make LUNY_THEME_PASTEL=1 package install  # pastel : turquoise et jaune
```

`LunyTheme` reste la source unique — aucun appelant ne change entre les deux,
seuls les tokens different. Les deux palettes ont ete verifiees au contraste
WCAG sur tous les couples texte/fond de l'app (`NOTES.md` §2.26).

Les sources C sont compilees directement depuis `../../luny-engine`, sans
copie. Deux details de build :

- `-fobjc-arc` est dans `LunyUI_OBJCFLAGS`, pas `LunyUI_CFLAGS` : Theos
  compile les `.c` avec `-x c` **et** `ALL_CFLAGS`, donc un `-fobjc-arc` place
  dans `CFLAGS` atterrirait sur du C pur.
- `LunyARMSupport.c` fournit `__udivsi3` / `__umodsi3` / `__divsi3` /
  `__modsi3`. armv7 n'a pas de division entiere materielle et le
  `libcompiler_rt.tbd` de ce SDK n'exporte que des helpers atomiques : sans ce
  fichier, le lien echoue sur `___umodsi3` et `___modsi3`, references par
  l'echantillonnage par rejet du generateur aleatoire du moteur.

### Packs embarques

`Resources/packs/` contient quatre packs copies depuis
`luny-engine/tests/packs/`, choisis pour couvrir des formes de graphe
differentes :

| pack | options d'ActionNode | interet |
|---|---|---|
| `two-branches` | 2 et 2 | parcours de reference |
| `random` | 3 | entree tiree au sort, molette active partout |
| `degraded` | 4 dont 2 mortes | assets manquants, version 2 |
| `cycle` | 1 et 1 | le graphe boucle sur lui-meme |

`Tools/make_pack_assets.py` construit ces copies. Regle a ne pas assouplir :
la copie reflete **exactement** la liste de fichiers de la fixture. Seul le
contenu des `.png` est remplace par une vraie image — les assets de fixture
font 0 octet, ce qui suffit au moteur mais fait renvoyer `nil` a `UIImage` ;
tout le reste est copie tel quel et **aucun fichier n'est ajoute**. `degraded`
reference par exemple `absent.mp3` et `sans-extension` qui n'existent pas, et
cette absence est precisement ce que le pack teste. Les fixtures du moteur ne
sont jamais modifiees.

### Portee de cette iteration

Commandes molette gauche / OK / molette droite. Pas d'audio, pas de pause, pas
de decompression ZIP. Chaque tuile ouvre son propre pack.

**A savoir pour exercer la molette :** `random` est le seul pack embarque ou
elle tourne reellement — ses trois options sont valides et tous ses noeuds ont
`controlSettings.wheel`. `degraded` a quatre options mais deux sont mortes par
construction, donc la rotation s'y arrete sur `IGNORED_DANGLING_OPTION`.

Une seule implémentation de l'écran. Un jeu de fichiers `XX*` concurrent
(`XXRootViewController`, `XXCoverCell`, `XXStoryDetailViewController`) a
existé en parallèle jusqu'au commit de consolidation : il a été supprimé au
profit de celui-ci, qui a un modèle typé et suit la maquette. L'historique
git le conserve si besoin.

## Palette

Toutes les couleurs passent par `LunyTheme` — aucune valeur hex en dur
ailleurs. Les teintes viennent de `mockup/luny_maquette_v3.html`, à une
exception documentée : la couleur de durée de la maquette (`#5F6B93`) ne
donne que 3,28:1 sur le fond de tuile, sous le seuil WCAG de 4,5:1 ; elle
est remplacée par `#94A0C6` (6,62:1).

## Icônes

`Tools/make_icons.py` régénère tout `Resources/AppIcon*.png` (plus les noms
historiques `Icon*.png`) depuis un seul rendu 720×720, réduit par moyenne de
surface. Aucune dépendance : ni ImageMagick, ni PIL. Motif volontairement
grossier — croissant ambre sur fond nuit — pour rester lisible à 29×29.

```sh
python3 Tools/make_icons.py
```

Note sur cet appareil : l'iPhone 3GS n'est **pas** Retina (320×480 à
l'échelle 1×). C'est donc `AppIcon57x57.png` / `Icon.png` en 57×57 qui est
réellement chargé ; les variantes `@2x`/`@3x` sont fournies par complétude.

**Piège déjà rencontré :** les `AppIcon*.png` du gabarit Theos font 0 octet,
et SpringBoard ignore alors l'app silencieusement — pas d'erreur, juste une
absence sur l'écran d'accueil. Vérifiez une taille non nulle après toute
régénération.

## Déploiement

```sh
make clean && make package install
```

Le `after-install::` du Makefile lance `su mobile -c 'uicache -a'` :
`uicache` échoue en root (« cannot open cache file. incorrect user? »),
piège automatisé ici plutôt que redécouvert à chaque déploiement.

## Diagnostic

Le 3GS n'a ni syslog, ni `head`, ni `tail`. `main.m` installe donc un
`NSSetUncaughtExceptionHandler` qui écrit nom, raison et pile d'appel dans
`/tmp/LunyUI-crash.txt` (copie dans `Documents/`). En cas de plantage, ce
fichier donne le message d'exception exact plutôt que de laisser deviner.
