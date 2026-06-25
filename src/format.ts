/** Format a whole number of seconds as mm:ss. */
export function formatClock(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Format the switch interval with tenth-of-a-second precision, e.g. "3.0s". */
export function formatInterval(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
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
