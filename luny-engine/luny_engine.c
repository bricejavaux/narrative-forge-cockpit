/*
 * luny_engine.c -- implementation. C99 pur, aucune dependance hors cJSON.
 *
 * Aucun appel POSIX : l'existence d'un asset est testee via fopen(), ce qui
 * evite toute macro de feature-test et garde le fichier strictement C99.
 */

#include "luny_engine.h"
#include "cjson/cJSON.h"

#include <limits.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ------------------------------------------------------------------ */
/* Modele interne                                                     */
/* ------------------------------------------------------------------ */

typedef struct {
    int   present;       /* 0 -> transition nulle ou absente          */
    char *action_id;     /* identifiant brut lu dans story.json       */
    int   action_ref;    /* index dans engine->actions, -1 si pendant */
    int   option_index;  /* normalise apres resolution                */
    int   random;        /* 1 si optionIndex valait -1                */
} transition_t;

typedef struct {
    char         *uuid;
    char         *name;
    char         *type;
    char         *image;
    char         *audio;
    luny_controls controls;
    int           square_one;
    transition_t  ok;
    transition_t  home;
} stage_t;

typedef struct {
    char  *id;
    char  *name;
    char **option_uuid;  /* uuid brut, NULL si littéral null / non-chaine */
    int   *option_ref;   /* index dans engine->stages, -1 si non resolu   */
    int    option_count;
} action_t;

struct luny_engine {
    char *dir;

    char *title;
    char *description;
    int   version;
    int   night_mode_available;

    stage_t  *stages;
    int       stage_count;
    action_t *actions;
    int       action_count;

    int entry;       /* index du noeud d'entree                     */
    int current;     /* index du noeud courant, -1 si aucun         */
    int action_ctx;  /* index du contexte ActionNode, -1 si aucun   */
    int action_idx;  /* index d'option courant, -1 si aucun         */

    luny_options  opts;
    luny_rng fallback_rng;
};

/* ------------------------------------------------------------------ */
/* Utilitaires                                                        */
/* ------------------------------------------------------------------ */

const char *luny_status_str(luny_status s)
{
    switch (s) {
        case LUNY_OK:            return "OK";
        case LUNY_ERR_ARG:       return "ERR_ARG";
        case LUNY_ERR_IO:        return "ERR_IO";
        case LUNY_ERR_JSON:      return "ERR_JSON";
        case LUNY_ERR_NO_VERSION:return "ERR_NO_VERSION";
        case LUNY_ERR_NO_STAGE:  return "ERR_NO_STAGE";
        case LUNY_ERR_MEMORY:    return "ERR_MEMORY";
    }
    return "ERR_UNKNOWN";
}

const char *luny_event_status_str(luny_event_status s)
{
    switch (s) {
        case LUNY_EVENT_ACCEPTED:                  return "ACCEPTED";
        case LUNY_EVENT_IGNORED_CONTROL_DISABLED:  return "IGNORED_CONTROL_DISABLED";
        case LUNY_EVENT_IGNORED_NO_TRANSITION:     return "IGNORED_NO_TRANSITION";
        case LUNY_EVENT_IGNORED_DANGLING_ACTION:   return "IGNORED_DANGLING_ACTION";
        case LUNY_EVENT_IGNORED_DANGLING_OPTION:   return "IGNORED_DANGLING_OPTION";
        case LUNY_EVENT_IGNORED_NO_ACTION_CONTEXT: return "IGNORED_NO_ACTION_CONTEXT";
        case LUNY_EVENT_IGNORED_EMPTY_OPTIONS:     return "IGNORED_EMPTY_OPTIONS";
        case LUNY_EVENT_IGNORED_NO_PACK:           return "IGNORED_NO_PACK";
    }
    return "IGNORED_UNKNOWN";
}

static char *dup_str(const char *s)
{
    size_t n;
    char  *p;
    if (s == NULL) {
        return NULL;
    }
    n = strlen(s) + 1u;
    p = (char *)malloc(n);
    if (p != NULL) {
        memcpy(p, s, n);
    }
    return p;
}

static void engine_log(const luny_engine *e, luny_log_level lvl, const char *fmt, ...)
{
    char    buf[512];
    va_list ap;

    if (e == NULL || e->opts.log == NULL) {
        return;
    }
    va_start(ap, fmt);
    vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    e->opts.log(e->opts.log_ctx, lvl, buf);
}

/* ------------------------------------------------------------------ */
/* Generateur aleatoire                                               */
/* ------------------------------------------------------------------ */

void luny_rng_seed(luny_rng *rng, unsigned int seed)
{
    if (rng != NULL) {
        rng->state = seed;
    }
}

/* splitmix32 : un seul pas suffit a bien disperser, meme depuis une graine 1. */
static unsigned int rng_raw(luny_rng *rng)
{
    unsigned int z;

    rng->state += 0x9E3779B9u;
    z = rng->state;
    z = (z ^ (z >> 16)) * 0x85EBCA6Bu;
    z = (z ^ (z >> 13)) * 0xC2B2AE35u;
    z = z ^ (z >> 16);
    return z;
}

