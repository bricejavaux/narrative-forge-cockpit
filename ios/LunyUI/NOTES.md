# NOTES — contraintes iOS 6 découvertes, écran de bibliothèque

Même esprit que `luny-engine/NOTES.md` : séparer ce qui est une **contrainte
de la plateforme** (non négociable, vérifiable dans la documentation ou le
comportement d'iOS 6) de ce qui est un **choix de code** pris dans cette
session, faute d'un élément que je n'avais pas sous les yeux.

---

## 0. Ce qui n'a pas pu être vérifié

**Mise à jour.** Cette section décrivait une session sans Theos ni SDK ni
appareil : rien n'y avait été compilé. Ce n'est plus le cas — le code est
depuis compilé en armv7 et installé sur le 3GS (voir `README.md`). Les
points 5 et 6 ci-dessous, pris comme hypothèses à l'époque, sont désormais
tranchés par le projet réel et annotés comme tels.

Reste non vérifié : le **rendu visuel** à l'écran, aucune session n'ayant de
capture de l'appareil.

---

## 1. Contraintes de la plateforme

1. **`UICollectionView` exige un enregistrement explicite de cellule.**
   Contrairement à `UITableView`, dont `dequeueReusableCellWithIdentifier:`
   pouvait renvoyer `nil` et laisser fabriquer la cellule à la main,
   `UICollectionView` lève une exception (`NSInternalInconsistencyException`,
   « unable to dequeue a cell ») si on la deque sans avoir appelé au
   préalable `registerClass:forCellWithReuseIdentifier:` (ou l'équivalent
   par nib). Sans storyboard ici, l'enregistrement se fait par classe dans
   `RootViewController.m -viewDidLoad`.

2. **Pas de dimensionnement automatique de cellule.**
   `UICollectionViewFlowLayoutAutomaticSize` (cellules qui se dimensionnent
   seules) date d'iOS 8. Sur cible iOS 6, la taille de chaque tuile est
   calculée à la main dans
   `collectionView:layout:sizeForItemAtIndexPath:` — c'est le mécanisme
   concret derrière la consigne générale « calcul manuel, pas d'Auto
   Layout » de cette tâche.

3. **`NSTextAlignmentCenter`, pas `UITextAlignmentCenter`.**
   L'ancienne énumération `UITextAlignment` a été remplacée par
   `NSTextAlignment` précisément en iOS 6.0 (l'ancienne reste présente,
   dépréciée, ce qui la rend un piège silencieux : elle compile encore sans
   erreur). Comme la cible est exactement 6.0, le nom correct est
   `NSTextAlignmentCenter`. Piège classique en copiant un extrait
   pré-2012.

4. **L'iPhone 3GS n'est pas Retina.**
   Écran 320×480 à l'échelle 1×, en points comme en pixels physiques — le
   doublement d'échelle (points ≠ pixels) date de l'iPhone 4. Le contexte
   de tâche mentionnait « le 3GS est en Retina physique » : c'est inexact
   pour ce modèle précis, sans conséquence sur le code (les points logiques
   320×480 sont la bonne référence dans les deux cas), mais ça détermine
   quel fichier d'icône est réellement chargé — voir `Resources/README.md`.

5. **`UIButtonTypeCustom` n'a pas d'état désactivé visuel.**
   Rencontré en ajoutant les boutons molette. Un bouton système se grise seul
   quand `enabled = NO` ; un bouton *custom* portant une couleur de fond ne
   change que la couleur de son titre, et seulement si l'on a explicitement
   fourni un `titleColorForState:UIControlStateDisabled`. Le fond, lui, reste
   identique — le conditionnement des commandes serait donc invisible à
   l'écran. `DetailViewController` pose donc aussi un `alpha` explicite, en
   plus de `enabled`. Ce n'est pas de la cosmétique : sans ça, un bouton
   inactif ressemble à un bouton mort.

6. **Une rangée de trois commandes se calcule par soustraction.**
   Sans Auto Layout (point 2), la largeur du bouton OK est ce qui reste après
   les deux flèches et les gouttières. Cette soustraction peut devenir
   négative sur une largeur étroite, ce qu'un `UIView` accepte sans broncher
   en produisant un rectangle inversé. La largeur est donc bornée avant
   usage. Corollaire général du calcul manuel : toute dimension dérivée d'une
   soustraction a besoin d'un plancher.

---

## 2. Choix de code — décidés faute de visibilité sur le projet réel

Ces points ne sont pas imposés par iOS 6 : ce sont des décisions prises
parce que cette session n'a pas accès au projet `LunyUI` local (Makefile,
`AppDelegate`, `RootViewController` généré par le gabarit).

