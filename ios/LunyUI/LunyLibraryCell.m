#import "LunyLibraryCell.h"
#import "LunyLibraryItem.h"
#import "LunyTheme.h"
#import "LunySimulatedAudio.h"
#import <QuartzCore/QuartzCore.h>

/*
 * Hauteur reservee au bloc titre + duree, sous la couverture. Corps plus
 * genereux qu'avant : la tuile respire au lieu de remplir.
 */
static const CGFloat kLunyCellTextBlockHeight = 52.0f;
static const CGFloat kLunyCellPadding = 10.0f;

/*
 * Rayon de la tuile. layer.cornerRadius seul reste peu couteux ; c'est
 * l'association a masksToBounds qui force un rendu hors ecran, deja le cas
 * ici pour rogner la couverture. 14pt est le maximum qui garde un carre
 * lisible a 140pt de cote — au-dela la vignette tourne au galet.
 */
static const CGFloat kLunyCellCornerRadius = 14.0f;
static const CGFloat kLunyCoverCornerRadius = 10.0f;

@interface LunyLibraryCell ()
@property (nonatomic, strong) UIView  *coverView;
@property (nonatomic, strong) UILabel *initialLabel;
@property (nonatomic, strong) UILabel *titleLabel;
@property (nonatomic, strong) UILabel *subtitleLabel;
@end

@implementation LunyLibraryCell

+ (NSString *)reuseIdentifier
{
    return @"LunyLibraryCell";
}

+ (CGFloat)textBlockHeight
{
    return kLunyCellTextBlockHeight;
}

/*
 * Initiale affichee sur la couverture.
 *
 * Prendre betement title[0] donne la meme lettre sur toutes les tuiles des
 * que les titres sont francais : "La nuit du renard", "Le phare endormi",
 * "L'etoile qui baille", "Le chemin perdu" commencent tous par L. On saute
 * donc l'article initial, elide ("L'") ou non ("La "), pour retomber sur une
 * lettre discriminante. Un titre sans article est traite tel quel.
 */
+ (NSString *)coverInitialForTitle:(NSString *)title
{
    NSString *trimmed = [title stringByTrimmingCharactersInSet:
                         [NSCharacterSet whitespaceAndNewlineCharacterSet]];

    if (!trimmed.length) {
        return @"";
    }

    NSString *candidate = trimmed;

    // Article elide : une lettre suivie d'une apostrophe. Les deux formes sont
    // acceptees, un vrai pack pouvant porter l'apostrophe typographique.
    if (trimmed.length >= 2) {
        unichar second = [trimmed characterAtIndex:1];

        if (second == '\'' || second == 0x2019) {
            candidate = [trimmed substringFromIndex:2];
        }
    }

    // Article detache : on passe au mot suivant s'il en existe un.
    if (candidate == trimmed) {
        static NSSet *articles = nil;
        static dispatch_once_t onceToken;
        dispatch_once(&onceToken, ^{
            articles = [NSSet setWithObjects:@"la", @"le", @"les", @"un", @"une",
                        @"des", @"du", @"de", nil];
        });

        NSRange space = [trimmed rangeOfCharacterFromSet:
                         [NSCharacterSet whitespaceCharacterSet]];

        if (space.location != NSNotFound) {
            NSString *firstWord = [[trimmed substringToIndex:space.location] lowercaseString];

            if ([articles containsObject:firstWord]) {
                candidate = [trimmed substringFromIndex:space.location + space.length];
            }
        }
    }

    candidate = [candidate stringByTrimmingCharactersInSet:
                 [NSCharacterSet whitespaceAndNewlineCharacterSet]];

    // Un titre reduit a son seul article ("Le") retombe sur le titre complet
    // plutot que sur une tuile muette.
    if (!candidate.length) {
        candidate = trimmed;
    }

    return [[candidate substringToIndex:1] uppercaseString];
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
        _coverView.layer.cornerRadius = kLunyCoverCornerRadius;
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
        _titleLabel.font = [UIFont boldSystemFontOfSize:14.0f];
        _titleLabel.textColor = [LunyTheme textBright];
        _titleLabel.numberOfLines = 2;
        _titleLabel.backgroundColor = [UIColor clearColor];
        [self.contentView addSubview:_titleLabel];

        _subtitleLabel = [[UILabel alloc] initWithFrame:CGRectZero];
        _subtitleLabel.font = [UIFont systemFontOfSize:11.0f];
        _subtitleLabel.textColor = [LunyTheme textMuted];
        _subtitleLabel.backgroundColor = [UIColor clearColor];
        [self.contentView addSubview:_subtitleLabel];
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
    // Initiale en grand caractere centre : c'est le motif de la couverture.
    self.initialLabel.font = [UIFont boldSystemFontOfSize:floorf(coverHeight / 1.9f)];

    CGFloat textY = coverHeight + 6.0f;
    CGFloat textWidth = bounds.size.width - (kLunyCellPadding * 2.0f);

    self.titleLabel.frame = CGRectMake(kLunyCellPadding, textY, textWidth, 30.0f);
    self.subtitleLabel.frame = CGRectMake(kLunyCellPadding, textY + 29.0f, textWidth, 13.0f);
}

- (void)configureWithItem:(LunyLibraryItem *)item accent:(UIColor *)accent
{
    self.titleLabel.text = item.title;

    // Duree SIMULEE : le format n'en expose aucune (cf. LunySimulatedAudio.h).
    // Un pack illisible le dit plutot que d'afficher une duree rassurante.
    self.subtitleLabel.text = item.loaded
        ? [LunySimulatedAudio formattedSeconds:item.simulatedDuration]
        : @"pack illisible";

    self.coverView.backgroundColor = [LunyTheme coverTintForAccent:accent];
    self.initialLabel.textColor = accent;
    self.initialLabel.text = [[self class] coverInitialForTitle:item.title];
}

- (void)prepareForReuse
{
    [super prepareForReuse];

    self.titleLabel.text = nil;
    self.subtitleLabel.text = nil;
    self.initialLabel.text = nil;
    self.coverView.backgroundColor = [LunyTheme artBase];
}

@end
