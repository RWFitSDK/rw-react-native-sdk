# RWFIT Ring React Native SDK — Integration Guide

This guide is for app developers integrating `react-native-rwfit-ble`. It covers
the complete initialize → scan → connect → ready → command flow. See `example/`
for a runnable application.

## 1. Support and delivery

| Item | Value |
|---|---|
| Package version | `0.0.5` |
| Native SDK version | `RW_SDK_V2.0.0_20260724` on Android and iOS |
| React Native | `0.86.x`, New Architecture / TurboModule only |
| Node.js | `22.11.0+` |
| Android | minSdk 26, compileSdk 36 |
| iOS | iOS 15.1+, arm64 physical devices only |
| Delivery | GitHub repository, pinned by git tag |
| Native SDKs | Bundled Android AAR and iOS `DHBleSDK.framework` |

The public API normalizes method names, fields, units, errors, and events across
Android and iOS. Notifications remain platform-specific: Android pushes messages
from the app, while iOS uses ANCS.

## 2. Installation

### 2.1 Run the example

The repository includes a preconfigured runnable example:

```sh
git clone https://github.com/RWFitSDK/rw-react-native-sdk.git
cd rw-react-native-sdk
npm install
npm run prepare

cd example
npm install
```

Android:

```sh
npm start
# In another terminal; for a USB device first run:
adb reverse tcp:8081 tcp:8081
npm run android
```

iOS physical device:

```sh
cd ios
pod install
cd ..
npm start
npm run ios -- --device "Your iPhone Name"
```

### 2.2 Add the SDK to a React Native app

Install and pin a GitHub release tag:

```sh
npm install github:RWFitSDK/rw-react-native-sdk#v0.0.5
```

Equivalent `package.json` entry:

```json
{
  "dependencies": {
    "react-native-rwfit-ble": "github:RWFitSDK/rw-react-native-sdk#v0.0.5"
  }
}
```

To upgrade, change the tag to the target release and run `npm install` again.

React Native Autolinking registers both native implementations. Do not manually
register an Android package or iOS pod.

### 2.3 Android

Set the app's minimum SDK to 26 or higher. The library manifest contributes the
Bluetooth and location permissions, but the app must still request runtime
permissions:

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
  if (permissions.some(
    permission => result[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  )) {
    throw new Error('RWFIT Bluetooth permission denied');
  }
}
```

The SDK loads its bundled AAR by relative path. The host app does not need an
additional Maven repository.

### 2.4 iOS

Run `pod install`, then add a Bluetooth usage description to the app's
`Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Bluetooth is required to discover and connect to RWFIT devices</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Bluetooth is required to discover and connect to RWFIT devices</string>
```

The current vendor framework contains only an iPhoneOS arm64 slice. Build and
test on a physical device; the iOS Simulator is not supported.

## 3. Calling conventions

### 3.1 Promises and errors

All requests return promises. Native calls return `{code, msg, ...}`; the
public facade throws `RwfitError` whenever `code !== 0`:

```ts
import {RwfitBle, RwfitError} from 'react-native-rwfit-ble';

try {
  console.log(await RwfitBle.getPower());
} catch (error) {
  if (error instanceof RwfitError) {
    console.error(error.code, error.message, error.nativeCode);
  }
}
```

Read methods return typed values. Write methods generally return
`Promise<DynamicMap>`; applications can normally ignore the success map.

### 3.2 Event subscriptions

Each `onXxx(listener)` returns a `RwfitSubscription`. Remove it when the screen
or owning service is disposed:

```ts
useEffect(() => {
  const subscription = RwfitBle.onConnectState(console.log);
  return () => subscription.remove();
}, []);
```

Subscribe before starting scan, connection, measurement, sync, or OTA tasks.

### 3.3 Device-ready signal

A `connected` state means the BLE link is established. Business commands must
wait until `onFunctionMenu` fires; that event is the device-ready signal.

## 4. Scan and connect

```ts
import {RwfitBle, type BleDevice} from 'react-native-rwfit-ble';

