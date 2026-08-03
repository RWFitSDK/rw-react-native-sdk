//
//  DHBleCommand.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>
#import <DHBleSDK/DHBleCommandEnums.h>

#import <DHBleSDK/DHFirmwareVersionModel.h>
#import <DHBleSDK/DHBatteryInfoModel.h>
#import <DHBleSDK/DHTimeSetModel.h>
#import <DHBleSDK/DHDeviceInfoModel.h>

#import <DHBleSDK/DHBindSetModel.h>
#import <DHBleSDK/DHAckModel.h>
#import <DHBleSDK/DeviceFuncV2Model.h>

#import <DHBleSDK/DHHeartRateModeSetModel.h>
#import <DHBleSDK/DHBoModeSetModel.h>
#import <DHBleSDK/DHHrvModeSetModel.h>
#import <DHBleSDK/DHVideoHidSetModel.h>
#import <DHBleSDK/DHLedLightSetModel.h>
#import <DHBleSDK/DHStressModeSetModel.h>
#import <DHBleSDK/DHStressModeSetModel.h>
#import <DHBleSDK/DHBloodSugarModeSetModel.h>
#import <DHBleSDK/DHBpModeSetModel.h>
#import <DHBleSDK/DHFlashDurationModel.h>
#import <DHBleSDK/DHBrightTimeSetModel.h>
#import <DHBleSDK/DHAlarmSetModel.h>

#import <DHBleSDK/DHDailyStepModel.h>
#import <DHBleSDK/DHDailySleepModel.h>
#import <DHBleSDK/DHDailyHrModel.h>
#import <DHBleSDK/DHDailyHrvModel.h>
#import <DHBleSDK/DHDailyBoModel.h>
#import <DHBleSDK/DHDailyBpModel.h>
#import <DHBleSDK/DHDailyPressureModel.h>
#import <DHBleSDK/DHDailyBloodSugarModel.h>
#import <DHBleSDK/DHDailyTempModel.h>
#import <DHBleSDK/DHDailyMuslimCountModel.h>
#import <DHBleSDK/DHVibrationLevelModel.h>
#import <DHBleSDK/DHAncsSetModel.h>
#import <DHBleSDK/DHSportControlModel.h>
#import <DHBleSDK/DHUserInfoSetModel.h>
#import <DHBleSDK/DHHRAlertModel.h>
#import <DHBleSDK/DHDailySportModel.h>
#import <DHBleSDK/DHGestureSetModel.h>


NS_ASSUME_NONNULL_BEGIN

@interface DHBleCommand : NSObject

#pragma mark - 基础功能指令

+ (NSString *)getSDKVersion;

+ (void)ringGetMacAddress:(void(^)(int code, id data))block;

/// 获取固件版本信息
/// @param block 回调
+ (void)getFirmwareVersion:(void(^)(int code, id data))block;

/// 获取电量信息
/// @param block 回调
+ (void)getBattery:(void(^)(int code, id data))block;

/// 设置个人信息
/// @param model 模型
/// @param block 回调
+ (void)setUserInfo:(DHUserInfoSetModel *)model block:(void(^)(int code, id data))block;

/// 获取视频控制开关
/// @param block 回调
+ (void)getVideoHid:(void(^)(int code, id data))block;

/// 设置视频控制开关
/// @param model 模型
/// @param block 回调
+ (void)setVideoHid:(DHVideoHidSetModel *)model block:(void(^)(int code, id data))block;

/// 获取LED亮屏强度
/// @param block 回调
+ (void)getRingLEDLight:(void(^)(int code, id data))block;

/// 设置LED屏幕亮度
/// @param model 模型
/// @param block 回调
+ (void)setRingLEDLight:(DHLedLightSetModel *)model block:(void(^)(int code, id data))block;

/// 获取配戴左右手
/// @param block 回调
+ (void)getRingWearHand:(void(^)(int code, id data))block;

/// 设置视频控制开关
/// @param wearHand 0 左手 1右手
/// @param block 回调
+ (void)setRingWearHand:(UInt8)wearHand block:(void(^)(int code, id data))block;

///显示屏睡眠模式
+ (void)getDisplaySleepMode:(void(^)(int code, id data))block;
+ (void)setDisplaySleepMode:(DHBrightTimeSetModel *)model block:(void(^)(int code, id data))block;

