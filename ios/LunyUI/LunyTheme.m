#import "LunyTheme.h"

/* Proportion d'accent conservee dans la teinte de couverture, et dans la
 * variante desactivee d'un bouton. Meme formule pour les deux palettes. */
static const CGFloat kLunyCoverAccentMix = 0.18f;
static const CGFloat kLunyDisabledAccentMix = 0.18f;

/*
 * Le cycle des accents se fait par masque binaire, pas par modulo : armv7
 * n'a pas d'instruction de division entiere et clang emet alors un appel a
 * ___umodsi3 (compiler-rt), absent du libcompiler_rt.tbd de ce SDK — erreur
 * de lien "Undefined symbols for architecture armv7".
 * Contrainte induite : le nombre d'accents doit rester une puissance de deux.
 */
static const NSUInteger kLunyAccentCount = 4;
static const NSUInteger kLunyAccentMask = kLunyAccentCount - 1;

typedef struct {
    const char *name;
    uint32_t backgroundDeep;
    uint32_t surface;
    uint32_t artBase;
    uint32_t controlsSurface;
    uint32_t raisedSurface;
    uint32_t trackRail;
    uint32_t dotIdle;
    uint32_t textPrimary;
    uint32_t textBright;
    uint32_t textMuted;
    uint32_t textDisabled;
    uint32_t textOnAccent;
    uint32_t accentAmber;
    uint32_t accentSage;
    uint32_t accentRose;
    uint32_t accentBlue;
} LunyPalette;

/* Nuit et ambre — mockup/luny_maquette_v3.html. */
static const LunyPalette kLunyDarkPalette = {
    "sombre",
    0x0B1024, 0x141A32, 0x060812, 0x101426, 0x1C2440, 0x232B47, 0x2C3554,
    0xC8D3F2, 0xE7ECFA, 0x94A0C6, 0x5F6B93, 0x2A1B03,
    0xF0B357, 0x8FC7A8, 0xD98FA6, 0x7FA6E0
};

/*
 * Bois et creme. Direction ecrite, sans reference visuelle exterieure : fond
 * creme, surfaces de bois clair, encre brune.
 *
 * Les accents y sont PROFONDS, a l'inverse de la palette sombre. Un accent
 * sert a deux choses — remplir un bouton et encrer un glyphe sur une
 * couverture — et sur fond clair seule une teinte profonde tient les deux :
 * elle porte alors un libelle creme en remplissage, et se detache en encre.
 */
static const LunyPalette kLunyLightPalette = {
    "claire",
    0xF3E7D3, 0xE7D6BA, 0xD8C3A0, 0xEADCC2, 0xDCC8A6, 0xC6AE8A, 0xC0A784,
    0x43301F, 0x2B1D12, 0x5E4730, 0x7C6446, 0xF7EFE1,
    0x7C4910, 0x445C33, 0x8A4136, 0x3A5563
};

/*
 * Selection par ternaire sur constante, et non par #if : les deux palettes
 * restent alors referencees, ce qui evite un -Wunused-const-variable promu en
 * erreur sur celle qui n'est pas retenue. Le compilateur replie le test.
 */
static const LunyPalette *LunyActivePalette(void)
{
    return LUNY_THEME_LIGHT ? &kLunyLightPalette : &kLunyDarkPalette;
}

static UIColor *LunyColorFromHex(uint32_t hex)
{
    return [UIColor colorWithRed:((hex >> 16) & 0xFF) / 255.0f
                           green:((hex >> 8) & 0xFF) / 255.0f
                            blue:(hex & 0xFF) / 255.0f
                           alpha:1.0f];
}

