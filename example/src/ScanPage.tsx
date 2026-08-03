/* eslint-disable no-void */
import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {RwfitBle, type BleDevice} from 'react-native-rwfit-ble';
import {useI18n} from './i18n';
import {colors, errorMessage, Page} from './ui';

export function ScanPage({
  onBack,
  onConnecting,
}: {
  onBack: () => void;
  onConnecting: (device: BleDevice) => void;
}) {
  const {tr} = useI18n();
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<BleDevice>();
  const [message, setMessage] = useState(
    tr('点击右下角按钮开始扫描', 'Tap the button below to start scanning'),
  );

  useEffect(() => {
    void RwfitBle.iosSetBindedStatus(false).catch(() => undefined);
    const scanResult = RwfitBle.onScanResult(device => {
      const key = device.uuid || device.mac;
      setDevices(current => {
        const next = current.filter(item => (item.uuid || item.mac) !== key);
        next.push(device);
        return next.sort((a, b) => b.rssi - a.rssi);
      });
    });
    const scanFinish = RwfitBle.onScanFinish(() => {
      setScanning(false);
      setMessage(tr('扫描完成', 'Scan complete'));
    });
    return () => {
      scanResult.remove();
      scanFinish.remove();
      void RwfitBle.stopScan().catch(() => undefined);
    };
  }, [tr]);

  const toggleScan = useCallback(async () => {
    try {
      if (scanning) {
        await RwfitBle.stopScan();
        setScanning(false);
      setMessage(tr('扫描已停止', 'Scan stopped'));
        return;
      }
      setDevices([]);
      setScanning(true);
      setMessage(tr('扫描中...', 'Scanning...'));
      await RwfitBle.startScan();
    } catch (error) {
      setScanning(false);
      setMessage(`${tr('扫描失败', 'Scan failed')}: ${errorMessage(error)}`);
    }
  }, [scanning, tr]);

  const connect = useCallback(
    async (device: BleDevice) => {
      if (connecting) {
        return;
      }
      try {
        if (scanning) {
          await RwfitBle.stopScan();
          setScanning(false);
        }
        setConnecting(device);
        setMessage(
          `${tr('连接中', 'Connecting')}: ${device.name || device.mac || device.uuid}...`,
        );
        onConnecting(device);
        await RwfitBle.connect(device);
      } catch (error) {
        setConnecting(undefined);
        setMessage(`${tr('连接失败', 'Connection failed')}: ${errorMessage(error)}`);
      }
    },
    [connecting, onConnecting, scanning, tr],
  );

  return (
    <Page onBack={onBack} title={tr('扫描设备', 'Scan devices')}>
      {connecting ? (
        <View style={styles.connecting}>
          <ActivityIndicator color={colors.warning} size="small" />
          <Text style={styles.connectingText}>{message}</Text>
        </View>
      ) : null}
      <FlatList
        contentContainerStyle={devices.length === 0 ? styles.emptyList : styles.list}
        data={devices}
        keyExtractor={(item, index) => item.uuid || item.mac || `${item.name}-${index}`}
        ListEmptyComponent={<Text style={styles.empty}>{message}</Text>}
        renderItem={({item}) => (
          <Pressable
            accessibilityLabel={`${item.name}, ${item.mac || item.uuid}, ${item.rssi} dBm`}
            accessibilityRole="button"
            disabled={Boolean(connecting)}
            onPress={() => connect(item)}
            style={({pressed}) => [styles.device, pressed && styles.pressed]}>
            <View style={styles.signal}>
              <Text style={styles.signalText}>⌁</Text>
            </View>
            <View style={styles.deviceBody}>
              <Text style={styles.deviceName}>
                {item.name || tr('(未命名)', '(Unnamed)')}
              </Text>
              <Text style={styles.deviceId}>{item.uuid || item.mac || '-'}</Text>
            </View>
            <Text style={styles.rssi}>{item.rssi} dBm</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
      <Pressable
        accessibilityRole="button"
        onPress={toggleScan}
        style={({pressed}) => [styles.scanButton, pressed && styles.pressed]}>
        {scanning ? <ActivityIndicator color="#fff" size="small" /> : null}
        <Text style={styles.scanButtonText}>
          {scanning ? tr('停止', 'Stop') : `⌕  ${tr('扫描', 'Scan')}`}
        </Text>
      </Pressable>
    </Page>
  );
}

const styles = StyleSheet.create({
  connecting: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.warningSoft,
    gap: 10,
  },
  connectingText: {fontSize: 14, color: colors.warning},
  list: {paddingBottom: 96},
  emptyList: {flexGrow: 1, alignItems: 'center', justifyContent: 'center'},
  empty: {fontSize: 14, color: colors.muted},
  device: {
    minHeight: 76,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  signal: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf0ff',
    marginRight: 12,
  },
  signalText: {fontSize: 22, color: colors.primary},
  deviceBody: {flex: 1},
  deviceName: {fontSize: 16, fontWeight: '600', color: colors.text},
  deviceId: {fontSize: 12, color: colors.muted, marginTop: 4},
  rssi: {fontSize: 12, color: colors.muted},
  chevron: {fontSize: 27, color: colors.muted, marginLeft: 6},
  scanButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    minWidth: 112,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
  },
  scanButtonText: {fontSize: 15, fontWeight: '700', color: '#fff'},
  pressed: {opacity: 0.72},
});
