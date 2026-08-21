/*
 * LunyLibraryCell.h — tuile de la grille bibliotheque.
 *
 * Pas d'image reelle a ce stade (hors perimetre de cette session) : la
 * "couverture" est un simple rectangle de couleur. Layout entierement
 * calcule a la main dans -layoutSubviews, comme partout dans cet ecran :
 * iOS 6 n'a pas Auto Layout.
 */
#import <UIKit/UIKit.h>

@class LunyLibraryItem;

@interface LunyLibraryCell : UICollectionViewCell

+ (NSString *)reuseIdentifier;

- (void)configureWithItem:(LunyLibraryItem *)item;

@end
