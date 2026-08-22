#import "LunyAudioTrack.h"
#import "LunySimulatedAudio.h"

#import <AVFoundation/AVFoundation.h>

/* Cadence de rafraichissement de l'affichage, et pas du minuteur simule. */
static const NSTimeInterval kLunyTickInterval = 0.25;

/*
 * Retrait applique au bout droit d'un seek reel.
 *
 * Ecrire currentTime = duration sur un AVAudioPlayer ne le place pas en fin de
 * piste : il repart a zero. Mesure sur l'appareil, une pastille glissee a fond
 * renvoyait 0,00 s au lieu de 193,19 s. On s'arrete donc juste avant la fin,
 * ce qui affiche bien une barre pleine et laisse la lecture se terminer
 * normalement si elle reprend.
 */
static const NSTimeInterval kLunyRealSeekEpsilon = 0.05;

@interface LunyAudioTrack () <AVAudioPlayerDelegate>
@property (nonatomic, strong) AVAudioPlayer *player;
@property (nonatomic, strong) NSTimer *tickTimer;
@property (nonatomic, assign) NSTimeInterval simulatedPosition;
@property (nonatomic, assign) NSTimeInterval simulatedDuration;
@property (nonatomic, assign) BOOL simulatedPlaying;
@end

@implementation LunyAudioTrack

+ (void)prepareAudioSession
{
    AVAudioSession *session = [AVAudioSession sharedInstance];
    NSError *error = nil;

    // Categorie lecture : le son doit sortir meme si l'interrupteur silencieux
    // est actif, ce qui est le comportement attendu d'une conteuse.
    if (![session setCategory:AVAudioSessionCategoryPlayback error:&error]) {
        NSLog(@"LunyAudioTrack: categorie audio refusee (%@)", error);
    }
    if (![session setActive:YES error:&error]) {
        NSLog(@"LunyAudioTrack: session audio inactive (%@)", error);
    }
}

/*
 * Extensions qu'iOS decode nativement. L'Ogg Vorbis en est absent, et c'est
 * la raison d'etre du repli simule.
 */
+ (BOOL)isDecodableExtension:(NSString *)extension
{
    static NSSet *decodable = nil;
    static dispatch_once_t once;

    dispatch_once(&once, ^{
        decodable = [NSSet setWithObjects:@"wav", @"mp3", @"m4a", @"aac",
                     @"caf", @"aif", @"aiff", nil];
    });

    return [decodable containsObject:[extension lowercaseString]];
}

- (void)dealloc
{
    [self unload];
}

#pragma mark - Chargement

- (void)loadPath:(NSString *)path assetName:(NSString *)assetName
{
    [self unload];

    if (!assetName.length) {
        return;   // le noeud n'a pas de piste du tout
    }

    _hasTrack = YES;

    if (path.length && [[self class] isDecodableExtension:[path pathExtension]] &&
        [[NSFileManager defaultManager] fileExistsAtPath:path]) {

        NSError *error = nil;
        AVAudioPlayer *player = [[AVAudioPlayer alloc]
                                 initWithContentsOfURL:[NSURL fileURLWithPath:path]
                                                 error:&error];

        if (player && [player prepareToPlay]) {
            player.delegate = self;
            _player = player;
            _isSimulated = NO;
            return;
        }

        // Extension decodable mais fichier illisible : on le dit plutot que
        // de laisser croire a une lecture.
        NSLog(@"LunyAudioTrack: \"%@\" non decodable (%@), repli simule", assetName, error);
    }

    _isSimulated = YES;
    _simulatedDuration = [LunySimulatedAudio durationForTrackNamed:assetName];
    _simulatedPosition = 0.0;
    _simulatedPlaying = NO;
}

- (void)unload
{
    [_tickTimer invalidate];
    _tickTimer = nil;

    // Le delegue doit etre coupe avant liberation : AVAudioPlayer le conserve
    // en reference faible non nettoyee, et un rappel tardif viserait une
    // instance disparue.
    _player.delegate = nil;
    [_player stop];
    _player = nil;

    _hasTrack = NO;
    _isSimulated = NO;
    _simulatedPlaying = NO;
    _simulatedPosition = 0.0;
    _simulatedDuration = 0.0;
}

#pragma mark - Etat

- (BOOL)isPlaying
{
    return _isSimulated ? _simulatedPlaying : _player.isPlaying;
}

- (NSTimeInterval)duration
{
    if (!_hasTrack) {
        return 0.0;
    }
    return _isSimulated ? _simulatedDuration : _player.duration;
}

- (NSTimeInterval)position
{
    if (!_hasTrack) {
        return 0.0;
    }
    return _isSimulated ? _simulatedPosition : _player.currentTime;
}

#pragma mark - Transport

- (void)play
{
    if (!_hasTrack || self.duration <= 0.0) {
        return;
    }

    // Rejouer depuis le debut si la tete est deja au bout.
    if (self.position >= self.duration) {
        [self seekToPosition:0.0];
    }

    if (_isSimulated) {
        _simulatedPlaying = YES;
    } else {
        [_player play];
    }

    [self startTicking];
}

- (void)pause
{
    if (_isSimulated) {
        _simulatedPlaying = NO;
    } else {
        [_player pause];
    }

    [self stopTicking];
}

- (void)seekToPosition:(NSTimeInterval)position
{
    NSTimeInterval clamped = position;

    if (clamped < 0.0) {
        clamped = 0.0;
    }
    if (clamped > self.duration) {
        clamped = self.duration;
    }

    if (_isSimulated) {
        _simulatedPosition = clamped;
        return;
    }

    // AVAudioPlayer accepte currentTime a l'arret comme en lecture, mais
    // remet a zero si on atteint exactement la duree : d'ou le retrait.
    NSTimeInterval limit = self.duration - kLunyRealSeekEpsilon;

    if (limit < 0.0) {
        limit = 0.0;
    }
    if (clamped > limit) {
        clamped = limit;
    }

    _player.currentTime = clamped;
}

#pragma mark - Battement

/*
 * Un seul minuteur pour les deux modes. En reel il ne fait que rythmer le
 * rafraichissement de l'affichage — AVAudioPlayer n'expose aucun rappel de
 * progression. En simule il EST la lecture.
 */
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
    if (_isSimulated) {
        _simulatedPosition += kLunyTickInterval;

        if (_simulatedPosition >= _simulatedDuration) {
            _simulatedPosition = _simulatedDuration;
            _simulatedPlaying = NO;
            [self stopTicking];
            [self.delegate audioTrackDidAdvance:self];
            [self.delegate audioTrackDidFinish:self];
            return;
        }
    }

    [self.delegate audioTrackDidAdvance:self];
}

#pragma mark - AVAudioPlayerDelegate

/*
 * En lecture reelle, la fin vient du decodeur et non d'un minuteur : c'est ce
 * rappel qui declenche luny_audio_ended cote ecran.
 */
- (void)audioPlayerDidFinishPlaying:(AVAudioPlayer *)player successfully:(BOOL)flag
{
    [self stopTicking];

    if (!flag) {
        NSLog(@"LunyAudioTrack: lecture interrompue avant la fin");
    }

    [self.delegate audioTrackDidAdvance:self];
    [self.delegate audioTrackDidFinish:self];
}

- (void)audioPlayerDecodeErrorDidOccur:(AVAudioPlayer *)player error:(NSError *)error
{
    NSLog(@"LunyAudioTrack: erreur de decodage (%@)", error);
    [self stopTicking];
    [self.delegate audioTrackDidFinish:self];
}

@end
