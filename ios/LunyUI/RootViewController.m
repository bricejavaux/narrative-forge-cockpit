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
 *
 * Deux colonnes est une decision, pas une contrainte : sur 320pt, une
 * troisieme colonne ramenerait chaque couverture sous 90pt et rendrait
 * l'initiale illisible. On prefere la respiration a la densite.
 */
static const NSInteger kLunyGridColumns       = 2;
static const CGFloat   kLunyGridSpacing       = 14.0f;
static const CGFloat   kLunyGridSectionInset  = 16.0f;

/* En-tete "Mes histoires" : titre affirme + compte discret. */
static const CGFloat   kLunyHeaderHeight      = 74.0f;
static const CGFloat   kLunyHeaderTitleHeight = 32.0f;
static const CGFloat   kLunyHeaderSubHeight   = 16.0f;

@interface RootViewController ()
@property (nonatomic, strong) UICollectionView *collectionView;
@property (nonatomic, strong) UIView *header;
@property (nonatomic, strong) UILabel *headerTitle;
@property (nonatomic, strong) UILabel *headerSubtitle;
@property (nonatomic, strong) NSArray *items; // d'objets LunyLibraryItem
@end

@implementation RootViewController

- (void)viewDidLoad
{
    [super viewDidLoad];

    // Le titre reste porte par l'en-tete dans la vue, pas par la barre de
    // navigation : la barre n'est la que pour le bouton retour depuis le
    // lecteur. self.title l'alimente quand meme.
    self.title = @"Mes histoires";
    self.view.backgroundColor = [LunyTheme backgroundDeep];

    self.items = [LunyLibraryItem sampleLibrary];

    [self buildHeader];

    UICollectionViewFlowLayout *layout = [[UICollectionViewFlowLayout alloc] init];
    layout.minimumLineSpacing = kLunyGridSpacing;
    layout.minimumInteritemSpacing = kLunyGridSpacing;
    layout.sectionInset = UIEdgeInsetsMake(kLunyGridSectionInset, kLunyGridSectionInset,
                                            kLunyGridSectionInset, kLunyGridSectionInset);

    self.collectionView = [[UICollectionView alloc] initWithFrame:CGRectZero
                                               collectionViewLayout:layout];
    self.collectionView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    self.collectionView.backgroundColor = [UIColor clearColor];
    self.collectionView.alwaysBounceVertical = YES;
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

- (void)buildHeader
{
    _header = [[UIView alloc] initWithFrame:CGRectZero];
    _header.backgroundColor = [UIColor clearColor];
    _header.autoresizingMask = UIViewAutoresizingFlexibleWidth;
    [self.view addSubview:_header];

    _headerTitle = [[UILabel alloc] initWithFrame:CGRectZero];
    _headerTitle.text = @"Mes histoires";
    _headerTitle.font = [UIFont boldSystemFontOfSize:26.0f];
    _headerTitle.textColor = [LunyTheme textBright];
    _headerTitle.backgroundColor = [UIColor clearColor];
    _headerTitle.autoresizingMask = UIViewAutoresizingFlexibleWidth;
    [_header addSubview:_headerTitle];

    _headerSubtitle = [[UILabel alloc] initWithFrame:CGRectZero];
    _headerSubtitle.text = [NSString stringWithFormat:@"%lu histoires · hors ligne",
                            (unsigned long)self.items.count];
    _headerSubtitle.font = [UIFont systemFontOfSize:12.0f];
    _headerSubtitle.textColor = [LunyTheme textDisabled];
    _headerSubtitle.backgroundColor = [UIColor clearColor];
    _headerSubtitle.autoresizingMask = UIViewAutoresizingFlexibleWidth;
    [_header addSubview:_headerSubtitle];
}

- (void)viewWillLayoutSubviews
{
    [super viewWillLayoutSubviews];

    CGRect bounds = self.view.bounds;
    CGFloat innerWidth = bounds.size.width - (kLunyGridSectionInset * 2.0f);

    if (innerWidth <= 0.0f) {
        return;
    }

    self.header.frame = CGRectMake(0.0f, 0.0f, bounds.size.width, kLunyHeaderHeight);
    self.headerTitle.frame = CGRectMake(kLunyGridSectionInset, 16.0f,
                                        innerWidth, kLunyHeaderTitleHeight);
    self.headerSubtitle.frame = CGRectMake(kLunyGridSectionInset,
                                           16.0f + kLunyHeaderTitleHeight + 2.0f,
                                           innerWidth, kLunyHeaderSubHeight);

    self.collectionView.frame = CGRectMake(0.0f, kLunyHeaderHeight, bounds.size.width,
                                           bounds.size.height - kLunyHeaderHeight);
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

    if (width < 1.0f) {
        return CGSizeMake(1.0f, 1.0f);
    }

    // Couverture carree, plus le bloc de texte sous elle.
    return CGSizeMake(width, width + [LunyLibraryCell textBlockHeight]);
}

@end
