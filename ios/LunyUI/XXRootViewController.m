#import "XXRootViewController.h"
#import "XXCoverCell.h"
#import "XXStoryDetailViewController.h"

static NSString * const XXCoverCellIdentifier = @"CoverCell";

static const CGFloat XXGridMargin = 12.0f;
static const CGFloat XXGridSpacing = 12.0f;
static const NSInteger XXGridColumns = 2;

@interface XXRootViewController ()
@property (nonatomic, strong) NSArray *stories;
@end

@implementation XXRootViewController

- (id)init {
	UICollectionViewFlowLayout *layout = [[UICollectionViewFlowLayout alloc] init];
	layout.sectionInset = UIEdgeInsetsMake(XXGridMargin, XXGridMargin, XXGridMargin, XXGridMargin);
	layout.minimumInteritemSpacing = XXGridSpacing;
	layout.minimumLineSpacing = XXGridSpacing;

	return [self initWithCollectionViewLayout:layout];
}

- (id)initWithCollectionViewLayout:(UICollectionViewLayout *)layout {
	self = [super initWithCollectionViewLayout:layout];

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

- (void)viewDidLoad {
	[super viewDidLoad];

	self.collectionView.backgroundColor = [UIColor colorWithWhite:0.96f alpha:1.0f];
	self.collectionView.alwaysBounceVertical = YES;
	self.collectionView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
	[self.collectionView registerClass:[XXCoverCell class] forCellWithReuseIdentifier:XXCoverCellIdentifier];
}

- (void)viewWillLayoutSubviews {
	[super viewWillLayoutSubviews];

	CGFloat gutters = (2 * XXGridMargin) + ((XXGridColumns - 1) * XXGridSpacing);
	CGFloat available = CGRectGetWidth(self.collectionView.bounds) - gutters;

	if (available <= 0.0f) {
		return;
	}

	CGFloat itemWidth = floorf(available / XXGridColumns);
	CGSize itemSize = CGSizeMake(itemWidth, [XXCoverCell heightForWidth:itemWidth]);
	UICollectionViewFlowLayout *layout = (UICollectionViewFlowLayout *)self.collectionViewLayout;

	if (!CGSizeEqualToSize(layout.itemSize, itemSize)) {
		layout.itemSize = itemSize;
		[layout invalidateLayout];
	}
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
	NSDictionary *story = _stories[indexPath.item];

	[cell configureWithTitle:story[@"title"] duration:story[@"duration"] tint:story[@"tint"]];
	return cell;
}

#pragma mark - Collection View Delegate

- (void)collectionView:(UICollectionView *)collectionView didSelectItemAtIndexPath:(NSIndexPath *)indexPath {
	[collectionView deselectItemAtIndexPath:indexPath animated:YES];

	NSDictionary *story = _stories[indexPath.item];
	XXStoryDetailViewController *detail = [[XXStoryDetailViewController alloc] initWithTitle:story[@"title"]];
	[self.navigationController pushViewController:detail animated:YES];
}

@end
