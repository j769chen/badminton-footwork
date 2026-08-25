import { act, renderHook } from '@testing-library/react-native';

import { DEFAULT_SETTINGS, useSettings, type Settings } from '@/store/settings';
import { useTrainer } from '@/hooks/useTrainer';

const cues = {
  announceCountdown: jest.fn(),
  announceSwitch: jest.fn(),
  announceComplete: jest.fn(),
};

beforeAll(async () => {
  await useSettings.persist.rehydrate();
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

/**
 * Renders with real timers, then swaps in fake ones. Installing them first
 * starves the renderer's own scheduling and the hook never commits.
 */
async function mount(settings: Partial<Settings> = {}) {
  useSettings.setState({
    ...DEFAULT_SETTINGS,
    leadInSec: 0,
    switchJitterPct: 0,
    order: 'sequential',
    ...settings,
  });
  const hook = await renderHook(() => useTrainer(cues));
  jest.useFakeTimers();
  return hook;
}

type Hook = Awaited<ReturnType<typeof mount>>;

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const run = (hook: Hook, fn: (t: Hook['result']['current']) => void) =>
  act(async () => {
    fn(hook.result.current);
  });

const switchedTo = () =>
  cues.announceSwitch.mock.calls.map(([, cornerNumber]) => cornerNumber);

describe('starting a session', () => {
  it('lights and cues the first corner immediately', async () => {
    const hook = await mount({ enabledCorners: [1] });
    await run(hook, (t) => t.start());

    expect(hook.result.current.status).toBe('running');
    expect(hook.result.current.activeCorner?.number).toBe(1);
    expect(hook.result.current.reps).toBe(1);
    expect(switchedTo()).toEqual([1]);
    expect(cues.announceCountdown).not.toHaveBeenCalled();
  });

  it('holds each corner for the configured interval', async () => {
    const hook = await mount({ enabledCorners: [1], switchIntervalSec: 2 });
    await run(hook, (t) => t.start());

    await advance(2000);
    expect(hook.result.current.reps).toBe(2);
    await advance(2000);
    expect(hook.result.current.reps).toBe(3);
  });

  it('accumulates the per-rep distance', async () => {
    const hook = await mount({ enabledCorners: [3], switchIntervalSec: 2 });
    await run(hook, (t) => t.start());
    await advance(4000);

    // Corner 3 sits on a sideline level with the centre: 3.05 m out, 3.05 m
    // back, three times over.
    expect(hook.result.current.reps).toBe(3);
    expect(hook.result.current.distanceMetres).toBeCloseTo(18.3, 5);
  });
});

describe('scheduling', () => {
  it('anchors to absolute time rather than accumulating ticks', async () => {
    const hook = await mount({ enabledCorners: [1], switchIntervalSec: 2 });
    await run(hook, (t) => t.start());

    for (let i = 0; i < 4; i++) await advance(450);
    expect(hook.result.current.reps).toBe(1);

    await advance(200);
    expect(hook.result.current.reps).toBe(2);
  });

  it('does not fire a burst of switches after a long stall', async () => {
    const hook = await mount({ enabledCorners: [1], switchIntervalSec: 2 });
    await run(hook, (t) => t.start());

    // The clock jumps without the loop running, as when the OS suspends the
    // app. Fifteen intervals elapse but only one switch is owed.
    jest.setSystemTime(Date.now() + 30_000);
    await advance(500);
    expect(hook.result.current.reps).toBe(2);
  });

  it('grants a longer move more dwell time', async () => {
    // 1 and 6 are opposite corners, the longest move on the court, so its hold
    // is the interval plus the full 15%.
    const hook = await mount({ enabledCorners: [1, 6], switchIntervalSec: 2 });
    await run(hook, (t) => t.start());

    await advance(2000);
    expect(hook.result.current.activeCorner?.number).toBe(6);
    expect(hook.result.current.reps).toBe(2);

    await advance(2250);
    expect(hook.result.current.reps).toBe(2);
    await advance(50);
    expect(hook.result.current.reps).toBe(3);
  });
});

describe('the get-ready countdown', () => {
  it('counts off each second before the first corner lights', async () => {
    const hook = await mount({ enabledCorners: [1], leadInSec: 3 });
    await run(hook, (t) => t.start());

    expect(hook.result.current.status).toBe('countdown');
    expect(hook.result.current.countdownSecondsLeft).toBe(3);
    expect(hook.result.current.activeCorner).toBeNull();
    expect(hook.result.current.reps).toBe(0);

    await advance(1000);
    expect(hook.result.current.countdownSecondsLeft).toBe(2);
    await advance(1000);
    expect(hook.result.current.countdownSecondsLeft).toBe(1);

    expect(cues.announceCountdown.mock.calls.map(([, n]) => n)).toEqual([3, 2, 1]);
    expect(cues.announceSwitch).not.toHaveBeenCalled();

    await advance(1000);
    expect(hook.result.current.status).toBe('running');
    expect(hook.result.current.activeCorner?.number).toBe(1);
  });
});

describe('pause and resume', () => {
  it('preserves the remainder of the current hold', async () => {
    const hook = await mount({ enabledCorners: [1], switchIntervalSec: 2 });
    await run(hook, (t) => t.start());

    await advance(1500);
    await run(hook, (t) => t.pause());
    expect(hook.result.current.status).toBe('paused');

    await advance(10_000);
    expect(hook.result.current.reps).toBe(1);

    await run(hook, (t) => t.resume());
    await advance(450);
    expect(hook.result.current.reps).toBe(1);
    await advance(50);
    expect(hook.result.current.reps).toBe(2);
  });

  it('excludes paused time from the elapsed clock', async () => {
    const hook = await mount({ enabledCorners: [1], sessionUntimed: true });
    await run(hook, (t) => t.start());

    await advance(1000);
    await run(hook, (t) => t.pause());
    await advance(5000);
    await run(hook, (t) => t.resume());
    await advance(1000);

    expect(hook.result.current.elapsedMs).toBe(2000);
  });

  it('holds the countdown steady while paused', async () => {
    const hook = await mount({ enabledCorners: [1], sessionDurationSec: 60 });
    await run(hook, (t) => t.start());

    await advance(1000);
    await run(hook, (t) => t.pause());
    const atPause = hook.result.current.remainingMs;
    expect(atPause).toBe(59_000);

    await advance(10_000);
    expect(hook.result.current.remainingMs).toBe(atPause);

    await run(hook, (t) => t.resume());
    await advance(1000);
    expect(hook.result.current.remainingMs).toBe(58_000);
  });

  it('ignores pause unless running and resume unless paused', async () => {
    const hook = await mount({ enabledCorners: [1] });

    await run(hook, (t) => t.pause());
    expect(hook.result.current.status).toBe('idle');

    await run(hook, (t) => t.start());
    await run(hook, (t) => t.resume());
    expect(hook.result.current.status).toBe('running');
  });
});

describe('finishing', () => {
  it('completes a timed session and announces it', async () => {
    const hook = await mount({ enabledCorners: [1], sessionDurationSec: 10 });
    await run(hook, (t) => t.start());
    await advance(10_000);

    expect(hook.result.current.status).toBe('complete');
    expect(hook.result.current.activeCorner).toBeNull();
    expect(hook.result.current.remainingMs).toBe(0);
    expect(cues.announceComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps the session stats on the completion screen', async () => {
    const hook = await mount({ enabledCorners: [1], sessionDurationSec: 10 });
    await run(hook, (t) => t.start());
    await advance(10_000);

    expect(hook.result.current.status).toBe('complete');
    expect(hook.result.current.reps).toBeGreaterThan(1);
    expect(hook.result.current.distanceMetres).toBeGreaterThan(0);
  });

  it('never ends an untimed session on its own', async () => {
    const hook = await mount({ enabledCorners: [1], sessionUntimed: true });
    await run(hook, (t) => t.start());
    await advance(600_000);

    expect(hook.result.current.status).toBe('running');
    expect(hook.result.current.untimed).toBe(true);
    expect(hook.result.current.totalMs).toBe(0);
    expect(hook.result.current.elapsedMs).toBe(600_000);
    expect(cues.announceComplete).not.toHaveBeenCalled();
  });

  it('clears the previous clock when restarting after completion', async () => {
    // Regression: the lead-in used to leave the finished session's totalMs in
    // place while remainingMs was zero, so the progress bar rendered full.
    const hook = await mount({
      enabledCorners: [1],
      sessionDurationSec: 30,
      leadInSec: 3,
    });
    await run(hook, (t) => t.start());
    await advance(3000);
    await advance(30_000);
    expect(hook.result.current.status).toBe('complete');
    expect(hook.result.current.totalMs).toBe(30_000);

    await run(hook, (t) => t.start());
    expect(hook.result.current.status).toBe('countdown');
    expect(hook.result.current.totalMs).toBe(0);
    expect(hook.result.current.remainingMs).toBe(0);
    expect(hook.result.current.elapsedMs).toBe(0);
  });

  it('resets everything on stop', async () => {
    const hook = await mount({ enabledCorners: [1], sessionDurationSec: 60 });
    await run(hook, (t) => t.start());
    await advance(4000);
    await run(hook, (t) => t.stop());

    expect(hook.result.current).toMatchObject({
      status: 'idle',
      activeCorner: null,
      reps: 0,
      distanceMetres: 0,
      remainingMs: 0,
      totalMs: 0,
      elapsedMs: 0,
      countdownSecondsLeft: 0,
    });
  });
});

describe('cadence variation', () => {
  it.each([
    ['the shortest', 0, 1000],
    ['the mean', 0.5, 2000],
    ['the longest', 1, 3000],
  ])('scatters the hold to %s of the symmetric range', async (_label, roll, hold) => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(roll);
    try {
      const hook = await mount({
        enabledCorners: [1],
        switchIntervalSec: 2,
        switchJitterPct: 50,
      });
      await run(hook, (t) => t.start());

      await advance(hold - 50);
      expect(hook.result.current.reps).toBe(1);
      await advance(50);
      expect(hook.result.current.reps).toBe(2);
    } finally {
      random.mockRestore();
    }
  });
});

describe('reading settings mid-session', () => {
  it('picks the next corner from the live selection', async () => {
    const hook = await mount({ enabledCorners: [1, 2], switchIntervalSec: 2 });
    await run(hook, (t) => t.start());
    expect(hook.result.current.activeCorner?.number).toBe(1);

    useSettings.setState({ enabledCorners: [5, 6] });
    await advance(2000);

    expect(hook.result.current.activeCorner?.number).toBe(5);
  });

  it('keeps the cadence it started with', async () => {
    const hook = await mount({ enabledCorners: [1], switchIntervalSec: 2 });
    await run(hook, (t) => t.start());

    useSettings.setState({ switchIntervalSec: 10 });
    await advance(2000);

    expect(hook.result.current.reps).toBe(2);
  });
});

describe('teardown', () => {
  it('leaves no interval running after unmount', async () => {
    const hook = await mount({ enabledCorners: [1], switchIntervalSec: 2 });
    await run(hook, (t) => t.start());
    await advance(2000);
    expect(cues.announceSwitch).toHaveBeenCalledTimes(2);

    await hook.unmount();
    jest.advanceTimersByTime(20_000);

    // A surviving loop would keep cueing switches long after the screen is gone.
    expect(cues.announceSwitch).toHaveBeenCalledTimes(2);
  });
});
