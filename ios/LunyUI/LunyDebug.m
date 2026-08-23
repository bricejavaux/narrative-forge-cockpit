#import "LunyDebug.h"

#if LUNY_DEBUG

#import <UIKit/UIKit.h>

static NSString * const kLunyLayoutPath = @"/tmp/LunyUI-layout.txt";
static NSString * const kLunyAuditFlag  = @"/tmp/LunyUI-audit";

void LunyDebugTraceReset(void)
{
    [[NSFileManager defaultManager] removeItemAtPath:kLunyLayoutPath error:NULL];
}

BOOL LunyDebugAuditArmed(void)
{
    return [[NSFileManager defaultManager] fileExistsAtPath:kLunyAuditFlag];
}

void LunyDebugTrace(NSString *format, ...)
{
    va_list args;
    va_start(args, format);
    NSString *body = [[NSString alloc] initWithFormat:format arguments:args];
    va_end(args);

    NSString *ligne = [body hasSuffix:@"\n"] ? body : [body stringByAppendingString:@"\n"];

    /*
     * Ouverture en ajout, comme la trace de lecture : plusieurs releves se
     * suivent au fil des noeuds, et ecraser ne garderait que le dernier.
     */
    NSFileHandle *handle = [NSFileHandle fileHandleForWritingAtPath:kLunyLayoutPath];

    if (!handle) {
        [ligne writeToFile:kLunyLayoutPath atomically:NO
                  encoding:NSUTF8StringEncoding error:NULL];
        return;
    }

    [handle seekToEndOfFile];
    [handle writeData:[ligne dataUsingEncoding:NSUTF8StringEncoding]];
    [handle closeFile];
}

NSString *LunyDebugDescribeView(UIView *view, NSString *label)
{
    if (!view) {
        return [NSString stringWithFormat:@"%@: ABSENTE", label];
    }

    UIWindow *window = view.window;

    /*
     * Sans fenetre la vue n'est pas dans la hierarchie affichee : le cadre
     * serait mesurable mais ne voudrait rien dire. On le signale plutot que
     * de rendre un chiffre rassurant.
     */
    if (!window) {
        return [NSString stringWithFormat:@"%@: HORS FENETRE (cadre local %@)",
                label, NSStringFromCGRect(view.frame)];
    }

    CGRect inWindow = [view convertRect:view.bounds toView:window];

    /*
     * Opacite et masquage se propagent : une vue a alpha 1 dans un parent
     * masque reste invisible. On remonte donc la chaine jusqu'a la fenetre
     * pour rendre l'etat EFFECTIF, seul interessant ici.
     */
    CGFloat effectiveAlpha = 1.0f;
    BOOL hiddenSomewhere = NO;
    UIView *cursor = view;

    while (cursor && cursor != window) {
        effectiveAlpha *= cursor.alpha;
        if (cursor.hidden) {
            hiddenSomewhere = YES;
        }
        cursor = cursor.superview;
    }

    BOOL onScreen = !CGRectIsEmpty(CGRectIntersection(inWindow, window.bounds));
    BOOL visible = onScreen && !hiddenSomewhere && effectiveAlpha > 0.01f;

    return [NSString stringWithFormat:
            @"%@: %@ fenetre=%@ alphaEffectif=%.2f masquee=%@ dansEcran=%@ actif=%@",
            label,
            visible ? @"VISIBLE" : @"INVISIBLE",
            NSStringFromCGRect(inWindow),
            effectiveAlpha,
            hiddenSomewhere ? @"oui" : @"non",
            onScreen ? @"oui" : @"non",
            view.userInteractionEnabled ? @"oui" : @"non"];
}

#endif /* LUNY_DEBUG */
