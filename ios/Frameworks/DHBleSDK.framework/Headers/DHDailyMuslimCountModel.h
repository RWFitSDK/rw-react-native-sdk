//
//  DHDailyMuslimCountModel.h
//  DHSFit
//
//  Created by DHS on 2024/6/29.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHDailyMuslimCountModel : NSObject
/// 时间戳（秒）
@property (nonatomic, copy) NSString *timestamp;
/// 日期yyyyMMdd
@property (nonatomic, copy) NSString *date;

@property (nonatomic, assign) NSInteger muslimcount;

/// 血氧项 例：@[@{@"timestamp":@0,@"value":@80},...]
/// timestamp（时间戳（秒））value（血氧值）
@property (nonatomic,strong) NSMutableArray <NSDictionary *>*items;

@property (nonatomic, assign) BOOL isJLType;

@end

NS_ASSUME_NONNULL_END