7. **`RootViewController` reste un `UIViewController`, pas un
   `UICollectionViewController`.**
   `UICollectionViewController` impose `-initWithCollectionViewLayout:`
   comme initialiseur désigné. Cette session ne voit pas comment
   `AppDelegate` instancie `RootViewController` aujourd'hui (probablement
   un simple `-init` ou `-initWithNibName:bundle:` hérité du gabarit) ; le
   transformer en `UICollectionViewController` aurait pu rompre cet appel
   sans que je puisse le vérifier. La `UICollectionView` est donc une
   sous-vue possédée manuellement, ce qui fonctionne avec n'importe quel
   appel d'instanciation existant. À réévaluer si vous préférez la forme
   `UICollectionViewController` — c'est un simple changement de classe
   mère une fois `AppDelegate` sous les yeux.

   **Tranché :** conservé tel quel. `AppDelegate` appelle bien `-init`, et
   rester un `UIViewController` évite au passage les pièges d'initialisation
   de `UICollectionViewController` (layout nil, `reloadData` déclenché avant
   l'enregistrement de la cellule) qui avaient fait planter au lancement
   l'implémentation concurrente.

8. **Emplacement des fichiers sources : racine du projet, pas de dossier
   `Classes/`.**
   Hypothèse tirée de la convention généralement documentée pour le
   gabarit Theos `application_modern`, **non vérifiée par une lecture
   directe** du gabarit réel (accès réseau de cette session trop limité
   pour récupérer le fichier `.nic.tar` exact et sa version). Un
   `grep _FILES Makefile` sur le projet réel confirme ou infirme en dix
   secondes.

   **Tranché :** hypothèse correcte. Les sources sont à la racine et la
   liste est intégrée au `Makefile`.

9. **Downcast explicite au lieu de generics légers.**
   `dequeueReusableCellWithReuseIdentifier:forIndexPath:` renvoie un
   `UICollectionViewCell *` générique ; le code caste explicitement vers
   `LunyLibraryCell *` plutôt que de s'appuyer sur des generics Objective-C
   légers, par prudence vis-à-vis du mélange de SDK/toolchain déjà signalé
   dans le contexte de la tâche (base 10.3 + `libobjc.A.tbd` du 9.3). Pas
   une exigence : une convention plus simple à auditer sans compilateur
   sous la main pour vérifier une syntaxe plus récente.

10. **Les métadonnées de la bibliothèque sont lues dans les packs, plus codées
   en dur.**
   `LunyLibraryItem` ouvre chaque pack au démarrage, lit `luny_pack_info()`,
   puis referme. Le titre affiché est donc celui du pack. La deuxième ligne de
   la tuile montre le **nombre de nœuds** et non plus une durée : le format de
   pack n'expose aucune durée (`luny_pack_view` n'a pas ce champ), et la durée
   précédente était inventée. Afficher une donnée réelle plutôt qu'un nombre
   plausible est un choix, pas une contrainte.

11. **Choix des quatre packs embarqués.**
   `two-branches` (2 options), `random` (3), `degraded` (4), `cycle` (1), pour
   couvrir des formes de graphe différentes plutôt que le même pack copié.

   À savoir avant d'exercer la molette : `degraded` a bien quatre options,
   mais deux sont mortes par construction (`null` et un uuid inconnu), donc la
   rotation s'y arrête sur `IGNORED_DANGLING_OPTION`. C'est ce que ce pack
   teste, pas un défaut. **`random` est le seul pack embarqué où la molette
   tourne réellement** : ses trois options sont valides et tous ses nœuds ont
   `controlSettings.wheel`.

12. **Répartition des événements par pointeur de fonction.**
   Les trois commandes passent par un `-applyEvent:label:` prenant un
   `luny_event_status (*)(luny_engine *)`. Les trois fonctions du moteur ont
   la même signature ; une méthode par bouton aurait triplé le même
   enchaînement émettre / réafficher / rapporter le statut.

---

## 3. Ce qui reste à vérifier localement

Rien ci-dessus ne remplace un vrai `make package install`. Voir la liste de
vérification dans `README.md`.
