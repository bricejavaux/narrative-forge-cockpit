#import "DetailViewController.h"
#import "LunyLibraryItem.h"
#import "LunyTheme.h"
#import "luny_engine.h"

#import <QuartzCore/QuartzCore.h>
#import <limits.h>

static const CGFloat kLunyDetailSideMargin = 20.0f;
static const CGFloat kLunyDetailGap = 10.0f;
static const CGFloat kLunyDetailImageMax = 176.0f;
static const CGFloat kLunyDetailButtonHeight = 44.0f;
static const CGFloat kLunyDetailArrowWidth = 56.0f;
static const CGFloat kLunyDetailDisabledAlpha = 0.35f;

@interface DetailViewController ()
{
    /*
     * Poignee C : ARC ne gere pas ce pointeur, il est ferme dans -dealloc.
     * NULL tant que le pack n'est pas charge, ou si le chargement a echoue.
     */
    luny_engine *_engine;
}
@property (nonatomic, copy) NSString *packPath;
@property (nonatomic, copy) NSString *packTitle;
@property (nonatomic, strong) UIImageView *imageView;
@property (nonatomic, strong) UILabel *imagePlaceholder;
@property (nonatomic, strong) UILabel *nodeNameLabel;
@property (nonatomic, strong) UILabel *stateLabel;
@property (nonatomic, strong) UILabel *statusLabel;
@property (nonatomic, strong) UIButton *leftButton;
@property (nonatomic, strong) UIButton *okButton;
@property (nonatomic, strong) UIButton *rightButton;
@end

@implementation DetailViewController

- (instancetype)initWithLibraryItem:(LunyLibraryItem *)item
{
    self = [super initWithNibName:nil bundle:nil];
    if (self) {
        _packPath = [item.packPath copy];
        _packTitle = item.title.length ? [item.title copy] : @"Histoire";
    }
    return self;
}

- (void)dealloc
{
    luny_close(_engine);
    _engine = NULL;
}

#pragma mark - Cycle de vie

- (void)viewDidLoad
{
    [super viewDidLoad];

    self.title = self.packTitle;
    self.view.backgroundColor = [LunyTheme backgroundDeep];

    [self buildSubviews];
    [self openPack];
    [self renderCurrentStage];
}

- (void)buildSubviews
{
    _imageView = [[UIImageView alloc] initWithFrame:CGRectZero];
    _imageView.contentMode = UIViewContentModeScaleAspectFit;
    _imageView.backgroundColor = [LunyTheme artBase];
    _imageView.layer.cornerRadius = 8.0f;
    _imageView.layer.masksToBounds = YES;
    [self.view addSubview:_imageView];

    // Affiche pourquoi le cadre est vide quand le noeud n'a pas d'image :
    // c'est le cas des noeuds "Histoire A"/"Histoire B" du pack two-branches.
    _imagePlaceholder = [self labelWithFont:[UIFont systemFontOfSize:12.0f]
                                      color:[LunyTheme textMuted]];
    _imagePlaceholder.textAlignment = NSTextAlignmentCenter;
    _imagePlaceholder.numberOfLines = 2;
    [self.view addSubview:_imagePlaceholder];

    _nodeNameLabel = [self labelWithFont:[UIFont boldSystemFontOfSize:19.0f]
                                   color:[LunyTheme textBright]];
    _nodeNameLabel.textAlignment = NSTextAlignmentCenter;
    [self.view addSubview:_nodeNameLabel];

    _stateLabel = [self labelWithFont:[UIFont systemFontOfSize:12.0f]
                                color:[LunyTheme textPrimary]];
    _stateLabel.textAlignment = NSTextAlignmentCenter;
    _stateLabel.numberOfLines = 2;
    [self.view addSubview:_stateLabel];

    _statusLabel = [self labelWithFont:[UIFont systemFontOfSize:11.0f]
                                 color:[LunyTheme textMuted]];
    _statusLabel.textAlignment = NSTextAlignmentCenter;
    _statusLabel.numberOfLines = 2;
    [self.view addSubview:_statusLabel];

    _leftButton = [self buttonWithTitle:@"‹" action:@selector(wheelLeftTapped:)];
    _okButton = [self buttonWithTitle:@"OK" action:@selector(okTapped:)];
    _rightButton = [self buttonWithTitle:@"›" action:@selector(wheelRightTapped:)];
}

