import AsyncStorage from '@react-native-async-storage/async-storage';
import type {BleDevice, DynamicMap} from 'react-native-rwfit-ble';

/**
 * 已连接设备的本地持久化（对标 Flutter demo 的 device_store.dart）。
 *
 * 仅 Demo 演示用：保存最近连接成功的设备，供下次启动重连。
 */
const deviceKey = 'rwfit_saved_device';
const capabilitiesKey = 'rwfit_saved_capabilities';
const lastSyncKey = 'rwfit_last_health_sync';

export async function loadDevice(): Promise<BleDevice | undefined> {
  const raw = await AsyncStorage.getItem(deviceKey);
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as BleDevice;
  } catch {
    return undefined;
  }
}

export async function saveDevice(device: BleDevice): Promise<void> {
  await AsyncStorage.setItem(deviceKey, JSON.stringify(device));
}

export async function loadCapabilities(): Promise<DynamicMap> {
  const raw = await AsyncStorage.getItem(capabilitiesKey);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as DynamicMap;
  } catch {
    return {};
  }
}

export async function saveCapabilities(capabilities: DynamicMap): Promise<void> {
  await AsyncStorage.setItem(capabilitiesKey, JSON.stringify(capabilities));
}

export async function loadLastSyncAt(): Promise<number | undefined> {
  const raw = await AsyncStorage.getItem(lastSyncKey);
  if (!raw) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export async function saveLastSyncAt(epochMs: number): Promise<void> {
  await AsyncStorage.setItem(lastSyncKey, String(epochMs));
}

export async function clearLastSyncAt(): Promise<void> {
  await AsyncStorage.removeItem(lastSyncKey);
}

/** 用户明确解除绑定后清除设备和已缓存的功能表。 */
export async function clearDevice(): Promise<void> {
  await AsyncStorage.removeMany([deviceKey, capabilitiesKey, lastSyncKey]);
}