unsigned int luny_rng_next(void *ctx, unsigned int bound)
{
    luny_rng    *rng = (luny_rng *)ctx;
    unsigned int zone;
    unsigned int r;

    if (rng == NULL || bound == 0u) {
        return 0u;
    }
    /* Echantillonnage par rejet : elimine le biais du modulo. */
    zone = UINT_MAX - (UINT_MAX % bound);
    do {
        r = rng_raw(rng);
    } while (r >= zone);

    return r % bound;
}

void luny_options_init(luny_options *opts)
{
    if (opts != NULL) {
        opts->rng     = NULL;
        opts->rng_ctx = NULL;
        opts->log     = NULL;
        opts->log_ctx = NULL;
    }
}

static unsigned int engine_random(luny_engine *e, unsigned int bound)
{
    if (bound == 0u) {
        return 0u;
    }
    if (e->opts.rng != NULL) {
        unsigned int v = e->opts.rng(e->opts.rng_ctx, bound);
        return (v >= bound) ? (bound - 1u) : v;
    }
    return luny_rng_next(&e->fallback_rng, bound);
}

/* ------------------------------------------------------------------ */
/* Lecture fichier + tolerance d'encodage                             */
/* ------------------------------------------------------------------ */

static char *read_whole_file(const char *path, size_t *out_len)
{
    FILE  *f;
    long   sz;
    size_t got;
    char  *buf;

    f = fopen(path, "rb");
    if (f == NULL) {
        return NULL;
    }
    if (fseek(f, 0L, SEEK_END) != 0) {
        fclose(f);
        return NULL;
    }
    sz = ftell(f);
    if (sz < 0L) {
        fclose(f);
        return NULL;
    }
    rewind(f);

    buf = (char *)malloc((size_t)sz + 1u);
    if (buf == NULL) {
        fclose(f);
        return NULL;
    }
    got = fread(buf, 1u, (size_t)sz, f);
    fclose(f);
    buf[got] = '\0';
    if (out_len != NULL) {
        *out_len = got;
    }
    return buf;
}

/* Validation UTF-8 stricte. */
static int utf8_is_valid(const unsigned char *s, size_t n)
{
    size_t i = 0u;

    while (i < n) {
        unsigned char c = s[i];
        size_t        extra;
        unsigned int  cp;
        size_t        k;

        if (c < 0x80u) {
            i++;
            continue;
        } else if ((c & 0xE0u) == 0xC0u) {
            extra = 1u; cp = c & 0x1Fu;
        } else if ((c & 0xF0u) == 0xE0u) {
            extra = 2u; cp = c & 0x0Fu;
        } else if ((c & 0xF8u) == 0xF0u) {
            extra = 3u; cp = c & 0x07u;
        } else {
            return 0;
        }
        if (i + extra >= n) {
            return 0; /* sequence tronquee en fin de tampon */
        }
        for (k = 1u; k <= extra; k++) {
            unsigned char cc = s[i + k];
            if ((cc & 0xC0u) != 0x80u) {
                return 0;
            }
            cp = (cp << 6) | (unsigned int)(cc & 0x3Fu);
        }
        /* surlongs, surrogates, hors plage */
        if (extra == 1u && cp < 0x80u)    return 0;
        if (extra == 2u && cp < 0x800u)   return 0;
        if (extra == 3u && cp < 0x10000u) return 0;
        if (cp > 0x10FFFFu)               return 0;
        if (cp >= 0xD800u && cp <= 0xDFFFu) return 0;
        i += extra + 1u;
    }
    return 1;
}

/*
 * Repli tolerant : le format ne specifie pas l'encodage (charset par defaut de
 * la JVM des deux cotes). Si le contenu n'est pas de l'UTF-8 valide, on le
 * reinterprete en Latin-1 et on le transcode, ce qui ne peut pas echouer.
 */
static char *latin1_to_utf8(const unsigned char *s, size_t n, size_t *out_len)
{
    size_t i;
    size_t need = 0u;
    char  *out;
    size_t w = 0u;

    for (i = 0u; i < n; i++) {
        need += (s[i] < 0x80u) ? 1u : 2u;
    }
    out = (char *)malloc(need + 1u);
    if (out == NULL) {
        return NULL;
    }
    for (i = 0u; i < n; i++) {
        if (s[i] < 0x80u) {
            out[w++] = (char)s[i];
        } else {
            out[w++] = (char)(0xC0u | (s[i] >> 6));
            out[w++] = (char)(0x80u | (s[i] & 0x3Fu));
        }
    }
    out[w] = '\0';
    if (out_len != NULL) {
        *out_len = w;
    }
    return out;
}

/* ------------------------------------------------------------------ */
/* Acces JSON tolerants                                               */
/* ------------------------------------------------------------------ */

