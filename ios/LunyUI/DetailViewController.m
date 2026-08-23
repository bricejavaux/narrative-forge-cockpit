#import "DetailViewController.h"
#import "LunyDebug.h"
#import "LunyLibraryItem.h"
#import "LunyAudioTrack.h"
#import "LunySimulatedAudio.h"
#import "LunyTheme.h"
#import "luny_engine.h"

#import <QuartzCore/QuartzCore.h>
#import <limits.h>

/* Zone d'art : 320x240 en haut, comme la maquette. Bornee pour qu'il reste
 * toujours de quoi poser les commandes sur un ecran plus court. */
static const CGFloat kLunyArtHeight = 240.0f;
static const CGFloat kLunyControlsMinHeight = 156.0f;

static const CGFloat kLunyPad = 10.0f;

/*
 * Le rail visible fait 6pt, mais sa zone est haute de 30pt. Regle actee sur
 * la maquette : sur 3,5 pouces a 163 ppp, viser 6 pixels au doigt est hors de
 * portee d'un enfant. Le trait fin est esthetique, la surface est
 * fonctionnelle — ne pas confondre les deux si l'ecran est refait.
 */
static const CGFloat kLunyTrackZoneHeight = 30.0f;
static const CGFloat kLunyTrackRailHeight = 6.0f;
static const CGFloat kLunyTimeLabelWidth = 74.0f;
static const CGFloat kLunyThumbSize = 17.0f;

/* Meme principe pour les fleches : zone large, glyphe fin. */
static const CGFloat kLunyArrowWidth = 58.0f;
static const CGFloat kLunyButtonHeight = 52.0f;

/* Bouton HOME pose sur l'illustration. 44pt minimum : c'est la plus petite
 * cible tactile confortable, et il n'y a pas de raison d'etre plus avare ici
 * que sur les fleches. */
static const CGFloat kLunyHomeHeight = 44.0f;
static const CGFloat kLunyHomeWidth = 78.0f;
static const CGFloat kLunyHomeInset = 10.0f;

/* Fondu entre deux noeuds. Court : sur un 3GS une transition longue se voit
 * comme une lenteur, pas comme une intention. */
static const NSTimeInterval kLunyFadeDuration = 0.22;

static const CGFloat kLunyDotSize = 7.0f;
static const CGFloat kLunyDotGap = 6.0f;
static const NSInteger kLunyDotMax = 10;

@interface DetailViewController () <LunyAudioTrackDelegate>
{
    /* Poignee C : ARC ne gere pas ce pointeur, ferme dans -dealloc. */
    luny_engine *_engine;

    /* Etat du glissement sur la barre. */
    BOOL _scrubbing;
    BOOL _wasPlayingBeforeScrub;

    /* Arme par -applyEvent: quand le moteur a reellement change de noeud :
     * seul ce cas merite un fondu, pas un simple rafraichissement. */
    BOOL _fadeNextRender;
}
@property (nonatomic, copy) NSString *packPath;
@property (nonatomic, copy) NSString *packTitle;

@property (nonatomic, strong) UIButton *backButton;
@property (nonatomic, strong) UIView *artContainer;
@property (nonatomic, strong) UIImageView *imageView;
@property (nonatomic, strong) UILabel *imagePlaceholder;
@property (nonatomic, strong) UIButton *homeButton;
@property (nonatomic, strong) UIView *controlsPanel;

@property (nonatomic, strong) UIView *trackRail;
@property (nonatomic, strong) UIView *trackFill;
@property (nonatomic, strong) UIView *trackThumb;
@property (nonatomic, strong) UIView *trackTouchZone;
@property (nonatomic, strong) UILabel *timeLabel;

@property (nonatomic, strong) UIButton *leftButton;
@property (nonatomic, strong) UIButton *mainButton;
@property (nonatomic, strong) UIButton *rightButton;

@property (nonatomic, strong) UIView *dotsView;
@property (nonatomic, strong) NSMutableArray *dots;

@property (nonatomic, strong) LunyAudioTrack *track;

#if LUNY_DEBUG
@property (nonatomic, strong) UILabel *debugLabel;
#endif
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
    // La piste possede un NSTimer qui retient sa cible : la decharger coupe
    // aussi ce minuteur, sans quoi il battrait apres le retour.
    [_track unload];

    luny_close(_engine);
    _engine = NULL;
}

#pragma mark - Cycle de vie

- (void)viewDidLoad
{
    [super viewDidLoad];

    self.title = self.packTitle;
    self.view.backgroundColor = [LunyTheme backgroundDeep];

    _track = [[LunyAudioTrack alloc] init];
    _track.delegate = self;

    [self buildBackButton];
    [self buildSubviews];
    [self openPack];
    [self renderCurrentStage];
    [self startTrackForCurrentStage];
}

/*
 * La barre de navigation est masquee sur la bibliotheque (voir
 * RootViewController) : cet ecran la redemande pour lui, sans quoi son bouton
 * retour n'aurait nulle part ou s'afficher. Le reglage est porte par la pile,
 * donc chaque ecran doit declarer ce qu'il veut a chaque apparition.
 */
