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

/*
 * Opacite du fond decoratif.
 *
 * Point de depart 0,15, verifie au contraste et non suppose : sur la palette
 * sombre le pire cas mesure est 10,55:1 pour le titre et 11,12:1 pour le
 * sous-titre, tres au-dessus du seuil de 4,5:1. Les tuiles ne sont pas
 * concernees, leur fond est opaque.
 *
 * Si le rendu reel demande a alleger, BAISSER cette valeur : a 0,10 le pire
 * cas remonte a 12,44:1. Ne pas l'augmenter sans refaire la mesure.
 */
static const CGFloat kLunyBackdropAlpha = 0.15f;

/* En-tete "Mes histoires" : titre affirme + compte discret. */
static const CGFloat   kLunyHeaderHeight      = 74.0f;
static const CGFloat   kLunyHeaderTitleHeight = 32.0f;
static const CGFloat   kLunyHeaderSubHeight   = 16.0f;

/*
 * UIAlertView est deprecie dans le SDK 10.3 au profit d'UIAlertController —
 * qui n'existe qu'a partir d'iOS 8. Sur une cible 6.0 c'est donc l'API
 * correcte, et non un reliquat : on tait l'avertissement ici plutot que de
 * baisser -Werror pour tout le projet.
 */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"

@interface RootViewController () <UIAlertViewDelegate>
@property (nonatomic, strong) UIImageView *backdrop;
@property (nonatomic, strong) UICollectionView *collectionView;
@property (nonatomic, strong) LunyLibraryItem *pendingDeletion;
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

    [self buildBackdrop];
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

    // Appui long : seule facon de proposer une suppression sans encombrer la
    // tuile d'un bouton permanent.
    UILongPressGestureRecognizer *longPress =
        [[UILongPressGestureRecognizer alloc] initWithTarget:self
                                                      action:@selector(handleLongPress:)];
    [self.collectionView addGestureRecognizer:longPress];

    [self.view addSubview:self.collectionView];
}

#pragma mark - Suppression d'un pack

- (void)handleLongPress:(UILongPressGestureRecognizer *)recognizer
{
    if (recognizer.state != UIGestureRecognizerStateBegan) {
        return;   // un seul declenchement par appui
    }

    CGPoint point = [recognizer locationInView:self.collectionView];
    NSIndexPath *indexPath = [self.collectionView indexPathForItemAtPoint:point];

    if (!indexPath || (NSUInteger)indexPath.item >= self.items.count) {
        return;
    }

    LunyLibraryItem *item = self.items[(NSUInteger)indexPath.item];

    if (!item.deletable) {
        /*
         * Pack livre dans le bundle. Le refus n'est pas une politique de
         * l'app : /Applications appartient a root et l'app tourne en mobile,
         * la suppression echouerait en "Permission denied". Autant l'expliquer
         * plutot que de proposer une action vouee a echouer.
         */
        UIAlertView *info = [[UIAlertView alloc]
            initWithTitle:@"Pack intégré"
                  message:[NSString stringWithFormat:
                           @"« %@ » est livré avec l'application et ne peut pas être supprimé.",
                           item.title]
                 delegate:nil
        cancelButtonTitle:@"Fermer"
        otherButtonTitles:nil];
        [info show];
        return;
    }

    self.pendingDeletion = item;

    UIAlertView *confirm = [[UIAlertView alloc]
        initWithTitle:@"Supprimer cette histoire ?"
              message:[NSString stringWithFormat:
                       @"« %@ » sera effacé de l'appareil. Cette action est définitive : "
                       @"l'histoire devra être réimportée pour revenir.", item.title]
             delegate:self
    cancelButtonTitle:@"Annuler"
    otherButtonTitles:@"Supprimer", nil];
    [confirm show];
}

- (void)alertView:(UIAlertView *)alertView clickedButtonAtIndex:(NSInteger)buttonIndex
{
    LunyLibraryItem *item = self.pendingDeletion;
    self.pendingDeletion = nil;

    if (!item || buttonIndex == alertView.cancelButtonIndex) {
        return;
    }

    NSError *error = nil;

    if (![item deleteFromDisk:&error]) {
        UIAlertView *failure = [[UIAlertView alloc]
            initWithTitle:@"Suppression impossible"
                  message:error.localizedDescription ?: @"Le pack n'a pas pu être effacé."
                 delegate:nil
        cancelButtonTitle:@"Fermer"
        otherButtonTitles:nil];
        [failure show];
        return;
    }

    // Relecture complete plutot que retrait d'une ligne : la bibliotheque est
    // courte, et repartir du disque garantit que l'ecran reflete ce qui existe
    // vraiment.
    self.items = [LunyLibraryItem sampleLibrary];
    [self refreshHeaderCount];
    [self.collectionView reloadData];
}

- (void)refreshHeaderCount
{
    self.headerSubtitle.text = [NSString stringWithFormat:@"%lu histoires · hors ligne",
                                (unsigned long)self.items.count];
}

/*
 * Fond decoratif, pose avant tout le reste pour rester DERRIERE l'en-tete et
 * la grille. Les tuiles gardent leur fond opaque : il ne transparait qu'entre
 * elles et derriere le titre.
 *
 * -imageNamed: garde l'image en cache cote UIKit, donc un seul decodage pour
 * la duree de vie de l'ecran. Inutile d'ajouter un cache par-dessus.
 */
- (void)buildBackdrop
{
    if (![LunyTheme usesNightBackdrop]) {
        return;
    }

    UIImage *image = [UIImage imageNamed:@"backdrop-library.png"];

    if (!image) {
        return;   // fond absent du bundle : l'ecran reste utilisable sans lui
    }

    _backdrop = [[UIImageView alloc] initWithImage:image];
    _backdrop.contentMode = UIViewContentModeScaleAspectFill;
    _backdrop.clipsToBounds = YES;
    _backdrop.alpha = kLunyBackdropAlpha;
    _backdrop.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self.view addSubview:_backdrop];
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
    _headerSubtitle.font = [UIFont systemFontOfSize:12.0f];
    _headerSubtitle.textColor = [LunyTheme textDisabled];
    _headerSubtitle.backgroundColor = [UIColor clearColor];
    _headerSubtitle.autoresizingMask = UIViewAutoresizingFlexibleWidth;
    [_header addSubview:_headerSubtitle];

    [self refreshHeaderCount];
}

- (void)viewWillLayoutSubviews
{
    [super viewWillLayoutSubviews];

    CGRect bounds = self.view.bounds;
    CGFloat innerWidth = bounds.size.width - (kLunyGridSectionInset * 2.0f);

    if (innerWidth <= 0.0f) {
        return;
    }

    self.backdrop.frame = bounds;
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

#pragma clang diagnostic pop
