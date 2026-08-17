/* eslint-disable no-void */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RwfitBle } from 'react-native-rwfit-ble';
import { HealthTypeId, type HealthDefinition } from './healthMetadata';
import {
  sleepSegmentLabel,
  sleepSegments,
  summaryText,
  valueText,
} from './healthStore';
import { useI18n } from './i18n';
import type { DemoController } from './useDemoController';
import {
  Card,
  colors,
  EmptyCard,
  PageHeader,
  PrimaryButton,
  SectionHeading,
} from './ui';

interface Props {
  controller: DemoController;
  definition: HealthDefinition;
  onBack: () => void;
}

/** 每个健康类型的详情页：顶部最新值、实时检测入口（按 realtimeMetric 控制显隐）、历史时间线。 */
export function HealthHistoryPage({ controller, definition, onBack }: Props) {
  const { tr, language } = useI18n();
  const [measuring, setMeasuring] = useState(false);
  const [busy, setBusy] = useState(false);
  const measuringRef = useRef(measuring);
  measuringRef.current = measuring;

  useEffect(() => {
    const sub = RwfitBle.onRealtimeMeasureComplete(() => setMeasuring(false));
    return () => {
      sub.remove();
      if (measuringRef.current && definition.realtimeMetric) {
        void RwfitBle.stopRealtimeMeasure(definition.realtimeMetric).catch(
          () => undefined,
        );
      }
    };
  }, [definition.realtimeMetric]);

  const toggleMeasurement = useCallback(async () => {
    const metric = definition.realtimeMetric;
    if (!metric || busy) {
      return;
    }
    setBusy(true);
    try {
      if (measuring) {
        await RwfitBle.stopRealtimeMeasure(metric);
      } else {
        await RwfitBle.startRealtimeMeasure(metric);
      }
      setMeasuring(current => !current);
    } catch (error) {
      Alert.alert(tr('提示', 'Notice'), String(error));
    } finally {
      setBusy(false);
    }
  }, [busy, definition.realtimeMetric, measuring, tr]);

  const records = controller.recordsFor(definition.type);
  const latest = controller.latestFor(definition.type);
  const title = tr(definition.titleZh, definition.titleEn);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PageHeader onBack={onBack} title={title} />

      <View style={[styles.hero, { backgroundColor: definition.color }]}>
        <Text style={styles.heroLabel}>
          {tr(`最近一次${title}`, `Latest ${title}`)}
        </Text>
        <Text style={styles.heroValue}>
          {latest ? valueText(language, latest) : '--'}
        </Text>
        <Text style={styles.heroTime}>
          {latest
            ? formatDateTime(latest.measuredAtSec, tr)
            : tr('暂无数据', 'No data')}
        </Text>
      </View>

      {definition.realtimeMetric ? (
        <>
          <SectionHeading title={tr('实时检测', 'Real-time measurement')} />
          <Card>
            <View style={styles.measureRow}>
              <View style={styles.measureBody}>
                <Text style={styles.measureTitle}>
                  {tr(`${title}实时检测`, `Live ${title}`)}
                </Text>
                <Text style={styles.measureSubtitle}>
                  {measuring
                    ? tr(
                        '检测中，最新结果会显示在上方',
                        'Measuring; the latest result appears above',
                      )
                    : tr(
                        '由设备开始单次实时测量',
                        'Start a one-time measurement on the device',
                      )}
                </Text>
              </View>
              <View style={[styles.chip, measuring && styles.chipActive]}>
                <Text
                  style={[styles.chipText, measuring && styles.chipTextActive]}
                >
                  {measuring ? tr('检测中', 'Measuring') : tr('未开始', 'Idle')}
                </Text>
              </View>
            </View>
            <View style={styles.measureAction}>
              <PrimaryButton
                enabled={controller.connected && !busy}
                label={
                  measuring
                    ? tr('结束检测', 'Stop measurement')
                    : tr('开始检测', 'Start measurement')
                }
                onPress={() => void toggleMeasurement()}
              />
            </View>
          </Card>
        </>
      ) : null}

      <SectionHeading
        caption={tr(`本地 ${records.length} 条`, `${records.length} local`)}
        title={tr('历史记录', 'History')}
      />

      {records.length === 0 ? (
        <EmptyCard
          message={tr(
            '请回到首页下拉同步，设备中的历史数据会显示在这里。',
            'Pull down on Home to sync history from the device.',
          )}
          title={tr(`暂无${title}记录`, `No ${title} history`)}
        />
      ) : (
        <Card style={styles.historyCard}>
          {records.map((record, index) => {
            const summary = summaryText(language, record);
            const segments =
              definition.type === HealthTypeId.sleep ? sleepSegments(record) : [];
            return (
              <View key={`${record.measuredAtSec}-${index}`}>
                <View style={styles.historyRow}>
                  <View
                    style={[
                      styles.historyDot,
                      { backgroundColor: definition.color },
                    ]}
                  />
                  <View style={styles.historyBody}>
                    <Text style={styles.historyValue}>
                      {valueText(language, record)}
                    </Text>
                    {summary ? (
                      <Text style={styles.historySummary}>{summary}</Text>
                    ) : null}
                    {segments.map((segment, segmentIndex) => (
                      <Text key={segmentIndex} style={styles.sleepSegment}>
                        {sleepSegmentLabel(language, segment.type)} ·{' '}
                        {tr(
                          `${segment.minutes} 分钟`,
                          `${segment.minutes} min`,
                        )}
                      </Text>
                    ))}
                  </View>
                  <Text style={styles.historyTime}>
                    {formatDateTime(record.measuredAtSec, tr)}
                  </Text>
                </View>
                {index !== records.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </View>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}

function formatDateTime(
  timestampSec: number,
  tr: (zh: string, en: string) => string,
): string {
  if (timestampSec <= 0) {
    return '--';
  }
  const date = new Date(timestampSec * 1000);
  const now = new Date();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return `${tr('今天', 'Today')} ${hh}:${mm}`;
  }
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mo}/${dd} ${hh}:${mm}`;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  hero: { borderRadius: 22, padding: 24 },
  heroLabel: { color: '#ffffffb3', fontSize: 13 },
  heroValue: { marginTop: 12, color: '#fff', fontSize: 32, fontWeight: '700' },
  heroTime: { marginTop: 6, color: '#ffffffb3', fontSize: 13 },
  measureRow: { flexDirection: 'row', alignItems: 'center' },
  measureBody: { flex: 1 },
  measureTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  measureSubtitle: { marginTop: 5, fontSize: 13, color: colors.secondaryText },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.secondaryText },
  chipTextActive: { color: colors.primary },
  measureAction: { marginTop: 14 },
  historyCard: { padding: 0, overflow: 'hidden' },
  historyRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginRight: 14 },
  historyBody: { flex: 1 },
  historyValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  historySummary: { marginTop: 3, fontSize: 12, color: colors.secondaryText },
  sleepSegment: { marginTop: 3, fontSize: 12, color: colors.secondaryText },
  historyTime: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 56,
  },
});
