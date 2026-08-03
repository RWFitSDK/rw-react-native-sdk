//
//  DHAncsSetModel.h
//  DHBleSDK
//
//  Created by DHS on 2022/6/23.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DHAncsSetModel : NSObject

/// 来电（0.关 1.开）
@property (nonatomic, assign) BOOL isCall;
/// 短信
@property (nonatomic, assign) BOOL isSMS;
/// QQ
@property (nonatomic, assign) BOOL isQQ;
/// 微信
@property (nonatomic, assign) BOOL isWechat;
/// Whatsapp
@property (nonatomic, assign) BOOL isWhatsapp;
/// Messenger
@property (nonatomic, assign) BOOL isMessenger;
/// Twitter
@property (nonatomic, assign) BOOL isTwitter;
/// Linkedin
@property (nonatomic, assign) BOOL isLinkedin;

/// Instagram
@property (nonatomic, assign) BOOL isInstagram;
/// Facebook
@property (nonatomic, assign) BOOL isFacebook;
/// Line
@property (nonatomic, assign) BOOL isLine;
/// 企业微信
@property (nonatomic, assign) BOOL isWechatWork;
/// Dingding
@property (nonatomic, assign) BOOL isDingding;
/// Email
@property (nonatomic, assign) BOOL isEmail;
/// Calendar
@property (nonatomic, assign) BOOL isCalendar;
/// Viber
@property (nonatomic, assign) BOOL isViber;

/// Skype
@property (nonatomic, assign) BOOL isSkype;
/// Kakaotalk
@property (nonatomic, assign) BOOL isKakaotalk;
/// Tumblr
@property (nonatomic, assign) BOOL isTumblr;
/// Snapchat
@property (nonatomic, assign) BOOL isSnapchat;
/// Youtube
@property (nonatomic, assign) BOOL isYoutube;
/// Pinterset
@property (nonatomic, assign) BOOL isPinterset;
/// Tiktok
@property (nonatomic, assign) BOOL isTiktok;
/// Gmail
@property (nonatomic, assign) BOOL isGmail;


/// Sina weibo
@property (nonatomic, assign) BOOL isJLSinaWeiBo;

/// Band
@property (nonatomic, assign) BOOL isJLBand;

/// telegram
@property (nonatomic, assign) BOOL isJLTelegram;

/// between
@property (nonatomic, assign) BOOL isJLBetween;

/// Naver cafe
@property (nonatomic, assign) BOOL isJLNavercafe;


/// Net flix
@property (nonatomic, assign) BOOL isJLNetflix;

/// 俄罗斯 MAX软件
@property (nonatomic, assign) BOOL isMax;
/// VK Мессенджер
@property (nonatomic, assign) BOOL isVkim;

/// 其他
@property (nonatomic, assign) BOOL isOther;

- (NSData *)valueWithJL;

@end

NS_ASSUME_NONNULL_END
