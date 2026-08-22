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

7. **`NSTimer` retient sa cible.**
   Rencontré en ajoutant le minuteur de lecture simulée. Un timer répétitif
   ordonnancé sur la boucle de run retient son `target` : tant qu'il n'est
   pas invalidé, le contrôleur n'est jamais libéré et le minuteur continue de
   battre après le retour à la bibliothèque — le moteur du pack quitté reste
   ouvert avec lui. `DetailViewController` invalide donc dans
   `-viewWillDisappear:` (cas du retour) **et** dans `-dealloc` (filet).
   Ce n'est pas propre à iOS 6, mais c'est une fuite silencieuse : rien ne la
   signale à l'exécution.

8. **La police du 3GS n'a presque aucun pictogramme.**
   Vérifié sur l'appareil par `CTFontGetGlyphsForCharacters` : Helvetica et
   Helvetica-Bold rendent `.notdef` pour la maison `U+2302`, la flèche
   circulaire `U+21BA`, la flèche retour `U+21A9`, la flèche gauche `U+2190`
   et la puce ronde `U+25CF`. Seul le Latin-1 est couvert, plus les
   guillemets simples `U+2039`/`U+203A` déjà utilisés pour la molette.

   Conséquence directe : toute commande a besoin d'un **libellé texte**, pas
   d'un symbole. Le bouton HOME s'appelle donc « Début ». Ne pas y remettre un
   pictogramme sans avoir refait cette mesure.

9. **`UIButtonTypeCustom` n'a aucun retour visuel au contact.**
   Complément du point 5, qui traitait l'état désactivé. L'état *highlighted*
   n'est pas davantage fourni : un bouton custom à `backgroundColor` ne change
   rien sous le doigt. Sans vibreur sur ce matériel, l'appui n'aurait donc
   aucun accusé de réception. Les boutons passent par
   `setBackgroundImage:forState:` avec un aplat 1×1 par état — mécanisme
   standard d'UIKit — au lieu de `backgroundColor`.

10. **iOS ne decode pas l'Ogg Vorbis.**
   Contrainte de plateforme, pas d'iOS 6 en particulier : aucune version d'iOS
   n'a de decodeur Vorbis. Or le format STUdio autorise `.ogg` et `.oga`, et
   le moteur les accepte (`ext_matches_kind`). Un pack converti en Ogg
   n'aura donc **aucun son** sur l'appareil tant qu'une conversion n'aura pas
   eu lieu en amont.

   C'est structurant pour la suite du projet, pas un detail d'implementation :
   la chaine de conversion des vrais packs devra produire du WAV, du MP3 ou de
   l'AAC. Formats verifies comme decodables : wav, mp3, m4a, aac, caf, aif.

---

## 2. Choix de code — décidés faute de visibilité sur le projet réel

Ces points ne sont pas imposés par iOS 6 : ce sont des décisions prises
parce que cette session n'a pas accès au projet `LunyUI` local (Makefile,
`AppDelegate`, `RootViewController` généré par le gabarit).

10. **`RootViewController` reste un `UIViewController`, pas un
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

11. **Emplacement des fichiers sources : racine du projet, pas de dossier
   `Classes/`.**
   Hypothèse tirée de la convention généralement documentée pour le
   gabarit Theos `application_modern`, **non vérifiée par une lecture
   directe** du gabarit réel (accès réseau de cette session trop limité
   pour récupérer le fichier `.nic.tar` exact et sa version). Un
   `grep _FILES Makefile` sur le projet réel confirme ou infirme en dix
   secondes.

   **Tranché :** hypothèse correcte. Les sources sont à la racine et la
   liste est intégrée au `Makefile`.

12. **Downcast explicite au lieu de generics légers.**
   `dequeueReusableCellWithReuseIdentifier:forIndexPath:` renvoie un
   `UICollectionViewCell *` générique ; le code caste explicitement vers
   `LunyLibraryCell *` plutôt que de s'appuyer sur des generics Objective-C
   légers, par prudence vis-à-vis du mélange de SDK/toolchain déjà signalé
   dans le contexte de la tâche (base 10.3 + `libobjc.A.tbd` du 9.3). Pas
   une exigence : une convention plus simple à auditer sans compilateur
   sous la main pour vérifier une syntaxe plus récente.

13. **Les métadonnées de la bibliothèque sont lues dans les packs, plus codées
   en dur.**
   `LunyLibraryItem` ouvre chaque pack au démarrage, lit `luny_pack_info()`,
   puis referme. Le titre affiché est donc celui du pack. La deuxième ligne de
   la tuile montre le **nombre de nœuds** et non plus une durée : le format de
   pack n'expose aucune durée (`luny_pack_view` n'a pas ce champ), et la durée
   précédente était inventée. Afficher une donnée réelle plutôt qu'un nombre
   plausible est un choix, pas une contrainte.

