/*
 * LunyARMSupport.c -- helpers de division entiere pour armv7.
 *
 * Pourquoi ce fichier existe : armv7 n'a pas d'instruction de division
 * entiere. clang emet donc des appels a ___udivsi3 / ___umodsi3 / ___divsi3 /
 * ___modsi3, normalement fournis par compiler-rt. Le SDK de cette chaine
 * Theos n'expose qu'un libcompiler_rt.tbd reduit aux helpers atomiques, sans
 * aucun symbole de division -- d'ou une erreur de lien
 * "Undefined symbols for architecture armv7" des qu'un modulo porte sur une
 * valeur non constante (luny_engine.c:167 et :172, echantillonnage par rejet
 * du generateur aleatoire).
 *
 * Les quatre helpers sont fournis ensemble, et pas seulement les deux
 * actuellement references, pour qu'un futur usage de '/' dans le moteur ne
 * casse pas le lien de maniere obscure.
 *
 * Division binaire par soustraction-decalage : lente mais exacte, et le
 * moteur ne divise que dans des chemins froids.
 */

#if defined(__arm__)

static unsigned int luny_udivmod(unsigned int numerator,
                                 unsigned int denominator,
                                 unsigned int *remainder_out)
{
    unsigned int quotient = 0u;
    unsigned int remainder = 0u;
    int bit;

    /* Division par zero : comportement indefini cote appelant. On renvoie 0
     * plutot que de laisser le processeur decider, pour ne pas transformer un
     * bug amont en plantage inexplicable sur l'appareil. */
    if (denominator == 0u) {
        if (remainder_out != 0) {
            *remainder_out = 0u;
        }
        return 0u;
    }

    for (bit = 31; bit >= 0; bit--) {
        remainder = (remainder << 1) | ((numerator >> bit) & 1u);
        if (remainder >= denominator) {
            remainder -= denominator;
            quotient |= (1u << bit);
        }
    }

    if (remainder_out != 0) {
        *remainder_out = remainder;
    }
    return quotient;
}

/* Valeur absolue en unsigned, sans deborder sur INT_MIN. */
static unsigned int luny_abs_to_unsigned(int value)
{
    if (value < 0) {
        return (unsigned int)(-(value + 1)) + 1u;
    }
    return (unsigned int)value;
}

unsigned int __udivsi3(unsigned int a, unsigned int b);
unsigned int __umodsi3(unsigned int a, unsigned int b);
int __divsi3(int a, int b);
int __modsi3(int a, int b);

unsigned int __udivsi3(unsigned int a, unsigned int b)
{
    return luny_udivmod(a, b, 0);
}

unsigned int __umodsi3(unsigned int a, unsigned int b)
{
    unsigned int remainder;
    luny_udivmod(a, b, &remainder);
    return remainder;
}

int __divsi3(int a, int b)
{
    unsigned int quotient = luny_udivmod(luny_abs_to_unsigned(a),
                                         luny_abs_to_unsigned(b), 0);

    /* La division entiere tronque vers zero (C99 6.5.5p6). */
    if ((a < 0) != (b < 0)) {
        return -(int)quotient;
    }
    return (int)quotient;
}

int __modsi3(int a, int b)
{
    unsigned int remainder;
    luny_udivmod(luny_abs_to_unsigned(a), luny_abs_to_unsigned(b), &remainder);

    /* Le reste prend le signe du dividende (C99 6.5.5p6). */
    if (a < 0) {
        return -(int)remainder;
    }
    return (int)remainder;
}

#else

/* Toute autre architecture dispose de la division materielle. Une unite de
 * traduction vide est interdite par ISO C : ce typedef la remplit. */
typedef int luny_arm_support_not_needed;

#endif /* __arm__ */
