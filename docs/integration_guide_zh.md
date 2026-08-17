# RWFIT 戒指 React Native SDK —— 集成文档

---

## 1. 简介

本文面向 App 开发者，说明如何在 React Native 项目中集成
`react-native-rwfit-ble`，并完成“初始化 → 扫描 → 连接 → 等待设备就绪 → 调用业务接口”的流程。
可运行代码见仓库内的 `example/`。

### 1.1 适用平台与版本

| 项目 | 说明 |
|---|---|
| 当前组件版本 | `0.0.5` |
| 原生 SDK 版本 | Android/iOS 均为 `RW_SDK_V2.0.0_20260724` |
| React Native | `0.86.x`，仅支持 New Architecture / TurboModule |
| Node.js | `22.11.0+` |
| Android | minSdk 26，compileSdk 36 |
| iOS | iOS 15.1+，仅支持 arm64 真机 |
| 交付方式 | GitHub 仓库 + git tag 依赖 |
| 原生 SDK | Android AAR 和 iOS `DHBleSDK.framework` 均已包含，无需单独下载 |

### 1.2 相关术语

- **App**：运行 React Native 的手机应用。
- **设备**：RWFIT 智能戒指。
- **上传**：设备向 App 发送数据。
- **下发**：App 向设备发送数据。
- **设备就绪**：连接后收到 `onFunctionMenu` 回调，此后才可发送业务指令。
- **全量下发**：写操作必须回传完整数组，例如修改一个闹钟也要回传全部闹钟。
- **启动型方法**：只表示任务已发起，最终结果需要通过事件确认，例如扫描、连接、同步和 OTA。

### 1.3 注意事项

1. 建议结合仓库内的 `example/` 集成，重点参考权限申请、扫描、连接和事件清理。
2. 请求方法返回 `Promise`；失败抛出 `RwfitError(code, message)`。
3. 每个 `onXxx(listener)` 都返回订阅对象，页面卸载时必须调用 `remove()`。
4. `connected` 只表示 BLE 链路已建立，业务操作必须等待 `onFunctionMenu`。
5. iOS 不支持模拟器，请使用 arm64 真机。
6. Android 和 iOS 共用一套 TypeScript API；平台独占方法在另一平台可能是 no-op，详见对应接口说明。
7. 组件以源码和内置原生 SDK 形式交付，无需另外复制 SDK 文件或手动注册原生模块。

---

## 2. 快速开始（Quick Start）

### 第 1 步：引入组件

仓库内的 Example 已指向组件本体，可以直接运行：

```sh
git clone https://github.com/RWFitSDK/rw-react-native-sdk.git
cd rw-react-native-sdk
npm install
npm run prepare

cd example
npm install
```

集成到客户 App 时，使用 GitHub tag 安装并锁定版本：

```sh
npm install github:RWFitSDK/rw-react-native-sdk#v0.0.5
```

等价的 `package.json` 配置：

```json
{
  "dependencies": {
    "react-native-rwfit-ble": "github:RWFitSDK/rw-react-native-sdk#v0.0.5"
  }
}
```

升级时修改 tag，再执行 `npm install`。组件支持 React Native Autolinking，不要手工注册 Android Package 或 iOS Pod。

### 第 2 步：平台配置

**Android**

App 的 `minSdkVersion` 必须不低于 26。组件清单会自动合并蓝牙和定位权限，App 仍须在运行时申请权限：

```ts
import {PermissionsAndroid, Platform} from 'react-native';

export async function requestRwfitPermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const permissions = Platform.Version >= 31
    ? [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const result = await PermissionsAndroid.requestMultiple(permissions);
  const denied = permissions.some(
    permission => result[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  );
  if (denied) throw new Error('RWFIT 蓝牙权限未授权');
}
```

Android AAR 已由组件通过相对路径加载，App 无需额外配置 Maven 仓库。

**iOS**

安装依赖后执行：

```sh
cd ios
pod install
```

在 App 的 `Info.plist` 中加入：

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>用于搜索并连接 RWFIT 蓝牙设备</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>用于搜索并连接 RWFIT 蓝牙设备</string>
```

当前 `DHBleSDK.framework` 只有 iPhoneOS arm64 slice，不能编译或运行 iOS 模拟器。

### 第 3 步：初始化 SDK

```ts
import {RwfitBle} from 'react-native-rwfit-ble';

