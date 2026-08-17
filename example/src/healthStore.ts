import {HealthType, type RealtimeData, type SyncResult} from 'react-native-rwfit-ble';
import type {Language} from './i18n';
import {HealthTypeId, type HealthTypeIdValue} from './healthMetadata';

export interface SleepSegment {
  minutes: number;
  type: number;
}

/** Demo 首页和历史页使用的结构化健康记录。 */
export interface HealthRecord {
  type: HealthTypeIdValue | string;
  measuredAtSec: number;
  values: Record<string, unknown>;
}

export function isDailySummary(record: HealthRecord): boolean {
  return record.values.dailySummary === true;
}

function tr(language: Language, zh: string, en: string): string {
  return language === 'zh' ? zh : en;
}

function integer(value: unknown): number {
  return typeof value === 'number' ? Math.trunc(value) : 0;
}

function num(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function positiveOrFallback(value: unknown, fallback: number): number {
  const parsed = integer(value);
  return parsed > 0 ? parsed : fallback;
}

function compact(value: number): string {
  return value % 1 === 0 ? String(Math.trunc(value)) : value.toFixed(1);
}

function unitFor(type: string): string {
  switch (type) {
    case HealthTypeId.heartRate:
      return ' bpm';
    case HealthTypeId.bloodOxygen:
      return '%';
    case HealthTypeId.hrv:
      return ' ms';
    case HealthTypeId.bloodSugar:
      return ' mmol/L';
    case HealthTypeId.temperature:
      return ' ℃';
    default:
      return '';
  }
}

function formatCalories(value: unknown): string {
  return `${compact(num(value) / 1000)} kcal`;
}

function formatDuration(language: Language, minutes: number): string {
  const hours = Math.trunc(minutes / 60);
  const mins = minutes % 60;
  return tr(language, `${hours} 小时 ${mins} 分`, `${hours} h ${mins} min`);
}

function formatClock(timestampSec: number): string {
  if (timestampSec <= 0) {
    return '--:--';
  }
  const date = new Date(timestampSec * 1000);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function sleepSegments(record: HealthRecord): SleepSegment[] {
  const raw = record.values.segments;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(item => ({minutes: integer(item.minutes), type: integer(item.type)}));
}

export function sleepSegmentLabel(language: Language, type: number): string {
  switch (type) {
    case 0:
      return tr(language, '清醒', 'Awake');
    case 1:
      return tr(language, '浅睡', 'Light sleep');
    case 2:
      return tr(language, '深睡', 'Deep sleep');
    case 3:
      return 'REM';
    default:
      return tr(language, '未知', 'Unknown');
  }
}

function sleepSummary(language: Language, record: HealthRecord): string {
  const begin = formatClock(integer(record.values.beginTime));
  const end = formatClock(integer(record.values.endTime));
  const totals = new Map<number, number>();
  for (const segment of sleepSegments(record)) {
    totals.set(segment.type, (totals.get(segment.type) ?? 0) + segment.minutes);
  }
  const parts = [tr(language, `入睡 ${begin} · 醒来 ${end}`, `Asleep ${begin} · Awake ${end}`)];
  const deep = totals.get(2) ?? 0;
  const light = totals.get(1) ?? 0;
  const rem = totals.get(3) ?? 0;
  if (deep > 0) {
    parts.push(tr(language, `深睡 ${deep} 分`, `Deep ${deep} min`));
  }
  if (light > 0) {
    parts.push(tr(language, `浅睡 ${light} 分`, `Light ${light} min`));
  }
  if (rem > 0) {
    parts.push(`REM ${rem} min`);
  }
  return parts.join(' · ');
}

export function valueText(language: Language, record: HealthRecord): string {
  switch (record.type) {
    case HealthTypeId.step:
      return tr(
        language,
        `${integer(record.values.steps)} 步`,
        `${integer(record.values.steps)} steps`,
      );
    case HealthTypeId.sleep:
      return formatDuration(language, integer(record.values.durationMinutes));
    case HealthTypeId.muslimCount:
      return tr(
        language,
        `${integer(record.values.count)} 次`,
        `${integer(record.values.count)} times`,
      );
    case HealthTypeId.bloodPressure:
      return `${integer(record.values.systolic)}/${integer(record.values.diastolic)} mmHg`;
    default:
      return `${compact(num(record.values.value))}${unitFor(record.type)}`;
  }
}

export function summaryText(language: Language, record: HealthRecord): string {
  if (record.values.realtime === true) {
    return tr(language, '实时检测', 'Real-time measurement');
  }
  switch (record.type) {
    case HealthTypeId.step:
      return `${integer(record.values.distanceMeters)} m · ${formatCalories(record.values.calories)}`;
    case HealthTypeId.sleep:
      return sleepSummary(language, record);
    default:
      return '';
  }
}

export function parseSyncResult(result: SyncResult): HealthRecord[] {
  const records: HealthRecord[] = [];
  for (const day of result.data) {
    const dayTime = integer(day.time);
    if (result.type === HealthTypeId.step) {
      records.push({
        type: result.type,
        measuredAtSec: dayTime,
        values: {
          steps: integer(day.totalSteps),
          distanceMeters: integer(day.totalDistance),
          calories: num(day.totalCalorie),
          dailySummary: true,
        },
      });
      const items = Array.isArray(day.items) ? day.items : [];
      for (const rawItem of items) {
        if (typeof rawItem !== 'object' || rawItem === null) {
          continue;
        }
        const item = rawItem as Record<string, unknown>;
        records.push({
          type: result.type,
          measuredAtSec: positiveOrFallback(item.time, dayTime),
          values: {
            steps: integer(item.steps),
            distanceMeters: integer(item.distance),
            calories: num(item.calorie),
          },
        });
      }
      continue;
    }
    if (result.type === HealthTypeId.sleep) {
      const endTime = positiveOrFallback(day.endTime, dayTime);
      const items = Array.isArray(day.items) ? day.items : [];
      records.push({
        type: result.type,
        measuredAtSec: endTime,
        values: {
          durationMinutes: integer(day.duration),
          beginTime: integer(day.beginTime),
          endTime: integer(day.endTime),
          segments: items
            .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
            .map(item => ({minutes: integer(item.len), type: integer(item.sleepType)})),
        },
      });
      continue;
    }
    if (result.type === HealthTypeId.muslimCount) {
      records.push({
        type: result.type,
        measuredAtSec: dayTime,
        values: {count: integer(day.totalCount), dailySummary: true},
      });
      const items = Array.isArray(day.items) ? day.items : [];
      for (const rawItem of items) {
        if (typeof rawItem !== 'object' || rawItem === null) {
          continue;
        }
        const item = rawItem as Record<string, unknown>;
        records.push({
          type: result.type,
          measuredAtSec: positiveOrFallback(item.time, dayTime),
          values: {count: integer(item.count)},
        });
      }
      continue;
    }

    const items = Array.isArray(day.items) ? day.items : [];
    for (const rawItem of items) {
      if (typeof rawItem === 'object' && rawItem !== null) {
        records.push(measurementRecord(result.type, rawItem as Record<string, unknown>, dayTime));
      }
    }
  }
  return records.filter(record => record.measuredAtSec > 0);
}

export function parseRealtime(data: RealtimeData): HealthRecord | undefined {
  const type = ((): HealthTypeIdValue | undefined => {
    switch (data.type) {
      case HealthType.Hr:
        return HealthTypeId.heartRate;
      case HealthType.BloodOxy:
        return HealthTypeId.bloodOxygen;
      case HealthType.BloodPressure:
        return HealthTypeId.bloodPressure;
      case HealthType.Pressure:
        return HealthTypeId.pressure;
      case HealthType.BloodSugar:
        return HealthTypeId.bloodSugar;
      case HealthType.MuslimCount:
        return HealthTypeId.muslimCount;
      case HealthType.Temperature:
        return HealthTypeId.temperature;
      case HealthType.Hrv:
        return HealthTypeId.hrv;
      default:
        return undefined;
    }
  })();
  if (!type) {
    return undefined;
  }
  const values =
    type === HealthTypeId.bloodPressure
      ? {systolic: data.value, diastolic: data.diastolic ?? 0, realtime: true}
      : type === HealthTypeId.muslimCount
        ? {count: data.value, realtime: true}
        : {value: data.value, realtime: true};
  return {type, measuredAtSec: data.timestampSec, values};
}

function measurementRecord(
  type: string,
  item: Record<string, unknown>,
  fallbackTime: number,
): HealthRecord {
  const timestamp = positiveOrFallback(item.time, fallbackTime);
  if (type === HealthTypeId.bloodPressure) {
    return {
      type,
      measuredAtSec: timestamp,
      values: {systolic: integer(item.systolic), diastolic: integer(item.diastolic)},
    };
  }
  const key = ((): string => {
    switch (type) {
      case HealthTypeId.heartRate:
        return 'hr';
      case HealthTypeId.bloodOxygen:
        return 'bloodOxy';
      case HealthTypeId.hrv:
        return 'hrv';
      case HealthTypeId.pressure:
        return 'pressure';
      case HealthTypeId.bloodSugar:
        return 'bloodSugar';
      case HealthTypeId.temperature:
        return 'temp';
      default:
        return '';
    }
  })();
  let value = num(item[key]);
  if (type === HealthTypeId.temperature) {
    value /= 10;
  }
  return {type, measuredAtSec: timestamp, values: {value}};
}

/** 与 Flutter demo 一致：同一轮同步按回调顺序追加，并按时间倒序显示。 */
export function appendHealthRecords(
  existing: HealthRecord[],
  incoming: HealthRecord[],
): HealthRecord[] {
  return [...existing, ...incoming].sort(
    (a, b) => b.measuredAtSec - a.measuredAtSec,
  );
}
