//
//  DHDailyBpModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHDailyBpModel : NSObject

/// 时间戳（秒）
@property (nonatomic, copy) NSString *timestamp;
/// 日期yyyyMMdd
@property (nonatomic, copy) NSString *date;

/// 血压项 例：@[@{@"timestamp":@0,@"systolic":@120,@"diastolic":@80},...]
/// timestamp（时间戳（秒））systolic（收缩压））diastolic（舒张压））
@property (nonatomic,strong) NSMutableArray <NSDictionary *>*items;

@property (nonatomic, assign) BOOL isJLType;

@end

NS_ASSUME_NONNULL_END
