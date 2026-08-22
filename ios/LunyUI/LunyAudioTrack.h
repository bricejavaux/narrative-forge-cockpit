/*
 * LunyAudioTrack.h — la piste du noeud courant, reelle ou simulee.
 *
 * Une seule interface pour deux mecanismes, afin que l'ecran n'ait pas a
 * savoir lequel tourne :
 *
 *   REELLE   AVAudioPlayer, quand l'asset porte une extension qu'iOS decode
 *            (wav, mp3, m4a, aac, caf, aif) et que le fichier s'ouvre.
 *   SIMULEE  minuteur a duree hachee (LunySimulatedAudio), sinon.
 *
 * Le repli est explicite et signale a l'ecran, jamais silencieux : un pack
 * dont l'audio ne joue pas doit le dire, pas se taire en donnant l'illusion
 * d'une lecture.
 *
 * Pourquoi le repli existe : iOS ne decode pas l'Ogg Vorbis nativement, et le
 * format STUdio l'autorise. Les packs convertis en .ogg tomberont donc dans
 * la branche simulee tant qu'une conversion cote PC n'aura pas eu lieu.
 */
#import <Foundation/Foundation.h>

@class LunyAudioTrack;

@protocol LunyAudioTrackDelegate <NSObject>
/* Appele a intervalle regulier pendant la lecture, pour rafraichir l'affichage. */
- (void)audioTrackDidAdvance:(LunyAudioTrack *)track;
/* Appele une fois quand la piste atteint sa fin. */
- (void)audioTrackDidFinish:(LunyAudioTrack *)track;
@end

@interface LunyAudioTrack : NSObject

@property (nonatomic, weak) id<LunyAudioTrackDelegate> delegate;

/* NO si le noeud ne reference aucune piste exploitable. */
@property (nonatomic, readonly) BOOL hasTrack;

/* YES si la duree et la progression sont fabriquees, pas decodees. */
@property (nonatomic, readonly) BOOL isSimulated;

@property (nonatomic, readonly) BOOL isPlaying;
@property (nonatomic, readonly) NSTimeInterval duration;
@property (nonatomic, readonly) NSTimeInterval position;

/*
 * Prepare la session audio en categorie lecture. A appeler une fois au
 * demarrage : sans elle, le son reste muet quand l'appareil est en mode
 * silencieux.
 */
+ (void)prepareAudioSession;

/*
 * Charge la piste designee par un chemin absolu. path nil, fichier absent ou
 * illisible laissent hasTrack a NO. assetName sert a la duree simulee : c'est
 * le nom tel qu'ecrit dans story.json.
 */
- (void)loadPath:(NSString *)path assetName:(NSString *)assetName;
- (void)unload;

- (void)play;
- (void)pause;
- (void)seekToPosition:(NSTimeInterval)position;

@end
