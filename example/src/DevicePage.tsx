/* eslint-disable no-void */
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DeviceSettingsList } from './DeviceSettingsList';
import { useI18n } from './i18n';
import type { DemoController } from './useDemoController';
import {
  Card,
  colors,
  DeviceCard,
  EmptyCard,
  errorMessage,
  OutlineButton,
  PrimaryButton,
  SectionHeading,
} from './ui';

interface Props {
  controller: DemoController;
  onOpenOta: () => void;
  onOpenScan: () => void;
}

/** 设备卡片 + 连接操作 + 设备信息 + 按能力表渲染的设置列表。 */
export function DevicePage({ controller, onOpenOta, onOpenScan }: Props) {
  const { tr } = useI18n();
  const device = controller.device;

  const run = useCallback(
    async (action: () => Promise<void>, successMessage?: string) => {
      try {
        await action();
        if (successMessage) {
          Alert.alert(tr('提示', 'Notice'), successMessage);
        }
      } catch (error) {
        Alert.alert(tr('操作失败', 'Action failed'), errorMessage(error));
      }
    },
    [tr],
  );

  const confirmUnbind = useCallback(() => {
    Alert.alert(
      tr('解除绑定', 'Unbind device'),
      tr(
        '解除后将同时清除 Demo 当前显示的健康记录。',
        'This also clears health records currently shown by the Demo.',
      ),
      [
        { text: tr('取消', 'Cancel'), style: 'cancel' },
        {
          text: tr('解除', 'Unbind'),
          style: 'destructive',
          onPress: () =>
            void run(async () => {
              await controller.unbind();
              if (Platform.OS === 'ios') {
                Alert.alert(
                  tr('请解除系统配对', 'Remove system pairing'),
                  tr(
                    '请前往 iPhone“设置 → 蓝牙”，找到该设备并选择“忽略此设备”。',
                    'Open iPhone Settings → Bluetooth, find the ring, and choose Forget This Device.',
                  ),
                );
              } else {
                Alert.alert(
                  tr('提示', 'Notice'),
                  tr('已解除绑定', 'Device unbound'),
                );
              }
            }),
        },
      ],
    );
  }, [controller, run, tr]);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>{tr('我的设备', 'My device')}</Text>
      <Text style={styles.pageSubtitle}>
        {tr(
          '管理连接、设备信息与支持功能',
          'Manage connection, device information, and features',
        )}
      </Text>

      {!device ? (
        <UnboundCard onPress={onOpenScan} />
      ) : (
        <>
          <DeviceCard
            connectionState={controller.connectionState}
            name={device.name}
            powerLevel={controller.powerLevel}
            ready={controller.ready}
          />

          <View style={styles.actionsRow}>
            {controller.connected ? (
              <OutlineButton
                label={tr('断开连接', 'Disconnect')}
                onPress={() =>
                  void run(
                    () => controller.disconnect(),
                    tr('已断开连接', 'Disconnected'),
                  )
                }
              />
            ) : (
              <PrimaryButton
                enabled={controller.connectionState !== 'connecting'}
                label={
                  controller.connectionState === 'connecting'
                    ? tr('连接中', 'Connecting')
                    : tr('重新连接', 'Reconnect')
                }
                onPress={() =>
                  void run(
                    () => controller.reconnect(),
                    tr('连接成功', 'Connected'),
                  )
                }
              />
            )}
            <OutlineButton
              danger
              label={tr('解除绑定', 'Unbind')}
              onPress={confirmUnbind}
            />
          </View>

          <SectionHeading title={tr('设备信息', 'Device information')} />
          <Card>
            <InfoRow
              onPress={
                controller.connected
                  ? () => void run(() => controller.refreshDeviceInfo())
                  : undefined
              }
              subtitle={tr('点击刷新设备信息', 'Tap to refresh')}
              title={tr('设备电量', 'Battery')}
              value={
                controller.powerLevel == null
                  ? '--'
                  : `${controller.powerLevel}%`
              }
            />
            <Divider />
            <InfoRow
              title={tr('设备型号', 'Device model')}
              value={controller.firmware?.deviceClazz || '--'}
            />
            <Divider />
            <InfoRow
              title={tr('固件版本', 'Firmware version')}
              value={controller.firmware?.deviceNo || '--'}
            />
            <Divider />
            <InfoRow
              title={tr('SDK 版本', 'SDK version')}
              value={controller.sdkVersion || '--'}
            />
            <Divider />
            <InfoRow
              title={tr('插件版本', 'Plugin version')}
              value={controller.pluginVersion || '--'}
            />
            <Divider />
            <InfoRow
              onPress={controller.connected ? onOpenOta : undefined}
              subtitle={tr(
                '由客户提供固件本地路径',
                'Provide a local firmware path in your integration',
              )}
              title={tr('固件升级', 'Firmware upgrade')}
              value={
                controller.connected
                  ? tr('可操作', 'Available')
                  : tr('需连接', 'Connect first')
              }
            />
          </Card>

          <SectionHeading
            caption={tr('按功能表显示', 'Based on capability table')}
            title={tr('设备功能', 'Device features')}
          />
          <DeviceSettingsList controller={controller} />
        </>
      )}

      {!device ? (
        <EmptyCard
          action={
            <PrimaryButton
              label={tr('搜索设备', 'Search devices')}
              onPress={onOpenScan}
            />
          }
          message={tr(
            '绑定后这里会根据功能配置表展示设备支持的全部设置。',
            'Supported settings appear here after a ring is connected.',
          )}
          title={tr('还没有绑定戒指', 'No ring is bound')}
        />
      ) : null}
      </ScrollView>
      <ReconnectModal
        visible={controller.connectionState === 'connecting'}
      />
    </>
  );
}

