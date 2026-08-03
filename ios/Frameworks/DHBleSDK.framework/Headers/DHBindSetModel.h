//
//  DHBindSetModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/28.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHBindSetModel : NSObject
/// 是否绑定（0.否 1.是）
@property (nonatomic, assign) BOOL isBind;
/// 绑定平台（0.未知 1.Android  2.iOS）
@property (nonatomic, assign) NSInteger bindOS;
/// 用户ID
@property (nonatomic, copy) NSString *userId;
///杰里协议用户ID;
@property (nonatomic, assign) UInt32 userIDJL;

- (NSData *)valueWithJL;

@end

NS_ASSUME_NONNULL_END
