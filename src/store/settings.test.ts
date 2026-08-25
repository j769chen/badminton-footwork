import { ALL_CORNER_NUMBERS } from '@/corners';
import {
  DEFAULT_SETTINGS,
  migrateSettings,
  normalizeCueMode,
  normalizeEnabledCorners,
  normalizeJitterPct,
  normalizeLeadIn,
  normalizeOrder,
  normalizeSessionDuration,
  normalizeSettings,
  normalizeSwitchInterval,
  SETTINGS_LIMITS,
} from '@/store/settings';

const JUNK = [undefined, null, NaN, Infinity, 'nope', {}, []];

describe('normalizeSwitchInterval', () => {
  it('clamps to the configured range', () => {
    expect(normalizeSwitchInterval(0.1)).toBe(SETTINGS_LIMITS.switchIntervalSec.min);
    expect(normalizeSwitchInterval(99)).toBe(SETTINGS_LIMITS.switchIntervalSec.max);
  });

  it('snaps to tenths without float drift', () => {
    expect(normalizeSwitchInterval(2.54)).toBe(2.5);
    expect(normalizeSwitchInterval(2.55)).toBe(2.6);
    expect(normalizeSwitchInterval(0.1 + 0.2 + 2.2)).toBe(2.5);
  });

  it('falls back to the default for anything unusable', () => {
    for (const value of JUNK) {
      expect(normalizeSwitchInterval(value)).toBe(DEFAULT_SETTINGS.switchIntervalSec);
    }
  });
});

describe('normalizeSessionDuration', () => {
  it('clamps and rounds to whole seconds', () => {
    expect(normalizeSessionDuration(10)).toBe(SETTINGS_LIMITS.sessionDurationSec.min);
    expect(normalizeSessionDuration(5000)).toBe(SETTINGS_LIMITS.sessionDurationSec.max);
    expect(normalizeSessionDuration(120.6)).toBe(121);
  });

  it('falls back to the default for anything unusable', () => {
    for (const value of JUNK) {
      expect(normalizeSessionDuration(value)).toBe(DEFAULT_SETTINGS.sessionDurationSec);
    }
  });
});

describe('normalizeJitterPct and normalizeLeadIn', () => {
  it('clamp to their ranges', () => {
    expect(normalizeJitterPct(-5)).toBe(0);
    expect(normalizeJitterPct(80)).toBe(SETTINGS_LIMITS.switchJitterPct.max);
    expect(normalizeLeadIn(-1)).toBe(0);
    expect(normalizeLeadIn(60)).toBe(SETTINGS_LIMITS.leadInSec.max);
  });
});

describe('enum normalizers', () => {
  it('accept known values and reject everything else', () => {
    expect(normalizeCueMode('voice')).toBe('voice');
    expect(normalizeCueMode('off')).toBe('off');
    expect(normalizeCueMode('shout')).toBe(DEFAULT_SETTINGS.cueMode);
    expect(normalizeOrder('sequential')).toBe('sequential');
    expect(normalizeOrder(true)).toBe(DEFAULT_SETTINGS.order);
  });
});

describe('normalizeEnabledCorners', () => {
  it('keeps only real corners, deduped and in board order', () => {
    expect(normalizeEnabledCorners([5, 1, 5, 99])).toEqual([1, 5]);
  });

  it('falls back to the full court when nothing usable survives', () => {
    expect(normalizeEnabledCorners([])).toEqual(ALL_CORNER_NUMBERS);
    expect(normalizeEnabledCorners([42])).toEqual(ALL_CORNER_NUMBERS);
    expect(normalizeEnabledCorners(undefined)).toEqual(ALL_CORNER_NUMBERS);
    expect(normalizeEnabledCorners('1,2,3')).toEqual(ALL_CORNER_NUMBERS);
  });

  it('keeps a single-corner selection', () => {
    expect(normalizeEnabledCorners([4])).toEqual([4]);
  });
});

describe('normalizeSettings', () => {
  it('turns an empty payload into the defaults', () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('repairs every field independently', () => {
    expect(
      normalizeSettings({
        switchIntervalSec: 99,
        sessionDurationSec: -1,
        switchJitterPct: 999,
        leadInSec: 999,
        cueMode: 'nope' as never,
        order: 'nope' as never,
        enabledCorners: [7, 8],
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      switchIntervalSec: SETTINGS_LIMITS.switchIntervalSec.max,
      sessionDurationSec: SETTINGS_LIMITS.sessionDurationSec.min,
      switchJitterPct: SETTINGS_LIMITS.switchJitterPct.max,
      leadInSec: SETTINGS_LIMITS.leadInSec.max,
    });
  });
});

describe('migrateSettings', () => {
  it('converts the v0 session length from minutes to seconds', () => {
    const migrated = migrateSettings({ sessionDurationMin: 5 }, 0);
    expect(migrated.sessionDurationSec).toBe(300);
    expect(migrated).not.toHaveProperty('sessionDurationMin');
  });

  it('clamps a v0 length that migrates past the current maximum', () => {
    const migrated = migrateSettings({ sessionDurationMin: 30 }, 0);
    expect(migrated.sessionDurationSec).toBe(1800);
    expect(normalizeSettings(migrated).sessionDurationSec).toBe(
      SETTINGS_LIMITS.sessionDurationSec.max,
    );
  });

  it('replaces the v2 audio boolean with a cue mode', () => {
    expect(migrateSettings({ audioCueEnabled: true }, 2).cueMode).toBe('beep');
    expect(migrateSettings({ audioCueEnabled: false }, 2).cueMode).toBe('off');
    expect(migrateSettings({ audioCueEnabled: true }, 2)).not.toHaveProperty(
      'audioCueEnabled',
    );
  });

  it('leaves a current-version payload alone', () => {
    const current = { cueMode: 'voice', sessionDurationSec: 240 };
    expect(migrateSettings(current, 3)).toEqual(current);
  });

  it('does not mutate the stored payload', () => {
    const stored = { sessionDurationMin: 5, audioCueEnabled: false };
    migrateSettings(stored, 0);
    expect(stored).toEqual({ sessionDurationMin: 5, audioCueEnabled: false });
  });

  it('survives a missing payload', () => {
    expect(normalizeSettings(migrateSettings(null, 0))).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(migrateSettings(undefined, 3))).toEqual(DEFAULT_SETTINGS);
  });

  it('walks a v0 payload all the way to the current schema', () => {
    const settings = normalizeSettings(
      migrateSettings(
        { sessionDurationMin: 3, audioCueEnabled: false, order: 'sequential' },
        0,
      ),
    );
    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      sessionDurationSec: 180,
      cueMode: 'off',
      order: 'sequential',
    });
  });
});
