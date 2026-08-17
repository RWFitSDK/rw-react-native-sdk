/* eslint-disable no-void */
import React, {useCallback} from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {healthDefinitions, HealthTypeId, type HealthDefinition} from './healthMetadata';
import {valueText} from './healthStore';
import {useI18n} from './i18n';
import type {DemoController} from './useDemoController';
import {Card, colors, DeviceCard, EmptyCard, PrimaryButton, SectionHeading} from './ui';

interface Props {
  controller: DemoController;
  onOpenDevice: () => void;
  onOpenHistory: (definition: HealthDefinition) => void;
  onOpenScan: () => void;
  onOpenWorkout: () => void;
}

export function HomePage({
  controller,
  onOpenDevice,
  onOpenHistory,
  onOpenScan,
  onOpenWorkout,
}: Props) {
  const {tr} = useI18n();
  const supported = healthDefinitions.filter(definition =>
    controller.capabilities.has(definition.capabilityKey),
  );

  const sync = useCallback(async () => {
    if (!controller.device) {
      Alert.alert(tr('提示', 'Notice'), tr('请先绑定设备', 'Bind a device first'));
      return;
    }
    if (controller.syncing) {
      return;
    }
    try {
      await controller.syncAllHealthData();
    } catch (error) {
      Alert.alert(tr('同步失败', 'Sync failed'), String(error));
    }
  }, [controller, tr]);

  const syncCaption = ((): string | undefined => {
    if (!controller.device) {
      return undefined;
    }
    if (controller.syncing) {
      const percent = Math.round(controller.syncProgress * 100);
      return tr(`正在同步 ${percent}%`, `Syncing ${percent}%`);
    }
    if (!controller.lastSyncAt) {
      return tr('下拉同步全部健康数据', 'Pull to sync all data');
    }
    const date = new Date(controller.lastSyncAt);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return tr(`上次同步 ${hh}:${mm}`, `Last sync ${hh}:${mm}`);
  })();

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl onRefresh={() => void sync()} refreshing={controller.syncing} />
      }>
      {controller.device ? (
        <DeviceCard
          connectionState={controller.connectionState}
          name={controller.device.name}
          onPress={onOpenDevice}
          powerLevel={controller.powerLevel}
          ready={controller.ready}
        />
      ) : (
        <UnboundCard onPress={onOpenScan} />
      )}

      <SectionHeading caption={syncCaption} title={tr('健康数据', 'Health data')} />

      {controller.syncing ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {width: `${Math.min(100, Math.max(0, controller.syncProgress * 100))}%`},
            ]}
          />
        </View>
      ) : null}

      {supported.length === 0 ? (
        <EmptyCard
          action={
            !controller.device ? (
              <PrimaryButton label={tr('添加设备', 'Add device')} onPress={onOpenScan} />
            ) : undefined
          }
          message={
            controller.device
              ? tr(
                  '请先在设备页重新连接，获取设备功能配置表。',
                  'Reconnect on the Device tab to refresh capabilities.',
                )
              : tr(
                  '首页会根据设备功能表展示计步、心率、睡眠、多运动等支持项目。',
                  'Supported health metrics appear here based on the device capability table.',
                )
          }
          title={
            controller.device
              ? tr('暂未获得健康能力', 'No health capabilities yet')
              : tr('绑定后显示健康数据', 'Bind a ring to see health data')
          }
        />
      ) : (
        <HealthGrid
          controller={controller}
          definitions={supported}
          onOpenHistory={onOpenHistory}
          onOpenWorkout={onOpenWorkout}
        />
      )}
    </ScrollView>
  );
}