+ (void)setRingMotorLevel:(NSInteger)motorLevel motorNum:(NSInteger)motorNum block:(void(^)(int code, id data))block;
+ (void)getRingMotorLevel:(void(^)(int code, id data))block;

+ (void)ringGetAncs:(void(^)(int code, id data))block;
+ (void)ringSetAncs:(DHAncsSetModel *)model block:(void(^)(int code, id data))block;

+ (void)setRingBtName:(NSString *)btName block:(void(^)(int code, id data))block;

/// 获取闹钟提醒
/// @param block 回调
+ (void)getAlarms:(void(^)(int code, id data))block;
/// 设置闹钟提醒
/// @param alarms 闹钟数组
/// @param block 回调
+ (void)setAlarms:(NSArray <DHAlarmSetModel *>*)alarms block:(void(^)(int code, id data))block;

+ (void)setMuslimCountSwitch:(UInt8)isOpen block:(void(^)(int code, id data))block;
+ (void)setHRAlert:(DHHRAlertModel *)overModel block:(void(^)(int code, id data))block;
+ (void)setSP02Alert:(DHHRAlertModel *)overModel block:(void(^)(int code, id data))block;
+ (void)getMuslimCountSwitch:(void(^)(int code, id data))block;
+ (void)getHRAlert:(void(^)(int code, id data))block;
+ (void)getSP02Alert:(void(^)(int code, id data))block;

+ (void)ringGetGesture:(void(^)(int code, id data))block;
+ (void)ringSetGesture:(DHGestureSetModel *)model block:(void(^)(int code, id data))block;

///0: 24小时制 1:12小时制
+ (void)ringSetTimeformat:(UInt8)timeformat block:(void(^)(int code, id data))block;

#pragma mark- 健康数据---全天监控

/// 获取心率监测
/// @param block 回调
+ (void)getHeartRateMode:(void(^)(int code, id data))block;

/// 设置心率监测
/// @param model 模型
/// @param block 回调
+ (void)setHeartRateMode:(DHHeartRateModeSetModel *)model block:(void(^)(int code, id data))block;

/// 获取血氧监测
/// @param block 回调
+ (void)getBoMode:(void(^)(int code, id data))block;

/// 设置血氧监测
/// @param model 模型
/// @param block 回调
+ (void)setBoMode:(DHBoModeSetModel *)model block:(void(^)(int code, id data))block;

/// 获取HRV监测
/// @param block 回调
+ (void)getHrvMode:(void(^)(int code, id data))block;

/// 设置HRV监测
/// @param model 模型
/// @param block 回调
+ (void)setHrvMode:(DHHrvModeSetModel *)model block:(void(^)(int code, id data))block;

/// 获取PPG定时监测
/// @param block 回调
+ (void)getPPGMode:(void(^)(int code, id data))block;

/// 设置PPG定时监测
/// @param model 模型
/// @param block 回调
+ (void)setPPGMode:(DHHrvModeSetModel *)model block:(void(^)(int code, id data))block;

+ (void)getStressMode:(void(^)(int code, id data))block;

+ (void)setStressMode:(DHStressModeSetModel *)model block:(void(^)(int code, id data))block;

+ (void)getBloodSugarMode:(void(^)(int code, id data))block;

+ (void)setBloodSugarMode:(DHBloodSugarModeSetModel *)model block:(void(^)(int code, id data))block;

/// 获取血压监测
/// @param block 回调
+ (void)getBpMode:(void(^)(int code, id data))block;

/// 设置血压监测
/// @param model 模型
/// @param block 回调
+ (void)setBpMode:(DHBpModeSetModel *)model block:(void(^)(int code, id data))block;

/// 获取定时体温监测
/// @param block 回调
+ (void)getTimedBodyTemperature:(void(^)(int code, id data))block;

/// 设置定时体温监测
/// @param model 模型(isOpen/startHour/startMinute/endHour/endMinute/interval)
/// @param block 回调
+ (void)setTimedBodyTemperature:(DHHeartRateModeSetModel *)model block:(void(^)(int code, id data))block;

/// 获取跌落提醒开关
/// @param block 回调, data为NSNumber(0关/1开)
+ (void)getFallDetect:(void(^)(int code, id data))block;