- (UIButton *)buttonWithTitle:(NSString *)title action:(SEL)action
{
    UIButton *button = [UIButton buttonWithType:UIButtonTypeCustom];
    button.backgroundColor = [LunyTheme accentAmber];
    button.titleLabel.font = [UIFont boldSystemFontOfSize:20.0f];
    button.layer.cornerRadius = 8.0f;
    [button setTitle:title forState:UIControlStateNormal];
    [button setTitleColor:[LunyTheme artBase] forState:UIControlStateNormal];
    [button setTitleColor:[LunyTheme textMuted] forState:UIControlStateDisabled];
    [button addTarget:self action:action forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:button];
    return button;
}

- (UILabel *)labelWithFont:(UIFont *)font color:(UIColor *)color
{
    UILabel *label = [[UILabel alloc] initWithFrame:CGRectZero];
    label.font = font;
    label.textColor = color;
    label.backgroundColor = [UIColor clearColor];
    return label;
}

/*
 * Pas d'Auto Layout sur iOS 6 : empilement vertical calcule a la main. Le
 * calcul vit ici et non dans -viewDidLoad, ou la vue n'a pas encore recu sa
 * taille du UINavigationController.
 */
- (void)viewWillLayoutSubviews
{
    [super viewWillLayoutSubviews];

    CGRect bounds = self.view.bounds;
    CGFloat contentWidth = bounds.size.width - (kLunyDetailSideMargin * 2.0f);

    if (contentWidth <= 0.0f) {
        return;
    }

    CGFloat imageSide = contentWidth < kLunyDetailImageMax ? contentWidth : kLunyDetailImageMax;
    CGFloat y = kLunyDetailGap * 1.6f;

    self.imageView.frame = CGRectMake(floorf((bounds.size.width - imageSide) / 2.0f),
                                      y, imageSide, imageSide);
    self.imagePlaceholder.frame = self.imageView.frame;
    y += imageSide + kLunyDetailGap;

    self.nodeNameLabel.frame = CGRectMake(kLunyDetailSideMargin, y, contentWidth, 24.0f);
    y += 24.0f + 2.0f;

    self.stateLabel.frame = CGRectMake(kLunyDetailSideMargin, y, contentWidth, 32.0f);
    y += 32.0f + 2.0f;

    self.statusLabel.frame = CGRectMake(kLunyDetailSideMargin, y, contentWidth, 28.0f);

    // Rangee de commandes : [ < ] [   OK   ] [ > ]
    CGFloat rowY = bounds.size.height - kLunyDetailButtonHeight - (kLunyDetailGap * 1.6f);
    CGFloat okWidth = contentWidth - (2.0f * kLunyDetailArrowWidth) - (2.0f * kLunyDetailGap);

    if (okWidth < kLunyDetailArrowWidth) {
        okWidth = kLunyDetailArrowWidth;
    }

    self.leftButton.frame = CGRectMake(kLunyDetailSideMargin, rowY,
                                       kLunyDetailArrowWidth, kLunyDetailButtonHeight);
    self.okButton.frame = CGRectMake(kLunyDetailSideMargin + kLunyDetailArrowWidth + kLunyDetailGap,
                                     rowY, okWidth, kLunyDetailButtonHeight);
    self.rightButton.frame = CGRectMake(CGRectGetMaxX(self.okButton.frame) + kLunyDetailGap,
                                        rowY, kLunyDetailArrowWidth, kLunyDetailButtonHeight);
}

#pragma mark - Moteur

- (void)openPack
{
    if (!self.packPath) {
        self.statusLabel.text = @"pack introuvable dans le bundle";
        return;
    }

    luny_status status = luny_open([self.packPath fileSystemRepresentation], NULL, &_engine);

    if (status != LUNY_OK) {
        _engine = NULL;
        self.statusLabel.text = [NSString stringWithFormat:@"luny_open : %s",
                                 luny_status_str(status)];
    }
}

