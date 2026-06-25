import { useCallback, useEffect, useRef, useState } from 'react';

import type { Cues } from '@/audio';
import { pickNext } from '@/corners';
import { useSettings } from '@/store/settings';

export type TrainerStatus = 'idle' | 'running' | 'paused' | 'complete';

const TICK_MS = 200;

type Trainer = {
  status: TrainerStatus;
  activeIndex: number | null;
  remainingMs: number;
  totalMs: number;
  /** Time elapsed since the session started (excludes paused time). */
  elapsedMs: number;
  /** True when the session has no time limit (counts up, never auto-finishes). */
  untimed: boolean;
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [untimed, setUntimed] = useState(false);

  // Mutable timing anchors (avoid stale closures inside the tick loop).
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAtRef = useRef(0);
  const nextSwitchAtRef = useRef(0);
  const intervalMsRef = useRef(0);
  const activeRef = useRef<number | null>(null);
  const untimedRef = useRef(false);
  // Time remaining until the next switch, captured while paused.
  const pausedSwitchRemainingRef = useRef(0);
  // Anchors for the count-up elapsed clock (which excludes paused time).
  const segmentStartRef = useRef(0);
  const elapsedBeforeRef = useRef(0);

  const clearTick = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const advanceCorner = useCallback(() => {
    const next = pickNext(activeRef.current, useSettings.getState().order);
    activeRef.current = next;
    setActiveIndex(next);
    if (useSettings.getState().audioCueEnabled) {
      cues.playSwitch();
    }
  }, [cues]);

  const finish = useCallback(() => {
    clearTick();
    setRemainingMs(0);
    setActiveIndex(null);
    activeRef.current = null;
    setStatus('complete');
    if (useSettings.getState().audioCueEnabled) {
      cues.playComplete();
    }
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
      advanceCorner();
      nextSwitchAtRef.current = now + intervalMsRef.current;
    }
  }, [advanceCorner, finish]);

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(tick, TICK_MS);
  }, [clearTick, tick]);

  const start = useCallback(() => {
    const {
      switchIntervalSec,
      sessionDurationSec,
      sessionUntimed,
      audioCueEnabled,
    } = useSettings.getState();
    const intervalMs = switchIntervalSec * 1000;
    const now = Date.now();

    intervalMsRef.current = intervalMs;
    nextSwitchAtRef.current = now + intervalMs;
    activeRef.current = null;
    untimedRef.current = sessionUntimed;
    segmentStartRef.current = now;
    elapsedBeforeRef.current = 0;

    setUntimed(sessionUntimed);
    setElapsedMs(0);

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

    // Immediately show (and cue) the first corner.
    const first = pickNext(null, useSettings.getState().order);
    activeRef.current = first;
    setActiveIndex(first);
    if (audioCueEnabled) cues.playSwitch();

    setStatus('running');
    startTick();
  }, [cues, startTick]);

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
    setActiveIndex(null);
    activeRef.current = null;
    setRemainingMs(0);
    setTotalMs(0);
    setElapsedMs(0);
    elapsedBeforeRef.current = 0;
  }, [clearTick]);

  useEffect(() => clearTick, [clearTick]);

  return {
    status,
    activeIndex,
    remainingMs,
    totalMs,
    elapsedMs,
    untimed,
    start,
    pause,
    resume,
    stop,
  };
}
