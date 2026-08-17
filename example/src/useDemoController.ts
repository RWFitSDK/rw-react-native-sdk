/* eslint-disable no-void */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RwfitBle,
  type BleDevice,
  type ConnectState,
  type DynamicMap,
  type FirmwareInfo,
} from 'react-native-rwfit-ble';
import { DemoCapabilities } from './capabilities';
import * as DeviceStore from './deviceStore';
import { HealthTypeId } from './healthMetadata';
import {
  type HealthRecord,
  appendHealthRecords,
  isDailySummary,
  parseRealtime,
  parseSyncResult,
} from './healthStore';

const syncTypes = new Set<string>([
  HealthTypeId.step,
  HealthTypeId.sleep,
  HealthTypeId.heartRate,
  HealthTypeId.bloodOxygen,
  HealthTypeId.bloodPressure,
  HealthTypeId.hrv,
  HealthTypeId.pressure,
  HealthTypeId.bloodSugar,
  HealthTypeId.temperature,
  HealthTypeId.muslimCount,
]);

const supportedSyncKeys = [
  'isStep',
  'isSleep',
  'isHr',
  'isBloodOxy',
  'isBloodPress',
  'isHrv',
  'isPressure',
  'isBloodSugar',
  'isBodyTemp',
  'isMuslimCountData',
];

function deviceId(device: BleDevice | undefined): string | undefined {
  return device ? device.uuid ?? device.mac : undefined;
}

export interface DemoController {
  device: BleDevice | undefined;
  capabilities: DemoCapabilities;
  connectionState: ConnectState | 'idle';
  ready: boolean;
  connected: boolean;
  loadingSavedState: boolean;
  syncing: boolean;
  syncProgress: number;
  powerLevel: number | undefined;
  firmware: FirmwareInfo | undefined;
  sdkVersion: string | undefined;
  pluginVersion: string | undefined;
  lastSyncAt: number | undefined;
  lastError: string | undefined;
  recordsFor: (type: string) => HealthRecord[];
  latestFor: (type: string) => HealthRecord | undefined;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  unbind: () => Promise<void>;
  syncAllHealthData: () => Promise<void>;
  refreshDeviceInfo: (options?: { silent?: boolean }) => Promise<void>;
  prepareForScan: () => Promise<void>;
}

/**
 * Example 应用的轻量状态层，集中维护绑定、连接和健康数据状态。
 *
 * 对应 Flutter demo 的 demo_controller.dart：同步历史只保留当前同步结果，
 * 实时数据只更新 `realtimeRecords`，不写入历史，两者在 `latestFor` 汇合。
 */
