import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SwitchOrder = 'random' | 'sequential';

export type Settings = {
  /** Seconds between corner switches (tenth-of-a-second precision). */
  switchIntervalSec: number;
  /** Total session length in seconds (countdown). */
  sessionDurationSec: number;
  /** Whether to play the audio cue on each switch. */
  audioCueEnabled: boolean;
  /** Random (avoids immediate repeat) or sequential 1->6 order. */
  order: SwitchOrder;
};

export const SETTINGS_LIMITS = {
  switchIntervalSec: { min: 0.5, max: 10, step: 0.1 },
  sessionDurationSec: { min: 30, max: 900, step: 1 },
} as const;

export const DEFAULT_SETTINGS: Settings = {
  switchIntervalSec: 2.5,
  sessionDurationSec: 120,
  audioCueEnabled: true,
  order: 'random',
};

type SettingsState = Settings & {
  hasHydrated: boolean;
  markHydrated: () => void;
  setSwitchInterval: (value: number) => void;
  setSessionDuration: (value: number) => void;
  setAudioCueEnabled: (value: boolean) => void;
  setOrder: (value: SwitchOrder) => void;
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
      setAudioCueEnabled: (value) => set({ audioCueEnabled: value }),
      setOrder: (value) => set({ order: value }),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'footwork-settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        switchIntervalSec,
        sessionDurationSec,
        audioCueEnabled,
        order,
      }) => ({ switchIntervalSec, sessionDurationSec, audioCueEnabled, order }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        // v0 stored session length in minutes as `sessionDurationMin`.
        if (version < 1 && typeof state.sessionDurationMin === 'number') {
          state.sessionDurationSec = state.sessionDurationMin * 60;
          delete state.sessionDurationMin;
        }
        return state as Partial<Settings>;
      },
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