14. **Choix des quatre packs embarqués.**
   `two-branches` (2 options), `random` (3), `degraded` (4), `cycle` (1), pour
   couvrir des formes de graphe différentes plutôt que le même pack copié.

   À savoir avant d'exercer la molette : `degraded` a bien quatre options,
   mais deux sont mortes par construction (`null` et un uuid inconnu), donc la
   rotation s'y arrête sur `IGNORED_DANGLING_OPTION`. C'est ce que ce pack
   teste, pas un défaut. **`random` est le seul pack embarqué où la molette
   tourne réellement** : ses trois options sont valides et tous ses nœuds ont
   `controlSettings.wheel`.

15. **Répartition des événements par pointeur de fonction.**
   Les trois commandes passent par un `-applyEvent:label:` prenant un
   `luny_event_status (*)(luny_engine *)`. Les trois fonctions du moteur ont
   la même signature ; une méthode par bouton aurait triplé le même
   enchaînement émettre / réafficher / rapporter le statut.

16. **Le minuteur de lecture est un simulateur, pas le lecteur final.**
   Voir l'en-tête de `LunySimulatedAudio.h`, volontairement bavard. Rien
   n'est décodé : les durées sont **inventées**, dérivées par hachage FNV-1a
   du nom de fichier. Le hachage n'apporte qu'une garantie — la même piste a
   toujours la même durée d'un lancement à l'autre — et aucune véracité.
   Tout ce mécanisme disparaît avec `AVAudioPlayer`.

   La durée affichée sous chaque tuile de bibliothèque vient du même
   simulateur, appliqué au nom du pack. Ce n'est **pas** la somme des durées
   de ses pistes : le moteur n'expose pas la liste des nœuds, cette somme
   n'est donc pas calculable côté app.

17. **Fin d'histoire détectée via `IGNORED_NO_TRANSITION`.**
   `luny_stage_view` n'expose pas `okTransition`. L'app ne lit donc pas le
   champ : elle envoie `luny_audio_ended()` et lit le verdict du moteur.
   `LUNY_EVENT_IGNORED_NO_TRANSITION` signifie « pas de transition » et sert
   de signal de fin de branche → retour à la bibliothèque.

   **Réserve, non levée ici.** La doc d'interface (page Notion « Interface —
   décisions de maquette ») pose une exigence plus large : *une histoire
   terminée ne doit jamais enchaîner sur une autre*. Elle reconnaît un nœud
   d'histoire par le drapeau `pause`, en notant que rien dans le format ne le
   garantit et que la règle propre serait le champ `type`, optionnel et
   souvent absent.

   L'app n'implémente que le cas « aucune transition ». Un nœud qui aurait à
   la fois `pause = true` **et** un `okTransition` enchaînerait donc, là où la
   doc voudrait un retour. **Aucun nœud des quatre packs embarqués n'est dans
   ce cas** — vérifié un par un — la divergence est donc aujourd'hui
   inobservable. Elle deviendra réelle sur de vrais packs convertis : c'est
   à ce moment qu'il faudra trancher, comme la doc le prévoit déjà.

18. **Télémétrie derrière `LUNY_DEBUG`, à zéro par défaut.**
   uuid, noms d'événements et statuts bruts du moteur sont compilés hors du
   binaire (`LunyDebug.h`). `make LUNY_DEBUG=1` les rétablit dans un libellé
   sous les commandes. À noter : les chaînes littérales des noms d'événements
   restent présentes dans le binaire livré, parce qu'elles sont passées en
   argument à une méthode devenue vide. Elles ne sont **affichées** nulle
   part, ce qui est l'exigence ; elles ne sont pas pour autant effacées du
   fichier.

19. **Deux colonnes, conservées délibérément.**
   Sur 320pt, une troisième colonne ramènerait chaque couverture sous 90pt.
   L'espacement a été augmenté (marges 16pt, gouttières 14pt) plutôt que la
   densité.

20. **Retour en arrière : option A retenue — l'événement HOME du moteur.**

   `luny_home()` (nom vérifié dans `luny_engine.h`, non supposé) suit
   `homeTransition` si elle existe, et à défaut ramène au **nœud d'entrée** du
   pack en vidant le contexte ActionNode. C'est un « recommencer cette
   histoire », pas un « annuler mon dernier choix ».

   **Pourquoi A plutôt que B.** L'option B — une pile d'états côté UI —
   se heurte à un fait du moteur : il ne se recule pas. Afficher un état
   antérieur sans rejouer les événements désynchroniserait l'écran et le
   moteur, et le prochain OK partirait du nœud le plus avancé, pas de celui
   affiché. La rendre correcte imposerait de rejouer toute la séquence depuis
   l'entrée à chaque retour — coûteux, et faux dès qu'un pack tire au sort :
   `random` choisit son option d'entrée par RNG, un rejeu ne retomberait pas
   forcément sur le même nœud. A est déjà supporté, exact, et sans état
   dupliqué à maintenir.

   **Ce que A ne fait pas.** Il ne revient pas au nœud précédent. Un retour
   d'un seul cran reste à concevoir, et suppose soit un moteur capable de
   reculer, soit un rejeu déterministe — donc un RNG rejouable à graine
   mémorisée. Hors périmètre ici.

   Le bouton est distinct de la barre de navigation, volontairement : « Début »
   recommence l'histoire, le bouton retour la quitte. Il est en haut à droite
   de l'illustration pour ne pas se confondre avec le retour, en haut à
   gauche. Son conditionnement suit `controlSettings.home`, comme les autres
   commandes suivent le drapeau qui les concerne.

