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

import {
  CORNERS,
  isCornerEnabled,
  MIN_ENABLED_CORNERS,
  type SwitchOrder,
} from '@/corners';
import { formatClock, formatInterval } from '@/format';
import { SETTINGS_LIMITS, useSettings } from '@/store/settings';
import { Colors, Radius, Spacing } from '@/theme';
import React from 'react';

export default function SettingsScreen() {
  const switchIntervalSec = useSettings((s) => s.switchIntervalSec);
  const sessionDurationSec = useSettings((s) => s.sessionDurationSec);
  const sessionUntimed = useSettings((s) => s.sessionUntimed);
  const audioCueEnabled = useSettings((s) => s.audioCueEnabled);
  const order = useSettings((s) => s.order);
  const enabledCorners = useSettings((s) => s.enabledCorners);
  const toggleCorner = useSettings((s) => s.toggleCorner);

  const setSwitchInterval = useSettings((s) => s.setSwitchInterval);
  const setSessionDuration = useSettings((s) => s.setSessionDuration);
  const setSessionUntimed = useSettings((s) => s.setSessionUntimed);
  const setAudioCueEnabled = useSettings((s) => s.setAudioCueEnabled);
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
          label="Session length"
          help="The workout stops when this countdown reaches zero. Adjustable to the second."
          value={sessionDurationSec}
          format={formatClock}
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
            <Text style={styles.label}>Corners in play</Text>
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

        <View style={styles.card}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Switch order</Text>
            <Text style={styles.help}>
              Random avoids repeating the same corner twice in a row.
            </Text>
          </View>
          <Segmented value={order} onChange={setOrder} />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowText}>
              <Text style={styles.label}>Audio cue</Text>
              <Text style={styles.help}>
                Plays a short beep. Turn off for a
                visual-only drill
              </Text>
            </View>
            <Switch
              value={audioCueEnabled}
              onValueChange={setAudioCueEnabled}
              trackColor={{ true: Colors.accent, false: Colors.border }}
              thumbColor={Colors.text}
            />
          </View>
        </View>

        <Pressable
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
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** When true the slider is hidden and the value shows `disabledValueLabel`. */
  disabled?: boolean;
  disabledValueLabel?: string;
  /** Extra content rendered at the bottom of the card (e.g. a toggle row). */
  footer?: ReactNode;
};

function SliderControl({
  label,
  help,
  value,
  format,
  min,
  max,
  step,
  onChange,
  disabled = false,
  disabledValueLabel,
  footer,
}: SliderControlProps) {
  // Local state drives the visible control for instant feedback; the store is
  // the source of truth and is kept in sync both ways.
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

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
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
            disabled={local <= min}
            onPress={() => commit(local - step)}
          />
          <Slider
            style={styles.slider}
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
  disabled,
  onPress,
}: {
  symbol: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
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
  /** Last remaining selections cannot be cleared. */
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

function Segmented({
  value,
  onChange,
}: {
  value: SwitchOrder;
  onChange: (value: SwitchOrder) => void;
}) {
  const options: { key: SwitchOrder; label: string }[] = [
    { key: 'random', label: 'Random' },
    { key: 'sequential', label: 'Sequential' },
  ];
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const selected = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text
              style={[
                styles.segmentLabel,
                selected && styles.segmentLabelSelected,
              ]}
            >
              {opt.label}
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