static const char *json_str(const cJSON *obj, const char *key)
{
    const cJSON *it = cJSON_GetObjectItemCaseSensitive(obj, key);
    if (cJSON_IsString(it) && it->valuestring != NULL) {
        return it->valuestring;
    }
    return NULL;
}

static int json_bool(const cJSON *obj, const char *key, int dflt, int *found)
{
    const cJSON *it = cJSON_GetObjectItemCaseSensitive(obj, key);
    if (found != NULL) {
        *found = 0;
    }
    if (cJSON_IsBool(it)) {
        if (found != NULL) {
            *found = 1;
        }
        return cJSON_IsTrue(it) ? 1 : 0;
    }
    /* tolerance : 0 / 1 numeriques */
    if (cJSON_IsNumber(it)) {
        if (found != NULL) {
            *found = 1;
        }
        return (it->valuedouble != 0.0) ? 1 : 0;
    }
    return dflt;
}

/* Renvoie 1 si un entier exploitable a ete trouve. */
static int json_int(const cJSON *obj, const char *key, int *out)
{
    const cJSON *it = cJSON_GetObjectItemCaseSensitive(obj, key);

    if (cJSON_IsNumber(it)) {
        *out = (int)it->valuedouble;
        return 1;
    }
    if (cJSON_IsString(it) && it->valuestring != NULL) {
        char *end = NULL;
        long  v   = strtol(it->valuestring, &end, 10);
        if (end != NULL && end != it->valuestring && *end == '\0') {
            *out = (int)v;
            return 1;
        }
    }
    return 0;
}

/* ------------------------------------------------------------------ */
/* Assets                                                             */
/* ------------------------------------------------------------------ */

typedef enum { ASSET_IMAGE, ASSET_AUDIO } asset_kind;

static void lower_ascii(char *s)
{
    size_t i;
    for (i = 0u; s[i] != '\0'; i++) {
        if (s[i] >= 'A' && s[i] <= 'Z') {
            s[i] = (char)(s[i] - 'A' + 'a');
        }
    }
}

static int ext_matches_kind(const char *ext_lower, asset_kind kind)
{
    if (kind == ASSET_IMAGE) {
        return (strcmp(ext_lower, ".bmp") == 0)
            || (strcmp(ext_lower, ".png") == 0)
            || (strcmp(ext_lower, ".jpg") == 0)
            || (strcmp(ext_lower, ".jpeg") == 0);
    }
    return (strcmp(ext_lower, ".wav") == 0)
        || (strcmp(ext_lower, ".mp3") == 0)
        || (strcmp(ext_lower, ".ogg") == 0)
        || (strcmp(ext_lower, ".oga") == 0);
}

static int asset_file_exists(const luny_engine *e, const char *name)
{
    char  *path;
    size_t need;
    FILE  *f;

    need = strlen(e->dir) + strlen("/assets/") + strlen(name) + 1u;
    path = (char *)malloc(need);
    if (path == NULL) {
        return 0;
    }
    sprintf(path, "%s/assets/%s", e->dir, name);
    f = fopen(path, "rb");
    free(path);
    if (f != NULL) {
        fclose(f);
        return 1;
    }
    return 0;
}

/*
 * Valide un nom d'asset. Renvoie une copie allouee, ou NULL si l'asset doit
 * etre ignore (nom sans point, extension inconnue, fichier absent).
 */
static char *validate_asset(luny_engine *e, const char *name, asset_kind kind,
                            const char *node_uuid)
{
    const char *dot;
    char        ext[16];
    size_t      ext_len;

    if (name == NULL || name[0] == '\0') {
        return NULL;
    }

    dot = strrchr(name, '.');
    if (dot == NULL) {
        /* Le reader Java leverait ici une StringIndexOutOfBoundsException. */
        engine_log(e, LUNY_LOG_WARN,
                   "asset sans extension ignore : \"%s\" (noeud %s)", name, node_uuid);
        return NULL;
    }

    ext_len = strlen(dot);
    if (ext_len >= sizeof ext) {
        engine_log(e, LUNY_LOG_WARN,
                   "extension d'asset trop longue, ignoree : \"%s\" (noeud %s)", name, node_uuid);
        return NULL;
    }
    memcpy(ext, dot, ext_len + 1u);
    lower_ascii(ext);

    if (!ext_matches_kind(ext, kind)) {
        engine_log(e, LUNY_LOG_WARN,
                   "extension \"%s\" non reconnue pour un asset %s, ignoree : \"%s\" (noeud %s)",
                   ext, (kind == ASSET_IMAGE) ? "image" : "audio", name, node_uuid);
        return NULL;
    }

    if (!asset_file_exists(e, name)) {
        engine_log(e, LUNY_LOG_WARN,
                   "asset reference mais absent de assets/ : \"%s\" (noeud %s)", name, node_uuid);
        return NULL;
    }

    return dup_str(name);
}