21. **La molette a été rapportée cassée : elle ne l'était pas.**
   Gardé en note parce que le constat est reproductible et reviendra.

   Vérifié à trois niveaux sur l'appareil : le moteur fait tourner l'index
   (1→0→2→0→1 sur `random`) ; le prédicat de conditionnement de l'app,
   rejoué tel quel en C, renvoie vrai après le premier « Choisir » ; et un
   harnais UIKit interrogeant la vraie vue confirme
   `enabled=1`, `alpha=1.00`, `hitTest` aboutissant au bouton et
   `wheelLeftTapped:` toujours câblé.

   **L'explication est ailleurs : au nœud d'entrée de *tous* les packs, il
   n'existe aucun contexte ActionNode**, donc la molette est correctement
   inactive — précisément là où on l'essaie en premier. Sur `random`, le
   nœud d'entrée a pourtant `wheel = true`, ce qui rend l'inactivité encore
   plus déroutante. Il faut appuyer une fois sur « Choisir » pour entrer dans
   la liste d'options et voir les chevrons s'activer.

   Ce n'est pas un défaut de code mais un défaut de lisibilité : rien à
   l'écran n'explique pourquoi les chevrons sont éteints. À traiter comme une
   question d'interface, pas de correction.

22. **Durée bloquée à 0:00 sur « Tirage » : le pack n'a aucune piste.**

   Rapporté comme un défaut du minuteur. Vérifié au CLI moteur sur
   l'appareil, contre le bundle installé :

   | pack | nœud | `image` | `audio` |
   |---|---|---|---|
   | two-branches | Couverture | cover.png | cover.ogg |
   | two-branches | Option A | option-a.png | option-a.ogg |
   | two-branches | Histoire A | — | story-a.ogg |
   | random | Entree | a.png | **—** |
   | random | Tirage 1/2/3 | — | **—** |

   `random` ne référence **aucun** fichier audio, sur aucun nœud. Le hachage
   ne défaille pas : il n'y a rien à hacher, et `durationForTrackNamed:`
   renvoie 0 pour un nom nul, ce qui est correct.

   **Correction de la cause, pas de l'affichage :** fabriquer une durée pour
   un nœud sans piste serait mentir sur la donnée. L'app distingue désormais
   « pas de piste » de « piste à zéro » — le libellé indique *pas de piste*,
   et la barre est grisée. Un `0:00 / 0:00` se lit comme un minuteur en
   panne ; l'absence de piste est un fait du pack, il faut le dire.

23. **Bouton central « invisible » sur les options de « Tirage » : bug réel,
    et il était de contraste.**

   Les trois nœuds d'option de `random` ont `ok = 0` **et** `pause = 0`
   (relevé au CLI). Le bouton devait donc s'afficher « Lire » et grisé — ce
   qui était le cas. Mais l'état désactivé passait par `alpha = 0.55`
   appliqué au **bouton entier**, ce qui fait fondre son fond *et* son titre
   vers la couleur du panneau : le contraste interne s'effondrait.

   Mesuré : **1,03:1** entre le libellé et son propre fond, soit un texte
   littéralement invisible. Le rapport « le bouton disparaît » était donc
   exact, et l'explication n'était ni le gating ni la logique.

   Corrigé en supprimant l'atténuation globale : l'état désactivé est
   maintenant une **image de fond désaturée** (accent fondu à 18 % dans le
   panneau) avec un titre en `textMuted`. Mesuré après correction sur
   l'appareil : **4,93:1**. Les flèches passent de 1,85:1 à **10,22:1** en
   actif et 5,89:1 en inactif.

   Règle à retenir : atténuer une vue entière préserve le contraste avec le
   fond de l'écran, jamais le contraste **interne** entre ses éléments.

24. **Bouton « Début » qui ramènerait à un nœud « A » : requalifié, pas un
    bug.**

   Vérifié au CLI sur les trois contextes de `random` — depuis la couverture,
   depuis l'option atteinte par OK, depuis une autre option après molette.
   HOME ramène **à chaque fois** à `s-entry`, nommé « Entree », qui est bien
   le nœud d'entrée déclaré par le pack (`entry=s-entry`).

   Aucun nœud nommé « A » n'existe dans `random`. Il en existe un dans
   **`cycle`**, dont c'est précisément le nœud d'entrée (`c-a`, nom « A »).
   L'observation a donc été faite sur « Cycle » et non sur « Tirage » — et
   HOME s'y comportait correctement.

