/* eslint-disable no-void */
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  RwfitBle,
  WorkoutControlType,
  type WorkoutRealtimeData,
  type WorkoutState,
} from 'react-native-rwfit-ble';
import {ActionButton, ButtonWrap, colors, errorMessage, Page} from './ui';
import {useI18n} from './i18n';

const workoutTypeStart = 7;
const workoutTypeNames = [
  'running', 'treadmill', 'outdoor running', 'riding', 'swim', 'walking',
  'mountain climbing', 'Yoga', 'spinning bike', 'basketball', 'football',
  'badminton', 'marathon', 'indoor walking', 'free exercise', 'track and field',
  'Physical Training', 'weightlifting', 'boxing', 'jump rope', 'Climb stairs',
  'ski', 'skate', 'roller skating', 'indoor cycling', 'Hula Hoop', 'golf',
  'baseball', 'dance', 'pingpong', 'hockey', 'Pilates', 'Taekwondo', 'Handball',
  'hip-hop', 'volleyball', 'tennis', 'darts', 'gymnastics', 'step on',
  'elliptical machine', 'Zumba', 'cricket', 'travel by walking',
  'Aerobic exercise', 'rowing machine', 'football', 'Sit-ups', 'dumbbell',
  'aerobics', 'karate', 'fencing', 'martial arts', 'Tai Chi', 'Frisbee',
  'archery', 'horse riding', 'bowling', 'surf', 'softball', 'squash', 'sailboat',
  'pull-ups', 'skateboard', 'trampoline', 'fishing', 'pole dance', 'Square dance',
  'Jazz dance', 'ballet', 'disco', 'tap dance', 'modern dance', 'push-up',
  'Scooter', 'plank', 'billiards', 'rock climbing', 'discus', 'race', 'wrestling',
  'high jump', 'parachute', 'shot put', 'long jump', 'javelin', 'hammer throw',
  'Squat', 'Leg press', 'off-road bike', 'motocross', 'Rowing', 'Crossfit',
  'water bike', 'kayak', 'croquet', 'floor ball', 'muay thai', 'jai alai',
  'Tennis (double)', 'back training', 'water volleyball', 'water skiing',
  'climbing machine', 'HIIT', 'BODY COMBAT', 'BODY BALANCE',
  'full body resistance exercise', 'Taekwondo', 'BMX', 'stretch',
  'indoor fitness', 'flexibility training', 'upper body training',
  'Lower body training', 'floor exercise', 'barbell training',
  'Physical Training', 'deadlift', 'burpee', 'functional training',
  'Waist and abdominal training', 'table football', 'hunt',
  'stand up paddle boarding', 'kayak rafting', 'motorboat', 'parkour', 'ATV',
  'Paragliding', 'curling', 'ski board', 'skis', 'alpine skiing',
  'cross-country skiing', 'snowmobile', 'snowmobile', 'sled', 'squash', 'puck',
  'sepak takraw', 'water polo', 'belly dance', 'ballroom dancing', 'folk dance',
  'latin dance', 'judo', 'kickboxing', 'fly a kite', 'tug of war',
  'shuttlecock', 'kabaddi', 'racing', 'pebbles game', 'tag game',
];

function workoutName(type: number): string {
  return workoutTypeNames[type - workoutTypeStart] ?? 'Unknown';
}

