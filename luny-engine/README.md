# Moteur Luny

Moteur d'histoire interactive en **C99 pur** lisant le format d'archive « story pack » de
[STUdio](https://github.com/marian-m12l/studio). Parseur + machine à états uniquement : pas de ZIP,
pas d'audio, pas d'affichage.

Aucune dépendance externe hormis **cJSON** (MIT), vendorisé dans `cjson/`.
Aucun appel POSIX : l'existence d'un asset est testée par `fopen()`, ce qui garde le code
strictement C99 et portable.

## Construire

```sh
make                # gcc -std=c99 -Wall -Wextra -O2
make strict         # ajoute -pedantic -Wshadow -Wconversion
make test           # rejoue les scenarios de tests/
```

## Utiliser en ligne de commande

L'entrée est un **répertoire déjà extrait** contenant `story.json` et `assets/`.

```sh
./luny_cli <repertoire-du-pack> <ev1,ev2,...>
```

Événements : `ok`, `home`, `wheel_left`, `wheel_right`, `audio_ended` (alias `left`, `right`,
`ended`, plus `reset`). **Une ligne JSON par événement sur `stdout`, rien pour le chargement**,
tous les messages humains sur `stderr`.

```console
$ ./luny_cli tests/packs/two-branches ok,wheel_right,ok
{"node":"…-1002","image":"option-a.png","audio":"option-a.ogg","event":"ok",…,"index":0,"options":2}
{"node":"…-1003","image":"option-b.png","audio":"option-b.ogg","event":"wheel_right",…,"index":1,…}
{"node":"…-1005","image":null,"audio":"story-b.ogg","event":"ok",…,"index":1,"options":2}
```

Champs minimaux `node` / `image` / `audio` ; s'y ajoutent `event`, `status`, `image_ref`,
`audio_ref` (les références brutes de `story.json`, avant validation), `action`, `index`, `options`.

Sortie : **1** si le chargement échoue, **2** si un nom d'événement est invalide — auquel cas
`stdout` reste vide, la liste étant validée avant exécution.

Graine du tirage aléatoire : `LUNY_RANDOM_SEED`, que `--seed N` surcharge.

Le mode texte lisible est derrière `--verbose` :

```console
$ ./luny_cli --verbose tests/packs/two-branches ok,wheel_right,ok
pack title="Deux chemins" version=1 nightMode=0 stages=5 actions=2 entry=3f2b6c68-…-1001
step=0 event=load        status=ACCEPTED stage=…-1001 name="Couverture" image=cover.png … index=-
step=1 event=ok          status=ACCEPTED stage=…-1002 name="Option A"   … index=0/2
step=2 event=wheel_right status=ACCEPTED stage=…-1003 name="Option B"   … index=1/2
step=3 event=ok          status=ACCEPTED stage=…-1005 name="Histoire B" … index=1/2
```

## Utiliser comme bibliothèque

```c
#include "luny_engine.h"

luny_engine *e = NULL;
luny_options opts;
luny_rng     rng;

luny_options_init(&opts);
luny_rng_seed(&rng, 42u);
opts.rng     = luny_rng_next;   /* injectable : tests deterministes */
opts.rng_ctx = &rng;
opts.log     = mon_logger;      /* optionnel */

if (luny_open("/chemin/du/pack", &opts, &e) == LUNY_OK) {
    luny_stage_view sv;
    if (luny_current_stage(e, &sv)) {
        /* sv.image, sv.audio : noms de fichiers valides sous assets/, ou NULL */
        /* sv.controls.wheel / ok / home / pause / autoplay */
    }
    if (luny_ok(e) == LUNY_EVENT_ACCEPTED) {
        /* le noeud courant a change */
    }
    luny_close(e);
}
```

Tout événement renvoie un `luny_event_status`. **Tout ce qui n'est pas `LUNY_EVENT_ACCEPTED`
laisse l'état du moteur strictement inchangé** — un bouton désactivé ne produit aucun effet.

| Statut | Signification |
|---|---|
| `ACCEPTED` | l'état a changé |
| `IGNORED_CONTROL_DISABLED` | le drapeau `controlSettings` correspondant est faux |
| `IGNORED_NO_TRANSITION` | `okTransition` / `homeTransition` nulle |
| `IGNORED_UNRESOLVED_TARGET` | la transition ne désigne aucune destination : `actionNode` introuvable, `optionIndex` hors bornes, uuid d'option introuvable, ou option `null` |
| `IGNORED_NO_ACTION_CONTEXT` | molette hors d'un contexte ActionNode |
| `IGNORED_EMPTY_OPTIONS` | ActionNode sans aucune option |
| `IGNORED_NO_PACK` | moteur nul ou sans nœud courant |

## Robustesse

Le parseur est tolérant et explicite dans ses journaux. Sont couverts sans crash ni fuite :
`version` absent (pack refusé), `controlSettings` absent (nœud refusé), `actionNode` pendant,
uuid d'option pendant, `null` littéral dans `options`, `optionIndex` hors bornes (transition inopérante, jamais bornée) ou négatif,
nom d'asset sans point, asset manquant, `squareOne` absent ou multiple, cycles et références avant.

Vérifié sous valgrind, ASan/UBSan et par fuzzing de mutation — détail dans `NOTES.md` §5.

## Provenance des règles

**`NOTES.md` sépare ce qui vient du code de STUdio de ce que j'ai dû décider.** Chaque règle du
code porte son fichier et ses lignes ; chaque décision est marquée « choix Luny ». À lire avant
de traiter un comportement de ce moteur comme une contrainte du format.

## Licence des composants tiers

`cjson/` — cJSON 1.7.19, © Dave Gamble et contributeurs, licence MIT (`cjson/LICENSE`).