/* Melange deux couleurs en conservant l'espace RVB. */
static UIColor *LunyMix(UIColor *top, UIColor *bottom, CGFloat weight)
{
    CGFloat tr = 0.0f, tg = 0.0f, tb = 0.0f, ta = 0.0f;
    CGFloat br = 0.0f, bg = 0.0f, bb = 0.0f, ba = 0.0f;

    // getRed:... echoue sur un UIColor hors espace RVB (niveaux de gris,
    // motif) : on rend alors la couleur de fond plutot que des composantes
    // non initialisees.
    if (![top getRed:&tr green:&tg blue:&tb alpha:&ta] ||
        ![bottom getRed:&br green:&bg blue:&bb alpha:&ba]) {
        return bottom;
    }

    return [UIColor colorWithRed:(tr * weight) + (br * (1.0f - weight))
                           green:(tg * weight) + (bg * (1.0f - weight))
                            blue:(tb * weight) + (bb * (1.0f - weight))
                           alpha:1.0f];
}

@implementation LunyTheme

+ (NSString *)paletteName { return @(LunyActivePalette()->name); }

+ (UIColor *)backgroundDeep  { return LunyColorFromHex(LunyActivePalette()->backgroundDeep); }
+ (UIColor *)surface         { return LunyColorFromHex(LunyActivePalette()->surface); }
+ (UIColor *)artBase         { return LunyColorFromHex(LunyActivePalette()->artBase); }
+ (UIColor *)controlsSurface { return LunyColorFromHex(LunyActivePalette()->controlsSurface); }
+ (UIColor *)raisedSurface   { return LunyColorFromHex(LunyActivePalette()->raisedSurface); }
+ (UIColor *)trackRail       { return LunyColorFromHex(LunyActivePalette()->trackRail); }
+ (UIColor *)dotIdle         { return LunyColorFromHex(LunyActivePalette()->dotIdle); }

+ (UIColor *)overlaySurface  { return [[self raisedSurface] colorWithAlphaComponent:0.88f]; }

+ (UIColor *)textPrimary     { return LunyColorFromHex(LunyActivePalette()->textPrimary); }
+ (UIColor *)textBright      { return LunyColorFromHex(LunyActivePalette()->textBright); }
+ (UIColor *)textMuted       { return LunyColorFromHex(LunyActivePalette()->textMuted); }
+ (UIColor *)textDisabled    { return LunyColorFromHex(LunyActivePalette()->textDisabled); }
+ (UIColor *)textOnAccent    { return LunyColorFromHex(LunyActivePalette()->textOnAccent); }

+ (UIColor *)accentAmber     { return LunyColorFromHex(LunyActivePalette()->accentAmber); }
+ (UIColor *)accentSage      { return LunyColorFromHex(LunyActivePalette()->accentSage); }
+ (UIColor *)accentRose      { return LunyColorFromHex(LunyActivePalette()->accentRose); }
+ (UIColor *)accentBlue      { return LunyColorFromHex(LunyActivePalette()->accentBlue); }

+ (UIColor *)accentAtIndex:(NSUInteger)index
{
    NSArray *accents = @[ [self accentAmber], [self accentSage], [self accentRose], [self accentBlue] ];
    NSAssert(accents.count == kLunyAccentCount, @"kLunyAccentMask suppose exactement kLunyAccentCount accents");
    return accents[index & kLunyAccentMask];
}

+ (UIColor *)coverTintForAccent:(UIColor *)accent
{
    return LunyMix(accent, [self artBase], kLunyCoverAccentMix);
}

+ (UIColor *)pressedVariantOf:(UIColor *)color
{
    CGFloat red = 0.0f, green = 0.0f, blue = 0.0f, alpha = 0.0f;

    if (![color getRed:&red green:&green blue:&blue alpha:&alpha]) {
        return color;
    }

    // Assombrissement multiplicatif : garde la teinte, ne la desature pas.
    static const CGFloat factor = 0.82f;
    return [UIColor colorWithRed:red * factor green:green * factor
                            blue:blue * factor alpha:alpha];
}

+ (UIColor *)disabledVariantOf:(UIColor *)color
{
    return LunyMix(color, [self controlsSurface], kLunyDisabledAccentMix);
}

+ (UIImage *)solidImageWithColor:(UIColor *)color
{
    CGRect rect = CGRectMake(0.0f, 0.0f, 1.0f, 1.0f);

    UIGraphicsBeginImageContextWithOptions(rect.size, NO, 0.0f);
    [color setFill];
    UIRectFill(rect);
    UIImage *image = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();

    return image;
}

@end
