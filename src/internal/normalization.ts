import {
  CallControlAction,
  HealthAlertType,
  HealthType,
  SensorRawDataType,
  WorkoutControlType,
  WorkoutDataType,
  type TouchAction,
} from '../constants';
import type {
  AccRawSample,
  CallControlEvent,
  DynamicMap,
  FirmwareInfo,
  FunctionMenu,
  HealthAlertEvent,
  HeartRateAlertConfig,
  HeartRateCalibrationResult,
  BloodOxygenAlertConfig,
  Alarm,
  LedLevel,
  RealtimeData,
  ScheduleToggle,
  SensorRawPacket,
  SleepRawSample,
  TimedConfig,
  TouchEvent,
  VibrationConfig,
  WorkoutRealtimeData,
  WorkoutReport,
  WorkoutState,
  WorkoutValueItem,
} from '../types';

const touchActions = new Set<TouchAction>([
  'cameraTakePicture',
  'musicPlay',
  'musicPause',
  'musicPrev',
  'musicNext',
  'musicVolumeUp',
  'musicVolumeDown',
  'singleTap',
  'doubleTap',
  'tripleTap',
  'longPress',
  'swing',
  'fallDetected',
  'unknown',
]);

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function integerValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : fallback;
}

function optionalInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : undefined;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function mapValue(value: unknown): DynamicMap {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as DynamicMap
    : {};
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number')
    : [];
}

function enumValue<T extends number>(
  raw: number,
  values: readonly T[],
  fallback: T,
): T {
  return values.includes(raw as T) ? raw as T : fallback;
}

export function normalizeFunctionMenu(raw: DynamicMap): FunctionMenu {
  const menu = mapValue(raw.supportMenu);
  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    mac: typeof raw.mac === 'string' ? raw.mac : '',
    uuid: typeof raw.uuid === 'string' ? raw.uuid : undefined,
    raw: menu,
    supportsWorkout: menu.isSupportWorkout === true,
  };
}

export function normalizeWorkoutState(raw: DynamicMap): WorkoutState {
  const controlType = enumValue(
    numberValue(raw.controlType, WorkoutControlType.Unknown),
    Object.values(WorkoutControlType).filter(
      (item): item is WorkoutControlType => typeof item === 'number',
    ),
    WorkoutControlType.Unknown,
  );
  return {
    sportType: numberValue(raw.sportType),
    controlType,
    isRunning: controlType === WorkoutControlType.Start
      || controlType === WorkoutControlType.Resume
      || controlType === WorkoutControlType.Pause,
  };
}

export function normalizeRealtimeData(raw: DynamicMap): RealtimeData {
  const rawType = numberValue(raw.dataType, -1);
  const healthTypes = Object.values(HealthType).filter(
    (item): item is HealthType => typeof item === 'number',
  );
  const timestampSec = numberValue(raw.time);
  return {
    type: healthTypes.includes(rawType as HealthType) ? rawType as HealthType : null,
    value: numberValue(raw.dataValue),
    diastolic: optionalNumber(raw.diastolic),
    timestampSec,
    timestampMs: timestampSec * 1000,
  };
}

export function normalizeWorkoutRealtimeData(
  raw: DynamicMap,
): WorkoutRealtimeData {
  const rawDataType = numberValue(raw.dataType, WorkoutDataType.Unknown);
  return {
    duration: numberValue(raw.duration),
    steps: numberValue(raw.steps),
    distance: numberValue(raw.distance),
    calorie: numberValue(raw.calorie),
    heartRate: numberValue(raw.heartRate),
    dataType: enumValue(
      rawDataType,
      [WorkoutDataType.AppWorkoutData, WorkoutDataType.EnterOrExitWorkout],
      WorkoutDataType.Unknown,
    ),
    rawDataType,
  };
}

export function normalizeFirmwareInfo(raw: DynamicMap): FirmwareInfo {
  return {
    deviceClazz: stringValue(raw.deviceClazz),
    deviceNo: stringValue(raw.deviceNo),
    uiVersion: stringValue(raw.uiVersion),
  };
}

export function normalizeTimedConfigResult(raw: DynamicMap): TimedConfig {
  return {
    isOpen: raw.isOpen === true,
    duration: integerValue(raw.duration, 60),
    startHour: integerValue(raw.startHour),
    startMin: integerValue(raw.startMin),
    endHour: integerValue(raw.endHour, 23),
    endMin: integerValue(raw.endMin, 59),
  };
}

function normalizeWorkoutValueItem(raw: unknown): WorkoutValueItem {
  const item = mapValue(raw);
  return {
    index: integerValue(item.index),
    value: integerValue(item.value),
  };
}

export function normalizeWorkoutReport(raw: DynamicMap): WorkoutReport {
  return {
    startTime: integerValue(raw.startTime),
    endTime: integerValue(raw.endTime),
    date: stringValue(raw.date),
    sportType: integerValue(raw.sportType),
    duration: integerValue(raw.duration),
    step: integerValue(raw.step),
    distance: integerValue(raw.distance),
    calorie: integerValue(raw.calorie),
    height: integerValue(raw.height),
    pressure: integerValue(raw.pressure),
    cadence: integerValue(raw.cadence),
    speed: numberValue(raw.speed),
    pace: integerValue(raw.pace),
    averageHeartRate: integerValue(raw.averageHeartRate),
    maxHeartRate: integerValue(raw.maxHeartRate),
    minHeartRate: integerValue(raw.minHeartRate),
    maxCadence: integerValue(raw.maxCadence),
    minCadence: integerValue(raw.minCadence),
    maxPace: integerValue(raw.maxPace),
    minPace: integerValue(raw.minPace),
    heartRateCount: integerValue(raw.heartRateCount),
    viewType: integerValue(raw.viewType),
    heartRateItems: Array.isArray(raw.heartRateItems)
      ? raw.heartRateItems.map(normalizeWorkoutValueItem)
      : [],
    pacePerKmItems: Array.isArray(raw.pacePerKmItems)
      ? raw.pacePerKmItems.map(normalizeWorkoutValueItem)
      : [],
  };
}

