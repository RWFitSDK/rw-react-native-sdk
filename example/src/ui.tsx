import React, {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {RwfitError} from 'react-native-rwfit-ble';
import {useI18n} from './i18n';

export const colors = {
  background: '#f5f7fb',
  surface: '#ffffff',
  primary: '#365cf5',
  primarySoft: '#e9edff',
  text: '#172033',
  muted: '#68738b',
  border: '#e2e6ef',
  success: '#1e7a45',
  successSoft: '#eaf7ef',
  warning: '#9a5b00',
  warningSoft: '#fff4df',
  danger: '#bc2f3a',
  disabled: '#a8afbd',
};

export function errorMessage(error: unknown): string {
  return error instanceof RwfitError
    ? `[${error.code}] ${error.message}`
    : error instanceof Error
      ? error.message
      : String(error);
}

export function formatResult(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function useResultLog() {
  const [results, setResults] = useState<string[]>([]);
  const log = useCallback((message: string) => {
    setResults(current => [message, ...current].slice(0, 100));
  }, []);
  const run = useCallback(
    async (label: string, action: () => Promise<unknown>) => {
      try {
        const result = await action();
        log(`${label} ✓ ${formatResult(result)}`.trim());
        return result;
      } catch (error) {
        log(`${label} ✗ ${errorMessage(error)}`);
        return undefined;
      }
    },
    [log],
  );
  return {results, log, run};
}

export function Page({
  title,
  onBack,
  children,
}: PropsWithChildren<{title: string; onBack: () => void}>) {
  const {tr} = useI18n();

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack]);

  return (
    <View style={styles.page}>
      <View style={styles.appBar}>
        <Pressable
          accessibilityLabel={tr('返回', 'Back')}
          accessibilityRole="button"
          onPress={onBack}
          style={({pressed}) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.appBarTitle}>
          {title}
        </Text>
        <View style={styles.back} />
      </View>
      {children}
    </View>
  );
}

export function ScreenScroll({children}: PropsWithChildren) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Section({
  title,
  children,
}: PropsWithChildren<{title?: string}>) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  enabled = true,
  primary = false,
  danger = false,
  style,
}: {
  label: string;
  onPress: () => void;
  enabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const {tr} = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!enabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.action,
        primary && styles.actionPrimary,
        danger && styles.actionDanger,
        !enabled && styles.actionDisabled,
        pressed && styles.pressed,
        style,
      ]}>
      <Text
        style={[
          styles.actionText,
          (primary || danger) && styles.actionTextPrimary,
          !enabled && styles.actionTextDisabled,
        ]}>
        {enabled ? label : `${label} (${tr('不支持', 'Unsupported')})`}
      </Text>
    </Pressable>
  );
}

export function ButtonWrap({children}: PropsWithChildren) {
  return <View style={styles.buttonWrap}>{children}</View>;
}

export function ResultList({results}: {results: string[]}) {
  const {tr} = useI18n();
  if (results.length === 0) {
    return (
      <Text style={styles.emptyResult}>
        {tr('操作结果将在这里显示', 'Results will appear here')}
      </Text>
    );
  }
  return (
    <View style={styles.results}>
      {results.map((result, index) => (
        <View key={`${index}-${result}`} style={styles.resultRow}>
          <Text selectable style={styles.resultText}>
            {result}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function FeatureTile({
  title,
  subtitle,
  icon,
  enabled = true,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  enabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!enabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.tile,
        !enabled && styles.tileDisabled,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.tileIcon, !enabled && styles.tileIconDisabled]}>
        <Text style={styles.tileIconText}>{icon}</Text>
      </View>
      <View style={styles.tileBody}>
        <Text style={[styles.tileTitle, !enabled && styles.muted]}>{title}</Text>
        <Text style={styles.tileSubtitle}>{subtitle}</Text>
      </View>
      <Text style={[styles.chevron, !enabled && styles.muted]}>›</Text>
    </Pressable>
  );
}

export const uiStyles = StyleSheet.create({
  flex: {flex: 1},
  row: {flexDirection: 'row', alignItems: 'center'},
  grow: {flex: 1},
  label: {fontSize: 14, fontWeight: '600', color: colors.text},
  body: {fontSize: 14, lineHeight: 21, color: colors.muted},
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    color: colors.text,
  },
});

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: colors.background},
  appBar: {
    height: 58,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  appBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  back: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  backText: {fontSize: 38, lineHeight: 40, color: colors.primary},
  screenContent: {padding: 12, paddingBottom: 40},
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  action: {
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#d9dfff',
  },
  actionPrimary: {backgroundColor: colors.primary, borderColor: colors.primary},
  actionDanger: {backgroundColor: colors.danger, borderColor: colors.danger},
  actionDisabled: {backgroundColor: '#f0f1f4', borderColor: '#e7e8ec'},
  actionText: {fontSize: 13, fontWeight: '600', color: colors.primary},
  actionTextPrimary: {color: '#fff'},
  actionTextDisabled: {color: colors.disabled},
  buttonWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  pressed: {opacity: 0.72},
  emptyResult: {color: colors.muted, textAlign: 'center', paddingVertical: 28},
  results: {gap: 1},
  resultRow: {
    backgroundColor: colors.surface,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultText: {fontSize: 13, lineHeight: 19, color: colors.text},
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    minHeight: 78,
    paddingHorizontal: 16,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tileDisabled: {backgroundColor: '#f7f8fa'},
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tileIconDisabled: {backgroundColor: '#ebecef'},
  tileIconText: {fontSize: 19},
  tileBody: {flex: 1, paddingVertical: 10},
  tileTitle: {fontSize: 16, fontWeight: '600', color: colors.text},
  tileSubtitle: {fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 3},
  chevron: {fontSize: 28, color: '#778197', marginLeft: 8},
  muted: {color: colors.disabled},
});
