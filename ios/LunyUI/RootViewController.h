/*
 * RootViewController.h — ecran de bibliotheque.
 *
 * Implemente comme UIViewController proprietaire d'une UICollectionView en
 * sous-vue, plutot que comme sous-classe de UICollectionViewController.
 * Choix Luny explique dans NOTES.md : cette session n'a pas visibilite sur
 * la maniere dont AppDelegate instancie ce controleur (probablement un
 * simple -init ou -initWithNibName:bundle: herite du gabarit Theos), et
 * UICollectionViewController impose -initWithCollectionViewLayout: comme
 * initialiseur designe. Cette forme fonctionne avec n'importe quel appel
 * d'instanciation existant, sans toucher a AppDelegate.
 */
#import <UIKit/UIKit.h>

@interface RootViewController : UIViewController
    <UICollectionViewDataSource, UICollectionViewDelegate, UICollectionViewDelegateFlowLayout>

@end
