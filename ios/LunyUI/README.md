# LunyUI — écran de bibliothèque

Première brique d'interface : une grille de couvertures qui pousse un écran
de détail. Le moteur narratif n'est pas branché.

---

## État

Intégré au projet Theos réel et **vérifié par un build armv7** (`make clean
&& make package install`, cible `iphone:clang:10.3:6.0`). Le paquet
s'installe sur le 3GS de test et l'app ne produit aucun rapport de crash.

Ce que le build **ne** prouve pas : le rendu visuel à l'écran. Aucune
session n'a de capture d'écran de l'appareil ; `uiopen` n'accepte qu'une URL
et l'app n'enregistre pas de schéma, donc elle ne peut pas être lancée à
distance. La confirmation visuelle (grille, titre du détail, icône sur
SpringBoard) reste à faire en tapant l'icône.

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
├── DetailViewController.h/.m   ecran de detail, titre de l'histoire
├── LunyTheme.h/.m              tokens de couleur, source unique de la palette
├── Tools/make_icons.py         generateur d'icones (PNG en Python pur)
├── NOTES.md                    contraintes iOS 6 vs choix de code
└── Resources/                  icones generees + Info.plist
```

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
