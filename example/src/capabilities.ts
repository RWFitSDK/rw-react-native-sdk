import type { DynamicMap } from 'react-native-rwfit-ble';

/** Flutter 桥接公开的 supportMenu key（与 Flutter demo 的 support_menu.dart 对齐）。 */
export const CapabilityKey = {
  alarm: 'isAlarm',
  brightScreenTime: 'isBrightScreenTime',
  brightScreenSleepTime: 'isBrightScreenSleepTime',
  workout: 'isSupportWorkout',
  muslimSwitch: 'isRememberSwitch',
  heartRateAlert: 'isSupportHrReminder',
  bloodOxygenAlert: 'isSupportBoReminder',
  vibrationLevel: 'isSupportMotoVibrationLevel',
  alarmVibrationDuration: 'isSupportAlarmVibrationDuration',
  vibrationInterval: 'isSupportVibrationInterval',
  step: 'isStep',
  sleep: 'isSleep',
  heartRate: 'isHr',
  bloodOxygen: 'isBloodOxy',
  bloodPressure: 'isBloodPress',
  bloodSugar: 'isBloodSugar',
  hrv: 'isHrv',
  pressure: 'isPressure',
  muslimCountData: 'isMuslimCountData',
  bodyTemperature: 'isBodyTemp',
  ppgMonitoring: 'isSupportPPGMonitoring',
  temperatureMonitoring: 'isSupportTemperatureMonitoring',
  countReminder: 'isSupportCountReminder',
  sensorRawAcc: 'isSupportSensorRawACC',
  sensorRawPpg: 'isSupportSensorRawPPG',
  sensorRawPpgRed: 'isSupportSensorRawPPGRed',
  sensorRawIr: 'isSupportSensorRawIR',
  sensorRawSleep: 'isSupportSensorRawSleep',
  fallDetect: 'isSupportFallDetect',
  findDevice: 'isFindDevice',
  takePhoto: 'isTakePhoto',
  ledLight: 'isLedLight',
  wearDirection: 'isWearDirection',
  videoHid: 'isVideoHid',
  videoHidBook: 'isVideoHidBook',
  videoHidMusic: 'isVideoHidMusic',
  raiseBrightScreen: 'isRaiseBrightScreen',
  powerOff: 'isPowerOff',
  factoryReset: 'isFactoryReset',
  pushMessage: 'isPushMessage',
  pushMessageSwitch: 'isPushMsgEnableSwitch',
} as const;

/** Demo 对设备功能表的统一判断；仅保留扁平 has()，不再提供分组 getter。 */
export class DemoCapabilities {
  constructor(readonly raw: DynamicMap = {}) {}

  has(key: string): boolean {
    return this.raw[key] === true;
  }
}
