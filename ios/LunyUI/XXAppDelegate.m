#import "XXAppDelegate.h"
#import "XXRootViewController.h"

@implementation XXAppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
	_window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];

	XXRootViewController *root = [[XXRootViewController alloc] initWithCollectionViewLayout:[XXRootViewController defaultLayout]];
	_rootViewController = [[UINavigationController alloc] initWithRootViewController:root];
	_window.rootViewController = _rootViewController;
	[_window makeKeyAndVisible];
	return YES;
}

@end
