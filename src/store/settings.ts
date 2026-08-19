import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CueMode } from '@/cues';
import {
  ALL_CORNER_NUMBERS,
  MIN_ENABLED_CORNERS,
  type SwitchOrder,
} from '@/corners';

export type Settings = {
  /** Seconds between corner switches (tenth-of-a-second precision). */
  switchIntervalSec: number;
  /** Total session length in seconds (countdown) when timed. */
  sessionDurationSec: number;
  /**
   * When true the session has no time limit: it counts up and only ends when
   * the user stops it. `sessionDurationSec` is preserved so toggling the limit
   * back on restores the previously chosen length.
   */
  sessionUntimed: boolean;
  /**
   * Random variation applied to each hold, as a percentage of the configured
   * interval. Symmetric, so the average cadence still matches the setting.
   * Zero makes every hold exactly as configured.
   */
  switchJitterPct: number;
  /** How each switch is announced: beep, spoken corner number, or nothing. */
  cueMode: CueMode;
  /** Whether each switch also fires a haptic pulse, independent of `cueMode`. */
  hapticCueEnabled: boolean;
  /**
   * Seconds counted down before the first corner lights, so you can get set.
   * Zero starts the drill immediately.
   */
  leadInSec: number;
  /** Random (avoids immediate repeat) or sequential order. */
  order: SwitchOrder;
  /**
   * Corner numbers in play, as shown on the court: always at least
   * `MIN_ENABLED_CORNERS` real corners, deduped and in board order. Readonly so
   * the array can be shared with `DEFAULT_SETTINGS` without risk of in-place
   * edits leaking into the defaults.
   */
  enabledCorners: readonly number[];
};

export const SETTINGS_LIMITS = {
  switchIntervalSec: { min: 0.5, max: 10, step: 0.1 },
  sessionDurationSec: { min: 30, max: 900, step: 1 },
  switchJitterPct: { min: 0, max: 50, step: 5 },
  leadInSec: { min: 0, max: 10, step: 1 },
} as const;

