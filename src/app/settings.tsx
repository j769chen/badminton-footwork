import Slider from '@react-native-community/slider';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CUE_MODE_LABELS, type CueMode } from '@/cues';
import {
  CORNERS,
  isCornerEnabled,
  MIN_ENABLED_CORNERS,
  ORDER_LABELS,
  type SwitchOrder,
} from '@/corners';
import {
  formatClock,
  formatDurationLabel,
  formatInterval,
  formatJitter,
  formatLeadIn,
} from '@/format';
import { SETTINGS_LIMITS, useSettings } from '@/store/settings';
import { Colors, Radius, Spacing } from '@/theme';

export default function SettingsScreen() {
  const switchIntervalSec = useSettings((s) => s.switchIntervalSec);
  const sessionDurationSec = useSettings((s) => s.sessionDurationSec);
  const sessionUntimed = useSettings((s) => s.sessionUntimed);
  const switchJitterPct = useSettings((s) => s.switchJitterPct);
  const cueMode = useSettings((s) => s.cueMode);
  const hapticCueEnabled = useSettings((s) => s.hapticCueEnabled);
  const leadInSec = useSettings((s) => s.leadInSec);
  const order = useSettings((s) => s.order);
  const enabledCorners = useSettings((s) => s.enabledCorners);
  const toggleCorner = useSettings((s) => s.toggleCorner);

  const setSwitchInterval = useSettings((s) => s.setSwitchInterval);
  const setSessionDuration = useSettings((s) => s.setSessionDuration);
  const setSessionUntimed = useSettings((s) => s.setSessionUntimed);
  const setSwitchJitterPct = useSettings((s) => s.setSwitchJitterPct);
  const setCueMode = useSettings((s) => s.setCueMode);
  const setHapticCueEnabled = useSettings((s) => s.setHapticCueEnabled);
  const setLeadIn = useSettings((s) => s.setLeadIn);
  const setOrder = useSettings((s) => s.setOrder);
  const reset = useSettings((s) => s.reset);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SliderControl
          label="Time between switches"
          help="How long the highlighted corner stays lit. Adjustable to the tenth of a second."
          value={switchIntervalSec}
          format={formatInterval}
          min={SETTINGS_LIMITS.switchIntervalSec.min}
          max={SETTINGS_LIMITS.switchIntervalSec.max}
          step={SETTINGS_LIMITS.switchIntervalSec.step}
          onChange={setSwitchInterval}
        />

        <SliderControl
          label="Cadence variation"
          help="Randomly varies each hold either side of the interval, so you cannot settle into the rhythm and pre-move. Off keeps every hold exact."
          value={switchJitterPct}
          format={formatJitter}
          min={SETTINGS_LIMITS.switchJitterPct.min}
          max={SETTINGS_LIMITS.switchJitterPct.max}
          step={SETTINGS_LIMITS.switchJitterPct.step}
          onChange={setSwitchJitterPct}
        />

        <SliderControl
          label="Session length"
          help="The workout stops when this countdown reaches zero. Adjustable to the second."
          value={sessionDurationSec}
          format={formatClock}
          formatLabel={formatDurationLabel}
          min={SETTINGS_LIMITS.sessionDurationSec.min}
          max={SETTINGS_LIMITS.sessionDurationSec.max}
          step={SETTINGS_LIMITS.sessionDurationSec.step}
          onChange={setSessionDuration}
          disabled={sessionUntimed}
          disabledValueLabel="No limit"
          footer={
            <View style={styles.toggleRow}>
              <View style={styles.rowText}>
                <Text style={styles.toggleLabel}>No time limit</Text>
                <Text style={styles.help}>
                  Run until you stop. The timer counts up instead of down and the
                  session never ends on its own.
                </Text>
              </View>
              <Switch
                accessibilityLabel="No time limit"
                value={sessionUntimed}
                onValueChange={setSessionUntimed}
                trackColor={{ true: Colors.accent, false: Colors.border }}
                thumbColor={Colors.text}
              />
            </View>
          }
        />

        <View style={styles.card}>
          <View style={styles.rowText}>
            <Text accessibilityRole="header" style={styles.label}>
              Corners in play
            </Text>
            <Text style={styles.help}>
              Only the selected corners are called out. Pick one to drill a
              single corner over and over.
            </Text>
          </View>
          <View style={styles.cornerList}>
            {CORNERS.map((corner) => {
              const checked = isCornerEnabled(enabledCorners, corner);
              const locked =
                checked && enabledCorners.length <= MIN_ENABLED_CORNERS;
              return (
                <CornerCheckbox
                  key={corner.number}
                  number={corner.number}
                  label={corner.label}
                  checked={checked}
                  locked={locked}
                  onToggle={() => toggleCorner(corner.number)}
                />
              );
            })}
          </View>
        </View>

        <SliderControl
          label="Get-ready countdown"
          help="Counted off before the first corner lights, so you can take your stance. Set to Off to start immediately."
          value={leadInSec}
          format={formatLeadIn}
          min={SETTINGS_LIMITS.leadInSec.min}
          max={SETTINGS_LIMITS.leadInSec.max}
          step={SETTINGS_LIMITS.leadInSec.step}
          onChange={setLeadIn}
        />

        <View style={styles.card}>
          <View style={styles.rowText}>
            <Text accessibilityRole="header" style={styles.label}>
              Switch order
            </Text>
            <Text style={styles.help}>
              Random avoids repeating the same corner twice in a row.
            </Text>
          </View>
          <Segmented<SwitchOrder>
            groupLabel="Switch order"
            labels={ORDER_LABELS}
            value={order}
            onChange={setOrder}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.rowText}>
            <Text accessibilityRole="header" style={styles.label}>
              Audio cue
            </Text>
            <Text style={styles.help}>
              Beep plays a short tone. Voice calls the corner number out loud so
              you can drill without watching the screen. Off is a visual-only
              drill
            </Text>
          </View>
          <Segmented<CueMode>
            groupLabel="Audio cue"
            labels={CUE_MODE_LABELS}
            value={cueMode}
            onChange={setCueMode}
          />
          <View style={styles.toggleRow}>
            <View style={styles.rowText}>
              <Text style={styles.toggleLabel}>Vibrate on switch</Text>
              <Text style={styles.help}>
                Adds a haptic pulse to each call, independent of the audio cue.
                Pair it with Off to drill silently in a shared space.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Vibrate on switch"
              value={hapticCueEnabled}
              onValueChange={setHapticCueEnabled}
              trackColor={{ true: Colors.accent, false: Colors.border }}
              thumbColor={Colors.text}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset all settings to defaults"
          style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
          onPress={reset}
        >
          <Text style={styles.resetLabel}>Reset to defaults</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type SliderControlProps = {
  label: string;
  help: string;
  value: number;
  format: (value: number) => string;
  formatLabel?: (value: number) => string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  disabledValueLabel?: string;
  footer?: ReactNode;
};