function UnboundCard({onPress}: {onPress: () => void}) {
  const {tr} = useI18n();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card>
        <View style={styles.unboundRow}>
          <View style={styles.unboundIcon}>
            <Text style={styles.unboundIconText}>+</Text>
          </View>
          <View style={styles.unboundBody}>
            <Text style={styles.unboundTitle}>{tr('未绑定设备', 'No bound device')}</Text>
            <Text style={styles.unboundSubtitle}>
              {tr('点击搜索并连接 RW 智能戒指', 'Search for and connect an RW smart ring')}
            </Text>
          </View>
          <Text style={styles.chevron}>{'\u203a'}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function HealthGrid({
  controller,
  definitions,
  onOpenHistory,
  onOpenWorkout,
}: {
  controller: DemoController;
  definitions: HealthDefinition[];
  onOpenHistory: (definition: HealthDefinition) => void;
  onOpenWorkout: () => void;
}) {
  const {tr, language} = useI18n();
  return (
    <View style={styles.grid}>
      {definitions.map(definition => {
        const isWorkout = definition.type === HealthTypeId.workout;
        const record = controller.latestFor(definition.type);
        return (
          <Pressable
            accessibilityRole="button"
            key={definition.type}
            onPress={
              isWorkout
                ? () => {
                    if (!controller.connected) {
                      Alert.alert(
                        tr('提示', 'Notice'),
                        tr('请先连接设备', 'Connect the device first'),
                      );
                      return;
                    }
                    onOpenWorkout();
                  }
                : () => onOpenHistory(definition)
            }
            style={styles.gridItem}>
            <Card style={styles.gridCard}>
              <View style={styles.gridTopRow}>
                <Text numberOfLines={1} style={styles.gridLabel}>
                  {tr(definition.titleZh, definition.titleEn)}
                </Text>
                <View style={styles.flexSpacer} />
                <Text style={styles.chevron}>{'\u203a'}</Text>
              </View>
              <Text numberOfLines={1} style={styles.gridValue}>
                {isWorkout
                  ? tr('选择运动', 'Choose workout')
                  : record
                    ? valueText(language, record)
                    : tr('暂无数据', 'No data')}
              </Text>
              <Text numberOfLines={1} style={styles.gridTime}>
                {isWorkout
                  ? tr('点击进入运动页面', 'Open workout page')
                  : record
                    ? relativeTime(record.measuredAtSec, tr)
                    : tr('点击查看历史', 'View history')}
              </Text>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

function relativeTime(
  timestampSec: number,
  tr: (zh: string, en: string) => string,
): string {
  if (timestampSec <= 0) {
    return tr('点击查看历史', 'View history');
  }
  const diffMs = Date.now() - timestampSec * 1000;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return tr('刚刚', 'Just now');
  }
  if (minutes < 60) {
    return tr(`${minutes} 分钟前`, `${minutes} min ago`);
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return tr(`${hours} 小时前`, `${hours} hr ago`);
  }
  const date = new Date(timestampSec * 1000);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

const styles = StyleSheet.create({
  page: {flex: 1},
  content: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 12},
  unboundRow: {flexDirection: 'row', alignItems: 'center'},
  unboundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  unboundIconText: {fontSize: 22, color: colors.primary},
  unboundBody: {flex: 1},
  unboundTitle: {fontSize: 15, fontWeight: '700', color: colors.text},
  unboundSubtitle: {marginTop: 5, fontSize: 13, color: colors.secondaryText},
  chevron: {fontSize: 20, color: colors.secondaryText},
  progressTrack: {height: 5, borderRadius: 99, backgroundColor: colors.border, overflow: 'hidden'},
  progressFill: {height: 5, backgroundColor: colors.primary},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  gridItem: {width: '47%'},
  gridCard: {padding: 14},
  gridTopRow: {flexDirection: 'row', alignItems: 'center'},
  flexSpacer: {flex: 1},
  gridLabel: {fontSize: 13, color: colors.secondaryText},
  gridValue: {marginTop: 8, fontSize: 18, fontWeight: '700', color: colors.text},
  gridTime: {marginTop: 7, fontSize: 12, color: colors.secondaryText},
});