/* ------------------------------------------------------------------ */
/* Parsing des transitions                                            */
/* ------------------------------------------------------------------ */

static void transition_init(transition_t *t)
{
    t->present      = 0;
    t->action_id    = NULL;
    t->action_ref   = -1;
    t->option_index = 0;
    t->random       = 0;
}

static void parse_transition(luny_engine *e, const cJSON *node, const char *key,
                             transition_t *t, const char *node_uuid)
{
    const cJSON *obj = cJSON_GetObjectItemCaseSensitive(node, key);
    const char  *id;
    int          idx = 0;

    transition_init(t);

    if (!cJSON_IsObject(obj)) {
        return; /* null, absent, ou type inattendu -> pas de transition */
    }
    id = json_str(obj, "actionNode");
    if (id == NULL) {
        engine_log(e, LUNY_LOG_WARN,
                   "%s sans champ actionNode exploitable (noeud %s) : transition ignoree",
                   key, node_uuid);
        return;
    }
    if (!json_int(obj, "optionIndex", &idx)) {
        engine_log(e, LUNY_LOG_WARN,
                   "%s sans optionIndex exploitable (noeud %s) : index 0 retenu",
                   key, node_uuid);
        idx = 0;
    }

    t->present   = 1;
    t->action_id = dup_str(id);
    if (idx == -1) {
        t->random       = 1;
        t->option_index = 0;
    } else {
        t->option_index = idx;
    }
}

/* ------------------------------------------------------------------ */
/* Chargement                                                         */
/* ------------------------------------------------------------------ */

static int parse_control_settings(luny_engine *e, const cJSON *node,
                                  luny_controls *out, const char *node_uuid)
{
    const cJSON *cs = cJSON_GetObjectItemCaseSensitive(node, "controlSettings");
    int          found;

    if (!cJSON_IsObject(cs)) {
        return 0; /* noeud refuse */
    }

    out->wheel = json_bool(cs, "wheel", 0, &found);
    if (!found) {
        engine_log(e, LUNY_LOG_WARN,
                   "controlSettings.wheel absent (noeud %s) : faux retenu", node_uuid);
    }
    out->ok = json_bool(cs, "ok", 0, &found);
    if (!found) {
        engine_log(e, LUNY_LOG_WARN,
                   "controlSettings.ok absent (noeud %s) : faux retenu", node_uuid);
    }
    out->home = json_bool(cs, "home", 0, &found);
    if (!found) {
        engine_log(e, LUNY_LOG_WARN,
                   "controlSettings.home absent (noeud %s) : faux retenu", node_uuid);
    }
    out->pause = json_bool(cs, "pause", 0, &found);
    if (!found) {
        engine_log(e, LUNY_LOG_WARN,
                   "controlSettings.pause absent (noeud %s) : faux retenu", node_uuid);
    }
    out->autoplay = json_bool(cs, "autoplay", 0, &found);
    if (!found) {
        engine_log(e, LUNY_LOG_WARN,
                   "controlSettings.autoplay absent (noeud %s) : faux retenu", node_uuid);
    }
    return 1;
}

static luny_status parse_stage_nodes(luny_engine *e, const cJSON *root)
{
    const cJSON *arr = cJSON_GetObjectItemCaseSensitive(root, "stageNodes");
    const cJSON *it;
    int          n;
    int          w = 0;

    if (!cJSON_IsArray(arr)) {
        return LUNY_ERR_NO_STAGE;
    }
    n = cJSON_GetArraySize(arr);
    if (n <= 0) {
        return LUNY_ERR_NO_STAGE;
    }

    e->stages = (stage_t *)calloc((size_t)n, sizeof(stage_t));
    if (e->stages == NULL) {
        return LUNY_ERR_MEMORY;
    }

    cJSON_ArrayForEach(it, arr) {
        stage_t    *s;
        const char *uuid;
        const char *img;
        const char *aud;

        if (!cJSON_IsObject(it)) {
            engine_log(e, LUNY_LOG_WARN, "element de stageNodes non-objet : ignore");
            continue;
        }
        uuid = json_str(it, "uuid");
        if (uuid == NULL) {
            engine_log(e, LUNY_LOG_WARN, "StageNode sans uuid : noeud refuse");
            continue;
        }

        s = &e->stages[w];
        memset(s, 0, sizeof *s);

        if (!parse_control_settings(e, it, &s->controls, uuid)) {
            engine_log(e, LUNY_LOG_WARN,
                       "StageNode %s sans controlSettings : noeud refuse", uuid);
            continue;
        }

        s->uuid = dup_str(uuid);
        if (s->uuid == NULL) {
            return LUNY_ERR_MEMORY;
        }
        s->name = dup_str(json_str(it, "name"));
        s->type = dup_str(json_str(it, "type"));

        s->square_one = json_bool(it, "squareOne", 0, NULL);

        img = json_str(it, "image");
        aud = json_str(it, "audio");
        s->image = validate_asset(e, img, ASSET_IMAGE, uuid);
        s->audio = validate_asset(e, aud, ASSET_AUDIO, uuid);

        parse_transition(e, it, "okTransition",   &s->ok,   uuid);
        parse_transition(e, it, "homeTransition", &s->home, uuid);

        w++;
    }

    e->stage_count = w;
    if (w == 0) {
        return LUNY_ERR_NO_STAGE;
    }
    return LUNY_OK;
}

