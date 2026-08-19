import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CORNERS, isCornerEnabled, ORDER_LABELS } from '@/corners';
import { formatDurationLabel, formatInterval } from '@/format';
import { useSettings } from '@/store/settings';
import { Colors, Radius, Spacing } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const switchIntervalSec = useSettings((s) => s.switchIntervalSec);
  const sessionDurationSec = useSettings((s) => s.sessionDurationSec);
  const sessionUntimed = useSettings((s) => s.sessionUntimed);
  const audioCueEnabled = useSettings((s) => s.audioCueEnabled);
  const order = useSettings((s) => s.order);
  const enabledCorners = useSettings((s) => s.enabledCorners);
  const hasHydrated = useSettings((s) => s.hasHydrated);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>Badminton{'\n'}Footwork Trainer</Text>
          <Text style={styles.subtitle}>
            React to the highlighted corner, move, and recover to the centre.
          </Text>
        </View>

        <View style={styles.previewGrid}>
          {CORNERS.map((corner) => {
            // Deselected corners stay in the grid, dimmed, so the layout holds
            // and it is obvious which ones sit out.
            const enabled = isCornerEnabled(enabledCorners, corner);
            return (
              <View
                key={corner.number}
                style={[styles.previewItem, !enabled && styles.previewItemOff]}
              >
                <View
                  style={[styles.previewDot, enabled && styles.previewDotOn]}
                >
                  <Text style={styles.previewNumber}>{corner.number}</Text>
                </View>
                <Text style={styles.previewLabel}>{corner.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.summary}>
          <SummaryRow
            label="Switch every"
            value={formatInterval(switchIntervalSec)}
          />
          <SummaryRow
            label="Session length"
            value={
              sessionUntimed ? 'No limit' : formatDurationLabel(sessionDurationSec)
            }
          />
          <SummaryRow
            label="Order"
            value={ORDER_LABELS[order]}
          />
          <SummaryRow
            label="Audio cue"
            value={audioCueEnabled ? 'On' : 'Off'}
          />
        </View>

        <View style={styles.actions}>
          <View style={styles.buttonRow}>
            <Pressable
              disabled={!hasHydrated}
              style={({ pressed }) => [
                styles.startButton,
                !hasHydrated && styles.startButtonDisabled,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/train')}
            >
              <Text style={styles.startLabel}>
                {hasHydrated ? 'Start Session' : 'Loading...'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={({ pressed }) => [
                styles.settingsButton,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/settings')}
            >
              <Text style={styles.settingsLabel}>Settings</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  hero: { gap: Spacing.sm },
  title: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  previewItem: {
    width: '31%',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewItemOff: { opacity: 0.3 },
  previewDotOn: { borderColor: Colors.accent },
  previewNumber: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  previewLabel: { color: Colors.textMuted, fontSize: 12 },
  summary: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { color: Colors.textMuted, fontSize: 14 },
  summaryValue: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  actions: { marginTop: 'auto', gap: Spacing.sm },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  startButton: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonDisabled: { opacity: 0.5 },
  startLabel: { color: Colors.background, fontSize: 18, fontWeight: '800' },
  settingsButton: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsLabel: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
