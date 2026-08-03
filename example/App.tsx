/* eslint-disable no-void */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  RwfitBle,
  type BleDevice,
  type ConnectStateEvent,
  type DynamicMap,
} from 'react-native-rwfit-ble';
import {DemoCapabilities} from './src/capabilities';
import {
  AlarmPage,
  ControlPage,
  DeviceInfoPage,
  HealthAlertPage,
  NotifyPage,
  OtaPage,
  RealtimePage,
  SensorRawPage,
  SyncPage,
  TimedMonitorPage,
} from './src/FeaturePages';
import {HomePage} from './src/HomePage';
import {
  detectSystemLanguage,
  I18nProvider,
  type Language,
} from './src/i18n';
import type {PageName} from './src/routes';
import {ScanPage} from './src/ScanPage';
import {colors, errorMessage} from './src/ui';
import {WorkoutPage} from './src/WorkoutPage';

async function requestBlePermissions(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  const permissions =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const results = await PermissionsAndroid.requestMultiple(permissions);
  if (
    permissions.some(
      permission => results[permission] !== PermissionsAndroid.RESULTS.GRANTED,
    )
  ) {
    throw new Error('BLE_PERMISSION_DENIED');
  }
}

function App() {
  const [language, setLanguage] = useState<Language>(detectSystemLanguage);
  const tr = useCallback(
    (zh: string, en: string) => (language === 'zh' ? zh : en),
    [language],
  );
  const [page, setPage] = useState<PageName>('home');
  const [sdkVersion, setSdkVersion] = useState('-');
  const [connectionStatus, setConnectionStatus] = useState<{
    kind: 'initializing' | 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';
    name?: string;
    detail?: string;
  }>({kind: 'initializing'});
  const [ready, setReady] = useState(false);
  const [capabilityMap, setCapabilityMap] = useState<DynamicMap>({});
  const [savedDevice, setSavedDevice] = useState<BleDevice>();
  const pendingDevice = useRef<BleDevice | undefined>(undefined);
  const capabilities = useMemo(
    () => new DemoCapabilities(capabilityMap),
    [capabilityMap],
  );

  useEffect(() => {
    const connectSubscription = RwfitBle.onConnectState(
      (event: ConnectStateEvent) => {
        setConnectionStatus({
          kind: event.state,
          name: event.name,
          detail: event.reason,
        });
        if (event.state === 'disconnected' || event.state === 'failed') {
          setReady(false);
          setCapabilityMap({});
          setPage('home');
        }
      },
    );
    const menuSubscription = RwfitBle.onFunctionMenu(menu => {
      const candidate = pendingDevice.current;
      setCapabilityMap(menu.raw);
      setReady(true);
      setConnectionStatus({
        kind: 'connected',
        name: menu.name || candidate?.name || menu.mac,
      });
      setSavedDevice({
        name: menu.name || candidate?.name || '',
        mac: menu.mac || candidate?.mac || '',
        uuid: menu.uuid || candidate?.uuid,
        rssi: candidate?.rssi ?? 0,
      });
      pendingDevice.current = undefined;
      setPage('home');
      void RwfitBle.iosSetBindedStatus(true).catch(() => undefined);
    });

    const initialize = async () => {
      try {
        await requestBlePermissions();
        await RwfitBle.init();
        setSdkVersion(await RwfitBle.getSdkVersion());
        const connected = await RwfitBle.isConnected();
        if (connected) {
          setConnectionStatus({kind: 'connected'});
          const result = await RwfitBle.getFunctionList();
          const raw = result.supportMenu;
          if (raw && typeof raw === 'object') {
            setCapabilityMap(raw as DynamicMap);
            setReady(true);
          }
        } else {
          setConnectionStatus({kind: 'idle'});
        }
      } catch (error) {
        setConnectionStatus({kind: 'failed', detail: errorMessage(error)});
      }
    };
    void initialize();

    return () => {
      connectSubscription.remove();
      menuSubscription.remove();
    };
  }, []);

  const reconnect = useCallback(async () => {
    if (!savedDevice) {
      return;
    }
    try {
      if (await RwfitBle.isConnected()) {
        Alert.alert(tr('提示', 'Notice'), tr('设备已连接', 'Device is already connected'));
        return;
      }
      pendingDevice.current = savedDevice;
      setConnectionStatus({kind: 'connecting', name: savedDevice.name});
      await RwfitBle.reconnect(savedDevice);
    } catch (error) {
      setConnectionStatus({kind: 'failed', detail: errorMessage(error)});
    }
  }, [savedDevice, tr]);

  const disconnect = useCallback(async () => {
    try {
      await RwfitBle.disconnect();
      setReady(false);
      setCapabilityMap({});
      setConnectionStatus({kind: 'disconnected'});
    } catch (error) {
      setConnectionStatus({kind: 'failed', detail: errorMessage(error)});
    }
  }, []);

  const connectionState = useMemo(() => {
    const labels = {
      initializing: tr('正在初始化…', 'Initializing…'),
      idle: tr('未连接', 'Not connected'),
      connecting: tr('连接中', 'Connecting'),
      connected: tr('已连接', 'Connected'),
      disconnected: tr('已断开', 'Disconnected'),
      failed: tr('失败', 'Failed'),
    };
    const detail =
      connectionStatus.detail === 'BLE_PERMISSION_DENIED'
        ? tr('蓝牙权限未授权', 'Bluetooth permission denied')
        : connectionStatus.detail;
    return `${labels[connectionStatus.kind]}${
      connectionStatus.name ? ` · ${connectionStatus.name}` : ''
    }${detail ? ` (${detail})` : ''}`;
  }, [connectionStatus, tr]);

  const back = useCallback(() => setPage('home'), []);
  let content: React.ReactNode;
  switch (page) {
    case 'scan':
      content = (
        <ScanPage
          onBack={back}
          onConnecting={device => {
            pendingDevice.current = device;
            setConnectionStatus({
              kind: 'connecting',
              name: device.name || device.mac,
            });
          }}
        />
      );
      break;
    case 'deviceInfo':
      content = <DeviceInfoPage capabilities={capabilities} onBack={back} />;
      break;
    case 'timedMonitor':
      content = <TimedMonitorPage capabilities={capabilities} onBack={back} />;
      break;
    case 'realtime':
      content = <RealtimePage capabilities={capabilities} onBack={back} />;
      break;
    case 'control':
      content = <ControlPage capabilities={capabilities} onBack={back} />;
      break;
    case 'healthAlert':
      content = <HealthAlertPage capabilities={capabilities} onBack={back} />;
      break;
    case 'sensorRaw':
      content = <SensorRawPage capabilities={capabilities} onBack={back} />;
      break;
    case 'alarm':
      content = <AlarmPage capabilities={capabilities} onBack={back} />;
      break;
    case 'sync':
      content = <SyncPage capabilities={capabilities} onBack={back} />;
      break;
    case 'workout':
      content = <WorkoutPage onBack={back} />;
      break;
    case 'ota':
      content = <OtaPage capabilities={capabilities} onBack={back} />;
      break;
    case 'notify':
      content = <NotifyPage capabilities={capabilities} onBack={back} />;
      break;
    default:
      content = (
        <HomePage
          capabilities={capabilities}
          connectionState={connectionState}
          onDisconnect={() => void disconnect()}
          onNavigate={setPage}
          onReconnect={() => void reconnect()}
          ready={ready}
          savedDevice={savedDevice}
          sdkVersion={sdkVersion}
          language={language}
          onToggleLanguage={() => setLanguage(value => (value === 'zh' ? 'en' : 'zh'))}
        />
      );
  }

  return (
    <I18nProvider language={language}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <StatusBar backgroundColor={colors.surface} barStyle="dark-content" />
        {content}
      </SafeAreaView>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.surface},
});

export default App;
