# LunyUI — écran de bibliothèque

Première brique d'interface : une grille de couvertures qui pousse un écran
de détail vide. Le moteur narratif n'est pas branché dans cette session.

---

## À lire avant tout : ce que cette session n'a pas pu faire

**Cette session tourne dans un bac à sable cloud isolé.** Elle n'a ni Theos,
ni SDK iOS, ni accès SSH à l'appareil, ni visibilité sur le projet `LunyUI`
local (celui qui a déjà compilé et tourné sur le 3GS dans une session
précédente). Concrètement :

- **`make package install` n'a pas été exécuté.** Aucun moyen de le faire
  ici. Le code n'a pas été compilé, ne serait-ce qu'une fois.
- **Rien n'a été vérifié sur l'appareil.** Ni l'icône, ni la navigation, ni
  le rendu réel de la grille.
- **Le Makefile, l'`AppDelegate` et le `RootViewController` généré par le
  gabarit n'ont pas été lus** — ils ne sont pas dans ce dépôt. Les points
  d'intégration ci-dessous sont donc des instructions à suivre, pas des
  modifications déjà faites dans vos fichiers réels.

Ce dossier livre du code écrit avec soin à partir de la connaissance des
API UIKit d'iOS 6, pas du code vérifié par un build. Les hypothèses prises
en l'absence du projet réel sont documentées dans `NOTES.md`, section 2.

---

## Contenu

```
ios/LunyUI/
├── RootViewController.h/.m     grille de bibliotheque (UICollectionView, 2 colonnes)
├── LunyLibraryCell.h/.m        tuile : titre + duree, pas d'image
├── LunyLibraryItem.h/.m        4 entrees factices, codees en dur
├── DetailViewController.h/.m   ecran vide, juste le titre choisi
├── Makefile.snippet.mk         a fusionner a la main dans le Makefile reel
├── NOTES.md                    contraintes iOS 6 vs choix de code
└── Resources/                  icones de secours (a ne pas utiliser en aveugle)
```

## Intégration dans le projet réel

1. **Copier les cinq fichiers `.h`/`.m`** dans le dossier du projet `LunyUI`
   local où vivent déjà `AppDelegate.h/.m` et `RootViewController.h/.m` (a
   priori la racine du projet — confirmez avec `grep _FILES Makefile`,
   détail dans `Makefile.snippet.mk`).

2. **Le `RootViewController.h/.m` généré par le gabarit sera écrasé** par
   celui-ci — c'est le but (« remplacer le RootViewController vide »).
   Si votre gabarit a nommé la classe différemment (préfixe de projet,
   type `LZRootViewController`), renommez soit la classe fournie ici, soit
   les références dans `AppDelegate`, mais pas les deux à moitié.

3. **Vérifiez que `AppDelegate` fait bien ceci** (ou l'équivalent — c'est
   le câblage attendu, pas un fichier à copier puisque le vôtre existe
   déjà et fonctionne) :

   ```objc
   RootViewController *root = [[RootViewController alloc] init];
   UINavigationController *nav = [[UINavigationController alloc] initWithRootViewController:root];
   self.window.rootViewController = nav;
   [self.window makeKeyAndVisible];
   ```

   `RootViewController` n'a pas d'initialiseur personnalisé : un simple
   `-init` (ou `-initWithNibName:bundle:`, selon ce que fait déjà votre
   gabarit) suffit. C'est précisément pour rester compatible avec ce que
   fait déjà votre `AppDelegate`, sans le voir, que ce contrôleur n'est pas
   un `UICollectionViewController` — détail dans `NOTES.md` §2.5.

4. **Fusionner `Makefile.snippet.mk`** dans le Makefile réel : la liste des
   fichiers sources à compiler, et le hook `after-install::` qui automatise
   `su mobile -c 'uicache -a'` (piège de déploiement déjà connu, maintenant
   dans le build plutôt qu'à refaire à la main à chaque fois).

5. **Ne pas toucher aux icônes existantes** si elles fonctionnent déjà —
   celles de `Resources/` ici ne sont qu'un filet de sécurité pour un
   projet démarré de zéro. Détail dans `Resources/README.md`.

## Vérification locale — à faire de votre côté

```
make package install
```

Puis, sur l'appareil :

- [ ] l'icône apparaît sur l'écran d'accueil sans intervention manuelle
- [ ] la grille affiche 4 tuiles en 2 colonnes, titre + durée, sans crash
- [ ] toucher une tuile pousse l'écran de détail avec le bon titre
- [ ] le bouton retour ramène à la bibliothèque

**Si `make` échoue à la compilation**, l'erreur du compilateur en dit plus
que je ne peux en deviner d'ici — copiez-la telle quelle, ce sera plus
rapide à corriger qu'une nouvelle hypothèse de ma part.

## Hors périmètre (rappel)

Branchement du moteur C, lecture audio, import de packs/décompression ZIP,
icônes définitives — tout ça reste pour une session suivante, avec le
projet réel sous les yeux.

## Référence visuelle et comportementale

`mockup/luny_maquette_v3.html`, à la racine du dépôt. La palette de
couleurs de cet écran (fond nuit, ambre) en reprend les teintes ; le
comportement de sélection (molette, bouton contextuel) n'est pas encore
branché ici puisque le moteur ne l'est pas non plus.
