/* eslint-disable no-void */
import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CallControlAction,
  RealtimeMetric,
  RwfitBle,
  SensorRawDataType,
  SensorRawSelection,
  type Alarm as AlarmModel,
  type SensorRawPacket,
  type TimedConfig,
} from 'react-native-rwfit-ble';
import {CapabilityKey, DemoCapabilities} from './capabilities';
import {useI18n} from './i18n';
import {
  ActionButton,
  ButtonWrap,
  colors,
  errorMessage,
  Page,
  ResultList,
  ScreenScroll,
  Section,
  uiStyles,
  useResultLog,
} from './ui';

interface PageProps {
  onBack: () => void;
  capabilities: DemoCapabilities;
}

export function DeviceInfoPage({onBack}: PageProps) {
  const {tr} = useI18n();
  const {results, run} = useResultLog();
  return (
    <Page onBack={onBack} title={tr('设备信息', 'Device info')}>
      <ScreenScroll>
        <Section title={tr('设备与版本', 'Device & versions')}>
          <ButtonWrap>
            <ActionButton
              label={tr('获取电量', 'Get battery')}
              onPress={() => void run(tr('电量', 'Battery'), async () => `${await RwfitBle.getPower()}%`)}
            />
            <ActionButton
              label={tr('固件版本', 'Firmware version')}
              onPress={() =>
                void run(tr('固件', 'Firmware'), async () => {
                  const value = await RwfitBle.getFirmwareVersion();
                  return `${value.deviceClazz} / ${value.deviceNo} / UI:${value.uiVersion}`;
                })
              }
            />
            <ActionButton
              label={tr('SDK版本', 'SDK version')}
              onPress={() => void run(tr('SDK版本', 'SDK version'), RwfitBle.getSdkVersion.bind(RwfitBle))}
            />
            <ActionButton
              label={tr('插件版本', 'Module version')}
              onPress={() => void run(tr('插件版本', 'Module version'), RwfitBle.getPluginVersion.bind(RwfitBle))}
            />
            <ActionButton
              label={tr('功能列表', 'Capabilities')}
              onPress={() => void run(tr('功能列表', 'Capabilities'), RwfitBle.getFunctionList.bind(RwfitBle))}
            />
          </ButtonWrap>
        </Section>
        <Section title={tr('设备设置', 'Device settings')}>
          <ButtonWrap>
            <ActionButton
              label={tr('设置用户信息', 'Set user info')}
              onPress={() =>
                void run(tr('用户信息', 'User info'), () =>
                  RwfitBle.setUserInfo({gender: 1, age: 25, height: 175, weight: 70}),
                )
              }
            />
            <ActionButton
              label={tr('设12小时制', 'Use 12-hour time')}
              onPress={() => void run(tr('时间格式', 'Time format'), () => RwfitBle.setTimeFormat(0))}
            />
            <ActionButton
              label={tr('设24小时制', 'Use 24-hour time')}
              onPress={() => void run(tr('时间格式', 'Time format'), () => RwfitBle.setTimeFormat(1))}
            />
          </ButtonWrap>
        </Section>
        <Section title={tr('操作结果', 'Results')}>
          <ResultList results={results} />
        </Section>
      </ScreenScroll>
    </Page>
  );
}

type TimedRow = {
  label: string;
  key: string;
  duration: number;
  get: () => Promise<TimedConfig>;
  set: (config: TimedConfig) => Promise<unknown>;
};

