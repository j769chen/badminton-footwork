import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  /** Whether to play the audio cue on each switch. */
  audioCueEnabled: boolean;
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
} as const;

export const DEFAULT_SETTINGS: Settings = {
  switchIntervalSec: 2.5,
  sessionDurationSec: 120,
  sessionUntimed: false,
  audioCueEnabled: true,
  order: 'random',
  enabledCorners: ALL_CORNER_NUMBERS,
};

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
  setAudioCueEnabled: (value: boolean) => void;
  setOrder: (value: SwitchOrder) => void;
  /** No-op when it would drop below `MIN_ENABLED_CORNERS`. */
  toggleCorner: (number: number) => void;
  reset: () => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Round to one decimal place (tenths of a second), avoiding float drift. */
const roundTenths = (value: number) => Math.round(value * 10) / 10;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      hasHydrated: false,
      markHydrated: () => set({ hasHydrated: true }),
      setSwitchInterval: (value) =>
        set({
          switchIntervalSec: clamp(
            roundTenths(value),
            SETTINGS_LIMITS.switchIntervalSec.min,
            SETTINGS_LIMITS.switchIntervalSec.max,
          ),
        }),
      setSessionDuration: (value) =>
        set({
          sessionDurationSec: clamp(
            Math.round(value),
            SETTINGS_LIMITS.sessionDurationSec.min,
            SETTINGS_LIMITS.sessionDurationSec.max,
          ),
        }),
      setSessionUntimed: (value) => set({ sessionUntimed: value }),
      setAudioCueEnabled: (value) => set({ audioCueEnabled: value }),
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
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        switchIntervalSec,
        sessionDurationSec,
        sessionUntimed,
        audioCueEnabled,
        order,
        enabledCorners,
      }) => ({
        switchIntervalSec,
        sessionDurationSec,
        sessionUntimed,
        audioCueEnabled,
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
        return state as Partial<Settings>;
      },
      // Every rehydration passes through here, so this is the one place the
      // corner-selection invariant has to hold - which is why `pickNext` can
      // trust its pool instead of guarding an empty one.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<Settings>) };
        return {
          ...merged,
          enabledCorners: normalizeEnabledCorners(merged.enabledCorners),
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