- (void)viewWillAppear:(BOOL)animated
{
    [super viewWillAppear:animated];
    [self.navigationController setNavigationBarHidden:NO animated:animated];
}

#if LUNY_DEBUG
/*
 * Parcours automatique : sans doigt sur la vitre, la seule facon de mesurer
 * le bouton retour sur PLUSIEURS noeuds, y compris ceux ou ok=false et
 * pause=true — precisement ceux dont on doute.
 *
 * Le pas d'avance suit l'etat du noeud : OK la ou il est autorise, fin de
 * piste ailleurs, ce qui est aussi la seule transition que ces noeuds
 * acceptent. Borne en nombre de pas : un pack cyclique ne finirait jamais.
 */
static const NSInteger kLunyAuditPasMax = 8;

- (void)viewDidAppear:(BOOL)animated
{
    [super viewDidAppear:animated];

    if (!LunyDebugAuditArmed()) {
        return;
    }

    [self auditReleveEtape:0];
}

- (void)auditReleveEtape:(NSInteger)etape
{
    luny_stage_view stage;
    BOOL ok = (_engine && luny_current_stage(_engine, &stage));

    /*
     * La fin d'une histoire depile cet ecran. Un releve fait pendant que la
     * vue glisse dehors mesure des cadres decales de la largeur de l'ecran et
     * se lirait comme un bouton disparu — ce n'en est pas un. On arrete donc
     * l'audit des que cet ecran n'est plus le sommet de la pile.
     */
    if (self.navigationController.topViewController != self) {
        LunyDebugTrace(@"--- LECTURE, noeud %d : ecran en cours de depilement, "
                       @"releve sans objet, audit arrete ---", (int)etape);
        LunyDebugTrace(@"=== FIN DE L'AUDIT ===");
        return;
    }

    LunyDebugTrace(@"--- LECTURE, noeud %d ---", (int)etape);

    if (ok) {
        LunyDebugTrace(@"noeud=%s controls ok=%d pause=%d wheel=%d home=%d autoplay=%d",
                       stage.uuid ? stage.uuid : "?",
                       stage.controls.ok, stage.controls.pause, stage.controls.wheel,
                       stage.controls.home, stage.controls.autoplay);
    } else {
        LunyDebugTrace(@"noeud indisponible");
    }

    LunyDebugTrace(@"barre masquee (drapeau) = %@",
                   self.navigationController.navigationBarHidden ? @"OUI" : @"NON");
    LunyDebugTrace(@"%@", LunyDebugDescribeView(self.navigationController.navigationBar,
                                                @"barreNav"));
    LunyDebugTrace(@"%@", LunyDebugDescribeView(self.backButton, @"boutonRetour"));
    LunyDebugTrace(@"boutonRetour libelle=« %@ » cible=%@",
                   [self.backButton titleForState:UIControlStateNormal],
                   [self.backButton actionsForTarget:self
                                     forControlEvent:UIControlEventTouchUpInside] ?: @"AUCUNE");
    LunyDebugTrace(@"%@", LunyDebugDescribeView(self.homeButton, @"boutonDebut"));
    LunyDebugTrace(@"%@", LunyDebugDescribeView(self.mainButton, @"boutonCentral"));

    if (etape >= kLunyAuditPasMax || !ok) {
        LunyDebugTrace(@"=== FIN DE L'AUDIT ===");
        return;
    }

    // Avance d'un noeud, puis nouveau releve une fois le rendu pose.
    if (stage.controls.ok) {
        [self applyEvent:luny_ok label:@"audit_ok"];
    } else {
        [self applyEvent:luny_audio_ended label:@"audit_ended"];
    }

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.6 * NSEC_PER_SEC)),
                   dispatch_get_main_queue(), ^{
        [self auditReleveEtape:etape + 1];
    });
}
#endif

- (void)viewWillDisappear:(BOOL)animated
{
    [super viewWillDisappear:animated];

    // L'ecran quitte la pile : la piste n'a plus d'auditeur.
    [self.track unload];
}

/*
 * Bouton retour a vue personnalisee, aux memes codes que « Choisir » et
 * « Debut » : aplat d'accent, coins arrondis, libelle court. Le bouton
 * systeme d'UINavigationController jurait avec le reste.
 *
 * Le chevron U+2039 est employe plutot qu'une fleche : la police de cet
 * appareil rend .notdef pour U+2190 et U+21A9, verifie par
 * CTFontGetGlyphsForCharacters, alors que U+2039 y a un vrai glyphe (190).
 *
 * Le comportement ne change pas : depile la pile de navigation.
 *
 * Cette methode avait ete ecrite mais JAMAIS APPELEE, et l'ecran s'etait
 * retrouve sans aucun retour. Deux causes cumulees, chacune insuffisante
 * seule :
 *   1. sans -buildBackButton, leftBarButtonItem restait nul ;
 *   2. le bouton retour par defaut d'UINavigationController tire son libelle
 *      du titre du controleur PRECEDENT — que la bibliotheque avait vide
 *      (navigationItem.title = @"") pour supprimer un titre en double. Un
 *      libelle vide donne un bouton vide, donc invisible.
 * Le repli systeme etait donc mort au moment ou son remplacant ne naissait
 * pas. La bibliotheque masque desormais sa barre entierement plutot que d'en
 * vider le titre, ce qui supprime la cause 2 ; l'appel ci-dessus supprime la 1.
 *
 * Le bouton est construit une fois pour toutes dans -viewDidLoad et aucun
 * chemin de rendu n'y touche : il reste donc present et actif sur tous les
 * noeuds, y compris ceux ou ok=false et pause=true, qui n'eteignent que le
 * bouton central.
 */
