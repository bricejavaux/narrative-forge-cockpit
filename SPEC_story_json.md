# SPEC — Format d'archive « story pack » de STUdio (`story.json` + `assets/`)

Spécification extraite **uniquement** du code source du dépôt `marian-m12l/studio`.

- Révision analysée : commit `aaf1e81f5af2440c828d27bcf0bd6592f434e7f5` (« fix constructor », 2025-10-01).
- Sources de référence principales :
  - `core/src/main/java/studio/core/v1/reader/archive/ArchiveStoryPackReader.java` (ci-après **Reader**)
  - `core/src/main/java/studio/core/v1/writer/archive/ArchiveStoryPackWriter.java` (ci-après **Writer**)
  - modèle : `core/src/main/java/studio/core/v1/model/*.java` et `.../model/enriched/*.java`
- Règle appliquée dans ce document : **toute affirmation est référencée par `fichier:ligne`**. Tout point non décidable depuis le code lu est marqué explicitement **« non déterminé »**.

---

## 1. Conteneur : l'archive ZIP

### 1.1 Écriture

| Élément | Valeur | Preuve |
|---|---|---|
| Type de conteneur | ZIP (`java.util.zip.ZipOutputStream`, paramètres par défaut) | `ArchiveStoryPackWriter.java:31` |
| Descripteur | entrée `story.json` à la racine | `ArchiveStoryPackWriter.java:38-39` |
| Répertoire d'assets | entrée répertoire `assets/` puis une entrée `assets/<nom>` par asset | `ArchiveStoryPackWriter.java:170-177` |
| Indentation JSON | 4 espaces | `ArchiveStoryPackWriter.java:43` |
| Ordre des assets | tri lexicographique croissant du nom de fichier (`TreeMap`) | `ArchiveStoryPackWriter.java:34`, `172` |

Le Writer **n'écrit jamais** de `thumbnail.png` : le code porte un `// TODO Thumbnail?` à l'emplacement prévu (`ArchiveStoryPackWriter.java:60`).

### 1.2 Lecture

| Règle | Preuve |
|---|---|
| Lecture via `ZipArchiveInputStream` (commons-compress), en flux séquentiel | `ArchiveStoryPackReader.java:32`, `84` |
| L'entrée descripteur est reconnue par comparaison **insensible à la casse** avec `story.json` | `ArchiveStoryPackReader.java:43`, `106` |
| Une entrée `thumbnail.png` (insensible à la casse) est lue comme vignette du pack — **uniquement** dans `readMetadata()`, pas dans `read()` | `ArchiveStoryPackReader.java:67-69` ; absente de `read()` (`:104-210`) |
| Toute entrée dont le nom commence par `assets/` est chargée en mémoire ; la **clé de l'asset est le nom privé du préfixe `assets/`** | `ArchiveStoryPackReader.java:207-209` |
| Conséquence : un sous-dossier est toléré, mais l'asset doit alors être référencé par son chemin relatif (`sous-dossier/fichier.png`) | déduction directe de `ArchiveStoryPackReader.java:208` (`substring("assets/".length())`) |
| Toute autre entrée est ignorée silencieusement | `ArchiveStoryPackReader.java:104-210` (aucune branche `else`) |
| L'ordre des entrées dans le ZIP est indifférent : les assets sont rattachés aux nœuds **après** la boucle de lecture | `ArchiveStoryPackReader.java:212-248` |
| `readMetadata()` renvoie `null` si aucune entrée `story.json` n'a été trouvée | `ArchiveStoryPackReader.java:37`, `44`, `78` |
| Extension de fichier utilisée pour l'archive dans l'application | `.zip` | `web-ui/src/main/java/studio/webui/service/LibraryService.java:164`, `240`, `308`, `436` |

**Encodage du JSON : non déterminé / non contraint par le code.** Le Reader construit `new InputStreamReader(zis)` et le Writer `new OutputStreamWriter(zos)` **sans charset explicite** (`ArchiveStoryPackReader.java:47`, `108` ; `ArchiveStoryPackWriter.java:42`) : le jeu de caractères est donc celui par défaut de la JVM, non spécifié par le format.

---

## 2. Structure complète du JSON

### 2.1 Objet racine

| Champ | Type JSON | Obligatoire ? | Écrit par le Writer | Lu par le Reader |
|---|---|---|---|---|
| `format` | string | non (jamais lu) | oui, valeur littérale `"v1"` — `ArchiveStoryPackWriter.java:47` | **jamais lu** (aucune occurrence de `"format"` dans `ArchiveStoryPackReader.java`) |
| `title` | string | non | seulement si `pack.getEnriched() != null` ; si le titre est `null`, écrit `"MISSING_PACK_TITLE"` — `ArchiveStoryPackWriter.java:50-56` | `ArchiveStoryPackReader.java:51-53` (metadata), `113` (modèle) — accepté seulement si primitive JSON |
| `description` | string | non | seulement si non `null` — `ArchiveStoryPackWriter.java:57-59` | `ArchiveStoryPackReader.java:54-56`, `114` |
| `version` | number (lu en `short`) | **oui** | toujours — `ArchiveStoryPackWriter.java:64` | `ArchiveStoryPackReader.java:50`, `111` (`getAsShort()`) — champ absent ⇒ `NullPointerException` |
| `nightModeAvailable` | boolean | non, défaut `false` | toujours — `ArchiveStoryPackWriter.java:67` | `ArchiveStoryPackReader.java:60`, `121` (`.orElse(false)`) |
| `stageNodes` | array d'objets StageNode | **oui** | toujours — `ArchiveStoryPackWriter.java:71-141` | `ArchiveStoryPackReader.java:63` (metadata), `136` (modèle) |
| `actionNodes` | array d'objets ActionNode | **oui** | toujours — `ArchiveStoryPackWriter.java:143-163` | `ArchiveStoryPackReader.java:125`, `192` |

