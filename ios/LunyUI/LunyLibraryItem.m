#import "LunyLibraryItem.h"
#import "LunySimulatedAudio.h"
#import "luny_engine.h"

/*
 * Quatre packs aux caracteristiques deliberement differentes, pour que la
 * bibliotheque couvre plus qu'un cas nominal :
 *
 *   two-branches  2 ActionNodes a 2 options   parcours de reference
 *   random        1 ActionNode a 3 options    entree tiree au sort, molette partout
 *   degraded      1 ActionNode a 4 options    options mortes, assets manquants, version 2
 *   cycle         2 ActionNodes a 1 option    le graphe boucle sur lui-meme
 *
 * audio-demo n'est pas une fixture du moteur : il est ecrit pour cette app,
 * et c'est le SEUL pack embarque dont la lecture audio est reelle. Ses pistes
 * sont de vrais WAV PCM generes par Tools/make_demo_audio.py. Les quatre
 * autres referencent des .ogg de 0 octet et exercent donc le repli simule.
 *
 * random est celui qui exerce reellement la molette : ses trois options sont
 * valides et tous ses noeuds ont controlSettings.wheel. degraded a bien quatre
 * options mais deux sont mortes par construction, donc la rotation s'y arrete
 * — c'est ce que ce pack teste, pas un defaut.
 */
static NSString * const kLunyPackNames[] = {
    @"audio-demo",
    @"two-branches",
    @"random",
    @"degraded",
    @"cycle"
};

static const NSUInteger kLunyPackCount = sizeof(kLunyPackNames) / sizeof(kLunyPackNames[0]);

@interface LunyLibraryItem ()
@property (nonatomic, copy) NSString *packName;
@property (nonatomic, copy) NSString *packPath;
@property (nonatomic, copy) NSString *title;
@property (nonatomic, assign) NSInteger stageCount;
@property (nonatomic, assign) BOOL loaded;
@property (nonatomic, assign) NSTimeInterval simulatedDuration;
@property (nonatomic, assign) BOOL deletable;
@end

@implementation LunyLibraryItem

+ (NSString *)userPacksDirectory
{
    NSArray *documents = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory,
                                                             NSUserDomainMask, YES);

    if (!documents.count) {
        return nil;
    }

    return [documents[0] stringByAppendingPathComponent:@"packs"];
}

- (instancetype)initWithPackName:(NSString *)packName path:(NSString *)path deletable:(BOOL)deletable
{
    self = [super init];
    if (!self) {
        return nil;
    }

    _packName = [packName copy];
    _packPath = [path copy];
    _deletable = deletable;
    _title = [packName copy];
    _stageCount = 0;
    _loaded = NO;
    _simulatedDuration = [LunySimulatedAudio durationForPackNamed:packName];

    [self readMetadata];
    return self;
}

/* Ouvre le pack le temps de lire ses metadonnees, puis le referme. */
- (void)readMetadata
{
    if (!self.packPath) {
        return;
    }

    luny_engine *engine = NULL;

    if (luny_open([self.packPath fileSystemRepresentation], NULL, &engine) != LUNY_OK) {
        return;
    }

    luny_pack_view info;

    if (luny_pack_info(engine, &info)) {
        self.loaded = YES;
        self.stageCount = info.stage_count;

        if (info.title && info.title[0] != '\0') {
            self.title = @(info.title);
        }
    }

    luny_close(engine);
}

+ (NSArray *)sampleLibrary
{
    NSMutableArray *items = [NSMutableArray array];
    NSUInteger index;

    // Packs livres avec l'app : lisibles, jamais supprimables.
    for (index = 0; index < kLunyPackCount; index++) {
        NSString *name = kLunyPackNames[index];
        NSString *path = [[NSBundle mainBundle] pathForResource:name ofType:nil inDirectory:@"packs"];

        [items addObject:[[LunyLibraryItem alloc] initWithPackName:name path:path deletable:NO]];
    }

    // Packs deposes dans Documents : supprimables.
    NSString *userDir = [self userPacksDirectory];
    NSArray *entries = userDir
        ? [[NSFileManager defaultManager] contentsOfDirectoryAtPath:userDir error:NULL]
        : nil;

    for (NSString *name in [entries sortedArrayUsingSelector:@selector(compare:)]) {
        NSString *path = [userDir stringByAppendingPathComponent:name];
        BOOL directory = NO;

        if (![[NSFileManager defaultManager] fileExistsAtPath:path isDirectory:&directory] || !directory) {
            continue;
        }

        [items addObject:[[LunyLibraryItem alloc] initWithPackName:name path:path deletable:YES]];
    }

    return items;
}

- (BOOL)deleteFromDisk:(NSError **)error
{
    if (!self.deletable || !self.packPath) {
        // Garde-fou : le systeme refuserait de toute facon, mais autant ne pas
        // presenter la tentative comme possible.
        if (error) {
            *error = [NSError errorWithDomain:@"LunyLibraryItem" code:1 userInfo:
                      @{ NSLocalizedDescriptionKey: @"Ce pack est livré avec l'application." }];
        }
        return NO;
    }

    return [[NSFileManager defaultManager] removeItemAtPath:self.packPath error:error];
}

@end