await requestRwfitPermissions();
await RwfitBle.init();
```

`init()` 在 App 生命周期内调用一次。建议先完成事件订阅，再启动扫描或其他异步任务。

运行仓库 Example：

```sh
# Android
cd example
npm start
# 另开终端；USB 真机先执行 adb reverse tcp:8081 tcp:8081
npm run android
```

```sh
# iOS 真机
cd example/ios
pod install
cd ..
npm start
npm run ios -- --device "你的 iPhone 名称"
```

---

## 3. 接口说明（API Reference）

以下方法、类型和枚举均从 `react-native-rwfit-ble` 导出。

所有请求方法返回 `Promise`。原生结果统一为 `{code, msg, ...}`，公共 Facade 在
`code !== 0` 时抛出 `RwfitError`。普通读写方法会等待设备响应；扫描、连接、同步、OTA 等启动型方法只表示任务已发起。

事件订阅返回 `RwfitSubscription`，必须在页面卸载时调用 `remove()`：

```ts
useEffect(() => {
  const subscription = RwfitBle.onConnectState(console.log);
  return () => subscription.remove();
}, []);
```

### 3.1 设备搜索、连接、绑定与重连

##### 3.1.1 初始化 SDK

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `init()` | 无 | `Promise<DynamicMap>` | 初始化原生 SDK；App 生命周期内调用一次 |

```ts
await RwfitBle.init();
```

##### 3.1.2 开始搜索蓝牙设备

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `startScan()` | 无 | `Promise<DynamicMap>` | 开始搜索受支持设备，约 10 秒后自动结束 |

开始扫描前先订阅扫描结果和扫描结束事件。

```ts
await RwfitBle.startScan();
```

##### 3.1.3 监听扫描结果

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onScanResult(listener)` | `BleDevice` | 每发现一个设备触发一次 |

```ts
const scanResult = RwfitBle.onScanResult(device => {
  console.log(device.name, device.mac, device.uuid, device.rssi);
});
```

`BleDevice` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | `string` | 设备名称 |
| `mac` | `string` | Android 主要设备标识 |
| `rssi` | `number` | 信号强度 |
| `uuid` | `string?` | iOS 主标识，连接和持久化时必须保留 |

##### 3.1.4 停止搜索蓝牙设备

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `stopScan()` | 无 | `Promise<DynamicMap>` | 主动停止扫描 |

```ts
await RwfitBle.stopScan();
```

##### 3.1.5 监听扫描结束

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onScanFinish(listener)` | 无 | 自动结束或主动停止扫描时触发 |

```ts
const scanFinish = RwfitBle.onScanFinish(() => {
  console.log('扫描结束');
});
```

##### 3.1.6 连接设备

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `connect(device)` | 扫描返回的完整 `BleDevice` | `Promise<DynamicMap>` | 发起设备连接 |

不要自行拼接 `BleDevice`。iOS 必须原样保留扫描结果中的 `uuid`。

```ts
await RwfitBle.stopScan();
await RwfitBle.connect(device);
```

##### 3.1.7 查询连接状态

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `isConnected()` | 无 | `Promise<boolean>` | 查询当前 BLE 是否已连接 |

```ts
const connected = await RwfitBle.isConnected();
```

##### 3.1.8 监听连接状态

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onConnectState(listener)` | `ConnectStateEvent` | 连接状态变化时触发 |

```ts
const connection = RwfitBle.onConnectState(event => {
  console.log(event.state, event.name, event.reason);
});
```

`ConnectStateEvent` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `state` | `connecting \| connected \| disconnected \| failed` | 当前连接状态 |
| `name` | `string?` | 设备名称 |
| `mac` | `string?` | MAC |
| `uuid` | `string?` | iOS 设备标识 |
| `reason` | `string?` | 连接失败原因 |

> `connected` 只表示 BLE 链路已连接，不能立即发送业务指令。