Notes :

- `title` et `description` alimentent `EnrichedPackMetadata(title, description)` et ne sont instanciés que si au moins l'un des deux est présent (`ArchiveStoryPackReader.java:116-118` ; `model/enriched/EnrichedPackMetadata.java:11-21`).
- Ordre d'écriture réel : `format`, [`title`, `description`], `version`, `nightModeAvailable`, `stageNodes`, `actionNodes` (`ArchiveStoryPackWriter.java:47-163`). La lecture est faite via `JsonObject` et est donc **indifférente à l'ordre** ; les champs inconnus sont ignorés.
- **Sémantique de la valeur de `version` : non déterminée** depuis le code d'archive. Le champ est simplement transporté vers `StoryPack.version` (`model/StoryPack.java:17`, `50-56`) et vers `StoryPackMetadata.version` (`model/metadata/StoryPackMetadata.java:13`). Aucune validation, aucune énumération de valeurs valides dans le code lu.
- **Sémantique de `format` : non déterminée** au-delà du fait que le Writer émet la constante `"v1"` ; aucune lecture, aucune comparaison nulle part dans le Reader.
- `factoryDisabled` **n'existe pas** dans le JSON : le Reader l'initialise en dur à `false` (`ArchiveStoryPackReader.java:90`, `259`).
- Il n'y a **pas** de champ `uuid` au niveau du pack. L'UUID du pack est celui de son premier nœud d'étape (voir §3.4).

### 2.2 Objet StageNode (élément de `stageNodes`)

| Champ | Type JSON | Obligatoire ? | Preuve écriture | Preuve lecture |
|---|---|---|---|---|
| `uuid` | string | **oui** | `ArchiveStoryPackWriter.java:76` | `ArchiveStoryPackReader.java:64`, `139` |
| `name` | string | non (métadonnée enrichie) | `ArchiveStoryPackWriter.java:184-189` (fallback `"MISSING_NAME"`) | `ArchiveStoryPackReader.java:263` |
| `type` | string (label énuméré) | non | `ArchiveStoryPackWriter.java:190-193` | `ArchiveStoryPackReader.java:264`, `270` |
| `groupId` | string | non | `ArchiveStoryPackWriter.java:194-197` | `ArchiveStoryPackReader.java:265` |
| `position` | objet `{ "x": number, "y": number }` | non | `ArchiveStoryPackWriter.java:198-205` | `ArchiveStoryPackReader.java:266`, `272-276` (`getAsShort()` sur `x` et `y`) |
| `squareOne` | boolean | non | écrit **uniquement** pour le nœud d'indice 0, avec la valeur `true` | `ArchiveStoryPackWriter.java:83-86` / `ArchiveStoryPackReader.java:171-173` |
| `image` | string (nom de fichier) **ou** `null` | oui en écriture (toujours émis) ; toléré absent en lecture | `ArchiveStoryPackWriter.java:87-96` | `ArchiveStoryPackReader.java:175-180` (`!= null && !isJsonNull()`) |
| `audio` | string (nom de fichier) **ou** `null` | idem | `ArchiveStoryPackWriter.java:97-106` | `ArchiveStoryPackReader.java:181-186` |
| `okTransition` | objet Transition **ou** `null` | idem | `ArchiveStoryPackWriter.java:107-118` | `ArchiveStoryPackReader.java:140-144` (`!= null && isJsonObject()`) |
| `homeTransition` | objet Transition **ou** `null` | idem | `ArchiveStoryPackWriter.java:119-130` | `ArchiveStoryPackReader.java:145-149` |
| `controlSettings` | objet ControlSettings | **oui** | `ArchiveStoryPackWriter.java:131-138` | `ArchiveStoryPackReader.java:150`, `161-167` — absent ⇒ `NullPointerException` |

Champ `type` — valeurs admises (labels de `EnrichedNodeType`, `model/enriched/EnrichedNodeType.java:10-18`) :

| label JSON | constante | code binaire |
|---|---|---|
| `stage` | `STAGE` | `0x01` |
| `action` | `ACTION` | `0x02` |
| `cover` | `COVER` | `0x11` |
| `menu.questionaction` | `MENU_QUESTION_ACTION` | `0x21` |
| `menu.questionstage` | `MENU_QUESTION_STAGE` | `0x22` |
| `menu.optionsaction` | `MENU_OPTIONS_ACTION` | `0x23` |
| `menu.optionstage` | `MENU_OPTION_STAGE` | `0x24` |
| `story` | `STORY` | `0x31` |
| `story.storyaction` | `STORY_ACTION` | `0x32` |

