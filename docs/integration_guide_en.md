# RWFIT Ring React Native SDK — Integration Guide

---

## Contents

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. API Reference](#3-api-reference)
  - [3.1 SDK Initialization, Device Discovery, and Connection Management](#31-sdk-initialization-device-discovery-and-connection-management)
  - [3.2 Device Operations](#32-device-operations)
- [4. Appendix](#4-appendix)

---

## 1. Introduction

This guide is intended for app developers integrating `react-native-rwfit-ble`
into a React Native project. It covers the complete flow: initialize → scan →
connect → wait for device readiness → call device APIs. A runnable implementation
is available in the repository's `example/` directory.

### 1.1 Supported Platforms and Versions

| Item | Details |
|---|---|
| Current package version | `0.0.5` |
| Native SDK version | `RW_SDK_V2.0.0_20260724` on both Android and iOS |
| React Native | `0.86.x`; New Architecture / TurboModule only |
| Node.js | `22.11.0+` |
| Android | minSdk 26, compileSdk 36 |
| iOS | iOS 15.1+; physical arm64 devices only |
| Distribution | GitHub repository + git tag dependency |
| Native SDKs | Android AAR and iOS `DHBleSDK.framework` are included; no separate download is required |

### 1.2 Terminology

- **App**: the mobile application that uses the RWFIT SDK.
- **Device**: an RWFIT smart ring.
- **Upload**: data sent from the device to the app.
- **Send**: data or commands sent from the app to the device.
- **Device ready**: the `onFunctionMenu` callback has fired after connection;
  business commands may be sent only after this point.
- **Full replacement**: a write operation must send the complete array. For
  example, changing one alarm still requires sending every alarm.
- **Start-only method**: a method that only confirms a task has started. Its final
  result is delivered by an event, as with scanning, connecting, syncing, and OTA.

### 1.3 Important Notes

1. Use the repository's `example/` app as the primary integration reference,
   especially for permissions, scanning, connection, and event cleanup.
2. Request methods return a `Promise`; failures throw `RwfitError(code, message)`.
3. Every `onXxx(listener)` method returns a subscription. Call `remove()` when the
   page or component is unmounted.
4. iOS simulators are not supported. Use a physical arm64 device.
5. Android and iOS share one TypeScript API. Platform-specific methods may be
   no-ops on the other platform; see each API description.
6. The package is distributed as source with embedded native SDKs. Do not copy
   SDK files or register native modules manually.

---

## 2. Quick Start

### Step 1: Add the Package

The Example app already references the package in this repository and can be run
directly:

```sh
git clone https://github.com/RWFitSDK/rw-react-native-sdk.git
cd rw-react-native-sdk
npm install
npm run prepare

cd example
npm install
```

For a customer app, install and pin a GitHub tag:

```sh
npm install github:RWFitSDK/rw-react-native-sdk#v0.0.5
```

Equivalent `package.json` configuration:

```json
{
  "dependencies": {
    "react-native-rwfit-ble": "github:RWFitSDK/rw-react-native-sdk#v0.0.5"
  }
}
```

To upgrade, change the tag and run `npm install`. React Native Autolinking is
supported; do not register an Android Package or iOS Pod manually.

### Step 2: Configure the Platforms

**Android**

The app's `minSdkVersion` must be at least 26. Bluetooth and location permissions
are merged automatically from the package manifest, but the app must still request
runtime permissions:

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
  if (denied) throw new Error('RWFIT Bluetooth permission was not granted');
}
```

The package loads its Android AAR through a relative path. The app does not need
an additional Maven repository.

**iOS**

After installing dependencies, run:

```sh
cd ios
pod install
```

Add the following entries to the app's `Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Used to scan for and connect to RWFIT Bluetooth devices</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Used to scan for and connect to RWFIT Bluetooth devices</string>
```

The current `DHBleSDK.framework` contains only an iPhoneOS arm64 slice, so it
cannot be built or run in an iOS simulator.

### Step 3: Initialize the SDK

```ts
import {RwfitBle} from 'react-native-rwfit-ble';

await requestRwfitPermissions();
await RwfitBle.init();
```

Call `init()` once per app lifecycle. Subscribe to events before starting a scan
or another asynchronous task.

Run the repository Example:

```sh
# Android
cd example
npm start
# In another terminal; for a USB device, first run adb reverse tcp:8081 tcp:8081
npm run android
```

```sh
# Physical iOS device
cd example/ios
pod install
cd ..
npm start
npm run ios -- --device "Your iPhone Name"
```

---

## 3. API Reference

The following methods, types, and enums are exported from
`react-native-rwfit-ble`.

All request methods return a `Promise` and throw `RwfitError(code, message)` on
failure. Normal read and write methods wait for a device response. Start-only
methods such as scanning, connecting, syncing, and OTA only indicate that the
task was started.

Event subscription methods return a `RwfitSubscription`. Call `remove()` when
the page or component is unmounted:

```ts
useEffect(() => {
  const subscription = RwfitBle.onConnectState(console.log);
  return () => subscription.remove();
}, []);
```

### 3.1 SDK Initialization, Device Discovery, and Connection Management

#### 3.1.1 Initialize the SDK

| Method | Parameters | Return | Description |
|---|---|---|---|
| `init()` | None | `Promise<DynamicMap>` | Initialize the native SDK once per app lifecycle |

```ts
await RwfitBle.init();
```

#### 3.1.2 Start Scanning for Bluetooth Devices

| Method | Parameters | Return | Description |
|---|---|---|---|
| `startScan()` | None | `Promise<DynamicMap>` | Start scanning for supported devices; scanning stops automatically after about 10 seconds |

Subscribe to scan results and scan completion before starting the scan.

```ts
await RwfitBle.startScan();
```

#### 3.1.3 Listen for Scan Results

| Subscription | Payload | Description |
|---|---|---|
| `onScanResult(listener)` | `BleDevice` | Fires once for each discovered device |

```ts
const scanResult = RwfitBle.onScanResult(device => {
  console.log(device.name, device.mac, device.uuid, device.rssi);
});
```

`BleDevice` fields:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Device name |
| `mac` | `string` | Primary Android device identifier |
| `rssi` | `number` | Signal strength |
| `uuid` | `string?` | Primary iOS identifier; preserve it for connection and persistence |

#### 3.1.4 Stop Scanning for Bluetooth Devices

| Method | Parameters | Return | Description |
|---|---|---|---|
| `stopScan()` | None | `Promise<DynamicMap>` | Stop an active scan |

```ts
await RwfitBle.stopScan();
```

#### 3.1.5 Listen for Scan Completion

| Subscription | Payload | Description |
|---|---|---|
| `onScanFinish(listener)` | None | Fires when scanning stops automatically or manually |

```ts
const scanFinish = RwfitBle.onScanFinish(() => {
  console.log('Scan finished');
});
```

#### 3.1.6 Connect to a Device

| Method | Parameters | Return | Description |
|---|---|---|---|
| `connect(device)` | Complete `BleDevice` returned by scanning | `Promise<DynamicMap>` | Start connecting to the device |

Do not construct a partial `BleDevice`. On iOS, preserve the scanned `uuid`
unchanged.

```ts
await RwfitBle.stopScan();
await RwfitBle.connect(device);
```

#### 3.1.7 Query the Connection State

| Method | Parameters | Return | Description |
|---|---|---|---|
| `isConnected()` | None | `Promise<boolean>` | Return whether the BLE link is currently connected |

```ts
const connected = await RwfitBle.isConnected();
```

#### 3.1.8 Listen for Connection State Changes

| Subscription | Payload | Description |
|---|---|---|
| `onConnectState(listener)` | `ConnectStateEvent` | Fires when the connection state changes |

```ts
const connection = RwfitBle.onConnectState(event => {
  console.log(event.state, event.name, event.reason);
});
```

`ConnectStateEvent` fields:

| Field | Type | Description |
|---|---|---|
| `state` | `connecting \| connected \| disconnected \| failed` | Current connection state |
| `name` | `string?` | Device name |
| `mac` | `string?` | MAC address |
| `uuid` | `string?` | iOS device identifier |
| `reason` | `string?` | Connection failure reason |

#### 3.1.9 Listen for Device Readiness and the Function Menu

| Subscription | Payload | Description |
|---|---|---|
| `onFunctionMenu(listener)` | `FunctionMenu` | Fires when the device business channel is ready |

```ts
const ready = RwfitBle.onFunctionMenu(menu => {
  console.log('Device ready', menu.name, menu.raw);
});
```

`FunctionMenu` fields:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Device name |
| `mac` | `string` | MAC address |
| `uuid` | `string?` | iOS device identifier |
| `raw` | `DynamicMap` | Device capability map |
| `supportsWorkout` | `boolean` | Whether workout mode is supported |

The app should use `raw` to hide or disable unsupported features. Common
capability fields are:

| Property | Type | Description |
|---|---|---|
| `isPushMsgEnableSwitch` | `boolean` | Supports the master message-notification switch |
| `pushMsgSwitchValue` | `number` | Supported message types as a low 32-bit mask |
| `pushMsgSwitchValue2` | `number` | Supported message types as a high 32-bit mask |
| `activityDataInterval` | `number` | Daily activity-detail interval in minutes |
| `isAlarm` | `boolean` | Supports alarms |
| `isBrightScreenSleepTime` | `boolean` | Supports the screen sleep schedule |
| `isBrightScreenTime` | `boolean` | Supports screen-on duration settings |
| `isSupportWorkout` | `boolean` | Supports workout mode |
| `isRememberSwitch` | `boolean` | Supports the Muslim remembrance/count switch |
| `isSupportHrReminder` | `boolean` | Supports heart-rate alerts |
| `isSupportBoReminder` | `boolean` | Supports blood-oxygen alerts |
| `isSupportMotoVibrationLevel` | `boolean` | Supports motor vibration levels |
| `isSupportAlarmVibrationDuration` | `boolean` | Supports alarm vibration-count settings |
| `isSupportVibrationInterval` | `boolean` | Supports vibration-interval settings |
| `isStep` | `boolean` | Supports step data |
| `isHr` | `boolean` | Supports heart-rate data |
| `isBloodPress` | `boolean` | Supports blood-pressure data |
| `isSleep` | `boolean` | Supports sleep data |
| `isBloodOxy` | `boolean` | Supports blood-oxygen data |
| `isHrv` | `boolean` | Supports HRV data |
| `isPressure` | `boolean` | Supports stress data |
| `isBloodSugar` | `boolean` | Supports blood-glucose data |
| `isMuslimCountData` | `boolean` | Supports Muslim count data |
| `isBodyTemp` | `boolean` | Supports body-temperature data |
| `isSupportMuslimTimeDisplayMode` | `boolean` | Supports the Muslim time-display mode |
| `isSupportSensorRawPPG` | `boolean` | Supports raw PPG data |
| `isSupportPPGMonitoring` | `boolean` | Supports scheduled PPG monitoring |
| `isSupportTemperatureMonitoring` | `boolean` | Supports scheduled temperature monitoring |
| `isSupportCountReminder` | `boolean` | Supports count-reminder intervals |
| `isSupportSensorRawACC` | `boolean` | Supports raw ACC data |
| `isSupportSensorRawPPGRed` | `boolean` | Supports raw red-light PPG data |
| `isSupportSensorRawIR` | `boolean` | Supports raw infrared data |
| `isSupportSensorRawSleep` | `boolean` | Supports real-time sleep-state data |
| `isSupportFallDetect` | `boolean` | Supports fall-detection alerts |
| `isSupportRecording` | `boolean` | Supports recording |
| `isFindDevice` | `boolean` | Supports Find Device |
| `isTakePhoto` | `boolean` | Supports remote camera control |
| `isLedLight` | `boolean` | Supports LED control |
| `isWearDirection` | `boolean` | Supports wear-hand configuration |
| `isVideoHid` | `boolean` | Supports video HID control |
| `isVideoHidBook` | `boolean` | Supports e-book HID control |
| `isVideoHidMusic` | `boolean` | Supports music HID control |
| `isRaiseBrightScreen` | `boolean` | Supports raise-to-wake |
| `isPowerOff` | `boolean` | Supports power off |
| `isFactoryReset` | `boolean` | Supports factory reset |
| `isPushMessage` | `boolean` | Supports message push |

#### 3.1.10 Disconnect from the Device

| Method | Parameters | Return | Description |
|---|---|---|---|
| `disconnect()` | None | `Promise<DynamicMap>` | Disconnect BLE without deleting the app's saved device |

#### 3.1.11 Reconnect to a Device

| Method | Parameters | Return | Description |
|---|---|---|---|
| `reconnect(device?)` | Optional `BleDevice` | `Promise<DynamicMap>` | Reconnect to a saved device |

Android requires a device containing its MAC address. iOS can use the SDK's saved
binding state. A cross-platform app should always pass the complete device object
persisted by the app.

```ts
await RwfitBle.reconnect(savedDevice);
```

#### 3.1.12 Set the iOS Binding State

| Method | Parameters | Return | Description |
|---|---|---|---|
| `iosSetBindedStatus(isBinded)` | `boolean` | `Promise<DynamicMap>` | Set local iOS binding state; Android no-op |

Set it to `true` after the device is ready. Set it to `false` when switching or
removing the saved device.

#### 3.1.13 Unbind the Device

| Method | Parameters | Return | Description |
|---|---|---|---|
| `unbind()` | None | `Promise<DynamicMap>` | Send the Android unbind command; clear iOS binding state and disconnect |

#### 3.1.14 Read the Function Menu

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getFunctionList()` | None | `Promise<DynamicMap>` | Return an object whose `supportMenu` is the capability map |

Prefer `onFunctionMenu` in the normal flow. Read the menu explicitly only after
the device is connected and ready.

### 3.2 Device Operations

#### 3.2.1 Basic Device Commands

##### 3.2.1.1 Get the Native SDK Version

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getSdkVersion()` | None | `Promise<string>` | Android/iOS native SDK version |

##### 3.2.1.2 Get the React Native Package Version

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getPluginVersion()` | None | `Promise<string>` | Return `0.0.5_nativeSdkVersion` |

##### 3.2.1.3 Set User Information

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setUserInfo(info)` | `UserInfo` | `Promise<DynamicMap>` | Set the user profile stored on the device |

`UserInfo` fields:

| Field | Type | Description |
|---|---|---|
| `gender` | `number` | Gender: 0=female, 1=male |
| `age` | `number` | Age |
| `height` | `number` | Height in cm |
| `weight` | `number` | Weight in kg |

```ts
await RwfitBle.setUserInfo({gender: 1, age: 30, height: 175, weight: 70});
```

##### 3.2.1.4 Get Firmware Information

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getFirmwareVersion()` | None | `Promise<FirmwareInfo>` | Get the device model, firmware version, and UI version |

`FirmwareInfo` contains `deviceClazz`, `deviceNo`, and `uiVersion`.

##### 3.2.1.5 Get Battery Level

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getPower()` | None | `Promise<number>` | Return battery percentage from 0 to 100 |

##### 3.2.1.6 Set the Device Bluetooth Name

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setRingBtName(name)` | Non-empty `string` | `Promise<DynamicMap>` | Set the device Bluetooth name |

##### 3.2.1.7 Get the Video HID Mode

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getVideoHid()` | None | `Promise<number>` | 0=off, 1=video, 2=Book, 3=Music |

##### 3.2.1.8 Set the Video HID Mode

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setVideoHid(hidOpen)` | `0 \| 1 \| 2 \| 3` | `Promise<DynamicMap>` | Set the HID control mode |

Android video and music HID depend on system Bluetooth pairing. A BLE connection
or this method alone does not create the pairing.

##### 3.2.1.9 Create or Remove Android HID Pairing

| Method | Return | Description |
|---|---|---|
| `createOrRemoveBond(type, mac)` | `Promise<boolean>` | Manage Android HID pairing; iOS returns false |

| Parameter | Type | Description |
|---|---|---|
| `type` | `number` | 1=pair, 2=remove pairing |
| `mac` | `string` | Non-empty device MAC address |

##### 3.2.1.10 Get the LED Brightness

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getRingLedLevel()` | None | `Promise<LedLevel>` | Get the LED switch and brightness |

`LedLevel` is `{isOpen: boolean, lcdLevel: number}`. Brightness levels are 1–3.

##### 3.2.1.11 Set the LED Brightness

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setRingLedLevel(config)` | `LedLevel` | `Promise<DynamicMap>` | Set the LED switch and brightness level from 1 to 3 |

##### 3.2.1.12 Get the Wear Hand

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getRingWearDir()` | None | `Promise<boolean>` | `true` means right hand; `false` means left hand |

##### 3.2.1.13 Set the Wear Hand

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setRingWearHand(isRight)` | `boolean` | `Promise<DynamicMap>` | Set left- or right-hand wear |

##### 3.2.1.14 Enter or Exit Camera Mode

| Method | Parameters | Return | Description |
|---|---|---|---|
| `controlPhoto(state)` | 1=enter, 0=exit | `Promise<DynamicMap>` | Control device camera mode |

When the device triggers the shutter, `onTouchEvent` emits
`cameraTakePicture`.

##### 3.2.1.15 Find the Device

| Method | Parameters | Return | Description |
|---|---|---|---|
| `findDevice()` | None | `Promise<DynamicMap>` | Start Find Device; success only means the command was sent |

##### 3.2.1.16 Power Off the Device

| Method | Parameters | Return | Description |
|---|---|---|---|
| `powerOff()` | None | `Promise<DynamicMap>` | Send the device power-off command |

##### 3.2.1.17 Factory Reset the Device

| Method | Parameters | Return | Description |
|---|---|---|---|
| `factoryReset()` | None | `Promise<DynamicMap>` | Send the factory-reset command |

##### 3.2.1.18 Get Alarms

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getAlarm()` | None | `Promise<Alarm[]>` | Get the complete alarm array from the device |

An empty device alarm list is returned as `[]`.

`Alarm` fields:

| Field | Type | Description |
|---|---|---|
| `alarmId` | `number` | Alarm ID; preserve the value when sending back the complete alarm array returned by `getAlarm()` |
| `startHour` | `number` | Hour, 0–23 |
| `startMin` | `number` | Minute, 0–59 |
| `isOpen` | `boolean` | Whether the alarm is enabled |
| `repeats` | `number[]?` | Optional seven-item array ordered Sunday through Saturday; 1=enabled, 0=disabled |

##### 3.2.1.19 Set Alarms

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setAlarm(alarms)` | Complete `Alarm[]` | `Promise<DynamicMap>` | Replace all alarms on the device |

The protocol does not support updating one alarm. Read the complete array, modify
the target object, and send the whole array back.

##### 3.2.1.20 Delete All Alarms

| Method | Parameters | Return | Description |
|---|---|---|---|
| `deleteAllAlarm()` | None | `Promise<DynamicMap>` | Delete every alarm on the device |

##### 3.2.1.21 Get Vibration Count and Level

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getVibrationCount()` | None | `Promise<VibrationConfig>` | Return `{count, level}` |

`count` is 0–6; 0 means no vibration. `level` is 0=off, 1=low, 2=medium,
3=high.

##### 3.2.1.22 Set Vibration Count and Level

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setVibrationCount(config)` | `VibrationConfig` | `Promise<DynamicMap>` | Set `{count, level}` |

##### 3.2.1.23 Get the Screen Sleep Schedule

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getBrightScreenSleepTime()` | None | `Promise<ScheduleToggle>` | Get the screen sleep switch and time range |

##### 3.2.1.24 Set the Screen Sleep Schedule

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setBrightScreenSleepTime(config)` | `ScheduleToggle` | `Promise<DynamicMap>` | Set the screen sleep configuration |

`ScheduleToggle` is `{isOpen, startHour?, startMin?, endHour?, endMin?}`.

##### 3.2.1.25 Push an Android Message

| Method | Parameters | Return | Description |
|---|---|---|---|
| `pushMessage(message)` | `DynamicMap` | `Promise<DynamicMap>` | Push a message on Android; iOS no-op |

Common fields are `appId`, `title`, and `content`, with optional `msgType` and
millisecond timestamp `timeMill`.

##### 3.2.1.26 Set iOS Notification Switches

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setNotificationSwitch(switches)` | `DynamicMap` | `Promise<DynamicMap>` | Set iOS ANCS switches; Android no-op |

Common keys include `isCall`, `isSMS`, `isWechat`, `isQQ`, `isWhatsapp`,
`isFacebook`, `isInstagram`, and `isOther`.

##### 3.2.1.27 Get iOS Notification Switches

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getNotificationSwitch()` | None | `Promise<DynamicMap>` | Get iOS ANCS switches; Android returns an empty object |

##### 3.2.1.28 Send a Call-Control State to the Device

| Method | Parameters | Return | Description |
|---|---|---|---|
| `controlPhone(action)` | `CallControlAction.Answer` or `Reject` | `Promise<DynamicMap>` | Android call control; iOS no-op |

##### 3.2.1.29 Listen for Device Call Control

| Subscription | Payload | Description |
|---|---|---|
| `onCallControl(listener)` | `CallControlEvent` | Fires when the device answers or rejects a call on Android |

The payload is `{action, rawValue}`.

##### 3.2.1.30 Listen for Touch and Music-Control Events

| Subscription | Payload | Description |
|---|---|---|
| `onTouchEvent(listener)` | `TouchEvent` | Camera, music, tap, swing, and fall events |

`TouchEvent.action` can be `cameraTakePicture`, `musicPlay`, `musicPause`,
`musicPrev`, `musicNext`, `musicVolumeUp`, `musicVolumeDown`, `singleTap`,
`doubleTap`, `tripleTap`, `longPress`, `swing`, `fallDetected`, or `unknown`.
Camera actions are supported on both platforms. Music control depends on system
capabilities and is currently supported only on Android.

##### 3.2.1.31 Get the Muslim Count Switch

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getMuslimCountEnabled()` | None | `Promise<boolean>` | Return whether the Muslim remembrance counter is enabled |

##### 3.2.1.32 Set the Muslim Count Switch

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setMuslimCountEnabled(enabled)` | `boolean` | `Promise<DynamicMap>` | Enable or disable the Muslim remembrance counter |

##### 3.2.1.33 Get Heart-Rate Alert Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getHeartRateAlert()` | None | `Promise<HeartRateAlertConfig>` | Get high- and low-heart-rate alert configuration |

The configuration is `{isOpen, highThreshold, lowThreshold?}`. Both
`highThreshold` and `lowThreshold` must be in the range 0–254.

##### 3.2.1.34 Set Heart-Rate Alert Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setHeartRateAlert(config)` | `HeartRateAlertConfig` | `Promise<DynamicMap>` | Set high- and low-heart-rate thresholds |

##### 3.2.1.35 Get Blood-Oxygen Alert Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getBloodOxygenAlert()` | None | `Promise<BloodOxygenAlertConfig>` | Get low-blood-oxygen alert configuration |

The configuration is `{isOpen, lowThreshold}`. `lowThreshold` must be in the
range 0–254.

##### 3.2.1.36 Set Blood-Oxygen Alert Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setBloodOxygenAlert(config)` | `BloodOxygenAlertConfig` | `Promise<DynamicMap>` | Set the low-blood-oxygen threshold |

##### 3.2.1.37 Listen for Real-Time Health Alerts

| Subscription | Payload | Description |
|---|---|---|
| `onHealthAlert(listener)` | `HealthAlertEvent` | Reports real-time high/low heart-rate and low-blood-oxygen alerts |

The payload is `{type, rawType, value}`.

##### 3.2.1.38 Get the Screen-On Duration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getBrightScreenTime()` | None | `Promise<number>` | Get the screen-on duration in seconds |

##### 3.2.1.39 Set the Screen-On Duration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setBrightScreenTime(timeSecond)` | 0–255 | `Promise<DynamicMap>` | Set the screen-on duration in seconds |

##### 3.2.1.40 Get Raise-to-Wake Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getRaiseBrightScreen()` | None | `Promise<ScheduleToggle>` | Get the raise-to-wake switch and schedule |

##### 3.2.1.41 Set Raise-to-Wake Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setRaiseBrightScreen(config)` | `ScheduleToggle` | `Promise<DynamicMap>` | Set the raise-to-wake switch and schedule |

##### 3.2.1.42 Set the 12/24-Hour Time Format

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setTimeFormat(format)` | 0=24-hour, 1=12-hour | `Promise<DynamicMap>` | Set the device time-display format |

##### 3.2.1.43 Get the Alarm Vibration Duration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getAlarmVibrationDuration()` | None | `Promise<number>` | Get the alarm vibration count, 0–6 |

The value represents a vibration count, not seconds or another unit of time.

##### 3.2.1.44 Set the Alarm Vibration Duration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setAlarmVibrationDuration(duration)` | Integer 0–6 | `Promise<DynamicMap>` | Set the alarm vibration count; 0 means no vibration |

##### 3.2.1.45 Get the Vibration Interval

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getVibrationInterval()` | None | `Promise<number>` | Get the vibration interval in ms |

##### 3.2.1.46 Set the Vibration Interval

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setVibrationInterval(intervalMs)` | 100–1000 ms | `Promise<DynamicMap>` | Set the vibration interval |

##### 3.2.1.47 Start Heart-Rate Calibration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `startHeartRateCalibration()` | None | `Promise<DynamicMap>` | Start heart-rate calibration; the result is delivered by an event |

##### 3.2.1.48 Listen for Heart-Rate Calibration Results

| Subscription | Payload | Description |
|---|---|---|
| `onHeartRateCalibration(listener)` | `HeartRateCalibrationResult` | Return the calibration mode, result, and completion state |

The payload is `{testMode, result, isCalibrating, isCompleted}`.

##### 3.2.1.49 Get the Fall-Detection State

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getFallDetect()` | None | `Promise<boolean>` | Get the fall-detection alert switch |

##### 3.2.1.50 Set the Fall-Detection State

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setFallDetect(enabled)` | `boolean` | `Promise<DynamicMap>` | Enable or disable fall-detection alerts |

##### 3.2.1.51 Get the Count-Reminder Interval

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getCountReminderInterval()` | None | `Promise<number>` | Get the count-reminder interval in minutes |

##### 3.2.1.52 Set the Count-Reminder Interval

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setCountReminderInterval(minutes)` | 0/30/60/90/120 | `Promise<DynamicMap>` | 0 disables the reminder |

#### 3.2.2 Health Data (Real-Time and All-Day Monitoring)

##### 3.2.2.1 Start Real-Time Health Measurement

| Method | Parameters | Return | Description |
|---|---|---|---|
| `startRealtimeMeasure(metric)` | `RealtimeMetric` | `Promise<DynamicMap>` | Start measuring the specified health metric |

`RealtimeMetric` supports `Hr`, `BloodOxy`, `Hrv`, `Pressure`, `BloodSugar`,
`BloodPressure`, and `Temperature`. Only one real-time measurement can run at a
time. Stop the current metric before switching.

##### 3.2.2.2 Stop Real-Time Health Measurement

| Method | Parameters | Return | Description |
|---|---|---|---|
| `stopRealtimeMeasure(metric)` | Same `RealtimeMetric` used to start | `Promise<DynamicMap>` | Stop measuring the specified health metric |

##### 3.2.2.3 Listen for Real-Time Health Data

| Subscription | Payload | Description |
|---|---|---|
| `onRealtimeData(listener)` | `RealtimeData` | Continuously reports data during measurement |

`RealtimeData` fields:

| Field | Type | Description |
|---|---|---|
| `type` | `HealthType \| null` | Health data type |
| `value` | `number` | Primary value |
| `diastolic` | `number?` | Diastolic value for blood pressure |
| `timestampSec` | `number` | Unix seconds |

`HealthType` numeric values:

| Enum | Value | Description |
|---|---:|---|
| `HealthType.Hr` | 1 | Heart rate |
| `HealthType.BloodOxy` | 3 | Blood oxygen |
| `HealthType.BloodPressure` | 4 | Blood pressure |
| `HealthType.Pressure` | 8 | Stress |
| `HealthType.BloodSugar` | 9 | Blood glucose |
| `HealthType.MuslimCount` | 10 | Muslim remembrance count |
| `HealthType.Temperature` | 11 | Body temperature |
| `HealthType.Hrv` | 13 | HRV |

`timestampSec` is a Unix timestamp in seconds. Multiply it by `1000` when a
JavaScript timestamp in milliseconds is required.

##### 3.2.2.4 Listen for Single-Measurement Completion

| Subscription | Payload | Description |
|---|---|---|
| `onRealtimeMeasureComplete(listener)` | None | Fires when a single health measurement finishes |

##### 3.2.2.5 All-Day Monitoring Configuration

Every scheduled-monitoring get method returns `Promise<TimedConfig>`, and every
set method accepts `TimedConfig`:

| Field | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Whether monitoring is enabled |
| `duration` | `number?` | Optional interval; only 30 or 60 minutes is allowed, defaulting to 60 |
| `startHour` | `number?` | Optional start hour; defaults to 0 |
| `startMin` | `number?` | Optional start minute; defaults to 0 |
| `endHour` | `number?` | Optional end hour; defaults to 23 |
| `endMin` | `number?` | Optional end minute; defaults to 59 |

The usual time range is `00:00–23:59`. When changing a configuration, first read
the current value and use object spread to replace only the required fields.

##### 3.2.2.6 Get Scheduled Heart-Rate Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getTimedHeartRate()` | None | `Promise<TimedConfig>` | Get scheduled heart-rate configuration |

##### 3.2.2.7 Set Scheduled Heart-Rate Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setTimedHeartRate(config)` | `TimedConfig` | `Promise<DynamicMap>` | Only 30 or 60 minutes is allowed; the default is 60 |

##### 3.2.2.8 Get Scheduled Blood-Oxygen Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getTimedBloodOxygen()` | None | `Promise<TimedConfig>` | Get scheduled blood-oxygen configuration |

##### 3.2.2.9 Set Scheduled Blood-Oxygen Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setTimedBloodOxygen(config)` | `TimedConfig` | `Promise<DynamicMap>` | Only 30 or 60 minutes is allowed; the default is 60 |

##### 3.2.2.10 Get Scheduled HRV Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getTimedHRV()` | None | `Promise<TimedConfig>` | Get scheduled HRV configuration |

##### 3.2.2.11 Set Scheduled HRV Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setTimedHRV(config)` | `TimedConfig` | `Promise<DynamicMap>` | Only 30 or 60 minutes is allowed; the default is 60 |

##### 3.2.2.12 Get Scheduled Stress Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getTimedStress()` | None | `Promise<TimedConfig>` | Get scheduled stress configuration |

##### 3.2.2.13 Set Scheduled Stress Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setTimedStress(config)` | `TimedConfig` | `Promise<DynamicMap>` | Only 30 or 60 minutes is allowed; the default is 60 |

##### 3.2.2.14 Get Scheduled Blood-Glucose Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getTimedBloodSugar()` | None | `Promise<TimedConfig>` | Get scheduled blood-glucose configuration |

##### 3.2.2.15 Set Scheduled Blood-Glucose Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setTimedBloodSugar(config)` | `TimedConfig` | `Promise<DynamicMap>` | Only 30 or 60 minutes is allowed; the default is 60 |

##### 3.2.2.16 Get Scheduled Blood-Pressure Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getTimedBloodPressure()` | None | `Promise<TimedConfig>` | Get scheduled blood-pressure configuration |

##### 3.2.2.17 Set Scheduled Blood-Pressure Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setTimedBloodPressure(config)` | `TimedConfig` | `Promise<DynamicMap>` | Only 30 or 60 minutes is allowed; the default is 60 |

##### 3.2.2.18 Get Scheduled Body-Temperature Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getTimedBodyTemperature()` | None | `Promise<TimedConfig>` | Get scheduled body-temperature configuration |

##### 3.2.2.19 Set Scheduled Body-Temperature Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setTimedBodyTemperature(config)` | `TimedConfig` | `Promise<DynamicMap>` | Only 30 or 60 minutes is allowed; the default is 60 |

##### 3.2.2.20 Get Scheduled PPG Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getTimedPPG()` | None | `Promise<TimedConfig>` | Get scheduled PPG monitoring configuration |

##### 3.2.2.21 Set Scheduled PPG Configuration

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setTimedPPG(config)` | `TimedConfig` | `Promise<DynamicMap>` | Only 30 or 60 minutes is allowed; the default is 60 |

Scheduled PPG data may be overwritten by the next measurement. After receiving
`onSensorRawStopped`, call `getSensorRawHistory()` and persist the result promptly.

##### 3.2.2.22 Start Health-History Synchronization

| Method | Parameters | Return | Description |
|---|---|---|---|
| `syncAllHealthData()` | None | `Promise<DynamicMap>` | Start synchronization of all historical health data |

Subscribe to all synchronization events below before calling this method.

##### 3.2.2.23 Listen for Synchronization Progress

| Subscription | Payload | Description |
|---|---|---|
| `onSyncProgress(listener)` | `number` | Reliably emits only 100, indicating synchronization completion |

##### 3.2.2.24 Listen for Synchronization Data Batches

| Subscription | Payload | Description |
|---|---|---|
| `onSyncResult(listener)` | `SyncResult` | Returns `{type, data}` for each batch |

`type` can be `step`, `sleep`, `hr`, `bo`, `bp`, `hrv`, `pressure`,
`bloodSugar`, `temp`, or `muslimCount`.

Step and Muslim count data include daily totals and all detail items for that day:

| `type` | Daily object fields | `items` fields |
|---|---|---|
| `step` | `time`, `date`, `totalSteps`, `totalCalorie`, `totalDistance`, `activityDataInterval`, `items` | `time`, `index`, `steps`, `calorie`, `distance` |
| `muslimCount` | `time`, `date`, `totalCount`, `items` | `time`, `count` |

##### 3.2.2.25 Listen for Synchronization Completion

| Subscription | Payload | Description |
|---|---|---|
| `onSyncFinish(listener)` | None | All historical health-data synchronization is complete |

##### 3.2.2.26 Listen for Synchronization Failure

| Subscription | Payload | Description |
|---|---|---|
| `onSyncError(listener)` | `{code, message?}` | Health-data synchronization failed |

##### 3.2.2.27 Stop Forwarding Health Synchronization Events

| Method | Parameters | Return | Description |
|---|---|---|---|
| `removeHealthDataCallback()` | None | `Promise<DynamicMap>` | Stop further health synchronization event callbacks |

##### 3.2.2.28 Historical Health-Data Units

- All time fields use Unix seconds.
- Heart rate: bpm.
- Blood oxygen: percentage.
- Blood pressure: mmHg.
- HRV: ms.
- Distance: m.
- Historical temperature: raw `temp / 10` in degrees Celsius.
- Historical sleep `sleepType`: 0=awake, 1=light, 2=deep, 3=REM.

#### 3.2.3 OTA Upgrade

##### 3.2.3.1 Get Available Firmware

The list of available firmware can be retrieved from the following endpoint:

```http
GET https://ruiwo168.com/api/device/getOtaListByModel?model=<deviceClazz>
```

The `model` query parameter corresponds to the `deviceClazz` returned by
`getFirmwareVersion()`. Read the device firmware information first and pass its
actual `deviceClazz` as `model`:

```ts
const firmwareInfo = await RwfitBle.getFirmwareVersion();
const response = await fetch(
  `https://ruiwo168.com/api/device/getOtaListByModel?model=${encodeURIComponent(firmwareInfo.deviceClazz)}`,
);
const result = await response.json();
```

Example response:

```json
{
  "code": 0,
  "msg": "Success",
  "data": [
    {
      "deviceModel": "DEVICE_MODEL",
      "toVersion": "X.Y.Z",
      "size": 123456,
      "downloadUrl": "https://example.com/path/firmware.bin"
    }
  ]
}
```

Only the following fields in `data` are required for the OTA workflow. Other
fields can be ignored:

| Field | Type | Description |
|---|---|---|
| `deviceModel` | `string` | Device model supported by the firmware; it must exactly match the `deviceClazz` returned by `getFirmwareVersion()` |
| `toVersion` | `string` | Version of the firmware package referenced by `downloadUrl` |
| `size` | `number` | Firmware file size in bytes |
| `downloadUrl` | `string` | Firmware file download URL |

The device's current firmware version is the `deviceNo` returned by
`getFirmwareVersion()`, and the target version is the `toVersion` returned by
the endpoint. The app must compare them when selecting firmware and allow an
upgrade only when `toVersion` is newer than `deviceNo`. For versions in `X.Y.Z`
format, compare each segment numerically instead of comparing the raw strings.
If a version does not follow the expected format or cannot be compared, stop the
upgrade and verify the version information.

The app must validate the model and compare the versions before calling
`ringOta(path)`. `ringOta(path)` only receives the local firmware-file path and
starts OTA; it does not validate `deviceModel`, `deviceClazz`, `toVersion`, or
`deviceNo`.

If the customer manages firmware upgrades on their own server, they can download
the corresponding `.bin` package from `downloadUrl`, store it on their server,
and maintain the mapping between `deviceModel`, `toVersion`, and the firmware
package. `toVersion` is the version of that firmware package.

Download the firmware from `downloadUrl` to the app's local storage, then pass
the local file path to `ringOta(path)`. Before starting OTA, verify again that
`deviceModel` exactly matches the device's `deviceClazz`.

##### 3.2.3.2 Start OTA

| Method | Parameters | Return | Description |
|---|---|---|---|
| `ringOta(path)` | Local firmware file path | `Promise<DynamicMap>` | Submit an OTA task; this does not mean the upgrade is complete |

Use only firmware provided by the endpoint above. Before upgrading, call
`getFirmwareVersion()` and verify that `deviceClazz` exactly matches the model
supported by the firmware. Before calling `ringOta(path)`, the app must also
confirm that `toVersion` is newer than the current `deviceNo`.

##### 3.2.3.3 Listen for OTA Progress

| Subscription | Payload | Description |
|---|---|---|
| `onOtaProgress(listener)` | `number` | Normalized to 0–1 on both Android and iOS |

##### 3.2.3.4 Listen for OTA Completion

| Subscription | Payload | Description |
|---|---|---|
| `onOtaFinish(listener)` | `OtaResult` | `{success, code?}` |

#### 3.2.4 Workout

Show workout features only when `FunctionMenu.supportsWorkout === true`.

##### 3.2.4.1 Get Device Workout State

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getWorkoutState()` | None | `Promise<WorkoutState>` | Get the current workout type and control state |

`WorkoutState` is `{sportType, controlType, isRunning}`.

##### 3.2.4.2 Control a Device Workout

| Method | Parameters | Return | Description |
|---|---|---|---|
| `controlWorkout(sportType, controlType)` | Sport type 7–161; control enum | `Promise<DynamicMap>` | Start, resume, pause, or end a workout |

`WorkoutControlType` is `Start(1)`, `Resume(2)`, `Pause(3)`, or `End(4)`.
Closing the app or disconnecting does not end a workout on the device.

##### 3.2.4.3 Enable or Disable Real-Time Workout Data

| Method | Parameters | Return | Description |
|---|---|---|---|
| `setWorkoutRealtimeEnabled(enabled)` | `boolean` | `Promise<DynamicMap>` | Enable on the workout page and disable when leaving it |

##### 3.2.4.4 Listen for Real-Time Workout Data

| Subscription | Payload | Description |
|---|---|---|
| `onWorkoutRealtimeData(listener)` | `WorkoutRealtimeData` | Continuously reports data during a workout |

The payload contains `duration`, `steps`, `distance`, `calorie`, `heartRate`,
`dataType`, and `rawDataType`.

##### 3.2.4.5 Get Workout Reports

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getWorkoutReports()` | None | `Promise<WorkoutReport[]>` | Get historical workout reports stored on the device |

The device saves a historical report only after a workout lasts approximately
two minutes. Reports include start/end time, sport type, duration, steps,
distance, calories, heart-rate statistics, pace, and split arrays.

#### 3.2.5 Raw Sensor Data

##### 3.2.5.1 Start or Stop Raw Sensor Collection

| Method | Parameters | Return | Description |
|---|---|---|---|
| `controlSensorRaw(enabled, selection)` | Switch and `SensorRawSelection` | `Promise<DynamicMap>` | Start or stop the selected sensor combination |

Valid combinations:

- `Acc(1)`
- `PpgGreen(2)`
- `PpgGreenAndAcc(3)`
- `PpgRed(4)`
- `PpgRedAndAcc(5)`
- `PpgGreenAndIr(10)`
- `PpgGreenAccAndIr(11)`
- `PpgRedAndIr(12)`
- `PpgRedAccAndIr(13)`

Green and red PPG cannot be collected together, and IR cannot run alone.

##### 3.2.5.2 Listen for Real-Time Raw Data

| Subscription | Payload | Description |
|---|---|---|
| `onSensorRawData(listener)` | `SensorRawPacket` | Reports real-time PPG, ACC, red, IR, or sleep data |

`SensorRawPacket` contains `type`, `rawType`, `sequence?`, `timestampSec?`,
`ppg[]`, `acc[{x,y,z}]`, `ppgRed[]`, `ir[]`, and `sleep[]`.

##### 3.2.5.3 Get Historical Raw Data

| Method | Parameters | Return | Description |
|---|---|---|---|
| `getSensorRawHistory()` | None | `Promise<SensorRawPacket[]>` | Synchronize raw data packets stored by the device |

##### 3.2.5.4 Listen for the Device Stopping Collection

| Subscription | Payload | Description |
|---|---|---|
| `onSensorRawStopped(listener)` | `SensorRawStoppedEvent` | Returns `{reason}` when the device stops collection |

##### 3.2.5.5 Raw Sleep-State Data

Raw sleep `mode` values are 17=start, 34=end, 1=deep, 2=light, 3=awake, and
4=REM. These values differ from historical sleep `sleepType`; do not mix them.

---

## 4. Appendix

### 4.1 Error Handling

```ts
import {RwfitBle, RwfitError} from 'react-native-rwfit-ble';

try {
  const power = await RwfitBle.getPower();
  console.log(`Battery ${power}%`);
} catch (error) {
  if (error instanceof RwfitError) {
    console.error(error.code, error.message);
  } else {
    console.error(error);
  }
}
```

Write operations usually return `Promise<DynamicMap>` and their successful
result can be ignored. Read operations return explicit TypeScript types.

### 4.2 Key Constraints

| Constraint | Requirement |
|---|---|
| Device readiness | Wait for `onFunctionMenu`; do not rely only on `connected` |
| Subscription lifecycle | Subscribe before starting a task and call `remove()` on unmount |
| Real-time measurement | Run only one metric at a time; stop it before switching |
| Alarms | Every change is a full-array replacement |
| Capability gating | Use `FunctionMenu.raw` to show, hide, or disable features |
| Android permissions | Request scan and connection permissions at runtime on Android 12+ |
| iOS identifier | Preserve the scanned UUID and set binding state before reconnection |
| OTA | Verify that the device model matches the firmware's supported model |
| Platform-specific APIs | A no-op success does not mean the other platform performed an equivalent system operation |

### 4.3 Device Persistence and Reconnection

The package does not persist devices for the app. Recommended flow:

1. When `onFunctionMenu` fires, save `{name, mac, uuid, rssi}`.
2. After the device is ready on iOS, call `iosSetBindedStatus(true)`.
3. On the next launch, read the saved object and call `reconnect(savedDevice)`.
4. Before switching devices, call `iosSetBindedStatus(false)` and clear the
   app's saved value.
5. A normal `disconnect()` does not remove the saved value, so the device can be
   reconnected later.

Android primarily uses the MAC address. On iOS, preserve the UUID returned by
scanning.

### 4.4 Complete Scan and Connection Example

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
    console.log('Scan finished');
  });

  const connection = RwfitBle.onConnectState(event => {
    console.log('Connection state', event.state, event.reason);
  });

  const ready = RwfitBle.onFunctionMenu(async menu => {
    console.log('Device ready', menu.name, menu.raw);
    await RwfitBle.iosSetBindedStatus(true);
    console.log('Battery', await RwfitBle.getPower());
  });

  await RwfitBle.startScan();

  // A production app should wait for the user to select a scan result.
  // This delay only demonstrates the call order.
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

### 4.5 Technical Support

`developer@dhouse88.com`
