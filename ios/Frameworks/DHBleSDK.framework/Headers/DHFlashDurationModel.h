//
//  DHFlashDurationModel.h
//  DHSFit
//
//  Created by DHS on 2025/7/17.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHFlashDurationModel : NSObject
@property (nonatomic, assign) NSInteger goalFlashNum; //目标完成闪烁次数
@property (nonatomic, assign) NSInteger alarmFlashNum; //闹钟时闪烁次数
@end

NS_ASSUME_NONNULL_END