static luny_status parse_action_nodes(luny_engine *e, const cJSON *root)
{
    const cJSON *arr = cJSON_GetObjectItemCaseSensitive(root, "actionNodes");
    const cJSON *it;
    int          n;
    int          w = 0;

    if (!cJSON_IsArray(arr)) {
        engine_log(e, LUNY_LOG_WARN,
                   "actionNodes absent ou non-tableau : aucune transition ne pourra aboutir");
        e->actions      = NULL;
        e->action_count = 0;
        return LUNY_OK;
    }
    n = cJSON_GetArraySize(arr);
    if (n <= 0) {
        e->actions      = NULL;
        e->action_count = 0;
        return LUNY_OK;
    }

    e->actions = (action_t *)calloc((size_t)n, sizeof(action_t));
    if (e->actions == NULL) {
        return LUNY_ERR_MEMORY;
    }

    cJSON_ArrayForEach(it, arr) {
        action_t    *a;
        const char  *id;
        const cJSON *opts;
        const cJSON *opt;
        int          cnt;
        int          k = 0;

        if (!cJSON_IsObject(it)) {
            engine_log(e, LUNY_LOG_WARN, "element de actionNodes non-objet : ignore");
            continue;
        }
        id = json_str(it, "id");
        if (id == NULL) {
            engine_log(e, LUNY_LOG_WARN, "ActionNode sans id : noeud ignore");
            continue;
        }

        a = &e->actions[w];
        memset(a, 0, sizeof *a);
        a->id   = dup_str(id);
        a->name = dup_str(json_str(it, "name"));
        if (a->id == NULL) {
            return LUNY_ERR_MEMORY;
        }

        opts = cJSON_GetObjectItemCaseSensitive(it, "options");
        cnt  = cJSON_IsArray(opts) ? cJSON_GetArraySize(opts) : 0;
        if (!cJSON_IsArray(opts)) {
            engine_log(e, LUNY_LOG_WARN,
                       "ActionNode %s sans tableau options : liste vide retenue", id);
        }

        if (cnt > 0) {
            a->option_uuid = (char **)calloc((size_t)cnt, sizeof(char *));
            a->option_ref  = (int *)malloc((size_t)cnt * sizeof(int));
            if (a->option_uuid == NULL || a->option_ref == NULL) {
                return LUNY_ERR_MEMORY;
            }
            cJSON_ArrayForEach(opt, opts) {
                a->option_ref[k] = -1;
                if (cJSON_IsString(opt) && opt->valuestring != NULL) {
                    a->option_uuid[k] = dup_str(opt->valuestring);
                } else {
                    /*
                     * Littéral null (le writer JavaScript en produit pour une
                     * sortie non connectee) ou type inattendu : l'emplacement est
                     * conserve pour ne pas decaler les index, mais reste non resolu.
                     */
                    a->option_uuid[k] = NULL;
                    engine_log(e, LUNY_LOG_WARN,
                               "ActionNode %s : option #%d nulle, emplacement conserve non resolu",
                               id, k);
                }
                k++;
            }
        }
        a->option_count = cnt;
        w++;
    }

    e->action_count = w;
    return LUNY_OK;
}

static int find_stage(const luny_engine *e, const char *uuid)
{
    int i;
    if (uuid == NULL) {
        return -1;
    }
    for (i = 0; i < e->stage_count; i++) {
        if (e->stages[i].uuid != NULL && strcmp(e->stages[i].uuid, uuid) == 0) {
            return i;
        }
    }
    return -1;
}

static int find_action(const luny_engine *e, const char *id)
{
    int i;
    if (id == NULL) {
        return -1;
    }
    for (i = 0; i < e->action_count; i++) {
        if (e->actions[i].id != NULL && strcmp(e->actions[i].id, id) == 0) {
            return i;
        }
    }
    return -1;
}

/*
 * Seconde passe : les ActionNode sont resolus une fois tous les StageNode lus,
 * ce qui autorise cycles et references avant.
 */
static void resolve_options(luny_engine *e)
{
    int i;
    int k;

    for (i = 0; i < e->action_count; i++) {
        action_t *a = &e->actions[i];
        for (k = 0; k < a->option_count; k++) {
            if (a->option_uuid[k] == NULL) {
                continue; /* deja journalise */
            }
            a->option_ref[k] = find_stage(e, a->option_uuid[k]);
            if (a->option_ref[k] < 0) {
                engine_log(e, LUNY_LOG_WARN,
                           "ActionNode %s : option #%d designe un uuid inconnu (%s), non resolue",
                           a->id, k, a->option_uuid[k]);
            }
        }
    }
}

