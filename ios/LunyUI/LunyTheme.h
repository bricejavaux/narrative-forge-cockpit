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
+ (UIColor *)backgroundDeep;    /* #0B1024 — fond de la bibliotheque et du detail */
+ (UIColor *)surface;           /* #141A32 — fond de tuile */
+ (UIColor *)artBase;           /* #060812 — fond du rectangle de couverture */

/* Textes */
+ (UIColor *)textPrimary;       /* #C8D3F2 — texte clair courant */
+ (UIColor *)textBright;        /* #E7ECFA — titres, contraste maximal */
+ (UIColor *)textMuted;         /* #94A0C6 — texte secondaire (duree) */

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

@end