- (void)okTapped:(id)sender
{
    [self applyEvent:luny_ok label:@"ok"];
}

- (void)wheelLeftTapped:(id)sender
{
    [self applyEvent:luny_wheel_left label:@"wheel_left"];
}

- (void)wheelRightTapped:(id)sender
{
    [self applyEvent:luny_wheel_right label:@"wheel_right"];
}

/*
 * Chemin unique pour les trois commandes : emettre, reafficher, rapporter le
 * statut. Un evenement ignore laisse l'etat du moteur strictement inchange,
 * et le libelle permet de le constater a l'ecran plutot que de croire a un
 * bouton mort.
 */
- (void)applyEvent:(luny_event_status (*)(luny_engine *))event label:(NSString *)label
{
    if (!_engine) {
        return;
    }

    luny_event_status status = event(_engine);
    [self renderCurrentStage];

    self.statusLabel.text = [NSString stringWithFormat:@"%@ -> %s", label,
                             luny_event_status_str(status)];
}

/* Recopie a l'ecran l'etat renvoye par le moteur, sans rien en deduire. */
- (void)renderCurrentStage
{
    luny_stage_view stage;

    if (!_engine || !luny_current_stage(_engine, &stage)) {
        self.nodeNameLabel.text = @"aucun noeud";
        self.stateLabel.text = nil;
        self.imageView.image = nil;
        self.imagePlaceholder.text = nil;
        [self setButton:self.okButton enabled:NO];
        [self setButton:self.leftButton enabled:NO];
        [self setButton:self.rightButton enabled:NO];
        return;
    }

    self.nodeNameLabel.text = stage.name ? @(stage.name) : @"(sans nom)";
    [self loadImageNamed:stage.image];

    luny_action_view action;
    BOOL hasAction = luny_current_action(_engine, &action) && action.index >= 0;

    self.stateLabel.text = [NSString stringWithFormat:@"%@\n%@",
                            [self shortUUID:stage.uuid],
                            hasAction
                                ? [NSString stringWithFormat:@"option %d/%d",
                                   action.index + 1, action.option_count]
                                : @"hors contexte ActionNode"];

    // Meme regle de gating que le moteur : OK depend de controlSettings.ok ;
    // la molette exige controlSettings.wheel ET un contexte ActionNode
    // (luny_engine.h, commentaire de luny_wheel_left/right). Griser plutot
    // qu'emettre un evenement que le moteur ignorerait.
    [self setButton:self.okButton enabled:(stage.controls.ok != 0)];

    BOOL wheelUsable = (stage.controls.wheel != 0) && hasAction && (action.option_count > 0);
    [self setButton:self.leftButton enabled:wheelUsable];
    [self setButton:self.rightButton enabled:wheelUsable];
}

- (void)setButton:(UIButton *)button enabled:(BOOL)enabled
{
    button.enabled = enabled;
    button.alpha = enabled ? 1.0f : kLunyDetailDisabledAlpha;
}

- (void)loadImageNamed:(const char *)imageName
{
    if (!imageName) {
        self.imageView.image = nil;
        self.imagePlaceholder.text = @"(ce noeud n'a pas d'image)";
        return;
    }

    char path[PATH_MAX];
    int needed = luny_asset_path(_engine, imageName, path, sizeof(path));

    if (needed < 0 || needed >= (int)sizeof(path)) {
        self.imageView.image = nil;
        self.imagePlaceholder.text = @"(chemin d'asset indisponible)";
        return;
    }

    UIImage *image = [UIImage imageWithContentsOfFile:@(path)];
    self.imageView.image = image;
    // Un fichier present mais non decodable n'est pas la meme chose qu'un
    // noeud sans image : le distinguer evite de croire a un bug de graphe.
    self.imagePlaceholder.text = image ? nil : @"(image illisible)";
}

- (NSString *)shortUUID:(const char *)uuid
{
    if (!uuid) {
        return @"uuid absent";
    }

    NSString *full = @(uuid);
    return full.length > 12 ? [full substringFromIndex:full.length - 12] : full;
}

@end
