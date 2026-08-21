/*
 * LunyTheme.h
 *
 * Tokens de couleur de l'app, repris de mockup/luny_maquette_v3.html
 * (palette sombre, accent ambre, esthetique lune/lanterne).
 *
 * Source unique : aucune couleur ne doit etre ecrite en dur ailleurs dans
 * l'app. Les valeurs hex sont notees en commentaire face a chaque token.
 */
#import <UIKit/UIKit.h>

@interface LunyTheme : NSObject

/* Fonds */
+ (UIColor *)backgroundDeep;    /* #0B1024 — fond de la bibliotheque et du lecteur */
+ (UIColor *)surface;           /* #141A32 — fond de tuile */
+ (UIColor *)artBase;           /* #060812 — fond de la zone d'art */
+ (UIColor *)controlsSurface;   /* #101426 — panneau de commandes du lecteur */
+ (UIColor *)raisedSurface;     /* #1C2440 — fond des fleches, au-dessus du fond general */
+ (UIColor *)trackRail;         /* #232B47 — rail de la barre de progression */
+ (UIColor *)dotIdle;           /* #2C3554 — point de pagination inactif */

/* Textes */
+ (UIColor *)textPrimary;       /* #C8D3F2 — texte clair courant */
+ (UIColor *)textBright;        /* #E7ECFA — titres, contraste maximal */
+ (UIColor *)textMuted;         /* #94A0C6 — texte secondaire ; c'est la couleur
                                 * appelee "duration" dans la doc d'interface */
+ (UIColor *)textDisabled;      /* #5F6B93 — glyphe d'une commande indisponible ;
                                 * faible contraste assume, il signale l'inaction */
+ (UIColor *)textOnAccent;      /* #2A1B03 — texte pose sur un aplat d'accent */

/* Fond d'une commande posee par-dessus l'illustration : doit rester lisible
 * quelle que soit l'image en dessous. */
+ (UIColor *)overlaySurface;

/* Accents */
+ (UIColor *)accentAmber;       /* #F0B357 — validation, focus */
+ (UIColor *)accentSage;        /* #8FC7A8 — succes */
+ (UIColor *)accentRose;        /* #D98FA6 — alerte douce */
+ (UIColor *)accentBlue;        /* #7FA6E0 — quatrieme teinte de la maquette */

/*
 * Accent attribue a une tuile selon sa position, pour differencier les
 * couvertures sans sortir de la palette. Cycle sur les quatre accents.
 */
+ (UIColor *)accentAtIndex:(NSUInteger)index;

/*
 * Teinte de couverture : l'accent fondu dans artBase, de facon a garder un
 * panneau sombre lisible tout en identifiant chaque histoire.
 */
+ (UIColor *)coverTintForAccent:(UIColor *)accent;

/*
 * Variante assombrie, pour l'etat highlighted d'un bouton. UIKit ne fournit
 * aucun retour visuel automatique sur UIButtonTypeCustom : il faut une image
 * de fond par etat.
 */
+ (UIColor *)pressedVariantOf:(UIColor *)color;

/* Aplat 1x1 etirable, a poser en backgroundImage d'un bouton. */
+ (UIImage *)solidImageWithColor:(UIColor *)color;

@end
