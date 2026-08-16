/*
 * luny_cli.c -- pilote en ligne de commande du moteur Luny.
 *
 * Contrat par defaut (mode conformite) :
 *     luny_cli <repertoire-du-pack> <ev1,ev2,...>
 *
 *   - evenements separes par des virgules, en un seul argument ;
 *   - noms acceptes : ok, home, wheel_left, wheel_right, audio_ended
 *     (alias courts toleres : left, right, ended, reset) ;
 *   - stdout : exactement une ligne JSON par evenement, aucune ligne pour
 *     le chargement ;
 *   - chaque ligne porte au minimum node / image / audio, image et audio
 *     etant le nom de ressource reference dans story.json, ou null ;
 *   - tous les messages humains sur stderr ;
 *   - code de sortie non nul si le chargement echoue.
 *
 * Mode texte lisible (ancien format, une ligne cle=valeur par evenement,
 * precede d'un en-tete de pack) : --verbose.
 *
 * Graine du tirage aleatoire : variable d'environnement LUNY_RANDOM_SEED,
 * ou option --seed N qui la surcharge.
 */

#include "luny_engine.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int g_quiet = 0;

static void cli_log(void *ctx, luny_log_level level, const char *message)
{
    (void)ctx;
    if (g_quiet) {
        return;
    }
    fprintf(stderr, "[%s] %s\n", (level == LUNY_LOG_WARN) ? "warn" : "info", message);
}

/* ------------------------------------------------------------------ */
/* Sortie JSON                                                        */
/* ------------------------------------------------------------------ */

/* Ecrit une chaine JSON echappee, ou le litteral null si s vaut NULL. */
static void json_string(const char *s)
{
    size_t i;

    if (s == NULL) {
        fputs("null", stdout);
        return;
    }
    fputc('"', stdout);
    for (i = 0u; s[i] != '\0'; i++) {
        unsigned char c = (unsigned char)s[i];
        switch (c) {
            case '"':  fputs("\\\"", stdout); break;
            case '\\': fputs("\\\\", stdout); break;
            case '\b': fputs("\\b", stdout);  break;
            case '\f': fputs("\\f", stdout);  break;
            case '\n': fputs("\\n", stdout);  break;
            case '\r': fputs("\\r", stdout);  break;
            case '\t': fputs("\\t", stdout);  break;
            default:
                if (c < 0x20u) {
                    printf("\\u%04x", (unsigned int)c);
                } else {
                    fputc((char)c, stdout);
                }
                break;
        }
    }
    fputc('"', stdout);
}

/*
 * Une ligne JSON par evenement.
 *
 * node / image / audio forment le contrat minimal. Les champs suivants sont
 * des extensions : event, status, image_ref / audio_ref (la reference brute
 * de story.json, avant validation), action, index, options.
 */
static void print_json(const luny_engine *e, const char *event, const char *status)
{
    luny_stage_view  sv;
    luny_action_view av;
    int              has_stage;

    has_stage = luny_current_stage(e, &sv);

    fputs("{\"node\":", stdout);
    json_string(has_stage ? sv.uuid : NULL);

    fputs(",\"image\":", stdout);
    json_string(has_stage ? sv.image : NULL);

    fputs(",\"audio\":", stdout);
    json_string(has_stage ? sv.audio : NULL);

    fputs(",\"event\":", stdout);
    json_string(event);

    fputs(",\"status\":", stdout);
    json_string(status);

    fputs(",\"image_ref\":", stdout);
    json_string(has_stage ? sv.image_ref : NULL);

    fputs(",\"audio_ref\":", stdout);
    json_string(has_stage ? sv.audio_ref : NULL);

    if (luny_current_action(e, &av)) {
        fputs(",\"action\":", stdout);
        json_string(av.action_id);
        printf(",\"index\":%d,\"options\":%d", av.index, av.option_count);
    } else {
        fputs(",\"action\":null,\"index\":null,\"options\":null", stdout);
    }

    fputs("}\n", stdout);
}

/* ------------------------------------------------------------------ */
/* Sortie texte lisible (--verbose)                                   */
/* ------------------------------------------------------------------ */

static void print_quoted(const char *s)
{
    size_t i;
    if (s == NULL) {
        fputs("-", stdout);
        return;
    }
    fputc('"', stdout);
    for (i = 0u; s[i] != '\0'; i++) {
        if (s[i] == '"' || s[i] == '\\') {
            fputc('\\', stdout);
            fputc(s[i], stdout);
        } else if (s[i] == '\n' || s[i] == '\r' || s[i] == '\t') {
            fputc(' ', stdout);
        } else {
            fputc(s[i], stdout);
        }
    }
    fputc('"', stdout);
}