Un label inconnu est converti en `null` sans erreur (`EnrichedNodeType.fromLabel`, `model/enriched/EnrichedNodeType.java:37-44`, appelé en `ArchiveStoryPackReader.java:270`). Les métadonnées enrichies ne sont instanciées que si au moins un des quatre champs `name`/`type`/`groupId`/`position` est présent (`ArchiveStoryPackReader.java:267-278`). `x` et `y` sont lus en `short` (`model/enriched/EnrichedNodePosition.java:11-12`) ; **l'unité et le repère de ces coordonnées ne sont pas déterminés** par le code lu (aucun usage dans `core`).

Contrainte sur `uuid` : au niveau de l'archive, c'est une chaîne libre (`ArchiveStoryPackReader.java:139`, `StageNode.uuid` est un `String` — `model/StageNode.java:13`). En revanche, la conversion vers le format binaire brut appelle `UUID.fromString(stageNode.getUuid())` (`core/src/main/java/studio/core/v1/writer/binary/BinaryStoryPackWriter.java:104`) : **un pack destiné à être converti doit donc porter des UUID syntaxiquement valides**.

### 2.3 Objet ActionNode (élément de `actionNodes`)

| Champ | Type JSON | Obligatoire ? | Preuve écriture | Preuve lecture |
|---|---|---|---|---|
| `id` | string | **oui** | `ArchiveStoryPackWriter.java:147` — valeur générée par `UUID.randomUUID().toString()` (`:113`, `:125`) | `ArchiveStoryPackReader.java:132`, `195` |
| `name`, `type`, `groupId`, `position` | idem StageNode | non | `ArchiveStoryPackWriter.java:149-153` → `183-206` | `ArchiveStoryPackReader.java:130`, `262-280` |
| `options` | array de string (UUID de StageNode) | **oui** | `ArchiveStoryPackWriter.java:155-160` | `ArchiveStoryPackReader.java:197-201` — absent ⇒ `NullPointerException` |

`id` est un identifiant **opaque au format archive** : le Reader ne fait que l'utiliser comme clé de map (`ArchiveStoryPackReader.java:124`, `132`, `142`, `147`, `195`). Le Writer se trouve produire des UUID aléatoires, mais rien dans le Reader n'impose ce format.

### 2.4 Objet Transition (`okTransition` / `homeTransition`)

| Champ | Type JSON | Obligatoire ? | Preuve |
|---|---|---|---|
| `actionNode` | string — doit valoir le `id` d'un élément de `actionNodes` | **oui** | écriture `ArchiveStoryPackWriter.java:115`, `127` ; lecture `ArchiveStoryPackReader.java:142`, `147` |
| `optionIndex` | number, lu en `short` | **oui** | écriture `ArchiveStoryPackWriter.java:116`, `128` ; lecture `ArchiveStoryPackReader.java:143`, `148` (`getAsShort()`) |

Modèle correspondant : `Transition(ActionNode actionNode, short optionIndex)` (`model/Transition.java:11-20`).

### 2.5 Objet ControlSettings

Cinq booléens, **tous obligatoires** (chaque `get(...)` est déréférencé sans test) :

| Champ | Type | Champ modèle | Preuve écriture | Preuve lecture |
|---|---|---|---|---|
| `wheel` | boolean | `wheelEnabled` | `ArchiveStoryPackWriter.java:133` | `ArchiveStoryPackReader.java:162` |
| `ok` | boolean | `okEnabled` | `ArchiveStoryPackWriter.java:134` | `ArchiveStoryPackReader.java:163` |
| `home` | boolean | `homeEnabled` | `ArchiveStoryPackWriter.java:135` | `ArchiveStoryPackReader.java:164` |
| `pause` | boolean | `pauseEnabled` | `ArchiveStoryPackWriter.java:136` | `ArchiveStoryPackReader.java:165` |
| `autoplay` | boolean | `autoJumpEnabled` (⚠️ nom du champ Java différent du nom JSON) | `ArchiveStoryPackWriter.java:137` | `ArchiveStoryPackReader.java:166` |

Constructeur du modèle : `ControlSettings(wheelEnabled, okEnabled, homeEnabled, pauseEnabled, autoJumpEnabled)` (`model/ControlSettings.java:20-26`).

---

## 3. StageNode vs ActionNode : rôles et référencement croisé

### 3.1 Les deux types

- **StageNode** = une « étape » diffusable : un `uuid`, un asset image, un asset audio, deux transitions sortantes et un jeu de réglages de contrôles (`model/StageNode.java:13-18`). Il hérite de `Node`, qui ne porte que les métadonnées enrichies (`model/Node.java:11-13`).
- **ActionNode** = **une simple liste ordonnée de StageNode** (`model/ActionNode.java:15`), sans asset, sans contrôle, sans transition sortante. L'aide intégrée le formule ainsi : « An Action Node is simply a list of items, each item pointing to a Stage Node » (`web-ui/src/main/resources/webroot/locales/en/translation.json:298`).

Les deux dérivent de `Node` (`model/StageNode.java:11`, `model/ActionNode.java:13`).

### 3.2 Le référencement est croisé et asymétrique

```
StageNode ──(okTransition|homeTransition).actionNode = ActionNode.id──▶ ActionNode
ActionNode ──options[i] = StageNode.uuid──────────────────────────────▶ StageNode
```