export function TimedMonitorPage({onBack, capabilities}: PageProps) {
  const {tr} = useI18n();
  const {results, log} = useResultLog();
  const rows: TimedRow[] = [
    {
      label: tr('心率', 'Heart rate'),
      key: CapabilityKey.heartRate,
      duration: 30,
      get: () => RwfitBle.getTimedHeartRate(),
      set: config => RwfitBle.setTimedHeartRate(config),
    },
    {
      label: tr('血氧', 'SpO₂'),
      key: CapabilityKey.bloodOxygen,
      duration: 60,
      get: () => RwfitBle.getTimedBloodOxygen(),
      set: config => RwfitBle.setTimedBloodOxygen(config),
    },
    {
      label: 'HRV',
      key: CapabilityKey.hrv,
      duration: 60,
      get: () => RwfitBle.getTimedHRV(),
      set: config => RwfitBle.setTimedHRV(config),
    },
    {
      label: tr('压力', 'Stress'),
      key: CapabilityKey.pressure,
      duration: 60,
      get: () => RwfitBle.getTimedStress(),
      set: config => RwfitBle.setTimedStress(config),
    },
    {
      label: tr('血糖', 'Blood glucose'),
      key: CapabilityKey.bloodSugar,
      duration: 60,
      get: () => RwfitBle.getTimedBloodSugar(),
      set: config => RwfitBle.setTimedBloodSugar(config),
    },
    {
      label: tr('血压', 'Blood pressure'),
      key: CapabilityKey.bloodPressure,
      duration: 60,
      get: () => RwfitBle.getTimedBloodPressure(),
      set: config => RwfitBle.setTimedBloodPressure(config),
    },
    {
      label: tr('体温', 'Temperature'),
      key: CapabilityKey.temperatureMonitoring,
      duration: 30,
      get: () => RwfitBle.getTimedBodyTemperature(),
      set: config => RwfitBle.setTimedBodyTemperature(config),
    },
    {
      label: 'PPG',
      key: CapabilityKey.ppgMonitoring,
      duration: 30,
      get: () => RwfitBle.getTimedPPG(),
      set: config => RwfitBle.setTimedPPG(config),
    },
  ];

  const getConfig = async (row: TimedRow) => {
    try {
      const config = await row.get();
      log(
        `${tr('获取', 'Get')} ${row.label} → open=${config.isOpen} ${config.startHour}:${config.startMin}-${config.endHour}:${config.endMin} ${tr('间隔', 'interval')} ${config.duration}min`,
      );
    } catch (error) {
      log(`${tr('获取', 'Get')} ${row.label} ✗ ${errorMessage(error)}`);
    }
  };
  const setConfig = async (row: TimedRow) => {
    try {
      await row.set({
        isOpen: true,
        duration: row.duration,
        startHour: 0,
        startMin: 0,
        endHour: 23,
        endMin: 59,
      });
      log(`${tr('设置', 'Set')} ${row.label} ${tr('成功', 'succeeded')} ✓`);
    } catch (error) {
      log(`${tr('设置', 'Set')} ${row.label} ✗ ${errorMessage(error)}`);
    }
  };

  return (
    <Page onBack={onBack} title={tr('全天检测', 'All-day monitoring')}>
      <ScreenScroll>
        <Section>
          {rows.map(row => {
            const enabled = capabilities.has(row.key);
            return (
              <View key={row.label} style={styles.settingRow}>
                <Text style={styles.settingName}>{row.label}</Text>
                <ActionButton enabled={enabled} label={tr('获取', 'Get')} onPress={() => void getConfig(row)} />
                <ActionButton enabled={enabled} label={tr('设置', 'Set')} onPress={() => void setConfig(row)} />
                {!enabled ? <Text style={styles.notSupported}>{tr('不支持', 'Unsupported')}</Text> : null}
              </View>
            );
          })}
        </Section>
        <Section title={tr('操作结果', 'Results')}>
          <ResultList results={results} />
        </Section>
      </ScreenScroll>
    </Page>
  );
}

export function RealtimePage({onBack, capabilities}: PageProps) {
  const {tr} = useI18n();
  const metricLabels = useMemo<Record<RealtimeMetric, string>>(
    () => ({
      [RealtimeMetric.Hr]: tr('心率', 'Heart rate'),
      [RealtimeMetric.BloodOxy]: tr('血氧', 'SpO₂'),
      [RealtimeMetric.Hrv]: 'HRV',
      [RealtimeMetric.Pressure]: tr('压力', 'Stress'),
      [RealtimeMetric.BloodSugar]: tr('血糖', 'Blood glucose'),
      [RealtimeMetric.BloodPressure]: tr('血压', 'Blood pressure'),
    }),
    [tr],
  );
  const [active, setActive] = useState<RealtimeMetric>();
  const {results, log, run} = useResultLog();
  const metrics = Object.values(RealtimeMetric);

  useEffect(() => {
    const dataSub = RwfitBle.onRealtimeData(data => {
      const extra =
        data.diastolic == null
          ? ''
          : ` ${tr('舒张压', 'diastolic')}=${data.diastolic}`;
      log(`[${data.type ?? 'unknown'}] ${data.value}${extra}`);
    });
    const completeSub = RwfitBle.onRealtimeMeasureComplete(() => {
      setActive(current => {
        if (current) {
          log(`[${metricLabels[current]}] ${tr('测量完成', 'Measurement complete')}`);
        }
        return undefined;
      });
    });
    return () => {
      dataSub.remove();
      completeSub.remove();
      if (active) {
        void RwfitBle.stopRealtimeMeasure(active).catch(() => undefined);
      }
    };
  }, [active, log, metricLabels, tr]);

  const start = async (metric: RealtimeMetric) => {
    if (active && active !== metric) {
      const stopped = await run(
        `${tr('停止', 'Stop')} ${metricLabels[active]}`,
        () => RwfitBle.stopRealtimeMeasure(active),
      );
      if (!stopped) {
        return;
      }
    }
    const result = await run(`${tr('开启', 'Start')} ${metricLabels[metric]}`, () =>
      RwfitBle.startRealtimeMeasure(metric),
    );
    if (result) {
      setActive(metric);
    }
  };
  const stop = async () => {
    if (!active) {
      return;
    }
    const metric = active;
    await run(`${tr('停止', 'Stop')} ${metricLabels[metric]}`, () => RwfitBle.stopRealtimeMeasure(metric));
    setActive(undefined);
  };

  return (
    <Page onBack={onBack} title={tr('实时测量', 'Real-time measurement')}>
      <ScreenScroll>
        <Section
          title={
            active
              ? `${tr('当前测量', 'Current')}: ${metricLabels[active]}`
              : tr('未开启测量', 'No active measurement')
          }>
          <ButtonWrap>
            {metrics.map(metric => (
              <ActionButton
                enabled={capabilities.supportsRealtime(metric)}
                key={metric}
                label={metricLabels[metric]}
                onPress={() => void start(metric)}
                primary={active === metric}
              />
            ))}
          </ButtonWrap>
          <View style={styles.spacer} />
          <ActionButton
            danger
            enabled={Boolean(active)}
            label={tr('停止测量', 'Stop measurement')}
            onPress={() => void stop()}
          />
        </Section>
        <Section title={tr('实时数据', 'Live data')}>
          <ResultList results={results} />
        </Section>
      </ScreenScroll>
    </Page>
  );
}

