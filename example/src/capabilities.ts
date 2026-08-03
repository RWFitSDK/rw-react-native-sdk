import {Platform} from 'react-native';
import {
  RealtimeMetric,
  SensorRawSelection,
  type DynamicMap,
} from 'react-native-rwfit-ble';

export const CapabilityKey = {
  alarm: 'isAlarm',
  brightScreenTime: 'isBrightScreenTime',
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
  raiseBrightScreen: 'isRaiseBrightScreen',
  powerOff: 'isPowerOff',
  factoryReset: 'isFactoryReset',
  pushMessage: 'isPushMessage',
  pushMessageSwitch: 'isPushMsgEnableSwitch',
} as const;

const timedMonitor = [
  CapabilityKey.heartRate,
  CapabilityKey.bloodOxygen,
  CapabilityKey.hrv,
  CapabilityKey.pressure,
  CapabilityKey.bloodSugar,
  CapabilityKey.bloodPressure,
  CapabilityKey.temperatureMonitoring,
  CapabilityKey.ppgMonitoring,
];

const realtime = [
  CapabilityKey.heartRate,
  CapabilityKey.bloodOxygen,
  CapabilityKey.hrv,
  CapabilityKey.pressure,
  CapabilityKey.bloodSugar,
  CapabilityKey.bloodPressure,
];

const healthAlert = [
  CapabilityKey.muslimSwitch,
  CapabilityKey.heartRateAlert,
  CapabilityKey.bloodOxygenAlert,
];

const sensorRaw = [
  CapabilityKey.sensorRawPpg,
  CapabilityKey.sensorRawAcc,
  CapabilityKey.sensorRawPpgRed,
  CapabilityKey.sensorRawIr,
  CapabilityKey.sensorRawSleep,
];

const healthData = [
  CapabilityKey.step,
  CapabilityKey.sleep,
  CapabilityKey.heartRate,
  CapabilityKey.bloodOxygen,
  CapabilityKey.bloodPressure,
  CapabilityKey.bloodSugar,
  CapabilityKey.hrv,
  CapabilityKey.pressure,
  CapabilityKey.muslimCountData,
  CapabilityKey.bodyTemperature,
];

const deviceControl = [
  CapabilityKey.findDevice,
  CapabilityKey.powerOff,
  CapabilityKey.factoryReset,
  CapabilityKey.takePhoto,
  CapabilityKey.ledLight,
  CapabilityKey.wearDirection,
  CapabilityKey.vibrationLevel,
  CapabilityKey.vibrationInterval,
  CapabilityKey.fallDetect,
  CapabilityKey.countReminder,
  CapabilityKey.raiseBrightScreen,
  CapabilityKey.brightScreenTime,
  CapabilityKey.videoHid,
  CapabilityKey.alarmVibrationDuration,
];

export class DemoCapabilities {
  constructor(readonly raw: DynamicMap = {}) {}

  has(key: string): boolean {
    return this.raw[key] === true;
  }

  any(keys: readonly string[]): boolean {
    return keys.some(key => this.has(key));
  }

  all(keys: readonly string[]): boolean {
    return keys.every(key => this.has(key));
  }

  get supportsWorkout(): boolean {
    return this.has(CapabilityKey.workout);
  }

  get supportsAnyTimedMonitor(): boolean {
    return this.any(timedMonitor);
  }

  get supportsAnyRealtime(): boolean {
    return this.any(realtime);
  }

  get supportsAnyHealthAlert(): boolean {
    return this.any(healthAlert);
  }

  get supportsAnySensorRaw(): boolean {
    return this.any(sensorRaw);
  }

  get supportsAnyHealthData(): boolean {
    return this.any(healthData);
  }

  get supportsAnyDeviceControl(): boolean {
    return this.any(deviceControl) || Platform.OS === 'android';
  }

  supportsRealtime(metric: RealtimeMetric): boolean {
    const keys: Record<RealtimeMetric, string> = {
      [RealtimeMetric.Hr]: CapabilityKey.heartRate,
      [RealtimeMetric.BloodOxy]: CapabilityKey.bloodOxygen,
      [RealtimeMetric.Hrv]: CapabilityKey.hrv,
      [RealtimeMetric.Pressure]: CapabilityKey.pressure,
      [RealtimeMetric.BloodSugar]: CapabilityKey.bloodSugar,
      [RealtimeMetric.BloodPressure]: CapabilityKey.bloodPressure,
    };
    return this.has(keys[metric]);
  }

  supportsSensorSelection(selection: SensorRawSelection): boolean {
    const keys: Record<SensorRawSelection, string[]> = {
      [SensorRawSelection.Acc]: [CapabilityKey.sensorRawAcc],
      [SensorRawSelection.PpgGreen]: [CapabilityKey.sensorRawPpg],
      [SensorRawSelection.PpgGreenAndAcc]: [
        CapabilityKey.sensorRawPpg,
        CapabilityKey.sensorRawAcc,
      ],
      [SensorRawSelection.PpgRed]: [CapabilityKey.sensorRawPpgRed],
      [SensorRawSelection.PpgRedAndAcc]: [
        CapabilityKey.sensorRawPpgRed,
        CapabilityKey.sensorRawAcc,
      ],
      [SensorRawSelection.PpgGreenAndIr]: [
        CapabilityKey.sensorRawPpg,
        CapabilityKey.sensorRawIr,
      ],
      [SensorRawSelection.PpgGreenAccAndIr]: [
        CapabilityKey.sensorRawPpg,
        CapabilityKey.sensorRawAcc,
        CapabilityKey.sensorRawIr,
      ],
      [SensorRawSelection.PpgRedAndIr]: [
        CapabilityKey.sensorRawPpgRed,
        CapabilityKey.sensorRawIr,
      ],
      [SensorRawSelection.PpgRedAccAndIr]: [
        CapabilityKey.sensorRawPpgRed,
        CapabilityKey.sensorRawAcc,
        CapabilityKey.sensorRawIr,
      ],
    };
    return this.all(keys[selection]);
  }
}
