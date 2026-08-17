/**
 * @format
 */

import React from 'react';
import { BackHandler, PermissionsAndroid, Platform } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { Page } from '../src/ui';

function findPressable(node: ReactTestRenderer.ReactTestInstance) {
  let current = node.parent;
  while (current && typeof current.props.onPress !== 'function') {
    current = current.parent;
  }
  return current;
}

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

jest.mock('react-native-rwfit-ble', () => {
  const subscription = () => ({ remove: jest.fn() });
  class RwfitError extends Error {
    code = -1;
  }
  return {
    RwfitError,
    CallControlAction: { Answer: 0, Reject: 1 },
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
    SensorRawDataType: { Sleep: 5 },
    SensorRawSelection: {
      Acc: 1,
      PpgGreen: 2,
      PpgGreenAndAcc: 3,
      PpgRed: 4,
      PpgRedAndAcc: 5,
      PpgGreenAndIr: 10,
      PpgGreenAccAndIr: 11,
      PpgRedAndIr: 12,
      PpgRedAccAndIr: 13,
    },
    WorkoutControlType: { Start: 1, Resume: 2, Pause: 3, End: 4 },
    RwfitBle: {
      init: jest.fn().mockResolvedValue({}),
      getSdkVersion: jest.fn().mockResolvedValue('test-sdk'),
      getPluginVersion: jest.fn().mockResolvedValue('test-plugin'),
      isConnected: jest.fn().mockResolvedValue(false),
      iosSetBindedStatus: jest.fn().mockResolvedValue({}),
      onConnectState: jest.fn(subscription),
      onFunctionMenu: jest.fn(subscription),
      onSyncResult: jest.fn(subscription),
      onSyncProgress: jest.fn(subscription),
      onSyncFinish: jest.fn(subscription),
      onSyncError: jest.fn(subscription),
      onRealtimeData: jest.fn(subscription),
      removeHealthDataCallback: jest.fn().mockResolvedValue({}),
    },
  };
});

test('renders correctly', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('switches between Chinese and English', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const englishButton = renderer!.root.findAllByProps({
    accessibilityLabel: 'Switch to English',
  })[0];
  const chineseButton = renderer!.root.findAllByProps({
    accessibilityLabel: '切换到中文',
  })[0];
  const currentButton = englishButton ?? chineseButton;
  expect(currentButton).toBeDefined();

  await ReactTestRenderer.act(() => currentButton.props.onPress());
  const switchedLabel = englishButton ? '切换到中文' : 'Switch to English';
  expect(
    renderer!.root.findAllByProps({ accessibilityLabel: switchedLabel }).length,
  ).toBeGreaterThan(0);
  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('uses the system back button like the page back button', async () => {
  const onBack = jest.fn();
  const remove = jest.fn();
  let hardwareBackPress: (() => boolean) | undefined;
  const addEventListener = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_eventName, handler) => {
      hardwareBackPress = handler as () => boolean;
      return { remove };
    });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <Page title="Details" onBack={onBack} />,
    );
  });

  expect(addEventListener).toHaveBeenCalledWith(
    'hardwareBackPress',
    expect.any(Function),
  );
  expect(hardwareBackPress?.()).toBe(true);
  expect(onBack).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(() => renderer!.unmount());
  expect(remove).toHaveBeenCalledTimes(1);
  addEventListener.mockRestore();
});

test('waits for Android BLE permission and supports retry', async () => {
  const originalOs = Platform.OS;
  const originalVersion = Platform.Version;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  Object.defineProperty(Platform, 'Version', { configurable: true, value: 31 });

  const scan = PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN;
  const connect = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
  const location = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const request = jest
    .spyOn(PermissionsAndroid, 'requestMultiple')
    .mockResolvedValueOnce({
      [scan]: PermissionsAndroid.RESULTS.DENIED,
      [connect]: PermissionsAndroid.RESULTS.GRANTED,
      [location]: PermissionsAndroid.RESULTS.GRANTED,
    } as never)
    .mockResolvedValueOnce({
      [scan]: PermissionsAndroid.RESULTS.GRANTED,
      [connect]: PermissionsAndroid.RESULTS.GRANTED,
      [location]: PermissionsAndroid.RESULTS.GRANTED,
    } as never);
  const { RwfitBle } = jest.requireMock('react-native-rwfit-ble');
  RwfitBle.init.mockClear();

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(RwfitBle.init).not.toHaveBeenCalled();
  const retryText = renderer!.root.findAll(
    node =>
      node.props.children === '重新请求权限' ||
      node.props.children === 'Request permissions again',
  )[0];
  expect(retryText).toBeDefined();
  await ReactTestRenderer.act(async () => findPressable(retryText!)!.props.onPress());

  expect(request).toHaveBeenCalledTimes(2);
  expect(request).toHaveBeenNthCalledWith(1, [scan, connect, location]);
  expect(RwfitBle.init).toHaveBeenCalledTimes(1);
  expect(
    renderer!.root.findAll(
      node =>
        node.props.accessibilityLabel === 'Switch to English' ||
        node.props.accessibilityLabel === '切换到中文',
    ).length,
  ).toBeGreaterThan(0);

  await ReactTestRenderer.act(async () => renderer!.unmount());
  expect(RwfitBle.removeHealthDataCallback).toHaveBeenCalled();
  request.mockRestore();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs });
  Object.defineProperty(Platform, 'Version', {
    configurable: true,
    value: originalVersion,
  });
});
