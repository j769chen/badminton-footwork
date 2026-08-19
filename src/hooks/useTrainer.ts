import { useCallback, useEffect, useRef, useState } from 'react';

import {
  normalizedTravel,
  pickNext,
  repMetres,
  type Corner,
} from '@/corners';
import type { CuePreferences, Cues } from '@/cues';
import { useSettings } from '@/store/settings';

export type TrainerStatus =
  | 'idle'
  | 'countdown'
  | 'running'
  | 'paused'
  | 'complete';

const TICK_MS = 200;

/** Finer than `TICK_MS` so the counted seconds land close to the boundary. */
const COUNTDOWN_TICK_MS = 50;

/**
 * Extra dwell time granted to the longest possible movement, as a fraction of
 * the configured switch interval. A target sits lit for
 * `interval * (1 + DISTANCE_TIME_FACTOR * normalizedTravel)`, so the configured
 * interval is the baseline (shortest move) and farther targets get a little
 * more time to reach. Deterministic - depends only on the distance.
 */
const DISTANCE_TIME_FACTOR = 0.15;

/**
 * Scatter `holdMs` by up to `jitterPct` percent either side, so the cadence
 * cannot be anticipated. Symmetric, so the mean hold equals the configured
 * interval and a session delivers the rep count the settings imply. Floored at
 * one tick because the loop cannot resolve a shorter hold anyway.
 */
function applyJitter(holdMs: number, jitterPct: number): number {
  if (jitterPct <= 0) return holdMs;
  const fraction = jitterPct / 100;
  const scale = 1 + (Math.random() * 2 - 1) * fraction;
  return Math.max(TICK_MS, holdMs * scale);
}

function cuePreferences(): CuePreferences {
  const { cueMode, hapticCueEnabled } = useSettings.getState();
  return { mode: cueMode, haptic: hapticCueEnabled };
}

