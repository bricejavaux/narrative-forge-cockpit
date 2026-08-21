/*
 * LunySimulatedAudio.h
 *
 * ====================================================================
 *  SIMULATEUR TEMPORAIRE — CECI N'EST PAS LA VERSION FINALE
 * ====================================================================
 *
 * Aucun audio n'est decode dans cette iteration. Le format de pack
 * n'expose par ailleurs aucune duree : ni luny_pack_view ni
 * luny_stage_view n'ont ce champ, et le moteur ne lit jamais le contenu
 * des fichiers audio — il ne verifie que leur presence et leur extension.
 *
 * Les durees rendues ici sont donc INVENTEES. Elles ne servent qu'a
 * faire vivre la barre de progression et a declencher luny_audio_ended()
 * pour valider l'enchainement du graphe a l'ecran.
 *
 * Elles sont derivees par hachage du nom de fichier, ce qui garantit
 * seulement une chose : la meme piste a toujours la meme duree simulee,
 * d'un lancement a l'autre. Cette stabilite evite qu'un ecran change de
 * comportement entre deux essais ; elle ne rend pas la valeur plus vraie.
 *
 * A REMPLACER par AVAudioPlayer quand le decodage reel sera branche :
 * la duree viendra alors de -[AVAudioPlayer duration] et la progression
 * de -currentTime. Tout ce fichier disparaitra.
 */
#import <Foundation/Foundation.h>

@interface LunySimulatedAudio : NSObject

/* Duree simulee d'une piste, en secondes. 0 si name est nil ou vide. */
+ (NSTimeInterval)durationForTrackNamed:(NSString *)name;

/* Duree simulee d'un pack entier, pour la vignette de bibliotheque. */
+ (NSTimeInterval)durationForPackNamed:(NSString *)name;

/* "3:07" — formatage minutes:secondes, sans notion de duree reelle. */
+ (NSString *)formattedSeconds:(NSTimeInterval)seconds;

@end