25. **Barre de progression saisissable.**

   Zone tactile de 30pt pour un trait de 6, avec pastille de 17pt — reprise
   de la doc d'interface, qui note que viser 6 pixels au doigt est hors de
   portée d'un enfant sur 3,5 pouces à 163 ppp.

   Aucun `seek` audio réel n'est possible puisque rien ne joue : le geste
   repositionne le minuteur simulé et son affichage, ce qui est exactement ce
   que la barre représente. Le minuteur est suspendu pendant la saisie — sinon
   il continuerait d'avancer sous le doigt — et ne reprend au relâchement que
   s'il tournait avant, et si la position n'est pas déjà en fin de piste.

   Conditionnée par `controlSettings.pause` **et** la présence d'une piste,
   grisée sinon plutôt que silencieusement inerte.

26. **Deuxième palette : bois et crème, en option de compilation.**

   `make LUNY_THEME_LIGHT=1` bascule tout l'écran sur une palette chaude —
   fond crème, surfaces de bois clair, encre brune — sans toucher à la
   sombre. Les deux compilent, aucun appelant ne change : seuls les tokens de
   `LunyTheme` diffèrent.

   **Un point de conception mérite d'être noté**, parce qu'il n'est pas une
   simple inversion : dans la palette sombre les accents sont *clairs*
   (ambre #F0B357) ; dans la claire ils doivent être *profonds* (#7C4910).
   Un accent sert à deux choses — remplir un bouton et encrer un glyphe sur
   une couverture — et sur fond clair seule une teinte profonde tient les
   deux rôles : elle porte alors un libellé crème en remplissage, et se
   détache en encre sur la couverture.

   Les deux palettes ont été vérifiées sur **tous** les couples texte/fond de
   l'app (titres, durées, en-têtes, libellés de boutons actifs et désactivés,
   initiales sur couverture). Les deux passent, seuil 4,5:1 pour le texte
   courant et 3:1 pour le grand. Toute retouche de valeur doit refaire cette
   vérification : un token n'est pas une préférence isolée, il vit dans une
   paire.

27. **Nature exacte des assets de test — information structurante.**

   Inventaire etabli en inspectant les octets, pas en supposant :

   | pack | images | audio |
   |---|---|---|
   | two-branches | 3 fichiers, **0 octet** | 5 fichiers `.ogg`, **0 octet** |
   | random | 1 fichier, **0 octet** | aucun (`audio` nul partout) |
   | degraded | 1 fichier, 0 octet ; 2 references absentes | reference `absent.mp3`, inexistant |
   | cycle | aucun | aucun |
   | **audio-demo** | 2 PNG generes | **2 WAV PCM reels** |

   **Toutes les fixtures du moteur sont des place-tenus vides.** Elles
   suffisent au moteur, qui ne verifie que presence et extension sans jamais
   ouvrir le contenu — mais rien ne s'affiche ni ne s'entend a partir d'elles.
   Les images ont ete remplacees par des couvertures generees ; l'audio ne
   pouvait pas l'etre de la meme facon, l'Ogg n'etant ni encodable ici ni
   decodable par iOS.

   D'ou `audio-demo` : un cinquieme pack, **ecrit pour cette app et non repris
   d'une fixture**, avec deux vraies pistes WAV PCM 16 bits mono 22050 Hz
   generees par `Tools/make_demo_audio.py` (module `wave` de la bibliotheque
   standard, aucune dependance). C'est le seul pack embarque dont la lecture
   est reelle ; les quatre autres exercent le repli.

28. **`LunyAudioTrack` : une interface, deux mecanismes.**
   L'ecran ne sait pas si la piste est reelle ou simulee. La classe tranche au
   chargement — extension decodable **et** fichier ouvrable par AVAudioPlayer,
   sinon repli — et expose la meme interface dans les deux cas : `duration`,
   `position`, `play`, `pause`, `seekToPosition:`, plus deux rappels de
   delegue.

   La fin de piste vient du decodeur en reel
   (`audioPlayerDidFinishPlaying:successfully:`) et du minuteur en simule ;
   les deux aboutissent au meme rappel, et c'est lui qui emet
   `luny_audio_ended()`. La barre saisissable pilote la position reelle quand
   un vrai fichier joue, `AVAudioPlayer.currentTime` acceptant l'ecriture a
   l'arret comme en lecture.

   **Le repli est affiche, jamais silencieux :** le bloc temps porte la
   mention « (simulé) ». Une duree fabriquee ne doit pas se faire passer pour
   une lecture.

   Verifie sur le 3GS : `intro.wav` donne `isSimulated=NON` et une duree de
   3,55 s lue par le decodeur, la position avance en temps reel, et la fin
   declenche bien le rappel. `cover.ogg` (0 octet) bascule en simule avec une
   duree hachee, sans plantage.

