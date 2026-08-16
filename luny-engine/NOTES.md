# NOTES — provenance des règles implémentées

Ce document sépare strictement **ce qui vient du code de STUdio** de **ce que j'ai dû décider**.

- Dépôt de référence : `marian-m12l/studio`, commit `aaf1e81f5af2440c828d27bcf0bd6592f434e7f5`.
- Chemins Java : `core/src/main/java/studio/core/v1/…`
- Chemins JavaScript : `web-ui/javascript/src/…`

> Règle de lecture : tout ce qui figure au §2 et au §3 est **un choix Luny**, pas une contrainte
> du format. Aucune règle du §1 n'est inventée ; chacune porte son fichier et ses lignes.

---

## 1. Règles tirées du code

### 1.1 Sémantique d'exécution (viewer JavaScript)

| Règle implémentée | Source |
|---|---|
| `optionIndex == -1` désigne le port « option aléatoire » | `utils/writer.js:331` (écrit `-1` pour `randomOptionIn`) et `utils/reader.js:382-384` (relit `-1` vers `randomOptionIn`) |
| L'option aléatoire tire un index uniformément parmi les options | `components/diagram/models/ActionNodeModel.js:62` — `Math.floor(Math.random() * this.optionsOut.length)` |
| Suivre une transition = entrer dans l'ActionNode, fixer l'index, afficher `options[index]` | `ActionNodeModel.js:61-77` |
| Molette gauche : décrément circulaire (`0` → dernier) | `ActionNodeModel.js:80` — `index === 0 ? (len - 1) : (index - 1)` |
| Molette droite : incrément modulo | `ActionNodeModel.js:98` — `(index + 1) % len` |
| La molette n'agit que si un contexte ActionNode existe | `components/viewer/EditorPackViewer.js:55` et `:68` — `if (this.props.viewer.action.node)` |
| Les cinq drapeaux conditionnent l'acceptation de l'entrée | `components/viewer/PackViewer.js:23` (wheel), `:30` (wheel), `:37` (home), `:44` (pause), `:58-68` (ok) |
| Fin d'audio → même action qu'OK, si `autoplay` | `PackViewer.js:73-78` — `audioEnded` appelle `okClicked` |
| **Autoplay n'exige pas `controlSettings.ok`** | `PackViewer.js:75` appelle directement le gestionnaire OK, sans repasser par le garde `ok` de `:58-68` |
| HOME sans transition → retour au point d'entrée, contexte ActionNode vidé | `StageNodeModel.js:172-183` — renvoie `mainNode` avec `{node: null, index: null}` |
| Le point d'entrée est le **premier** nœud `squareOne` | `PackDiagramModel.js:26-29` — `filter(...)[0]` |
| Une cible non résolue laisse l'état **inchangé** (pas d'avance d'index) | `ActionNodeModel.js:63-66`, `:82-84`, `:100-102` renvoient `[]` ; `EditorPackViewer.js:57-62` et `:82-91` ne mettent alors à jour ni l'étape ni l'index |

### 1.2 Structure et robustesse (reader Java)

