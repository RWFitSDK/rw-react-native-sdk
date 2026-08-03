//
//  DHAckModel.h
//  DHSFit
//
//  Created by DHS on 2025/12/19.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// 戒指不带数据的结果返回类
@interface DHAckModel : NSObject
@property (nonatomic, assign) NSInteger ackErrorCode;

+ (DHAckModel *)createAckModel:(NSInteger)errorCode;

@end

NS_ASSUME_NONNULL_END
