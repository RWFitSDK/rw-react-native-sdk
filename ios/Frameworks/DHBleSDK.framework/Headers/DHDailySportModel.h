//
//  DHDailySportModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHDailySportModel : NSObject

/// 时间戳（秒）Timestamp (seconds)
@property (nonatomic, copy) NSString *timestamp;
/// 日期yyyyMMdd
@property (nonatomic, copy) NSString *date;
@property (nonatomic, assign) NSInteger type;
/// 时长（秒）Duration (seconds)
@property (nonatomic, assign) NSInteger duration;
/// 里程（米）Distance (meters)
@property (nonatomic, assign) NSInteger distance;
/// 消耗（卡路里）Calories burned
@property (nonatomic, assign) NSInteger calorie;
/// 步数（步）Number of steps
@property (nonatomic, assign) NSInteger step;
/// 高度 Height
@property (nonatomic, assign) NSInteger sportHeight;
/// 气压 air pressure
@property (nonatomic, assign) NSInteger sportPress;
/// 步频 stride frequency
@property (nonatomic, assign) NSInteger sportStepFreq;
/// 速度 Speed
@property (nonatomic, assign) CGFloat sportSpeed;
/// 配速 Pace
@property (nonatomic, assign) NSInteger pace;
/// 最大心率 Maximum heart rate
@property (nonatomic, assign) NSInteger heartMax;
/// 最小心率 Minimum heart rate
@property (nonatomic, assign) NSInteger heartMin;
/// 平均心率 Average heart rate
@property (nonatomic, assign) NSInteger heartAve;

@property (nonatomic, assign) NSInteger viewType;
/// 最大步频 Maximum stride frequency
@property (nonatomic, assign) NSInteger maxStepFreq;
/// 最小步频 Minimum step frequency
@property (nonatomic, assign) NSInteger minStepFreq;
/// 最大配速 Maximum pace
@property (nonatomic, assign) NSInteger sportMaxPace;
/// 最小配速 Minimum pace
@property (nonatomic, assign) NSInteger sportMinPace;

/// 心率项 例：@[@{@"index":@0,@"value":@80},...]
/// index（时间间隔（秒））value（心率值）
@property (nonatomic,strong) NSArray <NSDictionary *>*heartRateItems;

/// 每公里配速项 例：@[@{@"index":@1,@"value":@300},...]
/// index（第几公里,从1开始）value（配速,单位秒/公里）
@property (nonatomic,strong) NSArray <NSDictionary *>*pacePerKmItems;

@property (nonatomic, assign) NSInteger sportHeartNum;


///是否有步频
///Does it measure cadence?
- (BOOL)viewTypeHaveStepFaq:(NSInteger)viewType;

///是否无步数
///Is there no step count?
- (BOOL)viewTypeNoStepNum:(NSInteger)viewType;

///是否有配速
///Is pacing available?
- (BOOL)viewTypeHavePace:(NSInteger)viewType;

///是否无距离
///Is there no distance?
- (BOOL)viewTypeNoDistance:(NSInteger)viewType;

@end

NS_ASSUME_NONNULL_END