static void resolve_transition(luny_engine *e, transition_t *t, const char *node_uuid,
                               const char *what)
{
    const action_t *a;

    if (!t->present) {
        return;
    }
    t->action_ref = find_action(e, t->action_id);
    if (t->action_ref < 0) {
        engine_log(e, LUNY_LOG_WARN,
                   "%s du noeud %s designe un actionNode inconnu (%s) : transition inoperante",
                   what, node_uuid, t->action_id);
        return;
    }

    a = &e->actions[t->action_ref];
    if (t->random) {
        return; /* index tire a l'execution */
    }
    if (a->option_count <= 0) {
        engine_log(e, LUNY_LOG_WARN,
                   "%s du noeud %s cible l'ActionNode %s qui n'a aucune option",
                   what, node_uuid, a->id);
        t->option_index = 0;
        return;
    }
    if (t->option_index < 0) {
        /* -1 a deja ete converti en random ; toute autre valeur negative. */
        engine_log(e, LUNY_LOG_WARN,
                   "%s du noeud %s : optionIndex negatif (%d) hors du cas -1, index 0 retenu",
                   what, node_uuid, t->option_index);
        t->option_index = 0;
    } else if (t->option_index >= a->option_count) {
        engine_log(e, LUNY_LOG_WARN,
                   "%s du noeud %s : optionIndex %d hors bornes (%d options), borne a %d",
                   what, node_uuid, t->option_index, a->option_count, a->option_count - 1);
        t->option_index = a->option_count - 1;
    }
}

static void resolve_transitions(luny_engine *e)
{
    int i;
    for (i = 0; i < e->stage_count; i++) {
        resolve_transition(e, &e->stages[i].ok,   e->stages[i].uuid, "okTransition");
        resolve_transition(e, &e->stages[i].home, e->stages[i].uuid, "homeTransition");
    }
}

static void pick_entry(luny_engine *e)
{
    int i;
    int first = -1;
    int count = 0;

    for (i = 0; i < e->stage_count; i++) {
        if (e->stages[i].square_one) {
            count++;
            if (first < 0) {
                first = i;
            }
        }
    }

    if (count == 0) {
        engine_log(e, LUNY_LOG_WARN,
                   "aucun noeud squareOne : le premier StageNode du tableau (%s) sert d'entree",
                   e->stages[0].uuid);
        e->entry = 0;
        return;
    }
    if (count > 1) {
        engine_log(e, LUNY_LOG_WARN,
                   "%d noeuds squareOne : le premier rencontre (%s) est retenu",
                   count, e->stages[first].uuid);
    }
    e->entry = first;
}

static void free_engine_contents(luny_engine *e)
{
    int i;
    int k;

    if (e == NULL) {
        return;
    }
    for (i = 0; i < e->stage_count; i++) {
        free(e->stages[i].uuid);
        free(e->stages[i].name);
        free(e->stages[i].type);
        free(e->stages[i].image);
        free(e->stages[i].audio);
        free(e->stages[i].ok.action_id);
        free(e->stages[i].home.action_id);
    }
    free(e->stages);

    for (i = 0; i < e->action_count; i++) {
        if (e->actions[i].option_uuid != NULL) {
            for (k = 0; k < e->actions[i].option_count; k++) {
                free(e->actions[i].option_uuid[k]);
            }
        }
        free(e->actions[i].option_uuid);
        free(e->actions[i].option_ref);
        free(e->actions[i].id);
        free(e->actions[i].name);
    }
    free(e->actions);

    free(e->title);
    free(e->description);
    free(e->dir);
}