export function ControlPage({onBack, capabilities}: PageProps) {
  const {tr} = useI18n();
  const {results, log, run} = useResultLog();
  const supports = (key: string) => capabilities.has(key);

  useEffect(() => {
    const touch = RwfitBle.onTouchEvent(event => {
      log(
        `${tr('触摸/音乐事件', 'Touch/music event')}: ${event.action} (key=${event.keyType}, touch=${event.touchType})`,
      );
    });
    const call = RwfitBle.onCallControl(event => {
      log(`${tr('来电控制事件', 'Call control event')}: ${event.action ?? 'unknown'} (raw=${event.rawValue})`);
    });
    const calibration = RwfitBle.onHeartRateCalibration(event => {
      log(
        `${tr('心率校正', 'Heart-rate calibration')}: mode=0x${event.testMode.toString(16)} result=${event.result} ${
          event.isCalibrating ? tr('校正中', 'Calibrating') : tr('已完成', 'Complete')
        }`,
      );
    });
    return () => {
      touch.remove();
      call.remove();
      calibration.remove();
    };
  }, [log, tr]);

  const confirm = (title: string, action: () => Promise<unknown>) => {
    Alert.alert(title, tr('该操作会改变设备状态，确认继续吗？', 'This operation changes device state. Continue?'), [
      {text: tr('取消', 'Cancel'), style: 'cancel'},
      {text: tr('确认', 'Confirm'), style: 'destructive', onPress: () => void run(title, action)},
    ]);
  };

  return (
    <Page onBack={onBack} title={tr('设备控制', 'Device controls')}>
      <ScreenScroll>
        <Section title={tr('常用控制', 'Common controls')}>
          <ButtonWrap>
            <ActionButton
              enabled={supports(CapabilityKey.findDevice)}
              label={tr('找设备', 'Find device')}
              onPress={() => void run(tr('找设备', 'Find device'), () => RwfitBle.findDevice())}
            />
            <ActionButton
              enabled={supports(CapabilityKey.powerOff)}
              label={tr('关机', 'Power off')}
              onPress={() => confirm(tr('关机', 'Power off'), () => RwfitBle.powerOff())}
            />
            <ActionButton
              enabled={supports(CapabilityKey.factoryReset)}
              label={tr('恢复出厂', 'Factory reset')}
              onPress={() => confirm(tr('恢复出厂', 'Factory reset'), () => RwfitBle.factoryReset())}
            />
            <ActionButton
              enabled={supports(CapabilityKey.takePhoto)}
              label={tr('进拍照模式', 'Enter camera mode')}
              onPress={() => void run(tr('进拍照', 'Enter camera'), () => RwfitBle.controlPhoto(1))}
            />
            <ActionButton
              enabled={supports(CapabilityKey.takePhoto)}
              label={tr('退拍照模式', 'Exit camera mode')}
              onPress={() => void run(tr('退拍照', 'Exit camera'), () => RwfitBle.controlPhoto(0))}
            />
            <ActionButton
              enabled={Platform.OS === 'android'}
              label={tr('来电接听(Android)', 'Answer call (Android)')}
              onPress={() =>
                void run(tr('来电接听', 'Answer call'), () => RwfitBle.controlPhone(CallControlAction.Answer))
              }
            />
            <ActionButton
              enabled={Platform.OS === 'android'}
              label={tr('来电拒接(Android)', 'Reject call (Android)')}
              onPress={() =>
                void run(tr('来电拒接', 'Reject call'), () => RwfitBle.controlPhone(CallControlAction.Reject))
              }
            />
          </ButtonWrap>
        </Section>
        <Section title={tr('灯光与佩戴', 'LED & wearing')}>
          <ButtonWrap>
            <ActionButton
              enabled={supports(CapabilityKey.ledLight)}
              label={tr('获取LED', 'Get LED')}
              onPress={() => void run('LED', () => RwfitBle.getRingLedLevel())}
            />
            <ActionButton
              enabled={supports(CapabilityKey.ledLight)}
              label={tr('LED开L2', 'LED on, L2')}
              onPress={() =>
                void run(tr('设LED', 'Set LED'), () =>
                  RwfitBle.setRingLedLevel({isOpen: true, lcdLevel: 2}),
                )
              }
            />
            <ActionButton
              enabled={supports(CapabilityKey.wearDirection)}
              label={tr('获取佩戴方向', 'Get wearing side')}
              onPress={() =>
                void run(tr('佩戴', 'Wearing side'), async () =>
                  (await RwfitBle.getRingWearDir()) ? tr('右手', 'Right hand') : tr('左手', 'Left hand'),
                )
              }
            />
            <ActionButton
              enabled={supports(CapabilityKey.wearDirection)}
              label={tr('设右手', 'Set right hand')}
              onPress={() => void run(tr('设右手', 'Set right hand'), () => RwfitBle.setRingWearHand(true))}
            />
            <ActionButton
              enabled={supports(CapabilityKey.wearDirection)}
              label={tr('设左手', 'Set left hand')}
              onPress={() => void run(tr('设左手', 'Set left hand'), () => RwfitBle.setRingWearHand(false))}
            />
          </ButtonWrap>
        </Section>
        <Section title={tr('振动与健康控制', 'Vibration & health controls')}>
          <ButtonWrap>
            <ActionButton
              enabled={supports(CapabilityKey.vibrationLevel)}
              label={tr('获取振动', 'Get vibration')}
              onPress={() => void run(tr('振动', 'Vibration'), () => RwfitBle.getVibrationCount())}
            />
            <ActionButton
              enabled={supports(CapabilityKey.vibrationLevel)}
              label={tr('设振动', 'Set vibration')}
              onPress={() =>
                void run(tr('设振动', 'Set vibration'), () => RwfitBle.setVibrationCount({count: 3, level: 2}))
              }
            />
            <ActionButton
              enabled={supports(CapabilityKey.vibrationInterval)}
              label={tr('获取振动间隔', 'Get vibration interval')}
              onPress={() => void run(tr('振动间隔', 'Vibration interval'), () => RwfitBle.getVibrationInterval())}
            />
            <ActionButton
              enabled={supports(CapabilityKey.vibrationInterval)}
              label={tr('设振动间隔500ms', 'Set interval to 500ms')}
              onPress={() =>
                void run(tr('设振动间隔', 'Set vibration interval'), () => RwfitBle.setVibrationInterval(500))
              }
            />
            <ActionButton
              label={tr('启动心率校正', 'Start HR calibration')}
              onPress={() =>
                void run(tr('启动心率校正', 'Start HR calibration'), () => RwfitBle.startHeartRateCalibration())
              }
            />
            <ActionButton
              enabled={supports(CapabilityKey.fallDetect)}
              label={tr('获取跌落提醒', 'Get fall detection')}
              onPress={() => void run(tr('跌落提醒', 'Fall detection'), () => RwfitBle.getFallDetect())}
            />
            <ActionButton
              enabled={supports(CapabilityKey.fallDetect)}
              label={tr('开启跌落提醒', 'Enable fall detection')}
              onPress={() => void run(tr('开启跌落提醒', 'Enable fall detection'), () => RwfitBle.setFallDetect(true))}
            />
            <ActionButton
              enabled={supports(CapabilityKey.fallDetect)}
              label={tr('关闭跌落提醒', 'Disable fall detection')}
              onPress={() => void run(tr('关闭跌落提醒', 'Disable fall detection'), () => RwfitBle.setFallDetect(false))}
            />
            <ActionButton
              enabled={supports(CapabilityKey.countReminder)}
              label={tr('获取计数提醒', 'Get count reminder')}
              onPress={() =>
                void run(tr('计数提醒', 'Count reminder'), () => RwfitBle.getCountReminderInterval())
              }
            />
            <ActionButton
              enabled={supports(CapabilityKey.countReminder)}
              label={tr('计数提醒60分钟', 'Set reminder to 60 min')}
              onPress={() =>
                void run(tr('设置计数提醒', 'Set count reminder'), () => RwfitBle.setCountReminderInterval(60))
              }
            />
            <ActionButton
              enabled={supports(CapabilityKey.countReminder)}
              label={tr('关闭计数提醒', 'Disable count reminder')}
              onPress={() =>
                void run(tr('关闭计数提醒', 'Disable count reminder'), () => RwfitBle.setCountReminderInterval(0))
              }
            />
          </ButtonWrap>
        </Section>
        <Section title={tr('屏幕与 HID', 'Display & HID')}>
          <ButtonWrap>
            <ActionButton
              enabled={supports(CapabilityKey.raiseBrightScreen)}
              label={tr('获取抬腕亮屏', 'Get raise-to-wake')}
              onPress={() => void run(tr('抬腕', 'Raise-to-wake'), () => RwfitBle.getRaiseBrightScreen())}
            />
            <ActionButton
              enabled={supports(CapabilityKey.brightScreenTime)}
              label={tr('获取亮屏时长', 'Get screen duration')}
              onPress={() => void run(tr('亮屏时长', 'Screen duration'), () => RwfitBle.getBrightScreenTime())}
            />
            <ActionButton
              enabled={supports(CapabilityKey.brightScreenTime)}
              label={tr('设亮屏5s', 'Set screen to 5s')}
              onPress={() => void run(tr('设亮屏', 'Set screen duration'), () => RwfitBle.setBrightScreenTime(5))}
            />
            <ActionButton
              enabled={supports(CapabilityKey.videoHid)}
              label={tr('获取HID', 'Get HID')}
              onPress={() => void run('HID', () => RwfitBle.getVideoHid())}
            />
            <ActionButton
              enabled={supports(CapabilityKey.alarmVibrationDuration)}
              label={tr('闹钟振动次数', 'Alarm vibration count')}
              onPress={() =>
                void run(tr('闹钟振动', 'Alarm vibration'), () => RwfitBle.getAlarmVibrationDuration())
              }
            />
          </ButtonWrap>
        </Section>
        <Section title={tr('事件与结果', 'Events & results')}>
          <ResultList results={results} />
        </Section>
      </ScreenScroll>
    </Page>
  );
}

