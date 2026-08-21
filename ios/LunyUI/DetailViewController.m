#import "DetailViewController.h"
#import "LunyTheme.h"
#import "luny_engine.h"

#import <QuartzCore/QuartzCore.h>
#import <limits.h>

static const CGFloat kLunyDetailSideMargin = 20.0f;
static const CGFloat kLunyDetailGap = 10.0f;
static const CGFloat kLunyDetailImageMax = 176.0f;
static const CGFloat kLunyDetailButtonHeight = 44.0f;

/* Nom du pack embarque dans Resources/packs/. */
static NSString * const kLunyPackName = @"two-branches";

@interface DetailViewController ()
{
    /*
     * Poignee C : ARC ne gere pas ce pointeur, il est ferme dans -dealloc.
     * NULL tant que le pack n'est pas charge, ou si le chargement a echoue.
     */
    luny_engine *_engine;
}
@property (nonatomic, copy) NSString *storyTitle;
@property (nonatomic, strong) UIImageView *imageView;
@property (nonatomic, strong) UILabel *imagePlaceholder;
@property (nonatomic, strong) UILabel *nodeNameLabel;
@property (nonatomic, strong) UILabel *stateLabel;
@property (nonatomic, strong) UILabel *statusLabel;
@property (nonatomic, strong) UIButton *okButton;
@end

@implementation DetailViewController

- (instancetype)initWithStoryTitle:(NSString *)storyTitle
{
    self = [super initWithNibName:nil bundle:nil];
    if (self) {
        _storyTitle = storyTitle.length ? [storyTitle copy] : @"Histoire";
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

    self.title = self.storyTitle;
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
    // c'est le cas des noeuds "Histoire A"/"Histoire B" du pack de test.
    _imagePlaceholder = [self labelWithFont:[UIFont systemFontOfSize:12.0f]
                                      color:[LunyTheme textMuted]];
    _imagePlaceholder.textAlignment = NSTextAlignmentCenter;
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

    _okButton = [UIButton buttonWithType:UIButtonTypeCustom];
    _okButton.backgroundColor = [LunyTheme accentAmber];
    _okButton.titleLabel.font = [UIFont boldSystemFontOfSize:17.0f];
    _okButton.layer.cornerRadius = 8.0f;
    [_okButton setTitle:@"OK" forState:UIControlStateNormal];
    [_okButton setTitleColor:[LunyTheme artBase] forState:UIControlStateNormal];
    [_okButton setTitleColor:[LunyTheme textMuted] forState:UIControlStateDisabled];
    [_okButton addTarget:self action:@selector(okTapped:) forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:_okButton];
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

    self.okButton.frame = CGRectMake(kLunyDetailSideMargin,
                                     bounds.size.height - kLunyDetailButtonHeight - kLunyDetailGap * 1.6f,
                                     contentWidth,
                                     kLunyDetailButtonHeight);
}

#pragma mark - Moteur

- (void)openPack
{
    NSString *packDir = [[NSBundle mainBundle] pathForResource:kLunyPackName
                                                        ofType:nil
                                                   inDirectory:@"packs"];

    if (!packDir) {
        self.statusLabel.text = @"pack introuvable dans le bundle";
        return;
    }

    luny_status status = luny_open([packDir fileSystemRepresentation], NULL, &_engine);

    if (status != LUNY_OK) {
        _engine = NULL;
        self.statusLabel.text = [NSString stringWithFormat:@"luny_open : %s",
                                 luny_status_str(status)];
    }
}

- (void)okTapped:(id)sender
{
    if (!_engine) {
        return;
    }

    luny_event_status status = luny_ok(_engine);
    [self renderCurrentStage];

    // Le statut est affiche apres le rendu : un evenement ignore laisse
    // l'etat inchange, et c'est precisement ce qu'on veut pouvoir constater.
    self.statusLabel.text = [NSString stringWithFormat:@"ok -> %s",
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
        self.okButton.enabled = NO;
        self.okButton.alpha = 0.4f;
        return;
    }

    self.nodeNameLabel.text = stage.name ? @(stage.name) : @"(sans nom)";
    [self loadImageNamed:stage.image];

    self.stateLabel.text = [NSString stringWithFormat:@"%@\n%@",
                            [self shortUUID:stage.uuid],
                            [self actionDescription]];

    // Le bouton reflete controlSettings.ok du noeud : sur un noeud terminal
    // du pack de test (ok=0), il se grise au lieu d'emettre un evenement
    // que le moteur ignorerait.
    BOOL okEnabled = (stage.controls.ok != 0);
    self.okButton.enabled = okEnabled;
    self.okButton.alpha = okEnabled ? 1.0f : 0.4f;
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

- (NSString *)actionDescription
{
    luny_action_view action;

    if (!luny_current_action(_engine, &action) || action.index < 0) {
        return @"hors contexte ActionNode";
    }

    return [NSString stringWithFormat:@"option %d/%d", action.index + 1, action.option_count];
}

@end
