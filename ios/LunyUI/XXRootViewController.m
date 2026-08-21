#import "XXRootViewController.h"
#import "XXCoverCell.h"
#import "XXStoryDetailViewController.h"

static NSString * const XXCoverCellIdentifier = @"CoverCell";

static const CGFloat XXGridMargin = 12.0f;
static const CGFloat XXGridSpacing = 12.0f;
static const NSInteger XXGridColumns = 2;

@interface XXRootViewController () <UICollectionViewDelegateFlowLayout>
@property (nonatomic, strong) NSArray *stories;
@end

@implementation XXRootViewController

+ (UICollectionViewFlowLayout *)defaultLayout {
	UICollectionViewFlowLayout *layout = [[UICollectionViewFlowLayout alloc] init];
	layout.sectionInset = UIEdgeInsetsMake(XXGridMargin, XXGridMargin, XXGridMargin, XXGridMargin);
	layout.minimumInteritemSpacing = XXGridSpacing;
	layout.minimumLineSpacing = XXGridSpacing;
	return layout;
}

- (id)init {
	// Garantit qu'un layout existe toujours : UICollectionView lève une exception
	// si elle est initialisée avec un layout nil.
	return [self initWithCollectionViewLayout:[[self class] defaultLayout]];
}

- (id)initWithCollectionViewLayout:(UICollectionViewLayout *)layout {
	self = [super initWithCollectionViewLayout:(layout ?: [[self class] defaultLayout])];

	if (!self) {
		return nil;
	}

	self.title = @"Bibliothèque";
	_stories = @[
		@{ @"title": @"Le Phare d'Ambre", @"duration": @"12 min", @"tint": [UIColor colorWithRed:0.91f green:0.55f blue:0.24f alpha:1.0f] },
		@{ @"title": @"Marées Basses", @"duration": @"8 min", @"tint": [UIColor colorWithRed:0.24f green:0.52f blue:0.68f alpha:1.0f] },
		@{ @"title": @"La Forêt Qui Compte", @"duration": @"21 min", @"tint": [UIColor colorWithRed:0.35f green:0.58f blue:0.40f alpha:1.0f] },
		@{ @"title": @"Nuit Blanche", @"duration": @"15 min", @"tint": [UIColor colorWithRed:0.45f green:0.40f blue:0.66f alpha:1.0f] }
	];

	return self;
}

- (void)loadView {
	[super loadView];

	// Enregistrement au plus tôt, dès que la collection view existe : sous iOS 6
	// UICollectionViewController déclenche un premier reloadData avant même
	// viewDidLoad, et tout dequeue précédant l'enregistrement lève
	// NSInternalInconsistencyException ("could not dequeue a view of kind").
	[self.collectionView registerClass:[XXCoverCell class] forCellWithReuseIdentifier:XXCoverCellIdentifier];
}

- (void)viewDidLoad {
	[super viewDidLoad];

	self.collectionView.backgroundColor = [UIColor colorWithWhite:0.96f alpha:1.0f];
	self.collectionView.alwaysBounceVertical = YES;
	self.collectionView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
}

#pragma mark - Collection View Flow Layout Delegate

- (CGSize)collectionView:(UICollectionView *)collectionView layout:(UICollectionViewLayout *)collectionViewLayout sizeForItemAtIndexPath:(NSIndexPath *)indexPath {
	CGFloat gutters = (2 * XXGridMargin) + ((XXGridColumns - 1) * XXGridSpacing);
	CGFloat available = CGRectGetWidth(collectionView.bounds) - gutters;

	// Le flow layout lève une exception sur une taille nulle ou négative :
	// pendant les passes de layout transitoires les bounds peuvent être vides.
	if (available < (CGFloat)XXGridColumns) {
		return CGSizeMake(1.0f, 1.0f);
	}

	CGFloat itemWidth = floorf(available / XXGridColumns);
	CGFloat itemHeight = [XXCoverCell heightForWidth:itemWidth];

	// Le flow layout exige aussi que la hauteur d'item tienne dans la vue
	// moins les insets de section et de contenu, sous peine d'exception.
	UIEdgeInsets contentInset = collectionView.contentInset;
	CGFloat usableHeight = CGRectGetHeight(collectionView.bounds) - contentInset.top - contentInset.bottom - (2 * XXGridMargin);

	if (usableHeight > 1.0f && itemHeight > usableHeight) {
		itemHeight = usableHeight;
	}

	return CGSizeMake(itemWidth, itemHeight);
}

#pragma mark - Collection View Data Source

- (NSInteger)numberOfSectionsInCollectionView:(UICollectionView *)collectionView {
	return 1;
}

- (NSInteger)collectionView:(UICollectionView *)collectionView numberOfItemsInSection:(NSInteger)section {
	return _stories.count;
}

- (UICollectionViewCell *)collectionView:(UICollectionView *)collectionView cellForItemAtIndexPath:(NSIndexPath *)indexPath {
	XXCoverCell *cell = [collectionView dequeueReusableCellWithReuseIdentifier:XXCoverCellIdentifier forIndexPath:indexPath];

	if (indexPath.item < (NSInteger)_stories.count) {
		NSDictionary *story = _stories[indexPath.item];
		[cell configureWithTitle:story[@"title"] duration:story[@"duration"] tint:story[@"tint"]];
	}

	return cell;
}

#pragma mark - Collection View Delegate

- (void)collectionView:(UICollectionView *)collectionView didSelectItemAtIndexPath:(NSIndexPath *)indexPath {
	[collectionView deselectItemAtIndexPath:indexPath animated:YES];

	if (indexPath.item >= (NSInteger)_stories.count) {
		return;
	}

	NSDictionary *story = _stories[indexPath.item];
	XXStoryDetailViewController *detail = [[XXStoryDetailViewController alloc] initWithTitle:story[@"title"]];
	[self.navigationController pushViewController:detail animated:YES];
}

@end
