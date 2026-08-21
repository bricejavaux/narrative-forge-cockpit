#import "LunySimulatedAudio.h"

/* Bornes des durees simulees. Volontairement courtes pour une piste : on
 * veut pouvoir observer une fin de piste, et donc un enchainement de graphe,
 * sans attendre. */
static const NSTimeInterval kLunyTrackMinSeconds = 12.0;
static const NSTimeInterval kLunyTrackMaxSeconds = 45.0;

static const NSTimeInterval kLunyPackMinSeconds = 4.0 * 60.0;
static const NSTimeInterval kLunyPackMaxSeconds = 18.0 * 60.0;

/*
 * FNV-1a 32 bits. Choisi pour sa brievete et son absence de dependance, pas
 * pour ses qualites cryptographiques : on ne cherche qu'une valeur stable et
 * bien dispersee a partir d'un nom de fichier.
 *
 * Le decalage est ecrit en multiplications explicites : armv7 n'a pas de
 * multiplication 32x32 vers 64 bits ici, mais surtout le produit doit rester
 * en unsigned 32 bits, ou le debordement est defini.
 */
static uint32_t LunyHash(NSString *text)
{
    const char *bytes = [text UTF8String];
    uint32_t hash = 2166136261u;

    if (!bytes) {
        return hash;
    }

    while (*bytes) {
        hash ^= (uint32_t)(unsigned char)(*bytes++);
        hash *= 16777619u;
    }

    return hash;
}

/*
 * Ramene un hache dans [minimum, maximum]. La reduction se fait en virgule
 * flottante et non par modulo : armv7 n'ayant pas de division entiere, un
 * modulo sur valeur runtime ferait appel a ___umodsi3 (voir LunyARMSupport.c).
 * Ici le calcul flottant est de toute facon le plus lisible.
 */
static NSTimeInterval LunyScale(uint32_t hash, NSTimeInterval minimum, NSTimeInterval maximum)
{
    double unit = (double)hash / (double)0xFFFFFFFFu;
    return minimum + (unit * (maximum - minimum));
}

@implementation LunySimulatedAudio

+ (NSTimeInterval)durationForTrackNamed:(NSString *)name
{
    if (!name.length) {
        return 0.0;
    }

    return LunyScale(LunyHash(name), kLunyTrackMinSeconds, kLunyTrackMaxSeconds);
}

+ (NSTimeInterval)durationForPackNamed:(NSString *)name
{
    if (!name.length) {
        return 0.0;
    }

    /*
     * Le sel evite qu'un pack et une piste homonymes tombent sur la meme
     * valeur reduite. Ce n'est pas la somme des durees de ses pistes : le
     * moteur n'expose pas la liste des noeuds, donc cette somme n'est pas
     * calculable ici. Encore une valeur inventee, cf. l'en-tete.
     */
    NSString *salted = [@"pack:" stringByAppendingString:name];
    return LunyScale(LunyHash(salted), kLunyPackMinSeconds, kLunyPackMaxSeconds);
}

+ (NSString *)formattedSeconds:(NSTimeInterval)seconds
{
    if (seconds < 0.0) {
        seconds = 0.0;
    }

    long total = (long)(seconds + 0.5);
    return [NSString stringWithFormat:@"%ld:%02ld", total / 60, total % 60];
}

@end
