//
//  DHHRAlertModel.h
//  DHSFit
//
//  Created by DHS on 2025/10/30.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHHRAlertModel : NSObject
/// 开关（0.关 1.开）
@property (nonatomic, assign) BOOL isOpen;
/// 默认值为 心率超过160，血氧低于94%，报警
@property (nonatomic, assign) NSInteger overValue;

/// 低于该值报警
@property (nonatomic, assign) NSInteger underValue;

- (NSData *)valueWithJL;


@end

NS_ASSUME_NONNULL_END