export function HealthAlertPage({onBack, capabilities}: PageProps) {
  const {tr} = useI18n();
  const {results, log, run} = useResultLog();
  useEffect(() => {
    const subscription = RwfitBle.onHealthAlert(event => {
      log(`${tr('健康报警', 'Health alert')}: ${event.type}, value=${event.value}`);
    });
    return () => subscription.remove();
  }, [log, tr]);

  const toggleHeartRate = async () => {
    const current = await RwfitBle.getHeartRateAlert();
    const updated = {...current, isOpen: !current.isOpen};
    await RwfitBle.setHeartRateAlert(updated);
    return updated.isOpen ? tr('已开启', 'Enabled') : tr('已关闭', 'Disabled');
  };
  const toggleBloodOxygen = async () => {
    const current = await RwfitBle.getBloodOxygenAlert();
    const updated = {...current, isOpen: !current.isOpen};
    await RwfitBle.setBloodOxygenAlert(updated);
    return updated.isOpen ? tr('已开启', 'Enabled') : tr('已关闭', 'Disabled');
  };

  return (
    <Page onBack={onBack} title={tr('赞念与健康报警', 'Prayer & health alerts')}>
      <ScreenScroll>
        <Section title={tr('赞念开关', 'Prayer count')}>
          <ButtonWrap>
            <ActionButton
              enabled={capabilities.has(CapabilityKey.muslimSwitch)}
              label={tr('获取赞念开关', 'Get prayer count setting')}
              onPress={() =>
                void run(tr('赞念开关', 'Prayer count'), async () =>
                  (await RwfitBle.getMuslimCountEnabled())
                    ? tr('已开启', 'Enabled')
                    : tr('已关闭', 'Disabled'),
                )
              }
            />
            <ActionButton
              enabled={capabilities.has(CapabilityKey.muslimSwitch)}
              label={tr('开启赞念', 'Enable prayer count')}
              onPress={() =>
                void run(tr('开启赞念', 'Enable prayer count'), () => RwfitBle.setMuslimCountEnabled(true))
              }
            />
            <ActionButton
              enabled={capabilities.has(CapabilityKey.muslimSwitch)}
              label={tr('关闭赞念', 'Disable prayer count')}
              onPress={() =>
                void run(tr('关闭赞念', 'Disable prayer count'), () => RwfitBle.setMuslimCountEnabled(false))
              }
            />
          </ButtonWrap>
        </Section>
        <Section title={tr('报警设置', 'Alert settings')}>
          <ButtonWrap>
            <ActionButton
              enabled={capabilities.has(CapabilityKey.heartRateAlert)}
              label={tr('获取心率报警', 'Get heart-rate alert')}
              onPress={() => void run(tr('心率报警', 'Heart-rate alert'), () => RwfitBle.getHeartRateAlert())}
            />
            <ActionButton
              enabled={capabilities.has(CapabilityKey.heartRateAlert)}
              label={tr('切换心率报警', 'Toggle heart-rate alert')}
              onPress={() => void run(tr('切换心率报警', 'Toggle heart-rate alert'), toggleHeartRate)}
            />
            <ActionButton
              enabled={capabilities.has(CapabilityKey.bloodOxygenAlert)}
              label={tr('获取血氧报警', 'Get SpO₂ alert')}
              onPress={() =>
                void run(tr('血氧报警', 'SpO₂ alert'), () => RwfitBle.getBloodOxygenAlert())
              }
            />
            <ActionButton
              enabled={capabilities.has(CapabilityKey.bloodOxygenAlert)}
              label={tr('切换血氧报警', 'Toggle SpO₂ alert')}
              onPress={() => void run(tr('切换血氧报警', 'Toggle SpO₂ alert'), toggleBloodOxygen)}
            />
          </ButtonWrap>
        </Section>
        <Section title={tr('实时报警事件', 'Live alert events')}>
          <ResultList results={results} />
        </Section>
      </ScreenScroll>
    </Page>
  );
}

