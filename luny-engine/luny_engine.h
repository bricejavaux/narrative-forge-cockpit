/*
 * luny_engine.h -- Moteur d'histoire interactive lisant le format "story pack"
 *                  de STUdio (marian-m12l/studio, commit aaf1e81f).
 *
 * C99 pur. Aucune dependance hors cJSON (vendorise dans cjson/).
 * Perimetre : parseur + machine a etats. Pas de ZIP, pas d'audio, pas d'affichage.
 *
 * L'entree est un repertoire deja extrait :
 *     <dir>/story.json
 *     <dir>/assets/<nom-de-fichier>
 *
 * Les regles decidees en l'absence de source sont documentees dans NOTES.md et
 * marquees "choix Luny".
 */

#ifndef LUNY_ENGINE_H
#define LUNY_ENGINE_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define LUNY_ENGINE_VERSION_MAJOR 0
#define LUNY_ENGINE_VERSION_MINOR 1
#define LUNY_ENGINE_VERSION_PATCH 0

/* ------------------------------------------------------------------ */
/* Statuts                                                            */
/* ------------------------------------------------------------------ */

typedef enum {
    LUNY_OK = 0,
    LUNY_ERR_ARG,          /* argument invalide passe a l'API            */
    LUNY_ERR_IO,           /* story.json illisible ou absent             */
    LUNY_ERR_JSON,         /* JSON malforme, ou racine non-objet         */
    LUNY_ERR_NO_VERSION,   /* champ "version" absent -> pack refuse      */
    LUNY_ERR_NO_STAGE,     /* aucun StageNode exploitable                */
    LUNY_ERR_MEMORY
} luny_status;

/*
 * Statut renvoye par chaque evenement. Tout ce qui n'est pas
 * LUNY_EVENT_ACCEPTED laisse l'etat du moteur strictement inchange.
 */
typedef enum {
    LUNY_EVENT_ACCEPTED = 0,
    LUNY_EVENT_IGNORED_CONTROL_DISABLED,  /* le drapeau controlSettings est faux   */
    LUNY_EVENT_IGNORED_NO_TRANSITION,     /* okTransition / homeTransition == null */
    LUNY_EVENT_IGNORED_DANGLING_ACTION,   /* actionNode reference introuvable       */
    LUNY_EVENT_IGNORED_DANGLING_OPTION,   /* option null / uuid introuvable         */
    LUNY_EVENT_IGNORED_NO_ACTION_CONTEXT, /* molette hors contexte ActionNode       */
    LUNY_EVENT_IGNORED_EMPTY_OPTIONS,     /* ActionNode sans option exploitable     */
    LUNY_EVENT_IGNORED_NO_PACK            /* moteur nul ou sans noeud courant       */
} luny_event_status;

const char *luny_status_str(luny_status s);
const char *luny_event_status_str(luny_event_status s);

/* ------------------------------------------------------------------ */
/* Injection : generateur aleatoire et journalisation                 */
/* ------------------------------------------------------------------ */

/*
 * Doit renvoyer un entier uniformement distribue dans [0, bound).
 * bound est toujours >= 1 lors de l'appel.
 * Rendre ce generateur injectable permet des tests deterministes.
 */
typedef unsigned int (*luny_rng_fn)(void *ctx, unsigned int bound);

typedef enum {
    LUNY_LOG_WARN = 0,
    LUNY_LOG_INFO
} luny_log_level;

typedef void (*luny_log_fn)(void *ctx, luny_log_level level, const char *message);

typedef struct {
    luny_rng_fn rng;      /* NULL -> generateur interne (xorshift, graine fixe) */
    void       *rng_ctx;
    luny_log_fn log;      /* NULL -> journalisation silencieuse                  */
    void       *log_ctx;
} luny_options;

/* Remplit opts avec les valeurs par defaut. */
void luny_options_init(luny_options *opts);

/*
 * Generateur interne, expose pour les tests : splitmix32 a graine explicite,
 * avec echantillonnage par rejet pour eliminer le biais du modulo.
 * A graine egale, la suite de tirages est reproductible.
 */
typedef struct { unsigned int state; } luny_rng;
void         luny_rng_seed(luny_rng *rng, unsigned int seed);
unsigned int luny_rng_next(void *ctx, unsigned int bound);

/* ------------------------------------------------------------------ */
/* Vues en lecture seule                                              */
/* ------------------------------------------------------------------ */

