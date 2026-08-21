#import <UIKit/UIKit.h>

@interface XXCoverCell : UICollectionViewCell

+ (CGFloat)heightForWidth:(CGFloat)width;

- (void)configureWithTitle:(NSString *)title duration:(NSString *)duration tint:(UIColor *)tint;

@end
