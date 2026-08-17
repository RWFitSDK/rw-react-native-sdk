import React from 'react';
import {Alert} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {DemoCapabilities} from '../src/capabilities';
import {DeviceSettingsList} from '../src/DeviceSettingsList';
import {DevicePage} from '../src/DevicePage';
import type {DemoController} from '../src/useDemoController';

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: 'RNDateTimePicker',
  DateTimePickerAndroid: {open: jest.fn(), dismiss: jest.fn()},
}));

function findPressable(node: ReactTestRenderer.ReactTestInstance) {
  let current = node.parent;
  while (current && typeof current.props.onPress !== 'function') {
    current = current.parent;
  }
  return current;
}

jest.mock('react-native-rwfit-ble', () => {
  const subscription = () => ({remove: jest.fn()});
  return {
    CallControlAction: {Answer: 0, Reject: 1},
    SensorRawDataType: {Ppg: 1},
    SensorRawSelection: {PpgGreen: 2},
    RwfitBle: {
      onSensorRawStopped: jest.fn(subscription),
      onHeartRateCalibration: jest.fn(subscription),
      getTimedHeartRate: jest.fn().mockResolvedValue({
        isOpen: true,
        duration: 30,
        startHour: 8,
        startMin: 0,
        endHour: 22,
        endMin: 0,
      }),
      setTimedHeartRate: jest.fn().mockResolvedValue({}),
    },
  };
});

test('reads a monitoring setting without overwriting it', async () => {
  const {RwfitBle} = jest.requireMock('react-native-rwfit-ble');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const controller = {
    connected: true,
    capabilities: new DemoCapabilities({isHr: true}),
    device: {name: 'Ring', mac: 'AA:BB', rssi: -40},
  } as DemoController;
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <DeviceSettingsList controller={controller} />,
    );
  });
  const title = renderer!.root.findByProps({children: '全天心率'});
  await ReactTestRenderer.act(async () => findPressable(title)?.props.onPress());
  expect(alert).not.toHaveBeenCalled();

  const readOption = renderer!.root.findByProps({children: '读取当前设置'});
  await ReactTestRenderer.act(async () => {
    findPressable(readOption)?.props.onPress();
    await Promise.resolve();
  });

  expect(RwfitBle.getTimedHeartRate).toHaveBeenCalledTimes(1);
  expect(RwfitBle.setTimedHeartRate).not.toHaveBeenCalled();
  expect(
    renderer!.root.findAllByProps({children: '30 分钟 · 08:00–22:00'}).length,
  ).toBeGreaterThan(0);

  await ReactTestRenderer.act(async () => renderer!.unmount());
  alert.mockRestore();
});

test('uses a native time picker when adding an alarm', async () => {
  const controller = {
    connected: true,
    capabilities: new DemoCapabilities({isAlarm: true}),
    device: {name: 'Ring', mac: 'AA:BB', rssi: -40},
  } as DemoController;
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <DeviceSettingsList controller={controller} />,
    );
  });
  const alarm = renderer!.root.findByProps({children: '闹钟'});
  await ReactTestRenderer.act(async () => findPressable(alarm)?.props.onPress());
  const addAlarm = renderer!.root.findByProps({children: '新增闹钟'});
  await ReactTestRenderer.act(async () =>
    findPressable(addAlarm)?.props.onPress(),
  );

  expect(
    renderer!.root.findAll(node => String(node.type) === 'RNDateTimePicker'),
  ).toHaveLength(1);

  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('shows a blocking progress dialog while reconnecting', async () => {
  const controller = {
    connected: false,
    ready: false,
    connectionState: 'connecting',
    capabilities: new DemoCapabilities({}),
    device: {name: 'Ring', mac: 'AA:BB', rssi: -40},
  } as DemoController;
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <DevicePage
        controller={controller}
        onOpenOta={jest.fn()}
        onOpenScan={jest.fn()}
      />,
    );
  });

  expect(
    renderer!.root.findAllByProps({children: '正在重新连接'}).length,
  ).toBeGreaterThan(0);
  expect(
    renderer!.root.findAllByProps({children: '正在等待设备返回连接结果…'})
      .length,
  ).toBeGreaterThan(0);

  await ReactTestRenderer.act(async () => renderer!.unmount());
});
