import React, {type PropsWithChildren, type ReactNode, useEffect} from 'react';
import {BackHandler, Pressable, StyleSheet, Text, View} from 'react-native';
import {RwfitError} from 'react-native-rwfit-ble';

/** 对齐 Flutter demo 的 demo_theme.dart 配色。 */
export const colors = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  primary: '#0C9B6C',
  primarySoft: '#E4F4ED',
  text: '#18221E',
  secondaryText: '#8A948F',
  /** @deprecated 别名，等同 secondaryText；仅供未整改的旧页面使用。 */
  muted: '#8A948F',
  border: '#EDF0EE',
  danger: '#D84B4B',
  dangerSoft: '#FFEEEE',
  /** @deprecated 仅供未整改的旧页面使用。 */
  warning: '#9A5B00',
  /** @deprecated 仅供未整改的旧页面使用。 */
  warningSoft: '#FFF4DF',
};

export function errorMessage(error: unknown): string {
  return error instanceof RwfitError
    ? `[${error.code}] ${error.message}`
    : error instanceof Error
      ? error.message
      : String(error);
}

/** 卡片容器：白色背景、圆角、无阴影，用于承载设备卡片/网格项/列表分组。 */
export function Card({
  children,
  style,
}: PropsWithChildren<{style?: object}>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** 章节标题：标题 + 可选说明文字/尾部控件。 */
export function SectionHeading({
  title,
  caption,
  trailing,
}: {
  title: string;
  caption?: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? (
        <Text numberOfLines={1} style={styles.sectionCaption}>
          {caption}
        </Text>
      ) : (
        <View style={styles.flexSpacer} />
      )}
      {trailing}
    </View>
  );
}

/** 空状态卡片：标题 + 说明 + 可选操作按钮。 */
export function EmptyCard({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </Card>
  );
}

export function PrimaryButton({
  label,
  onPress,
  enabled = true,
}: {
  label: string;
  onPress: () => void;
  enabled?: boolean;
}) {
  return (
    <ActionButtonBase enabled={enabled} onPress={onPress} variant="primary">
      {label}
    </ActionButtonBase>
  );
}

export function OutlineButton({
  label,
  onPress,
  enabled = true,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  enabled?: boolean;
  danger?: boolean;
}) {
  return (
    <ActionButtonBase
      enabled={enabled}
      onPress={onPress}
      variant={danger ? 'dangerOutline' : 'outline'}>
      {label}
    </ActionButtonBase>
  );
}

function ActionButtonBase({
  children,
  onPress,
  enabled,
  variant,
}: PropsWithChildren<{
  onPress: () => void;
  enabled: boolean;
  variant: 'primary' | 'outline' | 'dangerOutline';
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!enabled}
      onPress={onPress}
      style={({pressed}: {pressed: boolean}) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'outline' && styles.buttonOutline,
        variant === 'dangerOutline' && styles.buttonDangerOutline,
        !enabled && styles.buttonDisabled,
        pressed && enabled && styles.pressed,
      ]}>
      <Text
        style={[
          styles.buttonText,
          variant === 'primary' && styles.buttonTextPrimary,
          variant === 'dangerOutline' && styles.buttonTextDanger,
          !enabled && styles.buttonTextDisabled,
        ]}>
        {children}
      </Text>
    </Pressable>
  );
}

/** 设备卡片：戒指图标 + 名称 + 连接状态点 + 电量，可点击进入设备页。 */
export function DeviceCard({
  name,
  connectionState,
  ready,
  powerLevel,
  onPress,
}: {
  name: string;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed' | 'idle';
  ready: boolean;
  powerLevel?: number;
  onPress?: () => void;
}) {
  const connected = ready && connectionState === 'connected';
  const stateLabel = ((): string => {
    switch (connectionState) {
      case 'connecting':
        return 'Connecting';
      case 'failed':
        return 'Connection failed';
      case 'connected':
        return ready ? 'Connected' : 'Disconnected';
      default:
        return 'Disconnected';
    }
  })();
  const content = (
    <Card>
      <View style={styles.deviceRow}>
        <View style={styles.deviceIcon}>
          <View style={styles.deviceIconInner} />
        </View>
        <View style={styles.deviceBody}>
          <Text numberOfLines={1} style={styles.deviceName}>
            {name || 'RW Smart Ring'}
          </Text>
          <View style={styles.deviceMetaRow}>
            <View
              style={[
                styles.deviceDot,
                {backgroundColor: connected ? colors.primary : colors.secondaryText},
              ]}
            />
            <Text style={styles.deviceMetaText}>{stateLabel}</Text>
            {powerLevel != null ? (
              <Text style={styles.deviceMetaText}>  {powerLevel}%</Text>
            ) : null}
          </View>
        </View>
        {onPress ? <Text style={styles.chevron}>{'\u203a'}</Text> : null}
      </View>
    </Card>
  );
  if (!onPress) {
    return content;
  }
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  );
}

