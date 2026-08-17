export enum HealthType {
  Hr = 1,
  BloodOxy = 3,
  BloodPressure = 4,
  Pressure = 8,
  BloodSugar = 9,
  MuslimCount = 10,
  Temperature = 11,
  Hrv = 13,
}

export enum RealtimeMetric {
  Hr = 'JL_HR_DATA_TRANSFER_KEY',
  BloodOxy = 'JL_BO_DATA_TRANSFER_KEY',
  Hrv = 'JL_HRV_DATA_TRANSFER_KEY',
  Pressure = 'JL_PRESSURE_DATA_TRANSFER_KEY',
  BloodSugar = 'JL_BLOODSUGAR_DATA_TRANSFER_KEY',
  BloodPressure = 'JL_BP_DATA_TRANSFER_KEY',
  Temperature = 'JL_TEMP_DATA_TRANSFER_KEY',
}

export enum PowerOffType {
  Shutdown = 1,
  FactoryReset = 2,
}

export enum WorkoutControlType {
  Start = 0x01,
  Resume = 0x02,
  Pause = 0x03,
  End = 0x04,
  Unknown = -1,
}

export enum WorkoutDataType {
  AppWorkoutData = 0x0223,
  EnterOrExitWorkout = 0x0274,
  Unknown = -1,
}

export enum CallControlAction {
  Answer = 0,
  Reject = 1,
}

export enum HealthAlertType {
  HighHeartRate = 0,
  LowBloodOxygen = 1,
  LowHeartRate = 2,
  Unknown = -1,
}

export enum SensorRawSelection {
  Acc = 1,
  PpgGreen = 2,
  PpgGreenAndAcc = 3,
  PpgRed = 4,
  PpgRedAndAcc = 5,
  PpgGreenAndIr = 10,
  PpgGreenAccAndIr = 11,
  PpgRedAndIr = 12,
  PpgRedAccAndIr = 13,
}

export enum SensorRawDataType {
  Timestamp = 0,
  Ppg = 1,
  Acc = 2,
  PpgRed = 3,
  Ir = 4,
  Sleep = 5,
  Unknown = -1,
}

export type ConnectState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export type TouchAction =
  | 'cameraTakePicture'
  | 'musicPlay'
  | 'musicPause'
  | 'musicPrev'
  | 'musicNext'
  | 'musicVolumeUp'
  | 'musicVolumeDown'
  | 'singleTap'
  | 'doubleTap'
  | 'tripleTap'
  | 'longPress'
  | 'swing'
  | 'fallDetected'
  | 'unknown';
