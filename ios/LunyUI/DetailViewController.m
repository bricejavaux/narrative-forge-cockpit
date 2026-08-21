#import "DetailViewController.h"
#import "LunyDebug.h"
#import "LunyLibraryItem.h"
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

/* Meme principe pour les fleches : zone large, glyphe fin. */
static const CGFloat kLunyArrowWidth = 58.0f;
static const CGFloat kLunyButtonHeight = 52.0f;

static const CGFloat kLunyDotSize = 7.0f;
static const CGFloat kLunyDotGap = 6.0f;
static const NSInteger kLunyDotMax = 10;

/* Cadence du minuteur simule. Voir LunySimulatedAudio.h : rien n'est decode. */
static const NSTimeInterval kLunyTickInterval = 0.25;

@interface DetailViewController ()
{
    /* Poignee C : ARC ne gere pas ce pointeur, ferme dans -dealloc. */
    luny_engine *_engine;

    /* Etat de lecture SIMULE. */
    NSTimeInterval _position;
    NSTimeInterval _duration;
    BOOL _playing;
}
@property (nonatomic, copy) NSString *packPath;
@property (nonatomic, copy) NSString *packTitle;

@property (nonatomic, strong) UIImageView *imageView;
@property (nonatomic, strong) UILabel *imagePlaceholder;
@property (nonatomic, strong) UIView *controlsPanel;

@property (nonatomic, strong) UIView *trackRail;
@property (nonatomic, strong) UIView *trackFill;
@property (nonatomic, strong) UILabel *timeLabel;

@property (nonatomic, strong) UIButton *leftButton;
@property (nonatomic, strong) UIButton *mainButton;
@property (nonatomic, strong) UIButton *rightButton;

@property (nonatomic, strong) UIView *dotsView;
@property (nonatomic, strong) NSMutableArray *dots;

@property (nonatomic, strong) NSTimer *tickTimer;

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
    // NSTimer retient sa cible : sans invalidation le controleur ne serait
    // jamais libere et le minuteur continuerait a battre apres le retour.
    [_tickTimer invalidate];
    _tickTimer = nil;

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
    [self startTrackForCurrentStage];
}

- (void)viewWillDisappear:(BOOL)animated
{
    [super viewWillDisappear:animated];

    // L'ecran quitte la pile : le minuteur n'a plus rien a animer.
    [self stopTicking];
}

- (void)buildSubviews
{
    _imageView = [[UIImageView alloc] initWithFrame:CGRectZero];
    _imageView.contentMode = UIViewContentModeScaleAspectFill;
    _imageView.backgroundColor = [LunyTheme artBase];
    _imageView.clipsToBounds = YES;
    _imageView.autoresizingMask = UIViewAutoresizingFlexibleWidth;
    [self.view addSubview:_imageView];

    _imagePlaceholder = [self labelWithFont:[UIFont boldSystemFontOfSize:17.0f]
                                      color:[LunyTheme textDisabled]];
    _imagePlaceholder.textAlignment = NSTextAlignmentCenter;
    _imagePlaceholder.numberOfLines = 2;
    [self.view addSubview:_imagePlaceholder];

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

    _timeLabel = [self labelWithFont:[UIFont systemFontOfSize:11.0f]
                               color:[LunyTheme textDisabled]];
    _timeLabel.textAlignment = NSTextAlignmentRight;
    [_controlsPanel addSubview:_timeLabel];

    _leftButton = [self arrowButtonWithTitle:@"‹" action:@selector(wheelLeftTapped:)];
    _rightButton = [self arrowButtonWithTitle:@"›" action:@selector(wheelRightTapped:)];

    _mainButton = [UIButton buttonWithType:UIButtonTypeCustom];
    _mainButton.titleLabel.font = [UIFont boldSystemFontOfSize:17.0f];
    _mainButton.layer.cornerRadius = 14.0f;
    [_mainButton setTitleColor:[LunyTheme textOnAccent] forState:UIControlStateNormal];
    [_mainButton setTitleColor:[LunyTheme textDisabled] forState:UIControlStateDisabled];
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
    button.backgroundColor = [LunyTheme raisedSurface];
    button.titleLabel.font = [UIFont systemFontOfSize:26.0f];
    button.layer.cornerRadius = 12.0f;
    [button setTitle:title forState:UIControlStateNormal];
    [button setTitleColor:[LunyTheme textPrimary] forState:UIControlStateNormal];
    [button setTitleColor:[LunyTheme textDisabled] forState:UIControlStateDisabled];
    [button addTarget:self action:action forControlEvents:UIControlEventTouchUpInside];
    [_controlsPanel addSubview:button];
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

    self.imageView.frame = CGRectMake(0.0f, 0.0f, width, artHeight);
    self.imagePlaceholder.frame = self.imageView.frame;

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

    if (_duration > 0.0) {
        ratio = (CGFloat)(_position / _duration);
    }
    if (ratio < 0.0f) {
        ratio = 0.0f;
    }
    if (ratio > 1.0f) {
        ratio = 1.0f;
    }

    self.trackFill.frame = CGRectMake(rail.origin.x, rail.origin.y,
                                      floorf(rail.size.width * ratio), rail.size.height);
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
    [self renderCurrentStage];

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

    [self refreshMainButtonForStage:&stage];
    [self refreshTransportLabels];
}