/** 带返回箭头的页面标题栏；同时处理 Android 硬件返回键，供二级页面统一使用。 */
export function PageHeader({title, onBack}: {title: string; onBack: () => void}) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  return (
    <View style={styles.pageHeader}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={styles.pageHeaderBack}>
        <Text style={styles.pageHeaderBackText}>{'\u2039'}</Text>
      </Pressable>
      <Text numberOfLines={1} style={styles.pageHeaderTitle}>
        {title}
      </Text>
      <View style={styles.pageHeaderBack} />
    </View>
  );
}

/** 简单页面容器：返回箭头 + 标题，供未整改的旧页面（如 WorkoutPage）复用。 */
export function Page({
  title,
  onBack,
  children,
}: PropsWithChildren<{title: string; onBack: () => void}>) {
  return (
    <View style={styles.legacyPage}>
      <PageHeader onBack={onBack} title={title} />
      {children}
    </View>
  );
}

export function ButtonWrap({children}: PropsWithChildren) {
  return <View style={styles.buttonWrap}>{children}</View>;
}

/** 兼容旧签名的操作按钮（primary/danger 变体），供未整改的旧页面复用。 */
export function ActionButton({
  label,
  onPress,
  enabled = true,
  primary = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  enabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <ActionButtonBase
      enabled={enabled}
      onPress={onPress}
      variant={danger ? 'dangerOutline' : primary ? 'primary' : 'outline'}>
      {label}
    </ActionButtonBase>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 26,
    paddingBottom: 12,
  },
  sectionTitle: {fontSize: 17, fontWeight: '700', color: colors.text},
  sectionCaption: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'right',
  },
  flexSpacer: {flex: 1},
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 42,
    paddingHorizontal: 24,
  },
  emptyTitle: {fontSize: 15, fontWeight: '700', color: colors.text},
  emptyMessage: {
    marginTop: 8,
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyAction: {marginTop: 20},
  button: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  buttonPrimary: {backgroundColor: colors.primary},
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonDangerOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#55D84B4B',
  },
  buttonDisabled: {backgroundColor: '#F0F1F4', borderColor: '#E7E8EC'},
  buttonText: {fontSize: 14, fontWeight: '700', color: colors.primary},
  buttonTextPrimary: {color: '#FFFFFF'},
  buttonTextDanger: {color: colors.danger},
  buttonTextDisabled: {color: '#A8AFBD'},
  pressed: {opacity: 0.72},
  deviceRow: {flexDirection: 'row', alignItems: 'center'},
  deviceIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deviceIconInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 7,
    borderColor: colors.primary,
  },
  deviceBody: {flex: 1},
  deviceName: {fontSize: 16, fontWeight: '700', color: colors.text},
  deviceMetaRow: {flexDirection: 'row', alignItems: 'center', marginTop: 5},
  deviceDot: {width: 7, height: 7, borderRadius: 3.5, marginRight: 6},
  deviceMetaText: {fontSize: 13, color: colors.secondaryText},
  chevron: {fontSize: 22, color: colors.secondaryText, marginLeft: 8},
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  pageHeaderBack: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  pageHeaderBackText: {fontSize: 30, color: colors.primary},
  pageHeaderTitle: {flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text},
  legacyPage: {flex: 1, backgroundColor: colors.background},
  buttonWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
});
