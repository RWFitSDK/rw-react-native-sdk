//
//  DHHrvModeSetModel.h
//  DHSFit
//
//  Created by DHS on 2025/3/31.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHHrvModeSetModel : NSObject
/// 开关（0.关 1.开）
@property (nonatomic, assign) BOOL isOpen;
/// 开始小时（0-23）
@property (nonatomic, assign) NSInteger startHour;
/// 开始分钟（0-59）
@property (nonatomic, assign) NSInteger startMinute;
/// 结束小时（0-23）
@property (nonatomic, assign) NSInteger endHour;
/// 结束分钟（0-59）
@property (nonatomic, assign) NSInteger endMinute;
/// 测试频率（0-255）
@property (nonatomic, assign) NSInteger interval;

- (NSData *)valueWithJL;
@end

NS_ASSUME_NONNULL_END