##### 3.1.9 监听设备就绪与功能表

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onFunctionMenu(listener)` | `FunctionMenu` | 设备业务通道就绪时触发 |

```ts
const ready = RwfitBle.onFunctionMenu(menu => {
  console.log('设备已就绪', menu.name, menu.raw);
});
```

`FunctionMenu` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | `string` | 设备名称 |
| `mac` | `string` | MAC |
| `uuid` | `string?` | iOS 设备标识 |
| `raw` | `DynamicMap` | 设备功能能力表 |
| `supportsWorkout` | `boolean` | 是否支持多运动 |

App 应根据 `raw` 隐藏或禁用设备不支持的功能。常用能力字段：

| 属性 | 类型 | 说明 |
|---|---|---|
| `isPushMsgEnableSwitch` | `boolean` | 是否支持消息通知总开关 |
| `pushMsgSwitchValue` | `number` | 支持的消息类型，低 32 位位掩码 |
| `pushMsgSwitchValue2` | `number` | 支持的消息类型，高 32 位位掩码 |
| `activityDataInterval` | `number` | 当天活动明细数据的时间间隔，单位为分钟 |
| `isAlarm` | `boolean` | 是否支持闹钟 |
| `isBrightScreenSleepTime` | `boolean` | 是否支持设置屏幕睡眠时间 |
| `isBrightScreenTime` | `boolean` | 是否支持设置亮屏时长 |
| `isSupportWorkout` | `boolean` | 是否支持多运动 |
| `isRememberSwitch` | `boolean` | 是否支持 Muslim 赞念或计数开关 |
| `isSupportHrReminder` | `boolean` | 是否支持心率提醒 |
| `isSupportBoReminder` | `boolean` | 是否支持血氧提醒 |
| `isSupportMotoVibrationLevel` | `boolean` | 是否支持设置马达振动等级 |
| `isSupportAlarmVibrationDuration` | `boolean` | 是否支持设置闹钟振动次数 |
| `isSupportVibrationInterval` | `boolean` | 是否支持设置振动间隔 |
| `isStep` | `boolean` | 是否支持计步数据 |
| `isHr` | `boolean` | 是否支持心率数据 |
| `isBloodPress` | `boolean` | 是否支持血压数据 |
| `isSleep` | `boolean` | 是否支持睡眠数据 |
| `isBloodOxy` | `boolean` | 是否支持血氧数据 |
| `isHrv` | `boolean` | 是否支持 HRV 数据 |
| `isPressure` | `boolean` | 是否支持压力数据 |
| `isBloodSugar` | `boolean` | 是否支持血糖数据 |
| `isMuslimCountData` | `boolean` | 是否支持 Muslim 计数数据 |
| `isBodyTemp` | `boolean` | 是否支持体温数据 |
| `isSupportMuslimTimeDisplayMode` | `boolean` | 是否支持 Muslim 时间显示模式 |
| `isSupportSensorRawPPG` | `boolean` | 是否支持 PPG 原始数据 |
| `isSupportPPGMonitoring` | `boolean` | 是否支持 PPG 定时检测 |
| `isSupportTemperatureMonitoring` | `boolean` | 是否支持温度定时检测 |
| `isSupportCountReminder` | `boolean` | 是否支持设置计数提醒间隔 |
| `isSupportSensorRawACC` | `boolean` | 是否支持 ACC 原始数据 |
| `isSupportSensorRawPPGRed` | `boolean` | 是否支持红光 PPG 原始数据 |
| `isSupportSensorRawIR` | `boolean` | 是否支持红外原始数据 |
| `isSupportSensorRawSleep` | `boolean` | 是否支持实时睡眠状态数据 |
| `isSupportFallDetect` | `boolean` | 是否支持跌倒检测提醒 |
| `isSupportRecording` | `boolean` | 是否支持录音 |
| `isFindDevice` | `boolean` | 是否支持查找设备 |
| `isTakePhoto` | `boolean` | 是否支持遥控拍照 |
| `isLedLight` | `boolean` | 是否支持 LED 灯控制 |
| `isWearDirection` | `boolean` | 是否支持设置佩戴方向 |
| `isVideoHid` | `boolean` | 是否支持视频 HID 控制 |
| `isVideoHidBook` | `boolean` | 是否支持电子书 HID 控制 |
| `isVideoHidMusic` | `boolean` | 是否支持音乐 HID 控制 |
| `isRaiseBrightScreen` | `boolean` | 是否支持抬腕亮屏 |
| `isPowerOff` | `boolean` | 是否支持关机 |
| `isFactoryReset` | `boolean` | 是否支持恢复出厂设置 |
| `isPushMessage` | `boolean` | 是否支持消息推送 |

##### 3.1.10 断开设备

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `disconnect()` | 无 | `Promise<DynamicMap>` | 断开 BLE，不删除 App 保存的设备 |

##### 3.1.11 重连设备

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `reconnect(device?)` | 可选 `BleDevice` | `Promise<DynamicMap>` | 重连已保存设备 |

Android 需要传入含 MAC 的设备；iOS 可使用 SDK 保存的绑定态。跨平台 App 推荐始终传入 App 持久化的完整设备对象。

```ts
await RwfitBle.reconnect(savedDevice);
```

##### 3.1.12 设置 iOS 绑定状态

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `iosSetBindedStatus(isBinded)` | `boolean` | `Promise<DynamicMap>` | iOS 设置本地绑定态；Android no-op |

连接就绪后设置 `true`；换绑或清除设备时设置 `false`。

##### 3.1.13 解绑设备

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `unbind()` | 无 | `Promise<DynamicMap>` | Android 下发解绑；iOS 清除绑定态并断开 |

##### 3.1.14 主动读取功能表

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getFunctionList()` | 无 | `Promise<DynamicMap>` | 返回对象的 `supportMenu` 为能力表 |

通常优先使用 `onFunctionMenu`；已连接且就绪时可主动读取。

### 3.2 设备功能操作

#### 3.2.1 基础功能指令

##### 3.2.1.1 获取原生 SDK 版本

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getSdkVersion()` | 无 | `Promise<string>` | Android/iOS 原生 SDK 版本 |

##### 3.2.1.2 获取 React Native 组件版本

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getPluginVersion()` | 无 | `Promise<string>` | 返回 `0.0.5_原生SDK版本` |

##### 3.2.1.3 设置用户信息

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setUserInfo(info)` | `UserInfo` | `Promise<DynamicMap>` | 设置设备侧用户资料 |

`UserInfo` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `gender` | `number` | 性别：0=女，1=男 |
| `age` | `number` | 年龄 |
| `height` | `number` | 身高，单位为 cm |
| `weight` | `number` | 体重，单位为 kg |

```ts
await RwfitBle.setUserInfo({gender: 1, age: 30, height: 175, weight: 70});
```

##### 3.2.1.4 获取固件信息

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getFirmwareVersion()` | 无 | `Promise<FirmwareInfo>` | 获取型号、固件版本和 UI 版本 |

`FirmwareInfo` 包含 `deviceClazz`、`deviceNo`、`uiVersion`。

##### 3.2.1.5 获取电量

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getPower()` | 无 | `Promise<number>` | 返回电量百分比 0–100 |

##### 3.2.1.6 设置设备蓝牙名称

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setRingBtName(name)` | 非空 `string` | `Promise<DynamicMap>` | 设置设备蓝牙名称 |

