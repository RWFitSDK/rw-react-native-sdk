import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ScanPage } from '../src/ScanPage';

jest.mock('react-native-rwfit-ble', () => {
  const subscription = () => ({ remove: jest.fn() });
  return {
    RwfitBle: {
      iosSetBindedStatus: jest.fn().mockResolvedValue({}),
      startScan: jest.fn().mockResolvedValue({}),
      stopScan: jest.fn().mockResolvedValue({}),
      connect: jest.fn().mockResolvedValue({}),
      disconnect: jest.fn().mockResolvedValue({}),
      onScanResult: jest.fn(subscription),
      onScanFinish: jest.fn(subscription),
      onConnectState: jest.fn(subscription),
      onFunctionMenu: jest.fn(subscription),
    },
  };
});

test('waits for the function menu before closing after connect', async () => {
  const { RwfitBle } = jest.requireMock('react-native-rwfit-ble');
  const onBack = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<ScanPage onBack={onBack} />);
  });

  const device = { name: 'Ring', mac: 'AA:BB', uuid: 'ring-1', rssi: -40 };
  const scanResult = RwfitBle.onScanResult.mock.calls[0][0];
  await ReactTestRenderer.act(async () => scanResult(device));

  const row = renderer!.root.findByProps({
    accessibilityLabel: 'Ring, AA:BB, -40 dBm',
  });
  await ReactTestRenderer.act(async () => row.props.onPress());

  expect(RwfitBle.connect).toHaveBeenCalledWith(device);
  expect(onBack).not.toHaveBeenCalled();
  expect(renderer!.root.findAllByProps({disabled: true}).length).toBeGreaterThan(0);

  const functionMenu = RwfitBle.onFunctionMenu.mock.calls[0][0];
  await ReactTestRenderer.act(async () =>
    functionMenu({
      name: 'Ring',
      mac: 'AA:BB',
      uuid: 'ring-1',
      raw: { isHr: true },
    }),
  );
  expect(onBack).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(async () => renderer!.unmount());
});