- **StageNode → ActionNode** : par la valeur `actionNode` de la transition, qui est le champ `id` d'un `actionNodes[]` (`ArchiveStoryPackReader.java:142`, `147`).
- **ActionNode → StageNode** : chaque entrée du tableau `options` est **l'`uuid` d'un StageNode**, résolue en objet à la seconde passe (`ArchiveStoryPackReader.java:196-202`).

Le Reader fait donc **deux passes** sur `actionNodes` : la première crée les `ActionNode` (`:125-133`), la seconde, après lecture de tous les `stageNodes`, relie les options (`:192-203`). C'est ce qui autorise les cycles et les références avant.

### 3.3 Comportement en cas de référence pendante

- `actionNode` inconnu ⇒ `actionNodes.get(...)` renvoie `null` et la `Transition` est construite avec un `ActionNode` nul, **sans erreur à la lecture** (`ArchiveStoryPackReader.java:142-143`).
- `uuid` d'option inconnu ⇒ `stageNodes.get(stageUuid)` renvoie `null` et un `null` est ajouté dans la liste d'options (`ArchiveStoryPackReader.java:200`).

Aucune validation d'intégrité référentielle n'est faite par le Reader d'archive. **Le comportement exact en aval de ces cas (conversion binaire/FS) n'est pas déterminé** ici : il n'y a pas de test ni de garde dans le code lu (aucun fichier `*Test*.java` dans le dépôt).

### 3.4 Nœud de départ (`squareOne`) et UUID du pack

- À l'écriture, seul le StageNode d'indice 0 reçoit `"squareOne": true` (`ArchiveStoryPackWriter.java:83-86`).
- À la lecture, l'ordre d'apparition dans `stageNodes` est conservé (`LinkedHashMap`, `ArchiveStoryPackReader.java:93`, `188`), puis le nœud marqué `squareOne` est **déplacé en tête** (`ArchiveStoryPackReader.java:171-173`, `252-257`).
- L'UUID du pack est alors l'`uuid` de ce premier nœud : `new StoryPack(nodes.get(0).getUuid(), …)` (`ArchiveStoryPackReader.java:259`).
- ⚠️ Divergence réelle du code : `readMetadata()` **ignore `squareOne`** et prend systématiquement `stageNodes[0]` comme référence d'UUID (`ArchiveStoryPackReader.java:63-64`). Si le nœud marqué `squareOne` n'est pas le premier du tableau, l'UUID listé dans la bibliothèque diffère de celui obtenu par `read()`.
- Si aucun nœud ne porte `squareOne`, aucun réordonnancement n'a lieu et le premier élément du tableau fait foi (`ArchiveStoryPackReader.java:254`, condition `squareOne != null`).

---

## 4. Sémantique des paramètres de contrôle

### 4.1 Ce que le code du format garantit

Les cinq drapeaux sont transportés tels quels jusqu'aux formats consommés par la Fabrique à Histoires :

- format binaire brut : chacun est écrit sur un `short` valant `1` ou `0` (`writer/binary/BinaryStoryPackWriter.java:156-161`), relu par `dis.readShort() == 1` (`reader/binary/BinaryStoryPackReader.java:137-142`) ;
- format FS (firmware 2.4+) : mêmes drapeaux passés dans l'ordre WHEEL, OK, HOME, PAUSE, AUTOPLAY, sérialisés en `short` little-endian (`writer/fs/FsStoryPackWriter.java:186-190`, `297-301`, `308-310`).

### 4.2 Sémantique fonctionnelle

La sémantique fonctionnelle n'est pas exprimée dans `core` (ce sont de simples booléens). Elle est en revanche **documentée dans le dépôt**, dans l'aide de l'éditeur (`web-ui/src/main/resources/webroot/locales/en/translation.json:294`, aide « Stage Node ») et dans les libellés d'interface (`…/translation.json:92-96`).

| Champ JSON | Libellé UI (`translation.json:92-96`) | Sémantique documentée (`translation.json:294`) |
|---|---|---|
| `wheel` | « Allow wheel selection » | « whether the user can or cannot navigate the current "menu" / Action Node's list (you may want to disable this when playing a question or a story) » |
| `ok` | « Allow OK button » | « whether the user can press OK (you may want to disable this when playing a question or a story) » |
| `home` | « Allow HOME button » | « whether the user can press HOME (you may want to disable this when playing a question). **Leaving an empty HOME transition will go back to the entry point.** » |
| `pause` | « Allow PAUSE button » | « whether the user can press PAUSE (you may want to enable this when playing a story) » |
| `autoplay` | « Enable autoplay » | « whether the Story Teller should automatically play the OK transition when the audio file is done playing (you may want to enable this when playing a question or a story) » |

Précisions complémentaires issues de la même aide :

- Nœud de couverture : WHEEL sert à parcourir la liste des packs, OK à passer au premier nœud réel du pack (`translation.json:282`).
- Nœud de menu : AUTOPLAY enchaîne sur la première option après la question ; WHEEL sélectionne une autre option ; OK valide ; HOME revient au nœud précédent **ou** au point d'entrée selon le nombre de liens entrants (`translation.json:286`).
- Nœud d'histoire : AUTOPLAY et HOME renvoient au « premier nœud utile » du pack, celui qui suit le point d'entrée (`translation.json:290`).

