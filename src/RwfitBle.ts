import NativeRwfitBle from './NativeRwfitBle';
import {
  CallControlAction,
  PowerOffType,
  type RealtimeMetric,
  SensorRawSelection,
  WorkoutControlType,
} from './constants';
import {RwfitError} from './errors';
import {RwfitEvents, type RwfitEventName} from './events';
import type {
  Alarm,
  BleDevice,
  BloodOxygenAlertConfig,
  CallControlEvent,
  ConnectStateEvent,
  DynamicMap,
  FirmwareInfo,
  FunctionMenu,
  HealthAlertEvent,
  HeartRateAlertConfig,
  HeartRateCalibrationResult,
  LedLevel,
  OtaResult,
  RealtimeData,
  RwfitEventPayloadMap,
  RwfitSubscription,
  ScheduleToggle,
  SensorRawPacket,
  SensorRawStoppedEvent,
  SyncResult,
  TimedConfig,
  TouchEvent,
  UserInfo,
  VibrationConfig,
  WorkoutRealtimeData,
  WorkoutReport,
  WorkoutState,
} from './types';
import {
  assertRange,
  assertRealtimeMetric,
  normalizeAlarms,
  normalizeSchedule,
  normalizeTimedConfig,
  validateAlarmVibrationDuration,
  validateDevice,
  validateWorkout,
} from './internal/validation';
import {
  normalizeCallControlEvent,
  normalizeAlarmsResult,
  normalizeBloodOxygenAlertConfig,
  normalizeFirmwareInfo,
  normalizeFunctionMenu,
  normalizeHealthAlertEvent,
  normalizeHeartRateAlertConfig,
  normalizeHeartRateCalibration,
  normalizeLedLevel,
  normalizeRealtimeData,
  normalizeScheduleToggle,
  normalizeSensorRawPacket,
  normalizeTimedConfigResult,
  normalizeTouchEvent,
  normalizeVibrationConfig,
  normalizeWorkoutRealtimeData,
  normalizeWorkoutReports,
  normalizeWorkoutState,
} from './internal/normalization';

type NativeCallable = (...args: unknown[]) => Promise<object>;

function asMap(value: object): DynamicMap {
  return value as DynamicMap;
}

async function invoke(method: string, args?: DynamicMap): Promise<DynamicMap> {
  const native = NativeRwfitBle as unknown as Record<string, NativeCallable>;
  const fn = native[method];
  if (typeof fn !== 'function') {
    throw new RwfitError(-1, `Native method ${method} is unavailable`);
  }
  try {
    const raw = args === undefined
      ? await fn.call(NativeRwfitBle)
      : await fn.call(NativeRwfitBle, args);
    const result = asMap(raw);
    const code = typeof result.code === 'number' ? result.code : -1;
    if (code !== 0) {
      throw new RwfitError(
        code,
        typeof result.msg === 'string' ? result.msg : 'Unknown native error',
      );
    }
    return result;
  } catch (error) {
    if (error instanceof RwfitError) {
      throw error;
    }
    const nativeError = error as {code?: string; message?: string};
    const match = nativeError.code?.match(/^RW_(-?\d+)$/);
    throw new RwfitError(
      match ? Number(match[1]) : -1,
      nativeError.message ?? String(error),
      nativeError.code,
    );
  }
}

function value<T>(map: DynamicMap, key: string): T {
  return map[key] as T;
}

const nativeEventSubscriptions: Record<
  RwfitEventName,
  (listener: (payload: object) => void) => RwfitSubscription