- (void)buildBackButton
{
    UIButton *button = [UIButton buttonWithType:UIButtonTypeCustom];
    button.titleLabel.font = [UIFont boldSystemFontOfSize:14.0f];
    button.layer.cornerRadius = 8.0f;
    button.clipsToBounds = YES;
    button.frame = CGRectMake(0.0f, 0.0f, 78.0f, 30.0f);
    [button setTitle:@"‹ Retour" forState:UIControlStateNormal];
    [button setTitleColor:[LunyTheme textOnAccent] forState:UIControlStateNormal];
    [self applyBackgroundColor:[LunyTheme accentAmber] toButton:button];
    [button addTarget:self action:@selector(backTapped:)
     forControlEvents:UIControlEventTouchUpInside];

    _backButton = button;
    self.navigationItem.leftBarButtonItem =
        [[UIBarButtonItem alloc] initWithCustomView:button];
}

- (void)backTapped:(id)sender
{
    [self.navigationController popViewControllerAnimated:YES];
}

- (void)buildSubviews
{
    // L'illustration et son texte de remplacement vivent dans un conteneur :
    // c'est lui qu'on fait fondre d'un noeud a l'autre, en un seul geste.
    _artContainer = [[UIView alloc] initWithFrame:CGRectZero];
    _artContainer.backgroundColor = [LunyTheme artBase];
    _artContainer.clipsToBounds = YES;
    [self.view addSubview:_artContainer];

    _imageView = [[UIImageView alloc] initWithFrame:CGRectZero];
    _imageView.contentMode = UIViewContentModeScaleAspectFill;
    _imageView.backgroundColor = [LunyTheme artBase];
    _imageView.clipsToBounds = YES;
    [_artContainer addSubview:_imageView];

    _imagePlaceholder = [self labelWithFont:[UIFont boldSystemFontOfSize:17.0f]
                                      color:[LunyTheme textDisabled]];
    _imagePlaceholder.textAlignment = NSTextAlignmentCenter;
    _imagePlaceholder.numberOfLines = 2;
    [_artContainer addSubview:_imagePlaceholder];

    /*
     * HOME du graphe narratif, distinct du bouton retour de la barre de
     * navigation : celui-ci quitte l'histoire, celui-la la recommence.
     * Pose hors du conteneur d'art pour ne pas fondre avec l'illustration.
     *
     * Libelle textuel et non pictogramme : la police du 3GS n'a ni maison
     * (U+2302) ni fleche circulaire (U+21BA) — verifie sur l'appareil, les
     * deux rendent .notdef.
     */
    _homeButton = [UIButton buttonWithType:UIButtonTypeCustom];
    _homeButton.titleLabel.font = [UIFont boldSystemFontOfSize:13.0f];
    _homeButton.layer.cornerRadius = 12.0f;
    _homeButton.clipsToBounds = YES;
    [_homeButton setTitle:@"Début" forState:UIControlStateNormal];
    [_homeButton setTitleColor:[LunyTheme textPrimary] forState:UIControlStateNormal];
    [_homeButton setTitleColor:[LunyTheme textMuted] forState:UIControlStateDisabled];
    [self applyBackgroundColor:[LunyTheme overlaySurface] toButton:_homeButton];
    [_homeButton addTarget:self action:@selector(homeTapped:) forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:_homeButton];

    _controlsPanel = [[UIView alloc] initWithFrame:CGRectZero];
    _controlsPanel.backgroundColor = [LunyTheme controlsSurface];
    _controlsPanel.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self.view addSubview:_controlsPanel];

    _trackRail = [[UIView alloc] initWithFrame:CGRectZero];
    _trackRail.backgroundColor = [LunyTheme trackRail];
    _trackRail.layer.cornerRadius = kLunyTrackRailHeight / 2.0f;
    [_controlsPanel addSubview:_trackRail];

    _trackFill = [[UIView alloc] initWithFrame:CGRectZero];
    _trackFill.backgroundColor = [LunyTheme accentAmber];
    _trackFill.layer.cornerRadius = kLunyTrackRailHeight / 2.0f;
    [_controlsPanel addSubview:_trackFill];

    _trackThumb = [[UIView alloc] initWithFrame:CGRectZero];
    _trackThumb.backgroundColor = [LunyTheme accentAmber];
    _trackThumb.layer.cornerRadius = kLunyThumbSize / 2.0f;
    [_controlsPanel addSubview:_trackThumb];

    /*
     * Zone de saisie de 30pt de haut pour un trait visuel de 6, decision
     * actee sur la maquette : sur 3,5 pouces a 163 ppp, viser 6 pixels au
     * doigt est hors de portee d'un enfant. Le trait fin est esthetique, la
     * surface est fonctionnelle.
     */
    _trackTouchZone = [[UIView alloc] initWithFrame:CGRectZero];
    _trackTouchZone.backgroundColor = [UIColor clearColor];
    [_controlsPanel addSubview:_trackTouchZone];

    UIPanGestureRecognizer *pan = [[UIPanGestureRecognizer alloc]
                                   initWithTarget:self action:@selector(trackPanned:)];
    [_trackTouchZone addGestureRecognizer:pan];

    UITapGestureRecognizer *tap = [[UITapGestureRecognizer alloc]
                                   initWithTarget:self action:@selector(trackTapped:)];
    [_trackTouchZone addGestureRecognizer:tap];

    _timeLabel = [self labelWithFont:[UIFont systemFontOfSize:11.0f]
                               color:[LunyTheme textDisabled]];
    _timeLabel.textAlignment = NSTextAlignmentRight;
    _timeLabel.numberOfLines = 2;
    [_controlsPanel addSubview:_timeLabel];

    _leftButton = [self arrowButtonWithTitle:@"‹" action:@selector(wheelLeftTapped:)];
    _rightButton = [self arrowButtonWithTitle:@"›" action:@selector(wheelRightTapped:)];

    _mainButton = [UIButton buttonWithType:UIButtonTypeCustom];
    _mainButton.titleLabel.font = [UIFont boldSystemFontOfSize:17.0f];
    _mainButton.layer.cornerRadius = 14.0f;
    _mainButton.clipsToBounds = YES;
    [_mainButton setTitleColor:[LunyTheme textOnAccent] forState:UIControlStateNormal];
    // textMuted et non textDisabled : mesure a 4,9:1 sur le fond desature,
    // contre 1,0:1 pour l'ancienne combinaison.
    [_mainButton setTitleColor:[LunyTheme textMuted] forState:UIControlStateDisabled];
    [_mainButton addTarget:self action:@selector(mainTapped:) forControlEvents:UIControlEventTouchUpInside];
    [_controlsPanel addSubview:_mainButton];

    _dotsView = [[UIView alloc] initWithFrame:CGRectZero];
    _dotsView.backgroundColor = [UIColor clearColor];
    [_controlsPanel addSubview:_dotsView];
    _dots = [NSMutableArray array];

