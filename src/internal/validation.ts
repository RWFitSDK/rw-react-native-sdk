import {WorkoutControlType, type RealtimeMetric} from '../constants';
import type {Alarm, BleDevice, ScheduleToggle, TimedConfig} from '../types';

export function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer`);
  }
}

export function assertRange(
  value: number,
  min: number,
  max: number,
  name: string,
): void {
  assertInteger(value, name);
  if (value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}`);
  }
}

export function validateDevice(device: BleDevice): void {
  if (!device || typeof device !== 'object') {
    throw new TypeError('device is required');
  }
  if (typeof device.name !== 'string' || typeof device.mac !== 'string') {
    throw new TypeError('device.name and device.mac must be strings');
  }
  if (!Number.isFinite(device.rssi)) {
    throw new TypeError('device.rssi must be a finite number');
  }
}

export function validateWorkout(sportType: number, controlType: number): void {
  assertRange(sportType, 7, 161, 'sportType');
  if (controlType === WorkoutControlType.Unknown) {
    throw new RangeError('controlType cannot be Unknown');
  }
  if (![1, 2, 3, 4].includes(controlType)) {
    throw new RangeError('controlType must be Start, Resume, Pause or End');
  }
}

/** The native API says "duration", but the protocol value is a count. */
export function validateAlarmVibrationDuration(duration: number): void {
  assertRange(duration, 0, 6, 'duration');
}

function validateClock(config: ScheduleToggle, prefix = 'config'): void {
  assertRange(config.startHour ?? 0, 0, 23, `${prefix}.startHour`);
  assertRange(config.startMin ?? 0, 0, 59, `${prefix}.startMin`);
  assertRange(config.endHour ?? 23, 0, 23, `${prefix}.endHour`);
  assertRange(config.endMin ?? 59, 0, 59, `${prefix}.endMin`);
}

export function normalizeTimedConfig(config: TimedConfig): Required<TimedConfig> {
  validateClock(config, 'config');
  const duration = config.duration ?? 60;
  if (duration !== 30 && duration !== 60) {
    throw new RangeError('config.duration must be 30 or 60 minutes');
  }
  return {
    isOpen: config.isOpen,
    duration,
    startHour: config.startHour ?? 0,
    startMin: config.startMin ?? 0,
    endHour: config.endHour ?? 23,
    endMin: config.endMin ?? 59,
  };
}

export function normalizeSchedule(
  config: ScheduleToggle,
): Required<ScheduleToggle> {
  validateClock(config);
  return {
    isOpen: config.isOpen,
    startHour: config.startHour ?? 0,
    startMin: config.startMin ?? 0,
    endHour: config.endHour ?? 23,
    endMin: config.endMin ?? 59,
  };
}

export function normalizeAlarms(alarms: Alarm[]): Alarm[] {
  if (!Array.isArray(alarms)) {
    throw new TypeError('alarms must be an array');
  }
  return alarms.map((alarm, index) => {
    assertRange(alarm.alarmId, 0, 255, `alarms[${index}].alarmId`);
    assertRange(alarm.startHour, 0, 23, `alarms[${index}].startHour`);
    assertRange(alarm.startMin, 0, 59, `alarms[${index}].startMin`);
    const repeats = alarm.repeats ?? [0, 0, 0, 0, 0, 0, 0];
    if (repeats.length !== 7 || repeats.some(value => value !== 0 && value !== 1)) {
      throw new RangeError(
        `alarms[${index}].repeats must contain seven 0/1 values`,
      );
    }
    return {...alarm, repeats};
  });
}

export function assertRealtimeMetric(metric: RealtimeMetric): void {
  if (typeof metric !== 'string' || metric.length === 0) {
    throw new TypeError('metric is required');
  }
}
