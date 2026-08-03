//
//  DHTimeSetModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHTimeSetModel : NSObject

/// 年 例：2022
@property (nonatomic, assign) NSInteger year;
/// 月 （1-12）
@property (nonatomic, assign) NSInteger month;
/// 日（1-31）
@property (nonatomic, assign) NSInteger day;
/// 时（0-23）
@property (nonatomic, assign) NSInteger hour;
/// 分（0-59）
@property (nonatomic, assign) NSInteger minute;
/// 秒（0-59）
@property (nonatomic, assign) NSInteger second;

- (NSData *)valueWithJL;

@end

NS_ASSUME_NONNULL_END