#if LUNY_DEBUG
    _debugLabel = [self labelWithFont:[UIFont systemFontOfSize:10.0f]
                                color:[LunyTheme textMuted]];
    _debugLabel.textAlignment = NSTextAlignmentCenter;
    _debugLabel.numberOfLines = 3;
    [_controlsPanel addSubview:_debugLabel];
#endif
}

- (UIButton *)arrowButtonWithTitle:(NSString *)title action:(SEL)action
{
    UIButton *button = [UIButton buttonWithType:UIButtonTypeCustom];
    // Le fond reste opaque meme desactive : la cible tactile doit rester
    // lisible, seul le glyphe s'eteint. Un bouton qui disparait se lit comme
    // un bouton absent.
    [self applyBackgroundColor:[LunyTheme raisedSurface] toButton:button];
    button.titleLabel.font = [UIFont systemFontOfSize:26.0f];
    button.layer.cornerRadius = 12.0f;
    button.clipsToBounds = YES;
    [button setTitle:title forState:UIControlStateNormal];
    [button setTitleColor:[LunyTheme textPrimary] forState:UIControlStateNormal];
    [button setTitleColor:[LunyTheme textMuted] forState:UIControlStateDisabled];
    [button addTarget:self action:action forControlEvents:UIControlEventTouchUpInside];
    [_controlsPanel addSubview:button];
    return button;
}

/*
 * UIButtonTypeCustom n'a aucun retour visuel au contact : ni fond, ni
 * assombrissement automatique. Sans vibreur sur ce materiel, l'etat
 * highlighted est le seul accuse de reception possible d'un appui — on le
 * fournit donc par une image de fond par etat, mecanisme standard d'UIKit.
 */
- (void)applyBackgroundColor:(UIColor *)color toButton:(UIButton *)button
{
    [button setBackgroundImage:[LunyTheme solidImageWithColor:color]
                      forState:UIControlStateNormal];
    [button setBackgroundImage:[LunyTheme solidImageWithColor:[LunyTheme pressedVariantOf:color]]
                      forState:UIControlStateHighlighted];
    [button setBackgroundImage:[LunyTheme solidImageWithColor:[LunyTheme disabledVariantOf:color]]
                      forState:UIControlStateDisabled];
}

- (UILabel *)labelWithFont:(UIFont *)font color:(UIColor *)color
{
    UILabel *label = [[UILabel alloc] initWithFrame:CGRectZero];
    label.font = font;
    label.textColor = color;
    label.backgroundColor = [UIColor clearColor];
    return label;
}

#pragma mark - Disposition

/*
 * Pas d'Auto Layout sur iOS 6 : empilement calcule a la main. Le calcul vit
 * ici et non dans -viewDidLoad, ou la vue n'a pas encore recu sa taille du
 * UINavigationController.
 */
