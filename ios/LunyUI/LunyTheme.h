/*
 * LunyTheme.h
 *
 * Tokens de couleur de l'app. Source unique : aucune valeur hex ne doit etre
 * ecrite ailleurs.
 *
 * DEUX PALETTES coexistent, pour comparaison avant decision :
 *
 *   sombre  (defaut) — nuit et ambre, reprise de mockup/luny_maquette_v3.html
 *   claire            — bois et creme, texte brun sur fond chaud
 *
 * Bascule a la compilation, les deux compilent :
 *
 *     make LUNY_THEME_LIGHT=1 package install
 *
 * Les deux jeux ont ete verifies au contraste WCAG sur tous les couples
 * texte/fond de l'app — voir NOTES.md. Toute retouche de valeur doit refaire
 * cette verification : un token n'est pas une preference isolee, il vit dans
 * une paire.
 */
#import <UIKit/UIKit.h>

#ifndef LUNY_THEME_LIGHT
#define LUNY_THEME_LIGHT 0
#endif

@interface LunyTheme : NSObject

/* Nom de la palette active, pour le diagnostic. */
+ (NSString *)paletteName;

/* Fonds */
+ (UIColor *)backgroundDeep;    /* fond de la bibliotheque et du lecteur */
+ (UIColor *)surface;           /* fond de tuile */
+ (UIColor *)artBase;           /* fond de la zone d'art */
+ (UIColor *)controlsSurface;   /* panneau de commandes du lecteur */
+ (UIColor *)raisedSurface;     /* fond des fleches, au-dessus du fond general */
+ (UIColor *)trackRail;         /* rail de la barre de progression */
+ (UIColor *)dotIdle;           /* point de pagination inactif */

/* Fond d'une commande posee par-dessus l'illustration. */
+ (UIColor *)overlaySurface;

/* Textes */
+ (UIColor *)textPrimary;       /* texte courant */
+ (UIColor *)textBright;        /* titres, contraste maximal */
+ (UIColor *)textMuted;         /* texte secondaire ; c'est la couleur appelee
                                 * "duration" dans la doc d'interface */
+ (UIColor *)textDisabled;      /* metadonnee discrete */
+ (UIColor *)textOnAccent;      /* texte pose sur un aplat d'accent */

/* Accents */
+ (UIColor *)accentAmber;
+ (UIColor *)accentSage;
+ (UIColor *)accentRose;
+ (UIColor *)accentBlue;

/* Accent attribue a une tuile selon sa position. Cycle sur les quatre. */
+ (UIColor *)accentAtIndex:(NSUInteger)index;

/* Teinte de couverture : l'accent fondu dans artBase. */
+ (UIColor *)coverTintForAccent:(UIColor *)accent;

/*
 * Variante assombrie, pour l'etat highlighted d'un bouton. UIKit ne fournit
 * aucun retour visuel automatique sur UIButtonTypeCustom.
 */
+ (UIColor *)pressedVariantOf:(UIColor *)color;

/*
 * Variante desaturee, pour l'etat desactive d'un bouton.
 *
 * A ne PAS remplacer par une simple baisse d'alpha sur le bouton : attenuer
 * la vue entiere fait fondre son fond ET son titre vers la couleur du
 * panneau, et le contraste interne s'effondre — mesure a 1,03:1, soit un
 * libelle invisible. Ici seul le fond se desature, le titre garde le sien.
 */
+ (UIColor *)disabledVariantOf:(UIColor *)color;

/* Aplat 1x1 etirable, a poser en backgroundImage d'un bouton. */
+ (UIImage *)solidImageWithColor:(UIColor *)color;

@end