export function useDemoController(): DemoController {
  const [device, setDevice] = useState<BleDevice | undefined>(undefined);
  const [capabilityMap, setCapabilityMap] = useState<DynamicMap>({});
  const [connectionState, setConnectionState] = useState<ConnectState | 'idle'>(
    'idle',
  );
  const [ready, setReady] = useState(false);
  const [loadingSavedState, setLoadingSavedState] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [powerLevel, setPowerLevel] = useState<number | undefined>(undefined);
  const [firmware, setFirmware] = useState<FirmwareInfo | undefined>(undefined);
  const [sdkVersion, setSdkVersion] = useState<string | undefined>(undefined);
  const [pluginVersion, setPluginVersion] = useState<string | undefined>(
    undefined,
  );
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>(undefined);
  const [lastError, setLastError] = useState<string | undefined>(undefined);
  const [historyRecords, setHistoryRecords] = useState<
    Record<string, HealthRecord[]>
  >({});
  const [realtimeRecords, setRealtimeRecords] = useState<
    Record<string, HealthRecord>
  >({});

  const deviceRef = useRef(device);
  deviceRef.current = device;
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const syncingRef = useRef(syncing);
  syncingRef.current = syncing;
  const historyRef = useRef(historyRecords);
  historyRef.current = historyRecords;
  const receivedSyncTypes = useRef(new Set<string>());
  const readyWaiters = useRef<
    Array<{ resolve: () => void; reject: (error: Error) => void }>
  >([]);
  const syncWaiter = useRef<
    | {
        promise: Promise<void>;
        resolve: () => void;
        reject: (error: Error) => void;
      }
    | undefined
  >(undefined);

  const connected = ready && connectionState === 'connected';

  // 供 onSyncResult 回调读取最新能力表，避免闭包捕获旧值。
  const capabilityMapRef = useRef(capabilityMap);
  capabilityMapRef.current = capabilityMap;

  const completeReadyWaiters = useCallback((error?: Error) => {
    const waiters = readyWaiters.current;
    readyWaiters.current = [];
    for (const waiter of waiters) {
      if (error) {
        waiter.reject(error);
      } else {
        waiter.resolve();
      }
    }
  }, []);

  const failSyncWaiter = useCallback((error: Error) => {
    syncingRef.current = false;
    setSyncing(false);
    setSyncProgress(0);
    const waiter = syncWaiter.current;
    syncWaiter.current = undefined;
    waiter?.reject(error);
  }, []);

  const appendIntoHistory = useCallback(
    (type: string, incoming: HealthRecord[]) => {
      const current = historyRef.current;
      const next = {
        ...current,
        [type]: appendHealthRecords(current[type] ?? [], incoming),
      };
      historyRef.current = next;
      setHistoryRecords(next);
    },
    [],
  );

  const refreshDeviceInfoInternal = useCallback(async (silent: boolean) => {
    try {
      const [power, firmwareInfo] = await Promise.all([
        RwfitBle.getPower(),
        RwfitBle.getFirmwareVersion(),
      ]);
      setPowerLevel(power);
      setFirmware(firmwareInfo);
    } catch (error) {
      if (!silent) {
        throw error;
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [savedDevice, savedCapabilities, savedLastSyncAt] =
        await Promise.all([
          DeviceStore.loadDevice(),
          DeviceStore.loadCapabilities(),
          DeviceStore.loadLastSyncAt(),
        ]);
      if (cancelled) {
        return;
      }
      if (readyRef.current) {
        setLoadingSavedState(false);
        return;
      }
      deviceRef.current = savedDevice;
      setDevice(savedDevice);
      setCapabilityMap(savedCapabilities);
      setLastSyncAt(savedLastSyncAt);
      historyRef.current = {};
      setHistoryRecords({});
      if (!cancelled) {
        setLoadingSavedState(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [version, plugin] = await Promise.all([
          RwfitBle.getSdkVersion(),
          RwfitBle.getPluginVersion(),
        ]);
        if (!cancelled) {
          setSdkVersion(version);
          setPluginVersion(plugin);
        }
      } catch {
        // 版本信息不影响设备连接和业务操作。
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const connectSub = RwfitBle.onConnectState(event => {
      setConnectionState(event.state);
      if (event.state === 'disconnected' || event.state === 'failed') {
        readyRef.current = false;
        setReady(false);
        setRealtimeRecords({});
        failSyncWaiter(
          new Error(
            event.reason ??
              (event.state === 'failed'
                ? 'Connection failed during sync'
                : 'Device disconnected during sync'),
          ),
        );
      }
      if (event.state === 'failed') {
        setLastError(event.reason);
        completeReadyWaiters(new Error(event.reason ?? 'Connection failed'));
      }
    });

    const menuSub = RwfitBle.onFunctionMenu(menu => {
      const connectedDevice: BleDevice = {
        name: menu.name,
        mac: menu.mac,
        rssi: 0,
        uuid: menu.uuid,
      };
      const previousId = deviceId(deviceRef.current);
      const nextId = deviceId(connectedDevice);
      deviceRef.current = connectedDevice;
      setDevice(connectedDevice);
      capabilityMapRef.current = menu.raw;
      setCapabilityMap(menu.raw);
      setConnectionState('connected');
      readyRef.current = true;
      setReady(true);
      setLastError(undefined);
      void DeviceStore.saveDevice(connectedDevice);
      void DeviceStore.saveCapabilities(menu.raw);
      void RwfitBle.iosSetBindedStatus(true).catch(() => undefined);
      if (previousId !== nextId) {
        historyRef.current = {};
        setHistoryRecords({});
        setRealtimeRecords({});
        setLastSyncAt(undefined);
        void DeviceStore.clearLastSyncAt();
      }
      completeReadyWaiters();
      void refreshDeviceInfoInternal(true);
    });

    const syncResultSub = RwfitBle.onSyncResult(result => {
      const parsed = parseSyncResult(result);
      appendIntoHistory(result.type, parsed);
      receivedSyncTypes.current.add(result.type);
      const supportedCount = supportedSyncKeys.filter(
        key => capabilityMapRef.current[key] === true,
      ).length;
      const receivedCount = Array.from(receivedSyncTypes.current).filter(type =>
        syncTypes.has(type),
      ).length;
      setSyncProgress(
        supportedCount === 0
          ? 0.1
          : Math.min(0.95, Math.max(0.08, receivedCount / supportedCount)),
      );
    });

    const syncProgressSub = RwfitBle.onSyncProgress(progress => {
      setSyncing(current => {
        if (current && progress >= 100) {
          setSyncProgress(0.98);
        }
        return current;
      });
    });

    const syncFinishSub = RwfitBle.onSyncFinish(() => {
      syncingRef.current = false;
      setSyncing(false);
      setSyncProgress(1);
      const now = Date.now();
      setLastSyncAt(now);
      void DeviceStore.saveLastSyncAt(now);
      const waiter = syncWaiter.current;
      syncWaiter.current = undefined;
      waiter?.resolve();
    });

    const syncErrorSub = RwfitBle.onSyncError(error => {
      const message = `code=${error.code}`;
      setLastError(message);
      failSyncWaiter(new Error(message));
    });

    const realtimeSub = RwfitBle.onRealtimeData(data => {
      const record = parseRealtime(data);
      if (!record) {
        return;
      }
      setRealtimeRecords(current => ({ ...current, [record.type]: record }));
    });

    return () => {
      connectSub.remove();
      menuSub.remove();
      syncResultSub.remove();
      syncProgressSub.remove();
      syncFinishSub.remove();
      syncErrorSub.remove();
      realtimeSub.remove();
      const disposedError = new Error('Demo controller disposed');
      completeReadyWaiters(disposedError);
      const waiter = syncWaiter.current;
      syncWaiter.current = undefined;
      syncingRef.current = false;
      waiter?.reject(disposedError);
      void RwfitBle.removeHealthDataCallback().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capabilities = useMemo(
    () => new DemoCapabilities(capabilityMap),
    [capabilityMap],
  );

  const recordsFor = useCallback(
    (type: string) => {
      const records = historyRecords[type] ?? [];
      if (type !== HealthTypeId.step && type !== HealthTypeId.muslimCount) {
        return records;
      }
      return records.filter(record => !isDailySummary(record));
    },
    [historyRecords],
  );

  const latestFor = useCallback(
    (type: string) => {
      const realtime = realtimeRecords[type];
      if (realtime) {
        return realtime;
      }
      const records = historyRecords[type] ?? [];
      if (type === HealthTypeId.step || type === HealthTypeId.muslimCount) {
        return records.find(isDailySummary) ?? records[0];
      }
      return records[0];
    },
    [realtimeRecords, historyRecords],
  );

  const reconnect = useCallback(async () => {
    const savedDevice = deviceRef.current;
    if (!savedDevice) {
      throw new Error('No saved device');
    }
    if (readyRef.current) {
      return;
    }
    setConnectionState('connecting');
    setLastError(undefined);
    let settle:
      | { resolve: () => void; reject: (error: Error) => void }
      | undefined;
    const waiterPromise = new Promise<void>((resolve, reject) => {
      settle = { resolve, reject };
      readyWaiters.current.push(settle);
    });
    void waiterPromise.catch(() => undefined);
    try {
      await RwfitBle.iosSetBindedStatus(true).catch(() => undefined);
      await RwfitBle.reconnect(savedDevice);
      await waiterPromise;
    } finally {
      if (settle) {
        readyWaiters.current = readyWaiters.current.filter(w => w !== settle);
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    await RwfitBle.disconnect();
    readyRef.current = false;
    setReady(false);
    setRealtimeRecords({});
    setConnectionState('disconnected');
  }, []);

  const unbind = useCallback(async () => {
    await RwfitBle.unbind();
    await RwfitBle.iosSetBindedStatus(false).catch(() => undefined);
    await DeviceStore.clearDevice();
    deviceRef.current = undefined;
    historyRef.current = {};
    readyRef.current = false;
    setDevice(undefined);
    setCapabilityMap({});
    setHistoryRecords({});
    setRealtimeRecords({});
    setFirmware(undefined);
    setPowerLevel(undefined);
    setReady(false);
    setConnectionState('disconnected');
    setLastSyncAt(undefined);
  }, []);

  const syncAllHealthData = useCallback(async () => {
    if (!deviceRef.current) {
      throw new Error('No bound device');
    }
    if (syncingRef.current) {
      const activeWaiter = syncWaiter.current;
      if (activeWaiter) {
        await activeWaiter.promise;
      }
      return;
    }
    syncingRef.current = true;
    setSyncing(true);
    setSyncProgress(0.05);
    receivedSyncTypes.current.clear();
    setLastError(undefined);
    let resolveWaiter!: () => void;
    let rejectWaiter!: (error: Error) => void;
    const waiterPromise = new Promise<void>((resolve, reject) => {
      resolveWaiter = resolve;
      rejectWaiter = reject;
    });
    void waiterPromise.catch(() => undefined);
    const waiter = {
      promise: waiterPromise,
      resolve: resolveWaiter,
      reject: rejectWaiter,
    };
    syncWaiter.current = waiter;
    try {
      if (!connected) {
        await reconnect();
      }
      historyRef.current = {};
      setHistoryRecords({});
      await RwfitBle.syncAllHealthData();
      await withTimeout(waiterPromise, 180000);
    } catch (error) {
      syncingRef.current = false;
      setSyncing(false);
      if (syncWaiter.current === waiter) {
        syncWaiter.current = undefined;
        waiter.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
      throw error;
    }
  }, [connected, reconnect]);

  const refreshDeviceInfo = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!connected) {
        if (silent) {
          return;
        }
        throw new Error('Device is not connected');
      }
      await refreshDeviceInfoInternal(silent);
    },
    [connected, refreshDeviceInfoInternal],
  );

  const prepareForScan = useCallback(async () => {
    await RwfitBle.iosSetBindedStatus(false).catch(() => undefined);
  }, []);

  return {
    device,
    capabilities,
    connectionState,
    ready,
    connected,
    loadingSavedState,
    syncing,
    syncProgress,
    powerLevel,
    firmware,
    sdkVersion,
    pluginVersion,
    lastSyncAt,
    lastError,
    recordsFor,
    latestFor,
    reconnect,
    disconnect,
    unbind,
    syncAllHealthData,
    refreshDeviceInfo,
    prepareForScan,
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = 'Timed out',
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
