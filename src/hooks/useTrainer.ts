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

const TICK_MS = 50;

const DISTANCE_TIME_FACTOR = 0.15;

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
  activeCorner: Corner | null;
  remainingMs: number;
  totalMs: number;
  elapsedMs: number;
  reps: number;
  distanceMetres: number;
  untimed: boolean;
  countdownSecondsLeft: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

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

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAtRef = useRef(0);
  const nextSwitchAtRef = useRef(0);
  const intervalMsRef = useRef(0);
  const jitterPctRef = useRef(0);
  const activeRef = useRef<Corner | null>(null);
  const untimedRef = useRef(false);
  const pausedSwitchRemainingRef = useRef(0);
  const segmentStartRef = useRef(0);
  const elapsedBeforeRef = useRef(0);
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
      endAtRef.current = Number.POSITIVE_INFINITY;
      setTotalMs(0);
      setRemainingMs(0);
    } else {
      const sessionMs = sessionDurationSec * 1000;
      endAtRef.current = now + sessionMs;
      setTotalMs(sessionMs);
      setRemainingMs(sessionMs);
    }

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
    setTotalMs(0);
    setRemainingMs(0);
    setElapsedMs(0);
    elapsedBeforeRef.current = 0;
    setStatus('countdown');
    cues.announceCountdown(cuePreferences(), leadInSec);
    tickRef.current = setInterval(countdownTick, TICK_MS);
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
