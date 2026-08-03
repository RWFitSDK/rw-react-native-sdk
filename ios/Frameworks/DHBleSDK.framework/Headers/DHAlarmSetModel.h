//
//  DHAlarmSetModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHAlarmSetModel : NSObject

/// 开关（0.关 1.开）
@property (nonatomic, assign) BOOL isOpen;
/// 小时（0-23）
@property (nonatomic, assign) NSInteger hour;
/// 分钟（0-59）
@property (nonatomic, assign) NSInteger minute;
/// 重复 例：@[@0,@0,@0,@0,@0,@0,@1]; 按顺序从周日到周六，0.未选中 1.选中，示例代表周六重复提醒
@property (nonatomic,strong) NSArray <NSNumber *>*repeats;
/// 标签
@property (nonatomic, copy) NSString *alarmType;
/// 稍后提醒（0.关 1.开）
@property (nonatomic, assign) BOOL isRemindLater;

@property (nonatomic, assign) UInt8 jlYear;
@property (nonatomic, assign) UInt8 jlMonth;
@property (nonatomic, assign) UInt8 jlDay;
@property (nonatomic, assign) UInt8 jlAlarmId;


- (NSData *)valueWithJL;


@end

NS_ASSUME_NONNULL_END
