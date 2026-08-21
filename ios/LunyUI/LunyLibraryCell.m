#import "LunyLibraryCell.h"
#import "LunyLibraryItem.h"
#import "LunyTheme.h"
#import <QuartzCore/QuartzCore.h>

/* Hauteur reservee au bloc titre + duree, sous le rectangle de couverture. */
static const CGFloat kLunyCellTextBlockHeight = 44.0f;
static const CGFloat kLunyCellPadding = 8.0f;
static const CGFloat kLunyCellCornerRadius = 10.0f;

@interface LunyLibraryCell ()
@property (nonatomic, strong) UIView  *coverView;
@property (nonatomic, strong) UILabel *initialLabel;
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
        self.backgroundColor = [LunyTheme surface];
        self.layer.cornerRadius = kLunyCellCornerRadius;
        self.layer.masksToBounds = YES;

        _coverView = [[UIView alloc] initWithFrame:CGRectZero];
        _coverView.backgroundColor = [LunyTheme artBase];
        _coverView.layer.cornerRadius = 6.0f;
        _coverView.layer.masksToBounds = YES;
        _coverView.autoresizingMask = UIViewAutoresizingFlexibleWidth;
        [self.contentView addSubview:_coverView];

        // Initiale du titre : seul "motif" de couverture tant qu'il n'y a pas
        // d'illustration reelle. Taille recalculee dans -layoutSubviews.
        _initialLabel = [[UILabel alloc] initWithFrame:CGRectZero];
        _initialLabel.backgroundColor = [UIColor clearColor];
        _initialLabel.textAlignment = NSTextAlignmentCenter;
        _initialLabel.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        [_coverView addSubview:_initialLabel];

        _titleLabel = [[UILabel alloc] initWithFrame:CGRectZero];
        _titleLabel.font = [UIFont boldSystemFontOfSize:13.0f];
        _titleLabel.textColor = [LunyTheme textBright];
        _titleLabel.numberOfLines = 2;
        _titleLabel.backgroundColor = [UIColor clearColor];
        [self.contentView addSubview:_titleLabel];

        _durationLabel = [[UILabel alloc] initWithFrame:CGRectZero];
        _durationLabel.font = [UIFont systemFontOfSize:10.0f];
        _durationLabel.textColor = [LunyTheme textMuted];
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

    if (coverHeight < 0.0f) {
        coverHeight = 0.0f;
    }

    self.coverView.frame = CGRectMake(0.0f, 0.0f, bounds.size.width, coverHeight);
    self.initialLabel.frame = self.coverView.bounds;
    self.initialLabel.font = [UIFont boldSystemFontOfSize:floorf(coverHeight / 2.2f)];

    CGFloat textY = coverHeight + 4.0f;
    CGFloat textWidth = bounds.size.width - (kLunyCellPadding * 2.0f);

    self.titleLabel.frame = CGRectMake(kLunyCellPadding, textY, textWidth, 28.0f);
    self.durationLabel.frame = CGRectMake(kLunyCellPadding, textY + 26.0f, textWidth, 12.0f);
}

- (void)configureWithItem:(LunyLibraryItem *)item accent:(UIColor *)accent
{
    self.titleLabel.text = item.title;
    self.durationLabel.text = [NSString stringWithFormat:@"%ld min", (long)item.durationMinutes];

    self.coverView.backgroundColor = [LunyTheme coverTintForAccent:accent];
    self.initialLabel.textColor = accent;
    self.initialLabel.text = item.title.length ? [[item.title substringToIndex:1] uppercaseString] : @"";
}

- (void)prepareForReuse
{
    [super prepareForReuse];

    self.titleLabel.text = nil;
    self.durationLabel.text = nil;
    self.initialLabel.text = nil;
    self.coverView.backgroundColor = [LunyTheme artBase];
}

@end
