#import "XXAppDelegate.h"
#import "RootViewController.h"
#import "LunyAudioTrack.h"
#import "LunyTheme.h"

@implementation XXAppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
	// Categorie lecture, une fois pour toute l'app : sans elle le son reste
	// muet quand l'interrupteur silencieux est actif.
	[LunyAudioTrack prepareAudioSession];

	_window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
	// Evite un flash blanc entre le lancement et le premier rendu.
	_window.backgroundColor = [LunyTheme backgroundDeep];

	RootViewController *root = [[RootViewController alloc] init];
	_rootViewController = [[UINavigationController alloc] initWithRootViewController:root];

	// Barre de navigation sombre. Sur iOS 6, tintColor teinte le fond de la
	// barre (la semantique "couleur des elements" date d'iOS 7), et
	// NSForegroundColorAttributeName est disponible depuis iOS 6.0.
	UINavigationBar *navigationBar = _rootViewController.navigationBar;
	navigationBar.barStyle = UIBarStyleBlack;
	navigationBar.tintColor = [LunyTheme surface];
	[navigationBar setTitleTextAttributes:@{ NSForegroundColorAttributeName: [LunyTheme textBright] }];

	_window.rootViewController = _rootViewController;
	[_window makeKeyAndVisible];
	return YES;
}

@end