**Points non déterminés** : le comportement exact du firmware lorsqu'un drapeau est activé sans transition correspondante (ex. `autoplay: true` avec `okTransition: null`) n'est **pas déterminé** par le code de ce dépôt — les descriptions ci-dessus proviennent de la documentation UI, pas d'une implémentation du lecteur embarqué, absente du dépôt.

---

## 5. Transitions et index d'option

### 5.1 Mécanique

Une transition est un couple **(nœud d'action cible, index d'option sélectionnée)** :

```json
"okTransition": { "actionNode": "<ActionNode.id>", "optionIndex": 0 }
```

- `actionNode` désigne la **liste** (l'ActionNode) dans laquelle on entre.
- `optionIndex` désigne **quel élément de `options[]` est sélectionné à l'entrée**. Le commentaire du writer FS l'énonce exactement : « OK transition: Menu option index (index 0 == first menu option) » (`writer/fs/FsStoryPackWriter.java:182`, idem pour HOME `:185`).

Le nombre d'options n'est pas stocké dans le JSON : il est **recalculé** à partir de la taille de `options[]` de l'ActionNode ciblé lors des conversions — `okTransition.getActionNode().getOptions().size()` (`writer/binary/BinaryStoryPackWriter.java:141`, `152` ; `writer/fs/FsStoryPackWriter.java:181`, `184`). Dans le format binaire, une transition est donc écrite sous forme de triplet (offset du nœud d'action, nombre d'options, index sélectionné) (`writer/binary/BinaryStoryPackWriter.java:139-143`).

### 5.2 Absence de transition

- Écriture : `okTransition` / `homeTransition` valent `null` en JSON quand la transition est absente (`ArchiveStoryPackWriter.java:108-110`, `120-122`).
- Lecture : `null` ou champ manquant ⇒ `Transition` nulle (`ArchiveStoryPackReader.java:141`, `146`).
- Conversions : une transition nulle devient le triplet `(-1, -1, -1)` en binaire (`writer/binary/BinaryStoryPackWriter.java:134-137`, `145-148`) et `-1` dans les trois champs correspondants en FS (`writer/fs/FsStoryPackWriter.java:180-185`).
- Sens fonctionnel d'une transition HOME vide : « Leaving an empty HOME transition will go back to the entry point » (`web-ui/.../translation.json:294`).

### 5.3 Domaine de valeurs de `optionIndex`

- Type : `short` (`model/Transition.java:12`, lecture `getAsShort()` en `ArchiveStoryPackReader.java:143`), donc plage `-32768..32767` au niveau du parsing.
- Convention documentée : index 0-based dans `options[]` (`writer/fs/FsStoryPackWriter.java:182`).
- L'éditeur propose une notion d'« option aléatoire » (`web-ui/.../translation.json:116`, `125` : « Random option »). **La valeur d'`optionIndex` encodant ce cas n'est pas déterminée** : le code JavaScript de l'éditeur de diagrammes n'est pas présent dans ce dépôt (`web-ui/src/main/resources/webroot/` ne contient que `favicon.png` et `locales/`), et aucune constante « random » n'existe côté Java (aucune occurrence pertinente de `random` dans `core/`).
- **Aucune borne n'est vérifiée** par le Reader ni par les writers : un `optionIndex` hors de `[0, options.size()-1]` est accepté sans erreur au niveau du format. Comportement à l'exécution sur l'appareil : **non déterminé**.

---

## 6. Assets : nommage, formats et contraintes

### 6.1 Nommage des fichiers

- **À l'écriture** : le nom de fichier est `sha1Hex(<octets de l'asset>) + <extension déduite du type MIME>`, et l'octet-à-octet est dédupliqué par `putIfAbsent` (`ArchiveStoryPackWriter.java:91-96` pour l'image, `101-106` pour l'audio).
- **À la lecture** : n'importe quel nom est accepté ; c'est le StageNode qui référence explicitement le nom de fichier (`ArchiveStoryPackReader.java:218-219`, commentaire du code : « Stage nodes explicitly reference their assets' filenames »). Un même fichier peut être référencé par plusieurs nœuds (`ArchiveStoryPackReader.java:177-179`, `183-185`, `221`).
- **Contrainte impérative** : le nom **doit comporter un point**. Le Reader calcule `assetName.substring(assetName.lastIndexOf("."))` (`ArchiveStoryPackReader.java:215-216`) : sans point, `lastIndexOf` renvoie `-1` et `substring(-1)` lève une `StringIndexOutOfBoundsException`. Or le Writer produit une extension **vide** pour un type MIME non reconnu (`ArchiveStoryPackWriter.java:222-223`) — une archive écrite avec un MIME inconnu est donc illisible par le Reader.

### 6.2 Extensions et types MIME reconnus à la lecture

Table de correspondance, comparaison en minuscules (`ArchiveStoryPackReader.java:216`, `222`) :

| Extension | Type MIME attribué | Cible | Preuve |
|---|---|---|---|
| `.bmp` | `image/bmp` | `StageNode.image` | `ArchiveStoryPackReader.java:223-225` |
| `.png` | `image/png` | `StageNode.image` | `ArchiveStoryPackReader.java:226-228` |
| `.jpg`, `.jpeg` | `image/jpeg` | `StageNode.image` | `ArchiveStoryPackReader.java:229-232` |
| `.wav` | `audio/x-wav` | `StageNode.audio` | `ArchiveStoryPackReader.java:233-235` |
| `.mp3` | `audio/mpeg` | `StageNode.audio` | `ArchiveStoryPackReader.java:236-238` |
| `.ogg`, `.oga` | `audio/ogg` | `StageNode.audio` | `ArchiveStoryPackReader.java:239-242` |
| toute autre | — | asset ignoré silencieusement (`// Unsupported asset`) | `ArchiveStoryPackReader.java:243-245` |

