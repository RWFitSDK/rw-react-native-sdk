//
//  DHBleConnectDelegate.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>
#import <DHBleSDK/DHPeripheralModel.h>
#import <DHBleSDK/DeviceFuncV2Model.h>

NS_ASSUME_NONNULL_BEGIN

@protocol DHBleConnectDelegate <NSObject>

@optional

/// 搜索到设备
/// @param peripherals 设备列表
- (void)centralManagerDidDiscoverPeripheral:(NSArray <DHPeripheralModel *>*)peripherals;

/// 连接成功
/// @param peripheral 设备
- (void)centralManagerDidConnectPeripheral:(CBPeripheral *)peripheral;

/// 配置表获取成功
/// @param deviceFuncModel 设备
- (void)centralManagerDidFunctionMenu:(DeviceFuncV2Model *)deviceFuncModel peripheral:(DHPeripheralModel *)peripheral;

/// 断开连接
/// @param peripheral 设备
- (void)centralManagerDidDisconnectPeripheral:(CBPeripheral *)peripheral;

/// 连接失败
/// @param peripheral 设备
- (void)centralManagerDidFailedPeripheral:(CBPeripheral *)peripheral;

/// 蓝牙开关状态更新
/// @param isOn 状态
- (void)centralManagerDidUpdateState:(BOOL)isOn;

@end

NS_ASSUME_NONNULL_END