export const DEFAULT_SETTINGS: Settings = {
  switchIntervalSec: 2.5,
  sessionDurationSec: 120,
  sessionUntimed: false,
  switchJitterPct: 0,
  cueMode: 'beep',
  hapticCueEnabled: false,
  leadInSec: 3,
  order: 'random',
  enabledCorners: ALL_CORNER_NUMBERS,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Round to one decimal place (tenths of a second), avoiding float drift. */
const roundTenths = (value: number) => Math.round(value * 10) / 10;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function normalizeSwitchInterval(value: unknown): number {
  if (!isFiniteNumber(value)) return DEFAULT_SETTINGS.switchIntervalSec;
  const { min, max } = SETTINGS_LIMITS.switchIntervalSec;
  return clamp(roundTenths(value), min, max);
}

export function normalizeSessionDuration(value: unknown): number {
  if (!isFiniteNumber(value)) return DEFAULT_SETTINGS.sessionDurationSec;
  const { min, max } = SETTINGS_LIMITS.sessionDurationSec;
  return clamp(Math.round(value), min, max);
}

export function normalizeJitterPct(value: unknown): number {
  if (!isFiniteNumber(value)) return DEFAULT_SETTINGS.switchJitterPct;
  const { min, max } = SETTINGS_LIMITS.switchJitterPct;
  return clamp(Math.round(value), min, max);
}

export function normalizeLeadIn(value: unknown): number {
  if (!isFiniteNumber(value)) return DEFAULT_SETTINGS.leadInSec;
  const { min, max } = SETTINGS_LIMITS.leadInSec;
  return clamp(Math.round(value), min, max);
}

export function normalizeCueMode(value: unknown): CueMode {
  return value === 'beep' || value === 'voice' || value === 'off'
    ? value
    : DEFAULT_SETTINGS.cueMode;
}

export function normalizeOrder(value: unknown): SwitchOrder {
  return value === 'random' || value === 'sequential'
    ? value
    : DEFAULT_SETTINGS.order;
}

const normalizeFlag = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

/**
 * Coerce a persisted selection back into the invariant `Settings.enabledCorners`
 * promises: real corner numbers only, deduped, in board order, never empty.
 * Filtering `ALL_CORNER_NUMBERS` delivers all four properties in one pass.
 *
 * Anything unusable - a missing field from an older build, a hand-edited or
 * corrupt value, a selection naming only corners that no longer exist - falls
 * back to the full court, which is what those users last saw.
 */
export function normalizeEnabledCorners(value: unknown): readonly number[] {
  if (!Array.isArray(value)) return ALL_CORNER_NUMBERS;
  const kept = ALL_CORNER_NUMBERS.filter((number) => value.includes(number));
  return kept.length >= MIN_ENABLED_CORNERS ? kept : ALL_CORNER_NUMBERS;
}

type SettingsState = Settings & {
  hasHydrated: boolean;
  markHydrated: () => void;
  setSwitchInterval: (value: number) => void;
  setSessionDuration: (value: number) => void;
  setSessionUntimed: (value: boolean) => void;
  setSwitchJitterPct: (value: number) => void;
  setCueMode: (value: CueMode) => void;
  setHapticCueEnabled: (value: boolean) => void;
  setLeadIn: (value: number) => void;
  setOrder: (value: SwitchOrder) => void;
  /** No-op when it would drop below `MIN_ENABLED_CORNERS`. */
  toggleCorner: (number: number) => void;
  reset: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      hasHydrated: false,
      markHydrated: () => set({ hasHydrated: true }),
      setSwitchInterval: (value) =>
        set({ switchIntervalSec: normalizeSwitchInterval(value) }),
      setSessionDuration: (value) =>
        set({ sessionDurationSec: normalizeSessionDuration(value) }),
      setSessionUntimed: (value) => set({ sessionUntimed: value }),
      setSwitchJitterPct: (value) =>
        set({ switchJitterPct: normalizeJitterPct(value) }),
      setCueMode: (value) => set({ cueMode: value }),
      setHapticCueEnabled: (value) => set({ hapticCueEnabled: value }),
      setLeadIn: (value) => set({ leadInSec: normalizeLeadIn(value) }),
      setOrder: (value) => set({ order: value }),
      toggleCorner: (number) =>
        set((state) => {
          const on = state.enabledCorners.includes(number);
          if (on && state.enabledCorners.length <= MIN_ENABLED_CORNERS) {
            return state;
          }
          return {
            enabledCorners: on
              ? state.enabledCorners.filter((n) => n !== number)
              : ALL_CORNER_NUMBERS.filter(
                  (n) => n === number || state.enabledCorners.includes(n),
                ),
          };
        }),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'footwork-settings',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        switchIntervalSec,
        sessionDurationSec,
        sessionUntimed,
        switchJitterPct,
        cueMode,
        hapticCueEnabled,
        leadInSec,
        order,
        enabledCorners,
      }) => ({
        switchIntervalSec,
        sessionDurationSec,
        sessionUntimed,
        switchJitterPct,
        cueMode,
        hapticCueEnabled,
        leadInSec,
        order,
        enabledCorners,
      }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        // v0 stored session length in minutes as `sessionDurationMin`.
        if (version < 1 && typeof state.sessionDurationMin === 'number') {
          state.sessionDurationSec = state.sessionDurationMin * 60;
          delete state.sessionDurationMin;
        }
        // v2 added `enabledCorners`. v1 payloads simply lack the field, which
        // `merge` below normalises to the full court, so there is nothing to
        // migrate here.
        // v3 replaced the `audioCueEnabled` boolean with a three-way `cueMode`.
        if (version < 3 && typeof state.audioCueEnabled === 'boolean') {
          state.cueMode = state.audioCueEnabled ? 'beep' : 'off';
          delete state.audioCueEnabled;
        }
        return state as Partial<Settings>;
      },
      // Every rehydration passes through here, so this is the one place the
      // `Settings` invariants have to hold - which is why `pickNext` can trust
      // its pool instead of guarding an empty one, and why a stored value that
      // is now out of range (or a v0 payload migrated past `max`) cannot drive
      // a session.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<Settings>) };
        return {
          ...merged,
          switchIntervalSec: normalizeSwitchInterval(merged.switchIntervalSec),
          sessionDurationSec: normalizeSessionDuration(merged.sessionDurationSec),
          sessionUntimed: normalizeFlag(
            merged.sessionUntimed,
            DEFAULT_SETTINGS.sessionUntimed,
          ),
          switchJitterPct: normalizeJitterPct(merged.switchJitterPct),
          cueMode: normalizeCueMode(merged.cueMode),
          hapticCueEnabled: normalizeFlag(
            merged.hapticCueEnabled,
            DEFAULT_SETTINGS.hapticCueEnabled,
          ),
          leadInSec: normalizeLeadIn(merged.leadInSec),
          order: normalizeOrder(merged.order),
          enabledCorners: normalizeEnabledCorners(merged.enabledCorners),
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
