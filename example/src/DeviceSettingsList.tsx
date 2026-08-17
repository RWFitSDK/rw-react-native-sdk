/* eslint-disable no-void */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import {
  CallControlAction,
  RwfitBle,
  SensorRawDataType,
  SensorRawSelection,
  type Alarm,
  type ScheduleToggle,
  type TimedConfig,
  type VibrationConfig,
} from 'react-native-rwfit-ble';
import { CapabilityKey, type DemoCapabilities } from './capabilities';
import { errorMessage } from './ui';
import { useI18n } from './i18n';
import type { DemoController } from './useDemoController';
import { Card, colors } from './ui';

interface Props {
  controller: DemoController;
}

interface FeatureSpec {
  id: string;
  title: string;
  subtitle: string;
  immediate?: boolean;
}

/**
 * 按能力表渲染的设备设置列表，拆解自旧版 AlarmPage / ControlPage /
 * DeviceInfoPage / HealthAlertPage / NotifyPage / SensorRawPage /
 * TimedMonitorPage 的全部操作。
 */
export function DeviceSettingsList({ controller }: Props) {
  const { tr } = useI18n();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState<PromptState | undefined>(undefined);
  const [choice, setChoice] = useState<ChoiceState | undefined>(undefined);
  const [timePicker, setTimePicker] = useState<TimePickerState | undefined>(
    undefined,
  );
  const capabilities = controller.capabilities;

  const sensorStoppedRef = useRef<{ remove: () => void } | undefined>(
    undefined,
  );
  const calibrationRef = useRef<{ remove: () => void } | undefined>(undefined);
  useEffect(() => {
    sensorStoppedRef.current = RwfitBle.onSensorRawStopped(() => {
      setValues(current => ({
        ...current,
        [FeatureId.sensorRawPpg]: tr('采集完成', 'Collection complete'),
      }));
    });
    calibrationRef.current = RwfitBle.onHeartRateCalibration(event => {
      const value = event.isCalibrating
        ? tr('校准中', 'Calibrating')
        : tr(
            `完成 · 结果 ${event.result}`,
            `Complete · result ${event.result}`,
          );
      setValues(current => ({
        ...current,
        [FeatureId.heartRateCalibration]: value,
      }));
    });
    return () => {
      sensorStoppedRef.current?.remove();
      calibrationRef.current?.remove();
    };
  }, [tr]);

  const setValue = useCallback((id: string, value: string) => {
    setValues(current => ({ ...current, [id]: value }));
  }, []);

  const toast = useCallback(
    (message: string) => Alert.alert(tr('提示', 'Notice'), message),
    [tr],
  );

  const settings = supportedSettings(capabilities, tr);

  const runAction = useCallback(
    async (setting: FeatureSpec, action: () => Promise<void>) => {
      if (!controller.connected) {
        toast(tr('请先连接设备', 'Connect the device first'));
        return;
      }
      setBusyIds(current => new Set(current).add(setting.id));
      try {
        await action();
      } catch (error) {
        toast(errorMessage(error));
      } finally {
        setBusyIds(current => {
          const next = new Set(current);
          next.delete(setting.id);
          return next;
        });
      }
    },
    [controller.connected, toast, tr],
  );

  const choose = useCallback(
    (options: string[]): Promise<number | undefined> => {
      return new Promise(resolve => {
        setChoice({options, resolve});
      });
    },
    [],
  );

  const confirm = useCallback(
    (
      title: string,
      message: string,
      confirmLabel: string,
    ): Promise<boolean> => {
      return new Promise(resolve => {
        Alert.alert(title, message, [
          {
            text: tr('取消', 'Cancel'),
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: confirmLabel,
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ]);
      });
    },
    [tr],
  );

  const promptText = useCallback(
    (title: string, placeholder: string): Promise<string | undefined> => {
      return new Promise(resolve => {
        setPrompt({ title, placeholder, resolve });
      });
    },
    [],
  );

  const pickTime = useCallback((): Promise<PickedTime | undefined> => {
    const now = new Date();
    if (Platform.OS === 'android') {
      return new Promise(resolve => {
        DateTimePickerAndroid.open({
          value: now,
          mode: 'time',
          is24Hour: true,
          onValueChange: (_event, selected) => {
            resolve({hour: selected.getHours(), minute: selected.getMinutes()});
          },
          onDismiss: () => resolve(undefined),
          onError: () => resolve(undefined),
        });
      });
    }
    return new Promise(resolve => {
      setTimePicker({value: now, resolve});
    });
  }, []);

  const tapSetting = useCallback(
    async (setting: FeatureSpec) => {
      await runAction(setting, () =>
        executeSetting(setting.id, {
          tr,
          choose,
          confirm,
          promptText,
          pickTime,
          setValue,
          toast,
          capabilities,
          getMac: () => controller.device?.mac ?? '',
        }),
      );
    },
    [
      capabilities,
      choose,
      confirm,
      controller.device,
      promptText,
      pickTime,
      runAction,
      setValue,
      toast,
      tr,
    ],
  );

  if (settings.length === 0) {
    return (
      <>
        <Card>
          <Text style={styles.emptyTitle}>
            {tr('暂无可配置功能', 'No configurable features')}
          </Text>
          <Text style={styles.emptyMessage}>
            {tr(
              '设备功能表未声明可配置项，重新连接后可再次获取。',
              'Reconnect to refresh the device capability table.',
            )}
          </Text>
        </Card>
        <ChoiceModal choice={choice} onClose={() => setChoice(undefined)} />
        <PromptModal prompt={prompt} onClose={() => setPrompt(undefined)} />
        <AlarmTimePickerModal
          picker={timePicker}
          onClose={() => setTimePicker(undefined)}
        />
      </>
    );
  }

  return (
    <>
      <Card style={styles.listCard}>
        {settings.map((setting, index) => (
          <View key={setting.id}>
            <SettingRow
              busy={busyIds.has(setting.id)}
              onPress={() => void tapSetting(setting)}
              setting={setting}
              value={values[setting.id]}
            />
            {index !== settings.length - 1 ? (
              <View style={styles.divider} />
            ) : null}
          </View>
        ))}
      </Card>
      <ChoiceModal choice={choice} onClose={() => setChoice(undefined)} />
      <PromptModal prompt={prompt} onClose={() => setPrompt(undefined)} />
      <AlarmTimePickerModal
        picker={timePicker}
        onClose={() => setTimePicker(undefined)}
      />
    </>
  );
}

interface ChoiceState {
  options: string[];
  resolve: (value: number | undefined) => void;
}

function ChoiceModal({
  choice,
  onClose,
}: {
  choice: ChoiceState | undefined;
  onClose: () => void;
}) {
  const {tr} = useI18n();
  if (!choice) {
    return null;
  }
  const finish = (value: number | undefined) => {
    onClose();
    choice.resolve(value);
  };
  return (
    <Modal
      animationType="slide"
      onRequestClose={() => finish(undefined)}
      transparent
      visible>
      <View style={styles.choiceOverlay}>
        <Pressable
          accessibilityLabel={tr('关闭选择框', 'Close selection')}
          onPress={() => finish(undefined)}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.choiceSheet}>
          <View style={styles.choiceHandle} />
          <ScrollView bounces={false} style={styles.choiceList}>
            {choice.options.map((option, index) => (
              <Pressable
                accessibilityRole="button"
                key={`${option}-${index}`}
                onPress={() => finish(index)}
                style={({pressed}) => [
                  styles.choiceOption,
                  pressed && styles.choiceOptionPressed,
                ]}>
                <Text style={styles.choiceOptionText}>{option}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.choiceDivider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => finish(undefined)}
            style={({pressed}) => [
              styles.choiceCancel,
              pressed && styles.choiceOptionPressed,
            ]}>
            <Text style={styles.choiceCancelText}>{tr('取消', 'Cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

interface PromptState {
  title: string;
  placeholder: string;
  resolve: (value: string | undefined) => void;
}

interface PickedTime {
  hour: number;
  minute: number;
}

interface TimePickerState {
  value: Date;
  resolve: (value: PickedTime | undefined) => void;
}

function AlarmTimePickerModal({
  picker,
  onClose,
}: {
  picker: TimePickerState | undefined;
  onClose: () => void;
}) {
  const {tr} = useI18n();
  const [value, setValue] = useState(() => new Date());

  useEffect(() => {
    if (picker) {
      setValue(picker.value);
    }
  }, [picker]);

  if (!picker) {
    return null;
  }
  const finish = (selected: PickedTime | undefined) => {
    onClose();
    picker.resolve(selected);
  };
  return (
    <Modal
      animationType="fade"
      onRequestClose={() => finish(undefined)}
      transparent
      visible>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{tr('新增闹钟', 'Add alarm')}</Text>
          <DateTimePicker
            display="spinner"
            locale="en_GB"
            mode="time"
            onValueChange={(_event, selected) => setValue(selected)}
            value={value}
          />
          <View style={styles.modalActions}>
            <Pressable
              onPress={() => finish(undefined)}
              style={styles.modalButton}>
              <Text style={styles.modalButtonText}>{tr('取消', 'Cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                finish({hour: value.getHours(), minute: value.getMinutes()})
              }
              style={styles.modalButton}>
              <Text style={[styles.modalButtonText, styles.modalButtonPrimary]}>
                {tr('确定', 'OK')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PromptModal({
  prompt,
  onClose,
}: {
  prompt: PromptState | undefined;
  onClose: () => void;
}) {
  const { tr } = useI18n();
  const [text, setText] = useState('');

  useEffect(() => {
    setText('');
  }, [prompt]);

  if (!prompt) {
    return null;
  }
  const submit = () => {
    prompt.resolve(text.trim());
    onClose();
  };
  const cancel = () => {
    prompt.resolve(undefined);
    onClose();
  };
  return (
    <Modal animationType="fade" onRequestClose={cancel} transparent visible>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{prompt.title}</Text>
          <TextInput
            autoFocus
            onChangeText={setText}
            placeholder={prompt.placeholder}
            placeholderTextColor={colors.secondaryText}
            style={styles.modalInput}
            value={text}
          />
          <View style={styles.modalActions}>
            <Pressable onPress={cancel} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>{tr('取消', 'Cancel')}</Text>
            </Pressable>
            <Pressable onPress={submit} style={styles.modalButton}>
              <Text style={[styles.modalButtonText, styles.modalButtonPrimary]}>
                {tr('确定', 'OK')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SettingRow({
  setting,
  value,
  busy,
  onPress,
}: {
  setting: FeatureSpec;
  value: string | undefined;
  busy: boolean;
  onPress: () => void;
}) {
  const { tr } = useI18n();
  const displayValue =
    value ??
    (setting.immediate
      ? tr('立即执行', 'Run now')
      : readableFeatureIds.has(setting.id)
        ? tr('读取或设置', 'Read or set')
        : tr('点击设置', 'Tap to set'));
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.symbol}>
        <Text style={styles.symbolText}>{setting.title.slice(0, 1)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{setting.title}</Text>
        <Text style={styles.rowSubtitle}>{setting.subtitle}</Text>
      </View>
      <Text numberOfLines={1} style={styles.rowValue}>
        {busy ? tr('处理中…', 'Working…') : displayValue}
      </Text>
      <Text style={styles.chevron}>{'\u203a'}</Text>
    </Pressable>
  );
}

const FeatureId = {
  alarm: 'alarm',
  userInfo: 'userInfo',
  timeFormat: 'timeFormat',
  screenSleep: 'screenSleep',
  brightDuration: 'brightDuration',
  raiseToWake: 'raiseToWake',
  ledLevel: 'ledLevel',
  wearHand: 'wearHand',
  findDevice: 'findDevice',
  takePhoto: 'takePhoto',
  videoHid: 'videoHid',
  heartRateMonitoring: 'heartRateMonitoring',
  bloodOxygenMonitoring: 'bloodOxygenMonitoring',
  hrvMonitoring: 'hrvMonitoring',
  stressMonitoring: 'stressMonitoring',
  bloodPressureMonitoring: 'bloodPressureMonitoring',
  bloodSugarMonitoring: 'bloodSugarMonitoring',
  temperatureMonitoring: 'temperatureMonitoring',
  ppgMonitoring: 'ppgMonitoring',
  sensorRawPpg: 'sensorRawPPG',
  heartRateAlert: 'heartRateAlert',
  bloodOxygenAlert: 'bloodOxygenAlert',
  vibrationCount: 'vibrationCount',
  alarmVibration: 'alarmVibration',
  vibrationInterval: 'vibrationInterval',
  countReminder: 'countReminder',
  fallDetect: 'fallDetect',
  rememberSwitch: 'rememberSwitch',
  messageNotification: 'messageNotification',
  heartRateCalibration: 'heartRateCalibration',
  callAnswer: 'callAnswer',
  callReject: 'callReject',
  powerOff: 'powerOff',
} as const;

const readableFeatureIds = new Set<string>([
  FeatureId.alarm,
  FeatureId.screenSleep,
  FeatureId.brightDuration,
  FeatureId.raiseToWake,
  FeatureId.ledLevel,
  FeatureId.wearHand,
  FeatureId.videoHid,
  FeatureId.heartRateMonitoring,
  FeatureId.bloodOxygenMonitoring,
  FeatureId.hrvMonitoring,
  FeatureId.stressMonitoring,
  FeatureId.bloodPressureMonitoring,
  FeatureId.bloodSugarMonitoring,
  FeatureId.temperatureMonitoring,
  FeatureId.ppgMonitoring,
  FeatureId.heartRateAlert,
  FeatureId.bloodOxygenAlert,
  FeatureId.vibrationCount,
  FeatureId.alarmVibration,
  FeatureId.vibrationInterval,
  FeatureId.countReminder,
  FeatureId.fallDetect,
  FeatureId.rememberSwitch,
]);

function supportedSettings(
  capabilities: DemoCapabilities,
  tr: (zh: string, en: string) => string,
): FeatureSpec[] {
  const settings: FeatureSpec[] = [];
  const add = (spec: FeatureSpec) => settings.push(spec);

  add({
    id: FeatureId.userInfo,
    title: tr('用户信息', 'User profile'),
    subtitle: tr(
      '固定设置：男、20 岁、170.5 cm、80 kg',
      'Demo values: male, 20, 170.5 cm, 80 kg',
    ),
  });
  if (capabilities.has(CapabilityKey.brightScreenTime)) {
    add({
      id: FeatureId.timeFormat,
      title: tr('时间格式', 'Time format'),
      subtitle: tr('设置 12/24 小时制', 'Set 12-hour or 24-hour time'),
    });
  }
  if (capabilities.has(CapabilityKey.alarm)) {
    add({
      id: FeatureId.alarm,
      title: tr('闹钟', 'Alarms'),
      subtitle: tr('设备闹钟管理', 'Manage device alarms'),
    });
  }
  if (capabilities.has(CapabilityKey.brightScreenSleepTime)) {
    add({
      id: FeatureId.screenSleep,
      title: tr('屏幕睡眠', 'Screen sleep'),
      subtitle: tr('设置屏幕睡眠时段', 'Configure the screen-sleep schedule'),
    });
  }
  if (capabilities.has(CapabilityKey.brightScreenTime)) {
    add({
      id: FeatureId.brightDuration,
      title: tr('亮屏时长', 'Screen duration'),
      subtitle: tr('设置屏幕保持点亮时间', 'Set how long the screen stays on'),
    });
  }
  if (capabilities.has(CapabilityKey.raiseBrightScreen)) {
    add({
      id: FeatureId.raiseToWake,
      title: tr('抬腕亮屏', 'Raise to wake'),
      subtitle: tr(
        '设置开关与生效时段',
        'Configure switch and active schedule',
      ),
    });
  }
  if (capabilities.has(CapabilityKey.ledLight)) {
    add({
      id: FeatureId.ledLevel,
      title: tr('LED 亮度', 'LED brightness'),
      subtitle: tr('设置 LED 开关与亮度', 'Configure LED state and brightness'),
    });
  }
  if (capabilities.has(CapabilityKey.wearDirection)) {
    add({
      id: FeatureId.wearHand,
      title: tr('佩戴位置', 'Wearing hand'),
      subtitle: tr('左手或右手佩戴', 'Wear on the left or right hand'),
    });
  }
  if (capabilities.has(CapabilityKey.findDevice)) {
    add({
      id: FeatureId.findDevice,
      title: tr('查找设备', 'Find device'),
      subtitle: tr('让戒指发出查找提示', 'Ask the ring to identify itself'),
      immediate: true,
    });
  }
  if (capabilities.has(CapabilityKey.takePhoto)) {
    add({
      id: FeatureId.takePhoto,
      title: tr('遥控拍照', 'Camera remote'),
      subtitle: tr('接收戒指拍照事件', 'Receive camera events from the ring'),
    });
  }
  if (
    capabilities.has(CapabilityKey.videoHid) ||
    capabilities.has(CapabilityKey.videoHidBook) ||
    capabilities.has(CapabilityKey.videoHidMusic)
  ) {
    add({
      id: FeatureId.videoHid,
      title: 'Video HID',
      subtitle:
        Platform.OS === 'android'
          ? tr(
              '读取、设置模式或管理系统配对',
              'Read or set the mode and manage system pairing',
            )
          : tr('读取或设置 HID 模式', 'Read or set the HID mode'),
    });
  }
  if (capabilities.has(CapabilityKey.heartRate)) {
    add({
      id: FeatureId.heartRateMonitoring,
      title: tr('全天心率', 'All-day heart rate'),
      subtitle: tr(
        '设置全天监测开关与间隔',
        'Configure monitoring and interval',
      ),
    });
  }
  if (capabilities.has(CapabilityKey.bloodOxygen)) {
    add({
      id: FeatureId.bloodOxygenMonitoring,
      title: tr('全天血氧', 'All-day blood oxygen'),
      subtitle: tr('设置全天血氧监测', 'Configure all-day blood oxygen'),
    });
  }
  if (capabilities.has(CapabilityKey.hrv)) {
    add({
      id: FeatureId.hrvMonitoring,
      title: tr('全天 HRV', 'All-day HRV'),
      subtitle: tr('设置全天 HRV 监测', 'Configure all-day HRV'),
    });
  }
  if (capabilities.has(CapabilityKey.pressure)) {
    add({
      id: FeatureId.stressMonitoring,
      title: tr('全天压力', 'All-day stress'),
      subtitle: tr('设置全天压力监测', 'Configure all-day stress'),
    });
  }
  if (capabilities.has(CapabilityKey.bloodPressure)) {
    add({
      id: FeatureId.bloodPressureMonitoring,
      title: tr('全天血压', 'All-day blood pressure'),
      subtitle: tr('设置全天血压监测', 'Configure all-day blood pressure'),
    });
  }
  if (capabilities.has(CapabilityKey.bloodSugar)) {
    add({
      id: FeatureId.bloodSugarMonitoring,
      title: tr('全天血糖', 'All-day blood sugar'),
      subtitle: tr('设置全天血糖监测', 'Configure all-day blood sugar'),
    });
  }
  if (
    capabilities.has(CapabilityKey.temperatureMonitoring) ||
    capabilities.has(CapabilityKey.bodyTemperature)
  ) {
    add({
      id: FeatureId.temperatureMonitoring,
      title: tr('全天体温', 'All-day temperature'),
      subtitle: tr('设置全天体温监测', 'Configure all-day temperature'),
    });
  }
  if (capabilities.has(CapabilityKey.ppgMonitoring)) {
    add({
      id: FeatureId.ppgMonitoring,
      title: tr('PPG 定时监测', 'Scheduled PPG'),
      subtitle: tr('设置 PPG 定时监测', 'Configure scheduled PPG monitoring'),
    });
  }
  if (capabilities.has(CapabilityKey.sensorRawPpg)) {
    add({
      id: FeatureId.sensorRawPpg,
      title: tr('PPG 原始数据', 'Raw PPG data'),
      subtitle: tr(
        '启动、停止采集或获取历史数据',
        'Start, stop, or get history',
      ),
    });
  }
  if (capabilities.has(CapabilityKey.heartRateAlert)) {
    add({
      id: FeatureId.heartRateAlert,
      title: tr('心率报警', 'Heart-rate alert'),
      subtitle: tr('设置心率上下限', 'Configure heart-rate limits'),
    });
  }
  if (capabilities.has(CapabilityKey.bloodOxygenAlert)) {
    add({
      id: FeatureId.bloodOxygenAlert,
      title: tr('血氧报警', 'Blood-oxygen alert'),
      subtitle: tr('设置血氧下限', 'Configure the blood-oxygen lower limit'),
    });
  }
  if (capabilities.has(CapabilityKey.vibrationLevel)) {
    add({
      id: FeatureId.vibrationCount,
      title: tr('震动次数', 'Vibration'),
      subtitle: tr(
        '设置提醒震动次数',
        'Configure vibration count and strength',
      ),
    });
  }
  if (capabilities.has(CapabilityKey.alarmVibrationDuration)) {
    add({
      id: FeatureId.alarmVibration,
      title: tr('闹钟震动时长', 'Alarm vibration'),
      subtitle: tr('设置闹钟震动参数', 'Configure alarm vibration'),
    });
  }
  if (capabilities.has(CapabilityKey.vibrationInterval)) {
    add({
      id: FeatureId.vibrationInterval,
      title: tr('震动间隔', 'Vibration interval'),
      subtitle: tr(
        '设置每次震动的间隔',
        'Configure the interval between vibrations',
      ),
    });
  }
  if (capabilities.has(CapabilityKey.countReminder)) {
    add({
      id: FeatureId.countReminder,
      title: tr('计数提醒', 'Count reminder'),
      subtitle: tr('设置计数提醒间隔', 'Configure the count-reminder interval'),
    });
  }
  if (capabilities.has(CapabilityKey.fallDetect)) {
    add({
      id: FeatureId.fallDetect,
      title: tr('跌落提醒', 'Fall detection'),
      subtitle: tr('开启或关闭跌落检测', 'Enable or disable fall detection'),
    });
  }
  if (capabilities.has(CapabilityKey.muslimSwitch)) {
    add({
      id: FeatureId.rememberSwitch,
      title: tr('赞念开关', 'Prayer-count switch'),
      subtitle: tr('开启或关闭赞念功能', 'Enable or disable prayer counting'),
    });
  }
  if (
    (Platform.OS === 'android' &&
      capabilities.has(CapabilityKey.pushMessage)) ||
    (Platform.OS === 'ios' && capabilities.has(CapabilityKey.pushMessageSwitch))
  ) {
    add({
      id: FeatureId.messageNotification,
      title: tr('消息与通知', 'Messages and notifications'),
      subtitle:
        Platform.OS === 'android'
          ? tr('向设备发送测试消息', 'Send a test message to the device')
          : tr('读取或设置 ANCS 通知转发', 'Read or configure ANCS forwarding'),
      immediate: Platform.OS === 'android',
    });
  }
  add({
    id: FeatureId.heartRateCalibration,
    title: tr('心率校准', 'Heart-rate calibration'),
    subtitle: tr('工厂测试功能', 'Factory-test function'),
    immediate: true,
  });
  if (Platform.OS === 'android') {
    add({
      id: FeatureId.callAnswer,
      title: tr('来电接听', 'Answer call'),
      subtitle: tr(
        '模拟设备接听来电指令',
        'Simulate the device answering a call',
      ),
      immediate: true,
    });
    add({
      id: FeatureId.callReject,
      title: tr('来电拒接', 'Reject call'),
      subtitle: tr(
        '模拟设备拒接来电指令',
        'Simulate the device rejecting a call',
      ),
      immediate: true,
    });
  }
  if (
    capabilities.has(CapabilityKey.powerOff) ||
    capabilities.has(CapabilityKey.factoryReset)
  ) {
    add({
      id: FeatureId.powerOff,
      title: tr('关机与恢复出厂', 'Power and factory reset'),
      subtitle: tr('设备电源操作', 'Device power actions'),
    });
  }
  return settings;
}

interface ExecuteContext {
  tr: (zh: string, en: string) => string;
  choose: (options: string[]) => Promise<number | undefined>;
  confirm: (
    title: string,
    message: string,
    confirmLabel: string,
  ) => Promise<boolean>;
  promptText: (
    title: string,
    placeholder: string,
  ) => Promise<string | undefined>;
  pickTime: () => Promise<PickedTime | undefined>;
  setValue: (id: string, value: string) => void;
  toast: (message: string) => void;
  capabilities: DemoCapabilities;
  getMac: () => string;
}

async function executeSetting(id: string, ctx: ExecuteContext): Promise<void> {
  const { tr, choose, confirm, setValue, toast } = ctx;

  const monitoringSetters: Record<
    string,
    {
      get: () => Promise<TimedConfig>;
      set: (c: TimedConfig) => Promise<unknown>;
    }
  > = {
    [FeatureId.heartRateMonitoring]: {
      get: () => RwfitBle.getTimedHeartRate(),
      set: c => RwfitBle.setTimedHeartRate(c),
    },
    [FeatureId.bloodOxygenMonitoring]: {
      get: () => RwfitBle.getTimedBloodOxygen(),
      set: c => RwfitBle.setTimedBloodOxygen(c),
    },
    [FeatureId.hrvMonitoring]: {
      get: () => RwfitBle.getTimedHRV(),
      set: c => RwfitBle.setTimedHRV(c),
    },
    [FeatureId.stressMonitoring]: {
      get: () => RwfitBle.getTimedStress(),
      set: c => RwfitBle.setTimedStress(c),
    },
    [FeatureId.bloodPressureMonitoring]: {
      get: () => RwfitBle.getTimedBloodPressure(),
      set: c => RwfitBle.setTimedBloodPressure(c),
    },
    [FeatureId.bloodSugarMonitoring]: {
      get: () => RwfitBle.getTimedBloodSugar(),
      set: c => RwfitBle.setTimedBloodSugar(c),
    },
    [FeatureId.temperatureMonitoring]: {
      get: () => RwfitBle.getTimedBodyTemperature(),
      set: c => RwfitBle.setTimedBodyTemperature(c),
    },
    [FeatureId.ppgMonitoring]: {
      get: () => RwfitBle.getTimedPPG(),
      set: c => RwfitBle.setTimedPPG(c),
    },
  };

  if (monitoringSetters[id]) {
    const index = await choose([
      tr('读取当前设置', 'Read current setting'),
      tr('关闭', 'Off'),
      tr('每 30 分钟', 'Every 30 minutes'),
      tr('每 60 分钟', 'Every 60 minutes'),
    ]);
    if (index == null) {
      return;
    }
    if (index === 0) {
      setValue(id, timedConfigText(await monitoringSetters[id].get(), tr));
      toast(tr('当前设置已读取', 'Current setting loaded'));
      return;
    }
    const interval = [0, 30, 60][index - 1];
    await monitoringSetters[id].set({
      isOpen: interval > 0,
      duration: interval || 60,
      startHour: 0,
      startMin: 0,
      endHour: 23,
      endMin: 59,
    });
    setValue(
      id,
      interval
        ? tr(`${interval} 分钟`, `${interval} min`)
        : tr('已关闭', 'Off'),
    );
    toast(tr('设置成功', 'Setting saved'));
    return;
  }

  switch (id) {
    case FeatureId.userInfo: {
      await RwfitBle.setUserInfo({
        gender: 1,
        age: 20,
        height: 170.5,
        weight: 80,
      });
      setValue(
        id,
        tr('男 · 20 岁 · 170.5 cm · 80 kg', 'Male · 20 · 170.5 cm · 80 kg'),
      );
      toast(tr('设置成功', 'Setting saved'));
      return;
    }
    case FeatureId.timeFormat: {
      const labels = [tr('24 小时制', '24-hour'), tr('12 小时制', '12-hour')];
      const index = await choose(labels);
      if (index == null) {
        return;
      }
      await RwfitBle.setTimeFormat(index);
      setValue(id, labels[index]);
      toast(tr('设置成功', 'Setting saved'));
      return;
    }
    case FeatureId.videoHid:
      return manageVideoHid(ctx);
    case FeatureId.findDevice: {
      await RwfitBle.findDevice();
      setValue(id, tr('已发送', 'Sent'));
      toast(tr('查找指令已发送', 'Find-device command sent'));
      return;
    }
    case FeatureId.alarm:
      return manageAlarm(ctx);
    case FeatureId.sensorRawPpg:
      return manageSensorRawPpg(ctx);
    case FeatureId.powerOff:
      return runPowerAction(ctx);
    case FeatureId.messageNotification:
      return manageMessageNotification(ctx);
    case FeatureId.heartRateCalibration: {
      const confirmed = await confirm(
        tr('启动心率校准', 'Start heart-rate calibration'),
        tr(
          '这是工厂测试功能，确定向设备发送校准指令吗？',
          'This is a factory-test function. Send the calibration command?',
        ),
        tr('启动', 'Start'),
      );
      if (!confirmed) {
        return;
      }
      await RwfitBle.startHeartRateCalibration();
      setValue(id, tr('已启动', 'Started'));
      toast(tr('校准指令已发送', 'Calibration command sent'));
      return;
    }
    case FeatureId.callAnswer: {
      await RwfitBle.controlPhone(CallControlAction.Answer);
      setValue(id, tr('已发送', 'Sent'));
      toast(tr('来电接听指令已发送', 'Answer-call command sent'));
      return;
    }
    case FeatureId.callReject: {
      await RwfitBle.controlPhone(CallControlAction.Reject);
      setValue(id, tr('已发送', 'Sent'));
      toast(tr('来电拒接指令已发送', 'Reject-call command sent'));
      return;
    }
    default:
      break;
  }

  const operations: Record<
    string,
    {
      labels: string[];
      values: unknown[];
      run: (value: any) => Promise<unknown>;
      read?: () => Promise<string>;
    }
  > = {
    [FeatureId.screenSleep]: {
      labels: [tr('关闭', 'Off'), '22:00–08:00', tr('全天开启', 'All day')],
      values: [
        { isOpen: false, startHour: 22, endHour: 8 },
        { isOpen: true, startHour: 22, endHour: 8 },
        { isOpen: true },
      ],
      run: value => RwfitBle.setBrightScreenSleepTime(value),
      read: async () => scheduleText(await RwfitBle.getBrightScreenSleepTime(), tr),
    },
    [FeatureId.raiseToWake]: {
      labels: [tr('关闭', 'Off'), '08:00–22:00', tr('全天开启', 'All day')],
      values: [
        { isOpen: false, startHour: 8, endHour: 22 },
        { isOpen: true, startHour: 8, endHour: 22 },
        { isOpen: true },
      ],
      run: value => RwfitBle.setRaiseBrightScreen(value),
      read: async () => scheduleText(await RwfitBle.getRaiseBrightScreen(), tr),
    },
    [FeatureId.brightDuration]: {
      labels: [5, 10, 15, 20, 30].map(v => `${v} ${tr('秒', 's')}`),
      values: [5, 10, 15, 20, 30],
      run: value => RwfitBle.setBrightScreenTime(value),
      read: async () => `${await RwfitBle.getBrightScreenTime()} ${tr('秒', 's')}`,
    },
    [FeatureId.ledLevel]: {
      labels: [
        tr('关闭', 'Off'),
        tr('亮度 1', 'Level 1'),
        tr('亮度 2', 'Level 2'),
        tr('亮度 3', 'Level 3'),
      ],
      values: [0, 1, 2, 3],
      run: value =>
        RwfitBle.setRingLedLevel({
          isOpen: value > 0,
          lcdLevel: Math.max(value, 1),
        }),
      read: async () => {
        const level = await RwfitBle.getRingLedLevel();
        return level.isOpen
          ? tr(`亮度 ${level.lcdLevel}`, `Level ${level.lcdLevel}`)
          : tr('已关闭', 'Off');
      },
    },
    [FeatureId.wearHand]: {
      labels: [tr('左手', 'Left hand'), tr('右手', 'Right hand')],
      values: [false, true],
      run: value => RwfitBle.setRingWearHand(value),
      read: async () =>
        (await RwfitBle.getRingWearDir())
          ? tr('右手', 'Right hand')
          : tr('左手', 'Left hand'),
    },
    [FeatureId.takePhoto]: {
      labels: [
        tr('进入遥控拍照', 'Enter camera remote'),
        tr('退出遥控拍照', 'Exit camera remote'),
      ],
      values: [1, 0],
      run: value => RwfitBle.controlPhoto(value),
    },
    [FeatureId.heartRateAlert]: {
      labels: [
        tr('关闭', 'Off'),
        tr('上限 120 bpm', 'Upper limit 120 bpm'),
        tr('上限 140 bpm', 'Upper limit 140 bpm'),
        tr('上限 160 bpm', 'Upper limit 160 bpm'),
      ],
      values: [0, 120, 140, 160],
      run: async value => {
        const current = await RwfitBle.getHeartRateAlert();
        return RwfitBle.setHeartRateAlert({
          ...current,
          isOpen: value > 0,
          highThreshold: value || 140,
        });
      },
      read: async () => {
        const current = await RwfitBle.getHeartRateAlert();
        return current.isOpen
          ? tr(`上限 ${current.highThreshold} bpm`, `High ${current.highThreshold} bpm`)
          : tr('已关闭', 'Off');
      },
    },
    [FeatureId.bloodOxygenAlert]: {
      labels: [
        tr('关闭', 'Off'),
        tr('下限 90%', 'Lower limit 90%'),
        tr('下限 92%', 'Lower limit 92%'),
        tr('下限 94%', 'Lower limit 94%'),
      ],
      values: [0, 90, 92, 94],
      run: async value => {
        const current = await RwfitBle.getBloodOxygenAlert();
        return RwfitBle.setBloodOxygenAlert({
          ...current,
          isOpen: value > 0,
          lowThreshold: value || 94,
        });
      },
      read: async () => {
        const current = await RwfitBle.getBloodOxygenAlert();
        return current.isOpen
          ? tr(`下限 ${current.lowThreshold}%`, `Low ${current.lowThreshold}%`)
          : tr('已关闭', 'Off');
      },
    },
    [FeatureId.vibrationCount]: {
      labels: [
        tr('关闭', 'Off'),
        tr('低强度 · 1 次', 'Low · 1 time'),
        tr('中强度 · 2 次', 'Medium · 2 times'),
        tr('高强度 · 3 次', 'High · 3 times'),
      ],
      values: [
        { count: 0, level: 0 },
        { count: 1, level: 1 },
        { count: 2, level: 2 },
        { count: 3, level: 3 },
      ],
      run: value => RwfitBle.setVibrationCount(value),
      read: async () => vibrationText(await RwfitBle.getVibrationCount(), tr),
    },
    [FeatureId.alarmVibration]: {
      labels: [0, 1, 2, 3, 4, 5, 6].map(v =>
        v === 0 ? tr('不震动', 'No vibration') : tr(`${v} 次`, `${v} times`),
      ),
      values: [0, 1, 2, 3, 4, 5, 6],
      run: value => RwfitBle.setAlarmVibrationDuration(value),
      read: async () => {
        const count = await RwfitBle.getAlarmVibrationDuration();
        return count === 0
          ? tr('不震动', 'No vibration')
          : tr(`${count} 次`, `${count} times`);
      },
    },
    [FeatureId.vibrationInterval]: {
      labels: [100, 200, 300, 500, 1000].map(v => `${v} ms`),
      values: [100, 200, 300, 500, 1000],
      run: value => RwfitBle.setVibrationInterval(value),
      read: async () => `${await RwfitBle.getVibrationInterval()} ms`,
    },
    [FeatureId.countReminder]: {
      labels: [
        tr('关闭', 'Off'),
        tr('30 分钟', '30 min'),
        tr('60 分钟', '60 min'),
        tr('90 分钟', '90 min'),
        tr('120 分钟', '120 min'),
      ],
      values: [0, 30, 60, 90, 120],
      run: value => RwfitBle.setCountReminderInterval(value),
      read: async () => {
        const minutes = await RwfitBle.getCountReminderInterval();
        return minutes === 0
          ? tr('已关闭', 'Off')
          : tr(`${minutes} 分钟`, `${minutes} min`);
      },
    },
    [FeatureId.fallDetect]: {
      labels: [tr('关闭', 'Off'), tr('开启', 'On')],
      values: [false, true],
      run: value => RwfitBle.setFallDetect(value),
      read: async () => switchText(await RwfitBle.getFallDetect(), tr),
    },
    [FeatureId.rememberSwitch]: {
      labels: [tr('关闭', 'Off'), tr('开启', 'On')],
      values: [false, true],
      run: value => RwfitBle.setMuslimCountEnabled(value),
      read: async () => switchText(await RwfitBle.getMuslimCountEnabled(), tr),
    },
  };

  const operation = operations[id];
  if (!operation) {
    throw new Error(
      tr('此功能暂未配置操作模型', 'This action has no operation model'),
    );
  }
  const labels = operation.read
    ? [tr('读取当前设置', 'Read current setting'), ...operation.labels]
    : operation.labels;
  const index = await choose(labels);
  if (index == null) {
    return;
  }
  if (operation.read && index === 0) {
    setValue(id, await operation.read());
    toast(tr('当前设置已读取', 'Current setting loaded'));
    return;
  }
  const valueIndex = operation.read ? index - 1 : index;
  await operation.run(operation.values[valueIndex]);
  setValue(id, operation.labels[valueIndex]);
  toast(tr('设置成功', 'Setting saved'));
}

async function manageVideoHid(ctx: ExecuteContext): Promise<void> {
  const { tr, choose, setValue, toast, capabilities, getMac } = ctx;
  const actions: Array<{
    label: string;
    mode?: number;
    bondType?: number;
    read?: boolean;
  }> = [
    { label: tr('读取当前模式', 'Read current mode'), read: true },
    { label: tr('关闭 HID', 'Turn HID off'), mode: 0 },
  ];
  if (capabilities.has(CapabilityKey.videoHid)) {
    actions.push({ label: tr('视频模式', 'Video mode'), mode: 1 });
  }
  if (capabilities.has(CapabilityKey.videoHidBook)) {
    actions.push({ label: tr('翻页模式', 'Book mode'), mode: 2 });
  }
  if (capabilities.has(CapabilityKey.videoHidMusic)) {
    actions.push({ label: tr('音乐模式', 'Music mode'), mode: 3 });
  }
  if (Platform.OS === 'android') {
    actions.push(
      { label: tr('发起系统配对', 'Pair system HID'), bondType: 1 },
      { label: tr('解除系统配对', 'Unpair system HID'), bondType: 2 },
    );
  }
  const index = await choose(actions.map(action => action.label));
  if (index == null) {
    return;
  }
  const action = actions[index];
  if (action.bondType != null) {
    const mac = getMac();
    if (!mac) {
      throw new Error(
        tr('当前设备没有可用 MAC 地址', 'No device MAC is available'),
      );
    }
    const started = await RwfitBle.createOrRemoveBond(action.bondType, mac);
    setValue(
      FeatureId.videoHid,
      started ? action.label : tr('操作未发起', 'Not started'),
    );
    toast(
      started
        ? tr('系统配对操作已发起', 'System pairing action started')
        : tr('系统配对操作未发起', 'System pairing action was not started'),
    );
    return;
  }
  if (action.read) {
    const mode = await RwfitBle.getVideoHid();
    setValue(FeatureId.videoHid, videoHidText(mode, tr));
    toast(tr('当前设置已读取', 'Current setting loaded'));
    return;
  }
  await RwfitBle.setVideoHid(action.mode ?? 0);
  setValue(FeatureId.videoHid, videoHidText(action.mode ?? 0, tr));
  toast(tr('设置成功', 'Setting saved'));
}

function timedConfigText(
  config: TimedConfig,
  tr: (zh: string, en: string) => string,
): string {
  if (!config.isOpen) {
    return tr('已关闭', 'Off');
  }
  const duration = config.duration ?? 0;
  const range = `${timeText(config.startHour, config.startMin)}–${timeText(
    config.endHour,
    config.endMin,
  )}`;
  return tr(`${duration} 分钟 · ${range}`, `${duration} min · ${range}`);
}

function scheduleText(
  config: ScheduleToggle,
  tr: (zh: string, en: string) => string,
): string {
  return config.isOpen
    ? `${timeText(config.startHour, config.startMin)}–${timeText(
        config.endHour,
        config.endMin,
      )}`
    : tr('已关闭', 'Off');
}

function timeText(hour?: number, minute?: number): string {
  return `${String(hour ?? 0).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}`;
}

function vibrationText(
  config: VibrationConfig,
  tr: (zh: string, en: string) => string,
): string {
  if (config.count === 0 || config.level === 0) {
    return tr('已关闭', 'Off');
  }
  const level =
    config.level === 1
      ? tr('低', 'Low')
      : config.level === 2
        ? tr('中', 'Medium')
        : config.level === 3
          ? tr('高', 'High')
          : tr(`等级 ${config.level}`, `Level ${config.level}`);
  return tr(`${level} · ${config.count} 次`, `${level} · ${config.count} times`);
}

function switchText(
  enabled: boolean,
  tr: (zh: string, en: string) => string,
): string {
  return enabled ? tr('已开启', 'On') : tr('已关闭', 'Off');
}

function videoHidText(
  mode: number,
  tr: (zh: string, en: string) => string,
): string {
  switch (mode) {
    case 0:
      return tr('已关闭', 'Off');
    case 1:
      return tr('视频模式', 'Video');
    case 2:
      return tr('翻页模式', 'Book');
    case 3:
      return tr('音乐模式', 'Music');
    default:
      return tr(`未知模式 ${mode}`, `Unknown mode ${mode}`);
  }
}

async function manageSensorRawPpg(ctx: ExecuteContext): Promise<void> {
  const { tr, choose, setValue, toast } = ctx;
  const index = await choose([
    tr('启动 PPG', 'Start PPG'),
    tr('停止 PPG', 'Stop PPG'),
    tr('获取 PPG 历史', 'Get PPG history'),
  ]);
  if (index == null) {
    return;
  }
  if (index < 2) {
    const start = index === 0;
    if (!start) {
      setValue(FeatureId.sensorRawPpg, tr('停止中', 'Stopping'));
    }
    await RwfitBle.controlSensorRaw(start, SensorRawSelection.PpgGreen);
    if (start) {
      setValue(FeatureId.sensorRawPpg, tr('采集中', 'Collecting'));
    }
    toast(
      start
        ? tr('PPG 已启动', 'PPG started')
        : tr('停止指令已发送', 'Stop command sent'),
    );
    return;
  }
  const packets = await RwfitBle.getSensorRawHistory();
  const ppgPackets = packets.filter(
    packet => packet.type === SensorRawDataType.Ppg,
  );
  const samples = ppgPackets.reduce(
    (total, packet) => total + packet.ppg.length,
    0,
  );
  setValue(
    FeatureId.sensorRawPpg,
    tr(
      `${ppgPackets.length} 组 · ${samples} 点`,
      `${ppgPackets.length} sets · ${samples} samples`,
    ),
  );
  Alert.alert(
    tr('PPG 历史数据', 'PPG history'),
    ppgPackets.length
      ? tr(
          `获取 ${ppgPackets.length} 组，共 ${samples} 个采样点。`,
          `Received ${ppgPackets.length} sets and ${samples} samples.`,
        )
      : tr('设备中暂无 PPG 历史数据。', 'No PPG history on the device.'),
  );
}

async function manageAlarm(ctx: ExecuteContext): Promise<void> {
  const { tr, choose, confirm, pickTime, setValue, toast } = ctx;
  const action = await choose([
    tr('获取闹钟', 'Get alarms'),
    tr('新增闹钟', 'Add alarm'),
    tr('删除全部闹钟', 'Delete all alarms'),
  ]);
  if (action == null) {
    return;
  }
  if (action === 0) {
    const alarms = await RwfitBle.getAlarm();
    setValue(
      FeatureId.alarm,
      tr(`${alarms.length} 个闹钟`, `${alarms.length} alarms`),
    );
    Alert.alert(
      tr(`设备闹钟（${alarms.length}）`, `Device alarms (${alarms.length})`),
      formatAlarmList(alarms, tr),
    );
    return;
  }
  if (action === 2) {
    const confirmed = await confirm(
      tr('删除全部闹钟', 'Delete all alarms'),
      tr('确定删除设备中的全部闹钟吗？', 'Delete all alarms on the device?'),
      tr('删除', 'Delete'),
    );
    if (!confirmed) {
      return;
    }
    await RwfitBle.deleteAllAlarm();
    setValue(FeatureId.alarm, tr('0 个闹钟', '0 alarms'));
    toast(tr('已删除', 'Deleted'));
    return;
  }
  const selected = await pickTime();
  if (!selected) {
    return;
  }
  const {hour, minute} = selected;
  const alarms = await RwfitBle.getAlarm();
  if (alarms.length >= 6) {
    throw new Error(
      tr('设备最多支持 6 个闹钟', 'The device supports up to 6 alarms'),
    );
  }
  const usedIds = new Set(alarms.map(alarm => alarm.alarmId));
  let alarmId = 0;
  while (usedIds.has(alarmId)) {
    alarmId += 1;
  }
  const nextAlarms: Alarm[] = [
    ...alarms,
    {
      alarmId,
      startHour: hour,
      startMin: minute,
      isOpen: true,
      repeats: [1, 1, 1, 1, 1, 1, 1],
    },
  ];
  await RwfitBle.setAlarm(nextAlarms);
  setValue(
    FeatureId.alarm,
    tr(`${nextAlarms.length} 个闹钟`, `${nextAlarms.length} alarms`),
  );
  toast(tr('闹钟已添加', 'Alarm added'));
}

function formatAlarmList(
  alarms: Alarm[],
  tr: (zh: string, en: string) => string,
): string {
  if (alarms.length === 0) {
    return tr('设备中暂无闹钟', 'No alarms on the device');
  }
  const weekdays = tr(
    '周日,周一,周二,周三,周四,周五,周六',
    'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
  ).split(',');
  return alarms
    .map((alarm, index) => {
      const days = (alarm.repeats ?? [])
        .map((enabled, day) => (enabled ? weekdays[day] : ''))
        .filter(Boolean);
      const repeatText =
        days.length === 7
          ? tr('每天', 'Every day')
          : days.length
          ? days.join(tr('、', ', '))
          : tr('仅一次', 'Once');
      const hh = String(alarm.startHour).padStart(2, '0');
      const mm = String(alarm.startMin).padStart(2, '0');
      return `${index + 1}. ${hh}:${mm} · ${repeatText} · ${
        alarm.isOpen ? tr('开启', 'On') : tr('关闭', 'Off')
      }`;
    })
    .join('\n');
}

async function runPowerAction(ctx: ExecuteContext): Promise<void> {
  const { tr, choose, confirm, capabilities, setValue, toast } = ctx;
  const actions: Array<{ label: string; factoryReset: boolean }> = [];
  if (capabilities.has(CapabilityKey.powerOff)) {
    actions.push({ label: tr('设备关机', 'Power off'), factoryReset: false });
  }
  if (capabilities.has(CapabilityKey.factoryReset)) {
    actions.push({
      label: tr('恢复出厂设置', 'Factory reset'),
      factoryReset: true,
    });
  }
  const index = await choose(actions.map(action => action.label));
  if (index == null) {
    return;
  }
  const action = actions[index];
  const confirmed = await confirm(
    action.label,
    action.factoryReset
      ? tr(
          '设备数据将被清除，此操作不可撤销。',
          'Device data will be erased. This cannot be undone.',
        )
      : tr('确定让设备关机吗？', 'Power off the device?'),
    action.factoryReset ? tr('恢复出厂', 'Reset') : tr('关机', 'Power off'),
  );
  if (!confirmed) {
    return;
  }
  if (action.factoryReset) {
    await RwfitBle.factoryReset();
  } else {
    await RwfitBle.powerOff();
  }
  setValue(FeatureId.powerOff, tr('指令已发送', 'Command sent'));
  toast(
    action.factoryReset
      ? tr('恢复出厂指令已发送', 'Factory-reset command sent')
      : tr('关机指令已发送', 'Power-off command sent'),
  );
}

async function manageMessageNotification(ctx: ExecuteContext): Promise<void> {
  const { tr, choose, setValue, toast } = ctx;
  if (Platform.OS === 'android') {
    await RwfitBle.pushMessage({
      appId: 'com.rwfit.demo',
      title: tr('测试标题', 'Test title'),
      content: tr('这是一条测试消息', 'This is a test message'),
      msgType: 1,
    });
    setValue(FeatureId.messageNotification, tr('已发送', 'Sent'));
    toast(tr('测试消息已发送', 'Test message sent'));
    return;
  }
  const index = await choose([
    tr('读取当前设置', 'Read current settings'),
    tr('开启常用通知', 'Enable common notifications'),
    tr('关闭全部通知', 'Disable all notifications'),
  ]);
  if (index == null) {
    return;
  }
  if (index === 0) {
    const switches = await RwfitBle.getNotificationSwitch();
    const enabledCount = Object.values(switches).filter(
      value => value === true,
    ).length;
    setValue(
      FeatureId.messageNotification,
      tr(`${enabledCount} 项开启`, `${enabledCount} enabled`),
    );
    toast(tr('通知设置已读取', 'Notification settings loaded'));
    return;
  }
  const enabled = index === 1;
  await RwfitBle.setNotificationSwitch({
    isCall: enabled,
    isSMS: enabled,
    isQQ: enabled,
    isWechat: enabled,
    isWhatsapp: false,
    isFacebook: false,
  });
  setValue(
    FeatureId.messageNotification,
    enabled
      ? tr('常用通知已开启', 'Common enabled')
      : tr('已全部关闭', 'All off'),
  );
  toast(tr('设置成功', 'Setting saved'));
}

const styles = StyleSheet.create({
  listCard: { padding: 0, overflow: 'hidden' },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 19,
  },
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  symbol: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  symbolText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSubtitle: { marginTop: 3, fontSize: 12, color: colors.secondaryText },
  rowValue: { maxWidth: 100, fontSize: 12, color: colors.primary },
  chevron: { fontSize: 20, color: colors.secondaryText, marginLeft: 6 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 66,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000055',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  choiceOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000055',
  },
  choiceSheet: {
    maxHeight: '82%',
    paddingTop: 10,
    paddingBottom: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
  },
  choiceHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginBottom: 8,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  choiceList: {flexGrow: 0},
  choiceOption: {
    minHeight: 52,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceOptionPressed: {backgroundColor: colors.primarySoft},
  choiceOptionText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    textAlign: 'center',
  },
  choiceDivider: {height: 8, backgroundColor: colors.background},
  choiceCancel: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCancelText: {fontSize: 15, fontWeight: '600', color: colors.primary},
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modalInput: {
    marginTop: 14,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
    gap: 18,
  },
  modalButton: { paddingVertical: 8, paddingHorizontal: 6 },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  modalButtonPrimary: { color: colors.primary },
});