> = {
  [RwfitEvents.scanResult]: listener => NativeRwfitBle.onScanResult(listener),
  [RwfitEvents.scanFinish]: listener => NativeRwfitBle.onScanFinish(listener),
  [RwfitEvents.connectState]: listener => NativeRwfitBle.onConnectState(listener),
  [RwfitEvents.functionMenu]: listener => NativeRwfitBle.onFunctionMenu(listener),
  [RwfitEvents.healthData]: listener => NativeRwfitBle.onHealthData(listener),
  [RwfitEvents.realtimeMeasureComplete]: listener =>
    NativeRwfitBle.onRealtimeMeasureComplete(listener),
  [RwfitEvents.workoutRealtimeData]: listener =>
    NativeRwfitBle.onWorkoutRealtimeData(listener),
  [RwfitEvents.syncProgress]: listener => NativeRwfitBle.onSyncProgress(listener),
  [RwfitEvents.syncResult]: listener => NativeRwfitBle.onSyncResult(listener),
  [RwfitEvents.syncFinish]: listener => NativeRwfitBle.onSyncFinish(listener),
  [RwfitEvents.syncError]: listener => NativeRwfitBle.onSyncError(listener),
  [RwfitEvents.otaProgress]: listener => NativeRwfitBle.onOtaProgress(listener),
  [RwfitEvents.otaFinish]: listener => NativeRwfitBle.onOtaFinish(listener),
  [RwfitEvents.touchEvent]: listener => NativeRwfitBle.onTouchEvent(listener),
  [RwfitEvents.callControl]: listener => NativeRwfitBle.onCallControl(listener),
  [RwfitEvents.healthAlert]: listener => NativeRwfitBle.onHealthAlert(listener),
  [RwfitEvents.heartRateCalibration]: listener =>
    NativeRwfitBle.onHeartRateCalibration(listener),
  [RwfitEvents.sensorRawData]: listener => NativeRwfitBle.onSensorRawData(listener),
  [RwfitEvents.sensorRawStopped]: listener =>
    NativeRwfitBle.onSensorRawStopped(listener),
};

class RwfitBleClient {
  init(): Promise<DynamicMap> {
    return invoke('initSDK');
  }

  async getSdkVersion(): Promise<string> {
    return value(await invoke('getSDKVersion'), 'version');
  }

  async getPluginVersion(): Promise<string> {
    return value(await invoke('getPluginVersion'), 'pluginVersion');
  }

  startScan(): Promise<DynamicMap> { return invoke('startScan'); }
  stopScan(): Promise<DynamicMap> { return invoke('stopScan'); }

  connect(device: BleDevice): Promise<DynamicMap> {
    validateDevice(device);
    return invoke('connectDevice', device as unknown as DynamicMap);
  }

  disconnect(): Promise<DynamicMap> { return invoke('disconnect'); }

  iosSetBindedStatus(isBinded: boolean): Promise<DynamicMap> {
    return invoke('iOSSetBindedStatus', {isBinded});
  }

  reconnect(device?: BleDevice): Promise<DynamicMap> {
    if (device) validateDevice(device);
    return invoke('reconnectDevice', (device ?? {}) as DynamicMap);
  }

  async isConnected(): Promise<boolean> {
    return value(await invoke('isBleConnected'), 'connected');
  }

  async getPower(): Promise<number> {
    return value(await invoke('getPower'), 'power');
  }

  async getFirmwareVersion(): Promise<FirmwareInfo> {
    return normalizeFirmwareInfo(await invoke('getFirmwareVersion'));
  }

  setUserInfo(info: UserInfo): Promise<DynamicMap> {
    return invoke('setUserInfo', info as unknown as DynamicMap);
  }

  setTimeFormat(format: number): Promise<DynamicMap> {
    assertRange(format, 0, 1, 'format');
    return invoke('setTimeFormat', {format});
  }

  getFunctionList(): Promise<DynamicMap> { return invoke('getFunctionList'); }

  setRingBtName(name: string): Promise<DynamicMap> {
    if (!name.trim()) throw new TypeError('name is required');
    return invoke('setRingBtName', {name});
  }

  private async getTimed(method: string): Promise<TimedConfig> {
    return normalizeTimedConfigResult(await invoke(method));
  }

  private setTimed(method: string, config: TimedConfig): Promise<DynamicMap> {
    return invoke(method, normalizeTimedConfig(config) as unknown as DynamicMap);
  }

  getTimedHeartRate() { return this.getTimed('getTimedHeartRate'); }
  setTimedHeartRate(c: TimedConfig) { return this.setTimed('setTimedHeartRate', c); }
  getTimedBloodOxygen() { return this.getTimed('getTimedBloodOxygen'); }
  setTimedBloodOxygen(c: TimedConfig) { return this.setTimed('setTimedBloodOxygen', c); }
  getTimedHRV() { return this.getTimed('getTimedHRV'); }
  setTimedHRV(c: TimedConfig) { return this.setTimed('setTimedHRV', c); }
  getTimedStress() { return this.getTimed('getTimedStress'); }
  setTimedStress(c: TimedConfig) { return this.setTimed('setTimedStress', c); }
  getTimedBloodSugar() { return this.getTimed('getTimedBloodSugar'); }
  setTimedBloodSugar(c: TimedConfig) { return this.setTimed('setTimedBloodSugar', c); }
  getTimedBloodPressure() { return this.getTimed('getTimedBloodPressure'); }
  setTimedBloodPressure(c: TimedConfig) { return this.setTimed('setTimedBloodPressure', c); }
  getTimedBodyTemperature() { return this.getTimed('getTimedBodyTemperature'); }
  setTimedBodyTemperature(c: TimedConfig) { return this.setTimed('setTimedBodyTemperature', c); }
  getTimedPPG() { return this.getTimed('getTimedPPG'); }
  setTimedPPG(c: TimedConfig) { return this.setTimed('setTimedPPG', c); }

