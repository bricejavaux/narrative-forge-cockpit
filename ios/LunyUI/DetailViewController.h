/*
 * DetailViewController.h — lecteur de pack, branche sur luny-engine.
 *
 * Charge un pack deja extrait depuis un repertoire, affiche le noeud courant
 * (nom, image si presente) et expose trois boutons — molette gauche, OK,
 * molette droite — qui emettent l'evenement correspondant dans le moteur.
 * L'ecran ne fait que refleter l'etat renvoye par le C : aucune logique de
 * graphe cote UI.
 *
 * Hors perimetre de cette iteration : audio, pause, decompression ZIP.
 */
#import <UIKit/UIKit.h>

@class LunyLibraryItem;

@interface DetailViewController : UIViewController

/*
 * Initialiseur designe. L'ecran ouvre le pack porte par l'entree : chaque
 * tuile de la bibliotheque a le sien, il n'y a plus de chemin partage.
 */
- (instancetype)initWithLibraryItem:(LunyLibraryItem *)item;

@end
