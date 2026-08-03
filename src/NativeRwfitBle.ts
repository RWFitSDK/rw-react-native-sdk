import {
  TurboModuleRegistry,
  type CodegenTypes,
  type TurboModule,
} from 'react-native';


export type NativeResult = CodegenTypes.UnsafeObject;

/**
 * Codegen boundary. The public API is strongly typed in RwfitBle.ts; maps are
 * intentionally kept at this boundary because several SDK payloads (function
 * menu, notification switches and health sync details) are device-dependent.
 */
export interface Spec extends TurboModule {
  initSDK(): Promise<NativeResult>;
  getSDKVersion(): Promise<NativeResult>;
  getPluginVersion(): Promise<NativeResult>;
  isBleConnected(): Promise<NativeResult>;
  startScan(): Promise<NativeResult>;
  stopScan(): Promise<NativeResult>;
  connectDevice(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  reconnectDevice(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  disconnect(): Promise<NativeResult>;
  iOSSetBindedStatus(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getPower(): Promise<NativeResult>;
  getFirmwareVersion(): Promise<NativeResult>;
  setUserInfo(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  setTimeFormat(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getFunctionList(): Promise<NativeResult>;
  setRingBtName(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getTimedHeartRate(): Promise<NativeResult>;
  setTimedHeartRate(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getTimedBloodOxygen(): Promise<NativeResult>;
  setTimedBloodOxygen(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getTimedHRV(): Promise<NativeResult>;
  setTimedHRV(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getTimedStress(): Promise<NativeResult>;
  setTimedStress(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getTimedBloodSugar(): Promise<NativeResult>;
  setTimedBloodSugar(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getTimedBloodPressure(): Promise<NativeResult>;
  setTimedBloodPressure(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getTimedBodyTemperature(): Promise<NativeResult>;
  setTimedBodyTemperature(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getTimedPPG(): Promise<NativeResult>;
  setTimedPPG(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  controlHealthData(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getWorkoutState(): Promise<NativeResult>;
  controlWorkout(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  setWorkoutRealtimeEnabled(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getWorkoutReports(): Promise<NativeResult>;
  controlFindDevice(): Promise<NativeResult>;
  setPowerOff(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  controlTakePhoto(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  controlPhone(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getMuslimCountEnabled(): Promise<NativeResult>;
  setMuslimCountEnabled(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getHeartRateAlert(): Promise<NativeResult>;
  setHeartRateAlert(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getBloodOxygenAlert(): Promise<NativeResult>;
  setBloodOxygenAlert(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getVibrationInterval(): Promise<NativeResult>;
  setVibrationInterval(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  startHeartRateCalibration(): Promise<NativeResult>;
  getFallDetect(): Promise<NativeResult>;
  setFallDetect(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getCountReminderInterval(): Promise<NativeResult>;
  setCountReminderInterval(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  controlSensorRaw(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getSensorRawHistory(): Promise<NativeResult>;
  getAlarm(): Promise<NativeResult>;
  setAlarm(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  deleteAllAlarm(): Promise<NativeResult>;
  getRaiseBrightScreen(): Promise<NativeResult>;
  setRaiseBrightScreen(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getBrightScreenTime(): Promise<NativeResult>;
  setBrightScreenTime(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getBrightScreenSleepTime(): Promise<NativeResult>;
  setBrightScreenSleepTime(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getRingLedLevel(): Promise<NativeResult>;
  setRingLedLevel(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getVideoHid(): Promise<NativeResult>;
  setVideoHid(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  createOrRemoveBond(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getRingWearDir(): Promise<NativeResult>;
  setRingWearHand(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getVibrationCount(): Promise<NativeResult>;
  setVibrationCount(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getAlarmVibrationDuration(): Promise<NativeResult>;
  setAlarmVibrationDuration(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  syncAllHealthData(): Promise<NativeResult>;
  removeHealthDataCallback(): Promise<NativeResult>;
  ringOta(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  unbind(): Promise<NativeResult>;
  pushMessage(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  setNotificationSwitch(args: CodegenTypes.UnsafeObject): Promise<NativeResult>;
  getNotificationSwitch(): Promise<NativeResult>;

  readonly onScanResult: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onScanFinish: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onConnectState: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onFunctionMenu: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onHealthData: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onRealtimeMeasureComplete: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onWorkoutRealtimeData: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSyncProgress: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSyncResult: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSyncFinish: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSyncError: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onOtaProgress: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onOtaFinish: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onTouchEvent: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onCallControl: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onHealthAlert: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onHeartRateCalibration: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSensorRawData: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
  readonly onSensorRawStopped: CodegenTypes.EventEmitter<CodegenTypes.UnsafeObject>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RwfitBle');