type Trainer = {
  status: TrainerStatus;
  /** The target currently lit, or null when nothing is in play. */
  activeCorner: Corner | null;
  remainingMs: number;
  totalMs: number;
  /** Time elapsed since the session started (excludes paused time). */
  elapsedMs: number;
  /** Corners called so far this session. */
  reps: number;
  /** Estimated metres covered so far, assuming a recovery to centre per rep. */
  distanceMetres: number;
  /** True when the session has no time limit (counts up, never auto-finishes). */
  untimed: boolean;
  /** Seconds still to count off during the pre-session lead-in. */
  countdownSecondsLeft: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

/**
 * Drift-free training engine. Scheduling is anchored to absolute timestamps
 * (Date.now) rather than accumulating setInterval ticks, so the session length
 * and switch cadence stay accurate even if individual ticks are late.
 */
export function useTrainer(cues: Cues): Trainer {
  const [status, setStatus] = useState<TrainerStatus>('idle');
  const [activeCorner, setActiveCorner] = useState<Corner | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [reps, setReps] = useState(0);
  const [distanceMetres, setDistanceMetres] = useState(0);
  const [untimed, setUntimed] = useState(false);
  const [countdownSecondsLeft, setCountdownSecondsLeft] = useState(0);

  // Mutable timing anchors (avoid stale closures inside the tick loop).
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAtRef = useRef(0);
  const nextSwitchAtRef = useRef(0);
  const intervalMsRef = useRef(0);
  const jitterPctRef = useRef(0);
  const activeRef = useRef<Corner | null>(null);
  const untimedRef = useRef(false);
  // Time remaining until the next switch, captured while paused.
  const pausedSwitchRemainingRef = useRef(0);
  // Anchors for the count-up elapsed clock (which excludes paused time).
  const segmentStartRef = useRef(0);
  const elapsedBeforeRef = useRef(0);
  // Lead-in anchors. The countdown reuses `tickRef`, since it never overlaps
  // the session loop.
  const countdownEndAtRef = useRef(0);
  const countdownAnnouncedRef = useRef(0);

  const clearTick = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const countRep = useCallback((corner: Corner) => {
    setReps((n) => n + 1);
    setDistanceMetres((m) => m + repMetres(corner));
  }, []);

  const cueSwitch = useCallback(
    (corner: Corner) => {
      cues.announceSwitch(cuePreferences(), corner.number);
    },
    [cues],
  );

  /** Switch to the next corner and return how long it should stay lit (ms). */
  const advanceCorner = useCallback(() => {
    const prev = activeRef.current;
    const { order, enabledCorners } = useSettings.getState();
    const next = pickNext(prev, order, enabledCorners);
    activeRef.current = next;
    setActiveCorner(next);
    cueSwitch(next);
    countRep(next);
    return applyJitter(
      intervalMsRef.current *
        (1 + DISTANCE_TIME_FACTOR * normalizedTravel(prev, next)),
      jitterPctRef.current,
    );
  }, [countRep, cueSwitch]);

  const finish = useCallback(() => {
    clearTick();
    setRemainingMs(0);
    setActiveCorner(null);
    activeRef.current = null;
    setStatus('complete');
    cues.announceComplete(cuePreferences());
  }, [cues, clearTick]);

  const tick = useCallback(() => {
    const now = Date.now();
    setElapsedMs(elapsedBeforeRef.current + (now - segmentStartRef.current));
    if (!untimedRef.current) {
      const remaining = endAtRef.current - now;
      if (remaining <= 0) {
        finish();
        return;
      }
      setRemainingMs(remaining);
    }
    if (now >= nextSwitchAtRef.current) {
      const holdMs = advanceCorner();
      const fromDeadline = nextSwitchAtRef.current + holdMs;
      nextSwitchAtRef.current = fromDeadline > now ? fromDeadline : now + holdMs;
    }
  }, [advanceCorner, finish]);

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(tick, TICK_MS);
  }, [clearTick, tick]);

  const beginSession = useCallback(() => {
    const {
      switchIntervalSec,
      sessionDurationSec,
      sessionUntimed,
      switchJitterPct,
      order,
      enabledCorners,
    } = useSettings.getState();
    const intervalMs = switchIntervalSec * 1000;
    const now = Date.now();

    intervalMsRef.current = intervalMs;
    jitterPctRef.current = switchJitterPct;
    nextSwitchAtRef.current = now + applyJitter(intervalMs, switchJitterPct);
    activeRef.current = null;
    untimedRef.current = sessionUntimed;
    segmentStartRef.current = now;
    elapsedBeforeRef.current = 0;

    setUntimed(sessionUntimed);
    setElapsedMs(0);
    setReps(0);
    setDistanceMetres(0);

    if (sessionUntimed) {
      // No countdown: the clock counts up and the session ends only on stop.
      endAtRef.current = Number.POSITIVE_INFINITY;
      setTotalMs(0);
      setRemainingMs(0);
    } else {
      const sessionMs = sessionDurationSec * 1000;
      endAtRef.current = now + sessionMs;
      setTotalMs(sessionMs);
      setRemainingMs(sessionMs);
    }

    // Immediately show (and cue) the first corner. With no previous target the
    // travel distance is zero, so its hold is the base interval, jittered - the
    // user knows when they pressed Start, so an exact first hold would be the
    // easiest of all to anticipate.
    const first = pickNext(null, order, enabledCorners);
    activeRef.current = first;
    setActiveCorner(first);
    cueSwitch(first);
    countRep(first);

    setCountdownSecondsLeft(0);
    setStatus('running');
    startTick();
  }, [countRep, cueSwitch, startTick]);

  const countdownTick = useCallback(() => {
    const remaining = countdownEndAtRef.current - Date.now();
    if (remaining <= 0) {
      clearTick();
      beginSession();
      return;
    }
    const secondsLeft = Math.ceil(remaining / 1000);
    if (secondsLeft !== countdownAnnouncedRef.current) {
      countdownAnnouncedRef.current = secondsLeft;
      setCountdownSecondsLeft(secondsLeft);
      cues.announceCountdown(cuePreferences(), secondsLeft);
    }
  }, [beginSession, clearTick, cues]);

  const start = useCallback(() => {
    const { leadInSec } = useSettings.getState();
    if (leadInSec <= 0) {
      beginSession();
      return;
    }
    clearTick();
    countdownEndAtRef.current = Date.now() + leadInSec * 1000;
    countdownAnnouncedRef.current = leadInSec;
    setCountdownSecondsLeft(leadInSec);
    setActiveCorner(null);
    activeRef.current = null;
    setReps(0);
    setDistanceMetres(0);
    setStatus('countdown');
    cues.announceCountdown(cuePreferences(), leadInSec);
    tickRef.current = setInterval(countdownTick, COUNTDOWN_TICK_MS);
  }, [beginSession, clearTick, countdownTick, cues]);

  const pause = useCallback(() => {
    if (status !== 'running') return;
    clearTick();
    const now = Date.now();
    pausedSwitchRemainingRef.current = Math.max(
      0,
      nextSwitchAtRef.current - now,
    );
    elapsedBeforeRef.current += now - segmentStartRef.current;
    setElapsedMs(elapsedBeforeRef.current);
    if (!untimedRef.current) {
      setRemainingMs(Math.max(0, endAtRef.current - now));
    }
    setStatus('paused');
  }, [status, clearTick]);

  const resume = useCallback(() => {
    if (status !== 'paused') return;
    const now = Date.now();
    segmentStartRef.current = now;
    nextSwitchAtRef.current = now + pausedSwitchRemainingRef.current;
    if (!untimedRef.current) {
      endAtRef.current = now + remainingMs;
    }
    setStatus('running');
    startTick();
  }, [status, remainingMs, startTick]);

  const stop = useCallback(() => {
    clearTick();
    setStatus('idle');
    setActiveCorner(null);
    activeRef.current = null;
    setRemainingMs(0);
    setTotalMs(0);
    setElapsedMs(0);
    elapsedBeforeRef.current = 0;
    setCountdownSecondsLeft(0);
    setReps(0);
    setDistanceMetres(0);
  }, [clearTick]);

  useEffect(() => clearTick, [clearTick]);

  return {
    status,
    activeCorner,
    remainingMs,
    totalMs,
    elapsedMs,
    reps,
    distanceMetres,
    untimed,
    countdownSecondsLeft,
    start,
    pause,
    resume,
    stop,
  };
}