Table inverse, à l'écriture (`ArchiveStoryPackWriter.java:208-225`) : `image/bmp`→`.bmp`, `image/png`→`.png`, `image/jpeg`→`.jpg`, `audio/x-wav`→`.wav`, `audio/mpeg`→`.mp3`, `audio/ogg`→`.ogg`, défaut→`""`.

Asymétrie à noter : `.oga` est lu mais jamais écrit ; `.jpeg` est lu mais l'écriture normalise en `.jpg`.

Un asset présent dans `assets/` mais référencé par aucun nœud n'est jamais rattaché (`ArchiveStoryPackReader.java:219-220`, test `stageNodesReferencingAsset != null && !isEmpty()`). Inversement, un nom référencé mais absent de l'archive laisse `image`/`audio` à `null`, sans erreur.

### 6.3 Contraintes de fond : ce que le format archive n'impose PAS

Le couple Reader/Writer d'archive **n'effectue aucune validation** de dimensions d'image, de profondeur de couleur, de fréquence d'échantillonnage, de nombre de canaux ou de durée. Aucune de ces vérifications n'apparaît dans `ArchiveStoryPackReader.java` ni `ArchiveStoryPackWriter.java`.

Les contraintes réelles apparaissent **aux conversions** vers les formats de l'appareil :

**Format FS (firmware 2.4+)** — `core/src/main/java/studio/core/v1/writer/fs/FsStoryPackWriter.java` :

| Contrainte | Message / preuve |
|---|---|
| Image obligatoirement BMP | « FS pack file requires image assets to be BMP. » — `:115-117` |
| BMP en 4 bits par pixel + encodage RLE (offset 28 == `0x0004`, offset 30 == `0x00000002`) | « …requires image assets to use 4-bit depth and RLE encoding. » — `:118-123` |
| Dimensions exactement **320×240** (offsets BMP 18 et 22) | « FS pack file requires image assets to be 320x240 pixels. » — `:124-127` |
| Audio obligatoirement MP3 (`audio/mp3` ou `audio/mpeg`) | « FS pack file requires audio assets to be MP3. » — `:144-145` |
| Aucun tag ID3v1/ID3v2 | « FS pack file does not support ID3 tags in MP3 files. » — `:147-150` |
| MP3 **mono / 44100 Hz** | « FS pack file requires MP3 audio assets to be MONO / 44100Hz. » — `:151-156` |
| Un nœud sans audio reçoit un MP3 vierge injecté automatiquement | `:137-140` |

**Constantes de conversion** — `core/src/main/java/studio/core/v1/utils/AudioConversion.java:18-23` :

- `WAVE_SAMPLE_RATE = 32000.0f` — « convert sample rate to 32000Hz, and to mono channel (the only format that is supported by the story teller device) » (`:49`)
- `OGG_SAMPLE_RATE = 44100.0f` — « the only rate that is supported by the vorbis encoding library » (`:74`)
- `MP3_SAMPLE_RATE = 44100.0f`, `BITSIZE = 16`, `MP3_BITSIZE = 32`, `CHANNELS = 1`

**Palette d'image lors de la préparation FS** : quantification à **16 couleurs maximum**, tramage activé, mode BMP `BI_RLE4` (`core/src/main/java/studio/core/v1/utils/ImageConversion.java:29`, `120-141`). Le canal alpha est systématiquement supprimé par redessin sur fond noir (`ImageConversion.java:51-59`).

**Règles de (dé)compression appliquées aux archives** — `core/src/main/java/studio/core/v1/utils/PackAssetsCompression.java` :

| Sens | Transformation | Preuve |
|---|---|---|
| Détection « assets compressés » | tout ce qui n'est ni `image/bmp` ni `audio/x-wav` | `:23-37` |
| Vers archive (compression) | BMP → PNG, WAV → OGG | `:51-61`, `:69-73` |
| Vers binaire brut (décompression) | PNG/JPEG → BMP, BMP 4 bits/RLE → BMP, OGG/MP3 → WAV | `:99-115`, `:128-138` |
| Vers FS (firmware 2.4) | tout → BMP 4 bits/RLE, tout → MP3 mono 44100 sans ID3 | `:158-200` |

Autrement dit : **dans le format archive, les combinaisons usuelles sont PNG + OGG** (produit par la conversion binaire→archive : `LibraryService.java:255-262`), mais BMP/JPEG/WAV/MP3 restent lisibles.

