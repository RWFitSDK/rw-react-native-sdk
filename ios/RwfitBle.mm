#import "RwfitBle.h"
#import <CoreBluetooth/CoreBluetooth.h>
#import <DHBleSDK/DHBleSDK.h>

typedef void (^FlutterResult)(id _Nullable result);

/** RWFIT BLE TurboModule (iOS). SDK 业务实现与 Flutter 桥保持一致。 */
@interface RwfitBle () <DHBleConnectDelegate>
@property (nonatomic, strong) DeviceFuncV2Model *deviceFuncModel;
@property (nonatomic, assign) BOOL scanning;
@property (nonatomic, assign) BOOL observersRegistered;
@property (nonatomic, strong) NSTimer *scanTimeoutTimer;
@property (nonatomic, assign) BOOL forwardHealthSyncEvents;
@property (nonatomic, strong) NSMutableDictionary<NSString *, DHPeripheralModel *> *discoveredDevices;
@end

@implementation RwfitBle

- (instancetype)init {
    self = [super init];
    if (self) {
        _discoveredDevices = [NSMutableDictionary dictionary];
        _forwardHealthSyncEvents = YES;
    }
    return self;
}

#pragma mark - 方法分发

- (void)dispatchMethod:(NSString *)m args:(NSDictionary *)rawArgs result:(FlutterResult)result {
    NSDictionary *args = [rawArgs isKindOfClass:[NSDictionary class]] ? rawArgs : @{};

    if ([m isEqualToString:@"initSDK"]) {
        [DHBleCentralManager setLogStatus:YES];
        [DHBleCentralManager initWithServiceUuids:@[]];
        [DHBleCentralManager shareInstance].connectDelegate = self;
        self.scanning = NO;
        self.forwardHealthSyncEvents = YES;
        self.discoveredDevices = [NSMutableDictionary dictionary];
        [self registerObserversIfNeeded];
        [self ok:result extra:nil];
    } else if ([m isEqualToString:@"getSDKVersion"]) {
        [self ok:result extra:@{@"version": [DHBleCommand getSDKVersion] ?: @""}];
    } else if ([m isEqualToString:@"getPluginVersion"]) {
        NSString *v = [NSString stringWithFormat:@"0.0.5_%@", [DHBleCommand getSDKVersion] ?: @""];
        [self ok:result extra:@{@"pluginVersion": v}];
    } else if ([m isEqualToString:@"isBleConnected"]) {
        [self ok:result extra:@{@"connected": @([DHBleCentralManager isConnected])}];
    } else if ([m isEqualToString:@"startScan"]) {
        [DHBleCentralManager shareInstance].connectDelegate = self;
        self.scanning = YES;
        [self.discoveredDevices removeAllObjects];
        [DHBleCentralManager startScan];
        [self cancelScanTimeout];
        self.scanTimeoutTimer = [NSTimer scheduledTimerWithTimeInterval:10.0
                                                                target:self
                                                              selector:@selector(scanDidTimeout:)
                                                              userInfo:nil
                                                               repeats:NO];
        [self ok:result extra:nil];
    } else if ([m isEqualToString:@"stopScan"]) {
        [self finishScanIfNeeded];
        [self ok:result extra:nil];
    } else if ([m isEqualToString:@"connectDevice"]) {
        [self connectDevice:args result:result];
    } else if ([m isEqualToString:@"disconnect"]) {
        [DHBleCentralManager disconnectDevice];
        [self ok:result extra:nil];
    } else if ([m isEqualToString:@"reconnectDevice"]) {
        [DHBleCentralManager shareInstance].connectDelegate = self;
        [DHBleCentralManager checkAndAutoReconnectDevice];
        [self ok:result extra:nil];
    } else if ([m isEqualToString:@"iOSSetBindedStatus"]) {
        [DHBleCentralManager setBindedStatus:[args[@"isBinded"] boolValue]];
        [self ok:result extra:nil];
    } else if ([m isEqualToString:@"getPower"]) {
        [DHBleCommand getBattery:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                DHBatteryInfoModel *model = data;
                [self ok:result extra:@{@"power": @([model battery])}];
            }];
        }];
    } else if ([m isEqualToString:@"getFirmwareVersion"]) {
        [DHBleCommand getFirmwareVersion:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                DHFirmwareVersionModel *model = data;
                [self ok:result extra:@{
                    @"deviceClazz": model.deviceModel ?: @"",
                    @"deviceNo": model.firmwareVersion ?: @"",
                    @"uiVersion": model.uiVersion ?: @""
                }];
            }];
        }];
    } else if ([m isEqualToString:@"setUserInfo"]) {
        DHUserInfoSetModel *model = [DHUserInfoSetModel new];
        model.gender = [args[@"gender"] integerValue];
        // iOS SDK 身高直接按 cm 编码；体重字段按 0.1 kg 编码。
        model.height = (NSInteger)round([args[@"height"] doubleValue]);
        model.weight = (NSInteger)round([args[@"weight"] doubleValue] * 10);
        model.age = [args[@"age"] integerValue];
        [DHBleCommand setUserInfo:model block:^(int code, id data) {
            [self simple:code result:result action:@"setUserInfo"];
        }];
    } else if ([m isEqualToString:@"setTimeFormat"]) {
        UInt8 format = [args[@"format"] unsignedCharValue];
        [DHBleCommand ringSetTimeformat:format block:^(int code, id data) {
            [self simple:code result:result action:@"setTimeFormat"];
        }];
    } else if ([m isEqualToString:@"getFunctionList"]) {
        NSDictionary *menu = self.deviceFuncModel ? [self supportMenuDictionary:self.deviceFuncModel] : @{};
        [self ok:result extra:@{@"supportMenu": menu}];
    } else if ([m isEqualToString:@"controlHealthData"]) {
        NSNumber *dataType = [self dataTypeFromControlKey:[self stringValue:args[@"key"]]];
        if (dataType == nil) {
            [self fail:result code:-1 msg:@"unsupported control key"];
        } else {
            NSInteger state = [args[@"state"] integerValue];
            [DHBleCommand controlOpen:state dataType:[dataType integerValue] block:^(int code, id data) {
                [self simple:code result:result action:@"controlHealthData"];
            }];
        }
    } else if ([m isEqualToString:@"controlFindDevice"]) {
        [DHBleCommand controlFindDeviceBegin:^(int code, id data) {}];
        [self ok:result extra:nil];
    } else if ([m isEqualToString:@"setPowerOff"]) {
        NSInteger type = [args[@"type"] integerValue];
        [DHBleCommand controlDevice:type block:^(int code, id data) {}];
        [self ok:result extra:nil];
    } else if ([m isEqualToString:@"ringOta"]) {
        NSData *fileData = [self fileDataFromOptions:args];
        if (fileData == nil) {
            [self fail:result code:-1 msg:@"ota file not found"];
        } else {
            [DHBleCommand ringOtaWithFileData:fileData block:^(int code, CGFloat progress, id data) {
                [self fire:@"rwfit:otaProgress" data:@{@"progress": @(progress)}];
                if (progress >= 1.0f && code == 0) {
                    [self fire:@"rwfit:otaFinish" data:@{}];
                } else if (code != 0) {
                    [self fire:@"rwfit:otaFinish" data:@{@"code": @(code)}];
                }
            }];
            [self ok:result extra:nil];
        }
    } else if ([m isEqualToString:@"pushMessage"]) {
        [self ok:result extra:nil]; // iOS 走系统 ANCS，主动推消息为 no-op
    } else if ([m isEqualToString:@"setRingBtName"]) {
        [DHBleCommand setRingBtName:[self stringValue:args[@"name"]] block:^(int code, id data) {
            [self simple:code result:result action:@"setRingBtName"];
        }];
    } else if ([m isEqualToString:@"getMuslimCountEnabled"]) {
        [DHBleCommand getMuslimCountSwitch:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                [self ok:result extra:@{@"enabled": @([data integerValue] == 1)}];
            }];
        }];
    } else if ([m isEqualToString:@"setMuslimCountEnabled"]) {
        UInt8 enabled = [args[@"enabled"] boolValue] ? 1 : 0;
        [DHBleCommand setMuslimCountSwitch:enabled block:^(int code, id data) {
            [self simple:code result:result action:@"setMuslimCountEnabled"];
        }];
    } else if ([m isEqualToString:@"getHeartRateAlert"]) {
        [DHBleCommand getHRAlert:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                DHHRAlertModel *model = data;
                NSMutableDictionary *config = [@{
                    @"isOpen": @(model.isOpen),
                    @"highThreshold": @(model.overValue)
                } mutableCopy];
                if (model.underValue != 0xff) {
                    config[@"lowThreshold"] = @(model.underValue);
                }
                [self ok:result extra:config];
            }];
        }];
    } else if ([m isEqualToString:@"setHeartRateAlert"]) {
        DHHRAlertModel *model = [DHHRAlertModel new];
        model.isOpen = [args[@"isOpen"] boolValue];
        model.overValue = [args[@"highThreshold"] integerValue];
        id lowThreshold = args[@"lowThreshold"];
        model.underValue = [lowThreshold respondsToSelector:@selector(integerValue)]
            ? [lowThreshold integerValue] : 0xff;
        [DHBleCommand setHRAlert:model block:^(int code, id data) {
            [self simple:code result:result action:@"setHeartRateAlert"];
        }];
    } else if ([m isEqualToString:@"getBloodOxygenAlert"]) {
        [DHBleCommand getSP02Alert:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                DHHRAlertModel *model = data;
                [self ok:result extra:@{
                    @"isOpen": @(model.isOpen),
                    @"lowThreshold": @(model.overValue)
                }];
            }];
        }];
    } else if ([m isEqualToString:@"setBloodOxygenAlert"]) {
        DHHRAlertModel *model = [DHHRAlertModel new];
        model.isOpen = [args[@"isOpen"] boolValue];
        model.overValue = [args[@"lowThreshold"] integerValue];
        model.underValue = 0xff;
        [DHBleCommand setSP02Alert:model block:^(int code, id data) {
            [self simple:code result:result action:@"setBloodOxygenAlert"];
        }];
    } else if ([m isEqualToString:@"getWorkoutState"]) {
        [DHBleCommand getControlSportWithRing:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                if (![data isKindOfClass:[NSDictionary class]]) {
                    [self fail:result code:-1 msg:@"getWorkoutState returned invalid data"];
                    return;
                }
                NSDictionary *state = (NSDictionary *)data;
                [self ok:result extra:@{
                    @"sportType": state[@"keySportType"] ?: @0,
                    @"controlType": state[@"keyControlType"] ?: @(-1)
                }];
            }];
        }];
    } else if ([m isEqualToString:@"controlWorkout"]) {
        NSInteger sportType = [args[@"sportType"] integerValue];
        if (sportType < 7 || sportType > 161) {
            [self fail:result code:-1 msg:@"sportType must be between 7 and 161"];
            return;
        }
        NSInteger controlType = [args[@"controlType"] integerValue];
        if (controlType < 1 || controlType > 4) {
            [self fail:result code:-1 msg:@"controlType must be between 1 and 4"];
            return;
        }
        DHSportControlModel *model = [DHSportControlModel new];
        model.sportType = sportType;
        model.controlType = (WorkoutControlType)controlType;
        [DHBleCommand controlSportWithRing:model block:^(int code, id data) {
            [self simple:code result:result action:@"controlWorkout"];
        }];
    } else if ([m isEqualToString:@"setWorkoutRealtimeEnabled"]) {
        UInt8 enabled = [args[@"enabled"] boolValue] ? 1 : 0;
        [DHBleCommand setRingEnterWorkOut:enabled block:^(int code, id data) {
            [self simple:code result:result action:@"setWorkoutRealtimeEnabled"];
        }];
    } else if ([m isEqualToString:@"getWorkoutReports"]) {
        [self getWorkoutReports:result];
    } else if ([m isEqualToString:@"syncAllHealthData"]) {
        [self startHealthSync:result];
    } else if ([m isEqualToString:@"removeHealthDataCallback"]) {
        self.forwardHealthSyncEvents = NO;
        [self ok:result extra:nil];
    } else if ([m isEqualToString:@"unbind"]) {
        [DHBleCentralManager setBindedStatus:NO];
        [DHBleCentralManager disconnectDevice];
        [self ok:result extra:nil];
    } else if ([m isEqualToString:@"controlTakePhoto"]) {
        [DHBleCommand controlCamera:[args[@"state"] integerValue] block:^(int code, id data) {
            [self simple:code result:result action:@"controlTakePhoto"];
        }];
    } else if ([m isEqualToString:@"controlPhone"]) {
        // iOS SDK 未暴露来电控制命令；系统通话控制由 iOS 自身处理。
        [self ok:result extra:nil];
    }
    // ---- 全天检测（8 项）----
    else if ([m isEqualToString:@"getTimedHeartRate"]) { [self timedGet:@"hr" result:result]; }
    else if ([m isEqualToString:@"setTimedHeartRate"]) { [self timedSet:@"hr" args:args result:result]; }
    else if ([m isEqualToString:@"getTimedBloodOxygen"]) { [self timedGet:@"bo" result:result]; }
    else if ([m isEqualToString:@"setTimedBloodOxygen"]) { [self timedSet:@"bo" args:args result:result]; }
    else if ([m isEqualToString:@"getTimedHRV"]) { [self timedGet:@"hrv" result:result]; }
    else if ([m isEqualToString:@"setTimedHRV"]) { [self timedSet:@"hrv" args:args result:result]; }
    else if ([m isEqualToString:@"getTimedStress"]) { [self timedGet:@"stress" result:result]; }
    else if ([m isEqualToString:@"setTimedStress"]) { [self timedSet:@"stress" args:args result:result]; }
    else if ([m isEqualToString:@"getTimedBloodSugar"]) { [self timedGet:@"sugar" result:result]; }
    else if ([m isEqualToString:@"setTimedBloodSugar"]) { [self timedSet:@"sugar" args:args result:result]; }
    else if ([m isEqualToString:@"getTimedBloodPressure"]) { [self timedGet:@"bp" result:result]; }
    else if ([m isEqualToString:@"setTimedBloodPressure"]) { [self timedSet:@"bp" args:args result:result]; }
    else if ([m isEqualToString:@"getTimedBodyTemperature"]) { [self timedGet:@"temp" result:result]; }
    else if ([m isEqualToString:@"setTimedBodyTemperature"]) { [self timedSet:@"temp" args:args result:result]; }
    else if ([m isEqualToString:@"getTimedPPG"]) { [self timedGet:@"ppg" result:result]; }
    else if ([m isEqualToString:@"setTimedPPG"]) { [self timedSet:@"ppg" args:args result:result]; }
    // ---- 闹钟 ----
    else if ([m isEqualToString:@"getAlarm"]) {
        [DHBleCommand getAlarms:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                NSMutableArray *alarms = [NSMutableArray array];
                for (DHAlarmSetModel *item in (NSArray *)data) [alarms addObject:[self alarmDictionary:item]];
                [self ok:result extra:@{@"data": alarms}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setAlarm"]) {
        NSMutableArray *alarms = [NSMutableArray array];
        for (NSDictionary *item in (NSArray *)args[@"alarms"]) {
            DHAlarmSetModel *model = [DHAlarmSetModel new];
            model.isOpen = [item[@"isOpen"] boolValue];
            model.hour = [item[@"startHour"] integerValue];
            model.minute = [item[@"startMin"] integerValue];
            model.jlAlarmId = [item[@"alarmId"] unsignedCharValue];
            model.repeats = item[@"repeats"] ?: @[@0, @0, @0, @0, @0, @0, @0];
            [alarms addObject:model];
        }
        [DHBleCommand setAlarms:alarms block:^(int code, id data) {
            [self simple:code result:result action:@"setAlarm"];
        }];
    }
    else if ([m isEqualToString:@"deleteAllAlarm"]) {
        [DHBleCommand setAlarms:@[] block:^(int code, id data) {
            [self simple:code result:result action:@"deleteAllAlarm"];
        }];
    }
    // ---- 屏幕 ----
    else if ([m isEqualToString:@"getRaiseBrightScreen"]) {
        [DHBleCommand ringGetGesture:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                DHGestureSetModel *md = data;
                [self ok:result extra:@{@"isOpen": @([md isOpen]), @"startHour": @([md startHour]),
                    @"startMin": @([md startMinute]), @"endHour": @([md endHour]), @"endMin": @([md endMinute])}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setRaiseBrightScreen"]) {
        DHGestureSetModel *md = [DHGestureSetModel new];
        md.isOpen = [args[@"isOpen"] boolValue];
        md.startHour = [args[@"startHour"] integerValue];
        md.startMinute = [args[@"startMin"] integerValue];
        md.endHour = [args[@"endHour"] integerValue];
        md.endMinute = [args[@"endMin"] integerValue];
        [DHBleCommand ringSetGesture:md block:^(int code, id data) {
            [self simple:code result:result action:@"setRaiseBrightScreen"];
        }];
    }
    else if ([m isEqualToString:@"getBrightScreenTime"]) {
        [DHBleCommand getBrightTime:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                DHBrightTimeSetModel *md = data;
                [self ok:result extra:@{@"timeSecond": @([md duration])}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setBrightScreenTime"]) {
        DHBrightTimeSetModel *md = [DHBrightTimeSetModel new];
        md.duration = [args[@"timeSecond"] integerValue];
        [DHBleCommand setBrightTime:md block:^(int code, id data) {
            [self simple:code result:result action:@"setBrightScreenTime"];
        }];
    }
    else if ([m isEqualToString:@"getBrightScreenSleepTime"]) {
        [DHBleCommand getDisplaySleepMode:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                DHBrightTimeSetModel *md = data;
                [self ok:result extra:@{@"isOpen": @([md sleepOpen]), @"startHour": @([md sleepStartHour]),
                    @"startMin": @([md sleepStartMin]), @"endHour": @([md sleepEndHour]), @"endMin": @([md sleepEndMin])}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setBrightScreenSleepTime"]) {
        DHBrightTimeSetModel *md = [DHBrightTimeSetModel new];
        md.sleepOpen = [args[@"isOpen"] boolValue];
        md.sleepStartHour = [args[@"startHour"] integerValue];
        md.sleepStartMin = [args[@"startMin"] integerValue];
        md.sleepEndHour = [args[@"endHour"] integerValue];
        md.sleepEndMin = [args[@"endMin"] integerValue];
        [DHBleCommand setDisplaySleepMode:md block:^(int code, id data) {
            [self simple:code result:result action:@"setBrightScreenSleepTime"];
        }];
    }
    else if ([m isEqualToString:@"getRingLedLevel"]) {
        [DHBleCommand getRingLEDLight:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{ [self ok:result extra:[self ledDictionary:data]]; }];
        }];
    }
    else if ([m isEqualToString:@"setRingLedLevel"]) {
        DHLedLightSetModel *md = [DHLedLightSetModel new];
        md.isOpen = [args[@"isOpen"] boolValue];
        md.lightLevel = [args[@"lcdLevel"] integerValue];
        [DHBleCommand setRingLEDLight:md block:^(int code, id data) {
            [self simple:code result:result action:@"setRingLedLevel"];
        }];
    }
    // ---- 视频 HID ----
    else if ([m isEqualToString:@"getVideoHid"]) {
        [DHBleCommand getVideoHid:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                DHVideoHidSetModel *md = data;
                [self ok:result extra:@{@"hidOpen": @([md isOpen])}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setVideoHid"]) {
        DHVideoHidSetModel *md = [DHVideoHidSetModel new];
        md.isOpen = [args[@"hidOpen"] intValue];
        [DHBleCommand setVideoHid:md block:^(int code, id data) {
            [self simple:code result:result action:@"setVideoHid"];
        }];
    }
    // ---- 佩戴方向 ----
    else if ([m isEqualToString:@"getRingWearDir"]) {
        [DHBleCommand getRingWearHand:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                [self ok:result extra:@{@"isRight": @([data integerValue] == 1)}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setRingWearHand"]) {
        UInt8 hand = [args[@"isRight"] boolValue] ? 1 : 0;
        [DHBleCommand setRingWearHand:hand block:^(int code, id data) {
            [self simple:code result:result action:@"setRingWearHand"];
        }];
    }
    // ---- 振动 ----
    else if ([m isEqualToString:@"getVibrationCount"]) {
        [DHBleCommand getRingMotorLevel:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                DHVibrationLevelModel *md = data;
                [self ok:result extra:@{@"count": @([md vibrationNumber]), @"level": @([md vibrationLevel])}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setVibrationCount"]) {
        [DHBleCommand setRingMotorLevel:[args[@"level"] integerValue] motorNum:[args[@"count"] integerValue] block:^(int code, id data) {
            [self simple:code result:result action:@"setVibrationCount"];
        }];
    }
    else if ([m isEqualToString:@"getAlarmVibrationDuration"]) {
        [DHBleCommand getAlarmVibrationDuration:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                [self ok:result extra:@{@"duration": @([data integerValue])}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setAlarmVibrationDuration"]) {
        [DHBleCommand setAlarmVibrationDuration:[args[@"duration"] unsignedCharValue] block:^(int code, id data) {
            [self simple:code result:result action:@"setAlarmVibrationDuration"];
        }];
    }
    else if ([m isEqualToString:@"getVibrationInterval"]) {
        [DHBleCommand getVibrationInterval:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                [self ok:result extra:@{@"intervalMs": @([data integerValue])}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setVibrationInterval"]) {
        [DHBleCommand setVibrationInterval:[args[@"intervalMs"] unsignedShortValue] block:^(int code, id data) {
            [self simple:code result:result action:@"setVibrationInterval"];
        }];
    }
    else if ([m isEqualToString:@"startHeartRateCalibration"]) {
        __block BOOL replied = NO;
        [DHBleCommand startFactoryTest:0x15 block:^(int code, id data) {
            if (code != 0) {
                if (!replied) {
                    replied = YES;
                    [self fail:result code:code msg:@"startHeartRateCalibration failed"];
                }
                return;
            }
            if ([data isKindOfClass:[NSDictionary class]]) {
                NSDictionary *factoryResult = (NSDictionary *)data;
                [self fire:@"rwfit:heartRateCalibration" data:@{
                    @"testMode": factoryResult[@"testMode"] ?: @0,
                    @"result": factoryResult[@"result"] ?: @0
                }];
            }
            if (!replied) {
                replied = YES;
                [self ok:result extra:nil];
            }
        }];
    }
    else if ([m isEqualToString:@"getFallDetect"]) {
        [DHBleCommand getFallDetect:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                [self ok:result extra:@{@"enabled": @([data integerValue] == 1)}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setFallDetect"]) {
        UInt8 enabled = [args[@"enabled"] boolValue] ? 1 : 0;
        [DHBleCommand setFallDetect:enabled block:^(int code, id data) {
            [self simple:code result:result action:@"setFallDetect"];
        }];
    }
    else if ([m isEqualToString:@"getCountReminderInterval"]) {
        [DHBleCommand getCountReminderInterval:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                [self ok:result extra:@{@"intervalMinutes": @([data integerValue])}];
            }];
        }];
    }
    else if ([m isEqualToString:@"setCountReminderInterval"]) {
        [DHBleCommand setCountReminderInterval:[args[@"intervalMinutes"] unsignedCharValue] block:^(int code, id data) {
            [self simple:code result:result action:@"setCountReminderInterval"];
        }];
    }
    // ---- 传感器原始数据 ----
    else if ([m isEqualToString:@"controlSensorRaw"]) {
        UInt8 outputType = [args[@"enabled"] boolValue] ? 1 : 2;
        UInt8 sensorType = [args[@"sensorType"] unsignedCharValue];
        [DHBleCommand ringControlSensorRaw:outputType type:sensorType block:^(int code, id data) {
            [self simple:code result:result action:@"controlSensorRaw"];
        }];
    }
    else if ([m isEqualToString:@"getSensorRawHistory"]) {
        [self getSensorRawHistory:result];
    }
    // ---- 通知开关（iOS 专用 ANCS）----
    else if ([m isEqualToString:@"setNotificationSwitch"]) {
        DHAncsSetModel *md = [DHAncsSetModel new];
        for (NSString *key in [args allKeys]) {
            id value = args[key];
            if (![value respondsToSelector:@selector(boolValue)]) continue;
            @try { [md setValue:@([value boolValue]) forKey:key]; } @catch (NSException *e) { (void)e; }
        }
        [DHBleCommand ringSetAncs:md block:^(int code, id data) {
            [self simple:code result:result action:@"setNotificationSwitch"];
        }];
    }
    else if ([m isEqualToString:@"getNotificationSwitch"]) {
        [DHBleCommand ringGetAncs:^(int code, id data) {
            [self handleCode:code result:result successBlock:^{
                [self ok:result extra:@{@"switches": [self switchesDictFromAncs:data]}];
            }];
        }];
    }
    // ---- Android 专用，iOS no-op ----
    else if ([m isEqualToString:@"createOrRemoveBond"]) {
        [self ok:result extra:@{@"result": @NO}]; // iOS 无蓝牙 HID 配对概念
    }
    else {
        [self fail:result code:-1 msg:@"native method is not implemented"];
    }
}

#pragma mark - Codegen 方法外壳

#define RWFIT_METHOD0(name) \
- (void)name:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { \
    (void)reject; [self dispatchMethod:@#name args:@{} result:resolve]; \
}
#define RWFIT_METHOD1(name) \
- (void)name:(NSDictionary *)args resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { \
    (void)reject; [self dispatchMethod:@#name args:args result:resolve]; \
}

RWFIT_METHOD0(initSDK)
RWFIT_METHOD0(getSDKVersion)
RWFIT_METHOD0(getPluginVersion)
RWFIT_METHOD0(isBleConnected)
RWFIT_METHOD0(startScan)
RWFIT_METHOD0(stopScan)
RWFIT_METHOD1(connectDevice)
RWFIT_METHOD1(reconnectDevice)
RWFIT_METHOD0(disconnect)
RWFIT_METHOD1(iOSSetBindedStatus)
RWFIT_METHOD0(getPower)
RWFIT_METHOD0(getFirmwareVersion)
RWFIT_METHOD1(setUserInfo)
RWFIT_METHOD1(setTimeFormat)
RWFIT_METHOD0(getFunctionList)
RWFIT_METHOD1(setRingBtName)
RWFIT_METHOD0(getTimedHeartRate)
RWFIT_METHOD1(setTimedHeartRate)
RWFIT_METHOD0(getTimedBloodOxygen)
RWFIT_METHOD1(setTimedBloodOxygen)
RWFIT_METHOD0(getTimedHRV)
RWFIT_METHOD1(setTimedHRV)
RWFIT_METHOD0(getTimedStress)
RWFIT_METHOD1(setTimedStress)
RWFIT_METHOD0(getTimedBloodSugar)
RWFIT_METHOD1(setTimedBloodSugar)
RWFIT_METHOD0(getTimedBloodPressure)
RWFIT_METHOD1(setTimedBloodPressure)
RWFIT_METHOD0(getTimedBodyTemperature)
RWFIT_METHOD1(setTimedBodyTemperature)
RWFIT_METHOD0(getTimedPPG)
RWFIT_METHOD1(setTimedPPG)
RWFIT_METHOD1(controlHealthData)
RWFIT_METHOD0(getWorkoutState)
RWFIT_METHOD1(controlWorkout)
RWFIT_METHOD1(setWorkoutRealtimeEnabled)
RWFIT_METHOD0(getWorkoutReports)
RWFIT_METHOD0(controlFindDevice)
RWFIT_METHOD1(setPowerOff)
RWFIT_METHOD1(controlTakePhoto)
RWFIT_METHOD1(controlPhone)
RWFIT_METHOD0(getMuslimCountEnabled)
RWFIT_METHOD1(setMuslimCountEnabled)
RWFIT_METHOD0(getHeartRateAlert)
RWFIT_METHOD1(setHeartRateAlert)
RWFIT_METHOD0(getBloodOxygenAlert)
RWFIT_METHOD1(setBloodOxygenAlert)
RWFIT_METHOD0(getVibrationInterval)
RWFIT_METHOD1(setVibrationInterval)
RWFIT_METHOD0(startHeartRateCalibration)
RWFIT_METHOD0(getFallDetect)
RWFIT_METHOD1(setFallDetect)
RWFIT_METHOD0(getCountReminderInterval)
RWFIT_METHOD1(setCountReminderInterval)
RWFIT_METHOD1(controlSensorRaw)
RWFIT_METHOD0(getSensorRawHistory)
RWFIT_METHOD0(getAlarm)
RWFIT_METHOD1(setAlarm)
RWFIT_METHOD0(deleteAllAlarm)
RWFIT_METHOD0(getRaiseBrightScreen)
RWFIT_METHOD1(setRaiseBrightScreen)
RWFIT_METHOD0(getBrightScreenTime)
RWFIT_METHOD1(setBrightScreenTime)
RWFIT_METHOD0(getBrightScreenSleepTime)
RWFIT_METHOD1(setBrightScreenSleepTime)
RWFIT_METHOD0(getRingLedLevel)
RWFIT_METHOD1(setRingLedLevel)
RWFIT_METHOD0(getVideoHid)
RWFIT_METHOD1(setVideoHid)
RWFIT_METHOD1(createOrRemoveBond)
RWFIT_METHOD0(getRingWearDir)
RWFIT_METHOD1(setRingWearHand)
RWFIT_METHOD0(getVibrationCount)
RWFIT_METHOD1(setVibrationCount)
RWFIT_METHOD0(getAlarmVibrationDuration)
RWFIT_METHOD1(setAlarmVibrationDuration)
RWFIT_METHOD0(syncAllHealthData)
RWFIT_METHOD0(removeHealthDataCallback)
RWFIT_METHOD1(ringOta)
RWFIT_METHOD0(unbind)
RWFIT_METHOD1(pushMessage)
RWFIT_METHOD1(setNotificationSwitch)
RWFIT_METHOD0(getNotificationSwitch)

#undef RWFIT_METHOD0
#undef RWFIT_METHOD1

- (void)connectDevice:(NSDictionary *)args result:(FlutterResult)result {
    self.scanning = NO;
    [self cancelScanTimeout];
    [DHBleCentralManager stopScan];
    NSString *mac = [self stringValue:args[@"mac"]];
    NSString *uuid = [self stringValue:args[@"uuid"]];
    DHPeripheralModel *model = [self cachedPeripheralForMac:mac uuid:uuid];
    if (model == nil) {
        [self fail:result code:-1 msg:@"device not in scan cache; call startScan() first, or use reconnectDevice()"];
        return;
    }
    [DHBleCentralManager shareInstance].connectDelegate = self;
    [self fire:@"rwfit:connectState" data:@{
        @"state": @"connecting",
        @"name": model.name ?: @"",
        @"mac": model.macAddr ?: @"",
        @"uuid": model.uuid ?: @""
    }];
    [DHBleCentralManager connectDeviceWithModel:model];
    [self ok:result extra:nil];
}

#pragma mark - DHBleConnectDelegate（事件源）

- (void)centralManagerDidDiscoverPeripheral:(NSArray<DHPeripheralModel *> *)peripherals {
    if (!self.scanning) return;
    for (DHPeripheralModel *item in peripherals) {
        [self cachePeripheral:item];
        [self fire:@"rwfit:scanResult" data:@{
            @"name": item.name ?: @"",
            @"mac": item.macAddr ?: @"",
            @"uuid": item.uuid ?: @"",
            @"rssi": @(-labs(item.rssi))
        }];
    }
}

- (void)centralManagerDidConnectPeripheral:(CBPeripheral *)peripheral {
    self.scanning = NO;
    [self cancelScanTimeout];
    [self fire:@"rwfit:connectState" data:[self connectStatePayload:@"connected" peripheral:peripheral extra:nil]];
}

- (void)centralManagerDidFunctionMenu:(DeviceFuncV2Model *)deviceFuncModel peripheral:(DHPeripheralModel *)peripheral {
    self.deviceFuncModel = deviceFuncModel;
    [self fire:@"rwfit:functionMenu" data:@{
        @"state": @"ready",
        @"name": peripheral.name ?: @"",
        @"mac": peripheral.macAddr ?: @"",
        @"uuid": peripheral.uuid ?: @"",
        @"supportMenu": [self supportMenuDictionary:deviceFuncModel]
    }];
}

- (void)centralManagerDidDisconnectPeripheral:(CBPeripheral *)peripheral {
    self.scanning = NO;
    [self cancelScanTimeout];
    [self fire:@"rwfit:connectState" data:[self connectStatePayload:@"disconnected" peripheral:peripheral extra:nil]];
}

- (void)centralManagerDidFailedPeripheral:(CBPeripheral *)peripheral {
    self.scanning = NO;
    [self cancelScanTimeout];
    [self fire:@"rwfit:connectState" data:[self connectStatePayload:@"failed" peripheral:peripheral extra:@{@"reason": @"unknown"}]];
}

#pragma mark - 事件转发

- (void)fire:(NSString *)name data:(NSDictionary *)data {
    NSMutableDictionary *d = data ? [data mutableCopy] : [NSMutableDictionary dictionary];
    d[@"event"] = name;
    dispatch_async(dispatch_get_main_queue(), ^{
        if ([name isEqualToString:@"rwfit:scanResult"]) [self emitOnScanResult:d];
        else if ([name isEqualToString:@"rwfit:scanFinish"]) [self emitOnScanFinish:d];
        else if ([name isEqualToString:@"rwfit:connectState"]) [self emitOnConnectState:d];
        else if ([name isEqualToString:@"rwfit:functionMenu"]) [self emitOnFunctionMenu:d];
        else if ([name isEqualToString:@"rwfit:healthData"]) [self emitOnHealthData:d];
        else if ([name isEqualToString:@"rwfit:realtimeMeasureComplete"]) [self emitOnRealtimeMeasureComplete:d];
        else if ([name isEqualToString:@"rwfit:workoutRealtimeData"]) [self emitOnWorkoutRealtimeData:d];
        else if ([name isEqualToString:@"rwfit:syncProgress"]) [self emitOnSyncProgress:d];
        else if ([name isEqualToString:@"rwfit:syncResult"]) [self emitOnSyncResult:d];
        else if ([name isEqualToString:@"rwfit:syncFinish"]) [self emitOnSyncFinish:d];
        else if ([name isEqualToString:@"rwfit:syncError"]) [self emitOnSyncError:d];
        else if ([name isEqualToString:@"rwfit:otaProgress"]) [self emitOnOtaProgress:d];
        else if ([name isEqualToString:@"rwfit:otaFinish"]) [self emitOnOtaFinish:d];
        else if ([name isEqualToString:@"rwfit:touchEvent"]) [self emitOnTouchEvent:d];
        else if ([name isEqualToString:@"rwfit:callControl"]) [self emitOnCallControl:d];
        else if ([name isEqualToString:@"rwfit:healthAlert"]) [self emitOnHealthAlert:d];
        else if ([name isEqualToString:@"rwfit:heartRateCalibration"]) [self emitOnHeartRateCalibration:d];
        else if ([name isEqualToString:@"rwfit:sensorRawData"]) [self emitOnSensorRawData:d];
        else if ([name isEqualToString:@"rwfit:sensorRawStopped"]) [self emitOnSensorRawStopped:d];
    });
}

#pragma mark - 结果回传（失败也走 success 回 {code,msg}，对齐 Dart callAsync 契约）

- (void)ok:(FlutterResult)result extra:(NSDictionary *)extra {
    NSMutableDictionary *r = [@{@"code": @0, @"msg": @"success"} mutableCopy];
    if (extra) [r addEntriesFromDictionary:extra];
    dispatch_async(dispatch_get_main_queue(), ^{ result(r); });
}

- (void)fail:(FlutterResult)result code:(NSInteger)code msg:(NSString *)msg {
    dispatch_async(dispatch_get_main_queue(), ^{
        result(@{@"code": @(code), @"msg": msg ?: @"error"});
    });
}

- (void)handleCode:(int)code result:(FlutterResult)result successBlock:(void (^)(void))successBlock {
    if (code == 0) {
        successBlock();
    } else {
        [self fail:result code:code msg:@"native call failed"];
    }
}

- (void)simple:(int)code result:(FlutterResult)result action:(NSString *)action {
    if (code == 0) {
        [self ok:result extra:nil];
    } else {
        [self fail:result code:code msg:[NSString stringWithFormat:@"%@ failed", action]];
    }
}

- (NSNumber *)dataTypeFromControlKey:(NSString *)key {
    static NSDictionary *mapping;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        mapping = @{
            @"JL_HR_DATA_TRANSFER_KEY": @(BLE_KEY_HEART_RATE),
            @"JL_BO_DATA_TRANSFER_KEY": @(BLE_KEY_BLOOD_OXYGEN),
            @"JL_HRV_DATA_TRANSFER_KEY": @(BLE_KEY_HRV),
            @"JL_PRESSURE_DATA_TRANSFER_KEY": @(BLE_KEY_STRESS),
            @"JL_BLOODSUGAR_DATA_TRANSFER_KEY": @(BLE_KEY_BLOOD_SUGAR),
            @"JL_BP_DATA_TRANSFER_KEY": @(BLE_KEY_BLOOD_PRESSURE),
            @"JL_TEMP_DATA_TRANSFER_KEY": @(BLE_KEY_TEMPERATURE)
        };
    });
    return mapping[key];
}

- (NSData *)fileDataFromOptions:(NSDictionary *)options {
    NSString *path = [self stringValue:options[@"path"]];
    if ([path hasPrefix:@"file://"]) {
        path = [[NSURL URLWithString:path] path];
    }
    if (path.length == 0) return nil;
    return [NSData dataWithContentsOfFile:path];
}

#pragma mark - 实时 / 拍照 通知观察者

- (void)registerObserversIfNeeded {
    if (self.observersRegistered) return;
    NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
    [center addObserver:self selector:@selector(handleMeasureValue:)
                   name:BluetoothNotificationHealthRingMeasureValueChange object:nil];
    [center addObserver:self selector:@selector(handleMeasureState:)
                   name:BluetoothNotificationHealthRingMeasureStateChange object:nil];
    [center addObserver:self selector:@selector(handleCameraTakePicture:)
                   name:BluetoothNotificationCameraTakePicture object:nil];
    [center addObserver:self selector:@selector(handleWorkoutRealtimeData:)
                   name:BluetoothNotificationRingRuningData object:nil];
    [center addObserver:self selector:@selector(handleTouchEvent:)
                   name:BluetoothNotificationTouchEvent object:nil];
    [center addObserver:self selector:@selector(handleSensorRawData:)
                   name:BluetoothNotificationSensorRawData object:nil];
    [center addObserver:self selector:@selector(handleSensorRawStopped:)
                   name:BluetoothNotificationHealthRingSenorStopChange object:nil];
    [center addObserver:self selector:@selector(handleHealthAlert:)
                   name:BluetoothNotificationRingHealthOverAlert object:nil];
    self.observersRegistered = YES;
}

- (void)handleMeasureState:(NSNotification *)notification {
    NSNumber *ringMeasure = [notification.userInfo[@"ringMeasure"] isKindOfClass:[NSNumber class]]
        ? notification.userInfo[@"ringMeasure"] : nil;
    if (ringMeasure != nil && [ringMeasure integerValue] == 0) {
        [self fire:@"rwfit:realtimeMeasureComplete" data:@{}];
    }
}

- (void)handleMeasureValue:(NSNotification *)notification {
    NSDictionary *userInfo = notification.userInfo ?: @{};
    NSInteger iosType = [userInfo[@"dataType"] integerValue];
    NSInteger dataType;
    switch (iosType) {
        case BLE_KEY_APP_REAL_TIME_HR_DATA:           dataType = 1;  break;
        case BLE_KEY_APP_REAL_TIME_BLOOD_OXYGEN_DATA: dataType = 3;  break;
        case BLE_KEY_APP_REAL_TIME_BP_DATA:           dataType = 4;  break;
        case BLE_KEY_APP_REAL_TIME_STRESS_DATA:       dataType = 8;  break;
        case BLE_KEY_APP_REAL_BLOOD_SUGAR_DATA:       dataType = 9;  break;
        case BLE_KEY_APP_REAL_TIME_MUSLIM_COUNT:      dataType = 10; break;
        case BLE_KEY_APP_REAL_TIME_TEMPERATURE_DATA:  dataType = 11; break;
        case BLE_KEY_APP_REAL_TIME_HRV_DATA:          dataType = 13; break;
        default: return;
    }
    NSMutableDictionary *event = [NSMutableDictionary dictionary];
    event[@"dataType"] = @(dataType);
    NSNumber *timestamp = [userInfo[@"timestamp"] isKindOfClass:[NSNumber class]]
        ? userInfo[@"timestamp"] : nil;
    event[@"time"] = timestamp ?: @((long long)[[NSDate date] timeIntervalSince1970]);
    if (dataType == 4) {
        event[@"dataValue"] = userInfo[@"systolic"] ?: @0;
        event[@"diastolic"] = userInfo[@"diastolic"] ?: @0;
    } else if (dataType == 11) {
        event[@"dataValue"] = @([userInfo[@"dataValue"] doubleValue] / 10.0);
    } else {
        event[@"dataValue"] = userInfo[@"dataValue"] ?: @0;
    }
    [self fire:@"rwfit:healthData" data:event];
}

- (void)handleCameraTakePicture:(NSNotification *)notification {
    [self fire:@"rwfit:touchEvent" data:@{@"keyType": @0, @"touchType": @0, @"action": @"cameraTakePicture"}];
}

- (void)handleWorkoutRealtimeData:(NSNotification *)notification {
    NSDictionary *data = notification.userInfo ?: @{};
    [self fire:@"rwfit:workoutRealtimeData" data:@{
        @"duration": data[@"ActivityTime"] ?: @0,
        @"steps": data[@"ActivitySteps"] ?: @0,
        @"distance": data[@"ActivityDistance"] ?: @0,
        @"calorie": data[@"ActivityCalorie"] ?: @0,
        @"heartRate": data[@"ActivityHr"] ?: @0,
        // 对 Flutter 固定为统一的实时运动数据类型；原生 key 仅供 iOS 内部判断。
        @"dataType": @(0x0223)
    }];
}

- (void)handleTouchEvent:(NSNotification *)notification {
    NSDictionary *data = notification.userInfo ?: @{};
    NSInteger keyType = [data[@"keyType"] integerValue];
    NSInteger touchType = [data[@"touchType"] integerValue];
    [self fire:@"rwfit:touchEvent" data:@{
        @"keyType": @(keyType),
        @"touchType": @(touchType),
        @"action": [self touchActionForKeyType:keyType touchType:touchType]
    }];
}

- (void)handleSensorRawData:(NSNotification *)notification {
    [self fire:@"rwfit:sensorRawData" data:[self sensorRawDictionary:notification.userInfo ?: @{}]];
}

- (void)handleSensorRawStopped:(NSNotification *)notification {
    // iOS 原生通知不携带停止原因；统一结构中 0 表示未知。
    [self fire:@"rwfit:sensorRawStopped" data:@{@"reason": @0}];
}

- (void)handleHealthAlert:(NSNotification *)notification {
    NSDictionary *data = notification.userInfo ?: @{};
    [self fire:@"rwfit:healthAlert" data:@{
        @"type": data[@"type"] ?: @(-1),
        @"value": data[@"value"] ?: @0
    }];
}

- (void)invalidate {
    [self cancelScanTimeout];
    if (self.observersRegistered) {
        [[NSNotificationCenter defaultCenter] removeObserver:self];
        self.observersRegistered = NO;
    }
    self.scanning = NO;
    self.forwardHealthSyncEvents = NO;
    [self.discoveredDevices removeAllObjects];
    if ([DHBleCentralManager shareInstance].connectDelegate == self) {
        [DHBleCentralManager shareInstance].connectDelegate = nil;
    }
}

- (void)dealloc {
    [self invalidate];
}

#pragma mark - 全天检测（8 项共用）

- (void)modeReply:(int)code data:(id)data result:(FlutterResult)result {
    [self handleCode:code result:result successBlock:^{
        [self ok:result extra:@{
            @"isOpen": @([[data valueForKey:@"isOpen"] boolValue]),
            @"duration": [data valueForKey:@"interval"] ?: @0,
            @"startHour": @0,
            @"startMin": @0,
            @"endHour": @23,
            @"endMin": @59
        }];
    }];
}

- (void)fillTimedModel:(id)model args:(NSDictionary *)args {
    [model setValue:@([args[@"isOpen"] boolValue]) forKey:@"isOpen"];
    // 全天检测协议固定为 00:00–23:59，不透传调用方自定义时段。
    [model setValue:@0 forKey:@"startHour"];
    [model setValue:@0 forKey:@"startMinute"];
    [model setValue:@23 forKey:@"endHour"];
    [model setValue:@59 forKey:@"endMinute"];
    [model setValue:@([args[@"duration"] integerValue]) forKey:@"interval"];
}

- (void)timedGet:(NSString *)type result:(FlutterResult)result {
    void (^blk)(int, id) = ^(int code, id data) { [self modeReply:code data:data result:result]; };
    if ([type isEqualToString:@"hr"]) { [DHBleCommand getHeartRateMode:blk]; }
    else if ([type isEqualToString:@"bo"]) { [DHBleCommand getBoMode:blk]; }
    else if ([type isEqualToString:@"hrv"]) { [DHBleCommand getHrvMode:blk]; }
    else if ([type isEqualToString:@"stress"]) { [DHBleCommand getStressMode:blk]; }
    else if ([type isEqualToString:@"sugar"]) { [DHBleCommand getBloodSugarMode:blk]; }
    else if ([type isEqualToString:@"bp"]) { [DHBleCommand getBpMode:blk]; }
    else if ([type isEqualToString:@"temp"]) { [DHBleCommand getTimedBodyTemperature:blk]; }
    else if ([type isEqualToString:@"ppg"]) { [DHBleCommand getPPGMode:blk]; }
}

- (void)timedSet:(NSString *)type args:(NSDictionary *)args result:(FlutterResult)result {
    void (^blk)(int, id) = ^(int code, id data) { [self simple:code result:result action:@"setTimed"]; };
    if ([type isEqualToString:@"hr"]) {
        DHHeartRateModeSetModel *md = [DHHeartRateModeSetModel new]; [self fillTimedModel:md args:args];
        [DHBleCommand setHeartRateMode:md block:blk];
    } else if ([type isEqualToString:@"bo"]) {
        DHBoModeSetModel *md = [DHBoModeSetModel new]; [self fillTimedModel:md args:args];
        [DHBleCommand setBoMode:md block:blk];
    } else if ([type isEqualToString:@"hrv"]) {
        DHHrvModeSetModel *md = [DHHrvModeSetModel new]; [self fillTimedModel:md args:args];
        [DHBleCommand setHrvMode:md block:blk];
    } else if ([type isEqualToString:@"stress"]) {
        DHStressModeSetModel *md = [DHStressModeSetModel new]; [self fillTimedModel:md args:args];
        [DHBleCommand setStressMode:md block:blk];
    } else if ([type isEqualToString:@"sugar"]) {
        DHBloodSugarModeSetModel *md = [DHBloodSugarModeSetModel new]; [self fillTimedModel:md args:args];
        [DHBleCommand setBloodSugarMode:md block:blk];
    } else if ([type isEqualToString:@"bp"]) {
        DHBpModeSetModel *md = [DHBpModeSetModel new]; [self fillTimedModel:md args:args];
        [DHBleCommand setBpMode:md block:blk];
    } else if ([type isEqualToString:@"temp"]) {
        DHHeartRateModeSetModel *md = [DHHeartRateModeSetModel new]; [self fillTimedModel:md args:args];
        [DHBleCommand setTimedBodyTemperature:md block:blk];
    } else if ([type isEqualToString:@"ppg"]) {
        DHHrvModeSetModel *md = [DHHrvModeSetModel new]; [self fillTimedModel:md args:args];
        [DHBleCommand setPPGMode:md block:blk];
    }
}

#pragma mark - payload 字典

- (NSDictionary *)alarmDictionary:(DHAlarmSetModel *)item {
    return @{
        @"alarmId": @([item jlAlarmId]),
        @"startHour": @([item hour]),
        @"startMin": @([item minute]),
        @"isOpen": @([item isOpen]),
        @"repeats": item.repeats ?: @[]
    };
}

- (NSDictionary *)ledDictionary:(DHLedLightSetModel *)model {
    return @{@"isOpen": @([model isOpen]), @"lcdLevel": @([model lightLevel])};
}

- (NSString *)touchActionForKeyType:(NSInteger)keyType touchType:(NSInteger)touchType {
    if (keyType == 2) return @"fallDetected";
    if (keyType != 1) return @"unknown";
    switch (touchType) {
        case 1: return @"singleTap";
        case 2: return @"doubleTap";
        case 3: return @"tripleTap";
        case 4: return @"longPress";
        case 5: return @"swing";
        default: return @"unknown";
    }
}

- (NSArray *)arrayValue:(id)value {
    return [value isKindOfClass:[NSArray class]] ? value : @[];
}

- (NSDictionary *)sensorRawDictionary:(NSDictionary *)raw {
    NSNumber *type = raw[@"sensorType"] ?: raw[@"type"] ?: @(-1);
    NSMutableDictionary *packet = [@{
        @"type": type,
        @"ppg": [self arrayValue:raw[@"ppgData"]],
        @"acc": [self arrayValue:raw[@"accData"]],
        @"ppgRed": [self arrayValue:raw[@"ppgRedData"]],
        @"ir": [self arrayValue:raw[@"irData"]],
        @"sleep": @[]
    } mutableCopy];
    if (raw[@"sequence"] != nil) packet[@"sequence"] = raw[@"sequence"];
    if (raw[@"timestamp"] != nil) packet[@"timestampSec"] = raw[@"timestamp"];

    NSMutableArray *sleep = [NSMutableArray array];
    for (id item in [self arrayValue:raw[@"sleepData"]]) {
        if (![item isKindOfClass:[NSDictionary class]]) continue;
        NSDictionary *sample = (NSDictionary *)item;
        [sleep addObject:@{
            @"timestampSec": sample[@"timestamp"] ?: sample[@"timestampSec"] ?: @0,
            @"mode": sample[@"mode"] ?: @0
        }];
    }
    packet[@"sleep"] = sleep;
    return packet;
}

#pragma mark - 多运动报告

- (void)getWorkoutReports:(FlutterResult)result {
    __block NSMutableArray *reports = [NSMutableArray array];
    __block BOOL replied = NO;
    [DHBleCommand startRingWorkout3Syncing:^(int code, id data) {
        if (replied) return;
        replied = YES;
        if (code == 0) {
            [self ok:result extra:@{@"data": reports}];
        } else {
            [self fail:result code:code msg:@"getWorkoutReports failed"];
        }
    } dataBlock:^(int code, int progress, id data) {
        if (replied) return;
        if (code != 0) {
            replied = YES;
            [self fail:result code:code msg:@"getWorkoutReports failed"];
            return;
        }
        if (![data isKindOfClass:[NSArray class]]) return;
        for (id item in (NSArray *)data) {
            if ([item isKindOfClass:[DHDailySportModel class]]) {
                [reports addObject:[self workoutReportDictionary:(DHDailySportModel *)item]];
            }
        }
    }];
}

- (void)getSensorRawHistory:(FlutterResult)result {
    __block NSMutableArray *packets = [NSMutableArray array];
    __block BOOL replied = NO;
    [DHBleCommand ringGetHistorySensorRaw:^(int code, id data) {
        if (replied) return;
        replied = YES;
        if (code == 0) {
            [self ok:result extra:@{@"data": packets}];
        } else {
            [self fail:result code:code msg:@"getSensorRawHistory failed"];
        }
    } dataBlock:^(int code, int progress, id data) {
        (void)progress;
        if (replied) return;
        if (code != 0) {
            replied = YES;
            [self fail:result code:code msg:@"getSensorRawHistory failed"];
            return;
        }
        if (![data isKindOfClass:[NSArray class]]) return;
        for (id item in (NSArray *)data) {
            if ([item isKindOfClass:[NSDictionary class]]) {
                [packets addObject:[self sensorRawDictionary:(NSDictionary *)item]];
            }
        }
    }];
}

- (NSDictionary *)workoutReportDictionary:(DHDailySportModel *)model {
    long long startTime = [model.timestamp longLongValue];
    long long endTime = startTime > 0 ? startTime + model.duration : 0;
    NSString *date = model.date.length > 0 ? model.date : [self workoutDateFromTimestamp:startTime];
    return @{
        @"startTime": @(startTime),
        @"endTime": @(endTime),
        @"date": date ?: @"",
        @"sportType": @(model.type),
        @"duration": @(model.duration),
        @"step": @(model.step),
        @"distance": @(model.distance),
        @"calorie": @(model.calorie),
        @"height": @(model.sportHeight),
        @"pressure": @(model.sportPress),
        @"cadence": @(model.sportStepFreq),
        @"speed": @((double)model.sportSpeed),
        @"pace": @(model.pace),
        @"averageHeartRate": @(model.heartAve),
        @"maxHeartRate": @(model.heartMax),
        @"minHeartRate": @(model.heartMin),
        @"maxCadence": @(model.maxStepFreq),
        @"minCadence": @(model.minStepFreq),
        @"maxPace": @(model.sportMaxPace),
        @"minPace": @(model.sportMinPace),
        @"heartRateCount": @(model.sportHeartNum),
        @"viewType": @(model.viewType),
        @"heartRateItems": [self workoutValueItems:model.heartRateItems],
        @"pacePerKmItems": [self workoutValueItems:model.pacePerKmItems]
    };
}

- (NSArray *)workoutValueItems:(NSArray *)rawItems {
    if (![rawItems isKindOfClass:[NSArray class]]) return @[];
    NSMutableArray *items = [NSMutableArray array];
    NSInteger fallbackIndex = 0;
    for (id raw in rawItems) {
        if ([raw isKindOfClass:[NSDictionary class]]) {
            NSDictionary *item = (NSDictionary *)raw;
            [items addObject:@{
                @"index": item[@"index"] ?: @(fallbackIndex),
                @"value": item[@"value"] ?: @0
            }];
        } else if ([raw respondsToSelector:@selector(integerValue)]) {
            [items addObject:@{@"index": @(fallbackIndex), @"value": @([raw integerValue])}];
        }
        fallbackIndex++;
    }
    return items;
}

- (NSString *)workoutDateFromTimestamp:(long long)timestamp {
    if (timestamp <= 0) return @"";
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    formatter.locale = [NSLocale localeWithLocaleIdentifier:@"en_US_POSIX"];
    formatter.dateFormat = @"yyyyMMdd";
    return [formatter stringFromDate:[NSDate dateWithTimeIntervalSince1970:timestamp]];
}

#pragma mark - 健康数据同步

- (void)startHealthSync:(FlutterResult)result {
    self.forwardHealthSyncEvents = YES;
    [DHBleCommand startDataSyncing:^(int code, id data) {
        if (!self.forwardHealthSyncEvents) return;
        if (code == 0) {
            // Android 原生仅在同步完成时回调 progress=100。iOS dataBlock 的
            // progress 是数据类型区分码，不能作为百分比透传；完成时统一发 100。
            [self fire:@"rwfit:syncProgress" data:@{@"progress": @100}];
            [self fire:@"rwfit:syncFinish" data:@{}];
        } else {
            [self fire:@"rwfit:syncError" data:@{@"code": @(code)}];
        }
    } datablcok:^(int code, int progress, id data) {
        if (!self.forwardHealthSyncEvents) return;
        if (code != 0) {
            [self fire:@"rwfit:syncError" data:@{@"code": @(code)}];
            return;
        }
        if ([data isKindOfClass:[NSArray class]]) {
            NSDictionary *grouped = [self groupedSyncPayload:(NSArray *)data];
            for (NSString *type in grouped) {
                [self fire:@"rwfit:syncResult" data:@{@"type": type, @"data": grouped[type]}];
            }
        }
    }];
    [self ok:result extra:nil];
}

- (NSDictionary *)groupedSyncPayload:(NSArray *)items {
    NSMutableDictionary *result = [NSMutableDictionary dictionary];
    for (id model in items) {
        NSString *type = nil;
        NSDictionary *dict = [self syncDictFromModel:model outType:&type];
        if (type.length == 0 || dict == nil) continue;
        NSMutableArray *bucket = result[type];
        if (bucket == nil) { bucket = [NSMutableArray array]; result[type] = bucket; }
        [bucket addObject:dict];
    }
    return result;
}

- (NSDictionary *)syncDictFromModel:(id)model outType:(NSString **)outType {
    if (model == nil) return nil;
    if ([model isKindOfClass:NSClassFromString(@"DHDailyStepModel")])        { *outType = @"step";        return [self stepDictFromModel:model]; }
    if ([model isKindOfClass:NSClassFromString(@"DHDailySleepModel")])       { *outType = @"sleep";       return [self sleepDictFromModel:model]; }
    if ([model isKindOfClass:NSClassFromString(@"DHDailyHrModel")])          { *outType = @"hr";          return [self dayDictFromModel:model itemKey:@"hr"]; }
    if ([model isKindOfClass:NSClassFromString(@"DHDailyBoModel")])          { *outType = @"bo";          return [self dayDictFromModel:model itemKey:@"bloodOxy"]; }
    if ([model isKindOfClass:NSClassFromString(@"DHDailyHrvModel")])         { *outType = @"hrv";         return [self dayDictFromModel:model itemKey:@"hrv"]; }
    if ([model isKindOfClass:NSClassFromString(@"DHDailyPressureModel")])    { *outType = @"pressure";    return [self dayDictFromModel:model itemKey:@"pressure"]; }
    if ([model isKindOfClass:NSClassFromString(@"DHDailyBloodSugarModel")])  { *outType = @"bloodSugar";  return [self dayDictFromModel:model itemKey:@"bloodSugar"]; }
    if ([model isKindOfClass:NSClassFromString(@"DHDailyTempModel")])        { *outType = @"temp";        return [self dayDictFromModel:model itemKey:@"temp"]; }
    if ([model isKindOfClass:NSClassFromString(@"DHDailyBpModel")])          { *outType = @"bp";          return [self bpDictFromModel:model]; }
    if ([model isKindOfClass:NSClassFromString(@"DHDailyMuslimCountModel")]) { *outType = @"muslimCount"; return [self muslimDictFromModel:model]; }
    return nil;
}

- (NSNumber *)numberFromTimestamp:(id)value {
    if ([value isKindOfClass:[NSNumber class]]) return value;
    if ([value isKindOfClass:[NSString class]]) return @([(NSString *)value longLongValue]);
    return @0;
}

- (NSNumber *)numberFromMeasurement:(id)value {
    if ([value isKindOfClass:[NSNumber class]]) return value;
    if ([value isKindOfClass:[NSString class]]) return @([(NSString *)value doubleValue]);
    return @0;
}

- (NSDictionary *)stepDictFromModel:(id)model {
    NSArray *rawItems = [model valueForKey:@"items"];
    if (![rawItems isKindOfClass:[NSArray class]]) rawItems = @[];
    NSMutableArray *items = [NSMutableArray array];
    for (NSDictionary *it in rawItems) {
        if (![it isKindOfClass:[NSDictionary class]]) continue;
        [items addObject:@{@"time": [self numberFromTimestamp:it[@"timestamp"]],
            @"index": it[@"index"] ?: @0, @"steps": it[@"step"] ?: @0,
            @"calorie": it[@"calorie"] ?: @0, @"distance": it[@"distance"] ?: @0}];
    }
    return @{@"time": [self numberFromTimestamp:[model valueForKey:@"timestamp"]],
        @"date": [self stringValue:[model valueForKey:@"date"]],
        @"totalSteps": @([[model valueForKey:@"step"] integerValue]),
        @"totalCalorie": @([[model valueForKey:@"calorie"] integerValue]),
        @"totalDistance": @([[model valueForKey:@"distance"] integerValue]),
        @"activityDataInterval": @([[model valueForKey:@"activityDataInterval"] integerValue]),
        @"items": items};
}

- (NSDictionary *)sleepDictFromModel:(id)model {
    NSArray *rawItems = [model valueForKey:@"items"];
    if (![rawItems isKindOfClass:[NSArray class]]) rawItems = @[];
    NSMutableArray *items = [NSMutableArray array];
    for (NSDictionary *it in rawItems) {
        if (![it isKindOfClass:[NSDictionary class]]) continue;
        [items addObject:@{@"len": it[@"value"] ?: @0, @"sleepType": it[@"status"] ?: @0}];
    }
    return @{@"time": [self numberFromTimestamp:[model valueForKey:@"timestamp"]],
        @"date": [self stringValue:[model valueForKey:@"date"]],
        @"duration": @([[model valueForKey:@"duration"] integerValue]),
        @"beginTime": [self numberFromTimestamp:[model valueForKey:@"beginTime"]],
        @"endTime": [self numberFromTimestamp:[model valueForKey:@"endTime"]], @"items": items};
}

- (NSDictionary *)dayDictFromModel:(id)model itemKey:(NSString *)itemKey {
    NSArray *rawItems = [model valueForKey:@"items"];
    if (![rawItems isKindOfClass:[NSArray class]]) rawItems = @[];
    NSMutableArray *items = [NSMutableArray array];
    for (NSDictionary *it in rawItems) {
        if (![it isKindOfClass:[NSDictionary class]]) continue;
        [items addObject:@{@"time": [self numberFromTimestamp:it[@"timestamp"]],
            itemKey: [self numberFromMeasurement:it[@"value"]]}];
    }
    return @{@"time": [self numberFromTimestamp:[model valueForKey:@"timestamp"]],
        @"date": [self stringValue:[model valueForKey:@"date"]], @"items": items};
}

- (NSDictionary *)bpDictFromModel:(id)model {
    NSArray *rawItems = [model valueForKey:@"items"];
    if (![rawItems isKindOfClass:[NSArray class]]) rawItems = @[];
    NSMutableArray *items = [NSMutableArray array];
    for (NSDictionary *it in rawItems) {
        if (![it isKindOfClass:[NSDictionary class]]) continue;
        [items addObject:@{@"time": [self numberFromTimestamp:it[@"timestamp"]],
            @"systolic": it[@"systolic"] ?: @0, @"diastolic": it[@"diastolic"] ?: @0}];
    }
    return @{@"time": [self numberFromTimestamp:[model valueForKey:@"timestamp"]],
        @"date": [self stringValue:[model valueForKey:@"date"]], @"items": items};
}

- (NSDictionary *)muslimDictFromModel:(id)model {
    NSArray *rawItems = [model valueForKey:@"items"];
    if (![rawItems isKindOfClass:[NSArray class]]) rawItems = @[];
    NSMutableArray *items = [NSMutableArray array];
    for (NSDictionary *it in rawItems) {
        if (![it isKindOfClass:[NSDictionary class]]) continue;
        [items addObject:@{@"time": [self numberFromTimestamp:it[@"timestamp"]], @"count": it[@"value"] ?: @0}];
    }
    return @{@"time": [self numberFromTimestamp:[model valueForKey:@"timestamp"]],
        @"date": [self stringValue:[model valueForKey:@"date"]],
        @"totalCount": @([[model valueForKey:@"muslimcount"] integerValue]), @"items": items};
}

- (NSDictionary *)switchesDictFromAncs:(DHAncsSetModel *)model {
    if (![model isKindOfClass:[DHAncsSetModel class]]) return @{};
    return @{
        @"isCall": @(model.isCall), @"isSMS": @(model.isSMS), @"isQQ": @(model.isQQ),
        @"isWechat": @(model.isWechat), @"isWhatsapp": @(model.isWhatsapp), @"isMessenger": @(model.isMessenger),
        @"isTwitter": @(model.isTwitter), @"isLinkedin": @(model.isLinkedin), @"isInstagram": @(model.isInstagram),
        @"isFacebook": @(model.isFacebook), @"isLine": @(model.isLine), @"isWechatWork": @(model.isWechatWork),
        @"isDingding": @(model.isDingding), @"isEmail": @(model.isEmail), @"isCalendar": @(model.isCalendar),
        @"isViber": @(model.isViber), @"isSkype": @(model.isSkype), @"isKakaotalk": @(model.isKakaotalk),
        @"isTumblr": @(model.isTumblr), @"isSnapchat": @(model.isSnapchat), @"isYoutube": @(model.isYoutube),
        @"isPinterset": @(model.isPinterset), @"isTiktok": @(model.isTiktok), @"isGmail": @(model.isGmail),
        @"isJLSinaWeiBo": @(model.isJLSinaWeiBo), @"isJLBand": @(model.isJLBand), @"isJLTelegram": @(model.isJLTelegram),
        @"isJLBetween": @(model.isJLBetween), @"isJLNavercafe": @(model.isJLNavercafe), @"isJLNetflix": @(model.isJLNetflix),
        @"isMax": @(model.isMax), @"isVkim": @(model.isVkim), @"isOther": @(model.isOther)
    };
}

#pragma mark - 扫描缓存 / payload 工具

- (NSString *)stringValue:(id)value {
    return [value isKindOfClass:[NSString class]] ? value : @"";
}

- (void)cachePeripheral:(DHPeripheralModel *)model {
    if (model == nil) return;
    if (model.uuid.length > 0) {
        self.discoveredDevices[[NSString stringWithFormat:@"uuid:%@", model.uuid]] = model;
    }
    if (model.macAddr.length > 0) {
        self.discoveredDevices[[NSString stringWithFormat:@"mac:%@", model.macAddr]] = model;
    }
}

- (DHPeripheralModel *)cachedPeripheralForMac:(NSString *)mac uuid:(NSString *)uuid {
    if (uuid.length > 0) {
        DHPeripheralModel *model = self.discoveredDevices[[NSString stringWithFormat:@"uuid:%@", uuid]];
        if (model != nil) return model;
    }
    if (mac.length > 0) {
        DHPeripheralModel *model = self.discoveredDevices[[NSString stringWithFormat:@"mac:%@", mac]];
        if (model != nil) return model;
    }
    return nil;
}

- (NSDictionary *)connectStatePayload:(NSString *)state peripheral:(CBPeripheral *)peripheral extra:(NSDictionary *)extra {
    DHPeripheralModel *cached = nil;
    NSString *cbUuid = peripheral.identifier.UUIDString;
    if (cbUuid.length > 0) {
        cached = self.discoveredDevices[[NSString stringWithFormat:@"uuid:%@", cbUuid]];
    }
    NSMutableDictionary *payload = [@{
        @"state": state,
        @"name":  peripheral.name ?: cached.name ?: @"",
        @"mac":   cached.macAddr ?: @"",
        @"uuid":  cached.uuid ?: cbUuid ?: @""
    } mutableCopy];
    if (extra) [payload addEntriesFromDictionary:extra];
    return payload;
}

- (NSDictionary *)supportMenuDictionary:(DeviceFuncV2Model *)model {
    NSInteger activityDataInterval = model.activityDataInterval > 0 ? model.activityDataInterval : 60;
    // Flutter 两端统一暴露 HR 与 SpO2 两个独立能力字段。iOS SDK 当前仅
    // 提供一个合并开关，因此先把同一个值分别赋给两个字段；以后原生提供
    // 独立能力时，只需替换各自来源，不改变 Flutter 契约。
    BOOL supportsHrSpO2Alert = model.isSupportHrSp02Alert != 0;
    BOOL supportsHrReminder = supportsHrSpO2Alert;
    BOOL supportsBoReminder = supportsHrSpO2Alert;
    return @{
        @"isPushMsgEnableSwitch": @([model isPushMsgEnableSwitch]),
        @"pushMsgSwitchValue": @(model.pushMsgSwitchValue),
        @"pushMsgSwitchValue2": @(model.pushMsgSwitchValue2),
        @"activityDataInterval": @(activityDataInterval),
        @"isAlarm": @([model isAlarm]),
        @"isBrightScreenSleepTime": @([model isBackLightSleepMode]),
        @"isBrightScreenTime": @([model isBackLight]),
        @"isSupportWorkout": @([model isSupportWorkout3]),
        @"isRememberSwitch": @([model isSupportMuslimCountSwitch]),
        @"isSupportHrReminder": @(supportsHrReminder),
        @"isSupportBoReminder": @(supportsBoReminder),
        @"isSupportMotoVibrationLevel": @([model isSupportMotoVibrationLevel]),
        @"isSupportAlarmVibrationDuration": @([model isSupportAlarmVibrationDuration]),
        @"isSupportVibrationInterval": @([model isSupportVibrationInterval]),
        @"isStep": @([model isDataTypeActivity]),
        @"isSleep": @([model isDataTypeSleep]),
        @"isHr": @([model isDataTypeHeart]),
        @"isBloodOxy": @([model isDataTypeSPO2]),
        @"isBloodPress": @([model isDataTypeBloodPressure]),
        @"isBloodSugar": @([model isDataTypeBloodSugar]),
        @"isHrv": @([model isDataTypeHRV]),
        @"isPressure": @([model isDataTypeStress]),
        @"isMuslimCountData": @([model isDataTypeMuslimCount]),
        @"isBodyTemp": @([model isDataTypeTemperature]),
        @"isSupportMuslimTimeDisplayMode": @([model isSupportMuslimTimeDisplayMode]),
        @"isSupportSensorRawPPG": @([model isSupportSensorRawPPG]),
        @"isSupportPPGMonitoring": @([model isSupportPPGMonitoring]),
        @"isSupportTemperatureMonitoring": @([model isSupportTemperatureMonitoring]),
        @"isSupportCountReminder": @([model isSupportCountReminder]),
        @"isSupportSensorRawACC": @([model isSupportSensorRawACC]),
        @"isSupportSensorRawPPGRed": @([model isSupportSensorRawPPGRed]),
        @"isSupportSensorRawIR": @([model isSupportSensorRawIR]),
        @"isSupportSensorRawSleep": @([model isSupportSensorRawSleep]),
        @"isSupportFallDetect": @([model isSupportFallDetect]),
        @"isSupportRecording": @([model isSupportRecording]),
        @"isFindDevice": @([model isFindDevice]),
        @"isTakePhoto": @([model isTakePhoto]),
        @"isLedLight": @([model isLEDLight]),
        @"isWearDirection": @([model isWearDir]),
        @"isVideoHid": @([model isVideoHid]),
        @"isVideoHidBook": @([model isVideoHidBook]),
        @"isVideoHidMusic": @([model isVideoHidMusic]),
        @"isRaiseBrightScreen": @([model isSupportRaisescreen]),
        @"isPowerOff": @([model isPowerOff]),
        @"isFactoryReset": @([model isResetFactory]),
        @"isPushMessage": @([model isPushMsg])
    };
}

#pragma mark - 扫描超时

- (void)cancelScanTimeout {
    [self.scanTimeoutTimer invalidate];
    self.scanTimeoutTimer = nil;
}

- (void)scanDidTimeout:(NSTimer *)timer {
    (void)timer;
    [self finishScanIfNeeded];
}

- (void)finishScanIfNeeded {
    if (!self.scanning) {
        [self cancelScanTimeout];
        return;
    }
    self.scanning = NO;
    [self cancelScanTimeout];
    [DHBleCentralManager stopScan];
    [self fire:@"rwfit:scanFinish" data:@{}];
}

+ (NSString *)moduleName {
    return @"RwfitBle";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeRwfitBleSpecJSI>(params);
}

@end