- (void)refreshMainButtonForStage:(const luny_stage_view *)stage
{
    if (stage->controls.ok) {
        self.mainButton.backgroundColor = [LunyTheme accentAmber];
        [self.mainButton setTitle:@"Choisir" forState:UIControlStateNormal];
        [self setButton:self.mainButton enabled:YES];
        return;
    }

    // ok inactif : le bouton devient lecture/pause, en vert.
    self.mainButton.backgroundColor = [LunyTheme accentSage];
    [self.mainButton setTitle:(_playing ? @"Pause" : @"Lire") forState:UIControlStateNormal];

    // Inactif si le pack n'autorise pas la pause ou si aucune piste n'est
    // chargee — meme condition que la maquette.
    BOOL usable = (stage->controls.pause != 0) && (_duration > 0.0);
    [self setButton:self.mainButton enabled:usable];
}

- (void)setButton:(UIButton *)button enabled:(BOOL)enabled
{
    // UIButtonTypeCustom n'a pas d'etat desactive visuel : sans intervention
    // explicite, un bouton inactif serait indiscernable d'un bouton actif.
    button.enabled = enabled;
    button.alpha = enabled ? 1.0f : 0.55f;
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

#pragma mark - Lecture simulee

/*
 * ATTENTION : rien n'est decode ici. Le minuteur ci-dessous imite une lecture
 * audio pour faire vivre la barre de progression et declencher
 * luny_audio_ended() en fin de piste. Voir LunySimulatedAudio.h — tout ce
 * bloc disparait quand AVAudioPlayer sera branche.
 */
- (void)startTrackForCurrentStage
{
    luny_stage_view stage;

    [self stopTicking];
    _position = 0.0;
    _duration = 0.0;
    _playing = NO;

    if (_engine && luny_current_stage(_engine, &stage) && stage.audio) {
        _duration = [LunySimulatedAudio durationForTrackNamed:@(stage.audio)];
        _playing = (_duration > 0.0);
    }

    if (_playing) {
        [self startTicking];
    }

    // Le libelle du bouton central depend de _playing et de _duration, tous
    // deux fixes a l'instant : il faut donc le recalculer apres.
    if (_engine && luny_current_stage(_engine, &stage)) {
        [self refreshMainButtonForStage:&stage];
    }

    [self refreshTransportLabels];
}

- (void)togglePlayback
{
    if (_duration <= 0.0) {
        return;
    }

    _playing = !_playing;

    if (_playing) {
        if (_position >= _duration) {
            _position = 0.0;
        }
        [self startTicking];
    } else {
        [self stopTicking];
    }

    luny_stage_view stage;

    if (_engine && luny_current_stage(_engine, &stage)) {
        [self refreshMainButtonForStage:&stage];
    }

    [self refreshTransportLabels];
}

- (void)startTicking
{
    [self stopTicking];
    self.tickTimer = [NSTimer scheduledTimerWithTimeInterval:kLunyTickInterval
                                                      target:self
                                                    selector:@selector(tick:)
                                                    userInfo:nil
                                                     repeats:YES];
}

- (void)stopTicking
{
    [self.tickTimer invalidate];
    self.tickTimer = nil;
}

- (void)tick:(NSTimer *)timer
{
    _position += kLunyTickInterval;

    if (_position >= _duration) {
        _position = _duration;
        [self stopTicking];
        _playing = NO;
        [self refreshTransportLabels];
        [self simulatedTrackEnded];
        return;
    }

    [self refreshTransportLabels];
}

- (void)refreshTransportLabels
{
    self.timeLabel.text = [NSString stringWithFormat:@"%@ / %@",
                           [LunySimulatedAudio formattedSeconds:_position],
                           [LunySimulatedAudio formattedSeconds:_duration]];
    [self layoutTrackFill];
}

/*
 * Fin de piste simulee. On transmet l'evenement au moteur et on se contente
 * de lire son verdict.
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
- (void)simulatedTrackEnded
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