29. **Troisieme palette : pastel turquoise et jaune.**

   Deux valeurs de depart ont du etre approfondies, mesures a l'appui :

   | token | depart | retenu | raison |
   |---|---|---|---|
   | teal primaire | `#2A8C82` | `#1F6F67` | 4,06:1 avec du blanc, sous le seuil ; 5,95:1 apres |
   | bouton lecture | `#E8A93C` | `#9C6B12` | le jaune ne tient que 2,06:1 avec du blanc |

   Le jaune `#E8A93C` est conserve **tel quel**, mais uniquement en aplat de
   couverture — ce que la consigne prevoyait deja (« pas necessairement en
   texte »).

   **Ce constat a impose une separation architecturale** : `accentAtIndex:`
   ne renvoie plus les accents de bouton mais un jeu **decoratif** propre aux
   couvertures. Les deux roles n'ont pas les memes obligations : un aplat
   porte une initiale, un bouton porte un libelle. Sans cette separation, le
   jaune se serait retrouve en fond du bouton lecture/pause.

   Deuxieme consequence : sur une palette claire, un accent pastel n'a pas 3:1
   avec son propre aplat. L'initiale y est donc encree en `textBright`
   (ardoise) et non avec l'accent, via le nouveau `coverInkForAccent:`. Les
   palettes sombres gardent l'accent comme encre.

### Ratios mesures, les trois palettes

Tous les couples texte/fond reellement utilises a l'ecran. Seuils : 4,5:1
texte courant, 3:1 grand texte.

| couple | sombre | claire | pastel |
|---|---|---|---|
| titre de tuile | 14,53 | 11,44 | 14,36 |
| duree de tuile | 6,62 | 6,09 | 6,33 |
| en-tete | 15,96 | 13,35 | 13,07 |
| sous-titre (3:1) | 4,56 | 4,56 | 4,08 |
| temps | 6,41 | 6,41 | 6,18 |
| bouton principal actif | 8,99 | 4,57 | 5,95 |
| bouton lecture actif | 8,99 | 6,51 | 4,64 |
| bouton desactive | 4,93 | 5,21 | 5,01 |
| fleche active | 10,22 | 7,65 | 9,48 |
| fleche desactivee | 5,89 | 5,31 | 5,23 |
| initiales sur couverture (3:1) | 6,19 – 7,88 | 3,38 – 3,65 | 8,15 – 10,61 |

30. **Piste longue de test, et un bug d'`AVAudioPlayer` qu'elle a revele.**

   `audio-demo` porte une troisieme piste, `longue.wav`, **3 min 13 s**
   (193,19 s), destinee a eprouver la barre sur une vraie plage. Elle est
   generee a **11025 Hz** et non 22050 : trois minutes a 22050 pesent 7,6 Mo,
   le plus gros fichier du depot de loin. Pour une sequence de tons purs la
   bande passante n'apporte rien.

   Le nouveau noeud a impose **une modification d'un noeud existant**, ce qui
   ne pouvait pas etre evite : ajouter un StageNode ne le rend pas
   atteignable. Il est devenu la seconde option de l'ActionNode existant, et
   `controlSettings.wheel` est passe a vrai sur « Comptine » pour pouvoir y
   tourner. Aucun autre champ n'a bouge, et les deux pistes courtes sont
   inchangees bit a bit.

   **Bug trouve en testant le glissement sur toute la plage** : ecrire
   `currentTime = duration` sur un `AVAudioPlayer` ne place pas la tete en fin
   de piste, il la remet **a zero**. Mesure sur l'appareil, la pastille
   glissee a fond renvoyait 0,00 s au lieu de 193,19 s — la piste serait
   repartie du debut. `seekToPosition:` retire donc 50 ms au bout droit en
   lecture reelle. Apres correction, mesure : 0 %, 25 %, 50 %, 75 % exacts, et
   100 % a 193,14 s.

   La branche simulee n'a pas ce defaut et n'est pas concernee.

### Ce que le moteur ne peut pas verifier

`luny_pack_info()` **n'expose aucune duree** — le mot n'apparait nulle part
dans `luny_engine.h`. Le moteur ne lit jamais le contenu d'un asset, il en
verifie la presence et l'extension. Une duree ne peut donc pas etre confrontee
au moteur.

Ce qui a ete verifie a la place, et qui couvre la meme intention :

| verification | resultat |
|---|---|
| le moteur resout `longue.wav` | oui, noeud `ad-long` a l'index 1/2 |
| duree dans l'en-tete WAV | 193,19 s, 11025 Hz, 16 bits mono |
| duree rendue par `AVAudioPlayer` sur le 3GS | **193,19 s**, identique |
| categorie de session sur le 3GS | `AVAudioSessionCategoryPlayback` |

La categorie `playback` est le mecanisme qui fait sortir le son malgre
l'interrupteur silencieux ; elle est confirmee active sur l'appareil. Le
comportement audible, lui, reste a confirmer a l'oreille.

