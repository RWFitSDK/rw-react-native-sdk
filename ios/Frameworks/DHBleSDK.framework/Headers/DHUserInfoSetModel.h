//
//  DHUserInfoSetModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHUserInfoSetModel : NSObject

/// 性别（0.女 1.男）
@property (nonatomic, assign) NSInteger gender;
/// 年龄 例：25
@property (nonatomic, assign) NSInteger age;
/// 身高（厘米）
@property (nonatomic, assign) NSInteger height;
/// 体重（公斤）
@property (nonatomic, assign) NSInteger weight;
/// 步数目标（步）
@property (nonatomic, assign) NSInteger stepGoal;


- (NSData *)valueWithJL;

@end

NS_ASSUME_NONNULL_END
