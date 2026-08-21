/*
 * DetailViewController.h — lecteur de pack, branche sur luny-engine.
 *
 * Charge un pack deja extrait depuis un repertoire, affiche le noeud courant
 * (nom, image si presente) et expose un bouton OK qui emet l'evenement
 * correspondant dans le moteur. L'ecran ne fait que refleter l'etat renvoye
 * par le C : aucune logique de graphe cote UI.
 *
 * Hors perimetre de cette iteration : audio, molette, pause, decompression ZIP.
 */
#import <UIKit/UIKit.h>

@interface DetailViewController : UIViewController

/* Initialiseur designe. Le nom evite toute confusion avec la propriete
 * -title deja heritee de UIViewController. */
- (instancetype)initWithStoryTitle:(NSString *)storyTitle;

@end
