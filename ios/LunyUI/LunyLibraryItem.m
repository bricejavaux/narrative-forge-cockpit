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
 * random est celui qui exerce reellement la molette : ses trois options sont
 * valides et tous ses noeuds ont controlSettings.wheel. degraded a bien quatre
 * options mais deux sont mortes par construction, donc la rotation s'y arrete
 * — c'est ce que ce pack teste, pas un defaut.
 */
static NSString * const kLunyPackNames[] = {
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
@end

@implementation LunyLibraryItem

- (instancetype)initWithPackName:(NSString *)packName
{
    self = [super init];
    if (!self) {
        return nil;
    }

    _packName = [packName copy];
    _packPath = [[NSBundle mainBundle] pathForResource:packName ofType:nil inDirectory:@"packs"];
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
    NSMutableArray *items = [NSMutableArray arrayWithCapacity:kLunyPackCount];
    NSUInteger index;

    for (index = 0; index < kLunyPackCount; index++) {
        [items addObject:[[LunyLibraryItem alloc] initWithPackName:kLunyPackNames[index]]];
    }

    return items;
}

@end
