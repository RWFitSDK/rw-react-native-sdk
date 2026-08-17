/* eslint-disable no-void */
import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {RwfitBle} from 'react-native-rwfit-ble';
import {useI18n} from './i18n';
import type {DemoController} from './useDemoController';
import {Card, colors, EmptyCard, PageHeader, PrimaryButton, SectionHeading} from './ui';

interface Props {
  controller: DemoController;
  onBack: () => void;
}

interface LogEntry {
  message: string;
  isError: boolean;
}

/** 固件升级页：输入本地固件路径 → 升级 → 进度/完成事件。 */
export function OtaPage({controller, onBack}: Props) {
  const {tr} = useI18n();
  const [path, setPath] = useState('');
  const [progress, setProgress] = useState(0);
  const [upgrading, setUpgrading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const log = (message: string, isError = false) =>
    setLogs(current => [{message, isError}, ...current]);

  useEffect(() => {
    const progressSub = RwfitBle.onOtaProgress(setProgress);
    const finishSub = RwfitBle.onOtaFinish(result => {
      setUpgrading(false);
      if (result.success) {
        setProgress(1);
        log(`${tr('OTA 升级成功', 'OTA upgrade succeeded')} ✓`);
      } else {
        log(`${tr('OTA 升级失败', 'OTA upgrade failed')}: code=${result.code}`, true);
      }
    });
    return () => {
      progressSub.remove();
      finishSub.remove();
    };
  }, [tr]);

  const start = async () => {
    if (!controller.connected) {
      log(tr('请先连接设备', 'Connect the device first'), true);
      return;
    }
    const value = path.trim();
    if (!value) {
      log(tr('请输入固件文件路径', 'Enter a firmware file path'), true);
      return;
    }
    setUpgrading(true);
    setProgress(0);
    try {
      await RwfitBle.ringOta(value);
      log(tr('OTA 指令已发送...', 'OTA command sent...'));
    } catch (error) {
      setUpgrading(false);
      log(`${tr('OTA 失败', 'OTA failed')}: ${String(error)}`, true);
    }
  };

  return (
    <View style={styles.page}>
      <PageHeader onBack={onBack} title={tr('固件升级', 'Firmware upgrade')} />
      <View style={styles.content}>
        <SectionHeading
          caption={tr('使用本地文件路径', 'Use a local file path')}
          title={tr('固件文件', 'Firmware file')}
        />
        <Card>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!upgrading}
            onChangeText={setPath}
            placeholder={
              tr('本地固件路径，例如', 'Local firmware path, e.g.') +
              ' /sdcard/Download/firmware.bin'
            }
            placeholderTextColor={colors.secondaryText}
            style={styles.input}
            value={path}
          />
          <Text style={styles.hint}>
            {tr(
              'Demo 不负责导入文件，请由客户集成时提供有效路径。',
              'File importing is handled by the integrating app. Provide a valid local path here.',
            )}
          </Text>
        </Card>

        <SectionHeading title={tr('升级状态', 'Upgrade status')} />
        <Card>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              {upgrading ? tr('正在升级', 'Upgrading') : tr('等待开始', 'Ready to start')}
            </Text>
            <Text style={styles.statusPercent}>{(progress * 100).toFixed(1)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {width: `${Math.min(100, Math.max(0, progress * 100))}%`},
              ]}
            />
          </View>
          <View style={styles.startAction}>
            <PrimaryButton
              enabled={!upgrading}
              label={upgrading ? tr('升级中...', 'Upgrading...') : tr('开始 OTA', 'Start OTA')}
              onPress={() => void start()}
            />
          </View>
        </Card>

        <SectionHeading title={tr('操作记录', 'Activity')} />
        {logs.length === 0 ? (
          <EmptyCard
            message={tr(
              '填写固件路径并开始升级后，结果会显示在这里。',
              'Upgrade events will appear here after the process starts.',
            )}
            title={tr('暂无升级记录', 'No upgrade activity')}
          />
        ) : (
          <Card style={styles.logCard}>
            {logs.map((entry, index) => (
              <View key={index} style={styles.logRow}>
                <Text style={[styles.logText, entry.isError && styles.logTextError]}>
                  {entry.message}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: colors.background},
  content: {padding: 16, paddingBottom: 32, gap: 4},
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
  },
  hint: {marginTop: 10, fontSize: 12, color: colors.secondaryText},
  statusRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  statusLabel: {fontSize: 15, fontWeight: '700', color: colors.text},
  statusPercent: {fontSize: 15, fontWeight: '700', color: colors.primary},
  progressTrack: {
    marginTop: 12,
    height: 7,
    borderRadius: 99,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {height: 7, backgroundColor: colors.primary},
  startAction: {marginTop: 18},
  logCard: {padding: 0, overflow: 'hidden'},
  logRow: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logText: {fontSize: 13, color: colors.text},
  logTextError: {color: colors.danger},
});
