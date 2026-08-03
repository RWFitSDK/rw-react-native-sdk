//
//  DeviceFuncV2Model.h
//  DHSFit
//
//  Created by DHS on 2025/4/21.
//

#import <Foundation/Foundation.h>
NS_ASSUME_NONNULL_BEGIN

@interface DeviceFuncV2Model : NSObject

@property (nonatomic, assign) BOOL isTakePhoto;
@property (nonatomic, assign) BOOL isLEDLight;

@property (nonatomic, assign) BOOL isWearDir; //手势方向

////  视频控制HID(0.支持 1.不支持）
@property (nonatomic, assign) BOOL isVideoHid;

@property (nonatomic, assign) BOOL isHealthMontior;

@property (nonatomic, assign) BOOL isSetBTName;

////  查找设备(0.支持 1.不支持）
@property (nonatomic, assign) BOOL isFindDevice;

@property (nonatomic, assign) BOOL isResetFactory;

@property (nonatomic, assign) BOOL isPowerOff;
@property (nonatomic, assign) BOOL isPushMsg;
@property (nonatomic, assign) BOOL isVideoHidBook;
@property (nonatomic, assign) BOOL isVideoHidMusic;
@property (nonatomic, assign) BOOL isChildAppSwitch;
@property (nonatomic, assign) BOOL isPushMsgEnableSwitch; //是否启用消息控制开关
@property (nonatomic, assign) UInt32 pushMsgSwitchValue;
/// 消息类型支持能力高32位，对应消息bit32-bit63
@property (nonatomic, assign) UInt32 pushMsgSwitchValue2;
@property (nonatomic, assign) BOOL isOpenWomenCare; //是否默认打开女性生理周期(之前默认是性别女才打开显示)
@property (nonatomic, assign) BOOL isAlarm; //是否显示设置闹钟
@property (nonatomic, assign) BOOL isBackLight; //是否支持屏幕睡眠时间设置/是否显示亮屏时长设置
@property (nonatomic, assign) BOOL isBackLightSleepMode; //是否支持屏幕睡眠时间设置/是否显示亮屏时长设置
@property (nonatomic, assign) BOOL isDefaultENSYSTEM; //默认显示英制;
@property (nonatomic, assign) BOOL isDefaultNoViewWorkout; //默认不显示多运动;
@property (nonatomic, assign) BOOL isSupportWorkout3; //戒指多运动;
@property (nonatomic, assign) BOOL isSupportRaisescreen; //默认不支持,支持抬腕亮屏;
@property (nonatomic, assign) BOOL isSupportFallDetect; //是否支持跌落提醒;
@property (nonatomic, assign) BOOL isSupportRecording; //是否支持录音功能;

@property (nonatomic, assign) BOOL isSupportAppStatus; //戒指App前后台指令是否支持;
@property (nonatomic, assign) BOOL isSupportMuslimCountSwitch; //戒指Muslim计数开关;
@property (nonatomic, assign) UInt8 isSupportHrSp02Alert; //是否支持HR,SP02报警提示功能
@property (nonatomic, assign) BOOL isSupportMotoVibrationLevel; //是否支持马达震动提醒
@property (nonatomic, assign) BOOL isSupportAlarmVibrationDuration; //是否支持闹钟震动时长设置
@property (nonatomic, assign) BOOL isSupportVibrationInterval; //是否支持震动间隔时长设置
@property (nonatomic, assign) BOOL isSupportCountReminder; //是否支持计数提醒间隔设置


//// 健康数据类
@property (nonatomic, assign) BOOL isDataTypeActivity;
@property (nonatomic, assign) BOOL isDataTypeHeart;
@property (nonatomic, assign) BOOL isDataTypeBloodPressure;
@property (nonatomic, assign) BOOL isDataTypeSleep;
@property (nonatomic, assign) BOOL isDataTypeWorkout;
@property (nonatomic, assign) BOOL isDataTypeSPO2;
@property (nonatomic, assign) BOOL isDataTypeHRV;
@property (nonatomic, assign) BOOL isDataTypeStress;
@property (nonatomic, assign) BOOL isDataTypeBloodSugar;
@property (nonatomic, assign) BOOL isDataTypeMuslimCount;
@property (nonatomic, assign) BOOL isDataTypeTemperature; //是否支持体温
/// 计步明细间隔，单位：分钟；旧设备或功能位未配置时为60
/// 当天计步明细间隔，单位：分钟；仅 BLE_KEY_ACTIVITY_CURRENT_DAY (0x051A) 使用
@property (nonatomic, assign) NSInteger activityDataInterval;

@property (nonatomic, assign) BOOL isSupportMuslimTimeDisplayMode; //是否支持Muslim时间显示模式
@property (nonatomic, assign) BOOL isSupportPPGMonitoring; //是否支持PPG定时监测
@property (nonatomic, assign) BOOL isSupportTemperatureMonitoring; //是否支持温度定时监测
@property (nonatomic, assign) BOOL isSupportSensorRawPPG; //是否支持获取PPG原始数据
@property (nonatomic, assign) BOOL isSupportSensorRawACC; //是否支持获取ACC原始数据
@property (nonatomic, assign) BOOL isSupportSensorRawPPGRed; //是否支持获取PPG Red原始数据
@property (nonatomic, assign) BOOL isSupportSensorRawIR; //是否支持获取红外IR原始数据
@property (nonatomic, assign) BOOL isSupportSensorRawSleep; //是否支持睡眠实时数据


@end

NS_ASSUME_NONNULL_END
