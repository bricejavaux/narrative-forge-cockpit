/*
 * DetailViewController.h — ecran de detail volontairement vide.
 *
 * Cette session ne branche pas le moteur narratif (hors perimetre, cf.
 * README.md). Ce controleur sert uniquement a valider que la navigation
 * pousse/depile correctement depuis la bibliotheque.
 */
#import <UIKit/UIKit.h>

@interface DetailViewController : UIViewController

/* Initialiseur designe. Le nom evite toute confusion avec la propriete
 * -title deja heritee de UIViewController. */
- (instancetype)initWithStoryTitle:(NSString *)storyTitle;

@end