export async function scanAndConnect(): Promise<() => void> {
  await RwfitBle.init();

  let selected: BleDevice | undefined;
  const scan = RwfitBle.onScanResult(device => {
    console.log(device.name, device.mac, device.uuid, device.rssi);
    selected ??= device;
  });
  const connection = RwfitBle.onConnectState(event => {
    console.log(event.state, event.reason);
  });
  const ready = RwfitBle.onFunctionMenu(async menu => {
    await RwfitBle.iosSetBindedStatus(true);
    console.log('Device ready', menu.name, await RwfitBle.getPower());
  });

  await RwfitBle.startScan();
  // A production app should wait for the user to select a scan result.
  await new Promise(resolve => setTimeout(resolve, 3000));
  if (selected) {
    await RwfitBle.stopScan();
    await RwfitBle.connect(selected);
  }

  return () => {
    scan.remove();
    connection.remove();
    ready.remove();
  };
}
```

`BleDevice` fields:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Device name |
| `mac` | `string` | Primary Android device identifier |
| `rssi` | `number` | Signal strength |
| `uuid` | `string?` | Primary iOS identifier; preserve it for connection and persistence |

## 5. API reference

All methods, types, and enums below are exported from
`react-native-rwfit-ble`.

### 5.1 Initialization and connection

| Method | Return / purpose |
|---|---|
| `init()` | Initialize once per app lifecycle |
| `getSdkVersion()` | Native SDK version |
| `getPluginVersion()` | `0.0.5_nativeSdkVersion` |
| `startScan()` / `stopScan()` | Start/stop scanning; auto-stop is about 10 seconds |
| `connect(device)` | Connect the complete scanned `BleDevice` |
| `disconnect()` | Disconnect without deleting app persistence |
| `reconnect(device?)` | Android needs a device with MAC; iOS can use bind state |
| `isConnected()` | Current BLE connection state |
| `iosSetBindedStatus(isBinded)` | iOS bind state; Android no-op |
| `unbind()` | Android unbind command; iOS clears bind state and disconnects |

`ConnectStateEvent` fields:

| Field | Type | Description |
|---|---|---|
| `state` | `connecting \| connected \| disconnected \| failed` | Current connection state |
| `name` | `string?` | Device name |
| `mac` | `string?` | MAC address |
| `uuid` | `string?` | iOS device identifier |
| `reason` | `string?` | Connection failure reason |

### 5.2 Capability and device information

| Method | Return / purpose |
|---|---|
| `getFunctionList()` | Capability map under `supportMenu` |
| `getPower()` | Battery percentage, 0–100 |
| `getFirmwareVersion()` | `deviceClazz`, `deviceNo`, and `uiVersion` |
| `setUserInfo(info)` | Gender, age, height in cm, weight in kg |
| `setTimeFormat(format)` | 0=24-hour, 1=12-hour |
| `setRingBtName(name)` | Set the Bluetooth device name |

`FunctionMenu` fields:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Device name |
| `mac` | `string` | MAC address |
| `uuid` | `string?` | iOS device identifier |
| `raw` | `DynamicMap` | Device capability map |
| `supportsWorkout` | `boolean` | Whether workout mode is supported |

The app should use `raw` to hide or disable features that the device does not
support. Common capability fields are:

| Field | Type | Description |
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
| `isSupportMotoVibrationLevel` | `boolean` | Supports motor vibration-level settings |
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
| `isSupportMuslimTimeDisplayMode` | `boolean` | Supports the Muslim time display mode |
| `isSupportSensorRawPPG` | `boolean` | Supports raw PPG data |
| `isSupportPPGMonitoring` | `boolean` | Supports scheduled PPG monitoring |
| `isSupportTemperatureMonitoring` | `boolean` | Supports scheduled temperature monitoring |
| `isSupportCountReminder` | `boolean` | Supports count-reminder interval settings |
| `isSupportSensorRawACC` | `boolean` | Supports raw accelerometer data |
| `isSupportSensorRawPPGRed` | `boolean` | Supports raw red-light PPG data |
| `isSupportSensorRawIR` | `boolean` | Supports raw infrared data |
| `isSupportSensorRawSleep` | `boolean` | Supports real-time sleep-state data |
| `isSupportFallDetect` | `boolean` | Supports fall-detection alerts |
| `isSupportRecording` | `boolean` | Supports recording |
| `isFindDevice` | `boolean` | Supports finding the device |
| `isTakePhoto` | `boolean` | Supports remote camera control |
| `isLedLight` | `boolean` | Supports LED control |
| `isWearDirection` | `boolean` | Supports wearing-direction settings |
| `isVideoHid` | `boolean` | Supports video HID control |
| `isVideoHidBook` | `boolean` | Supports e-book HID control |
| `isVideoHidMusic` | `boolean` | Supports music HID control |
| `isRaiseBrightScreen` | `boolean` | Supports raise-to-wake |
| `isPowerOff` | `boolean` | Supports power-off control |
| `isFactoryReset` | `boolean` | Supports factory reset |
| `isPushMessage` | `boolean` | Supports message forwarding |

`UserInfo` fields:

| Field | Type | Description |
|---|---|---|
| `gender` | `number` | Gender: 0=female, 1=male |
| `age` | `number` | Age |
| `height` | `number` | Height in cm |
| `weight` | `number` | Weight in kg |

### 5.3 Timed monitoring

Each get method returns `TimedConfig`; each set method accepts it:

| Get / set | Purpose |
|---|---|
| `getTimedHeartRate()` / `setTimedHeartRate(c)` | Heart rate, 30 or 60 minutes |
| `getTimedBloodOxygen()` / `setTimedBloodOxygen(c)` | Blood oxygen, 60 minutes |
| `getTimedHRV()` / `setTimedHRV(c)` | HRV, 60 minutes |
| `getTimedStress()` / `setTimedStress(c)` | Stress, 60 minutes |
| `getTimedBloodSugar()` / `setTimedBloodSugar(c)` | Blood sugar, 60 minutes |
| `getTimedBloodPressure()` / `setTimedBloodPressure(c)` | Blood pressure, 60 minutes |
| `getTimedBodyTemperature()` / `setTimedBodyTemperature(c)` | Temperature, 30 or 60 minutes |
| `getTimedPPG()` / `setTimedPPG(c)` | Timed PPG; read current config first |

`TimedConfig` fields:

| Field | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Whether monitoring is enabled |
| `duration` | `number?` | Optional interval in minutes; see each method for its limits |
| `startHour` | `number?` | Optional start hour; normally 0 for all-day monitoring |
| `startMin` | `number?` | Optional start minute; normally 0 for all-day monitoring |
| `endHour` | `number?` | Optional end hour; normally 23 for all-day monitoring |
| `endMin` | `number?` | Optional end minute; normally 59 for all-day monitoring |

The bridge normalizes the monitoring window to `00:00–23:59`.

```ts
const current = await RwfitBle.getTimedHeartRate();
await RwfitBle.setTimedHeartRate({...current, isOpen: true, duration: 30});
```

The device may overwrite timed PPG raw data with the next measurement. After
`onSensorRawStopped`, call `getSensorRawHistory()` promptly and persist it.

### 5.4 Real-time measurement

Use `startRealtimeMeasure(metric)`, `stopRealtimeMeasure(metric)`,
`onRealtimeData`, and `onRealtimeMeasureComplete`.

`RealtimeMetric` values are `Hr`, `BloodOxy`, `Hrv`, `Pressure`, `BloodSugar`,
`BloodPressure`, and `Temperature`. Only one metric can run at a time; stop it
before switching.

`RealtimeData` fields:

| Field | Type | Description |
|---|---|---|
| `type` | `HealthType \| null` | Health data type |
| `value` | `number` | Primary measurement value |
| `diastolic` | `number?` | Optional diastolic value for blood-pressure measurements |
| `timestampSec` | `number` | Unix timestamp in seconds |
| `timestampMs` | `number` | Compatibility timestamp in milliseconds |

`HealthType` numeric values are:

| Enum | Value | Meaning |
|---|---:|---|
| `HealthType.Hr` | 1 | Heart rate |
| `HealthType.BloodOxy` | 3 | Blood oxygen |
| `HealthType.BloodPressure` | 4 | Blood pressure |
| `HealthType.Pressure` | 8 | Stress |
| `HealthType.BloodSugar` | 9 | Blood sugar |
| `HealthType.MuslimCount` | 10 | Muslim/prayer count |
| `HealthType.Temperature` | 11 | Body temperature |
| `HealthType.Hrv` | 13 | HRV |

New code should prefer `timestampSec`. The exported `timestampMs(data)` helper
converts Unix seconds to milliseconds.

### 5.5 Workout

Enable workout features only when `FunctionMenu.supportsWorkout` is true.

| Method / event | Purpose |
|---|---|
| `getWorkoutState()` | Current sport, control state, and `isRunning` |
| `controlWorkout(sportType, controlType)` | Sport 7–161; start/resume/pause/end |
| `setWorkoutRealtimeEnabled(enabled)` | Enable while the workout screen is active |
| `onWorkoutRealtimeData(listener)` | Duration, steps, distance, calories, heart rate |
| `getWorkoutReports()` | Saved `WorkoutReport[]` |

`WorkoutControlType` values are `Start(1)`, `Resume(2)`, `Pause(3)`, and
`End(4)`. Closing the app or disconnecting does not end a device workout.

### 5.6 Device controls

| Method | Purpose |
|---|---|
| `findDevice()` | Find the device |
| `powerOff()` / `factoryReset()` | Power off / factory reset |
| `controlPhoto(state)` | 1=enter camera mode, 0=leave |
| `getVideoHid()` / `setVideoHid(mode)` | 0=off, 1=video, 2=book, 3=music |
| `createOrRemoveBond(type, mac)` | Android HID pair/unpair (1/2); iOS returns false |
| `getRingWearDir()` / `setRingWearHand(isRight)` | Wearing hand |
| `getRingLedLevel()` / `setRingLedLevel(config)` | LED switch and brightness 1–3 |
| `getRaiseBrightScreen()` / `setRaiseBrightScreen(config)` | Raise-to-wake schedule |
| `getBrightScreenTime()` / `setBrightScreenTime(seconds)` | Screen-on duration |
| `getBrightScreenSleepTime()` / `setBrightScreenSleepTime(config)` | Sleep screen schedule |
| `getVibrationCount()` / `setVibrationCount(config)` | Vibration count 0–6 and level 0–3 |
| `getAlarmVibrationDuration()` / `setAlarmVibrationDuration(count)` | Alarm vibration count, integer range 0–6; 0 disables vibration |
| `getVibrationInterval()` / `setVibrationInterval(ms)` | 100–1000 ms |
| `getFallDetect()` / `setFallDetect(enabled)` | Fall detection |
| `getCountReminderInterval()` / `setCountReminderInterval(minutes)` | 0/30/60/90/120 minutes |
| `startHeartRateCalibration()` | Start calibration; listen for its event |

Android video/music HID requires system Bluetooth pairing. A BLE connection or
`setVideoHid()` call alone does not establish HID pairing.

The native protocol defines 2 as the device's initial vibration-count default.
The React Native bridge returns the device value and does not inject that
default. Despite the `Duration` suffix in `getAlarmVibrationDuration()` and
`setAlarmVibrationDuration()`, the protocol value is a count, not a time span.

### 5.7 Alarms and health alerts

Use `getAlarm()`, `setAlarm(alarms)`, and `deleteAllAlarm()`. Alarm updates are
full replacements. When the device has no alarms, `getAlarm()` resolves normally
with `[]`.

`Alarm` fields:

| Field | Type | Description |
|---|---|---|
| `alarmId` | `number` | Alarm ID |
| `startHour` | `number` | Hour, 0–23 |
| `startMin` | `number` | Minute, 0–59 |
| `isOpen` | `boolean` | Whether the alarm is enabled |
| `repeats` | `number[]?` | Optional seven values ordered Sunday through Saturday; 1=enabled, 0=disabled |

Muslim count and health APIs are:

- `getMuslimCountEnabled()` / `setMuslimCountEnabled(enabled)`
- `getHeartRateAlert()` / `setHeartRateAlert(config)`
- `getBloodOxygenAlert()` / `setBloodOxygenAlert(config)`
- `onHealthAlert(listener)`

### 5.8 Health data sync

Use `syncAllHealthData()`, `removeHealthDataCallback()`, `onSyncProgress`,
`onSyncResult`, `onSyncFinish`, and `onSyncError`. Progress currently guarantees
only the completion marker `100`.

`SyncResult.type` can be `step`, `sleep`, `hr`, `bo`, `bp`, `hrv`, `pressure`,
`bloodSugar`, `temp`, or `muslimCount`. Timestamps are Unix seconds. Main units
are bpm, %, mmHg, ms, and meters. Historical temperature is `temp / 10` °C.
Historical sleep values are 0=awake, 1=light, 2=deep, and 3=REM.

Step and Muslim-count results contain daily totals plus every item for that day:

| `type` | Daily object fields | `items` fields |
|---|---|---|
| `step` | `time`, `date`, `totalSteps`, `totalCalorie`, `totalDistance`, `activityDataInterval`, `items` | `time`, `index`, `steps`, `calorie`, `distance` |
| `muslimCount` | `time`, `date`, `totalCount`, `items` | `time`, `count` |

### 5.9 OTA

Use `ringOta(path)`, `onOtaProgress` (0–1), and `onOtaFinish`
(`{success, code?}`). A successful start call does not mean the transfer is
complete.

Only use firmware supplied for the device. Before OTA, compare the device
`deviceClazz` from `getFirmwareVersion()` with the firmware's declared model.
Do not upgrade when they differ.

### 5.10 Raw sensors

Use `controlSensorRaw(enabled, selection)`, `getSensorRawHistory()`,
`onSensorRawData`, and `onSensorRawStopped`.

Valid `SensorRawSelection` values are `Acc(1)`, `PpgGreen(2)`,
`PpgGreenAndAcc(3)`, `PpgRed(4)`, `PpgRedAndAcc(5)`,
`PpgGreenAndIr(10)`, `PpgGreenAccAndIr(11)`, `PpgRedAndIr(12)`, and
`PpgRedAccAndIr(13)`. Green and red PPG cannot run together; IR cannot run alone.

`SensorRawPacket` contains PPG, ACC, red PPG, IR, and sleep arrays. Raw sleep
modes are 17=start, 34=end, 1=deep, 2=light, 3=awake, and 4=REM; these differ
from historical sleep values.

### 5.11 Messages, notifications, and calls

| Method / event | Platform | Purpose |
|---|---|---|
| `pushMessage(message)` | Android | Push a message to the device; iOS no-op |
| `setNotificationSwitch(switches)` | iOS | Configure ANCS; Android no-op |
| `getNotificationSwitch()` | iOS | Read ANCS switches; Android returns `{}` |
| `controlPhone(action)` | Android | Answer/reject action; iOS no-op |
| `onCallControl(listener)` | Android | Device-originated answer/reject action |

Android message fields include required `appId`, `title`, and `content`, plus
optional `msgType` and millisecond timestamp `timeMill`.

## 6. Event list

| Subscription | Payload |
|---|---|
| `onScanResult` | `BleDevice` |
| `onScanFinish` | none |
| `onConnectState` | `ConnectStateEvent` |
| `onFunctionMenu` | `FunctionMenu` |
| `onRealtimeData` | `RealtimeData` |
| `onRealtimeMeasureComplete` | none |
| `onWorkoutRealtimeData` | `WorkoutRealtimeData` |
| `onSyncProgress` | number; completion is 100 |
| `onSyncResult` | `SyncResult` |
| `onSyncFinish` | none |
| `onSyncError` | `{code, message?}` |
| `onOtaProgress` | number, 0–1 |
| `onOtaFinish` | `OtaResult` |
| `onTouchEvent` | `TouchEvent` |
| `onCallControl` | `CallControlEvent` |
| `onHealthAlert` | `HealthAlertEvent` |
| `onHeartRateCalibration` | `HeartRateCalibrationResult` |
| `onSensorRawData` | `SensorRawPacket` |
| `onSensorRawStopped` | `SensorRawStoppedEvent` |

The generic typed form is also available, for example
`RwfitBle.addListener(RwfitEvents.scanResult, listener)`. It returns the same
subscription type and must also be removed when no longer needed.

## 7. Persistence and reconnect

The SDK does not persist app device choices. Recommended flow:

1. On `onFunctionMenu`, save `{name, mac, uuid, rssi}` and call `iosSetBindedStatus(true)`.
2. On the next launch, load that object and call `reconnect(savedDevice)`.
3. Before changing devices, call `iosSetBindedStatus(false)` and clear app storage.
4. A normal `disconnect()` should not clear the saved device.

Use MAC on Android. Preserve and prefer UUID on iOS.

## 8. Key constraints

| Constraint | Requirement |
|---|---|
| Ready state | Wait for `onFunctionMenu`, not only `connected` |
| Event lifecycle | Subscribe before a task and call `remove()` when finished |
| Real-time measurement | One metric at a time; stop before switching |
| Alarms | Always send the complete list |
| Capability gating | Gate UI using `FunctionMenu.raw` |
| Android permissions | Request scan/connect at runtime on Android 12+ |
| iOS identity | Persist UUID and set bind state before reconnecting |
| OTA | Verify device and firmware model compatibility |
| Platform-only APIs | A no-op success does not mean another OS performed an equivalent action |

## 9. Technical support

`developer@dhouse88.com`
