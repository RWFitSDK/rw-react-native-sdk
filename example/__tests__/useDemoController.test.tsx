import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import * as DeviceStore from '../src/deviceStore';
import {
  type DemoController,
  useDemoController,
} from '../src/useDemoController';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

jest.mock('react-native-rwfit-ble', () => {
  const subscription = () => ({remove: jest.fn()});
  return {
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
      Hr: 'hr',
      BloodOxy: 'bo',
      Hrv: 'hrv',
      Pressure: 'pressure',
      BloodSugar: 'sugar',
      BloodPressure: 'bp',
      Temperature: 'temp',
    },
    RwfitBle: {
      getSdkVersion: jest.fn().mockResolvedValue('sdk'),
      getPluginVersion: jest.fn().mockResolvedValue('plugin'),
      iosSetBindedStatus: jest.fn().mockResolvedValue({}),
      reconnect: jest.fn().mockResolvedValue({}),
      disconnect: jest.fn().mockResolvedValue({}),
      syncAllHealthData: jest.fn().mockResolvedValue({}),
      removeHealthDataCallback: jest.fn().mockResolvedValue({}),
      onConnectState: jest.fn(subscription),
      onFunctionMenu: jest.fn(subscription),
      onSyncResult: jest.fn(subscription),
      onSyncProgress: jest.fn(subscription),
      onSyncFinish: jest.fn(subscription),
      onSyncError: jest.fn(subscription),
      onRealtimeData: jest.fn(subscription),
    },
  };
});

let controller: DemoController;

function Harness() {
  controller = useDemoController();
  return null;
}

test('reconnect waits for the SDK failure event without a local timeout', async () => {
  await AsyncStorage.clear();
  await DeviceStore.saveDevice({
    name: 'Ring',
    mac: 'AA:BB',
    rssi: -40,
  });
  const {RwfitBle} = jest.requireMock('react-native-rwfit-ble');
  RwfitBle.disconnect.mockClear();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(controller.device?.mac).toBe('AA:BB');

  let outcome!: Promise<unknown>;
  await ReactTestRenderer.act(async () => {
    outcome = controller.reconnect().catch(error => error);
    await Promise.resolve();
  });
  expect(controller.connectionState).toBe('connecting');

  const connectListener =
    RwfitBle.onConnectState.mock.calls[
      RwfitBle.onConnectState.mock.calls.length - 1
    ][0];
  let error: unknown;
  await ReactTestRenderer.act(async () => {
    connectListener({state: 'failed', reason: 'sdk_timeout'});
    error = await outcome;
  });

  expect(error).toEqual(new Error('sdk_timeout'));
  expect(controller.connectionState).toBe('failed');
  expect(controller.lastError).toBe('sdk_timeout');
  expect(RwfitBle.disconnect).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('each health synchronization replaces every previously displayed type', async () => {
  await AsyncStorage.clear();
  await DeviceStore.saveDevice({name: 'Ring', mac: 'AA:BB', rssi: -40});
  const {RwfitBle} = jest.requireMock('react-native-rwfit-ble');
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
    await Promise.resolve();
    await Promise.resolve();
  });

  const latestListener = (mock: jest.Mock) =>
    mock.mock.calls[mock.mock.calls.length - 1][0];
  const functionMenuListener = latestListener(RwfitBle.onFunctionMenu);
  const syncResultListener = latestListener(RwfitBle.onSyncResult);
  const syncFinishListener = latestListener(RwfitBle.onSyncFinish);

  await ReactTestRenderer.act(async () => {
    functionMenuListener({
      name: 'Ring',
      mac: 'AA:BB',
      raw: {isHr: true},
    });
    syncResultListener({
      type: 'hr',
      data: [{time: 100, items: [{time: 100, hr: 60}]}],
    });
    await Promise.resolve();
  });
  expect(controller.recordsFor('hr')).toHaveLength(1);

  let syncOutcome!: Promise<void>;
  await ReactTestRenderer.act(async () => {
    syncOutcome = controller.syncAllHealthData();
    await Promise.resolve();
  });
  expect(controller.recordsFor('hr')).toEqual([]);

  await ReactTestRenderer.act(async () => {
    syncResultListener({
      type: 'hr',
      data: [{time: 200, items: [{time: 200, hr: 70}]}],
    });
    syncFinishListener();
    await syncOutcome;
  });
  expect(controller.recordsFor('hr')).toHaveLength(1);
  expect(controller.recordsFor('hr')[0].measuredAtSec).toBe(200);

  await ReactTestRenderer.act(async () => renderer!.unmount());
});