- (void)viewWillLayoutSubviews
{
    [super viewWillLayoutSubviews];

    CGRect bounds = self.view.bounds;
    CGFloat width = bounds.size.width;

    if (width <= 0.0f || bounds.size.height <= 0.0f) {
        return;
    }

    // L'art prend sa hauteur nominale, sauf si les commandes n'entreraient
    // plus dessous. Toute dimension derivee d'une soustraction a besoin d'un
    // plancher.
    CGFloat artHeight = kLunyArtHeight;
    CGFloat maxArt = bounds.size.height - kLunyControlsMinHeight;

    if (maxArt < 0.0f) {
        maxArt = 0.0f;
    }
    if (artHeight > maxArt) {
        artHeight = maxArt;
    }

    self.artContainer.frame = CGRectMake(0.0f, 0.0f, width, artHeight);
    self.imageView.frame = self.artContainer.bounds;
    self.imagePlaceholder.frame = self.artContainer.bounds;

    // HOME en haut a droite de l'illustration : la barre de navigation occupe
    // deja le haut a gauche pour quitter l'histoire, les deux gestes ne
    // doivent pas se confondre.
    self.homeButton.frame = CGRectMake(width - kLunyHomeWidth - kLunyHomeInset,
                                       kLunyHomeInset, kLunyHomeWidth, kLunyHomeHeight);

    CGFloat panelHeight = bounds.size.height - artHeight;
    self.controlsPanel.frame = CGRectMake(0.0f, artHeight, width, panelHeight);

    CGFloat inner = width - (kLunyPad * 2.0f);

    if (inner <= 0.0f) {
        return;
    }

    // Ligne de progression : rail centre dans une zone tactile plus haute.
    CGFloat y = kLunyPad;
    CGFloat railWidth = inner - kLunyTimeLabelWidth - kLunyPad;

    if (railWidth < 1.0f) {
        railWidth = 1.0f;
    }

    CGFloat railY = y + ((kLunyTrackZoneHeight - kLunyTrackRailHeight) / 2.0f);
    self.trackRail.frame = CGRectMake(kLunyPad, railY, railWidth, kLunyTrackRailHeight);
    self.timeLabel.frame = CGRectMake(kLunyPad + railWidth + kLunyPad, y,
                                      kLunyTimeLabelWidth, kLunyTrackZoneHeight);
    self.trackTouchZone.frame = CGRectMake(kLunyPad, y, railWidth, kLunyTrackZoneHeight);
    [self layoutTrackFill];

    // Rangee de commandes.
    y += kLunyTrackZoneHeight + kLunyPad;
    CGFloat mainWidth = inner - (2.0f * kLunyArrowWidth) - (2.0f * kLunyPad);

    if (mainWidth < kLunyArrowWidth) {
        mainWidth = kLunyArrowWidth;
    }

    self.leftButton.frame = CGRectMake(kLunyPad, y, kLunyArrowWidth, kLunyButtonHeight);
    self.mainButton.frame = CGRectMake(kLunyPad + kLunyArrowWidth + kLunyPad, y,
                                       mainWidth, kLunyButtonHeight);
    self.rightButton.frame = CGRectMake(CGRectGetMaxX(self.mainButton.frame) + kLunyPad, y,
                                        kLunyArrowWidth, kLunyButtonHeight);

    // Points de pagination.
    y += kLunyButtonHeight + kLunyPad;
    self.dotsView.frame = CGRectMake(kLunyPad, y, inner, kLunyDotSize);
    [self layoutDots];

#if LUNY_DEBUG
    y += kLunyDotSize + 6.0f;
    self.debugLabel.frame = CGRectMake(kLunyPad, y, inner, 40.0f);
#endif
}

- (void)layoutTrackFill
{
    CGRect rail = self.trackRail.frame;
    CGFloat ratio = 0.0f;

    if (self.track.duration > 0.0) {
        ratio = (CGFloat)(self.track.position / self.track.duration);
    }
    if (ratio < 0.0f) {
        ratio = 0.0f;
    }
    if (ratio > 1.0f) {
        ratio = 1.0f;
    }

    self.trackFill.frame = CGRectMake(rail.origin.x, rail.origin.y,
                                      floorf(rail.size.width * ratio), rail.size.height);

    // La pastille est centree sur la tete de lecture, bornee au rail pour ne
    // pas deborder a 0 % ni a 100 %.
    CGFloat centre = rail.origin.x + (rail.size.width * ratio);
    self.trackThumb.frame = CGRectMake(centre - (kLunyThumbSize / 2.0f),
                                       CGRectGetMidY(rail) - (kLunyThumbSize / 2.0f),
                                       kLunyThumbSize, kLunyThumbSize);
}

- (void)layoutDots
{
    NSUInteger count = self.dots.count;

    if (count == 0) {
        return;
    }

    CGFloat total = (count * kLunyDotSize) + ((count - 1) * kLunyDotGap);
    CGFloat x = floorf((self.dotsView.bounds.size.width - total) / 2.0f);
    NSUInteger index;

    if (x < 0.0f) {
        x = 0.0f;
    }

    for (index = 0; index < count; index++) {
        UIView *dot = self.dots[index];
        dot.frame = CGRectMake(x, 0.0f, kLunyDotSize, kLunyDotSize);
        x += kLunyDotSize + kLunyDotGap;
    }
}

