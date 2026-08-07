import type { SwitchOrder } from '@/store/settings';

export type Corner = {
  /** 1-based number shown to the user. */
  number: number;
  label: string;
  /** Position as a fraction of the court area (0..1), origin top-left. */
  x: number;
  y: number;
};

/**
 * The 6 footwork targets, arranged as two vertical columns sitting on the
 * court's left and right sidelines. Front = net side (top), Rear = baseline
 * (bottom). The player recovers to the centre between every movement.
 *
 * Left column (1, 3, 5) shares an x; right column (2, 4, 6) shares an x, so the
 * numbers line up vertically along each border.
 */
const LEFT_X = 0.12;
const RIGHT_X = 0.88;
const TOP_Y = 0.14;
const MID_Y = 0.5;
const BOTTOM_Y = 0.86;

export const CORNERS: readonly Corner[] = [
  { number: 1, label: 'Front Left', x: LEFT_X, y: TOP_Y },
  { number: 2, label: 'Front Right', x: RIGHT_X, y: TOP_Y },
  { number: 3, label: 'Mid Left', x: LEFT_X, y: MID_Y },
  { number: 4, label: 'Mid Right', x: RIGHT_X, y: MID_Y },
  { number: 5, label: 'Rear Left', x: LEFT_X, y: BOTTOM_Y },
  { number: 6, label: 'Rear Right', x: RIGHT_X, y: BOTTOM_Y },
];

export const CORNER_COUNT = CORNERS.length;

export const ALL_CORNER_NUMBERS: readonly number[] = CORNERS.map(
  (c) => c.number,
);

/**
 * At least one corner must stay in play. A single corner is a valid drill: the
 * player still moves out to it and recovers to the centre on every cue.
 */
export const MIN_ENABLED_CORNERS = 1;

/**
 * Map the user-facing corner numbers stored in settings to positions in
 * `CORNERS`, in board order. Unknown numbers are ignored, so a stale persisted
 * selection can never produce an out-of-range index.
 */
export function toCornerIndices(numbers: readonly number[]): number[] {
  const wanted = new Set(numbers);
  return CORNERS.reduce<number[]>((acc, corner, index) => {
    if (wanted.has(corner.number)) acc.push(index);
    return acc;
  }, []);
}

const distanceBetween = (a: Corner, b: Corner) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** Largest distance between any two targets, used to normalise travel to 0..1. */
export const MAX_CORNER_DISTANCE = CORNERS.reduce((max, a) => {
  for (const b of CORNERS) max = Math.max(max, distanceBetween(a, b));
  return max;
}, 0);

/**
 * How far the player travels from the previous target to the next one,
 * normalised to 0..1 (0 = no previous target / no move, 1 = the longest
 * possible diagonal). Deterministic: depends only on the two positions.
 */
export function normalizedTravel(
  prevIndex: number | null,
  nextIndex: number,
): number {
  if (prevIndex === null || prevIndex === nextIndex) return 0;
  return distanceBetween(CORNERS[prevIndex], CORNERS[nextIndex]) /
    MAX_CORNER_DISTANCE;
}

/**
 * Pick the next active corner index given the current one, restricted to the
 * corners the user has enabled (`enabled` holds indices into `CORNERS`, in
 * board order).
 * - `random`: uniform over the other enabled corners (never repeats immediately).
 * - `sequential`: walks the enabled corners in board order, wrapping around.
 */
export function pickNext(
  current: number | null,
  order: SwitchOrder,
  enabled: readonly number[],
): number {
  const pool = enabled.length > 0 ? enabled : CORNERS.map((_, i) => i);
  // A single corner repeats: each cue is one out-and-back rep.
  if (pool.length === 1) return pool[0];

  if (order === 'sequential') {
    if (current === null) return pool[0];
    const at = pool.indexOf(current);
    // A `current` outside the pool (the corner was just disabled) restarts the
    // walk from the beginning.
    if (at === -1) return pool[0];
    return pool[(at + 1) % pool.length];
  }

  const at = current === null ? -1 : pool.indexOf(current);
  if (at === -1) return pool[Math.floor(Math.random() * pool.length)];

  let offset = Math.floor(Math.random() * (pool.length - 1));
  if (offset >= at) offset += 1;
  return pool[offset];
}