  startRealtimeMeasure(metric: RealtimeMetric): Promise<DynamicMap> {
    assertRealtimeMetric(metric);
    return invoke('controlHealthData', {key: metric, state: 1});
  }

  stopRealtimeMeasure(metric: RealtimeMetric): Promise<DynamicMap> {
    assertRealtimeMetric(metric);
    return invoke('controlHealthData', {key: metric, state: 0});
  }

  async getWorkoutState(): Promise<WorkoutState> {
    return normalizeWorkoutState(await invoke('getWorkoutState'));
  }

  controlWorkout(
    sportType: number,
    controlType: WorkoutControlType,
  ): Promise<DynamicMap> {
    validateWorkout(sportType, controlType);
    return invoke('controlWorkout', {sportType, controlType});
  }

  setWorkoutRealtimeEnabled(enabled: boolean): Promise<DynamicMap> {
    return invoke('setWorkoutRealtimeEnabled', {enabled});
  }

  async getWorkoutReports(): Promise<WorkoutReport[]> {
    return normalizeWorkoutReports(value(await invoke('getWorkoutReports'), 'data'));
  }

  findDevice(): Promise<DynamicMap> { return invoke('controlFindDevice'); }
  powerOff(): Promise<DynamicMap> { return invoke('setPowerOff', {type: PowerOffType.Shutdown}); }
  factoryReset(): Promise<DynamicMap> { return invoke('setPowerOff', {type: PowerOffType.FactoryReset}); }
  controlPhoto(state: number): Promise<DynamicMap> {
    assertRange(state, 0, 1, 'state');
    return invoke('controlTakePhoto', {state});
  }
  controlPhone(action: CallControlAction): Promise<DynamicMap> {
    return invoke('controlPhone', {action});
  }

  async getMuslimCountEnabled(): Promise<boolean> {
    return value(await invoke('getMuslimCountEnabled'), 'enabled');
  }
  setMuslimCountEnabled(enabled: boolean) { return invoke('setMuslimCountEnabled', {enabled}); }

  async getHeartRateAlert(): Promise<HeartRateAlertConfig> {
    return normalizeHeartRateAlertConfig(await invoke('getHeartRateAlert'));
  }
  setHeartRateAlert(config: HeartRateAlertConfig): Promise<DynamicMap> {
    assertRange(config.highThreshold, 0, 254, 'highThreshold');
    if (config.lowThreshold != null) assertRange(config.lowThreshold, 0, 254, 'lowThreshold');
    return invoke('setHeartRateAlert', config as unknown as DynamicMap);
  }
  async getBloodOxygenAlert(): Promise<BloodOxygenAlertConfig> {
    return normalizeBloodOxygenAlertConfig(await invoke('getBloodOxygenAlert'));
  }
  setBloodOxygenAlert(config: BloodOxygenAlertConfig): Promise<DynamicMap> {
    assertRange(config.lowThreshold, 0, 254, 'lowThreshold');
    return invoke('setBloodOxygenAlert', config as unknown as DynamicMap);
  }

  async getVibrationInterval(): Promise<number> {
    return value(await invoke('getVibrationInterval'), 'intervalMs');
  }
  setVibrationInterval(intervalMs: number): Promise<DynamicMap> {
    assertRange(intervalMs, 100, 1000, 'intervalMs');
    return invoke('setVibrationInterval', {intervalMs});
  }
  startHeartRateCalibration() { return invoke('startHeartRateCalibration'); }
  async getFallDetect(): Promise<boolean> { return value(await invoke('getFallDetect'), 'enabled'); }
  setFallDetect(enabled: boolean) { return invoke('setFallDetect', {enabled}); }
  async getCountReminderInterval(): Promise<number> {
    return value(await invoke('getCountReminderInterval'), 'intervalMinutes');
  }
  setCountReminderInterval(intervalMinutes: number): Promise<DynamicMap> {
    if (![0, 30, 60, 90, 120].includes(intervalMinutes)) {
      throw new RangeError('intervalMinutes must be 0, 30, 60, 90 or 120');
    }
    return invoke('setCountReminderInterval', {intervalMinutes});
  }
  controlSensorRaw(enabled: boolean, selection: SensorRawSelection) {
    return invoke('controlSensorRaw', {enabled, sensorType: selection});
  }
  async getSensorRawHistory(): Promise<SensorRawPacket[]> {
    const packets = value<DynamicMap[]>(await invoke('getSensorRawHistory'), 'data');
    return packets?.map(normalizeSensorRawPacket) ?? [];
  }

