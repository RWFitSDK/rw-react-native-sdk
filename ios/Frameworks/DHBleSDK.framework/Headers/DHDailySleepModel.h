//
//  DHDailySleepModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHDailySleepModel : NSObject

/// 时间戳（秒）
@property (nonatomic, copy) NSString *timestamp;
/// 日期yyyyMMdd
@property (nonatomic, copy) NSString *date;

/// 总时长（分钟）
@property (nonatomic, assign) NSInteger duration;
/// 入睡时间（时间戳（秒））
@property (nonatomic, copy) NSString *beginTime;
/// 醒来时间（时间戳（秒））
@property (nonatomic, copy) NSString *endTime;

/// 睡眠项 例：@[@{@"status":@0,@"value":@60},...]
/// status（睡眠类型）value（时长（分钟））
/// status（0.清醒 1.浅睡 2.深睡）
@property (nonatomic,strong) NSMutableArray <NSDictionary *> *items;

@property (nonatomic, assign) BOOL isJLType;

@end

NS_ASSUME_NONNULL_END