**Non déterminé** : taille maximale d'un asset, durée audio maximale, nombre maximal de nœuds ou d'options — aucune limite de ce type n'apparaît dans le code lu.

---

## 7. Cycle de vie dans l'application (contexte)

- Lecture d'un `.zip` de la bibliothèque pour métadonnées : `web-ui/src/main/java/studio/webui/service/LibraryService.java:436-449`.
- Archive → binaire brut : lecture archive, décompression des assets si nécessaire, écriture `.pack` (`LibraryService.java:162-198`).
- Binaire brut → archive : lecture, **compression des assets**, écriture `.zip` (`LibraryService.java:243-274`).
- Archive → FS : lecture, `withPreparedAssetsFirmware2dot4` (BMP RLE + MP3), écriture du dossier FS (`LibraryService.java:306-337`).
- La vignette lue depuis `thumbnail.png` est exposée à l'IHM en data-URI base64 (`LibraryService.java:498`).

---

## 8. Exemple minimal complet et valide à deux embranchements

### 8.1 Contenu de l'archive

```
pack.zip
├── story.json
└── assets/
    ├── cover.png
    ├── cover.ogg
    ├── option-a.png
    ├── option-a.ogg
    ├── option-b.png
    ├── option-b.ogg
    ├── story-a.ogg
    └── story-b.ogg
```

Graphe obtenu :

```
[Couverture] --ok--> (menu:0) --+--> [Option A] --ok--> (histoires:0) --> [Histoire A]
                                |
                                +--> [Option B] --ok--> (histoires:1) --> [Histoire B]
```

Sur les nœuds Option A / Option B, `wheel: true` permet de circuler dans les deux entrées de l'ActionNode `menu` ; `optionIndex` fixe l'entrée sélectionnée à l'arrivée (`ArchiveStoryPackReader.java:143` ; `writer/fs/FsStoryPackWriter.java:182`). Les deux transitions OK des options pointent vers **le même** ActionNode `histoires` avec des `optionIndex` différents (0 et 1) : c'est exactement le mécanisme d'embranchement.

### 8.2 `story.json`

```json
{
    "format": "v1",
    "title": "Deux chemins",
    "description": "Exemple minimal a deux embranchements",
    "version": 1,
    "nightModeAvailable": false,
    "stageNodes": [
        {
            "uuid": "3f2b6c68-1c6b-4a41-9a3e-6ac47a5c1001",
            "name": "Couverture",
            "type": "cover",
            "position": { "x": 0, "y": 0 },
            "squareOne": true,
            "image": "cover.png",
            "audio": "cover.ogg",
            "okTransition": {
                "actionNode": "7b1e2d90-5c44-4f0a-9d21-0e5b6a7c2001",
                "optionIndex": 0
            },
            "homeTransition": null,
            "controlSettings": {
                "wheel": false,
                "ok": true,
                "home": false,
                "pause": false,
                "autoplay": false
            }
        },
        {
            "uuid": "3f2b6c68-1c6b-4a41-9a3e-6ac47a5c1002",
            "name": "Option A",
            "type": "menu.optionstage",
            "position": { "x": 300, "y": -100 },
            "image": "option-a.png",
            "audio": "option-a.ogg",
            "okTransition": {
                "actionNode": "7b1e2d90-5c44-4f0a-9d21-0e5b6a7c2002",
                "optionIndex": 0
            },
            "homeTransition": null,
            "controlSettings": {
                "wheel": true,
                "ok": true,
                "home": true,
                "pause": false,
                "autoplay": false
            }
        },
        {
            "uuid": "3f2b6c68-1c6b-4a41-9a3e-6ac47a5c1003",
            "name": "Option B",
            "type": "menu.optionstage",
            "position": { "x": 300, "y": 100 },
            "image": "option-b.png",
            "audio": "option-b.ogg",
            "okTransition": {
                "actionNode": "7b1e2d90-5c44-4f0a-9d21-0e5b6a7c2002",
                "optionIndex": 1
            },
            "homeTransition": null,
            "controlSettings": {
                "wheel": true,
                "ok": true,
                "home": true,
                "pause": false,
                "autoplay": false
            }
        },
        {
            "uuid": "3f2b6c68-1c6b-4a41-9a3e-6ac47a5c1004",
            "name": "Histoire A",
            "type": "story",
            "position": { "x": 600, "y": -100 },
            "image": null,
            "audio": "story-a.ogg",
            "okTransition": null,
            "homeTransition": null,
            "controlSettings": {
                "wheel": false,
                "ok": false,
                "home": true,
                "pause": true,
                "autoplay": true
            }
        },
        {
            "uuid": "3f2b6c68-1c6b-4a41-9a3e-6ac47a5c1005",
            "name": "Histoire B",
            "type": "story",
            "position": { "x": 600, "y": 100 },
            "image": null,
            "audio": "story-b.ogg",
            "okTransition": null,
            "homeTransition": null,
            "controlSettings": {
                "wheel": false,
                "ok": false,
                "home": true,
                "pause": true,
                "autoplay": true
            }
        }
    ],
    "actionNodes": [
        {
            "id": "7b1e2d90-5c44-4f0a-9d21-0e5b6a7c2001",
            "name": "Menu principal",
            "type": "menu.optionsaction",
            "position": { "x": 150, "y": 0 },
            "options": [
                "3f2b6c68-1c6b-4a41-9a3e-6ac47a5c1002",
                "3f2b6c68-1c6b-4a41-9a3e-6ac47a5c1003"
            ]
        },
        {
            "id": "7b1e2d90-5c44-4f0a-9d21-0e5b6a7c2002",
            "name": "Histoires",
            "type": "story.storyaction",
            "position": { "x": 450, "y": 0 },
            "options": [
                "3f2b6c68-1c6b-4a41-9a3e-6ac47a5c1004",
                "3f2b6c68-1c6b-4a41-9a3e-6ac47a5c1005"
            ]
        }
    ]
}
```

