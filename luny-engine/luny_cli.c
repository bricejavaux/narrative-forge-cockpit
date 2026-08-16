/*
 * luny_cli.c -- pilote en ligne de commande du moteur Luny.
 *
 * Usage :
 *     luny_cli [--seed N] [--quiet] <repertoire-du-pack> [evenement...]
 *
 * Evenements acceptes : ok, home, left (wheel_left), right (wheel_right),
 *                       ended (audio_ended), reset
 *
 * Sortie : une ligne "step=..." par evenement sur stdout, format cle=valeur
 * stable et diffable. Les avertissements du moteur vont sur stderr.
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

/* Echappe les guillemets et les retours ligne pour garder une sortie sur une ligne. */
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

static void print_state(const luny_engine *e, int step, const char *event, const char *status)
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

static int usage(const char *argv0)
{
    fprintf(stderr,
            "usage: %s [--seed N] [--quiet] <repertoire-du-pack> [evenement...]\n"
            "evenements: ok | home | left | right | ended | reset\n",
            argv0);
    return 2;
}

int main(int argc, char **argv)
{
    luny_engine  *engine = NULL;
    luny_options  opts;
    luny_rng rng;
    luny_pack_view pv;
    luny_status   st;
    const char   *dir = NULL;
    int           argi = 1;
    int           step = 0;
    int           i;
    unsigned int  seed = 1u;
    int           seed_given = 0;

    while (argi < argc && argv[argi][0] == '-' && argv[argi][1] == '-') {
        if (strcmp(argv[argi], "--seed") == 0) {
            if (argi + 1 >= argc) {
                return usage(argv[0]);
            }
            seed       = (unsigned int)strtoul(argv[argi + 1], NULL, 10);
            seed_given = 1;
            argi += 2;
        } else if (strcmp(argv[argi], "--quiet") == 0) {
            g_quiet = 1;
            argi++;
        } else if (strcmp(argv[argi], "--help") == 0) {
            return usage(argv[0]);
        } else {
            return usage(argv[0]);
        }
    }

    if (argi >= argc) {
        return usage(argv[0]);
    }
    dir = argv[argi++];

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
        return 1;
    }

    if (luny_pack_info(engine, &pv)) {
        printf("pack title=");
        print_quoted(pv.title);
        printf(" version=%d nightMode=%d stages=%d actions=%d entry=%s\n",
               pv.version, pv.night_mode_available, pv.stage_count, pv.action_count,
               (pv.uuid != NULL) ? pv.uuid : "-");
    }

    print_state(engine, step, "load", "ACCEPTED");

    for (i = argi; i < argc; i++) {
        const char       *ev = argv[i];
        luny_event_status es;

        step++;

        if (strcmp(ev, "ok") == 0) {
            es = luny_ok(engine);
        } else if (strcmp(ev, "home") == 0) {
            es = luny_home(engine);
        } else if (strcmp(ev, "left") == 0 || strcmp(ev, "wheel_left") == 0) {
            es = luny_wheel_left(engine);
            ev = "left";
        } else if (strcmp(ev, "right") == 0 || strcmp(ev, "wheel_right") == 0) {
            es = luny_wheel_right(engine);
            ev = "right";
        } else if (strcmp(ev, "ended") == 0 || strcmp(ev, "audio_ended") == 0) {
            es = luny_audio_ended(engine);
            ev = "ended";
        } else if (strcmp(ev, "reset") == 0) {
            luny_reset(engine);
            es = LUNY_EVENT_ACCEPTED;
        } else {
            fprintf(stderr, "erreur: evenement inconnu \"%s\"\n", ev);
            luny_close(engine);
            return usage(argv[0]);
        }

        print_state(engine, step, ev, luny_event_status_str(es));
    }

    luny_close(engine);
    return 0;
}
