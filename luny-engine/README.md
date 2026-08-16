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
./luny_cli [--seed N] [--quiet] <repertoire-du-pack> [evenement...]
```

Événements : `ok`, `home`, `left`, `right`, `ended`, `reset`.
`--seed` rend le tirage de l'option aléatoire déterministe. `--quiet` masque les avertissements.

```console
$ ./luny_cli tests/packs/two-branches ok right ok
pack title="Deux chemins" version=1 nightMode=0 stages=5 actions=2 entry=3f2b6c68-…-1001
step=0 event=load  status=ACCEPTED stage=…-1001 name="Couverture" image=cover.png … action=- index=-
step=1 event=ok    status=ACCEPTED stage=…-1002 name="Option A"   image=option-a.png … index=0/2
step=2 event=right status=ACCEPTED stage=…-1003 name="Option B"   image=option-b.png … index=1/2
step=3 event=ok    status=ACCEPTED stage=…-1005 name="Histoire B" image=-           … index=1/2
```

Une ligne `cle=valeur` par événement sur `stdout`, les avertissements du parseur sur `stderr` :
la sortie se compare directement avec `diff`.

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
| `IGNORED_DANGLING_ACTION` | `actionNode` référencé introuvable |
| `IGNORED_DANGLING_OPTION` | option `null` ou uuid introuvable |
| `IGNORED_NO_ACTION_CONTEXT` | molette hors d'un contexte ActionNode |
| `IGNORED_EMPTY_OPTIONS` | ActionNode sans option |
| `IGNORED_NO_PACK` | moteur nul ou sans nœud courant |

## Robustesse

Le parseur est tolérant et explicite dans ses journaux. Sont couverts sans crash ni fuite :
`version` absent (pack refusé), `controlSettings` absent (nœud refusé), `actionNode` pendant,
uuid d'option pendant, `null` littéral dans `options`, `optionIndex` hors bornes ou négatif,
nom d'asset sans point, asset manquant, `squareOne` absent ou multiple, cycles et références avant.

Vérifié sous valgrind, ASan/UBSan et par fuzzing de mutation — détail dans `NOTES.md` §5.

## Provenance des règles

**`NOTES.md` sépare ce qui vient du code de STUdio de ce que j'ai dû décider.** Chaque règle du
code porte son fichier et ses lignes ; chaque décision est marquée « choix Luny ». À lire avant
de traiter un comportement de ce moteur comme une contrainte du format.

## Licence des composants tiers

`cjson/` — cJSON 1.7.19, © Dave Gamble et contributeurs, licence MIT (`cjson/LICENSE`).
