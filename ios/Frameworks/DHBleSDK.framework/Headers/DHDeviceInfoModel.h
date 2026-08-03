//
//  DHDeviceInfoModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/28.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHDeviceInfoModel : NSObject

/// MAC地址 例：FF:FF:FF:FF:FF:FF
@property (nonatomic, copy) NSString *macAddr;
/// 名字
@property (nonatomic, copy) NSString *name;

@end

NS_ASSUME_NONNULL_END