export function WorkoutPage({onBack}: {onBack: () => void}) {
  const {tr} = useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<WorkoutState>();
  const [data, setData] = useState<WorkoutRealtimeData>();

  useEffect(() => {
    const realtime = RwfitBle.onWorkoutRealtimeData(setData);
    void RwfitBle.getWorkoutState()
      .then(current => {
        if (current.isRunning) {
          setState(current);
        }
      })
      .catch(error =>
        setMessage(`${tr('查询运动状态失败', 'Failed to get workout state')}: ${errorMessage(error)}`),
      );
    return () => realtime.remove();
  }, [tr]);

  useEffect(() => {
    if (!state?.isRunning) {
      return;
    }
    void RwfitBle.setWorkoutRealtimeEnabled(true).catch(error =>
      setMessage(`${tr('实时数据开关失败', 'Failed to enable live data')}: ${errorMessage(error)}`),
    );
    return () => {
      void RwfitBle.setWorkoutRealtimeEnabled(false).catch(() => undefined);
    };
  }, [state?.isRunning, tr]);

  const selectWorkout = async (sportType: number) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      let current = await RwfitBle.getWorkoutState();
      if (!current.isRunning) {
        await RwfitBle.controlWorkout(sportType, WorkoutControlType.Start);
        current = await RwfitBle.getWorkoutState();
      }
      if (!current.isRunning) {
        throw new Error(tr('设备未进入运动状态', 'The device did not enter workout mode'));
      }
      setState(current);
      setData(undefined);
    } catch (error) {
      setMessage(`${tr('开始运动失败', 'Failed to start workout')}: ${errorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const control = async (type: WorkoutControlType) => {
    if (!state || busy) {
      return;
    }
    setBusy(true);
    try {
      await RwfitBle.controlWorkout(state.sportType, type);
      if (type === WorkoutControlType.End) {
        const reports = await RwfitBle.getWorkoutReports();
        setMessage(
          `${tr('运动已结束，已同步', 'Workout ended; synced')} ${reports.length} ${tr('条历史报告', 'reports')}`,
        );
        setState(undefined);
        setData(undefined);
      } else {
        setState(await RwfitBle.getWorkoutState());
      }
    } catch (error) {
      setMessage(`${tr('运动控制失败', 'Workout control failed')}: ${errorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };

  if (state?.isRunning) {
    const seconds = data?.duration ?? 0;
    const duration = `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(
      Math.floor((seconds % 3600) / 60),
    ).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const canPause =
      state.controlType === WorkoutControlType.Start ||
      state.controlType === WorkoutControlType.Resume;
    const canResume = state.controlType === WorkoutControlType.Pause;
    return (
      <Page onBack={() => setState(undefined)} title={tr('实时运动数据', 'Live workout data')}>
        <View style={styles.running}>
          <Text style={styles.runningTitle}>
            {tr('类型', 'Type')}: {workoutName(state.sportType)} ({state.sportType})
          </Text>
          <Metric label={tr('时间', 'Time')} value={duration} />
          <Metric label={tr('步数', 'Steps')} value={String(data?.steps ?? 0)} />
          <Metric label={tr('距离', 'Distance')} value={`${((data?.distance ?? 0) / 1000).toFixed(2)} Km`} />
          <Metric label={tr('卡路里', 'Calories')} value={`${((data?.calorie ?? 0) / 1000).toFixed(1)} KCal`} />
          <Metric label={tr('心率', 'Heart rate')} value={`${data?.heartRate ?? 0} bpm`} />
          <ButtonWrap>
            <ActionButton
              danger
              enabled={!busy}
              label={tr('结束', 'End')}
              onPress={() => void control(WorkoutControlType.End)}
            />
            {canPause ? (
              <ActionButton
                enabled={!busy}
                label={tr('暂停', 'Pause')}
                onPress={() => void control(WorkoutControlType.Pause)}
                primary
              />
            ) : null}
            {canResume ? (
              <ActionButton
                enabled={!busy}
                label={tr('继续', 'Resume')}
                onPress={() => void control(WorkoutControlType.Resume)}
                primary
              />
            ) : null}
          </ButtonWrap>
          {busy ? <ActivityIndicator color={colors.primary} style={styles.busy} /> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </Page>
    );
  }

  return (
    <Page onBack={onBack} title={tr('选择运动类型', 'Choose workout type')}>
      {message ? <Text style={styles.messageBanner}>{message}</Text> : null}
      <FlatList
        data={workoutTypeNames}
        keyExtractor={(_, index) => String(workoutTypeStart + index)}
        renderItem={({item, index}) => {
          const type = workoutTypeStart + index;
          return (
            <Pressable
              disabled={busy}
              onPress={() => void selectWorkout(type)}
              style={({pressed}) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.number}><Text style={styles.numberText}>{type}</Text></View>
              <Text style={styles.name}>{item}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        }}
      />
      {busy ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}
    </Page>
  );
}

function Metric({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  number: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  numberText: {fontSize: 12, color: colors.primary, fontWeight: '700'},
  name: {flex: 1, marginLeft: 14, fontSize: 15, color: colors.text},
  chevron: {fontSize: 26, color: colors.muted},
  pressed: {opacity: 0.7},
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff99',
  },
  messageBanner: {
    padding: 10,
    textAlign: 'center',
    color: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  running: {flex: 1, padding: 20, backgroundColor: colors.background},
  runningTitle: {fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 20},
  metric: {
    flexDirection: 'row',
    paddingVertical: 11,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricLabel: {width: 80, fontSize: 16, fontWeight: '600', color: colors.text},
  metricValue: {fontSize: 16, color: colors.text},
  busy: {marginTop: 24},
  message: {marginTop: 20, color: colors.warning},
});
