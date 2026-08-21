#import <Foundation/Foundation.h>
#import "XXAppDelegate.h"

// Le 3GS ne dispose d'aucun outil de journalisation système : on écrit donc
// nous-mêmes le détail de toute exception non interceptée dans un fichier
// lisible depuis l'appareil.
static NSString * const XXCrashReportPath = @"/tmp/LunyUI-crash.txt";

static void XXWriteCrashReport(NSException *exception) {
	NSMutableString *report = [NSMutableString string];

	[report appendFormat:@"date: %@\n", [NSDate date]];
	[report appendFormat:@"name: %@\n", exception.name];
	[report appendFormat:@"reason: %@\n", exception.reason];
	[report appendFormat:@"userInfo: %@\n", exception.userInfo];
	[report appendFormat:@"stack:\n%@\n", [exception.callStackSymbols componentsJoinedByString:@"\n"]];

	[report writeToFile:XXCrashReportPath atomically:YES encoding:NSUTF8StringEncoding error:NULL];

	NSArray *documents = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);

	if (documents.count) {
		NSString *fallback = [documents[0] stringByAppendingPathComponent:@"LunyUI-crash.txt"];
		[report writeToFile:fallback atomically:YES encoding:NSUTF8StringEncoding error:NULL];
	}
}

int main(int argc, char *argv[]) {
	@autoreleasepool {
		NSSetUncaughtExceptionHandler(&XXWriteCrashReport);
		return UIApplicationMain(argc, argv, nil, NSStringFromClass(XXAppDelegate.class));
	}
}
