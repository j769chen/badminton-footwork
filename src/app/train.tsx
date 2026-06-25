import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCues } from '@/audio';
import { Court } from '@/components/Court';
import { CORNERS } from '@/corners';
import { useTrainer } from '@/hooks/useTrainer';
import { Colors, Radius, Spacing } from '@/theme';

function formatTime(ms: number, mode: 'ceil' | 'floor' = 'ceil'): string {
  const round = mode === 'ceil' ? Math.ceil : Math.floor;
  const total = Math.max(0, round(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function TrainScreen() {
  useKeepAwake();
  const router = useRouter();
  const cues = useCues();
  const trainer = useTrainer(cues);
  const {
    status,
    activeIndex,
    remainingMs,
    totalMs,
    elapsedMs,
    untimed,
    start,
    pause,
    resume,
    stop,
  } = trainer;

  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      start();
    }
  }, [start]);

  const handleStop = () => {
    stop();
    router.back();
  };

  const activeCorner =
    activeIndex !== null ? CORNERS[activeIndex] : null;
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
  const isComplete = status === 'complete';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.clock}>
            {untimed
              ? formatTime(elapsedMs, 'floor')
              : formatTime(remainingMs)}
          </Text>
          {untimed ? (
            <Text style={styles.clockCaption}>Elapsed - no time limit</Text>
          ) : (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, progress * 100))}%` },
                ]}
              />
            </View>
          )}
        </View>

        <Court activeIndex={activeIndex} />

        <View style={styles.callout}>
          {isComplete ? (
            <Text style={styles.completeText}>Session complete</Text>
          ) : (
            <>
              <Text style={styles.calloutNumber}>
                {activeCorner ? activeCorner.number : '-'}
              </Text>
              <Text style={styles.calloutLabel}>
                {activeCorner ? activeCorner.label : ''}
              </Text>
            </>
          )}
        </View>

        <View style={styles.controls}>
          {status === 'running' && (
            <Pressable
              style={({ pressed }) => [styles.control, styles.controlPause, pressed && styles.pressed]}
              onPress={pause}
            >
              <Text style={styles.controlLabel}>Pause</Text>
            </Pressable>
          )}

          {status === 'paused' && (
            <Pressable
              style={({ pressed }) => [styles.control, styles.controlResume, pressed && styles.pressed]}
              onPress={resume}
            >
              <Text style={[styles.controlLabel, styles.controlLabelDark]}>Resume</Text>
            </Pressable>
          )}

          {isComplete && (
            <Pressable
              style={({ pressed }) => [styles.control, styles.controlResume, pressed && styles.pressed]}
              onPress={start}
            >
              <Text style={[styles.controlLabel, styles.controlLabelDark]}>Restart</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.control, styles.controlStop, pressed && styles.pressed]}
            onPress={handleStop}
          >
            <Text style={[styles.controlLabel, styles.controlLabelDark]}>
              {isComplete ? 'Done' : 'Stop'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  header: { gap: Spacing.sm },
  clock: {
    color: Colors.text,
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  clockCaption: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  callout: { alignItems: 'center', gap: Spacing.xs },
  calloutNumber: {
    color: Colors.cornerActive,
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 68,
  },
  calloutLabel: { color: Colors.textMuted, fontSize: 16, fontWeight: '600' },
  completeText: {
    color: Colors.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 'auto',
  },
  control: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  controlPause: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  controlResume: { backgroundColor: Colors.accent },
  controlStop: { backgroundColor: Colors.danger },
  controlLabel: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  controlLabelDark: { color: Colors.background },
  pressed: { opacity: 0.8 },
});
