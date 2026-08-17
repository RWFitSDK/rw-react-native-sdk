/* eslint-disable no-void */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RwfitBle, type BleDevice } from 'react-native-rwfit-ble';
import { useI18n } from './i18n';
import {
  Card,
  colors,
  EmptyCard,
  errorMessage,
  OutlineButton,
  PageHeader,
  SectionHeading,
} from './ui';

const scanDurationSec = 10;

/**
 * 搜索设备页：扫描状态 + 倒计时 + 设备列表。
 *
 * 连接指令返回只代表已发送；收到 onFunctionMenu 后才视为真正连接成功。
 */
export function ScanPage({ onBack }: { onBack: () => void }) {
  const { tr } = useI18n();
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(scanDurationSec);
  const [connecting, setConnecting] = useState<BleDevice | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const countdownTimer = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const connectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const connectingRef = useRef(connecting);
  connectingRef.current = connecting;

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeout.current) {
      clearTimeout(connectTimeout.current);
      connectTimeout.current = undefined;
    }
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = undefined;
    }
  }, []);

  const startScan = useCallback(async () => {
    setDevices([]);
    setError(undefined);
    setScanning(true);
    setRemainingSeconds(scanDurationSec);
    countdownTimer.current = setInterval(() => {
      setRemainingSeconds(current => {
        if (current <= 1) {
          stopCountdown();
          setScanning(false);
          void RwfitBle.stopScan().catch(() => undefined);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    try {
      await RwfitBle.startScan();
    } catch (scanError) {
      stopCountdown();
      setScanning(false);
      setError(`${tr('搜索失败', 'Scan failed')}: ${errorMessage(scanError)}`);
    }
  }, [stopCountdown, tr]);

  const stopScan = useCallback(async () => {
    try {
      await RwfitBle.stopScan();
    } finally {
      stopCountdown();
      setScanning(false);
    }
  }, [stopCountdown]);

  useEffect(() => {
    void RwfitBle.iosSetBindedStatus(false).catch(() => undefined);
    const scanResultSub = RwfitBle.onScanResult(device => {
      const key = device.uuid || device.mac;
      setDevices(current => {
        const next = current.filter(item => (item.uuid || item.mac) !== key);
        next.push(device);
        return next.sort((a, b) => b.rssi - a.rssi);
      });
    });
    const scanFinishSub = RwfitBle.onScanFinish(() => {
      stopCountdown();
      setScanning(false);
    });
    const connectStateSub = RwfitBle.onConnectState(event => {
      if (event.state !== 'failed' || !connectingRef.current) {
        return;
      }
      clearConnectTimeout();
      connectingRef.current = undefined;
      setConnecting(undefined);
      setError(
        `${tr('连接失败', 'Connection failed')}: ${
          event.reason ?? tr('请重试', 'Try again')
        }`,
      );
    });
    const functionMenuSub = RwfitBle.onFunctionMenu(() => {
      if (!connectingRef.current) {
        return;
      }
      clearConnectTimeout();
      connectingRef.current = undefined;
      setConnecting(undefined);
      onBack();
    });
    void startScan();
    return () => {
      scanResultSub.remove();
      scanFinishSub.remove();
      connectStateSub.remove();
      functionMenuSub.remove();
      clearConnectTimeout();
      connectingRef.current = undefined;
      stopCountdown();
      void RwfitBle.stopScan().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(
    async (device: BleDevice) => {
      if (connectingRef.current) {
        return;
      }
      try {
        if (scanning) {
          await stopScan();
        }
        connectingRef.current = device;
        setConnecting(device);
        setError(undefined);
        clearConnectTimeout();
        connectTimeout.current = setTimeout(() => {
          if (!connectingRef.current) {
            return;
          }
          connectTimeout.current = undefined;
          connectingRef.current = undefined;
          setConnecting(undefined);
          setError(
            `${tr('连接失败', 'Connection failed')}: ${tr(
              '连接超时',
              'Connection timed out',
            )}`,
          );
          void RwfitBle.disconnect().catch(() => undefined);
        }, 20000);
        await RwfitBle.connect(device);
      } catch (connectError) {
        clearConnectTimeout();
        connectingRef.current = undefined;
        setConnecting(undefined);
        setError(
          `${tr('连接失败', 'Connection failed')}: ${errorMessage(
            connectError,
          )}`,
        );
      }
    },
    [clearConnectTimeout, scanning, stopScan, tr],
  );

  return (
    <View style={styles.page}>
      <PageHeader onBack={onBack} title={tr('搜索设备', 'Search devices')} />
      <FlatList
        contentContainerStyle={styles.listContent}
        data={devices}
        keyExtractor={(item, index) =>
          item.uuid || item.mac || `${item.name}-${index}`
        }
        ListHeaderComponent={
          <>
            <Card style={styles.scanCard}>
              <View style={styles.scanInfo}>
                <Text style={styles.scanTitle}>
                  {scanning
                    ? tr('正在搜索附近设备', 'Searching nearby devices')
                    : tr('搜索已暂停', 'Scan paused')}
                </Text>
                <Text style={styles.scanSubtitle}>
                  {scanning
                    ? tr(
                        `${remainingSeconds} 秒后自动暂停`,
                        `Pauses in ${remainingSeconds}s`,
                      )
                    : tr(
                        '请保持戒指靠近手机',
                        'Keep the ring close to the phone',
                      )}
                </Text>
              </View>
              <View style={styles.scanAction}>
                <OutlineButton
                  enabled={connecting == null}
                  label={
                    scanning
                      ? tr('停止', 'Stop')
                      : tr('重搜', 'Scan again')
                  }
                  onPress={() => void (scanning ? stopScan() : startScan())}
                />
              </View>
            </Card>
            <SectionHeading
              caption={tr(`${devices.length} 台`, `${devices.length} found`)}
              title={tr('发现的设备', 'Discovered devices')}
            />
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyCard
            message={tr(
              '确认戒指未被其他手机连接，然后重新搜索。',
              'Make sure the ring is not connected to another phone and scan again.',
            )}
            title={tr('暂未发现设备', 'No devices found')}
          />
        }
        renderItem={({ item }) => (
          <DeviceRow
            connecting={
              connecting != null &&
              (connecting.uuid || connecting.mac) === (item.uuid || item.mac)
            }
            device={item}
            disabled={connecting != null}
            onPress={() => void connect(item)}
          />
        )}
      />
    </View>
  );
}

function DeviceRow({
  device,
  connecting,
  disabled,
  onPress,
}: {
  device: BleDevice;
  connecting: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { tr } = useI18n();
  return (
    <Pressable
      accessibilityLabel={`${device.name}, ${device.mac || device.uuid}, ${
        device.rssi
      } dBm`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.device,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.deviceIcon} />
      <View style={styles.deviceBody}>
        <Text numberOfLines={1} style={styles.deviceName}>
          {device.name || tr('(未命名)', '(Unnamed)')}
        </Text>
        <Text numberOfLines={1} style={styles.deviceId}>
          {device.uuid || device.mac || '-'}
        </Text>
      </View>
      {connecting ? (
        <Text style={styles.deviceRssi}>{tr('连接中…', 'Connecting…')}</Text>
      ) : (
        <Text style={styles.deviceRssi}>{device.rssi} dBm</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  scanCard: { flexDirection: 'row', alignItems: 'center' },
  scanInfo: { flex: 1 },
  scanTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  scanSubtitle: { marginTop: 4, fontSize: 12, color: colors.secondaryText },
  scanAction: { marginLeft: 12 },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 14,
    padding: 14,
  },
  errorText: { color: colors.danger, fontSize: 13 },
  device: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 8,
    borderColor: colors.primary,
    marginRight: 14,
  },
  deviceBody: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '700', color: colors.text },
  deviceId: { marginTop: 3, fontSize: 12, color: colors.secondaryText },
  deviceRssi: { fontSize: 12, color: colors.secondaryText },
  pressed: { opacity: 0.72 },
});