##### 3.2.1.7 获取视频 HID 模式

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getVideoHid()` | 无 | `Promise<number>` | 0=关闭、1=视频、2=Book、3=Music |

##### 3.2.1.8 设置视频 HID 模式

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setVideoHid(hidOpen)` | `0 \| 1 \| 2 \| 3` | `Promise<DynamicMap>` | 设置 HID 控制模式 |

Android 视频/音乐 HID 依赖系统蓝牙配对，仅 BLE 连接或调用本方法不会自动配对。

##### 3.2.1.9 创建或取消 Android HID 配对

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `createOrRemoveBond(type, mac)` | `type` 1=配对、2=取消；设备 MAC | `Promise<boolean>` | Android HID 配对；iOS 返回 false |

##### 3.2.1.10 获取 LED 亮度

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getRingLedLevel()` | 无 | `Promise<LedLevel>` | 获取 LED 开关和亮度 |

`LedLevel` 为 `{isOpen: boolean, lcdLevel: number}`，亮度等级为 1–3。

##### 3.2.1.11 设置 LED 亮度

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setRingLedLevel(config)` | `LedLevel` | `Promise<DynamicMap>` | 设置 LED 开关和 1–3 级亮度 |

##### 3.2.1.12 获取佩戴位置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getRingWearDir()` | 无 | `Promise<boolean>` | `true` 表示右手，`false` 表示左手 |

##### 3.2.1.13 设置佩戴位置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setRingWearHand(isRight)` | `boolean` | `Promise<DynamicMap>` | 设置左/右手佩戴 |

##### 3.2.1.14 进入或退出拍照模式

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `controlPhoto(state)` | 1=进入、0=退出 | `Promise<DynamicMap>` | 控制设备拍照模式 |

设备触发拍照时，通过 `onTouchEvent` 收到 `cameraTakePicture`。

##### 3.2.1.15 查找设备

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `findDevice()` | 无 | `Promise<DynamicMap>` | 发起查找设备；成功仅表示指令已发出 |

##### 3.2.1.16 设备关机

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `powerOff()` | 无 | `Promise<DynamicMap>` | 下发设备关机指令 |

##### 3.2.1.17 恢复出厂设置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `factoryReset()` | 无 | `Promise<DynamicMap>` | 下发恢复出厂设置指令 |

##### 3.2.1.18 获取闹钟

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getAlarm()` | 无 | `Promise<Alarm[]>` | 获取设备上的完整闹钟数组 |

设备没有闹钟时返回空数组 `[]`。

`Alarm` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `alarmId` | `number` | 闹钟 ID |
| `startHour` | `number` | 小时，范围 0–23 |
| `startMin` | `number` | 分钟，范围 0–59 |
| `isOpen` | `boolean` | 是否启用 |
| `repeats` | `number[]?` | 可选；长度为 7，按周日到周六排列，1=启用、0=禁用 |

##### 3.2.1.19 设置闹钟

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setAlarm(alarms)` | 完整 `Alarm[]` | `Promise<DynamicMap>` | 全量替换设备闹钟 |

协议不支持单条修改。先读取完整数组，修改目标对象后，再把整个数组传回。

##### 3.2.1.20 删除全部闹钟

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `deleteAllAlarm()` | 无 | `Promise<DynamicMap>` | 删除设备上的全部闹钟 |

##### 3.2.1.21 获取振动次数和等级

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getVibrationCount()` | 无 | `Promise<VibrationConfig>` | 返回 `{count, level}` |

`count` 为 0–6，0 表示不振动；原生协议定义设备初始默认值为 2，React Native
桥接层不会自行填充该默认值。`level` 为 0=关闭、1=低、2=中、3=高。

##### 3.2.1.22 设置振动次数和等级

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setVibrationCount(config)` | `VibrationConfig` | `Promise<DynamicMap>` | 设置 `{count, level}` |

##### 3.2.1.23 获取睡眠时段亮屏配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getBrightScreenSleepTime()` | 无 | `Promise<ScheduleToggle>` | 获取睡眠时段亮屏开关和时间范围 |

##### 3.2.1.24 设置睡眠时段亮屏配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setBrightScreenSleepTime(config)` | `ScheduleToggle` | `Promise<DynamicMap>` | 设置睡眠时段亮屏配置 |

`ScheduleToggle` 为 `{isOpen, startHour?, startMin?, endHour?, endMin?}`。

##### 3.2.1.25 Android 消息推送

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `pushMessage(message)` | `DynamicMap` | `Promise<DynamicMap>` | Android 主动推送消息；iOS no-op |

常用字段为 `appId`、`title`、`content`，可选 `msgType` 和毫秒时间戳 `timeMill`。

##### 3.2.1.26 设置 iOS 通知开关

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setNotificationSwitch(switches)` | `DynamicMap` | `Promise<DynamicMap>` | 设置 iOS ANCS 开关；Android no-op |

常用键包括 `isCall`、`isSMS`、`isWechat`、`isQQ`、`isWhatsapp`、`isFacebook`、`isInstagram`、`isOther`。

##### 3.2.1.27 获取 iOS 通知开关

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getNotificationSwitch()` | 无 | `Promise<DynamicMap>` | 获取 iOS ANCS 开关；Android 返回空对象 |

