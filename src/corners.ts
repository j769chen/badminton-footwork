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
 * Pick the next active corner index given the current one.
 * - `random`: uniform over the other corners (never repeats immediately).
 * - `sequential`: walks 0 -> 1 -> ... -> 5 -> 0.
 */
export function pickNext(
  current: number | null,
  order: SwitchOrder,
): number {
  if (order === 'sequential') {
    if (current === null) return 0;
    return (current + 1) % CORNER_COUNT;
  }

  if (current === null) {
    return Math.floor(Math.random() * CORNER_COUNT);
  }

  let next = Math.floor(Math.random() * (CORNER_COUNT - 1));
  if (next >= current) next += 1;
  return next;
}
