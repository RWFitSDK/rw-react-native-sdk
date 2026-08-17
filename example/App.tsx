/* eslint-disable no-void */
import React, {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  PermissionsAndroid,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import {RwfitBle} from 'react-native-rwfit-ble';
import {DevicePage} from './src/DevicePage';
import {HealthHistoryPage} from './src/HealthHistoryPage';
import type {HealthDefinition} from './src/healthMetadata';
import {HomePage} from './src/HomePage';
import {
  detectSystemLanguage,
  I18nProvider,
  type Language,
  useI18n,
} from './src/i18n';
import {OtaPage} from './src/OtaPage';
import {ScanPage} from './src/ScanPage';
import {colors, PrimaryButton} from './src/ui';
import {useDemoController} from './src/useDemoController';
import {WorkoutPage} from './src/WorkoutPage';

type Tab = 'home' | 'device';
type Overlay =
  | {kind: 'scan'}
  | {kind: 'workout'}
  | {kind: 'ota'}
  | {kind: 'history'; definition: HealthDefinition}
  | undefined;

const fallbackSafeAreaMetrics = {
  frame: {
    x: 0,
    y: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  insets: {top: 0, right: 0, bottom: 0, left: 0},
};

async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const permissions =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    permission => results[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

function App() {
  const [language, setLanguage] = useState<Language>(detectSystemLanguage);

  return (
    <SafeAreaProvider
      initialMetrics={initialWindowMetrics ?? fallbackSafeAreaMetrics}>
      <I18nProvider language={language}>
        <PermissionGate>
          <DemoShell
            language={language}
            onToggleLanguage={() =>
              setLanguage(value => (value === 'zh' ? 'en' : 'zh'))
            }
          />
        </PermissionGate>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

function PermissionGate({children}: PropsWithChildren) {
  const {tr} = useI18n();
  const [status, setStatus] = useState<'requesting' | 'ready' | 'denied'>(
    'requesting',
  );
  const attemptRef = useRef(0);

  const initialize = useCallback(async () => {
    const attempt = ++attemptRef.current;
    setStatus('requesting');
    try {
      const granted = await requestBlePermissions();
      if (attempt !== attemptRef.current) {
        return;
      }
      if (!granted) {
        setStatus('denied');
        return;
      }
      await RwfitBle.init().catch(() => undefined);
      if (attempt === attemptRef.current) {
        setStatus('ready');
      }
    } catch {
      if (attempt === attemptRef.current) {
        setStatus('denied');
      }
    }
  }, []);

  useEffect(() => {
    void initialize();
    return () => {
      attemptRef.current += 1;
    };
  }, [initialize]);

  if (status === 'ready') {
    return <>{children}</>;
  }

  return (
    <SafeAreaView style={styles.permissionPage}>
      <View style={styles.permissionCard}>
        {status === 'requesting' ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : null}
        <Text style={styles.permissionTitle}>
          {status === 'requesting'
            ? tr('正在请求蓝牙权限…', 'Requesting Bluetooth permissions…')
            : tr('蓝牙权限未授予', 'Bluetooth permission was not granted')}
        </Text>
        <Text style={styles.permissionMessage}>
          {status === 'requesting'
            ? tr('权限就绪后将进入示例。', 'The demo opens when permissions are ready.')
            : tr(
                '扫描和连接设备需要蓝牙权限，请重新授权。',
                'Bluetooth permission is required to scan and connect. Please try again.',
              )}
        </Text>
        {status === 'denied' ? (
          <View style={styles.permissionAction}>
            <PrimaryButton
              label={tr('重新请求权限', 'Request permissions again')}
              onPress={() => void initialize()}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/** 首页/设备双 Tab 导航壳，对齐 Flutter demo 的 home_page.dart 顶层结构。 */
function DemoShell({
  language,
  onToggleLanguage,
}: {
  language: Language;
  onToggleLanguage: () => void;
}) {
  const {tr} = useI18n();
  const [tab, setTab] = useState<Tab>('home');
  const [overlay, setOverlay] = useState<Overlay>(undefined);
  const controller = useDemoController();

  const openScan = useCallback(async () => {
    await controller.prepareForScan();
    setOverlay({kind: 'scan'});
  }, [controller]);
  const closeOverlay = useCallback(() => setOverlay(undefined), []);
  const openWorkout = useCallback(() => setOverlay({kind: 'workout'}), []);
  const openOta = useCallback(() => setOverlay({kind: 'ota'}), []);
  const openHistory = useCallback(
    (definition: HealthDefinition) => setOverlay({kind: 'history', definition}),
    [],
  );

  let content;
  if (overlay?.kind === 'scan') {
    content = <ScanPage onBack={closeOverlay} />;
  } else if (overlay?.kind === 'workout') {
    content = <WorkoutPage controller={controller} onBack={closeOverlay} />;
  } else if (overlay?.kind === 'ota') {
    content = <OtaPage controller={controller} onBack={closeOverlay} />;
  } else if (overlay?.kind === 'history') {
    content = (
      <HealthHistoryPage controller={controller} definition={overlay.definition} onBack={closeOverlay} />
    );
  } else if (tab === 'device') {
    content = (
      <DevicePage controller={controller} onOpenOta={openOta} onOpenScan={() => void openScan()} />
    );
  } else {
    content = (
      <HomePage
        controller={controller}
        onOpenDevice={() => setTab('device')}
        onOpenHistory={openHistory}
        onOpenScan={() => void openScan()}
        onOpenWorkout={openWorkout}
      />
    );
  }

  return (
    <>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
        {overlay ? null : (
          <View style={styles.appBar}>
            <Text style={styles.appBarTitle}>{tr('RW 健康', 'RW Health')}</Text>
            <LanguageToggle
              language={language}
              onToggle={onToggleLanguage}
            />
          </View>
        )}
        {content}
      </SafeAreaView>
      {overlay ? null : (
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.tabBar}>
          <TabButton
            active={tab === 'home'}
            icon="home"
            label={tr('首页', 'Home')}
            onPress={() => setTab('home')}
          />
          <TabButton
            active={tab === 'device'}
            icon="device"
            label={tr('设备', 'Device')}
            onPress={() => setTab('device')}
          />
        </SafeAreaView>
      )}
    </>
  );
}

function TabButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: Tab;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      onPress={onPress}
      style={styles.tabButton}>
      <TabIcon active={active} kind={icon} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function TabIcon({active, kind}: {active: boolean; kind: Tab}) {
  const color = active ? colors.primary : colors.secondaryText;
  if (kind === 'home') {
    return (
      <View style={styles.tabIcon}>
        <View style={[styles.homeRoof, {borderColor: color}]} />
        <View
          style={[
            styles.homeBody,
            {borderColor: color},
            active && styles.tabIconSelected,
          ]}
        />
      </View>
    );
  }
  return (
    <View style={styles.tabIcon}>
      <View style={[styles.watchBand, {backgroundColor: color}]} />
      <View
        style={[
          styles.watchFace,
          {borderColor: color},
          active && styles.tabIconSelected,
        ]}
      />
    </View>
  );
}

function LanguageToggle({
  language,
  onToggle,
}: {
  language: Language;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={language === 'zh' ? 'Switch to English' : '切换到中文'}
      accessibilityRole="button"
      onPress={onToggle}
      style={styles.languageToggle}>
      <Text style={styles.languageToggleText}>{language === 'zh' ? 'EN' : '中文'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  permissionPage: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {maxWidth: 360, alignItems: 'center'},
  permissionTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  permissionMessage: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  permissionAction: {marginTop: 18, minWidth: 220},
  safeArea: {flex: 1, backgroundColor: colors.background},
  appBar: {
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appBarTitle: {flex: 1, fontSize: 20, fontWeight: '700', color: colors.text},
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {width: 24, height: 22, marginBottom: 3},
  homeRoof: {
    position: 'absolute',
    top: 2,
    left: 6,
    width: 13,
    height: 13,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderRadius: 2,
    transform: [{rotate: '45deg'}],
  },
  homeBody: {
    position: 'absolute',
    left: 5,
    bottom: 1,
    width: 15,
    height: 12,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  watchBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 9,
    width: 6,
    borderRadius: 2,
  },
  watchFace: {
    position: 'absolute',
    top: 4,
    left: 3,
    width: 18,
    height: 14,
    borderWidth: 2,
    borderRadius: 5,
    backgroundColor: colors.surface,
  },
  tabIconSelected: {backgroundColor: colors.primarySoft},
  tabLabel: {fontSize: 13, fontWeight: '600', color: colors.secondaryText},
  tabLabelActive: {color: colors.primary},
  languageToggle: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageToggleText: {fontSize: 14, fontWeight: '700', color: colors.primary},
});

export default App;
