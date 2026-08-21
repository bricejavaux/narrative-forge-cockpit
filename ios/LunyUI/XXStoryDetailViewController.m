#import "XXStoryDetailViewController.h"

@implementation XXStoryDetailViewController

- (id)initWithTitle:(NSString *)title {
	self = [super initWithNibName:nil bundle:nil];

	if (!self) {
		return nil;
	}

	self.title = title.length ? title : @"Détail";
	return self;
}

- (void)viewDidLoad {
	[super viewDidLoad];

	self.view.backgroundColor = [UIColor colorWithWhite:0.96f alpha:1.0f];
	self.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

	UILabel *placeholder = [[UILabel alloc] initWithFrame:self.view.bounds];
	placeholder.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
	placeholder.backgroundColor = [UIColor clearColor];
	placeholder.textAlignment = NSTextAlignmentCenter;
	placeholder.font = [UIFont systemFontOfSize:15.0f];
	placeholder.textColor = [UIColor colorWithWhite:0.55f alpha:1.0f];
	placeholder.text = @"Écran de détail";
	[self.view addSubview:placeholder];
}

@end
