//
//  DHLedLightSetModel.h
//  DHSFit
//
//  Created by DHS on 2025/2/22.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHLedLightSetModel : NSObject
/// 开关（0.关 1.开）
@property (nonatomic, assign) BOOL isOpen;
@property (nonatomic, assign) NSInteger lightLevel;

- (NSData *)valueWithJL;

@end

NS_ASSUME_NONNULL_END
