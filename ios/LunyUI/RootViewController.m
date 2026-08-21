#import "RootViewController.h"
#import "LunyLibraryCell.h"
#import "LunyLibraryItem.h"
#import "DetailViewController.h"
#import "LunyTheme.h"

/*
 * Grille a deux colonnes, entierement calculee a la main : iOS 6 n'a ni
 * Auto Layout, ni UICollectionViewFlowLayoutAutomaticSize (arrive en iOS 8).
 * L'ecran logique fait toujours 320x480 points, quelle que soit la
 * resolution physique de l'appareil.
 */
static const NSInteger kLunyGridColumns       = 2;
static const CGFloat   kLunyGridSpacing       = 10.0f;
static const CGFloat   kLunyGridSectionInset  = 12.0f;
static const CGFloat   kLunyCellHeight        = 150.0f;

@interface RootViewController ()
@property (nonatomic, strong) UICollectionView *collectionView;
@property (nonatomic, strong) NSArray *items; // d'objets LunyLibraryItem
@end

@implementation RootViewController

- (void)viewDidLoad
{
    [super viewDidLoad];

    self.title = @"Mes histoires";
    self.view.backgroundColor = [LunyTheme backgroundDeep];

    self.items = [LunyLibraryItem sampleLibrary];

    UICollectionViewFlowLayout *layout = [[UICollectionViewFlowLayout alloc] init];
    layout.minimumLineSpacing = kLunyGridSpacing;
    layout.minimumInteritemSpacing = kLunyGridSpacing;
    layout.sectionInset = UIEdgeInsetsMake(kLunyGridSectionInset, kLunyGridSectionInset,
                                            kLunyGridSectionInset, kLunyGridSectionInset);

    self.collectionView = [[UICollectionView alloc] initWithFrame:self.view.bounds
                                               collectionViewLayout:layout];
    self.collectionView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    self.collectionView.backgroundColor = [UIColor clearColor];
    self.collectionView.dataSource = self;
    self.collectionView.delegate = self;

    /*
     * Contrainte plateforme : contrairement a UITableView (dont
     * dequeueReusableCellWithIdentifier: peut renvoyer nil et laisser
     * fabriquer la cellule a la main), UICollectionView leve une exception
     * si on la deque sans enregistrement prealable. Pas de xib ici : on
     * enregistre la classe directement.
     */
    [self.collectionView registerClass:[LunyLibraryCell class]
             forCellWithReuseIdentifier:[LunyLibraryCell reuseIdentifier]];

    [self.view addSubview:self.collectionView];
}

#pragma mark - UICollectionViewDataSource

- (NSInteger)collectionView:(UICollectionView *)collectionView numberOfItemsInSection:(NSInteger)section
{
    return (NSInteger)self.items.count;
}

- (UICollectionViewCell *)collectionView:(UICollectionView *)collectionView
                   cellForItemAtIndexPath:(NSIndexPath *)indexPath
{
    LunyLibraryCell *cell = (LunyLibraryCell *)[collectionView
        dequeueReusableCellWithReuseIdentifier:[LunyLibraryCell reuseIdentifier]
                                   forIndexPath:indexPath];
    LunyLibraryItem *item = self.items[(NSUInteger)indexPath.item];
    [cell configureWithItem:item accent:[LunyTheme accentAtIndex:(NSUInteger)indexPath.item]];
    return cell;
}

#pragma mark - UICollectionViewDelegate

- (void)collectionView:(UICollectionView *)collectionView didSelectItemAtIndexPath:(NSIndexPath *)indexPath
{
    LunyLibraryItem *item = self.items[(NSUInteger)indexPath.item];
    DetailViewController *detail = [[DetailViewController alloc] initWithLibraryItem:item];
    [self.navigationController pushViewController:detail animated:YES];
}

#pragma mark - UICollectionViewDelegateFlowLayout

- (CGSize)collectionView:(UICollectionView *)collectionView
                   layout:(UICollectionViewLayout *)collectionViewLayout
   sizeForItemAtIndexPath:(NSIndexPath *)indexPath
{
    CGFloat totalSpacing = kLunyGridSectionInset * 2.0f + kLunyGridSpacing * (kLunyGridColumns - 1);
    CGFloat width = (collectionView.bounds.size.width - totalSpacing) / kLunyGridColumns;
    return CGSizeMake(width, kLunyCellHeight);
}

@end