typedef struct {
    int wheel;
    int ok;
    int home;
    int pause;
    int autoplay;
} luny_controls;

/*
 * Vue du noeud courant. Toutes les chaines appartiennent au moteur et restent
 * valides jusqu'a luny_close(). Elles ne doivent pas etre liberees.
 *
 * image / audio : nom de fichier tel qu'ecrit dans story.json, garanti present
 * sous <dir>/assets/ et porteur d'une extension reconnue. NULL sinon (absent,
 * null JSON, extension inconnue, nom sans point, fichier manquant).
 */
typedef struct {
    const char   *uuid;
    const char   *name;     /* metadonnee enrichie, peut etre NULL */
    const char   *type;     /* metadonnee enrichie, peut etre NULL */
    const char   *image;    /* peut etre NULL */
    const char   *audio;    /* peut etre NULL */
    luny_controls controls;
    int           square_one;
} luny_stage_view;

/* Contexte ActionNode courant, si le noeud courant a ete atteint via une liste. */
typedef struct {
    const char *action_id;   /* NULL si aucun contexte              */
    int         index;       /* -1 si aucun contexte                */
    int         option_count;/* 0 si aucun contexte                 */
} luny_action_view;

typedef struct {
    const char *title;        /* peut etre NULL */
    const char *description;  /* peut etre NULL */
    int         version;
    int         night_mode_available;
    int         stage_count;
    int         action_count;
    const char *uuid;         /* uuid du noeud d'entree (= uuid du pack) */
} luny_pack_view;

/* ------------------------------------------------------------------ */
/* Cycle de vie                                                       */
/* ------------------------------------------------------------------ */

typedef struct luny_engine luny_engine;

/*
 * Charge un pack depuis un repertoire deja extrait et positionne le moteur sur
 * le noeud d'entree. opts peut etre NULL (valeurs par defaut).
 * En cas d'echec, *out vaut NULL et rien n'est alloue.
 */
luny_status luny_open(const char *pack_dir, const luny_options *opts, luny_engine **out);

/* Libere toutes les ressources. luny_close(NULL) est un no-op. */
void luny_close(luny_engine *engine);

/* Repositionne le moteur sur le noeud d'entree et vide le contexte ActionNode. */
void luny_reset(luny_engine *engine);

/* ------------------------------------------------------------------ */
/* Etat courant                                                       */
/* ------------------------------------------------------------------ */

/* Renvoie 1 et remplit out si un noeud courant existe, 0 sinon. */
int luny_current_stage(const luny_engine *engine, luny_stage_view *out);

/* Renvoie 1 et remplit out si un contexte ActionNode existe, 0 sinon. */
int luny_current_action(const luny_engine *engine, luny_action_view *out);

/* Metadonnees du pack. Renvoie 1 si engine est non nul. */
int luny_pack_info(const luny_engine *engine, luny_pack_view *out);

/*
 * Chemin absolu-ou-relatif utilisable pour ouvrir un asset du noeud courant :
 * <pack_dir>/assets/<nom>. Ecrit dans buf, renvoie la longueur qui aurait ete
 * necessaire (hors terminateur), ou -1 si l'asset est absent.
 */
int luny_asset_path(const luny_engine *engine, const char *asset_name,
                    char *buf, size_t buf_size);

/* ------------------------------------------------------------------ */
/* Evenements                                                         */
/* ------------------------------------------------------------------ */

/* OK : accepte seulement si controlSettings.ok. Suit okTransition. */
luny_event_status luny_ok(luny_engine *engine);

/*
 * HOME : accepte seulement si controlSettings.home. Suit homeTransition ;
 * si elle est nulle, retour au noeud d'entree et le contexte ActionNode est vide.
 */
luny_event_status luny_home(luny_engine *engine);

/*
 * Molette : acceptee seulement si controlSettings.wheel ET si un contexte
 * ActionNode existe. Decrement / increment circulaire modulo le nombre d'options.
 */
luny_event_status luny_wheel_left(luny_engine *engine);
luny_event_status luny_wheel_right(luny_engine *engine);

/*
 * Fin d'audio : si controlSettings.autoplay, declenche la meme action qu'OK.
 * N'exige pas controlSettings.ok (cf. NOTES.md).
 */
luny_event_status luny_audio_ended(luny_engine *engine);

#ifdef __cplusplus
}
#endif

#endif /* LUNY_ENGINE_H */