/// 设置跌落提醒开关
/// @param enable 0:关 1:开
/// @param block 回调
+ (void)setFallDetect:(UInt8)enable block:(void(^)(int code, id data))block;

/// 获取计数提醒间隔
/// @param block 回调, data为NSNumber(0关闭/30/60/90/120分钟)
+ (void)getCountReminderInterval:(void(^)(int code, id data))block;

/// 设置计数提醒间隔
/// @param interval 0:关闭 30/60/90/120:分钟
/// @param block 回调
+ (void)setCountReminderInterval:(UInt8)interval block:(void(^)(int code, id data))block;

#pragma mark- 传感器原始数据

/// 控制传感器原始数据输出
/// @param outputType 1: 开启Sensor输出 2: 关闭Sensor输出
/// @param sensorType 1: ACC  2: PPG
+ (void)ringControlSensorRaw:(UInt8)outputType type:(UInt8)sensorType
                       block:(void(^)(int code, id data))block;

/// 获取传感器历史原始数据
/// @param block 同步完成回调, code==0 表示同步完成
/// @param dataBlock 数据回调, data为NSArray<NSDictionary>，每个元素包含 sensorType, sequence, count + 对应数据数组(ppgData/accData/ppgRedData/irData)
+ (void)ringGetHistorySensorRaw:(void(^)(int code, id data))block dataBlock:(void(^)(int code, int progress, id data))dataBlock;

#pragma mark- 工厂测试与校正
/// 启动工厂测试
/// @param testMode 测试模式: 0x15=心率校正
/// @param block 回调
+ (void)startFactoryTest:(UInt8)testMode block:(void(^)(int code, id data))block;


#pragma mark- 健康数据---开启关闭单次检测
/// 启动健康数据开关(心率,血氧,HRV)
/// @param type （0.关闭 1.打开）
/// @param block 回调
+ (void)controlOpen:(NSInteger)type dataType:(NSInteger)dataType block:(void(^)(int code, id data))block;

#pragma mark- 健康数据---同步
/// 自动同步数据
/// @param block 同步完成回调
/// @param datablock 健康数据回调
+ (void)startDataSyncing:(void(^)(int code, id data))block datablcok:(void(^)(int code, int progress, id data))datablock;

#pragma mark- 赞念定制
+ (void)getMuslimRingFlashDuration:(void(^)(int code, id data))block;
+ (void)getMuslimRingConnectAppBrightTime:(void(^)(int code, id data))block;
+ (void)getRingMuslimGoal:(void(^)(int code, id data))block;
/// 获取赞念震动6种模式,
+ (void)getMuslimCountModeWithNumber:(void(^)(int code, id data))block;
+ (void)getMuslimRingPrayerTimeWakeup:(void(^)(int code, id data))block;
/// 清理赞念数据
/// @param block 回调
+ (void)setJLMuslimCountClean:(void(^)(int code, id data))block;

/// 设置达标闪屏次数
/// @param goalFlashDuration 赞念目标达到闪屏次数
/// @param alarmFlashDuration 闹钟达到闪屏次数
/// @param block 回调
+ (void)setMuslimRingFlashDuration:(UInt8)goalFlashDuration alarmFlashDuration:(UInt8)alarmFlashDuration block:(void(^)(int code, id data))block;

/// 连接APP时的亮屏时长,单位分钟
/// @param brightTime 亮屏时长,单位分钟, 范围10-60
/// @param block 回调
+ (void)setMuslimRingConnectAppBrightTime:(UInt8)brightTime block:(void(^)(int code, id data))block;

/// 设置赞念目标
/// @param countGoal 赞念目标数量
/// @param mode 模式 0:自定义模式 1: 默认模式
/// @param block 回调
+ (void)setJLMuslimCountGoal:(int32_t)countGoal mode:(UInt8)mode block:(void(^)(int code, id data))block;
/// 设置赞念震动6种模式, number为自定义模式的值
/// @param mode 模式
/// @param number 自定义模式值
+ (void)setMuslimCountMode:(UInt8)mode number:(int32_t)number block:(void(^)(int code, id data))block;

/// 设置赞念值(仅供测试时使用)
/// @param countTestValue 赞念数量
/// @param block 回调
+ (void)setJLMuslimCountTest:(int32_t)countTestValue block:(void(^)(int code, id data))block;

