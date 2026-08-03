/**
 * @format
 */

import React from 'react';
import {BackHandler} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import {Page} from '../src/ui';

jest.mock('react-native-rwfit-ble', () => {
  const subscription = () => ({remove: jest.fn()});
  class RwfitError extends Error {
    code = -1;
  }
  return {
    RwfitError,
    CallControlAction: {Answer: 0, Reject: 1},
    RealtimeMetric: {
      Hr: 'JL_HR_DATA_TRANSFER_KEY',
      BloodOxy: 'JL_BO_DATA_TRANSFER_KEY',
      Hrv: 'JL_HRV_DATA_TRANSFER_KEY',
      Pressure: 'JL_PRESSURE_DATA_TRANSFER_KEY',
      BloodSugar: 'JL_BLOODSUGAR_DATA_TRANSFER_KEY',
      BloodPressure: 'JL_BP_DATA_TRANSFER_KEY',
    },
    SensorRawDataType: {Sleep: 5},
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
    WorkoutControlType: {Start: 1, Resume: 2, Pause: 3, End: 4},
    RwfitBle: {
      init: jest.fn().mockResolvedValue({}),
      getSdkVersion: jest.fn().mockResolvedValue('test-sdk'),
      isConnected: jest.fn().mockResolvedValue(false),
      onConnectState: jest.fn(subscription),
      onFunctionMenu: jest.fn(subscription),
    },
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
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
    renderer!.root.findAllByProps({accessibilityLabel: switchedLabel}).length,
  ).toBeGreaterThan(0);
});

test('uses the system back button like the page back button', async () => {
  const onBack = jest.fn();
  const remove = jest.fn();
  let hardwareBackPress: (() => boolean) | undefined;
  const addEventListener = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_eventName, handler) => {
      hardwareBackPress = handler as () => boolean;
      return {remove};
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
