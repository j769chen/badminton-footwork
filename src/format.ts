/** Format a whole number of seconds as mm:ss. */
export function formatClock(
  totalSeconds: number,
  mode: 'round' | 'ceil' | 'floor' = 'round',
): string {
  const rounder =
    mode === 'ceil' ? Math.ceil : mode === 'floor' ? Math.floor : Math.round;
  const total = Math.max(0, rounder(totalSeconds));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Format the switch interval with tenth-of-a-second precision, e.g. "3.0s". */
export function formatInterval(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

/** Distance covered, e.g. "388 m" or "1.21 km". */
export function formatDistance(metres: number): string {
  const safe = Math.max(0, metres);
  if (safe >= 1000) return `${(safe / 1000).toFixed(2)} km`;
  return `${Math.round(safe)} m`;
}

/** Jitter amount, e.g. "±20%", or "Off" when the cadence is exact. */
export function formatJitter(percent: number): string {
  return percent <= 0 ? 'Off' : `±${Math.round(percent)}%`;
}

/** Switch cadence with any jitter, e.g. "2.5s" or "2.5s ±20%". */
export function formatCadence(seconds: number, jitterPercent: number): string {
  return jitterPercent > 0
    ? `${formatInterval(seconds)} ${formatJitter(jitterPercent)}`
    : formatInterval(seconds);
}

/** Lead-in length, e.g. "3s", or "Off" when there is no countdown. */
export function formatLeadIn(seconds: number): string {
  return seconds <= 0 ? 'Off' : `${Math.round(seconds)}s`;
}

/** Human-friendly duration, e.g. "10 min", "1 min 30 s", "45 s". */
export function formatDurationLabel(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  if (mm === 0) return `${ss} s`;
  if (ss === 0) return `${mm} min`;
  return `${mm} min ${ss} s`;
}