function SliderControl({
  label,
  help,
  value,
  format,
  formatLabel,
  min,
  max,
  step,
  onChange,
  disabled = false,
  disabledValueLabel,
  footer,
}: SliderControlProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const snap = (n: number) => {
    const clamped = Math.min(max, Math.max(min, n));
    return step < 1 ? Math.round(clamped * 10) / 10 : Math.round(clamped);
  };

  const commit = (n: number) => {
    const next = snap(n);
    setLocal(next);
    onChange(next);
  };

  const spoken = disabled
    ? (disabledValueLabel ?? 'unset')
    : (formatLabel ?? format)(local);

  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityLabel={`${label}, ${spoken}`}
        style={styles.rowBetween}
      >
        <View style={styles.rowText}>
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={[styles.value, disabled && styles.valueMuted]}>
          {disabled ? (disabledValueLabel ?? '--') : format(local)}
        </Text>
      </View>
      <Text style={styles.help}>{help}</Text>

      {!disabled && (
        <View style={styles.sliderRow}>
          <StepButton
            symbol="-"
            action="Decrease"
            settingLabel={label}
            disabled={local <= min}
            onPress={() => commit(local - step)}
          />
          <Slider
            style={styles.slider}
            accessibilityLabel={label}
            accessibilityValue={{ text: spoken }}
            minimumValue={min}
            maximumValue={max}
            step={step}
            value={local}
            onValueChange={setLocal}
            onSlidingComplete={commit}
            minimumTrackTintColor={Colors.accent}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.accent}
          />
          <StepButton
            symbol="+"
            action="Increase"
            settingLabel={label}
            disabled={local >= max}
            onPress={() => commit(local + step)}
          />
        </View>
      )}

      {footer}
    </View>
  );
}

function StepButton({
  symbol,
  action,
  settingLabel,
  disabled,
  onPress,
}: {
  symbol: string;
  action: 'Increase' | 'Decrease';
  settingLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${action} ${settingLabel.toLowerCase()}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.stepButton,
        disabled && styles.stepButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.stepButtonLabel}>{symbol}</Text>
    </Pressable>
  );
}

function CornerCheckbox({
  number,
  label,
  checked,
  locked,
  onToggle,
}: {
  number: number;
  label: string;
  checked: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: locked }}
      accessibilityLabel={`Corner ${number}, ${label}`}
      disabled={locked}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.cornerRow,
        pressed && !locked && styles.pressed,
      ]}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkboxTick}>✓</Text>}
      </View>
      <Text style={[styles.cornerNumber, !checked && styles.cornerTextOff]}>
        {number}
      </Text>
      <Text style={[styles.cornerLabel, !checked && styles.cornerTextOff]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Segmented<T extends string>({
  groupLabel,
  labels,
  value,
  onChange,
}: {
  groupLabel: string;
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  const options = Object.entries(labels) as [T, string][];
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={groupLabel}
      style={styles.segmented}
    >
      {options.map(([key, label]) => {
        const selected = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={label}
            onPress={() => onChange(key)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text
              style={[
                styles.segmentLabel,
                selected && styles.segmentLabelSelected,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  rowText: { gap: Spacing.xs, flexShrink: 1 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  label: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  help: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  value: {
    color: Colors.accent,
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  valueMuted: { color: Colors.textMuted, fontSize: 18 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  toggleLabel: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  slider: { flex: 1, height: 40 },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: { opacity: 0.35 },
  stepButtonLabel: { color: Colors.text, fontSize: 26, fontWeight: '700' },
  cornerList: { marginTop: Spacing.xs },
  cornerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkboxTick: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  cornerNumber: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    width: 18,
    textAlign: 'center',
  },
  cornerLabel: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  cornerTextOff: { color: Colors.textMuted },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.pill,
  },
  segmentSelected: { backgroundColor: Colors.accent },
  segmentLabel: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  segmentLabelSelected: { color: Colors.background, fontWeight: '800' },
  resetButton: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetLabel: { color: Colors.danger, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
