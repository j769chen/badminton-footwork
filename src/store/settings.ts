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
  switchIntervalSec: number;
  sessionDurationSec: number;
  sessionUntimed: boolean;
  switchJitterPct: number;
  cueMode: CueMode;
  hapticCueEnabled: boolean;
  leadInSec: number;
  order: SwitchOrder;
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

export function normalizeEnabledCorners(value: unknown): readonly number[] {
  if (!Array.isArray(value)) return ALL_CORNER_NUMBERS;
  const kept = ALL_CORNER_NUMBERS.filter((number) => value.includes(number));
  return kept.length >= MIN_ENABLED_CORNERS ? kept : ALL_CORNER_NUMBERS;
}

export function migrateSettings(
  persisted: unknown,
  version: number,
): Partial<Settings> {
  const state = { ...((persisted ?? {}) as Record<string, unknown>) };
  if (version < 1 && typeof state.sessionDurationMin === 'number') {
    state.sessionDurationSec = state.sessionDurationMin * 60;
    delete state.sessionDurationMin;
  }
  if (version < 3 && typeof state.audioCueEnabled === 'boolean') {
    state.cueMode = state.audioCueEnabled ? 'beep' : 'off';
    delete state.audioCueEnabled;
  }
  return state as Partial<Settings>;
}

export function normalizeSettings(value: Partial<Settings>): Settings {
  return {
    switchIntervalSec: normalizeSwitchInterval(value.switchIntervalSec),
    sessionDurationSec: normalizeSessionDuration(value.sessionDurationSec),
    sessionUntimed: normalizeFlag(
      value.sessionUntimed,
      DEFAULT_SETTINGS.sessionUntimed,
    ),
    switchJitterPct: normalizeJitterPct(value.switchJitterPct),
    cueMode: normalizeCueMode(value.cueMode),
    hapticCueEnabled: normalizeFlag(
      value.hapticCueEnabled,
      DEFAULT_SETTINGS.hapticCueEnabled,
    ),
    leadInSec: normalizeLeadIn(value.leadInSec),
    order: normalizeOrder(value.order),
    enabledCorners: normalizeEnabledCorners(value.enabledCorners),
  };
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
      setSessionUntimed: (value) =>
        set({
          sessionUntimed: normalizeFlag(value, DEFAULT_SETTINGS.sessionUntimed),
        }),
      setSwitchJitterPct: (value) =>
        set({ switchJitterPct: normalizeJitterPct(value) }),
      setCueMode: (value) => set({ cueMode: normalizeCueMode(value) }),
      setHapticCueEnabled: (value) =>
        set({
          hapticCueEnabled: normalizeFlag(
            value,
            DEFAULT_SETTINGS.hapticCueEnabled,
          ),
        }),
      setLeadIn: (value) => set({ leadInSec: normalizeLeadIn(value) }),
      setOrder: (value) => set({ order: normalizeOrder(value) }),
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
      migrate: migrateSettings,
      merge: (persisted, current) => ({
        ...current,
        ...normalizeSettings({
          ...current,
          ...(persisted as Partial<Settings>),
        }),
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