/// 开启赞念
/// @param number 赞念数量
/// @param block 回调
+ (void)controlMuslimRingStart:(NSInteger)number block:(void(^)(int code, id data))block;
/// 开启赞念可设置初始值
/// @param number 赞念数量
/// @param initValue 初始值
/// @param block 回调
+ (void)controlMuslimRingStart:(NSInteger)number initValue:(NSInteger)initValue block:(void(^)(int code, id data))block;

/// 结束赞念
/// @param block 回调
+ (void)controlMuslimRingEnd:(void(^)(int code, id data))block;

///亮屏时长,暂只赞念定制使用
+ (void)getBrightTime:(void(^)(int code, id data))block;
+ (void)setBrightTime:(DHBrightTimeSetModel *)model block:(void(^)(int code, id data))block;

/// 获取Muslim计数清零方式
/// @param block 回调
+ (void)getMuslimCountResetMode:(void(^)(int code, id data))block;

/// 设置Muslim计数清零方式
/// @param mode 0:保持现状(默认) 1:允许戒指长按清零
/// @param block 回调
+ (void)setMuslimCountResetMode:(UInt8)mode block:(void(^)(int code, id data))block;

#pragma mark- 闹钟震动时长设置
/// 获取闹钟震动时长(次数)
/// @param block 回调, data为NSNumber(0-6)
+ (void)getAlarmVibrationDuration:(void(^)(int code, id data))block;

/// 设置闹钟震动时长(次数)
/// @param count 震动次数 0-6, 默认2次, 0为不震动
/// @param block 回调
+ (void)setAlarmVibrationDuration:(UInt8)count block:(void(^)(int code, id data))block;

#pragma mark- 震动间隔时长设置
/// 获取震动间隔时长(ms)
/// @param block 回调, data为NSNumber(100-1000)
+ (void)getVibrationInterval:(void(^)(int code, id data))block;

/// 设置震动间隔时长(ms)
/// @param intervalMs 间隔时长 100-1000ms, 默认500ms
/// @param block 回调
+ (void)setVibrationInterval:(UInt16)intervalMs block:(void(^)(int code, id data))block;

#pragma mark- Muslim时间显示模式

/// 获取Muslim时间显示模式
/// @param block 回调
+ (void)getMuslimTimeDisplayMode:(void(^)(int code, id data))block;

/// 设置Muslim时间显示模式
/// @param mode 1:每次唤醒都先显示时间 2:时间永不显示 3:休眠10分钟后再次唤醒时显示时间(默认)
/// @param block 回调
+ (void)setMuslimTimeDisplayMode:(UInt8)mode block:(void(^)(int code, id data))block;


#pragma mark - 控制类设备
/// 拍照控制
/// @param type （0.关闭 1.打开 2.拍照）
/// @param block 回调
+ (void)controlCamera:(NSInteger)type block:(void(^)(int code, id data))block;

/// 开始寻找设备
/// @param block 回调
+ (void)controlFindDeviceBegin:(void(^)(int code, id data))block;

/// 设备控制
/// @param type （0.重启 1.关机 2.恢复出厂设置）
/// @param block 回调
+ (void)controlDevice:(NSInteger)type block:(void(^)(int code, id data))block;


#pragma mark - 多运动
+ (void)controlSportWithRing:(DHSportControlModel *)model block:(void(^)(int code, id data))block;
+ (void)getControlSportWithRing:(void(^)(int code, id data))block;

+ (void)setRingEnterWorkOut:(UInt8)isEnter block:(void(^)(int code, id data))block;

/// 同步戒指运动数据,全有设备端产生
/// @param block 回调
+ (void)startRingWorkout3Syncing:(void(^)(int code, id data))block dataBlock:(void(^)(int code, int progress, id data))dataBlock;


#pragma mark - OTA文件传输类

/// Ring  BIN升级
+ (void)startPXIUIFileSyncing:(NSData *)fileData bleKey:(BleKey)bleKey block:(void(^)(int code, CGFloat progress, id data))block;

/// Ring OTA升级 (自动区分PXI/Telink)
+ (void)ringOtaWithFileData:(NSData *)fileData block:(void(^)(int code, CGFloat progress, id data))block;




@end

NS_ASSUME_NONNULL_END
