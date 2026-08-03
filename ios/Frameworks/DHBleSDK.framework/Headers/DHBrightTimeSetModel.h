//
//  DHBrightTimeSetModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHBrightTimeSetModel : NSObject

/// 时长（秒 0-255，0表示常亮）
@property (nonatomic, assign) NSInteger duration;
@property (nonatomic, strong) NSString *durationNums;
@property (nonatomic, assign) NSInteger muslimMode; //0自定义 1默认

@property (nonatomic, assign) NSInteger sleepOpen;
@property (nonatomic, assign) NSInteger sleepStartHour;
@property (nonatomic, assign) NSInteger sleepStartMin;
@property (nonatomic, assign) NSInteger sleepEndHour;
@property (nonatomic, assign) NSInteger sleepEndMin;

- (NSData *)valueWithJL;
- (NSData *)valueWithRingSleep;

@end

NS_ASSUME_NONNULL_END