31. **Lecture en arriere-plan : `UIBackgroundModes` manquait.**

   Cause constatee : la cle etait absente de `Info.plist`, verifie sur le
   bundle installe (`grep UIBackgroundModes` -> 0 occurrence). Sans elle iOS
   suspend l'app des qu'elle passe en fond, quelle que soit la categorie de
   session. `audio` a ete ajoute, et la session etait deja passee en
   `playback` des `didFinishLaunchingWithOptions:` — pas seulement a la
   premiere lecture — ce qui est le second prerequis.

   **Ce que je n'ai pas pu tester moi-meme, et pourquoi.** Les trois
   declencheurs — Home, veille automatique, bouton Power — demandent une
   pression physique. Aucun outil d'automatisation SpringBoard n'est installe
   sur cet appareil (`activator`, `sbutil`, `notifyutil` : tous absents,
   verifie), et surtout **le Wi-Fi tombe pendant la veille sur ce 3GS** : le
   SSH devient injoignable au moment precis ou il faudrait observer. Je ne
   peux donc ni declencher ni observer ces trois cas.

   Ce qui est verifie : la cle est presente dans le bundle installe, et la
   categorie de session est `AVAudioSessionCategoryPlayback` sur l'appareil.

   **Pour obtenir la preuve malgre le sommeil**, une trace de lecture
   horodatee a ete ajoutee sous `LUNY_DEBUG`, ecrite dans
   `/tmp/LunyUI-playback.txt` a chaque battement. Elle survit a la veille et
   se relit au reveil :

       make LUNY_DEBUG=1 package install
       # lancer "Berceuse" -> "Longue" (3 min 13 s), puis :
       #   cas 1 : appui sur Home, attendre 30 s
       #   cas 2 : laisser l'ecran s'eteindre seul, attendre 30 s
       #   cas 3 : appui sur Power, attendre 30 s
       # rallumer, puis :
       cat /tmp/LunyUI-playback.txt

   Si les horodatages continuent pendant la periode ecran eteint, la lecture
   a continue. **Les trois cas sont a traiter separement** : rien ne garantit
   qu'ils se comportent pareil, un Power explicite pouvant differer d'une
   veille automatique. Ne pas conclure des trois a partir d'un seul.

32. **`idleTimerDisabled` : ecarte, et pourquoi.**

   Question posee : faut-il rallumer l'ecran en fin d'histoire ou a un choix ?

   La reponse est non, pour une raison qui rend le debat sans objet :
   **aucune API publique d'iOS ne permet a une app d'allumer l'ecran**.
   `idleTimerDisabled` ne reveille rien, il *empeche* seulement l'extinction.
   Le seul moyen d'avoir l'ecran allume a un choix serait donc de ne jamais
   le laisser s'eteindre de toute l'histoire — precisement l'option couteuse
   en batterie, et pour un usage en voyage c'est le pire compromis possible.

   Par ailleurs, une fois l'arriere-plan audio correctement configure, l'ecran
   n'a aucun besoin d'etre allume pour que le son continue. Le besoin reel
   n'est pas « rallumer l'ecran » mais « signaler qu'une decision attend », et
   le mecanisme natif pour cela est une notification locale
   (`UILocalNotification`, iOS 4+), qui sonne et s'affiche sur l'ecran
   verrouille sans maintenir l'affichage.

   Decision : `idleTimerDisabled` reste a sa valeur par defaut. La
   notification locale est notee en prochaine etape, hors perimetre ici.

33. **Suppression d'un pack : le bundle est en lecture seule, par le systeme.**

   La consigne visait `/Applications/LunyUI.app/packs/<nom>/`. C'est
   impossible, et ce n'est pas une politique de l'app : mesure sur
   l'appareil, `/Applications/LunyUI.app` appartient a `root:wheel` en `755`,
   l'app tourne en `mobile`, et un `rm` y echoue en **Permission denied**.

   Cela reglait du meme coup la protection du banc d'essai evoquee dans la
   consigne : les cinq packs livres sont indeletables **par construction**, ce
   qui est plus solide que n'importe quel drapeau que j'aurais pu ajouter.

   La bibliotheque lit donc desormais **deux sources** : le bundle (lecture
   seule) et `Documents/packs/` (inscriptible). Seules les entrees de la
   seconde portent `deletable = YES`. C'est aussi la ou l'import ZIP deposera
   ses packs le jour venu, donc la fonction n'est pas un decor : elle est
   prete pour le seul cas ou elle aura un sens.

   Un appui long sur une tuile du bundle ouvre une alerte qui **explique**
   pourquoi la suppression est refusee, plutot que de proposer une action
   vouee a echouer.

   API : `UIAlertView`, verifie dans le SDK — `UIAlertController` est
   `NS_CLASS_AVAILABLE_IOS(8_0)`, donc inexistant sur cible 6.0.
   `UIAlertView` y est marquee depreciee (depuis iOS 9), ce que `-Werror`
   transforme en erreur : l'avertissement est tu localement par un
   `#pragma clang diagnostic`, sans baisser `-Werror` pour tout le projet.

   Verifie sur l'appareil, avec un pack temporaire depose dans Documents :
   bibliotheque a 6 entrees dont une supprimable ; refus sur un pack du
   bundle avec message clair et pack toujours present ; suppression reelle du
   pack Documents ; relecture a 5 entrees. Le pack temporaire a ete efface
   par le test lui-meme.

   **Non verifie** : le geste d'appui long et l'apparition de l'alerte
   demandent un doigt.