function ReconnectModal({visible}: {visible: boolean}) {
  const {tr} = useI18n();
  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      transparent
      visible={visible}>
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingTitle}>
            {tr('正在重新连接', 'Reconnecting')}
          </Text>
          <Text style={styles.loadingMessage}>
            {tr(
              '正在等待设备返回连接结果…',
              'Waiting for the device connection result…',
            )}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function UnboundCard({ onPress }: { onPress: () => void }) {
  const { tr } = useI18n();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card>
        <View style={styles.unboundRow}>
          <View style={styles.unboundIcon}>
            <Text style={styles.unboundIconText}>+</Text>
          </View>
          <View style={styles.unboundBody}>
            <Text style={styles.unboundTitle}>
              {tr('未绑定设备', 'No bound device')}
            </Text>
            <Text style={styles.unboundSubtitle}>
              {tr('点击搜索并连接智能戒指', 'Search for and connect a ring')}
            </Text>
          </View>
          <Text style={styles.chevron}>{'\u203a'}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function InfoRow({
  title,
  subtitle,
  value,
  onPress,
}: {
  title: string;
  subtitle?: string;
  value: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.infoRow}>
      <View style={styles.infoRowBody}>
        <Text style={styles.infoRowTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.infoRowSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.infoRowValue}>
        {value}
      </Text>
      {onPress ? <Text style={styles.chevron}>{'\u203a'}</Text> : null}
    </View>
  );
  if (!onPress) {
    return body;
  }
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {body}
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36, gap: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  pageSubtitle: {
    marginTop: 5,
    marginBottom: 8,
    fontSize: 13,
    color: colors.secondaryText,
  },
  actionsRow: { flexDirection: 'row', gap: 10 },
  unboundRow: { flexDirection: 'row', alignItems: 'center' },
  unboundIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  unboundIconText: { fontSize: 22, color: colors.primary },
  unboundBody: { flex: 1 },
  unboundTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  unboundSubtitle: { marginTop: 5, fontSize: 13, color: colors.secondaryText },
  chevron: { fontSize: 20, color: colors.secondaryText, marginLeft: 6 },
  infoRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoRowBody: { flex: 1 },
  infoRowTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  infoRowSubtitle: { marginTop: 3, fontSize: 12, color: colors.secondaryText },
  infoRowValue: { maxWidth: 130, fontSize: 13, color: colors.secondaryText },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#00000055',
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    padding: 24,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  loadingMessage: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondaryText,
    textAlign: 'center',
  },
});