  async getAlarm(): Promise<Alarm[]> {
    return normalizeAlarmsResult(value(await invoke('getAlarm'), 'data'));
  }
  setAlarm(alarms: Alarm[]) {
    return invoke('setAlarm', {alarms: normalizeAlarms(alarms)});
  }
  deleteAllAlarm() { return invoke('deleteAllAlarm'); }

  async getRaiseBrightScreen(): Promise<ScheduleToggle> {
    return normalizeScheduleToggle(await invoke('getRaiseBrightScreen'));
  }
  setRaiseBrightScreen(c: ScheduleToggle) {
    return invoke('setRaiseBrightScreen', normalizeSchedule(c) as unknown as DynamicMap);
  }
  async getBrightScreenTime(): Promise<number> { return value(await invoke('getBrightScreenTime'), 'timeSecond'); }
  setBrightScreenTime(timeSecond: number) {
    assertRange(timeSecond, 0, 255, 'timeSecond');
    return invoke('setBrightScreenTime', {timeSecond});
  }
  async getBrightScreenSleepTime(): Promise<ScheduleToggle> {
    return normalizeScheduleToggle(await invoke('getBrightScreenSleepTime'));
  }
  setBrightScreenSleepTime(c: ScheduleToggle) {
    return invoke('setBrightScreenSleepTime', normalizeSchedule(c) as unknown as DynamicMap);
  }
  async getRingLedLevel(): Promise<LedLevel> {
    return normalizeLedLevel(await invoke('getRingLedLevel'));
  }
  setRingLedLevel(c: LedLevel) {
    assertRange(c.lcdLevel, 1, 3, 'lcdLevel');
    return invoke('setRingLedLevel', c as unknown as DynamicMap);
  }

  async getVideoHid(): Promise<number> { return value(await invoke('getVideoHid'), 'hidOpen'); }
  setVideoHid(hidOpen: number) {
    assertRange(hidOpen, 0, 3, 'hidOpen');
    return invoke('setVideoHid', {hidOpen});
  }
  async createOrRemoveBond(type: number, mac: string): Promise<boolean> {
    assertRange(type, 1, 2, 'type');
    if (!mac.trim()) throw new TypeError('mac is required');
    return value(await invoke('createOrRemoveBond', {type, mac}), 'result') ?? false;
  }
  async getRingWearDir(): Promise<boolean> { return value(await invoke('getRingWearDir'), 'isRight'); }
  setRingWearHand(isRight: boolean) { return invoke('setRingWearHand', {isRight}); }
  async getVibrationCount(): Promise<VibrationConfig> {
    return normalizeVibrationConfig(await invoke('getVibrationCount'));
  }
  setVibrationCount(c: VibrationConfig) { return invoke('setVibrationCount', c as unknown as DynamicMap); }
  async getAlarmVibrationDuration(): Promise<number> {
    return value(await invoke('getAlarmVibrationDuration'), 'duration');
  }
  setAlarmVibrationDuration(duration: number) {
    // The native API calls this "duration", but the protocol value is a
    // vibration count: 0–6, where 0 disables vibration.
    validateAlarmVibrationDuration(duration);
    return invoke('setAlarmVibrationDuration', {duration});
  }

  syncAllHealthData() { return invoke('syncAllHealthData'); }
  removeHealthDataCallback() { return invoke('removeHealthDataCallback'); }
  ringOta(path: string) {
    if (!path.trim()) throw new TypeError('path is required');
    return invoke('ringOta', {path});
  }
  unbind() { return invoke('unbind'); }
  pushMessage(message: DynamicMap) { return invoke('pushMessage', message); }
  setNotificationSwitch(switches: DynamicMap) { return invoke('setNotificationSwitch', switches); }
  async getNotificationSwitch(): Promise<DynamicMap> {
    return value(await invoke('getNotificationSwitch'), 'switches') ?? {};
  }