---

## 3. Ce qui reste à vérifier localement

Rien ci-dessus ne remplace un vrai `make package install`. Voir la liste de
vérification dans `README.md`.

---

## 4. À confirmer à l'œil — aucune session ne voit l'écran

Le paquet est compilé, installé sur le 3GS et ne produit aucun rapport de
plantage. Le rendu, lui, n'est vérifié par personne. Points introduits par
cette passe, à regarder un par un :

**Bouton central contextuel**
- Sur la couverture de `two-branches` (`ok` actif) : libellé **« Choisir »**,
  fond **ambre**.
- Après deux « Choisir », sur un nœud d'histoire (`ok` inactif, `pause` actif) :
  libellé **« Lire »** ou **« Pause »**, fond **vert sauge**. Le libellé doit
  basculer à chaque appui.
- Sur `random`, nœuds `s-1`/`s-3` : le bouton doit apparaître **grisé**.
  C'est correct, pas un défaut — ce pack n'a aucun audio et `pause` y est
  faux, donc il n'y a rien à lire.

**Minuteur simulé**
- La barre sous l'image se remplit en ambre, de gauche à droite, et le
  libellé passe de `0:00 / 0:31` à `0:31 / 0:31` sur la couverture de
  `two-branches`.
- Le remplissage doit s'arrêter net à droite, sans déborder du rail.

**Retour automatique en fin d'histoire**
- Sur `two-branches`, enchaîner « Choisir » deux fois puis laisser la piste
  aller au bout (~44 s) : l'app doit **revenir seule à « Mes histoires »**.
- Sur `cycle`, en fin de piste l'app doit au contraire **rester** et passer au
  nœud suivant.

**Points de pagination**
- Visibles seulement dans un menu. Sur `random` après « Choisir » : **trois
  points**, celui de l'option courante en ambre, les autres en gris sourd.
- Ils doivent disparaître sur un nœud hors menu.

**Flèches molette**
- Zone tactile large (58pt) au fond légèrement plus clair que le panneau.
- Désactivées, elles doivent rester **visibles** : seul le chevron s'éteint,
  le fond reste. Si elles disparaissent, le réglage est à revoir.

**Tuiles de bibliothèque redessinées**
- Couverture carrée à coins arrondis, initiale en grand, une couleur d'accent
  différente par tuile.
- Titre lisible, durée en dessous en bleu-gris sourd.
- En-tête « Mes histoires » nettement plus grand, avec « 4 histoires · hors
  ligne » en dessous.
- Deux colonnes, marges franches — l'écran doit respirer, pas être rempli.

**Bouton « Début » (HOME du graphe)**
- Présent en haut à **droite** de l'illustration, pastille sombre translucide.
- Sur `two-branches`, il doit être **grisé sur la couverture** (`home` y est
  faux) et **actif** dès « Option A ».
- Un appui doit ramener à la **couverture** de l'histoire — pas à la
  bibliothèque, c'est le rôle du bouton retour de la barre.

**Retour au contact (highlighted)**
- Tout bouton — « Début », chevrons, bouton central — doit **s'assombrir sous
  le doigt** et reprendre sa teinte au relâchement. C'est le seul accusé de
  réception possible : ce matériel n'a pas de vibreur.

**Fondu entre deux nœuds**
- Sur `two-branches`, appuyer sur « Choisir » : l'illustration doit passer de
  l'ancienne à la nouvelle en **fondu court** (~0,2 s), pas d'un coup sec.
- Un appui **ignoré** par le moteur ne doit produire **aucun** fondu — sinon
  l'écran laisserait croire qu'il s'est passé quelque chose.

**Barre de progression saisissable**
- Sur `two-branches`, glisser la pastille : le temps de gauche doit suivre le
  doigt en direct et le remplissage ambre s'ajuster.
- Au relâchement, si la piste avançait, elle doit **reprendre depuis la
  nouvelle position**, pas depuis l'ancienne.
- Sur `random`, la barre doit être **grisée et sans pastille** — ce pack n'a
  aucune piste.

**Libellé de durée sans piste**
- Sur `random`, le bloc temps doit afficher **« pas de piste »**, pas
  « 0:00 / 0:00 ».
- Sur `two-branches`, il doit afficher une vraie durée simulée (0:31 sur la
  couverture, 0:41 sur Option A).

**Bouton central désactivé — le point qui avait été rapporté**
- Sur les options de `random`, le bouton doit afficher **« Lire » lisible**
  sur un fond vert désaturé, clairement inactif mais jamais effacé.
