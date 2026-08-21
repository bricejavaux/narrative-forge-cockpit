#import "XXCoverCell.h"
#import <QuartzCore/QuartzCore.h>

static const CGFloat XXCoverTitleHeight = 18.0f;
static const CGFloat XXCoverDurationHeight = 14.0f;
static const CGFloat XXCoverLabelGap = 6.0f;

@interface XXCoverCell ()
@property (nonatomic, strong) UIView *coverView;
@property (nonatomic, strong) UILabel *initialLabel;
@property (nonatomic, strong) UILabel *titleLabel;
@property (nonatomic, strong) UILabel *durationLabel;
@end

@implementation XXCoverCell

+ (CGFloat)heightForWidth:(CGFloat)width {
	// Couverture carrée, puis les deux lignes de texte.
	return width + XXCoverLabelGap + XXCoverTitleHeight + XXCoverDurationHeight;
}

- (id)initWithFrame:(CGRect)frame {
	self = [super initWithFrame:frame];

	if (!self) {
		return nil;
	}

	_coverView = [[UIView alloc] initWithFrame:CGRectZero];
	_coverView.autoresizingMask = UIViewAutoresizingFlexibleWidth;
	_coverView.layer.cornerRadius = 6.0f;
	_coverView.clipsToBounds = YES;
	[self.contentView addSubview:_coverView];

	_initialLabel = [[UILabel alloc] initWithFrame:CGRectZero];
	_initialLabel.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
	_initialLabel.backgroundColor = [UIColor clearColor];
	_initialLabel.textColor = [UIColor colorWithWhite:1.0f alpha:0.9f];
	_initialLabel.textAlignment = NSTextAlignmentCenter;
	[_coverView addSubview:_initialLabel];

	_titleLabel = [[UILabel alloc] initWithFrame:CGRectZero];
	_titleLabel.autoresizingMask = UIViewAutoresizingFlexibleWidth;
	_titleLabel.backgroundColor = [UIColor clearColor];
	_titleLabel.font = [UIFont boldSystemFontOfSize:14.0f];
	_titleLabel.textColor = [UIColor colorWithWhite:0.12f alpha:1.0f];
	[self.contentView addSubview:_titleLabel];

	_durationLabel = [[UILabel alloc] initWithFrame:CGRectZero];
	_durationLabel.autoresizingMask = UIViewAutoresizingFlexibleWidth;
	_durationLabel.backgroundColor = [UIColor clearColor];
	_durationLabel.font = [UIFont systemFontOfSize:12.0f];
	_durationLabel.textColor = [UIColor colorWithWhite:0.45f alpha:1.0f];
	[self.contentView addSubview:_durationLabel];

	return self;
}

- (void)configureWithTitle:(NSString *)title duration:(NSString *)duration tint:(UIColor *)tint {
	_titleLabel.text = title;
	_durationLabel.text = duration;
	_coverView.backgroundColor = tint;
	_initialLabel.text = title.length ? [[title substringToIndex:1] uppercaseString] : @"";
}

- (void)layoutSubviews {
	[super layoutSubviews];

	CGRect bounds = self.contentView.bounds;
	CGFloat width = CGRectGetWidth(bounds);

	_coverView.frame = CGRectMake(0.0f, 0.0f, width, width);
	_initialLabel.frame = _coverView.bounds;
	_initialLabel.font = [UIFont boldSystemFontOfSize:floorf(width / 2.5f)];

	CGFloat titleTop = width + XXCoverLabelGap;
	_titleLabel.frame = CGRectMake(0.0f, titleTop, width, XXCoverTitleHeight);
	_durationLabel.frame = CGRectMake(0.0f, titleTop + XXCoverTitleHeight, width, XXCoverDurationHeight);
}

- (void)prepareForReuse {
	[super prepareForReuse];

	_titleLabel.text = nil;
	_durationLabel.text = nil;
	_initialLabel.text = nil;
	_coverView.backgroundColor = nil;
}

@end