##### 3.2.1.28 向设备发送来电控制状态

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `controlPhone(action)` | `CallControlAction.Answer` 或 `Reject` | `Promise<DynamicMap>` | Android 来电控制；iOS no-op |

##### 3.2.1.29 监听设备来电控制

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onCallControl(listener)` | `CallControlEvent` | Android 设备触发接听/拒接时回调 |

Payload 为 `{action, rawValue}`。

##### 3.2.1.30 监听触摸和音乐控制事件

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onTouchEvent(listener)` | `TouchEvent` | 拍照、音乐、点击、摆动和跌落等触摸事件 |

`TouchEvent.action` 可能为 `cameraTakePicture`、`musicPlay`、`musicPause`、
`musicPrev`、`musicNext`、`musicVolumeUp`、`musicVolumeDown`、`singleTap`、
`doubleTap`、`tripleTap`、`longPress`、`swing`、`fallDetected`、`unknown`。
拍照动作两端均支持；音乐控制依赖平台系统能力，目前仅 Android 支持。

##### 3.2.1.31 获取赞念开关

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getMuslimCountEnabled()` | 无 | `Promise<boolean>` | 获取赞念计数功能是否开启 |

##### 3.2.1.32 设置赞念开关

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setMuslimCountEnabled(enabled)` | `boolean` | `Promise<DynamicMap>` | 开启或关闭赞念计数 |

##### 3.2.1.33 获取心率报警配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getHeartRateAlert()` | 无 | `Promise<HeartRateAlertConfig>` | 获取高/低心率报警配置 |

配置为 `{isOpen, highThreshold, lowThreshold?}`。

##### 3.2.1.34 设置心率报警配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setHeartRateAlert(config)` | `HeartRateAlertConfig` | `Promise<DynamicMap>` | 设置高/低心率阈值 |

##### 3.2.1.35 获取血氧报警配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getBloodOxygenAlert()` | 无 | `Promise<BloodOxygenAlertConfig>` | 获取低血氧报警配置 |

配置为 `{isOpen, lowThreshold}`。

##### 3.2.1.36 设置血氧报警配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setBloodOxygenAlert(config)` | `BloodOxygenAlertConfig` | `Promise<DynamicMap>` | 设置低血氧阈值 |

##### 3.2.1.37 监听实时健康报警

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onHealthAlert(listener)` | `HealthAlertEvent` | 实时上报高/低心率和低血氧报警 |

Payload 为 `{type, rawType, value}`。

##### 3.2.1.38 获取亮屏时长

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getBrightScreenTime()` | 无 | `Promise<number>` | 获取亮屏秒数 |

##### 3.2.1.39 设置亮屏时长

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setBrightScreenTime(timeSecond)` | 0–255 | `Promise<DynamicMap>` | 设置亮屏秒数 |

##### 3.2.1.40 获取抬腕亮屏配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getRaiseBrightScreen()` | 无 | `Promise<ScheduleToggle>` | 获取抬腕亮屏开关和时段 |

##### 3.2.1.41 设置抬腕亮屏配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setRaiseBrightScreen(config)` | `ScheduleToggle` | `Promise<DynamicMap>` | 设置抬腕亮屏开关和时段 |

##### 3.2.1.42 设置 12/24 小时时间格式

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setTimeFormat(format)` | 0=24 小时、1=12 小时 | `Promise<DynamicMap>` | 设置设备时间显示格式 |

##### 3.2.1.43 获取闹钟振动时长

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getAlarmVibrationDuration()` | 无 | `Promise<number>` | 获取闹钟振动次数，范围 0–6 |

方法名中的 `Duration` 沿用原生 SDK 命名，协议值实际表示振动次数，而不是时间长度。

##### 3.2.1.44 设置闹钟振动时长

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setAlarmVibrationDuration(duration)` | 整数 0–6 | `Promise<DynamicMap>` | 设置闹钟振动次数；0 表示不振动 |

原生协议定义设备初始默认值为 2；React Native 桥接层不会把缺失值自动替换为 2。

##### 3.2.1.45 获取振动间隔

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getVibrationInterval()` | 无 | `Promise<number>` | 获取振动间隔，单位 ms |

##### 3.2.1.46 设置振动间隔

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setVibrationInterval(intervalMs)` | 100–1000 ms | `Promise<DynamicMap>` | 设置振动间隔 |

##### 3.2.1.47 启动心率校正

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `startHeartRateCalibration()` | 无 | `Promise<DynamicMap>` | 发起心率校正，结果通过事件返回 |

桥接使用的心率校正测试模式为 `0x15`。

##### 3.2.1.48 监听心率校正结果

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onHeartRateCalibration(listener)` | `HeartRateCalibrationResult` | 返回校正模式、结果和完成状态 |

Payload 为 `{testMode, result, isCalibrating, isCompleted}`。

##### 3.2.1.49 获取跌落提醒状态

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getFallDetect()` | 无 | `Promise<boolean>` | 获取跌落提醒开关 |

##### 3.2.1.50 设置跌落提醒状态

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setFallDetect(enabled)` | `boolean` | `Promise<DynamicMap>` | 开启或关闭跌落提醒 |

