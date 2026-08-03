//
//  DHVideoHidSetModel.h
//  DHSFit
//
//  Created by DHS on 2025/2/12.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHVideoHidSetModel : NSObject

/// 开关（0.关 1.开）2 电子书 3 音乐
@property (nonatomic, assign) int isOpen;

@property (nonatomic, assign) BOOL isDefaultOpen;

- (NSData *)valueWithJL;

@end

NS_ASSUME_NONNULL_END
