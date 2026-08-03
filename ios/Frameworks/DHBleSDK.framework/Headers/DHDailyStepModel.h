//
//  DHDailyStepModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHDailyStepModel : NSObject

/// 日期时间戳（秒）
@property (nonatomic, copy) NSString *timestamp;
/// 日期yyyyMMdd
@property (nonatomic, copy) NSString *date;

/// 里程（米）
@property (nonatomic, assign) NSInteger distance;
/// 消耗（卡路里）
@property (nonatomic, assign) NSInteger calorie;
/// 步数（步）
@property (nonatomic, assign) NSInteger step;

/// 计步明细间隔，单位：分钟；当天数据读取功能位，历史数据固定为60
@property (nonatomic, assign) NSInteger activityDataInterval;

/// 计步项 例：@[@{@"timestamp":@0,@"index":@0,@"step":@100,@"calorie":@10000,@"distance":@50},...]
/// timestamp（Unix时间戳，秒）index（当前粒度下当天的明细序号）step（步数）calorie（消耗）distance（里程）
/// 旧设备固定24项并补0；支持ACTIVITY_DATA_INTERVAL的设备返回实际明细
/// 0x0502固定60分钟、index为0～23；0x051A按功能值计算，10分钟时index为0～143
@property (nonatomic,strong) NSMutableArray <NSDictionary *>*items;

@property (nonatomic, assign) BOOL isJLType;

@end

NS_ASSUME_NONNULL_END
