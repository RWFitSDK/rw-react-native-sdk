export const RwfitEvents = {
  scanResult: 'rwfit:scanResult',
  scanFinish: 'rwfit:scanFinish',
  connectState: 'rwfit:connectState',
  functionMenu: 'rwfit:functionMenu',
  healthData: 'rwfit:healthData',
  realtimeMeasureComplete: 'rwfit:realtimeMeasureComplete',
  workoutRealtimeData: 'rwfit:workoutRealtimeData',
  syncProgress: 'rwfit:syncProgress',
  syncResult: 'rwfit:syncResult',
  syncFinish: 'rwfit:syncFinish',
  syncError: 'rwfit:syncError',
  otaProgress: 'rwfit:otaProgress',
  otaFinish: 'rwfit:otaFinish',
  touchEvent: 'rwfit:touchEvent',
  callControl: 'rwfit:callControl',
  healthAlert: 'rwfit:healthAlert',
  heartRateCalibration: 'rwfit:heartRateCalibration',
  sensorRawData: 'rwfit:sensorRawData',
  sensorRawStopped: 'rwfit:sensorRawStopped',
} as const;

export type RwfitEventName =
  (typeof RwfitEvents)[keyof typeof RwfitEvents];
