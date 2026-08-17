import { RealtimeMetric } from 'react-native-rwfit-ble';
import { CapabilityKey } from './capabilities';

export const HealthTypeId = {
  step: 'step',
  heartRate: 'hr',
  sleep: 'sleep',
  workout: 'workout',
  bloodOxygen: 'bo',
  hrv: 'hrv',
  pressure: 'pressure',
  bloodPressure: 'bp',
  bloodSugar: 'bloodSugar',
  temperature: 'temp',
  muslimCount: 'muslimCount',
} as const;

export type HealthTypeIdValue =
  (typeof HealthTypeId)[keyof typeof HealthTypeId];

export interface HealthDefinition {
  type: HealthTypeIdValue;
  titleZh: string;
  titleEn: string;
  color: string;
  capabilityKey: string;
  /** 为空表示该数据类型不提供手动实时检测入口。 */
  realtimeMetric?: RealtimeMetric;
}

/** 对齐 Flutter demo 的 health_metadata.dart。 */
export const healthDefinitions: HealthDefinition[] = [
  {
    type: HealthTypeId.step,
    titleZh: '计步',
    titleEn: 'Steps',
    color: '#32A874',
    capabilityKey: CapabilityKey.step,
  },
  {
    type: HealthTypeId.heartRate,
    titleZh: '心率',
    titleEn: 'Heart rate',
    color: '#E75B67',
    capabilityKey: CapabilityKey.heartRate,
    realtimeMetric: RealtimeMetric.Hr,
  },
  {
    type: HealthTypeId.sleep,
    titleZh: '睡眠',
    titleEn: 'Sleep',
    color: '#6C72C9',
    capabilityKey: CapabilityKey.sleep,
  },
  {
    type: HealthTypeId.workout,
    titleZh: '多运动',
    titleEn: 'Workouts',
    color: '#F29B4B',
    capabilityKey: CapabilityKey.workout,
  },
  {
    type: HealthTypeId.bloodOxygen,
    titleZh: '血氧',
    titleEn: 'Blood oxygen',
    color: '#3D91D7',
    capabilityKey: CapabilityKey.bloodOxygen,
    realtimeMetric: RealtimeMetric.BloodOxy,
  },
  {
    type: HealthTypeId.hrv,
    titleZh: 'HRV',
    titleEn: 'HRV',
    color: '#9B68C7',
    capabilityKey: CapabilityKey.hrv,
    realtimeMetric: RealtimeMetric.Hrv,
  },
  {
    type: HealthTypeId.pressure,
    titleZh: '压力',
    titleEn: 'Stress',
    color: '#DE8D37',
    capabilityKey: CapabilityKey.pressure,
    realtimeMetric: RealtimeMetric.Pressure,
  },
  {
    type: HealthTypeId.bloodPressure,
    titleZh: '血压',
    titleEn: 'Blood pressure',
    color: '#DC6475',
    capabilityKey: CapabilityKey.bloodPressure,
    realtimeMetric: RealtimeMetric.BloodPressure,
  },
  {
    type: HealthTypeId.bloodSugar,
    titleZh: '血糖',
    titleEn: 'Blood sugar',
    color: '#B68145',
    capabilityKey: CapabilityKey.bloodSugar,
    realtimeMetric: RealtimeMetric.BloodSugar,
  },
  {
    type: HealthTypeId.temperature,
    titleZh: '体温',
    titleEn: 'Temperature',
    color: '#E27350',
    capabilityKey: CapabilityKey.bodyTemperature,
    realtimeMetric: RealtimeMetric.Temperature,
  },
  {
    type: HealthTypeId.muslimCount,
    titleZh: '赞念计数',
    titleEn: 'Prayer count',
    color: '#4A9B8E',
    capabilityKey: CapabilityKey.muslimCountData,
  },
];

export function healthDefinitionFor(
  type: string,
): HealthDefinition | undefined {
  return healthDefinitions.find(definition => definition.type === type);
}
