# Maquette d'interface — Luny sur iPhone 3GS

`luny_maquette_v3.html` — page autonome, à ouvrir directement dans un navigateur.
Écran à sa taille réelle : **320 × 480**.

---

## Périmètre

**Maquette visuelle et fonctionnelle. Ce n'est pas une implémentation de référence.**

Elle rejoue en JavaScript la sémantique du moteur C pour qu'on puisse manipuler l'interface avant
qu'un vrai pack existe, avec une bibliothèque de quatre packs fictifs et des illustrations SVG
générées. Elle ne lit aucun `story.json`, ne décode aucun média, et son moteur JavaScript est une
**réplique**, pas la source de vérité.

En cas de désaccord entre cette maquette et `luny-engine/`, **c'est le moteur C qui fait foi**, et
`luny-engine/NOTES.md` qui documente la provenance de chaque règle.

Divergence connue à ce jour : sur un ActionNode sans aucune option, la maquette renvoie
`IGNORED_UNRESOLVED_TARGET` là où le moteur C distingue `IGNORED_EMPTY_OPTIONS`. Sans conséquence
sur l'affichage, mais à ne pas recopier telle quelle.

Seule dépendance externe : les polices Google (Outfit, JetBrains Mono). Sans réseau, la page reste
parfaitement lisible — les piles de repli CSS prennent le relais.

---

## La frontière moteur / lecteur

C'est le point que cette maquette existe pour rendre visible.

### Ce qui vient du pack

Les **cinq drapeaux `controlSettings`** — `wheel`, `ok`, `home`, `pause`, `autoplay` — sont écrits
dans `story.json` par l'auteur du pack. Ils conditionnent réellement l'acceptation des entrées : un
bouton désactivé ne produit aucun effet. Le moteur ne connaît que cinq événements :

```
ok · home · wheel_left · wheel_right · audio_ended
```

### Ce qui est un ajout Luny

**La pause et la navigation dans la piste n'existent ni dans le format STUdio ni sur une Lunii.**
Ce sont des commandes de **lecteur**, gérées au-dessus du moteur, qui ne les connaît pas et n'a pas
à les connaître : il ne manipule qu'un graphe de nœuds.

Le drapeau `pause` du pack ne crée pas la fonction — il décide seulement si l'enfant a le droit de
s'en servir. Autrement dit : le pack accorde une permission, le lecteur fournit la mécanique.

Dans le panneau latéral, l'étiquette `navigation — Luny` est tracée en pointillés pour distinguer
cet ajout des cinq drapeaux issus du pack.

---

## Le bouton central est contextuel

Un seul bouton, deux métiers, **sans aucun réglage** — ce sont les drapeaux du pack qui décident :

| Condition | Rôle | Aspect |
|---|---|---|
| `ok` actif | **valider** le choix courant | ambre, « Choisir » |
| `ok` inactif | **lecture / pause** | vert, « Lire » / « Pause » |

C'est exactement le cas sur un nœud d'histoire, où le pack met `ok: false` et `pause: true` : le
bouton de validation n'aurait rien à valider, il devient donc la commande de lecture.

---

## Règle de non-enchaînement

**Une histoire terminée ramène à la bibliothèque.** La bibliothèque est l'écran d'accueil, et le
comportement par défaut est de ne jamais enchaîner sur une autre histoire sans une action délibérée.
Un réglage parent « Enchaîner les histoires », décoché par défaut, permet de lever la règle.

### Réserve à lever — heuristique fragile

Pour reconnaître un nœud d'histoire, la maquette s'appuie aujourd'hui sur le **drapeau `pause`** :

```js
if (!chain && n.controlSettings.pause) { toLibrary("enchaînement bloqué → bibliothèque"); }
```

**Le format ne garantit rien de tel.** Rien n'empêche un pack d'activer `pause` sur un nœud qui
n'est pas une histoire, ni de l'omettre sur un nœud qui en est une. L'heuristique marche sur les
packs fictifs de cette maquette parce qu'ils ont été écrits ainsi.

La règle propre serait le champ **`type`** (`story`, `story.storyaction`, `menu.optionstage`…),
qui existe bien dans le format — mais il est **optionnel et souvent absent**, car c'est une
métadonnée enrichie de l'éditeur, pas une donnée que le firmware consomme.

**À trancher après conversion de vrais packs**, quand on saura à quelle fréquence `type` est
réellement présent dans les paquets du commerce. Les deux options restent ouvertes :

- se fier à `type` quand il est là, et se rabattre sur une autre heuristique sinon ;
- enrichir les packs à la conversion, sur le PC, pour que l'appareil n'ait plus à deviner.

Tant que ce n'est pas tranché, **ne pas traiter le test sur `pause` comme une règle acquise**.

---

## Contrainte tactile — à ne pas « simplifier »

**La barre de navigation fait 30 pixels de haut pour un trait visible de 6.**

Ce n'est pas un oubli de mise en forme, c'est la contrainte principale de l'écran :

```css
.track { height: 30px; }        /* surface sensible */
.track .rail { height: 6px; }   /* trait visible    */
```

Sur 3,5 pouces à 163 ppp, viser un trait de 6 pixels au doigt est hors de portée d'un enfant. La
surface sensible est donc **cinq fois plus haute** que le trait, sans que rien ne le laisse voir.

**Lors d'une refonte, ne pas aligner la hauteur de la zone sur celle du trait.** C'est la
« simplification » qui rendrait la barre inutilisable pour sa cible, et elle ne se verra sur aucune
capture d'écran — seulement à l'usage, sur l'appareil.

Le curseur mesure 17 px et grossit de 22 % pendant le glissement. Les flèches gauche et droite du
clavier déplacent de dix secondes, ce qui rend la barre utilisable sans pointage fin.

---

## Ce qui a été vérifié

Parcours automatisé dans Chromium avant intégration :

| Vérification | Résultat |
|---|---|
| Molette circulaire | 3 crans à droite sur 3 options reviennent au point de départ |
| `optionIndex: -1` | tire une option au hasard (pack « La nuit du renard », nœud grotte) |
| Cible non résolue | pack « Le chemin perdu » : `actionNode` absent → `IGNORED_UNRESOLVED_TARGET`, nœud courant inchangé |
| Bouton contextuel | « Choisir » sur la couverture, « Pause » sur le nœud d'histoire |
| Hauteur de la zone tactile | 30 px mesurés dans le navigateur |
| Erreurs JavaScript | aucune |

La seule erreur console observée est l'échec de chargement des polices Google en environnement
hors ligne, sans effet sur le rendu.

---

## Note sur le nom du fichier

Le fichier s'appelle `luny_maquette_v3.html`, mais son `<title>` et son bandeau annoncent « v2 ».
Le contenu a été intégré **tel quel, sans retouche** ; l'écart de numérotation est signalé ici pour
qu'il ne passe pas pour un oubli.
