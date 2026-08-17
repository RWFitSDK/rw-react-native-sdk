import {
  HealthType,
  RealtimeMetric,
  type SyncResult,
} from 'react-native-rwfit-ble';
import { HealthTypeId, healthDefinitionFor } from '../src/healthMetadata';
import {
  parseRealtime,
  parseSyncResult,
  isDailySummary,
  appendHealthRecords,
  sleepSegmentLabel,
  sleepSegments,
  summaryText,
  valueText,
} from '../src/healthStore';

jest.mock('react-native-rwfit-ble', () => ({
  HealthType: {
    Hr: 1,
    BloodOxy: 3,
    BloodPressure: 4,
    Pressure: 8,
    BloodSugar: 9,
    MuslimCount: 10,
    Temperature: 11,
    Hrv: 13,
  },
  RealtimeMetric: {
    Hr: 'JL_HR_DATA_TRANSFER_KEY',
    BloodOxy: 'JL_BO_DATA_TRANSFER_KEY',
    Hrv: 'JL_HRV_DATA_TRANSFER_KEY',
    Pressure: 'JL_PRESSURE_DATA_TRANSFER_KEY',
    BloodSugar: 'JL_BLOODSUGAR_DATA_TRANSFER_KEY',
    BloodPressure: 'JL_BP_DATA_TRANSFER_KEY',
    Temperature: 'JL_TEMP_DATA_TRANSFER_KEY',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

test('parses daily and measurement sync records for health cards', () => {
  const steps = parseSyncResult({
    type: HealthTypeId.step,
    data: [
      {
        time: 100,
        totalSteps: 4321,
        totalDistance: 2800,
        totalCalorie: 123000,
      },
    ],
  } as SyncResult);
  const temperature = parseSyncResult({
    type: HealthTypeId.temperature,
    data: [{ time: 100, items: [{ time: 120, temp: 365 }] }],
  } as SyncResult);

  expect(valueText('zh', steps[0])).toBe('4321 步');
  expect(summaryText('zh', steps[0])).toBe('2800 m · 123 kcal');
  expect(valueText('zh', temperature[0])).toBe('36.5 ℃');
  expect(temperature[0].measuredAtSec).toBe(120);
  expect(valueText('en', steps[0])).toBe('4321 steps');
});

test('formats realtime blood pressure with its diastolic value', () => {
  const record = parseRealtime({
    type: HealthType.BloodPressure,
    value: 120,
    diastolic: 80,
    timestampSec: 200,
    timestampMs: 200000,
  });

  expect(record?.type).toBe(HealthTypeId.bloodPressure);
  expect(record && valueText('zh', record)).toBe('120/80 mmHg');
  expect(record && summaryText('zh', record)).toBe('实时检测');
  expect(record && summaryText('en', record)).toBe('Real-time measurement');
});

test('parses realtime prayer count and temperature', () => {
  const count = parseRealtime({
    type: HealthType.MuslimCount,
    value: 123,
    timestampSec: 200,
    timestampMs: 200000,
  });
  const temperature = parseRealtime({
    type: HealthType.Temperature,
    value: 36.5,
    timestampSec: 200,
    timestampMs: 200000,
  });

  expect(count && valueText('zh', count)).toBe('123 次');
  expect(temperature && valueText('zh', temperature)).toBe('36.5 ℃');
  expect(healthDefinitionFor(HealthTypeId.temperature)?.realtimeMetric).toBe(
    RealtimeMetric.Temperature,
  );
});

test('exposes manual measurement only for supported health types', () => {
  for (const type of [
    HealthTypeId.step,
    HealthTypeId.sleep,
    HealthTypeId.muslimCount,
  ]) {
    expect(healthDefinitionFor(type)?.realtimeMetric).toBeUndefined();
  }
  expect(healthDefinitionFor(HealthTypeId.heartRate)?.realtimeMetric).toBe(
    RealtimeMetric.Hr,
  );
});

test('keeps structured sleep segments for localized history details', () => {
  const records = parseSyncResult({
    type: HealthTypeId.sleep,
    data: [
      {
        time: 100,
        duration: 90,
        beginTime: 100,
        endTime: 200,
        items: [
          { len: 30, sleepType: 1 },
          { len: 60, sleepType: 2 },
        ],
      },
    ],
  } as SyncResult);

  expect(sleepSegments(records[0])).toHaveLength(2);
  expect(sleepSegmentLabel('zh', sleepSegments(records[0])[0].type)).toBe(
    '浅睡',
  );
  expect(sleepSegmentLabel('en', sleepSegments(records[0])[0].type)).toBe(
    'Light sleep',
  );
  expect(valueText('zh', records[0])).toBe('1 小时 30 分');
  expect(valueText('en', records[0])).toBe('1 h 30 min');
});

test('keeps the step total and every synchronized item separately', () => {
  const records = parseSyncResult({
    type: HealthTypeId.step,
    data: [
      {
        time: 100,
        totalSteps: 300,
        totalDistance: 210,
        totalCalorie: 12000,
        items: [
          {time: 100, index: 0, steps: 100, distance: 70, calorie: 4000},
          {time: 3700, index: 1, steps: 200, distance: 140, calorie: 8000},
        ],
      },
    ],
  } as SyncResult);

  expect(records).toHaveLength(3);
  expect(isDailySummary(records[0])).toBe(true);
  expect(valueText('zh', records[0])).toBe('300 步');
  expect(records.slice(1).every(record => !isDailySummary(record))).toBe(true);
  expect(valueText('zh', records[1])).toBe('100 步');
  expect(valueText('zh', records[2])).toBe('200 步');
  expect(records[2].measuredAtSec).toBe(3700);
});

test('keeps the prayer total and every synchronized item separately', () => {
  const records = parseSyncResult({
    type: HealthTypeId.muslimCount,
    data: [
      {
        time: 100,
        totalCount: 60,
        items: [
          {time: 200, count: 20},
          {time: 300, count: 40},
        ],
      },
    ],
  } as SyncResult);

  expect(records).toHaveLength(3);
  expect(isDailySummary(records[0])).toBe(true);
  expect(valueText('zh', records[0])).toBe('60 次');
  expect(records.slice(1).every(record => !isDailySummary(record))).toBe(true);
  expect(valueText('zh', records[1])).toBe('20 次');
  expect(valueText('zh', records[2])).toBe('40 次');
});

test('appends callbacks from one synchronization in time order', () => {
  const existing = [
    {type: HealthTypeId.heartRate, measuredAtSec: 100, values: {value: 60}},
  ];
  const incoming = [
    {type: HealthTypeId.heartRate, measuredAtSec: 300, values: {value: 80}},
    {type: HealthTypeId.heartRate, measuredAtSec: 200, values: {value: 70}},
  ];

  expect(appendHealthRecords(existing, incoming)).toEqual([
    incoming[0],
    incoming[1],
    existing[0],
  ]);
});
