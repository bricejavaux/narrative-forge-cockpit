# NOTES — provenance des règles implémentées

Ce document sépare strictement **ce qui vient du code de STUdio** de **ce que j'ai dû décider**.

- Dépôt de référence : `marian-m12l/studio`, commit `aaf1e81f5af2440c828d27bcf0bd6592f434e7f5`.
- Chemins Java : `core/src/main/java/studio/core/v1/…`
- Chemins JavaScript : `web-ui/javascript/src/…`

> Règle de lecture : le §1 ne contient que des règles **tirées du code**, chacune avec son fichier
> et ses lignes ; aucune n'est inventée. Le §2 contient les **choix Luny**, qui ne sont pas des
> contraintes du format — à deux exceptions signalées en place : le point 2, requalifié après
> correction parce qu'il était en réalité déterminé par le viewer, et le point 9, arbitré et figé.

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
| **Un `optionIndex` hors bornes rend la transition inopérante** — pas de repli sur une autre option | `EditorPackViewer.js:79-93` — si `onOk()` ne renvoie pas un couple `stage`/`action` valide, ni `setViewerStage` ni `setViewerAction` n'est appelé |

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

2. ~~**`optionIndex` hors bornes → borné à `option_count - 1`.**~~
   **CORRIGÉ — ce n'était pas un choix ouvert : le comportement est déterminé par le viewer.**
   Un `optionIndex >= option_count` rend désormais la **transition inopérante** : le nœud courant,
   le contexte ActionNode et l'index restent inchangés, et l'événement renvoie
   `LUNY_EVENT_IGNORED_UNRESOLVED_TARGET`.
   Source : `EditorPackViewer.js:79-93` — quand `onOk()` ne renvoie pas un couple valide, le viewer
   n'appelle ni `setViewerStage` ni `setViewerAction`.
   Le bornage initial était doublement fautif : il contredisait cette source, et il était incohérent
   avec le traitement déjà appliqué aux trois autres cibles non résolues de ce même moteur.
   Le reader JavaScript, lui, **crée les options manquantes** (`utils/reader.js:378-380`) : c'est une
   commodité d'éditeur de diagramme, pas une règle d'exécution — un moteur ne peut pas inventer une
   destination.

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

8. **Statut unique pour les quatre cibles non résolues.**
   `actionNode` introuvable, `optionIndex` hors bornes, uuid d'option introuvable et `null` littéral
   renvoient tous `LUNY_EVENT_IGNORED_UNRESOLVED_TARGET`. Du point de vue de l'exécution ces cas sont
   indistinguables : la transition ne désigne aucune destination et l'état ne bouge pas. *Choix Luny*
   sur la granularité seule — le cas précis reste identifiable dans l'avertissement journalisé.
   `LUNY_EVENT_IGNORED_EMPTY_OPTIONS` (ActionNode sans aucune option) reste distinct : c'est une
   malformation de structure, pas une référence fautive.

### 2.3 Nœud d'entrée

9. **Plusieurs `squareOne` → le premier rencontré**, avec avertissement.
   **DÉCISION ARBITRÉE ET FIGÉE** — ce n'est plus un choix par défaut susceptible d'évoluer.
   Le comportement s'aligne sur le viewer : `PackDiagramModel.js:26-29` sélectionne le point
   d'entrée par `filter(...)[0]`, donc le **premier** nœud marqué.
   Il **diverge volontairement** du reader Java, qui réassigne sa variable à chaque occurrence
   (`ArchiveStoryPackReader.java:171-173`) et retient donc *le dernier* : c'est un effet de bord
   d'implémentation, pas une règle, et il ne doit pas être reproduit.
   Un pack conforme ne comporte de toute façon qu'un seul `squareOne` ; l'avertissement signale
   la malformation sans rendre le pack injouable.

10. **Aucun `squareOne` → premier StageNode retenu du tableau**, avec avertissement.
   Cohérent avec `ArchiveStoryPackReader.java:254` (pas de réordonnancement si aucun marqueur).

### 2.4 Assets

11. **L'extension doit correspondre à la famille du champ** : un `image` pointant un `.mp3` est
    ignoré. *Choix Luny.* Le reader Java attribue l'asset **d'après son extension seule**, quel que
    soit le champ qui le référence (`ArchiveStoryPackReader.java:213-247`) : un `.mp3` déclaré en
    `image` finit dans `audio`. Comportement déroutant, non reproduit.

12. **Nom sans point → asset ignoré**, avec avertissement (au lieu de l'exception Java).

### 2.5 Encodage

13. **BOM UTF-8 retiré ; si le contenu n'est pas de l'UTF-8 valide, relecture en Latin-1** et
    transcodage, avec avertissement. *Choix Luny* : le format ne spécifie aucun encodage, il fallait
    bien un repli déterministe. Latin-1 est retenu parce que le transcodage ne peut pas échouer.

### 2.6 Fin de branche

14. **`okTransition` nulle → `IGNORED_NO_TRANSITION`, état inchangé.**
    *Choix Luny.* La synthèse suggérait « retour à la bibliothèque », mais ce moteur n'a aucune
    notion de bibliothèque : c'est à la couche appelante de décider quoi faire de ce statut.

### 2.7 Générateur aléatoire

15. **splitmix32 avec échantillonnage par rejet, injectable.**
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

## 3 bis. Contrat de la ligne de commande

Le mode par défaut de `luny_cli` est le **contrat de conformité**, et non un format d'affichage :

```
luny_cli <repertoire> <ev1,ev2,...>
```

- événements séparés par des virgules en **un seul argument** ; noms canoniques `ok`, `home`,
  `wheel_left`, `wheel_right`, `audio_ended` (alias courts `left`, `right`, `ended` tolérés,
  plus `reset` propre à ce moteur) ;
- **stdout : exactement une ligne JSON par événement**, aucune ligne pour le chargement ;
- champs minimaux `node`, `image`, `audio` — `image` et `audio` sont le **nom de ressource**
  référencé dans `story.json`, ou `null` ;
- champs supplémentaires : `event`, `status`, `image_ref`, `audio_ref`, `action`, `index`,
  `options` ;
- tous les messages humains sur **stderr** ;
- code de sortie **1** si le chargement échoue, **2** si un nom d'événement est invalide — et dans
  ce dernier cas rien n'est écrit sur stdout, la liste étant validée avant exécution ;
- graine du tirage : `LUNY_RANDOM_SEED`, que `--seed N` surcharge.

Le mode texte lisible (une ligne `cle=valeur` par événement, précédée d'un en-tête de pack) est
passé derrière `--verbose`.

**Point d'attention sur `image` / `audio`.** Ces champs portent le nom **validé** : `null` si
l'asset est absent du dossier `assets/`, si son extension est inconnue ou si son nom n'a pas de
point. C'est le comportement décrit par la spécification de référence (« asset référencé mais absent
→ `image`/`audio` à `null`, pas d'erreur ») et par `ArchiveStoryPackReader.java:219-220`.
Si une suite de conformité attend au contraire la référence **brute**, elle est disponible sans
ambiguïté dans `image_ref` / `audio_ref` sur la même ligne.

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
| Jeu de tests `make test` | 20 scénarios (texte + JSON), tous au vert |
| Homogénéité des 4 cibles non résolues | vérifiée sur un pack qui atteint réellement les 4 cas |