const sensorLabels: Record<SensorRawSelection, string> = {
  [SensorRawSelection.Acc]: 'ACC',
  [SensorRawSelection.PpgGreen]: 'PPG Green',
  [SensorRawSelection.PpgGreenAndAcc]: 'PPG Green + ACC',
  [SensorRawSelection.PpgRed]: 'PPG Red',
  [SensorRawSelection.PpgRedAndAcc]: 'PPG Red + ACC',
  [SensorRawSelection.PpgGreenAndIr]: 'PPG Green + IR',
  [SensorRawSelection.PpgGreenAccAndIr]: 'PPG Green + ACC + IR',
  [SensorRawSelection.PpgRedAndIr]: 'PPG Red + IR',
  [SensorRawSelection.PpgRedAccAndIr]: 'PPG Red + ACC + IR',
};

function packetSummary(packet: SensorRawPacket | undefined, emptyText: string): string {
  if (!packet) {
    return emptyText;
  }
  return `type=${packet.type}, seq=${packet.sequence ?? '-'}, ppg=${packet.ppg.length}, acc=${packet.acc.length}, red=${packet.ppgRed.length}, ir=${packet.ir.length}, sleep=${packet.sleep.length}`;
}

export function SensorRawPage({onBack, capabilities}: PageProps) {
  const {tr} = useI18n();
  const supported = useMemo(
    () =>
      (Object.values(SensorRawSelection).filter(
        value => typeof value === 'number',
      ) as SensorRawSelection[]).filter(value =>
        capabilities.supportsSensorSelection(value),
      ),
    [capabilities],
  );
  const [selection, setSelection] = useState<SensorRawSelection | undefined>(supported[0]);
  const [collecting, setCollecting] = useState(false);
  const [packetCount, setPacketCount] = useState(0);
  const [latest, setLatest] = useState<SensorRawPacket>();
  const {results, log, run} = useResultLog();

  useEffect(() => {
    const data = RwfitBle.onSensorRawData(packet => {
      setPacketCount(count => count + 1);
      setLatest(packet);
    });
    const stopped = RwfitBle.onSensorRawStopped(event => {
      setCollecting(false);
      log(`${tr('设备停止采集', 'Device stopped collection')}: reason=${event.reason}`);
    });
    return () => {
      data.remove();
      stopped.remove();
      if (collecting && selection) {
        void RwfitBle.controlSensorRaw(false, selection).catch(() => undefined);
      }
    };
  }, [collecting, log, selection, tr]);

  const start = async () => {
    if (!selection) {
      return;
    }
    const result = await run(tr('开始采集', 'Start collection'), () => RwfitBle.controlSensorRaw(true, selection));
    if (result) {
      setCollecting(true);
    }
  };
  const stop = async () => {
    if (!selection) {
      return;
    }
    await run(tr('停止采集', 'Stop collection'), () => RwfitBle.controlSensorRaw(false, selection));
    setCollecting(false);
  };
  const history = async () => {
    const packets = await RwfitBle.getSensorRawHistory();
    return `${packets.length} ${tr('包', 'packets')}`;
  };

  return (
    <Page onBack={onBack} title={tr('传感器原始数据', 'Raw sensor data')}>
      <ScreenScroll>
        <Section title={tr('采集组合', 'Sensor combination')}>
          <ButtonWrap>
            {supported.map(value => (
              <ActionButton
                enabled={!collecting}
                key={value}
                label={`${sensorLabels[value]} (${value})`}
                onPress={() => setSelection(value)}
                primary={selection === value}
              />
            ))}
          </ButtonWrap>
          {supported.length === 0 ? (
            <Text style={styles.notSupported}>
              {tr('当前设备没有支持的原始传感器采集组合', 'No supported raw-sensor combination')}
            </Text>
          ) : null}
          <View style={styles.spacer} />
          <ButtonWrap>
            <ActionButton
              enabled={!collecting && Boolean(selection)}
              label={tr('开始采集', 'Start collection')}
              onPress={() => void start()}
            />
            <ActionButton enabled={collecting} label={tr('停止采集', 'Stop collection')} onPress={() => void stop()} />
            <ActionButton
              enabled={capabilities.has(CapabilityKey.sensorRawPpg)}
              label={tr('同步历史数据', 'Sync history')}
              onPress={() => void run(tr('历史原始数据', 'Raw data history'), history)}
            />
          </ButtonWrap>
        </Section>
        <Section title={tr('实时状态', 'Live status')}>
          <Text style={uiStyles.label}>{tr('实时包数', 'Live packets')}: {packetCount}</Text>
          <Text style={[uiStyles.body, styles.summary]}>
            {packetSummary(latest, tr('尚未收到数据', 'No data received yet'))}
          </Text>
          <Text style={uiStyles.body}>
            {capabilities.has(CapabilityKey.sensorRawSleep)
              ? tr('睡眠状态由设备自动推送，无需启动采集。', 'Sleep state is pushed automatically; collection is not required.')
              : tr('当前设备不支持睡眠原始数据。', 'Raw sleep data is not supported.')}
          </Text>
          {latest?.type === SensorRawDataType.Sleep ? (
            <Text style={uiStyles.body}>{tr('睡眠样本', 'Sleep samples')}: {latest.sleep.length}</Text>
          ) : null}
        </Section>
        <Section title={tr('操作结果', 'Results')}>
          <ResultList results={results} />
        </Section>
      </ScreenScroll>
    </Page>
  );
}

