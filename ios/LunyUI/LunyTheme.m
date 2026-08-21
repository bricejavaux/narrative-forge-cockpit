#import "LunyTheme.h"

/* Proportion d'accent conservee dans la teinte de couverture. */
static const CGFloat kLunyCoverAccentMix = 0.18f;

/*
 * Le cycle des accents se fait par masque binaire, pas par modulo : armv7
 * n'a pas d'instruction de division entiere et clang emet alors un appel a
 * ___umodsi3 (compiler-rt), absent du libcompiler_rt.tbd de ce SDK — erreur
 * de lien "Undefined symbols for architecture armv7".
 * Contrainte induite : le nombre d'accents doit rester une puissance de deux.
 */
static const NSUInteger kLunyAccentCount = 4;
static const NSUInteger kLunyAccentMask = kLunyAccentCount - 1;

static UIColor *LunyColorFromHex(uint32_t hex)
{
	return [UIColor colorWithRed:((hex >> 16) & 0xFF) / 255.0f
	                       green:((hex >> 8) & 0xFF) / 255.0f
	                        blue:(hex & 0xFF) / 255.0f
	                       alpha:1.0f];
}

@implementation LunyTheme

+ (UIColor *)backgroundDeep  { return LunyColorFromHex(0x0B1024); }
+ (UIColor *)surface         { return LunyColorFromHex(0x141A32); }
+ (UIColor *)artBase         { return LunyColorFromHex(0x060812); }
+ (UIColor *)controlsSurface { return LunyColorFromHex(0x101426); }
+ (UIColor *)raisedSurface   { return LunyColorFromHex(0x1C2440); }
+ (UIColor *)trackRail       { return LunyColorFromHex(0x232B47); }
+ (UIColor *)dotIdle         { return LunyColorFromHex(0x2C3554); }

+ (UIColor *)textPrimary    { return LunyColorFromHex(0xC8D3F2); }
+ (UIColor *)textBright     { return LunyColorFromHex(0xE7ECFA); }
+ (UIColor *)textMuted      { return LunyColorFromHex(0x94A0C6); }
+ (UIColor *)textDisabled   { return LunyColorFromHex(0x5F6B93); }
+ (UIColor *)textOnAccent   { return LunyColorFromHex(0x2A1B03); }

+ (UIColor *)accentAmber    { return LunyColorFromHex(0xF0B357); }
+ (UIColor *)accentSage     { return LunyColorFromHex(0x8FC7A8); }
+ (UIColor *)accentRose     { return LunyColorFromHex(0xD98FA6); }
+ (UIColor *)accentBlue     { return LunyColorFromHex(0x7FA6E0); }

+ (UIColor *)accentAtIndex:(NSUInteger)index
{
	NSArray *accents = @[ [self accentAmber], [self accentSage], [self accentRose], [self accentBlue] ];
	NSAssert(accents.count == kLunyAccentCount, @"kLunyAccentMask suppose exactement kLunyAccentCount accents");
	return accents[index & kLunyAccentMask];
}

+ (UIColor *)coverTintForAccent:(UIColor *)accent
{
	CGFloat accentRed = 0.0f, accentGreen = 0.0f, accentBlue = 0.0f, accentAlpha = 0.0f;
	CGFloat baseRed = 0.0f, baseGreen = 0.0f, baseBlue = 0.0f, baseAlpha = 0.0f;

	// getRed:... echoue sur un UIColor hors espace RVB (niveaux de gris,
	// motif) : on retombe alors sur artBase plutot que sur des composantes
	// non initialisees.
	if (![accent getRed:&accentRed green:&accentGreen blue:&accentBlue alpha:&accentAlpha] ||
	    ![[self artBase] getRed:&baseRed green:&baseGreen blue:&baseBlue alpha:&baseAlpha]) {
		return [self artBase];
	}

	CGFloat mix = kLunyCoverAccentMix;
	return [UIColor colorWithRed:(accentRed * mix) + (baseRed * (1.0f - mix))
	                       green:(accentGreen * mix) + (baseGreen * (1.0f - mix))
	                        blue:(accentBlue * mix) + (baseBlue * (1.0f - mix))
	                       alpha:1.0f];
}

@end