#pragma mark - Navigation dans la piste

- (void)setTrackEnabled:(BOOL)enabled
{
    self.trackTouchZone.userInteractionEnabled = enabled;

    // Rail, remplissage et pastille sont purement decoratifs : les attenuer
    // ne pose aucun probleme de contraste de texte, contrairement aux boutons.
    CGFloat alpha = enabled ? 1.0f : 0.35f;
    self.trackRail.alpha = alpha;
    self.trackFill.alpha = alpha;
    self.trackThumb.alpha = alpha;
    self.trackThumb.hidden = !enabled;
}

/*
 * Aucun seek audio reel : rien ne joue. On repositionne le minuteur simule et
 * son affichage, ce qui est exactement ce que la barre represente.
 */
- (CGFloat)ratioForTouchAtX:(CGFloat)x
{
    CGFloat width = self.trackTouchZone.bounds.size.width;

    if (width <= 0.0f) {
        return 0.0f;
    }

    CGFloat ratio = x / width;

    if (ratio < 0.0f) {
        ratio = 0.0f;
    }
    if (ratio > 1.0f) {
        ratio = 1.0f;
    }
    return ratio;
}

- (void)seekToRatio:(CGFloat)ratio
{
    [self.track seekToPosition:self.track.duration * (NSTimeInterval)ratio];
    [self refreshTransportLabels];
}

- (void)trackTapped:(UITapGestureRecognizer *)tap
{
    if (!self.trackTouchZone.userInteractionEnabled || self.track.duration <= 0.0) {
        return;
    }

    [self seekToRatio:[self ratioForTouchAtX:[tap locationInView:self.trackTouchZone].x]];
}

- (void)trackPanned:(UIPanGestureRecognizer *)pan
{
    if (!self.trackTouchZone.userInteractionEnabled || self.track.duration <= 0.0) {
        return;
    }

    CGFloat ratio = [self ratioForTouchAtX:[pan locationInView:self.trackTouchZone].x];

    switch (pan.state) {
        case UIGestureRecognizerStateBegan:
            // Le minuteur est suspendu pendant la saisie, sinon il continuerait
            // d'avancer sous le doigt.
            _scrubbing = YES;
            _wasPlayingBeforeScrub = self.track.isPlaying;
            [self.track pause];
            [self seekToRatio:ratio];
            break;

        case UIGestureRecognizerStateChanged:
            [self seekToRatio:ratio];
            break;

        case UIGestureRecognizerStateEnded:
        case UIGestureRecognizerStateCancelled:
        case UIGestureRecognizerStateFailed:
            [self seekToRatio:ratio];
            _scrubbing = NO;

            // On ne reprend que si la piste avancait avant la saisie, et
            // seulement si elle n'est pas deja au bout.
            if (_wasPlayingBeforeScrub && self.track.position < self.track.duration) {
                [self.track play];
            }
            [self refreshMainButtonForCurrentStage];
            break;

        default:
            break;
    }
}

#pragma mark - Moteur

- (void)openPack
{
    if (!self.packPath) {
        return;
    }

    if (luny_open([self.packPath fileSystemRepresentation], NULL, &_engine) != LUNY_OK) {
        _engine = NULL;
    }
}

- (void)mainTapped:(id)sender
{
    luny_stage_view stage;

    if (!_engine || !luny_current_stage(_engine, &stage)) {
        return;
    }

    // Le bouton central change de metier selon le pack, pas selon un reglage :
    // ok actif => il valide un choix ; ok inactif => il pilote la lecture.
    if (stage.controls.ok) {
        [self applyEvent:luny_ok label:@"ok"];
    } else {
        [self togglePlayback];
    }
}