export function AlarmPage({onBack, capabilities}: PageProps) {
  const {tr} = useI18n();
  const [alarms, setAlarms] = useState<AlarmModel[]>([]);
  const {results, log, run} = useResultLog();
  const enabled = capabilities.has(CapabilityKey.alarm);

  const getAlarms = async () => {
    const list = await RwfitBle.getAlarm();
    setAlarms(list);
    log(`${tr('获取闹钟', 'Get alarms')} ✓ ${list.length}`);
    list.forEach(alarm =>
      log(
        `#${alarm.alarmId} ${String(alarm.startHour).padStart(2, '0')}:${String(
          alarm.startMin,
        ).padStart(2, '0')} ${alarm.isOpen ? tr('开', 'On') : tr('关', 'Off')} repeats=${JSON.stringify(
          alarm.repeats,
        )}`,
      ),
    );
  };

  const setDemo = async () => {
    const demo: AlarmModel[] = [
      {
        alarmId: 1,
        startHour: 7,
        startMin: 30,
        isOpen: true,
        repeats: [0, 1, 1, 1, 1, 1, 0],
      },
      {
        alarmId: 2,
        startHour: 22,
        startMin: 0,
        isOpen: true,
        repeats: [1, 1, 1, 1, 1, 1, 1],
      },
    ];
    const result = await run(tr('设置示例闹钟', 'Set sample alarms'), () => RwfitBle.setAlarm(demo));
    if (result) {
      setAlarms(demo);
    }
  };

  const toggleFirst = async () => {
    if (alarms.length === 0) {
      log(tr('请先获取闹钟', 'Get alarms first'));
      return;
    }
    const next = [{...alarms[0], isOpen: !alarms[0].isOpen}, ...alarms.slice(1)];
    const result = await run(tr('切换第1个开关', 'Toggle first alarm'), () => RwfitBle.setAlarm(next));
    if (result) {
      setAlarms(next);
    }
  };

  const deleteAll = () => {
    Alert.alert(tr('删除全部闹钟', 'Delete all alarms'), tr('设备中的全部闹钟都会被删除，确认继续吗？', 'All alarms on the device will be deleted. Continue?'), [
      {text: tr('取消', 'Cancel'), style: 'cancel'},
      {
        text: tr('删除', 'Delete'),
        style: 'destructive',
        onPress: () => {
          void run(tr('删除全部闹钟', 'Delete all alarms'), () => RwfitBle.deleteAllAlarm()).then(result => {
            if (result) {
              setAlarms([]);
            }
          });
        },
      },
    ]);
  };

  return (
    <Page onBack={onBack} title={tr('闹钟', 'Alarms')}>
      <ScreenScroll>
        <Section title={tr('闹钟管理（全量下发）', 'Alarm management (full replacement)')}>
          <ButtonWrap>
            <ActionButton enabled={enabled} label={tr('获取闹钟', 'Get alarms')} onPress={() => void getAlarms()} />
            <ActionButton enabled={enabled} label={tr('设置示例闹钟', 'Set sample alarms')} onPress={() => void setDemo()} />
            <ActionButton enabled={enabled} label={tr('切换第1个开关', 'Toggle first alarm')} onPress={() => void toggleFirst()} />
            <ActionButton danger enabled={enabled} label={tr('删除全部', 'Delete all')} onPress={deleteAll} />
          </ButtonWrap>
        </Section>
        <Section title={tr('操作结果', 'Results')}>
          <ResultList results={results} />
        </Section>
      </ScreenScroll>
    </Page>
  );
}

