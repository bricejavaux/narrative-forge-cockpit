#import "DetailViewController.h"
#import "LunyTheme.h"

static const CGFloat kLunyDetailSideMargin = 20.0f;
static const CGFloat kLunyDetailTitleHeight = 80.0f;
static const CGFloat kLunyDetailRuleWidth = 48.0f;
static const CGFloat kLunyDetailRuleHeight = 2.0f;
static const CGFloat kLunyDetailRuleGap = 14.0f;

@interface DetailViewController ()
@property (nonatomic, copy) NSString *storyTitle;
@property (nonatomic, strong) UILabel *titleLabel;
@property (nonatomic, strong) UIView *accentRule;
@end

@implementation DetailViewController

- (instancetype)initWithStoryTitle:(NSString *)storyTitle
{
    self = [super initWithNibName:nil bundle:nil];
    if (self) {
        // Repli si l'appelant transmet un titre vide : l'ecran ne doit jamais
        // apparaitre completement muet.
        _storyTitle = storyTitle.length ? [storyTitle copy] : @"Histoire";
    }
    return self;
}

- (void)viewDidLoad
{
    [super viewDidLoad];

    // self.title alimente aussi le bouton retour automatique de la tuile
    // precedente dans la pile de navigation ; rien d'autre a faire pour lui.
    self.title = self.storyTitle;
    self.view.backgroundColor = [LunyTheme backgroundDeep];

    _titleLabel = [[UILabel alloc] initWithFrame:CGRectZero];
    _titleLabel.text = self.storyTitle;
    _titleLabel.textColor = [LunyTheme textBright];
    _titleLabel.font = [UIFont boldSystemFontOfSize:20.0f];
    // NSTextAlignmentCenter (et non l'ancien UITextAlignmentCenter, retire
    // au profit de NSTextAlignment* precisement en iOS 6.0 — voir NOTES.md).
    _titleLabel.textAlignment = NSTextAlignmentCenter;
    _titleLabel.numberOfLines = 0;
    _titleLabel.backgroundColor = [UIColor clearColor];
    _titleLabel.autoresizingMask = UIViewAutoresizingFlexibleWidth
                                 | UIViewAutoresizingFlexibleTopMargin
                                 | UIViewAutoresizingFlexibleBottomMargin;
    [self.view addSubview:_titleLabel];

    _accentRule = [[UIView alloc] initWithFrame:CGRectZero];
    _accentRule.backgroundColor = [LunyTheme accentAmber];
    _accentRule.autoresizingMask = UIViewAutoresizingFlexibleTopMargin
                                 | UIViewAutoresizingFlexibleBottomMargin
                                 | UIViewAutoresizingFlexibleLeftMargin
                                 | UIViewAutoresizingFlexibleRightMargin;
    [self.view addSubview:_accentRule];
}

/*
 * Le centrage est calcule ici, pas dans -viewDidLoad : a ce moment la vue
 * n'a pas encore recu sa taille definitive du UINavigationController, et un
 * frame derive de bounds vides placerait le libelle hors de l'ecran.
 * Pas d'Auto Layout sur iOS 6 : le recalcul manuel est le mecanisme prevu.
 */
- (void)viewWillLayoutSubviews
{
    [super viewWillLayoutSubviews];

    CGRect bounds = self.view.bounds;
    CGFloat labelWidth = bounds.size.width - (kLunyDetailSideMargin * 2.0f);

    if (labelWidth <= 0.0f) {
        return;
    }

    CGFloat blockHeight = kLunyDetailTitleHeight + kLunyDetailRuleGap + kLunyDetailRuleHeight;
    CGFloat blockTop = floorf((bounds.size.height - blockHeight) / 2.0f);

    self.titleLabel.frame = CGRectMake(kLunyDetailSideMargin, blockTop, labelWidth, kLunyDetailTitleHeight);
    self.accentRule.frame = CGRectMake(floorf((bounds.size.width - kLunyDetailRuleWidth) / 2.0f),
                                       blockTop + kLunyDetailTitleHeight + kLunyDetailRuleGap,
                                       kLunyDetailRuleWidth,
                                       kLunyDetailRuleHeight);
}

@end