export function normalizeWorkoutReports(raw: unknown): WorkoutReport[] {
  return Array.isArray(raw)
    ? raw.map(item => normalizeWorkoutReport(mapValue(item)))
    : [];
}

export function normalizeHeartRateAlertConfig(
  raw: DynamicMap,
): HeartRateAlertConfig {
  return {
    isOpen: raw.isOpen === true,
    highThreshold: integerValue(raw.highThreshold, 160),
    lowThreshold: optionalInteger(raw.lowThreshold),
  };
}

export function normalizeBloodOxygenAlertConfig(
  raw: DynamicMap,
): BloodOxygenAlertConfig {
  return {
    isOpen: raw.isOpen === true,
    lowThreshold: integerValue(raw.lowThreshold, 94),
  };
}

export function normalizeScheduleToggle(raw: DynamicMap): ScheduleToggle {
  return {
    isOpen: raw.isOpen === true,
    startHour: integerValue(raw.startHour),
    startMin: integerValue(raw.startMin),
    endHour: integerValue(raw.endHour, 23),
    endMin: integerValue(raw.endMin, 59),
  };
}

export function normalizeLedLevel(raw: DynamicMap): LedLevel {
  return {
    isOpen: raw.isOpen === true,
    lcdLevel: integerValue(raw.lcdLevel, 1),
  };
}

export function normalizeVibrationConfig(raw: DynamicMap): VibrationConfig {
  return {
    count: integerValue(raw.count),
    level: integerValue(raw.level),
  };
}

export function normalizeAlarm(raw: DynamicMap): Alarm {
  return {
    alarmId: integerValue(raw.alarmId),
    startHour: integerValue(raw.startHour),
    startMin: integerValue(raw.startMin),
    isOpen: raw.isOpen === true,
    repeats: Array.isArray(raw.repeats)
      ? raw.repeats.map(value => integerValue(value))
      : [0, 0, 0, 0, 0, 0, 0],
  };
}

export function normalizeAlarmsResult(raw: unknown): Alarm[] {
  return Array.isArray(raw)
    ? raw.map(item => normalizeAlarm(mapValue(item)))
    : [];
}

export function normalizeTouchEvent(raw: DynamicMap): TouchEvent {
  const rawAction = typeof raw.action === 'string' ? raw.action : '';
  return {
    action: touchActions.has(rawAction as TouchAction)
      ? rawAction as TouchAction
      : 'unknown',
    rawAction,
    keyType: numberValue(raw.keyType),
    touchType: numberValue(raw.touchType),
  };
}

export function normalizeCallControlEvent(raw: DynamicMap): CallControlEvent {
  return {
    action: raw.action === 'answer'
      ? CallControlAction.Answer
      : raw.action === 'reject'
        ? CallControlAction.Reject
        : null,
    rawValue: numberValue(raw.rawValue, -1),
  };
}

export function normalizeHealthAlertEvent(raw: DynamicMap): HealthAlertEvent {
  const rawType = numberValue(raw.type, HealthAlertType.Unknown);
  return {
    type: enumValue(
      rawType,
      [
        HealthAlertType.HighHeartRate,
        HealthAlertType.LowBloodOxygen,
        HealthAlertType.LowHeartRate,
      ],
      HealthAlertType.Unknown,
    ),
    rawType,
    value: numberValue(raw.value),
  };
}

export function normalizeHeartRateCalibration(
  raw: DynamicMap,
): HeartRateCalibrationResult {
  const result = numberValue(raw.result);
  return {
    testMode: numberValue(raw.testMode),
    result,
    isCalibrating: result === 0,
    isCompleted: result !== 0,
  };
}

export function normalizeSensorRawPacket(raw: DynamicMap): SensorRawPacket {
  const rawType = numberValue(raw.type, SensorRawDataType.Unknown);
  const acc: AccRawSample[] = Array.isArray(raw.acc)
    ? raw.acc.map(item => {
      const sample = mapValue(item);
      return {
        x: numberValue(sample.x),
        y: numberValue(sample.y),
        z: numberValue(sample.z),
      };
    })
    : [];
  const sleep: SleepRawSample[] = Array.isArray(raw.sleep)
    ? raw.sleep.map(item => {
      const sample = mapValue(item);
      return {
        timestampSec: numberValue(sample.timestampSec),
        mode: numberValue(sample.mode),
      };
    })
    : [];
  return {
    type: enumValue(
      rawType,
      [
        SensorRawDataType.Timestamp,
        SensorRawDataType.Ppg,
        SensorRawDataType.Acc,
        SensorRawDataType.PpgRed,
        SensorRawDataType.Ir,
        SensorRawDataType.Sleep,
      ],
      SensorRawDataType.Unknown,
    ),
    rawType,
    sequence: optionalNumber(raw.sequence),
    timestampSec: optionalNumber(raw.timestampSec),
    ppg: numberArray(raw.ppg),
    acc,
    ppgRed: numberArray(raw.ppgRed),
    ir: numberArray(raw.ir),
    sleep,
  };
}
