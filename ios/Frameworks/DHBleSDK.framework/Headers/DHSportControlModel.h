//
//  DHSportControlModel.h
//  DHBleSDK
//
//  Created by DHS on 2023/1/9.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef enum : NSUInteger {
    Workout_Begin = 0x01,
    Workout_Continue = 0x02,
    Workout_Pause = 0x03,
    Workout_Finish = 0x04
} WorkoutControlType;

@interface DHSportControlModel : NSObject

//0x01开始 0x03暂停 0x02继续 0x04结束
@property (nonatomic, assign) WorkoutControlType controlType;
@property (nonatomic, assign) NSInteger sportType;


- (NSData *)valueWithRing;

@end

NS_ASSUME_NONNULL_END