luny_status luny_open(const char *pack_dir, const luny_options *opts, luny_engine **out)
{
    luny_engine *e;
    char        *raw;
    char        *json_text;
    size_t       len   = 0u;
    size_t       need;
    char        *story_path;
    cJSON       *root;
    luny_status  st;
    int          version = 0;

    if (out == NULL) {
        return LUNY_ERR_ARG;
    }
    *out = NULL;
    if (pack_dir == NULL || pack_dir[0] == '\0') {
        return LUNY_ERR_ARG;
    }

    e = (luny_engine *)calloc(1u, sizeof *e);
    if (e == NULL) {
        return LUNY_ERR_MEMORY;
    }
    if (opts != NULL) {
        e->opts = *opts;
    } else {
        luny_options_init(&e->opts);
    }
    luny_rng_seed(&e->fallback_rng, 0x2545F491u);
    e->current    = -1;
    e->action_ctx = -1;
    e->action_idx = -1;

    e->dir = dup_str(pack_dir);
    if (e->dir == NULL) {
        free(e);
        return LUNY_ERR_MEMORY;
    }

    need       = strlen(pack_dir) + strlen("/story.json") + 1u;
    story_path = (char *)malloc(need);
    if (story_path == NULL) {
        free(e->dir);
        free(e);
        return LUNY_ERR_MEMORY;
    }
    sprintf(story_path, "%s/story.json", pack_dir);

    raw = read_whole_file(story_path, &len);
    free(story_path);
    if (raw == NULL) {
        free(e->dir);
        free(e);
        return LUNY_ERR_IO;
    }

    /* BOM UTF-8 eventuel */
    json_text = raw;
    if (len >= 3u && (unsigned char)raw[0] == 0xEFu
                  && (unsigned char)raw[1] == 0xBBu
                  && (unsigned char)raw[2] == 0xBFu) {
        json_text = raw + 3;
        len -= 3u;
    }

    if (!utf8_is_valid((const unsigned char *)json_text, len)) {
        size_t conv_len = 0u;
        char  *conv     = latin1_to_utf8((const unsigned char *)json_text, len, &conv_len);
        engine_log(e, LUNY_LOG_WARN,
                   "story.json n'est pas de l'UTF-8 valide : repli sur une lecture Latin-1");
        if (conv != NULL) {
            free(raw);
            raw       = conv;
            json_text = conv;
            len       = conv_len;
        }
    }

    root = cJSON_Parse(json_text);
    free(raw);
    if (root == NULL) {
        free(e->dir);
        free(e);
        return LUNY_ERR_JSON;
    }
    if (!cJSON_IsObject(root)) {
        cJSON_Delete(root);
        free(e->dir);
        free(e);
        return LUNY_ERR_JSON;
    }

    /* version : requis. Le reader Java leverait une NullPointerException. */
    if (!json_int(root, "version", &version)) {
        engine_log(e, LUNY_LOG_WARN, "champ version absent ou illisible : pack refuse");
        cJSON_Delete(root);
        free(e->dir);
        free(e);
        return LUNY_ERR_NO_VERSION;
    }
    e->version              = version;
    e->title                = dup_str(json_str(root, "title"));
    e->description          = dup_str(json_str(root, "description"));
    e->night_mode_available = json_bool(root, "nightModeAvailable", 0, NULL);

    st = parse_stage_nodes(e, root);
    if (st != LUNY_OK) {
        cJSON_Delete(root);
        free_engine_contents(e);
        free(e);
        return st;
    }
    st = parse_action_nodes(e, root);
    if (st != LUNY_OK) {
        cJSON_Delete(root);
        free_engine_contents(e);
        free(e);
        return st;
    }
    cJSON_Delete(root);

    resolve_options(e);
    resolve_transitions(e);
    pick_entry(e);

    e->current    = e->entry;
    e->action_ctx = -1;
    e->action_idx = -1;

    *out = e;
    return LUNY_OK;
}

void luny_close(luny_engine *engine)
{
    if (engine == NULL) {
        return;
    }
    free_engine_contents(engine);
    free(engine);
}

void luny_reset(luny_engine *engine)
{
    if (engine == NULL) {
        return;
    }
    engine->current    = engine->entry;
    engine->action_ctx = -1;
    engine->action_idx = -1;
}

/* ------------------------------------------------------------------ */
/* Etat courant                                                       */
/* ------------------------------------------------------------------ */

int luny_current_stage(const luny_engine *engine, luny_stage_view *out)
{
    const stage_t *s;

    if (engine == NULL || out == NULL) {
        return 0;
    }
    if (engine->current < 0 || engine->current >= engine->stage_count) {
        return 0;
    }
    s = &engine->stages[engine->current];

    out->uuid       = s->uuid;
    out->name       = s->name;
    out->type       = s->type;
    out->image      = s->image;
    out->audio      = s->audio;
    out->controls   = s->controls;
    out->square_one = s->square_one;
    return 1;
}

int luny_current_action(const luny_engine *engine, luny_action_view *out)
{
    const action_t *a;

    if (engine == NULL || out == NULL) {
        return 0;
    }
    if (engine->action_ctx < 0 || engine->action_ctx >= engine->action_count) {
        return 0;
    }
    a = &engine->actions[engine->action_ctx];

    out->action_id    = a->id;
    out->index        = engine->action_idx;
    out->option_count = a->option_count;
    return 1;
}

int luny_pack_info(const luny_engine *engine, luny_pack_view *out)
{
    if (engine == NULL || out == NULL) {
        return 0;
    }
    out->title                = engine->title;
    out->description          = engine->description;
    out->version              = engine->version;
    out->night_mode_available = engine->night_mode_available;
    out->stage_count          = engine->stage_count;
    out->action_count         = engine->action_count;
    out->uuid                 = (engine->entry >= 0 && engine->entry < engine->stage_count)
                                    ? engine->stages[engine->entry].uuid
                                    : NULL;
    return 1;
}

int luny_asset_path(const luny_engine *engine, const char *asset_name,
                    char *buf, size_t buf_size)
{
    int n;

    if (engine == NULL || asset_name == NULL) {
        return -1;
    }
    n = snprintf(buf, buf_size, "%s/assets/%s", engine->dir, asset_name);
    return n;
}