| Règle implémentée | Source |
|---|---|
| `version` requis — son absence casse la lecture | `ArchiveStoryPackReader.java:111` — `root.get("version").getAsShort()`, NPE si absent |
| `controlSettings` requis sur chaque StageNode | `ArchiveStoryPackReader.java:150`, `:161-167` — déréférencement sans test |
| Résolution en deux passes (cycles et références avant autorisés) | `ArchiveStoryPackReader.java:125-133` puis `:192-203` |
| Extensions d'assets reconnues, comparaison en minuscules | `ArchiveStoryPackReader.java:216`, `:222-245` — `.bmp .png .jpg .jpeg` / `.wav .mp3 .ogg .oga` |
| Extension inconnue → asset ignoré silencieusement | `ArchiveStoryPackReader.java:243-245` (`// Unsupported asset`) |
| Un nom d'asset sans point casse le reader Java | `ArchiveStoryPackReader.java:215-216` — `substring(lastIndexOf("."))` avec `-1` |
| Asset référencé mais absent → champ à `null`, sans erreur | `ArchiveStoryPackReader.java:219-220` — la liste de nœuds référençant est simplement vide |
| Un `null` littéral peut apparaître dans `options[]` | `utils/writer.js:32-37` — une sortie d'option non connectée est sérialisée en `null` |
| Un uuid d'option inconnu donne une entrée non résolue | `ArchiveStoryPackReader.java:200` — `stageNodes.get(uuid)` renvoie `null` |
| Un `actionNode` inconnu donne une transition inopérante | `ArchiveStoryPackReader.java:142-143` — `actionNodes.get(...)` renvoie `null` |
| Aucune borne n'est vérifiée sur `optionIndex` | absence de contrôle en `ArchiveStoryPackReader.java:143`, `:148` et dans les writers |
| L'encodage de `story.json` n'est pas spécifié | `ArchiveStoryPackReader.java:47`, `:108` et `ArchiveStoryPackWriter.java:42` — `InputStreamReader`/`OutputStreamWriter` sans charset |

---

## 2. Choix Luny — décidés faute de source

Chacun de ces points **n'est pas déterminé par le code de STUdio**. Ils sont journalisés à
l'exécution quand ils se déclenchent, pour rester visibles.

### 2.1 Valeurs et bornes

1. **`optionIndex` négatif autre que `-1` → index 0**, avec avertissement.
   *Choix Luny.* Le format ne dit rien ; traiter ces valeurs comme `-1` (aléatoire) serait une
   extrapolation. Le repli sur 0 est le comportement le moins surprenant.
   → `resolve_transition()`, message « optionIndex negatif (…) hors du cas -1, index 0 retenu ».

2. **`optionIndex` hors bornes → borné à `option_count - 1`**, avec avertissement.
   *Choix Luny.* Le reader Java ne vérifie rien ; le reader JavaScript, lui, **crée les options
   manquantes** (`utils/reader.js:378-380`), ce qui a un sens dans un éditeur de diagramme mais
   aucun dans un moteur d'exécution — un moteur ne peut pas inventer une destination.

3. **`controlSettings` présent mais une clé manquante → drapeau à `false`**, avec avertissement.
   *Choix Luny.* La spec ne couvre que le cas « `controlSettings` absent → refuser le nœud »,
   qui lui est implémenté tel quel. Java lèverait une NPE sur la clé manquante.

4. **StageNode sans `uuid` → nœud refusé** ; **ActionNode sans `id` → nœud ignoré**.
   *Choix Luny.* Java lèverait une NPE dans les deux cas.

5. **Objet transition présent mais `actionNode` non exploitable → transition absente** ;
   **`optionIndex` manquant → 0**. *Choix Luny*, mêmes raisons.

6. **ActionNode sans aucune option** → l'événement renvoie `IGNORED_EMPTY_OPTIONS` et l'état ne
   bouge pas. *Choix Luny* : garde contre une division par zéro dans le calcul circulaire.

### 2.2 Emplacements d'options non résolus

7. **Un emplacement `null` ou pendant est conservé, pas supprimé.**
   *Choix Luny.* Compacter la liste décalerait tous les index suivants et changerait le sens de
   `optionIndex`, qui est positionnel. Le comportement quand on atterrit dessus (état inchangé)
   vient, lui, du JS — voir §1.1.

### 2.3 Nœud d'entrée

8. **Plusieurs `squareOne` → le premier rencontré**, avec avertissement.
   Aligné sur `PackDiagramModel.js:26-29` (`[0]`). **Divergence assumée avec le reader Java**, qui
   réassigne la variable à chaque occurrence (`ArchiveStoryPackReader.java:171-173`) et retient
   donc *le dernier* — un hasard d'implémentation qu'il ne faut pas reproduire.

9. **Aucun `squareOne` → premier StageNode retenu du tableau**, avec avertissement.
   Cohérent avec `ArchiveStoryPackReader.java:254` (pas de réordonnancement si aucun marqueur).

