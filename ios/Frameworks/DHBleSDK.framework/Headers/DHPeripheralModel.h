//
//  DHPeripheralModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>
#import <CoreBluetooth/CoreBluetooth.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHPeripheralModel : NSObject

/// 外围设备
@property (nonatomic,strong) CBPeripheral *peripheral;
/// MAC地址
@property (nonatomic,strong) NSString *macAddr;
/// UUID
@property (nonatomic,strong) NSString *uuid;
/// 设备名
@property (nonatomic,strong) NSString *name;
/// 信号强度（0-255 数值越小距离越近）
@property (nonatomic,assign) NSInteger rssi;
/// 设备型号(从广播包解析)
@property (nonatomic,strong) NSString *deviceModel;

@end

NS_ASSUME_NONNULL_END
