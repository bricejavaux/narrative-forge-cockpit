/*
 * LunyLibraryItem.h
 *
 * Entree de bibliotheque FACTICE pour cet ecran de test.
 *
 * Ceci n'est PAS un modele de pack STUdio/Luny : pas d'uuid, pas de graphe
 * de noeuds, aucune reference a luny-engine. Le moteur C n'est pas branche
 * dans cette session (voir README.md, section "Perimetre").
 * A remplacer par de vraies donnees issues de luny_pack_info() lors de la
 * session de branchement du moteur.
 */
#import <Foundation/Foundation.h>

@interface LunyLibraryItem : NSObject

@property (nonatomic, copy, readonly) NSString *title;
@property (nonatomic, assign, readonly) NSInteger durationMinutes;

- (instancetype)initWithTitle:(NSString *)title durationMinutes:(NSInteger)durationMinutes;

/*
 * Quatre entrees codees en dur, reprenant les titres des packs de
 * demonstration de mockup/luny_maquette_v3.html — coherence avec la
 * maquette de reference plutot que des titres inventes pour l'occasion.
 * Duree en minutes arbitraire, sans rapport avec les durees compressees
 * du minuteur de demonstration de la maquette (utilisees la pour rejouer
 * vite un audio factice, pas pour representer une duree plausible).
 */
+ (NSArray *)sampleLibrary;

@end
