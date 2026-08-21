#import "LunyLibraryCell.h"
#import "LunyLibraryItem.h"

/* Hauteur reservee au bloc titre + duree, sous le rectangle de couverture. */
static const CGFloat kLunyCellTextBlockHeight = 44.0f;
static const CGFloat kLunyCellPadding = 8.0f;

@interface LunyLibraryCell ()
@property (nonatomic, strong) UIView  *coverView;
@property (nonatomic, strong) UILabel *titleLabel;
@property (nonatomic, strong) UILabel *durationLabel;
@end

@implementation LunyLibraryCell

+ (NSString *)reuseIdentifier
{
    return @"LunyLibraryCell";
}

- (instancetype)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:frame];
    if (self) {
        // #141A32 — couleur de tuile du mockup (mockup/luny_maquette_v3.html, .tile)
        self.backgroundColor = [UIColor colorWithRed:0.078f green:0.102f blue:0.196f alpha:1.0f];
        self.layer.cornerRadius = 10.0f;
        self.layer.masksToBounds = YES;

        _coverView = [[UIView alloc] initWithFrame:CGRectZero];
        // #060812 — couleur de fond d'art du mockup (.art)
        _coverView.backgroundColor = [UIColor colorWithRed:0.024f green:0.031f blue:0.071f alpha:1.0f];
        [self.contentView addSubview:_coverView];

        _titleLabel = [[UILabel alloc] initWithFrame:CGRectZero];
        _titleLabel.font = [UIFont boldSystemFontOfSize:13.0f];
        // #E7ECFA
        _titleLabel.textColor = [UIColor colorWithRed:0.906f green:0.925f blue:0.980f alpha:1.0f];
        _titleLabel.numberOfLines = 2;
        _titleLabel.backgroundColor = [UIColor clearColor];
        [self.contentView addSubview:_titleLabel];

        _durationLabel = [[UILabel alloc] initWithFrame:CGRectZero];
        _durationLabel.font = [UIFont systemFontOfSize:10.0f];
        // #5F6B93
        _durationLabel.textColor = [UIColor colorWithRed:0.373f green:0.420f blue:0.576f alpha:1.0f];
        _durationLabel.backgroundColor = [UIColor clearColor];
        [self.contentView addSubview:_durationLabel];
    }
    return self;
}

- (void)layoutSubviews
{
    [super layoutSubviews];

    CGRect bounds = self.contentView.bounds;
    CGFloat coverHeight = bounds.size.height - kLunyCellTextBlockHeight;
    self.coverView.frame = CGRectMake(0.0f, 0.0f, bounds.size.width, coverHeight);

    CGFloat textY = coverHeight + 4.0f;
    CGFloat textWidth = bounds.size.width - (kLunyCellPadding * 2.0f);

    self.titleLabel.frame = CGRectMake(kLunyCellPadding, textY, textWidth, 28.0f);
    self.durationLabel.frame = CGRectMake(kLunyCellPadding, textY + 26.0f, textWidth, 12.0f);
}

- (void)configureWithItem:(LunyLibraryItem *)item
{
    self.titleLabel.text = item.title;
    self.durationLabel.text = [NSString stringWithFormat:@"%ld min", (long)item.durationMinutes];
}

@end