export function SyncPage({onBack, capabilities}: PageProps) {
  const {tr} = useI18n();
  const [progress, setProgress] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const {results, log} = useResultLog();

  useEffect(() => {
    const progressSub = RwfitBle.onSyncProgress(setProgress);
    const resultSub = RwfitBle.onSyncResult(result => {
      log(`${tr('数据', 'Data')}[${result.type}]: ${result.data.length}`);
    });
    const finishSub = RwfitBle.onSyncFinish(() => {
      setProgress(100);
      setSyncing(false);
      log(`${tr('同步完成', 'Sync complete')} ✓`);
    });
    const errorSub = RwfitBle.onSyncError(error => {
      setSyncing(false);
      log(`${tr('同步错误', 'Sync error')}: code=${error.code}${error.message ? ` ${error.message}` : ''}`);
    });
    return () => {
      progressSub.remove();
      resultSub.remove();
      finishSub.remove();
      errorSub.remove();
      void RwfitBle.removeHealthDataCallback().catch(() => undefined);
    };
  }, [log, tr]);

  const start = async () => {
    setProgress(0);
    setSyncing(true);
    try {
      await RwfitBle.syncAllHealthData();
      log(tr('同步指令已发送...', 'Sync command sent...'));
    } catch (error) {
      setSyncing(false);
      log(`${tr('发送同步指令失败', 'Failed to start sync')}: ${errorMessage(error)}`);
    }
  };

  // 同步事件当前只承诺完成标记 100，不把它当作 0–1 比例猜测。
  const percent = progress;
  return (
    <Page onBack={onBack} title={tr('数据同步', 'Data sync')}>
      <ScreenScroll>
        <Section title={tr('历史健康数据', 'Historical health data')}>
          <ProgressBar value={percent} />
          <Text style={styles.progressText}>
            {syncing
              ? `${tr('同步中...', 'Syncing...')} ${percent.toFixed(0)}%`
              : progress >= 100
                ? tr('同步完成', 'Sync complete')
                : tr('尚未同步', 'Not synced')}
          </Text>
          <ActionButton
            enabled={!syncing && capabilities.supportsAnyHealthData}
            label={capabilities.supportsAnyHealthData
              ? tr('开始同步', 'Start sync')
              : tr('当前设备无可同步数据', 'No supported data to sync')}
            onPress={() => void start()}
            primary
          />
        </Section>
        <Section title={tr('同步结果', 'Sync results')}>
          <ResultList results={results} />
        </Section>
      </ScreenScroll>
    </Page>
  );
}

