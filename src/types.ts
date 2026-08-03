import type {
  ConnectState,
  CallControlAction,
  HealthAlertType,
  HealthType,
  SensorRawDataType,
  TouchAction,
  WorkoutControlType,
  WorkoutDataType,
} from './constants';

export type DynamicMap = {[key: string]: unknown};

export interface BleDevice {
  name: string;
  mac: string;
  rssi: number;
  uuid?: string;
}

export interface ConnectStateEvent {
  state: ConnectState;
  name?: string;
  mac?: string;
  uuid?: string;
  reason?: string;
}

export interface FunctionMenu {
  name: string;
  mac: string;
  uuid?: string;
  raw: DynamicMap;
  supportsWorkout: boolean;
}

export interface FirmwareInfo {
  deviceClazz: string;
  deviceNo: string;
  uiVersion: string;
}

export interface UserInfo {
  /** 0=female, 1=male. */
  gender: number;
  age: number;
  /** Centimetres. */
  height: number;
  /** Kilograms. */
  weight: number;
}

export interface TimedConfig {
  isOpen: boolean;
  duration?: number;
  startHour?: number;
  startMin?: number;
  endHour?: number;
  endMin?: number;
}

export interface RealtimeData {
  type: HealthType | null;
  value: number;
  diastolic?: number;
  /** Unix seconds. */
  timestampSec: number;
  /** Compatibility value derived from timestampSec. */
  timestampMs: number;
}

export interface WorkoutState {
  sportType: number;
  controlType: WorkoutControlType;
  isRunning: boolean;
}

export interface WorkoutRealtimeData {
  duration: number;
  steps: number;
  distance: number;
  calorie: number;
  heartRate: number;
  dataType: WorkoutDataType;
  rawDataType: number;
}

export interface WorkoutValueItem {
  index: number;
  value: number;
}

export interface WorkoutReport {
  startTime: number;
  endTime: number;
  date: string;
  sportType: number;
  duration: number;
  step: number;
  distance: number;
  calorie: number;
  height: number;
  pressure: number;
  cadence: number;
  speed: number;
  pace: number;
  averageHeartRate: number;
  maxHeartRate: number;
  minHeartRate: number;
  maxCadence: number;
  minCadence: number;
  maxPace: number;
  minPace: number;
  heartRateCount: number;
  viewType: number;
  heartRateItems: WorkoutValueItem[];
  pacePerKmItems: WorkoutValueItem[];
}

export interface TouchEvent {
  action: TouchAction;
  rawAction: string;
  keyType: number;
  touchType: number;
}

export interface CallControlEvent {
  action: CallControlAction | null;
  rawValue: number;
}

export interface HeartRateAlertConfig {
  isOpen: boolean;
  highThreshold: number;
  lowThreshold?: number | null;
}

export interface BloodOxygenAlertConfig {
  isOpen: boolean;
  lowThreshold: number;
}

export interface HealthAlertEvent {
  type: HealthAlertType;
  rawType: number;
  value: number;
}

export interface HeartRateCalibrationResult {
  testMode: number;
  result: number;
  isCalibrating: boolean;
  isCompleted: boolean;
}

export interface AccRawSample {
  x: number;
  y: number;
  z: number;
}

export interface SleepRawSample {
  timestampSec: number;
  mode: number;
}

export interface SensorRawPacket {
  type: SensorRawDataType;
  rawType: number;
  sequence?: number;
  timestampSec?: number;
  ppg: number[];
  acc: AccRawSample[];
  ppgRed: number[];
  ir: number[];
  sleep: SleepRawSample[];
}

export interface SensorRawStoppedEvent {
  reason: number;
}

export interface SyncResult {
  type: string;
  data: DynamicMap[];
}

export interface OtaResult {
  success: boolean;
  code?: number;
}

export interface Alarm {
  alarmId: number;
  startHour: number;
  startMin: number;
  isOpen: boolean;
  /** Seven values, Sunday first. */
  repeats?: number[];
}

export interface ScheduleToggle {
  isOpen: boolean;
  startHour?: number;
  startMin?: number;
  endHour?: number;
  endMin?: number;
}

export interface LedLevel {
  isOpen: boolean;
  /** 1=dim, 2=soft, 3=bright. */
  lcdLevel: number;
}

export interface VibrationConfig {
  count: number;
  level: number;
}

export interface RwfitEventPayloadMap {
  'rwfit:scanResult': BleDevice;
  'rwfit:scanFinish': DynamicMap;
  'rwfit:connectState': ConnectStateEvent;
  'rwfit:functionMenu': FunctionMenu;
  'rwfit:healthData': RealtimeData;
  'rwfit:realtimeMeasureComplete': DynamicMap;
  'rwfit:workoutRealtimeData': WorkoutRealtimeData;
  /** Health sync completion marker. Currently emits 100 only; intermediate progress is not guaranteed. */
  'rwfit:syncProgress': {progress: number};
  'rwfit:syncResult': SyncResult;
  'rwfit:syncFinish': DynamicMap;
  'rwfit:syncError': {code: number; message?: string};
  /** OTA transfer progress normalized to the inclusive range 0–1 on both platforms. */
  'rwfit:otaProgress': {progress: number};
  'rwfit:otaFinish': DynamicMap;
  'rwfit:touchEvent': TouchEvent;
  'rwfit:callControl': CallControlEvent;
  'rwfit:healthAlert': HealthAlertEvent;
  'rwfit:heartRateCalibration': HeartRateCalibrationResult;
  'rwfit:sensorRawData': SensorRawPacket;
  'rwfit:sensorRawStopped': SensorRawStoppedEvent;
}

export interface RwfitSubscription {
  remove(): void;
}