  addListener<E extends RwfitEventName>(
    event: E,
    listener: (payload: RwfitEventPayloadMap[E]) => void,
  ): RwfitSubscription {
    return nativeEventSubscriptions[event](payload => {
      const raw = payload as DynamicMap;
      let normalized: unknown = raw;
      switch (event) {
        case RwfitEvents.functionMenu:
          normalized = normalizeFunctionMenu(raw);
          break;
        case RwfitEvents.healthData:
          normalized = normalizeRealtimeData(raw);
          break;
        case RwfitEvents.workoutRealtimeData:
          normalized = normalizeWorkoutRealtimeData(raw);
          break;
        case RwfitEvents.touchEvent:
          normalized = normalizeTouchEvent(raw);
          break;
        case RwfitEvents.callControl:
          normalized = normalizeCallControlEvent(raw);
          break;
        case RwfitEvents.healthAlert:
          normalized = normalizeHealthAlertEvent(raw);
          break;
        case RwfitEvents.heartRateCalibration:
          normalized = normalizeHeartRateCalibration(raw);
          break;
        case RwfitEvents.sensorRawData:
          normalized = normalizeSensorRawPacket(raw);
          break;
      }
      listener(normalized as RwfitEventPayloadMap[E]);
    });
  }

  onScanResult(listener: (data: BleDevice) => void) { return this.addListener(RwfitEvents.scanResult, listener); }
  onScanFinish(listener: () => void) { return this.addListener(RwfitEvents.scanFinish, () => listener()); }
  onConnectState(listener: (data: ConnectStateEvent) => void) { return this.addListener(RwfitEvents.connectState, listener); }
  onFunctionMenu(listener: (data: FunctionMenu) => void) { return this.addListener(RwfitEvents.functionMenu, listener); }
  onRealtimeData(listener: (data: RealtimeData) => void) { return this.addListener(RwfitEvents.healthData, listener); }
  onRealtimeMeasureComplete(listener: () => void) { return this.addListener(RwfitEvents.realtimeMeasureComplete, () => listener()); }
  onWorkoutRealtimeData(listener: (data: WorkoutRealtimeData) => void) { return this.addListener(RwfitEvents.workoutRealtimeData, listener); }
  /** Emits the cross-platform sync completion marker 100; intermediate values are not guaranteed. */
  onSyncProgress(listener: (progress: number) => void) { return this.addListener(RwfitEvents.syncProgress, data => listener(data.progress)); }
  onSyncResult(listener: (data: SyncResult) => void) { return this.addListener(RwfitEvents.syncResult, listener); }
  onSyncFinish(listener: () => void) { return this.addListener(RwfitEvents.syncFinish, () => listener()); }
  onSyncError(listener: (data: {code: number; message?: string}) => void) { return this.addListener(RwfitEvents.syncError, listener); }
  /** Emits OTA transfer progress normalized to the inclusive range 0–1. */
  onOtaProgress(listener: (progress: number) => void) { return this.addListener(RwfitEvents.otaProgress, data => listener(data.progress)); }
  onOtaFinish(listener: (data: OtaResult) => void) {
    return this.addListener(RwfitEvents.otaFinish, data =>
      listener({success: typeof data.code !== 'number', code: data.code as number | undefined}),
    );
  }
  onTouchEvent(listener: (data: TouchEvent) => void) { return this.addListener(RwfitEvents.touchEvent, listener); }
  onCallControl(listener: (data: CallControlEvent) => void) { return this.addListener(RwfitEvents.callControl, listener); }
  onHealthAlert(listener: (data: HealthAlertEvent) => void) { return this.addListener(RwfitEvents.healthAlert, listener); }
  onHeartRateCalibration(listener: (data: HeartRateCalibrationResult) => void) { return this.addListener(RwfitEvents.heartRateCalibration, listener); }
  onSensorRawData(listener: (data: SensorRawPacket) => void) { return this.addListener(RwfitEvents.sensorRawData, listener); }
  onSensorRawStopped(listener: (data: SensorRawStoppedEvent) => void) { return this.addListener(RwfitEvents.sensorRawStopped, listener); }
}

export const RwfitBle = new RwfitBleClient();
export type {RwfitBleClient};

export function timestampMs(data: {timestampSec: number}): number {
  return data.timestampSec * 1000;
}