export function OtaPage({onBack}: PageProps) {
  const {tr} = useI18n();
  const [path, setPath] = useState('');
  const [progress, setProgress] = useState(0);
  const [upgrading, setUpgrading] = useState(false);
  const {results, log} = useResultLog();

  useEffect(() => {
    const progressSub = RwfitBle.onOtaProgress(setProgress);
    const finishSub = RwfitBle.onOtaFinish(result => {
      setUpgrading(false);
      log(result.success
        ? `${tr('OTA 升级成功', 'OTA upgrade succeeded')} ✓`
        : `${tr('OTA 升级失败', 'OTA upgrade failed')}: code=${result.code}`);
    });
    return () => {
      progressSub.remove();
      finishSub.remove();
    };
  }, [log, tr]);

  const start = async () => {
    const value = path.trim();
    if (!value) {
      log(tr('请输入固件文件路径', 'Enter a firmware file path'));
      return;
    }
    setUpgrading(true);
    setProgress(0);
    try {
      await RwfitBle.ringOta(value);
      log(tr('OTA 指令已发送...', 'OTA command sent...'));
    } catch (error) {
      setUpgrading(false);
      log(`${tr('OTA 失败', 'OTA failed')}: ${errorMessage(error)}`);
    }
  };
  // 模块已将 Android/iOS OTA 进度统一为 0–1。
  const percent = progress * 100;

  return (
    <Page onBack={onBack} title={tr('OTA 升级', 'OTA upgrade')}>
      <ScreenScroll>
        <Section title={tr('固件文件', 'Firmware file')}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setPath}
            placeholder={
              Platform.OS === 'android'
                ? '/sdcard/Download/firmware.bin'
                : '/path/to/firmware.bin'
            }
            placeholderTextColor={colors.disabled}
            style={uiStyles.input}
            value={path}
          />
          <View style={styles.spacer} />
          <ProgressBar value={percent} />
          <Text style={styles.progressText}>{tr('进度', 'Progress')}: {percent.toFixed(1)}%</Text>
          <ActionButton
            enabled={!upgrading}
            label={upgrading ? tr('升级中...', 'Upgrading...') : tr('开始 OTA', 'Start OTA')}
            onPress={() => void start()}
            primary
          />
        </Section>
        <Section title={tr('操作结果', 'Results')}>
          <ResultList results={results} />
        </Section>
      </ScreenScroll>
    </Page>
  );
}

export function NotifyPage({onBack, capabilities}: PageProps) {
  const {tr} = useI18n();
  const {results, run} = useResultLog();
  const isAndroid = Platform.OS === 'android';
  const supported = capabilities.has(
    isAndroid ? CapabilityKey.pushMessage : CapabilityKey.pushMessageSwitch,
  );

  return (
    <Page onBack={onBack} title={tr('消息/通知', 'Messages / notifications')}>
      <ScreenScroll>
        <Section title={`${tr('当前平台', 'Platform')}: ${isAndroid ? 'Android' : 'iOS'}`}>
          <Text style={uiStyles.body}>
            {isAndroid
              ? tr('Android 通过 pushMessage 主动推送消息到设备显示。', 'Android uses pushMessage to send messages to the device.')
              : tr('iOS 通过 ANCS 转发系统通知，这里设置哪些 App 的通知转发。', 'iOS forwards system notifications through ANCS; configure the enabled apps here.')}
          </Text>
          <View style={styles.spacer} />
          <ButtonWrap>
            {isAndroid ? (
              <ActionButton
                enabled={supported}
                label={tr('推送测试消息', 'Send test message')}
                onPress={() =>
                  void run(tr('推送消息', 'Send message'), () =>
                    RwfitBle.pushMessage({
                      appId: 'com.rwfit.demo',
                      title: tr('测试标题', 'Test title'),
                      content: tr('这是一条测试消息', 'This is a test message'),
                      msgType: 1,
                    }),
                  )
                }
              />
            ) : (
              <>
                <ActionButton
                  enabled={supported}
                  label={tr('获取通知开关', 'Get notification settings')}
                  onPress={() =>
                    void run(tr('获取通知开关', 'Get notification settings'), () => RwfitBle.getNotificationSwitch())
                  }
                />
                <ActionButton
                  enabled={supported}
                  label={tr('设置通知开关', 'Set notification settings')}
                  onPress={() =>
                    void run(tr('设置通知开关', 'Set notification settings'), () =>
                      RwfitBle.setNotificationSwitch({
                        isCall: true,
                        isSMS: true,
                        isQQ: true,
                        isWechat: true,
                        isWhatsapp: false,
                        isFacebook: false,
                      }),
                    )
                  }
                />
              </>
            )}
          </ButtonWrap>
        </Section>
        <Section title={tr('操作结果', 'Results')}>
          <ResultList results={results} />
        </Section>
      </ScreenScroll>
    </Page>
  );
}

function ProgressBar({value}: {value: number}) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {width: `${Math.max(0, Math.min(100, value))}%`},
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingName: {width: 46, fontSize: 14, fontWeight: '600', color: colors.text},
  notSupported: {fontSize: 11, color: colors.disabled, marginTop: 8},
  spacer: {height: 12},
  summary: {marginTop: 8, marginBottom: 6},
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#e4e7ee',
  },
  progressFill: {height: 8, backgroundColor: colors.primary},
  progressText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginVertical: 10,
  },
});