- (void)homeTapped:(id)sender
{
    [self applyEvent:luny_home label:@"home"];
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
 * Chemin unique pour les evenements de graphe : emettre, reafficher, et
 * relancer une piste si le noeud a change. Un evenement ignore laisse l'etat
 * du moteur strictement inchange.
 */
- (void)applyEvent:(luny_event_status (*)(luny_engine *))event label:(NSString *)label
{
    if (!_engine) {
        return;
    }

    luny_event_status status = event(_engine);

    // Seul un changement de noeud merite un fondu. Un evenement ignore laisse
    // l'etat inchange : l'animer donnerait l'illusion qu'il s'est passe
    // quelque chose.
    _fadeNextRender = (status == LUNY_EVENT_ACCEPTED);
    [self renderCurrentStage];
    _fadeNextRender = NO;

    if (status == LUNY_EVENT_ACCEPTED) {
        [self startTrackForCurrentStage];
    }

    [self showDebugEvent:label status:status];
}

/* Recopie a l'ecran l'etat renvoye par le moteur, sans rien en deduire. */
- (void)renderCurrentStage
{
    luny_stage_view stage;

    if (!_engine || !luny_current_stage(_engine, &stage)) {
        self.imageView.image = nil;
        self.imagePlaceholder.text = @"Histoire indisponible";
        [self setDots:0 current:-1];
        [self setButton:self.mainButton enabled:NO];
        [self setButton:self.leftButton enabled:NO];
        [self setButton:self.rightButton enabled:NO];
        [self setButton:self.homeButton enabled:NO];
        return;
    }

    [self loadImageNamed:stage.image];

    luny_action_view action;
    BOOL hasAction = luny_current_action(_engine, &action) && action.index >= 0;

    // Points de pagination : uniquement dans un contexte ActionNode.
    [self setDots:(hasAction ? action.option_count : 0)
          current:(hasAction ? action.index : -1)];

    /*
     * Meme regle de conditionnement que le moteur : la molette exige
     * controlSettings.wheel ET un contexte ActionNode (luny_engine.h,
     * commentaire de luny_wheel_left/right).
     */
    BOOL wheelUsable = (stage.controls.wheel != 0) && hasAction && (action.option_count > 0);
    [self setButton:self.leftButton enabled:wheelUsable];
    [self setButton:self.rightButton enabled:wheelUsable];

    // HOME suit controlSettings.home, comme les autres commandes suivent le
    // drapeau qui les concerne.
    [self setButton:self.homeButton enabled:(stage.controls.home != 0)];

    // La barre se saisit si le pack autorise la pause et qu'il y a une piste.
    // Grisee, pas silencieusement inerte : on doit voir qu'elle ne repond pas.
    [self setTrackEnabled:((stage.controls.pause != 0) && self.track.hasTrack)];

    [self refreshMainButtonForStage:&stage];
    [self refreshTransportLabels];
}

- (void)refreshMainButtonForCurrentStage
{
    luny_stage_view stage;

    if (_engine && luny_current_stage(_engine, &stage)) {
        [self refreshMainButtonForStage:&stage];
    }
}

- (void)refreshMainButtonForStage:(const luny_stage_view *)stage
{
    if (stage->controls.ok) {
        [self applyBackgroundColor:[LunyTheme accentAmber] toButton:self.mainButton];
        [self.mainButton setTitle:@"Choisir" forState:UIControlStateNormal];
        [self setButton:self.mainButton enabled:YES];
        return;
    }

    // ok inactif : le bouton devient lecture/pause, en vert.
    [self applyBackgroundColor:[LunyTheme accentSage] toButton:self.mainButton];
    [self.mainButton setTitle:(self.track.isPlaying ? @"Pause" : @"Lire") forState:UIControlStateNormal];

    // Inactif si le pack n'autorise pas la pause ou si aucune piste n'est
    // chargee — meme condition que la maquette.
    BOOL usable = (stage->controls.pause != 0) && (self.track.duration > 0.0);
    [self setButton:self.mainButton enabled:usable];
}

- (void)setButton:(UIButton *)button enabled:(BOOL)enabled
{
    /*
     * Pas de baisse d'alpha ici, contrairement a la version precedente.
     * Attenuer le bouton entier faisait fondre son fond ET son titre vers la
     * couleur du panneau : le contraste interne tombait a 1,03:1, et le
     * libelle devenait invisible — c'est ce qui a ete rapporte comme "le
     * bouton disparait". L'etat desactive passe desormais par une image de
     * fond desaturee et un titre a contraste conserve.
     */
    button.enabled = enabled;
}

/*
 * Un noeud sans image laisse la zone d'art vide — les noeuds d'histoire du
 * pack de reference sont dans ce cas. Plutot qu'un rectangle noir muet, qui
 * se lit comme un ecran casse, on y pose le titre du pack. C'est du texte
 * destine au lecteur, pas de la telemetrie.
 */
- (void)loadImageNamed:(const char *)imageName
{
    UIImage *image = nil;

    if (imageName) {
        char path[PATH_MAX];
        int needed = luny_asset_path(_engine, imageName, path, sizeof(path));

        if (needed >= 0 && needed < (int)sizeof(path)) {
            image = [UIImage imageWithContentsOfFile:@(path)];
        }
    }

    if (_fadeNextRender) {
        UIView *container = self.artContainer;
        [UIView transitionWithView:container
                          duration:kLunyFadeDuration
                           options:UIViewAnimationOptionTransitionCrossDissolve
                        animations:^{
                            self.imageView.image = image;
                            self.imagePlaceholder.text = image ? nil : self.packTitle;
                        }
                        completion:NULL];
        return;
    }

    self.imageView.image = image;
    self.imagePlaceholder.text = image ? nil : self.packTitle;
}

#pragma mark - Points de pagination

- (void)setDots:(NSInteger)count current:(NSInteger)current
{
    NSInteger shown = count > kLunyDotMax ? kLunyDotMax : count;

    if (shown < 0) {
        shown = 0;
    }

    while ((NSInteger)self.dots.count > shown) {
        [[self.dots lastObject] removeFromSuperview];
        [self.dots removeLastObject];
    }

    while ((NSInteger)self.dots.count < shown) {
        UIView *dot = [[UIView alloc] initWithFrame:CGRectZero];
        dot.layer.cornerRadius = kLunyDotSize / 2.0f;
        [self.dotsView addSubview:dot];
        [self.dots addObject:dot];
    }

    NSInteger index;

    for (index = 0; index < shown; index++) {
        UIView *dot = self.dots[(NSUInteger)index];
        dot.backgroundColor = (index == current) ? [LunyTheme accentAmber] : [LunyTheme dotIdle];
    }

    self.dotsView.hidden = (shown == 0);
    [self layoutDots];
}

#pragma mark - Lecture

/*
 * La piste est reelle quand l'asset est decodable par iOS, simulee sinon —
 * LunyAudioTrack tranche et expose une seule interface. Cet ecran ne connait
 * que celle-ci.
 */
- (void)startTrackForCurrentStage
{
    luny_stage_view stage;

    [self.track unload];
    _scrubbing = NO;

    if (!_engine || !luny_current_stage(_engine, &stage) || !stage.audio) {
        // Le noeud ne reference aucune piste : le moteur rend audio = NULL.
        // C'est le cas de tous les noeuds du pack "random".
        [self refreshMainButtonForCurrentStage];
        [self refreshTransportLabels];
        return;
    }

    char path[PATH_MAX];
    int needed = luny_asset_path(_engine, stage.audio, path, sizeof(path));
    NSString *fullPath = (needed >= 0 && needed < (int)sizeof(path)) ? @(path) : nil;

    [self.track loadPath:fullPath assetName:@(stage.audio)];
    [self.track play];

    // Le libelle du bouton central depend de l'etat de la piste, fixe a
    // l'instant : il faut donc le recalculer apres.
    [self refreshMainButtonForCurrentStage];
    [self refreshTransportLabels];
}

- (void)togglePlayback
{
    if (self.track.isPlaying) {
        [self.track pause];
    } else {
        [self.track play];
    }

    [self refreshMainButtonForCurrentStage];
    [self refreshTransportLabels];
}

- (void)refreshTransportLabels
{
    if (!self.track.hasTrack) {
        // Sans piste, un "0:00 / 0:00" laisserait croire a un minuteur bloque.
        self.timeLabel.text = @"pas de piste";
    } else {
        NSString *temps = [NSString stringWithFormat:@"%@ / %@",
                           [LunySimulatedAudio formattedSeconds:self.track.position],
                           [LunySimulatedAudio formattedSeconds:self.track.duration]];

        // Le repli sur minuteur est signale, jamais silencieux : une duree
        // fabriquee ne doit pas se faire passer pour une lecture reelle.
        self.timeLabel.text = self.track.isSimulated
            ? [temps stringByAppendingString:@"\n(simulé)"]
            : temps;
    }

    [self layoutTrackFill];
}

/*
 * Fin de piste. On transmet l'evenement au moteur et on se contente de lire
 * son verdict.
 *
 * La provenance de la fin depend du mode : en lecture reelle c'est le
 * decodeur qui previent (audioPlayerDidFinishPlaying:), en repli c'est le
 * minuteur. LunyAudioTrack ramene les deux au meme rappel, et cet ecran n'a
 * pas a savoir lequel a parle.
 *
 * Regle de fin d'histoire (doc d'interface, "Pas d'enchainement
 * automatique") : une histoire terminee ne reste pas figee, elle ramene a la
 * bibliotheque. Le signal utilise est LUNY_EVENT_IGNORED_NO_TRANSITION, que
 * le moteur renvoie quand le noeud n'a pas d'okTransition.
 *
 * RESERVE CONNUE, non levee ici : l'absence de transition tient lieu de
 * "fin d'histoire" faute d'un champ "type" fiable dans le format. Voir
 * NOTES.md pour la portee exacte de cette approximation.
 */
- (void)audioTrackDidFinish:(LunyAudioTrack *)track
{
    if (!_engine) {
        return;
    }

    luny_event_status status = luny_audio_ended(_engine);

    if (status == LUNY_EVENT_IGNORED_NO_TRANSITION) {
        [self.navigationController popViewControllerAnimated:YES];
        return;
    }

    [self renderCurrentStage];

    if (status == LUNY_EVENT_ACCEPTED) {
        [self startTrackForCurrentStage];
    }

    [self showDebugEvent:@"audio_ended" status:status];
}

/* Battement de la piste : seul l'affichage bouge, jamais l'etat du moteur. */
- (void)audioTrackDidAdvance:(LunyAudioTrack *)track
{
    if (_scrubbing) {
        return;   // le doigt fait autorite pendant la saisie
    }

    [self refreshTransportLabels];
}

#pragma mark - Telemetrie de mise au point

/*
 * Compilee hors du binaire par defaut : uuid, noms d'evenements et statuts
 * bruts servent a verifier le moteur, pas a etre lus par un enfant.
 * Voir LunyDebug.h.
 */
- (void)showDebugEvent:(NSString *)label status:(luny_event_status)status
{
#if LUNY_DEBUG
    luny_stage_view stage;
    NSString *node = @"—";
    NSString *option = @"—";

    if (_engine && luny_current_stage(_engine, &stage)) {
        node = stage.uuid ? @(stage.uuid) : @"?";

        luny_action_view action;

        if (luny_current_action(_engine, &action) && action.index >= 0) {
            option = [NSString stringWithFormat:@"%d/%d", action.index + 1, action.option_count];
        }
    }

    self.debugLabel.text = [NSString stringWithFormat:@"%@ -> %s\n%@\noption %@",
                            label, luny_event_status_str(status), node, option];
#else
    (void)label;
    (void)status;
#endif
}

@end