### 2.4 Assets

10. **L'extension doit correspondre à la famille du champ** : un `image` pointant un `.mp3` est
    ignoré. *Choix Luny.* Le reader Java attribue l'asset **d'après son extension seule**, quel que
    soit le champ qui le référence (`ArchiveStoryPackReader.java:213-247`) : un `.mp3` déclaré en
    `image` finit dans `audio`. Comportement déroutant, non reproduit.

11. **Nom sans point → asset ignoré**, avec avertissement (au lieu de l'exception Java).

### 2.5 Encodage

12. **BOM UTF-8 retiré ; si le contenu n'est pas de l'UTF-8 valide, relecture en Latin-1** et
    transcodage, avec avertissement. *Choix Luny* : le format ne spécifie aucun encodage, il fallait
    bien un repli déterministe. Latin-1 est retenu parce que le transcodage ne peut pas échouer.

### 2.6 Fin de branche

13. **`okTransition` nulle → `IGNORED_NO_TRANSITION`, état inchangé.**
    *Choix Luny.* La synthèse suggérait « retour à la bibliothèque », mais ce moteur n'a aucune
    notion de bibliothèque : c'est à la couche appelante de décider quoi faire de ce statut.

### 2.7 Générateur aléatoire

14. **splitmix32 avec échantillonnage par rejet, injectable.**
    *Choix Luny.* Le JS utilise `Math.random()` (`ActionNodeModel.js:62`), non reproductible.
    Le générateur par défaut est à graine fixe ; `luny_options.rng` permet de l'injecter pour les
    tests. Le rejet élimine le biais du modulo — vérifié empiriquement, écart < 0,4 % sur 600 000
    tirages pour des bornes de 2 à 6.

---

## 3. Comportements de STUdio délibérément non reproduits

1. **Refus des transitions revenant sur le même StageNode.** Le viewer affiche une erreur et
   n'avance pas quand OK ou HOME mène au nœud courant (`EditorPackViewer.js:83-85` et `:98-100` ;
   règle de validation correspondante en `translation.json:139`). Luny **accepte** ces transitions :
   c'est un garde d'éditeur, et le reproduire rendrait injouable un pack qui boucle volontairement
   sur lui-même. *Choix Luny, signalé ici parce qu'il diverge d'un comportement observable.*

2. **Création d'options manquantes à la lecture** (`utils/reader.js:378-380`) — voir §2.1 point 2.

3. **`readMetadata()` ignore `squareOne`** (`ArchiveStoryPackReader.java:63-64`), ce qui peut faire
   diverger l'uuid du pack selon le chemin de lecture. Luny honore toujours `squareOne`.

---

## 4. Hors périmètre

- **PAUSE** : le drapeau `pause` est exposé dans `luny_controls`, mais aucun événement `pause`
  n'est fourni — il n'agit que sur la lecture audio (`PackViewer.js:42-53`), et l'audio est hors
  périmètre. À câbler par la couche appelante.
- ZIP, décodage d'images, décodage audio, affichage : non traités, conformément au périmètre.
- `nightModeAvailable`, `position`, `groupId`, `thumbnail.png` : lus ou ignorés, jamais interprétés
  — leur effet n'est pas déterminé par le code de STUdio.

---

## 5. Vérifications effectuées

| Vérification | Résultat |
|---|---|
| `gcc -std=c99 -Wall -Wextra` | 0 avertissement |
| `make strict` (`-pedantic -Wshadow -Wconversion`) | 0 avertissement hors cJSON |
| valgrind sur les 6 packs de test | 0 erreur, 0 fuite |
| ASan + UBSan sur pack dégradé et JSON tronqué | aucun rapport |
| Fuzzing par mutation d'octets (400 itérations, ASan) | 0 crash |
| Uniformité du tirage (600 000 tirages, bornes 2→6) | écart < 0,4 % |
| Reproductibilité à graine égale | vérifiée |
| Jeu de tests `make test` | 11 scénarios, tous au vert |
