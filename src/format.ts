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

export function formatInterval(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

export function formatDistance(metres: number): string {
  const safe = Math.max(0, metres);
  if (safe >= 1000) return `${(safe / 1000).toFixed(2)} km`;
  return `${Math.round(safe)} m`;
}

export function formatDistanceLabel(metres: number): string {
  const safe = Math.max(0, metres);
  if (safe >= 1000) return `${(safe / 1000).toFixed(2)} kilometres`;
  const whole = Math.round(safe);
  return `${whole} ${whole === 1 ? 'metre' : 'metres'}`;
}

export function formatJitter(percent: number): string {
  return percent <= 0 ? 'Off' : `±${Math.round(percent)}%`;
}

export function formatCadence(seconds: number, jitterPercent: number): string {
  return jitterPercent > 0
    ? `${formatInterval(seconds)} ${formatJitter(jitterPercent)}`
    : formatInterval(seconds);
}

export function formatLeadIn(seconds: number): string {
  return seconds <= 0 ? 'Off' : `${Math.round(seconds)}s`;
}

export function formatDurationLabel(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  if (mm === 0) return `${ss} s`;
  if (ss === 0) return `${mm} min`;
  return `${mm} min ${ss} s`;
}
