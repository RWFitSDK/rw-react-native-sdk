import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeAlarmsResult,
  normalizeBloodOxygenAlertConfig,
  normalizeFirmwareInfo,
  normalizeHeartRateAlertConfig,
  normalizeLedLevel,
  normalizeScheduleToggle,
  normalizeTimedConfigResult,
  normalizeVibrationConfig,
  normalizeWorkoutReports,
} from '../lib/module/internal/normalization.js';
import {validateAlarmVibrationDuration} from '../lib/module/internal/validation.js';

test('alarm vibration duration validates the native protocol count range', () => {
  assert.doesNotThrow(() => validateAlarmVibrationDuration(0));
  assert.doesNotThrow(() => validateAlarmVibrationDuration(6));
  assert.throws(() => validateAlarmVibrationDuration(-1), RangeError);
  assert.throws(() => validateAlarmVibrationDuration(7), RangeError);
  assert.throws(() => validateAlarmVibrationDuration(1.5), TypeError);
});

test('configuration models use the same defaults as Flutter fromMap', () => {
  assert.deepEqual(normalizeFirmwareInfo({}), {
    deviceClazz: '',
    deviceNo: '',
    uiVersion: '',
  });
  assert.deepEqual(normalizeHeartRateAlertConfig({}), {
    isOpen: false,
    highThreshold: 160,
    lowThreshold: undefined,
  });
  assert.deepEqual(normalizeBloodOxygenAlertConfig({}), {
    isOpen: false,
    lowThreshold: 94,
  });
  assert.deepEqual(normalizeTimedConfigResult({}), {
    isOpen: false,
    duration: 60,
    startHour: 0,
    startMin: 0,
    endHour: 23,
    endMin: 59,
  });
  assert.deepEqual(normalizeScheduleToggle({}), {
    isOpen: false,
    startHour: 0,
    startMin: 0,
    endHour: 23,
    endMin: 59,
  });
  assert.deepEqual(normalizeLedLevel({}), {isOpen: false, lcdLevel: 1});
  assert.deepEqual(normalizeVibrationConfig({}), {count: 0, level: 0});
});

test('invalid native field types cannot leak undefined or NaN', () => {
  assert.deepEqual(
    normalizeHeartRateAlertConfig({
      isOpen: 'yes',
      highThreshold: '160',
      lowThreshold: Number.NaN,
    }),
    {isOpen: false, highThreshold: 160, lowThreshold: undefined},
  );
  assert.deepEqual(
    normalizeScheduleToggle({
      isOpen: 1,
      startHour: 8.9,
      startMin: '30',
      endHour: Number.POSITIVE_INFINITY,
      endMin: null,
    }),
    {isOpen: false, startHour: 8, startMin: 0, endHour: 23, endMin: 59},
  );
});

test('workout reports recursively normalize value items and every field', () => {
  const [report] = normalizeWorkoutReports([
    {
      startTime: 10.8,
      date: '20260801',
      speed: 4.25,
      maxHeartRate: 'bad',
      heartRateItems: [{index: 1.9, value: 120.7}, null],
      pacePerKmItems: [{index: 2, value: 300}],
    },
  ]);

  assert.deepEqual(report, {
    startTime: 10,
    endTime: 0,
    date: '20260801',
    sportType: 0,
    duration: 0,
    step: 0,
    distance: 0,
    calorie: 0,
    height: 0,
    pressure: 0,
    cadence: 0,
    speed: 4.25,
    pace: 0,
    averageHeartRate: 0,
    maxHeartRate: 0,
    minHeartRate: 0,
    maxCadence: 0,
    minCadence: 0,
    maxPace: 0,
    minPace: 0,
    heartRateCount: 0,
    viewType: 0,
    heartRateItems: [
      {index: 1, value: 120},
      {index: 0, value: 0},
    ],
    pacePerKmItems: [{index: 2, value: 300}],
  });
  assert.deepEqual(normalizeWorkoutReports(undefined), []);
  assert.deepEqual(normalizeWorkoutReports({data: []}), []);
});

test('alarm list normalization applies stable defaults', () => {
  assert.deepEqual(normalizeAlarmsResult([{}]), [
    {
      alarmId: 0,
      startHour: 0,
      startMin: 0,
      isOpen: false,
      repeats: [0, 0, 0, 0, 0, 0, 0],
    },
  ]);
  assert.deepEqual(normalizeAlarmsResult(null), []);
});