##### 3.2.1.51 获取计数提醒间隔

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getCountReminderInterval()` | 无 | `Promise<number>` | 获取计数提醒间隔，单位分钟 |

##### 3.2.1.52 设置计数提醒间隔

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setCountReminderInterval(minutes)` | 0/30/60/90/120 | `Promise<DynamicMap>` | 0 表示关闭提醒 |

#### 3.2.2 健康数据（实时检测与全天检测）

##### 3.2.2.1 启动实时健康检测

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `startRealtimeMeasure(metric)` | `RealtimeMetric` | `Promise<DynamicMap>` | 启动指定健康指标检测 |

`RealtimeMetric` 支持 `Hr`、`BloodOxy`、`Hrv`、`Pressure`、`BloodSugar`、
`BloodPressure`、`Temperature`。
同一时间只能开启一种实时检测，切换前先停止当前类型。

##### 3.2.2.2 停止实时健康检测

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `stopRealtimeMeasure(metric)` | 与启动时相同的 `RealtimeMetric` | `Promise<DynamicMap>` | 停止指定健康指标检测 |

##### 3.2.2.3 监听实时健康数据

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onRealtimeData(listener)` | `RealtimeData` | 检测期间持续返回实时数据 |

`RealtimeData` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | `HealthType \| null` | 健康数据类型 |
| `value` | `number` | 主值 |
| `diastolic` | `number?` | 血压舒张压 |
| `timestampSec` | `number` | Unix 秒 |
| `timestampMs` | `number` | 由秒转换的兼容毫秒值 |

`HealthType` 数值定义：

| 枚举 | 数值 | 说明 |
|---|---:|---|
| `HealthType.Hr` | 1 | 心率 |
| `HealthType.BloodOxy` | 3 | 血氧 |
| `HealthType.BloodPressure` | 4 | 血压 |
| `HealthType.Pressure` | 8 | 压力 |
| `HealthType.BloodSugar` | 9 | 血糖 |
| `HealthType.MuslimCount` | 10 | 赞念计数 |
| `HealthType.Temperature` | 11 | 体温 |
| `HealthType.Hrv` | 13 | HRV |

新代码优先使用 `timestampSec`；也可调用导出的 `timestampMs(data)` 辅助函数转换为毫秒。

##### 3.2.2.4 监听单次检测完成

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onRealtimeMeasureComplete(listener)` | 无 | 单次健康检测完成时触发 |

##### 3.2.2.5 全天检测配置结构

所有定时检测 get 方法返回 `Promise<TimedConfig>`，set 方法接收 `TimedConfig`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `isOpen` | `boolean` | 是否开启 |
| `duration` | `number?` | 可选；检测间隔，单位为分钟，具体限制见各小节 |
| `startHour` | `number?` | 可选；开始小时，全天检测通常为 0 |
| `startMin` | `number?` | 可选；开始分钟，全天检测通常为 0 |
| `endHour` | `number?` | 可选；结束小时，全天检测通常为 23 |
| `endMin` | `number?` | 可选；结束分钟，全天检测通常为 59 |

时间范围通常为 `00:00–23:59`。修改配置时建议先读取当前值，再用对象展开修改需要的字段。

##### 3.2.2.6 获取定时心率配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getTimedHeartRate()` | 无 | `Promise<TimedConfig>` | 获取心率定时检测配置 |

##### 3.2.2.7 设置定时心率配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setTimedHeartRate(config)` | `TimedConfig` | `Promise<DynamicMap>` | 间隔通常为 30 或 60 分钟 |

##### 3.2.2.8 获取定时血氧配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getTimedBloodOxygen()` | 无 | `Promise<TimedConfig>` | 获取血氧定时检测配置 |

##### 3.2.2.9 设置定时血氧配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setTimedBloodOxygen(config)` | `TimedConfig` | `Promise<DynamicMap>` | 血氧间隔通常为 60 分钟 |

##### 3.2.2.10 获取定时 HRV 配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getTimedHRV()` | 无 | `Promise<TimedConfig>` | 获取 HRV 定时检测配置 |

##### 3.2.2.11 设置定时 HRV 配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setTimedHRV(config)` | `TimedConfig` | `Promise<DynamicMap>` | HRV 间隔通常为 60 分钟 |

##### 3.2.2.12 获取定时压力配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getTimedStress()` | 无 | `Promise<TimedConfig>` | 获取压力定时检测配置 |

##### 3.2.2.13 设置定时压力配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setTimedStress(config)` | `TimedConfig` | `Promise<DynamicMap>` | 压力间隔通常为 60 分钟 |

##### 3.2.2.14 获取定时血糖配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getTimedBloodSugar()` | 无 | `Promise<TimedConfig>` | 获取血糖定时检测配置 |

##### 3.2.2.15 设置定时血糖配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setTimedBloodSugar(config)` | `TimedConfig` | `Promise<DynamicMap>` | 血糖间隔通常为 60 分钟 |

##### 3.2.2.16 获取定时血压配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getTimedBloodPressure()` | 无 | `Promise<TimedConfig>` | 获取血压定时检测配置 |

##### 3.2.2.17 设置定时血压配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setTimedBloodPressure(config)` | `TimedConfig` | `Promise<DynamicMap>` | 血压间隔通常为 60 分钟 |