static void print_text(const luny_engine *e, int step, const char *event, const char *status)
{
    luny_stage_view  sv;
    luny_action_view av;

    printf("step=%d event=%s status=%s", step, event, status);

    if (luny_current_stage(e, &sv)) {
        printf(" stage=%s", sv.uuid);
        printf(" name=");
        print_quoted(sv.name);
        printf(" image=%s", (sv.image != NULL) ? sv.image : "-");
        printf(" audio=%s", (sv.audio != NULL) ? sv.audio : "-");
        printf(" wheel=%d ok=%d home=%d pause=%d autoplay=%d",
               sv.controls.wheel, sv.controls.ok, sv.controls.home,
               sv.controls.pause, sv.controls.autoplay);
    } else {
        printf(" stage=- name=- image=- audio=- wheel=- ok=- home=- pause=- autoplay=-");
    }

    if (luny_current_action(e, &av)) {
        printf(" action=%s index=%d/%d", av.action_id, av.index, av.option_count);
    } else {
        printf(" action=- index=-");
    }

    printf("\n");
}

/* ------------------------------------------------------------------ */
/* Analyse de la liste d'evenements                                   */
/* ------------------------------------------------------------------ */

typedef enum {
    EV_OK = 0,
    EV_HOME,
    EV_WHEEL_LEFT,
    EV_WHEEL_RIGHT,
    EV_AUDIO_ENDED,
    EV_RESET,
    EV_INVALID
} event_kind;

static event_kind event_from_name(const char *name)
{
    if (strcmp(name, "ok") == 0)                                      return EV_OK;
    if (strcmp(name, "home") == 0)                                    return EV_HOME;
    if (strcmp(name, "wheel_left")  == 0 || strcmp(name, "left")  == 0) return EV_WHEEL_LEFT;
    if (strcmp(name, "wheel_right") == 0 || strcmp(name, "right") == 0) return EV_WHEEL_RIGHT;
    if (strcmp(name, "audio_ended") == 0 || strcmp(name, "ended") == 0) return EV_AUDIO_ENDED;
    if (strcmp(name, "reset") == 0)                                   return EV_RESET;
    return EV_INVALID;
}

static const char *event_canonical(event_kind k)
{
    switch (k) {
        case EV_OK:          return "ok";
        case EV_HOME:        return "home";
        case EV_WHEEL_LEFT:  return "wheel_left";
        case EV_WHEEL_RIGHT: return "wheel_right";
        case EV_AUDIO_ENDED: return "audio_ended";
        case EV_RESET:       return "reset";
        case EV_INVALID:     break;
    }
    return "invalide";
}

static int usage(const char *argv0)
{
    fprintf(stderr,
            "usage: %s [--verbose] [--seed N] [--quiet] <repertoire-du-pack> <ev1,ev2,...>\n"
            "evenements: ok | home | wheel_left | wheel_right | audio_ended | reset\n"
            "graine    : LUNY_RANDOM_SEED, ou --seed qui la surcharge\n",
            argv0);
    return 2;
}

/* ------------------------------------------------------------------ */