### 8.3 Vérification de validité, champ par champ

| Exigence du Reader | Satisfaite par |
|---|---|
| `version` présent et numérique (`ArchiveStoryPackReader.java:111`) | `"version": 1` |
| `stageNodes` tableau non vide, `nodes.get(0)` accessible (`:136`, `:259`) | 5 nœuds |
| `actionNodes` tableau présent (`:125`, `:192`) | 2 nœuds |
| chaque StageNode a `uuid` (`:139`) | oui |
| chaque StageNode a `controlSettings` avec les 5 clés (`:150`, `161-167`) | oui |
| chaque ActionNode a `id` (`:132`, `:195`) et `options` (`:197`) | oui |
| chaque `transition.actionNode` correspond à un `id` existant (`:142`, `:147`) | `…2001`, `…2002` |
| chaque `options[i]` correspond à un `uuid` de StageNode (`:200`) | `…1002` à `…1005` |
| un seul nœud `squareOne`, placé en tête (`:171-173`, `252-257`) | nœud `…1001` |
| tout nom d'asset contient un point et porte une extension supportée (`:215-216`, `222-242`) | `.png` / `.ogg` |
| tout nom d'asset référencé existe sous `assets/` (`:207-209`, `219`) | oui |
| UUID syntaxiquement valides pour permettre la conversion binaire (`writer/binary/BinaryStoryPackWriter.java:104`) | oui |

Pour un transfert vers un appareil en firmware 2.4+, les assets seront de plus reconvertis en BMP 320×240 4 bits/RLE et MP3 mono 44100 Hz (`utils/PackAssetsCompression.java:151-200`, contrôles dans `writer/fs/FsStoryPackWriter.java:115-156`) : l'archive elle-même n'impose pas ces caractéristiques, mais il est prudent de fournir des images **320×240** dès l'origine, la conversion ne redimensionnant pas (aucun appel de mise à l'échelle dans `utils/ImageConversion.java`).

---

## 9. Récapitulatif des points « non déterminés »

1. **Signification des valeurs de `version`** (quelles valeurs sont valides, ce qu'elles impliquent) — le champ n'est ni validé ni interprété dans le code lu.
2. **Rôle du champ `format`** au-delà de la valeur littérale `"v1"` écrite ; il n'est relu nulle part.
3. **Valeur d'`optionIndex` encodant l'« option aléatoire »** proposée par l'éditeur (`web-ui/.../translation.json:116`, `125`) — le code JS de l'éditeur est absent du dépôt.
4. **Écriture de `thumbnail.png`** : jamais produite par `ArchiveStoryPackWriter` (`// TODO Thumbnail?`, `:60`) ; seule la lecture existe. Le format attendu au-delà de « PNG nommé `thumbnail.png` » (dimensions, poids) n'est pas déterminé.
5. **Effet exact de `nightModeAvailable` sur l'appareil** — le champ est seulement transporté ; côté FS, la disponibilité est déduite de la présence d'un fichier `nm` (`reader/fs/FsStoryPackReader.java:37`, `58-59`), mais le comportement du firmware n'est pas dans le dépôt.
6. **Comportement du firmware** en cas d'incohérence tolérée par le format : `optionIndex` hors bornes, `actionNode`/option pendants, `autoplay` sans `okTransition`.
7. **Unité et repère des coordonnées `position.x` / `position.y`** — jamais consommées dans `core`.
8. **Encodage de caractères de `story.json`** : dépendant du charset par défaut de la JVM des deux côtés (`ArchiveStoryPackReader.java:47`, `108` ; `ArchiveStoryPackWriter.java:42`), donc non spécifié par le format.
9. **Limites de volume** (taille d'asset, durée audio, nombre de nœuds/options) : aucune contrainte dans le code lu.

---

## 10. Conclusion

Le format archive est un ZIP à deux composants : un descripteur `story.json` (graphe + métadonnées) et un dossier plat `assets/` dont les fichiers sont référencés **par nom** depuis les nœuds d'étape. Le graphe est bipartite : les `StageNode` (média + contrôles) pointent vers des `ActionNode` (listes ordonnées) via `{actionNode, optionIndex}`, et les `ActionNode` pointent vers des `StageNode` via des UUID. Le Reader est permissif — aucune validation d'intégrité référentielle, aucune contrainte média — les contraintes dures (BMP 320×240 4 bits/RLE, MP3 mono 44100 Hz sans ID3) n'étant appliquées qu'à la conversion vers les formats de l'appareil.

**Aucune modification n'a été apportée au dépôt `marian-m12l/studio` : analyse en lecture seule.**