##### 3.2.2.18 获取定时体温配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getTimedBodyTemperature()` | 无 | `Promise<TimedConfig>` | 获取体温定时检测配置 |

##### 3.2.2.19 设置定时体温配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setTimedBodyTemperature(config)` | `TimedConfig` | `Promise<DynamicMap>` | 体温间隔通常为 30 或 60 分钟 |

##### 3.2.2.20 获取定时 PPG 配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getTimedPPG()` | 无 | `Promise<TimedConfig>` | 获取 PPG 定时监测配置 |

##### 3.2.2.21 设置定时 PPG 配置

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setTimedPPG(config)` | `TimedConfig` | `Promise<DynamicMap>` | 设置 PPG 定时监测配置 |

PPG 定时检测数据可能被下一次检测覆盖；收到 `onSensorRawStopped` 后应尽快调用 `getSensorRawHistory()` 并持久化。

##### 3.2.2.22 发起健康历史同步

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `syncAllHealthData()` | 无 | `Promise<DynamicMap>` | 发起全部历史健康数据同步 |

调用前先订阅下面各同步事件。

##### 3.2.2.23 监听同步进度

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onSyncProgress(listener)` | `number` | 当前只保证同步完成标记 100 |

##### 3.2.2.24 监听同步数据批次

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onSyncResult(listener)` | `SyncResult` | 每批返回 `{type, data}` |

`type` 可能为 `step`、`sleep`、`hr`、`bo`、`bp`、`hrv`、`pressure`、
`bloodSugar`、`temp`、`muslimCount`。

计步和赞念计数按天返回汇总值及当天的全部明细：

| `type` | 每日对象字段 | `items` 明细字段 |
|---|---|---|
| `step` | `time`、`date`、`totalSteps`、`totalCalorie`、`totalDistance`、`activityDataInterval`、`items` | `time`、`index`、`steps`、`calorie`、`distance` |
| `muslimCount` | `time`、`date`、`totalCount`、`items` | `time`、`count` |

##### 3.2.2.25 监听同步完成

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onSyncFinish(listener)` | 无 | 所有健康历史同步完成 |

##### 3.2.2.26 监听同步失败

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onSyncError(listener)` | `{code, message?}` | 健康同步失败 |

##### 3.2.2.27 停止转发健康同步事件

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `removeHealthDataCallback()` | 无 | `Promise<DynamicMap>` | 停止继续向 JS 转发同步事件 |

##### 3.2.2.28 健康历史数据单位

- 时间字段统一为 Unix 秒。
- 心率：bpm。
- 血氧：百分比。
- 血压：mmHg。
- HRV：ms。
- 距离：m。
- 历史体温：原始 `temp / 10` 为摄氏度。
- 历史睡眠 `sleepType`：0=清醒、1=浅睡、2=深睡、3=REM。

#### 3.2.3 OTA 升级

##### 3.2.3.1 发起 OTA

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `ringOta(path)` | 本地固件文件路径 | `Promise<DynamicMap>` | 提交 OTA 任务，不代表升级完成 |

固件必须由设备厂家提供。升级前调用 `getFirmwareVersion()`，确认 `deviceClazz` 与固件适用型号完全一致。

##### 3.2.3.2 监听 OTA 进度

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onOtaProgress(listener)` | `number` | Android/iOS 均归一化为 0–1 |

##### 3.2.3.3 监听 OTA 完成

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onOtaFinish(listener)` | `OtaResult` | `{success, code?}` |

#### 3.2.4 多运动（Workout）

只有 `FunctionMenu.supportsWorkout === true` 时才应展示多运动入口。

##### 3.2.4.1 获取设备运动状态

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getWorkoutState()` | 无 | `Promise<WorkoutState>` | 获取当前运动类型和控制状态 |

`WorkoutState` 为 `{sportType, controlType, isRunning}`。

##### 3.2.4.2 控制设备运动

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `controlWorkout(sportType, controlType)` | 运动类型 7–161；控制枚举 | `Promise<DynamicMap>` | 开始、继续、暂停或结束运动 |

`WorkoutControlType` 为 `Start(1)`、`Resume(2)`、`Pause(3)`、`End(4)`。
关闭 App 或断开连接不会结束设备上的运动。

##### 3.2.4.3 开启或关闭实时运动数据

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `setWorkoutRealtimeEnabled(enabled)` | `boolean` | `Promise<DynamicMap>` | 进入运动页开启，离开页面时关闭 |

##### 3.2.4.4 监听实时运动数据

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onWorkoutRealtimeData(listener)` | `WorkoutRealtimeData` | 运动过程中持续返回数据 |

Payload 包含 `duration`、`steps`、`distance`、`calorie`、`heartRate`、`dataType`、`rawDataType`。

##### 3.2.4.5 获取运动报告

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getWorkoutReports()` | 无 | `Promise<WorkoutReport[]>` | 获取设备保存的运动历史报告 |

运动超过约 2 分钟后，设备才会保存历史报告。报告包含开始/结束时间、运动类型、时长、
步数、距离、热量、心率统计、配速和分段数组等字段。

#### 3.2.5 传感器原始数据

##### 3.2.5.1 启动或停止原始数据采集

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `controlSensorRaw(enabled, selection)` | 开关和 `SensorRawSelection` | `Promise<DynamicMap>` | 启动或停止指定传感器组合 |

