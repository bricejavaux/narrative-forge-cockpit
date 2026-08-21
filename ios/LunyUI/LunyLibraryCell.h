/*
 * LunyLibraryCell.h — tuile de la grille bibliotheque.
 *
 * Pas d'image reelle a ce stade (hors perimetre de cette session) : la
 * "couverture" est un rectangle de couleur a coins arrondis portant
 * l'initiale du titre, teinte par un accent de la palette. Layout
 * entierement calcule a la main dans -layoutSubviews, comme partout dans
 * cet ecran : iOS 6 n'a pas Auto Layout.
 */
#import <UIKit/UIKit.h>

@class LunyLibraryItem;

@interface LunyLibraryCell : UICollectionViewCell

+ (NSString *)reuseIdentifier;

/*
 * Hauteur du bloc titre + duree sous la couverture. Expose pour que le
 * controleur calcule la taille de tuile sans dupliquer la constante :
 * couverture carree + ce bloc.
 */
+ (CGFloat)textBlockHeight;

/*
 * accent provient de +[LunyTheme accentAtIndex:] : la couleur depend de la
 * position dans la grille, pas du modele, qui reste purement de la donnee.
 */
- (void)configureWithItem:(LunyLibraryItem *)item accent:(UIColor *)accent;

@end