/* ------------------------------------------------------------------ */
/* Machine a etats                                                    */
/* ------------------------------------------------------------------ */

/*
 * Entree dans un ActionNode : positionne l'index courant sur optionIndex (ou
 * tire au hasard si le port aleatoire etait vise), puis entre dans le StageNode
 * options[index]. Si cette option n'est pas resolue, l'etat reste inchange.
 */
static luny_event_status follow_transition(luny_engine *e, const transition_t *t)
{
    const action_t *a;
    int             index;
    int             target;

    if (!t->present) {
        return LUNY_EVENT_IGNORED_NO_TRANSITION;
    }
    if (t->action_ref < 0) {
        return LUNY_EVENT_IGNORED_DANGLING_ACTION;
    }

    a = &e->actions[t->action_ref];
    if (a->option_count <= 0) {
        return LUNY_EVENT_IGNORED_EMPTY_OPTIONS;
    }

    if (t->random) {
        index = (int)engine_random(e, (unsigned int)a->option_count);
    } else {
        index = t->option_index;
    }
    if (index < 0) {
        index = 0;
    }
    if (index >= a->option_count) {
        index = a->option_count - 1;
    }

    target = a->option_ref[index];
    if (target < 0) {
        engine_log(e, LUNY_LOG_WARN,
                   "ActionNode %s : option #%d non resolue, etat inchange", a->id, index);
        return LUNY_EVENT_IGNORED_DANGLING_OPTION;
    }

    e->current    = target;
    e->action_ctx = t->action_ref;
    e->action_idx = index;
    return LUNY_EVENT_ACCEPTED;
}

luny_event_status luny_ok(luny_engine *engine)
{
    const stage_t *s;

    if (engine == NULL || engine->current < 0) {
        return LUNY_EVENT_IGNORED_NO_PACK;
    }
    s = &engine->stages[engine->current];
    if (!s->controls.ok) {
        return LUNY_EVENT_IGNORED_CONTROL_DISABLED;
    }
    return follow_transition(engine, &s->ok);
}

luny_event_status luny_audio_ended(luny_engine *engine)
{
    const stage_t *s;

    if (engine == NULL || engine->current < 0) {
        return LUNY_EVENT_IGNORED_NO_PACK;
    }
    s = &engine->stages[engine->current];
    if (!s->controls.autoplay) {
        return LUNY_EVENT_IGNORED_CONTROL_DISABLED;
    }
    /* Meme action qu'OK, sans exiger controlSettings.ok (cf. NOTES.md). */
    return follow_transition(engine, &s->ok);
}

luny_event_status luny_home(luny_engine *engine)
{
    const stage_t *s;

    if (engine == NULL || engine->current < 0) {
        return LUNY_EVENT_IGNORED_NO_PACK;
    }
    s = &engine->stages[engine->current];
    if (!s->controls.home) {
        return LUNY_EVENT_IGNORED_CONTROL_DISABLED;
    }

    if (!s->home.present) {
        /* Transition HOME nulle : retour au noeud d'entree, contexte vide. */
        engine->current    = engine->entry;
        engine->action_ctx = -1;
        engine->action_idx = -1;
        return LUNY_EVENT_ACCEPTED;
    }
    return follow_transition(engine, &s->home);
}

static luny_event_status wheel_move(luny_engine *engine, int delta)
{
    const stage_t  *s;
    const action_t *a;
    int             next;
    int             target;

    if (engine == NULL || engine->current < 0) {
        return LUNY_EVENT_IGNORED_NO_PACK;
    }
    s = &engine->stages[engine->current];
    if (!s->controls.wheel) {
        return LUNY_EVENT_IGNORED_CONTROL_DISABLED;
    }
    if (engine->action_ctx < 0) {
        return LUNY_EVENT_IGNORED_NO_ACTION_CONTEXT;
    }

    a = &engine->actions[engine->action_ctx];
    if (a->option_count <= 0) {
        return LUNY_EVENT_IGNORED_EMPTY_OPTIONS;
    }

    if (delta < 0) {
        next = (engine->action_idx == 0) ? (a->option_count - 1) : (engine->action_idx - 1);
    } else {
        next = (engine->action_idx + 1) % a->option_count;
    }

    target = a->option_ref[next];
    if (target < 0) {
        engine_log(engine, LUNY_LOG_WARN,
                   "ActionNode %s : option #%d non resolue, molette sans effet", a->id, next);
        return LUNY_EVENT_IGNORED_DANGLING_OPTION;
    }

    engine->current    = target;
    engine->action_idx = next;
    return LUNY_EVENT_ACCEPTED;
}

luny_event_status luny_wheel_left(luny_engine *engine)
{
    return wheel_move(engine, -1);
}

luny_event_status luny_wheel_right(luny_engine *engine)
{
    return wheel_move(engine, +1);
}
