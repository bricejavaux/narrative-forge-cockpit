# LunyUI — écran de bibliothèque

Première brique d'interface : une grille de couvertures qui pousse un écran
de détail. Le moteur narratif n'est pas branché.

---

## État

Intégré au projet Theos réel et **vérifié par un build armv7** (`make clean
&& make package install`, cible `iphone:clang:10.3:6.0`). Le paquet
s'installe sur le 3GS de test et l'app ne produit aucun rapport de crash.

Le moteur, lui, est vérifié **sur le 3GS**. Le CLI de `luny-engine` compilé
en armv7 avec la même chaîne rejoue sur l'appareil, depuis
`/Applications/LunyUI.app/packs/two-branches`, des sorties identiques octet
pour octet à `tests/expected/nominal_deux_branches` et
`tests/expected/tirage_graine_3` — ce dernier exerçant le générateur
aléatoire, donc les helpers de division de `LunyARMSupport.c`.

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
├── LunyLibraryCell.h/.m        tuile : couverture a initiale, titre, duree
├── LunyLibraryItem.h/.m        4 entrees factices, codees en dur
├── DetailViewController.h/.m   lecteur de pack, branche sur luny-engine
├── LunyTheme.h/.m              tokens de couleur, source unique de la palette
├── LunyARMSupport.c            helpers de division entiere armv7 (voir plus bas)
├── Tools/lunypng.py            ecriture de PNG en Python pur
├── Tools/make_icons.py         generateur d'icones
├── Tools/make_pack_assets.py   images du pack de test embarque
├── NOTES.md                    contraintes iOS 6 vs choix de code
└── Resources/                  icones, Info.plist, packs/two-branches/
```

## Moteur narratif

`DetailViewController` charge un pack via `luny-engine` (C99) et n'affiche que
ce que le moteur renvoie : nom du noeud, image si presente, contexte
ActionNode, et un bouton OK qui emet `luny_ok()`. Aucune logique de graphe
cote UI — l'ecran est un miroir de `luny_current_stage()`.

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

### Pack de test embarque

`Resources/packs/two-branches/` est une copie de
`luny-engine/tests/packs/two-branches`. Le `story.json` est identique octet
pour octet ; seules les images different. Les assets de la fixture font
**0 octet** — suffisant pour le moteur, qui ne verifie que la presence et
l'extension sans jamais decoder, mais `UIImage` renvoie `nil` sur un fichier
vide. `Tools/make_pack_assets.py` genere donc de vraies images pour la copie
embarquee. Les fixtures du moteur ne sont pas touchees.

### Portee de cette iteration

Bouton OK uniquement. Pas d'audio, pas de molette, pas de pause, pas de
decompression ZIP. Les quatre tuiles de la bibliotheque ouvrent toutes le meme
pack de test : `LunyLibraryItem` reste une donnee factice sans lien avec les
packs.

**Consequence a connaitre :** sans molette, la sequence de
`tests/expected/nominal_deux_branches` n'est pas reproductible depuis l'ecran,
car son etape 2 est un evenement `right`. Avec OK seul, le parcours est
`Couverture -> Option A -> Histoire A`, et le bouton se grise sur ce dernier
noeud (`controlSettings.ok` y vaut faux).

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
