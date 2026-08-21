# NOTES — contraintes iOS 6 découvertes, écran de bibliothèque

Même esprit que `luny-engine/NOTES.md` : séparer ce qui est une **contrainte
de la plateforme** (non négociable, vérifiable dans la documentation ou le
comportement d'iOS 6) de ce qui est un **choix de code** pris dans cette
session, faute d'un élément que je n'avais pas sous les yeux.

---

## 0. Ce que cette session n'a pas pu vérifier

**Contrainte d'environnement, pas d'iOS 6.** Cette session tourne dans un
bac à sable cloud : ni Theos, ni SDK iOS, ni accès SSH à l'appareil. Rien
ci-dessous n'a été compilé avec un vrai `clang` armv7, ni exécuté sur le
3GS. Le code est écrit à partir de la connaissance des API UIKit — pas
vérifié par un build. Voir `README.md` pour ce que ça change concrètement
pour l'intégration.

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

---

## 2. Choix de code — décidés faute de visibilité sur le projet réel

Ces points ne sont pas imposés par iOS 6 : ce sont des décisions prises
parce que cette session n'a pas accès au projet `LunyUI` local (Makefile,
`AppDelegate`, `RootViewController` généré par le gabarit).

5. **`RootViewController` reste un `UIViewController`, pas un
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

6. **Emplacement des fichiers sources : racine du projet, pas de dossier
   `Classes/`.**
   Hypothèse tirée de la convention généralement documentée pour le
   gabarit Theos `application_modern`, **non vérifiée par une lecture
   directe** du gabarit réel (accès réseau de cette session trop limité
   pour récupérer le fichier `.nic.tar` exact et sa version). Un
   `grep _FILES Makefile` sur le projet réel confirme ou infirme en dix
   secondes — voir `Makefile.snippet.mk`.

7. **Downcast explicite au lieu de generics légers.**
   `dequeueReusableCellWithReuseIdentifier:forIndexPath:` renvoie un
   `UICollectionViewCell *` générique ; le code caste explicitement vers
   `LunyLibraryCell *` plutôt que de s'appuyer sur des generics Objective-C
   légers, par prudence vis-à-vis du mélange de SDK/toolchain déjà signalé
   dans le contexte de la tâche (base 10.3 + `libobjc.A.tbd` du 9.3). Pas
   une exigence : une convention plus simple à auditer sans compilateur
   sous la main pour vérifier une syntaxe plus récente.

---

## 3. Ce qui reste à vérifier localement

Rien ci-dessus ne remplace un vrai `make package install`. Voir la liste de
vérification dans `README.md`.
