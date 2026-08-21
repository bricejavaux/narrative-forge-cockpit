#import "LunyLibraryItem.h"

@implementation LunyLibraryItem

- (instancetype)initWithTitle:(NSString *)title durationMinutes:(NSInteger)durationMinutes
{
    self = [super init];
    if (self) {
        _title = [title copy];
        _durationMinutes = durationMinutes;
    }
    return self;
}

+ (NSArray *)sampleLibrary
{
    return @[
        [[LunyLibraryItem alloc] initWithTitle:@"La nuit du renard" durationMinutes:12],
        [[LunyLibraryItem alloc] initWithTitle:@"Le phare endormi" durationMinutes:18],
        [[LunyLibraryItem alloc] initWithTitle:@"L'étoile qui bâille" durationMinutes:9],
        [[LunyLibraryItem alloc] initWithTitle:@"Le chemin perdu" durationMinutes:6],
    ];
}

@end
