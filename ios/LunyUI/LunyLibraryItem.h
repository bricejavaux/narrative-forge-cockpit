/*
 * LunyLibraryItem.h
 *
 * Une entree de bibliotheque = un pack embarque dans Resources/packs/.
 *
 * Les metadonnees ne sont plus codees en dur : le titre et le nombre de
 * noeuds sont lus dans le pack via luny_pack_info() a la construction de la
 * bibliotheque. Ce que la grille affiche vient donc du moteur, comme l'ecran
 * de detail.
 *
 * Ceci n'est toujours pas un modele de pack STUdio complet : pas de graphe
 * expose ici, pas de reference a luny-engine dans cet en-tete. L'ecran de
 * lecture rouvre le pack pour son propre compte a partir de -packPath.
 */
#import <Foundation/Foundation.h>

@interface LunyLibraryItem : NSObject

/* Nom du repertoire sous Resources/packs/. */
@property (nonatomic, copy, readonly) NSString *packName;

/* Chemin absolu du pack, ou nil s'il est introuvable dans le bundle. */
@property (nonatomic, copy, readonly) NSString *packPath;

/* Titre lu dans le pack, ou le nom du repertoire en repli. */
@property (nonatomic, copy, readonly) NSString *title;

/* Nombre de StageNodes annonce par le moteur, 0 si le pack n'a pas ouvert. */
@property (nonatomic, assign, readonly) NSInteger stageCount;

/* NO si luny_open() a echoue : la tuile reste visible, mais signalee. */
@property (nonatomic, assign, readonly) BOOL loaded;

/*
 * Les packs embarques, dans l'ordre d'affichage. Chaque entree est ouverte une
 * fois pour lire ses metadonnees, puis refermee.
 */
+ (NSArray *)sampleLibrary;

@end
