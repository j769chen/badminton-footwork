export type Corner = {
  /** 1-based number shown to the user. */
  number: number;
  label: string;
  /** Position as a fraction of the court area (0..1), origin top-left. */
  x: number;
  y: number;
};

/** Random (avoids immediate repeat) or sequential board order. */
export type SwitchOrder = 'random' | 'sequential';

/**
 * The footwork targets, arranged as two vertical columns sitting on the
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
 *
 * The scale stays fixed to the full court, so a narrow selection yields
 * proportionally smaller values rather than being re-stretched to 0..1.
 */
export function normalizedTravel(prev: Corner | null, next: Corner): number {
  if (prev === null || prev === next) return 0;
  return distanceBetween(prev, next) / MAX_CORNER_DISTANCE;
}

/**
 * The corners currently in play, in board order.
 *
 * `enabled` holds user-facing corner numbers; unknown numbers are ignored, so
 * the result is always a subset of `CORNERS`.
 */
export function enabledCornerList(enabled: readonly number[]): Corner[] {
  return CORNERS.filter((corner) => enabled.includes(corner.number));
}

/**
 * Pick the next target given the current one, restricted to the corners the
 * user has enabled.
 * - `random`: uniform over the other enabled corners (never repeats immediately).
 * - `sequential`: walks the enabled corners in board order, wrapping around.
 *
 * Precondition: `enabled` names at least one real corner. The settings store
 * normalises the selection on every write and on rehydration, so an empty pool
 * cannot reach here.
 */
export function pickNext(
  current: Corner | null,
  order: SwitchOrder,
  enabled: readonly number[],
): Corner {
  const pool = enabledCornerList(enabled);
  // A single corner repeats: each cue is one out-and-back rep.
  if (pool.length === 1) return pool[0];

  // A `current` outside the pool (its corner was just deselected) restarts the
  // walk rather than anchoring the next pick to a target that is no longer lit.
  const at = current === null ? -1 : pool.indexOf(current);

  if (order === 'sequential') {
    if (at === -1) return pool[0];
    return pool[(at + 1) % pool.length];
  }

  if (at === -1) return pool[Math.floor(Math.random() * pool.length)];

  let offset = Math.floor(Math.random() * (pool.length - 1));
  if (offset >= at) offset += 1;
  return pool[offset];
}