- S'il redevient illisible, c'est qu'une atténuation globale a été
  réintroduite : voir §2.23.

**Palette claire (si compilée avec `LUNY_THEME_LIGHT=1`)**
- Fond crème, tuiles bois clair, texte brun foncé.
- Les mêmes vérifications que ci-dessus s'appliquent : aucun libellé ne doit
  perdre en lisibilité par rapport à la palette sombre.

**Lecture audio réelle (pack « Berceuse »)**
- À l'ouverture, une mélodie doit **réellement se faire entendre** (~3,5 s),
  et la barre avancer en même temps que le son.
- Le bloc temps affiche `0:00 / 0:03` **sans** la mention « (simulé) ».
- Sur les quatre autres packs, la mention « (simulé) » doit être visible —
  leurs `.ogg` font 0 octet et iOS ne décode pas l'Ogg de toute façon.
- Appuyer « Choisir » puis laisser « Comptine » aller au bout (~5 s) : le son
  s'arrête de lui-même et l'app **revient à la bibliothèque**.
- Régler l'interrupteur silencieux de l'appareil : le son doit continuer
  (catégorie `playback`).

**Piste longue (« Berceuse » → Choisir → chevron droit → « Longue »)**
- Durée affichée **3:13**, sans mention « (simulé) ».
- Glisser la pastille d'un bout à l'autre : le temps suit sur toute la plage,
  et **relâcher tout à droite ne doit pas faire repartir du début** — c'était
  le bug corrigé, il vaut la peine d'être revérifié à l'usage.
- **Basculer l'interrupteur silencieux pendant la lecture : le son doit
  continuer.** C'est le seul point que je ne peux pas vérifier autrement que
  par la catégorie de session, confirmée `playback` sur l'appareil.

**Palette pastel (si compilée avec `LUNY_THEME_PASTEL=1`)**
- Fond turquoise très clair, tuiles crème, encre ardoise.
- Les couvertures sont des aplats pastel avec l'initiale **en ardoise foncée**,
  pas dans la couleur de l'accent — c'est voulu, voir §2.29.
- Le bouton principal est teal profond, le bouton lecture or profond : aucun
  des deux ne doit être jaune vif, le jaune est réservé aux couvertures.

**Lecture en arrière-plan — les trois cas, séparément**
- Lancer « Berceuse » → chevron droit → « Longue » (3 min 13 s), puis :
  1. appui sur **Home** — le son doit continuer ;
  2. laisser l'écran **s'éteindre seul** — le son doit continuer ;
  3. appui sur **Power** — le son doit continuer.
- Ne pas conclure des trois à partir d'un seul : ils peuvent différer.
- Preuve écrite disponible avec un build `LUNY_DEBUG=1` : voir §2.31.

**Suppression d'un pack**
- Appui long sur une tuile du bundle : alerte expliquant que le pack est
  intégré, un seul bouton « Fermer », aucune suppression.
- Aucune tuile ne doit disparaître par erreur : les cinq packs livrés sont
  indeletables par permission système, pas seulement par convention.
- Un appui long ne doit pas ouvrir l'histoire au relâchement.

**Absence de télémétrie**
- Aucun uuid, aucun `wheel_left -> ACCEPTED`, aucun `option 2/3` nulle part.
  S'il en reste un, le paquet a été construit avec `LUNY_DEBUG=1`.

---

## 5. Hors périmètre de cette passe — prochaines étapes

Volontairement non commencés, pour ne pas laisser de moitiés en place :

- **Conversion des vrais packs** OGG→MP3/WAV et BMP→PNG, côté PC. C'est le
  verrou qui reste : iOS ne décodera jamais l'Ogg (§1.10), donc tant que la
  conversion n'existe pas, un pack STUdio réel restera muet dans l'app.
  `LunySimulatedAudio` ne disparaîtra qu'une fois cette chaîne en place.
- **Import ZIP de packs externes** : le moteur ne lit qu'un répertoire déjà
  extrait (`luny_engine.h`).
- **Événement HOME du graphe narratif** (`luny_home()`), distinct du retour de
  navigation actuel, qui est une simple dépile de `UINavigationController`.
- **Notification locale** à un point de choix ou en fin d'histoire, seul
  mécanisme natif pour signaler quelque chose écran éteint (§2.32).
- **Sélecteur de thème à l'exécution** : les trois palettes ne se choisissent
  aujourd'hui qu'à la compilation, ce qui suffit pour comparer.
- **Volume et réglages parentaux** — la maquette prévoit « Enchaîner les
  histoires » et « Autoplay dans les séquences » ; leur absence est la raison
  pour laquelle la règle de fin d'histoire reste partielle (§2.17).
- **Barre de progression saisissable** : la doc d'interface décrit une zone
  tactile de 30pt avec pastille déplaçable. La zone de 30pt est en place, la
  saisie ne l'est pas — la barre est aujourd'hui en lecture seule.
