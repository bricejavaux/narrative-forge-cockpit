#import "DetailViewController.h"

@interface DetailViewController ()
@property (nonatomic, copy) NSString *storyTitle;
@end

@implementation DetailViewController

- (instancetype)initWithStoryTitle:(NSString *)storyTitle
{
    self = [super initWithNibName:nil bundle:nil];
    if (self) {
        _storyTitle = [storyTitle copy];
    }
    return self;
}

- (void)viewDidLoad
{
    [super viewDidLoad];

    // self.title alimente aussi le bouton retour automatique de la tuile
    // precedente dans la pile de navigation ; rien d'autre a faire pour lui.
    self.title = self.storyTitle;

    // #08 0C19 — meme fond sombre que le reste de l'app.
    self.view.backgroundColor = [UIColor colorWithRed:0.024f green:0.031f blue:0.071f alpha:1.0f];

    UILabel *label = [[UILabel alloc] initWithFrame:CGRectZero];
    label.text = self.storyTitle;
    label.textColor = [UIColor colorWithRed:0.906f green:0.925f blue:0.980f alpha:1.0f];
    label.font = [UIFont boldSystemFontOfSize:20.0f];
    // NSTextAlignmentCenter (et non l'ancien UITextAlignmentCenter, retire
    // au profit de NSTextAlignment* precisement en iOS 6.0 — voir NOTES.md).
    label.textAlignment = NSTextAlignmentCenter;
    label.numberOfLines = 0;
    label.backgroundColor = [UIColor clearColor];
    label.autoresizingMask = UIViewAutoresizingFlexibleWidth
                            | UIViewAutoresizingFlexibleHeight
                            | UIViewAutoresizingFlexibleTopMargin
                            | UIViewAutoresizingFlexibleBottomMargin
                            | UIViewAutoresizingFlexibleLeftMargin
                            | UIViewAutoresizingFlexibleRightMargin;

    // Centrage calcule a la main : pas d'Auto Layout sur iOS 6.
    CGFloat labelWidth = self.view.bounds.size.width - 40.0f;
    CGFloat labelHeight = 80.0f;
    label.frame = CGRectMake(20.0f,
                              (self.view.bounds.size.height - labelHeight) / 2.0f,
                              labelWidth,
                              labelHeight);

    [self.view addSubview:label];
}

@end
