import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {BleDevice} from 'react-native-rwfit-ble';
import {CapabilityKey, DemoCapabilities} from './capabilities';
import {type Language, useI18n} from './i18n';
import type {PageName} from './routes';
import {colors, FeatureTile} from './ui';

interface Props {
  connectionState: string;
  ready: boolean;
  sdkVersion: string;
  savedDevice?: BleDevice;
  capabilities: DemoCapabilities;
  onNavigate: (page: PageName) => void;
  onReconnect: () => void;
  onDisconnect: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

export function HomePage({
  connectionState,
  ready,
  sdkVersion,
  savedDevice,
  capabilities,
  onNavigate,
  onReconnect,
  onDisconnect,
  language,
  onToggleLanguage,
}: Props) {
  const {tr} = useI18n();
  const deviceLabel = savedDevice
    ? `${savedDevice.name || tr('(未命名)', '(Unnamed)')} (${savedDevice.uuid || savedDevice.mac})`
    : undefined;

  return (
    <View style={styles.page}>
      <View style={styles.appBar}>
        <Text style={styles.title}>{tr('RWFIT 戒指', 'RWFIT Ring')}</Text>
        <Text style={styles.version}>SDK {sdkVersion}</Text>
        <Pressable
          accessibilityLabel={
            language === 'zh' ? 'Switch to English' : '切换到中文'
          }
          accessibilityRole="button"
          onPress={onToggleLanguage}
          style={({pressed}) => [styles.languageButton, pressed && styles.pressed]}>
          <Text style={styles.languageText}>{language === 'zh' ? 'EN' : '中文'}</Text>
        </Pressable>
      </View>
      <View
        style={[
          styles.statusBanner,
          ready ? styles.statusReady : styles.statusWaiting,
        ]}>
        <View style={[styles.statusDot, ready && styles.statusDotReady]} />
        <Text style={[styles.statusText, ready && styles.statusTextReady]}>
          {tr('连接状态', 'Connection')}: {connectionState}
          {ready ? tr(' (已就绪)', ' (Ready)') : ''}
        </Text>
      </View>
      <View style={styles.connectionPanel}>
        <Text style={styles.panelTitle}>{tr('连接管理', 'Connection')}</Text>
        {deviceLabel ? (
          <Text style={styles.saved}>{tr('已保存设备', 'Saved device')}: {deviceLabel}</Text>
        ) : (
          <Text style={styles.saved}>{tr('尚未选择设备', 'No device selected')}</Text>
        )}
        <View style={styles.connectionButtons}>
          <ConnectionButton
            label={tr('扫描设备', 'Scan devices')}
            primary
            onPress={() => onNavigate('scan')}
          />
          <ConnectionButton
            enabled={Boolean(savedDevice)}
            label={tr('重连设备', 'Reconnect')}
            onPress={onReconnect}
          />
          <ConnectionButton label={tr('断开连接', 'Disconnect')} onPress={onDisconnect} />
        </View>
      </View>
      <View style={styles.divider} />
      <ScrollView contentContainerStyle={styles.list}>
        <FeatureTile
          enabled={ready}
          icon="ⓘ"
          onPress={() => onNavigate('deviceInfo')}
          subtitle={tr('电量/固件/用户信息/时间格式', 'Battery / firmware / user info / time format')}
          title={tr('设备信息', 'Device info')}
        />
        <FeatureTile
          enabled={ready && capabilities.supportsAnyTimedMonitor}
          icon="♡"
          onPress={() => onNavigate('timedMonitor')}
          subtitle={tr('心率/血氧/HRV/压力/血糖/血压/体温/PPG', 'Heart rate / SpO₂ / HRV / stress / glucose / BP / temperature / PPG')}
          title={tr('全天检测', 'All-day monitoring')}
        />
        <FeatureTile
          enabled={ready && capabilities.supportsAnyRealtime}
          icon="♥"
          onPress={() => onNavigate('realtime')}
          subtitle={tr('实时心率/血氧/血压等（互斥）', 'Real-time heart rate / SpO₂ / BP (mutually exclusive)')}
          title={tr('实时测量', 'Real-time measurement')}
        />
        <FeatureTile
          enabled={ready && capabilities.supportsAnyDeviceControl}
          icon="⌁"
          onPress={() => onNavigate('control')}
          subtitle={tr('找设备/关机/拍照/LED/佩戴/振动', 'Find device / power / camera / LED / wearing / vibration')}
          title={tr('设备控制', 'Device controls')}
        />
        <FeatureTile
          enabled={ready && capabilities.supportsAnyHealthAlert}
          icon="✚"
          onPress={() => onNavigate('healthAlert')}
          subtitle={tr('赞念开关 / 心率和血氧报警 / 实时报警事件', 'Prayer count / heart rate and SpO₂ alerts / live events')}
          title={tr('赞念与健康报警', 'Prayer & health alerts')}
        />
        <FeatureTile
          enabled={ready && capabilities.supportsAnySensorRaw}
          icon="≋"
          onPress={() => onNavigate('sensorRaw')}
          subtitle={tr('PPG / ACC / Red / IR / 睡眠状态', 'PPG / ACC / Red / IR / sleep state')}
          title={tr('传感器原始数据', 'Raw sensor data')}
        />
        <FeatureTile
          enabled={ready && capabilities.has(CapabilityKey.alarm)}
          icon="◷"
          onPress={() => onNavigate('alarm')}
          subtitle={tr('查询/设置/删除（全量下发）', 'Read / set / delete (full replacement)')}
          title={tr('闹钟', 'Alarms')}
        />
        <FeatureTile
          enabled={ready && capabilities.supportsAnyHealthData}
          icon="↻"
          onPress={() => onNavigate('sync')}
          subtitle={tr('历史健康数据同步', 'Historical health data sync')}
          title={tr('数据同步', 'Data sync')}
        />
        <FeatureTile
          enabled={ready && capabilities.supportsWorkout}
          icon="♟"
          onPress={() => onNavigate('workout')}
          subtitle={
            capabilities.supportsWorkout
              ? tr('运动类型选择 / 实时运动控制与数据', 'Workout selection / live controls and data')
              : tr('当前设备不支持多运动', 'Workout mode is not supported')
          }
          title={tr('多运动', 'Workouts')}
        />
        <FeatureTile
          enabled={ready}
          icon="⇧"
          onPress={() => onNavigate('ota')}
          subtitle={tr('固件升级', 'Firmware upgrade')}
          title={tr('OTA 升级', 'OTA upgrade')}
        />
        <FeatureTile
          enabled={
            ready &&
            capabilities.has(
              Platform.OS === 'android'
                ? CapabilityKey.pushMessage
                : CapabilityKey.pushMessageSwitch,
            )
          }
          icon="♢"
          onPress={() => onNavigate('notify')}
          subtitle={tr('Android 推送 / iOS ANCS 开关', 'Android messages / iOS ANCS settings')}
          title={tr('消息/通知', 'Messages / notifications')}
        />
      </ScrollView>
    </View>
  );
}

function ConnectionButton({
  label,
  enabled = true,
  primary = false,
  onPress,
}: {
  label: string;
  enabled?: boolean;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!enabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.connectionButton,
        primary && styles.connectionButtonPrimary,
        !enabled && styles.connectionButtonDisabled,
        pressed && styles.pressed,
      ]}>
      <Text
        style={[
          styles.connectionButtonText,
          primary && styles.connectionButtonTextPrimary,
          !enabled && styles.disabledText,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: colors.background},
  appBar: {
    height: 62,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {fontSize: 20, fontWeight: '700', color: colors.text},
  version: {fontSize: 10, color: colors.muted, marginTop: 2},
  languageButton: {
    position: 'absolute',
    right: 14,
    minWidth: 48,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  languageText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  statusBanner: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusWaiting: {backgroundColor: colors.warningSoft},
  statusReady: {backgroundColor: colors.successSoft},
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
    marginRight: 9,
  },
  statusDotReady: {backgroundColor: colors.success},
  statusText: {fontSize: 14, color: colors.warning},
  statusTextReady: {color: colors.success},
  connectionPanel: {backgroundColor: colors.surface, padding: 16},
  panelTitle: {fontSize: 16, fontWeight: '700', color: colors.text},
  saved: {fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 7},
  connectionButtons: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12},
  connectionButton: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  connectionButtonPrimary: {backgroundColor: colors.primary},
  connectionButtonDisabled: {borderColor: colors.border, backgroundColor: '#f3f4f6'},
  connectionButtonText: {fontSize: 13, fontWeight: '600', color: colors.primary},
  connectionButtonTextPrimary: {color: '#fff'},
  disabledText: {color: colors.disabled},
  pressed: {opacity: 0.72},
  divider: {height: 8, backgroundColor: colors.background},
  list: {paddingBottom: 32},
});