int main(int argc, char **argv)
{
    luny_engine   *engine = NULL;
    luny_options   opts;
    luny_rng       rng;
    luny_pack_view pv;
    luny_status    st;
    const char    *dir    = NULL;
    const char    *list   = NULL;
    char          *events = NULL;
    event_kind    *kinds  = NULL;
    int            count  = 0;
    int            argi   = 1;
    int            verbose = 0;
    int            i;
    unsigned int   seed = 0u;
    int            seed_given = 0;
    const char    *env_seed;
    char          *cursor;
    int            rc = 0;

    /* La graine d'environnement s'applique avant l'analyse des options. */
    env_seed = getenv("LUNY_RANDOM_SEED");
    if (env_seed != NULL && env_seed[0] != '\0') {
        char *end = NULL;
        unsigned long v = strtoul(env_seed, &end, 10);
        if (end != NULL && *end == '\0') {
            seed       = (unsigned int)v;
            seed_given = 1;
        } else {
            fprintf(stderr, "avertissement: LUNY_RANDOM_SEED=\"%s\" illisible, ignoree\n",
                    env_seed);
        }
    }

    while (argi < argc && argv[argi][0] == '-' && argv[argi][1] == '-') {
        if (strcmp(argv[argi], "--seed") == 0) {
            if (argi + 1 >= argc) {
                return usage(argv[0]);
            }
            seed       = (unsigned int)strtoul(argv[argi + 1], NULL, 10);
            seed_given = 1;
            argi += 2;
        } else if (strcmp(argv[argi], "--verbose") == 0) {
            verbose = 1;
            argi++;
        } else if (strcmp(argv[argi], "--quiet") == 0) {
            g_quiet = 1;
            argi++;
        } else {
            return usage(argv[0]);
        }
    }

    if (argi >= argc) {
        return usage(argv[0]);
    }
    dir = argv[argi++];

    /*
     * Liste d'evenements : un seul argument separe par des virgules. Les
     * arguments suivants sont acceptes et concatenes, ce qui laisse
     * fonctionner l'ancienne forme "ok right ok".
     */
    if (argi < argc) {
        size_t total = 0u;
        for (i = argi; i < argc; i++) {
            total += strlen(argv[i]) + 1u;
        }
        events = (char *)malloc(total + 1u);
        if (events == NULL) {
            fprintf(stderr, "erreur: memoire insuffisante\n");
            return 1;
        }
        events[0] = '\0';
        for (i = argi; i < argc; i++) {
            if (i > argi) {
                strcat(events, ",");
            }
            strcat(events, argv[i]);
        }
        list = events;
    }

    /*
     * Analyse complete avant execution : un nom invalide doit echouer sans
     * avoir rien ecrit sur stdout.
     */
    if (list != NULL && list[0] != '\0') {
        int   cap = 0;
        char *tok;

        for (i = 0; list[i] != '\0'; i++) {
            if (list[i] == ',') {
                cap++;
            }
        }
        cap += 1;
        kinds = (event_kind *)malloc((size_t)cap * sizeof(event_kind));
        if (kinds == NULL) {
            free(events);
            fprintf(stderr, "erreur: memoire insuffisante\n");
            return 1;
        }

        cursor = events;
        tok    = strtok(cursor, ",");
        while (tok != NULL) {
            event_kind k = event_from_name(tok);
            if (k == EV_INVALID) {
                fprintf(stderr, "erreur: evenement inconnu \"%s\"\n", tok);
                free(kinds);
                free(events);
                return usage(argv[0]);
            }
            kinds[count++] = k;
            tok = strtok(NULL, ",");
        }
    }

    luny_options_init(&opts);
    opts.log = cli_log;
    if (seed_given) {
        luny_rng_seed(&rng, seed);
        opts.rng     = luny_rng_next;
        opts.rng_ctx = &rng;
    }

    st = luny_open(dir, &opts, &engine);
    if (st != LUNY_OK) {
        fprintf(stderr, "erreur: chargement de \"%s\" impossible (%s)\n",
                dir, luny_status_str(st));
        free(kinds);
        free(events);
        return 1;
    }

    /* En-tete et ligne de chargement : mode --verbose uniquement. */
    if (verbose) {
        if (luny_pack_info(engine, &pv)) {
            printf("pack title=");
            print_quoted(pv.title);
            printf(" version=%d nightMode=%d stages=%d actions=%d entry=%s\n",
                   pv.version, pv.night_mode_available, pv.stage_count, pv.action_count,
                   (pv.uuid != NULL) ? pv.uuid : "-");
        }
        print_text(engine, 0, "load", "ACCEPTED");
    }

    for (i = 0; i < count; i++) {
        luny_event_status es;

        switch (kinds[i]) {
            case EV_OK:          es = luny_ok(engine);          break;
            case EV_HOME:        es = luny_home(engine);        break;
            case EV_WHEEL_LEFT:  es = luny_wheel_left(engine);  break;
            case EV_WHEEL_RIGHT: es = luny_wheel_right(engine); break;
            case EV_AUDIO_ENDED: es = luny_audio_ended(engine); break;
            case EV_RESET:
                luny_reset(engine);
                es = LUNY_EVENT_ACCEPTED;
                break;
            default:
                es = LUNY_EVENT_IGNORED_NO_PACK;
                break;
        }

        if (verbose) {
            print_text(engine, i + 1, event_canonical(kinds[i]), luny_event_status_str(es));
        } else {
            print_json(engine, event_canonical(kinds[i]), luny_event_status_str(es));
        }
    }

    luny_close(engine);
    free(kinds);
    free(events);
    return rc;
}