合法组合：

- `Acc(1)`
- `PpgGreen(2)`
- `PpgGreenAndAcc(3)`
- `PpgRed(4)`
- `PpgRedAndAcc(5)`
- `PpgGreenAndIr(10)`
- `PpgGreenAccAndIr(11)`
- `PpgRedAndIr(12)`
- `PpgRedAccAndIr(13)`

绿光和红光不能同时采集，IR 不能单独启动。

##### 3.2.5.2 监听实时原始数据

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onSensorRawData(listener)` | `SensorRawPacket` | 返回实时 PPG、ACC、Red、IR 或睡眠数据 |

`SensorRawPacket` 包含 `type`、`rawType`、`sequence?`、`timestampSec?`、
`ppg[]`、`acc[{x,y,z}]`、`ppgRed[]`、`ir[]`、`sleep[]`。

##### 3.2.5.3 获取历史原始数据

| 方法 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `getSensorRawHistory()` | 无 | `Promise<SensorRawPacket[]>` | 同步设备保存的原始数据包 |

##### 3.2.5.4 监听设备停止采集

| 订阅方法 | Payload | 说明 |
|---|---|---|
| `onSensorRawStopped(listener)` | `SensorRawStoppedEvent` | 设备停止采集时返回 `{reason}` |

##### 3.2.5.5 睡眠状态原始数据

原始睡眠数据的 `mode` 编码：17=开始、34=结束、1=深睡、2=浅睡、3=清醒、4=REM。
该编码与历史睡眠数据的 `sleepType` 不同，不要混用。

### 3.3 通用事件入口

除各功能下单独列出的 `onXxx` 方法外，也可以使用通用入口：

```ts
const subscription = RwfitBle.addListener(
  RwfitEvents.scanResult,
  device => console.log(device),
);

subscription.remove();
```

`addListener()` 与便捷订阅方法的 Payload 类型和生命周期规则完全相同。

---

## 4. 附录

### 4.1 错误处理

```ts
import {RwfitBle, RwfitError} from 'react-native-rwfit-ble';

try {
  const power = await RwfitBle.getPower();
  console.log(`电量 ${power}%`);
} catch (error) {
  if (error instanceof RwfitError) {
    console.error(error.code, error.message, error.nativeCode);
  } else {
    console.error(error);
  }
}
```

写操作通常返回 `Promise<DynamicMap>`，成功结果可以忽略；读取操作返回明确的 TypeScript 类型。

### 4.2 关键约束

| 约束 | 要求 |
|---|---|
| 设备就绪 | 必须等待 `onFunctionMenu`，不能只判断 `connected` |
| 订阅生命周期 | 启动任务前订阅，页面卸载时调用 `remove()` |
| 实时测量 | 同时只能开启一种，切换前先停止当前类型 |
| 闹钟 | 所有修改均为全量下发 |
| 能力门控 | 根据 `FunctionMenu.raw` 控制入口显示和禁用状态 |
| Android 权限 | Android 12+ 运行时申请扫描和连接权限 |
| iOS 标识 | 保存扫描结果的 UUID；重连前设置绑定态 |
| OTA | 必须核对设备型号和固件适用型号 |
| 平台独占 API | no-op 成功不代表另一平台执行了同等系统功能 |

### 4.3 设备持久化与重连

组件不替 App 持久化设备。推荐流程：

1. 收到 `onFunctionMenu` 时保存 `{name, mac, uuid, rssi}`。
2. iOS 连接就绪后调用 `iosSetBindedStatus(true)`。
3. 下次启动读取保存对象并调用 `reconnect(savedDevice)`。
4. 换设备前调用 `iosSetBindedStatus(false)` 并清除 App 保存值。
5. 普通 `disconnect()` 不删除保存值，之后仍可重连。

Android 主要使用 MAC；iOS 必须保存扫描结果中的 UUID。

### 4.4 完整扫描与连接示例

```ts
import {RwfitBle, type BleDevice} from 'react-native-rwfit-ble';

export async function scanAndConnect(): Promise<() => void> {
  await RwfitBle.init();

  let selected: BleDevice | undefined;

  const scanResult = RwfitBle.onScanResult(device => {
    console.log(device.name, device.mac, device.uuid, device.rssi);
    selected ??= device;
  });

  const scanFinish = RwfitBle.onScanFinish(() => {
    console.log('扫描结束');
  });

  const connection = RwfitBle.onConnectState(event => {
    console.log('连接状态', event.state, event.reason);
  });

  const ready = RwfitBle.onFunctionMenu(async menu => {
    console.log('设备已就绪', menu.name, menu.raw);
    await RwfitBle.iosSetBindedStatus(true);
    console.log('电量', await RwfitBle.getPower());
  });

  await RwfitBle.startScan();

  // 正式 App 应等待用户选择扫描结果；这里只展示调用顺序。
  await new Promise(resolve => setTimeout(resolve, 3000));
  if (selected) {
    await RwfitBle.stopScan();
    await RwfitBle.connect(selected);
  }

  return () => {
    scanResult.remove();
    scanFinish.remove();
    connection.remove();
    ready.remove();
  };
}
```

### 4.5 技术支持

`developer@dhouse88.com`
