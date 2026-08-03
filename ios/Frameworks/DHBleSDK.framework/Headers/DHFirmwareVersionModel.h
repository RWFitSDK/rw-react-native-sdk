//
//  DHFirmwareVersionModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/28.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHFirmwareVersionModel : NSObject

/// 固件版本 例：1.0.0
@property (nonatomic, copy) NSString *firmwareVersion;
/// 设备型号 例：DW01
@property (nonatomic, copy) NSString *deviceModel;

@property (nonatomic, copy) NSString *uiVersion; //UI版本号


@end

NS_ASSUME_NONNULL_END
