import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {WorkoutPage} from '../src/WorkoutPage';
import type {DemoController} from '../src/useDemoController';

jest.mock('react-native-rwfit-ble', () => {
  const subscription = () => ({remove: jest.fn()});
  class RwfitError extends Error {
    code = -1;
  }
  return {
    RwfitError,
    WorkoutControlType: {Start: 1, Resume: 2, Pause: 3, End: 4},
    RwfitBle: {
      onWorkoutRealtimeData: jest.fn(subscription),
      onConnectState: jest.fn(subscription),
      getWorkoutState: jest.fn().mockResolvedValue({
        sportType: 7,
        controlType: 1,
        isRunning: true,
      }),
      setWorkoutRealtimeEnabled: jest.fn().mockResolvedValue({}),
      controlWorkout: jest.fn().mockResolvedValue({}),
      getWorkoutReports: jest.fn().mockRejectedValue(new Error('report unavailable')),
    },
  };
});

test('leaves on disconnect and clears running state when report sync fails', async () => {
  const {RwfitBle} = jest.requireMock('react-native-rwfit-ble');
  const onBack = jest.fn();
  const controller = {connected: true} as DemoController;
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <WorkoutPage controller={controller} onBack={onBack} />,
    );
  });

  const connectState = RwfitBle.onConnectState.mock.calls[0][0];
  await ReactTestRenderer.act(async () => connectState({state: 'disconnected'}));
  expect(onBack).toHaveBeenCalledTimes(1);

  const endText = renderer!.root.findByProps({children: '结束'});
  await ReactTestRenderer.act(async () => endText.parent?.props.onPress());

  expect(RwfitBle.controlWorkout).toHaveBeenCalledWith(7, 4);
  expect(RwfitBle.getWorkoutReports).toHaveBeenCalledTimes(1);
  expect(
    renderer!.root.findAll(
      node =>
        typeof node.props.children === 'string' &&
        node.props.children.includes('运动已结束，报告同步失败'),
    ).length,
  ).toBeGreaterThan(0);
  expect(renderer!.root.findAllByProps({children: '实时运动数据'})).toHaveLength(0);

  await ReactTestRenderer.act(async () => renderer!.unmount());
  expect(RwfitBle.setWorkoutRealtimeEnabled).toHaveBeenCalledWith(false);
});
