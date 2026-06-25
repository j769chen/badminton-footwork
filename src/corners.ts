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
 * The 6 footwork targets. Front = net side (top), Rear = baseline (bottom).
 * The player recovers to the centre between every movement.
 */
export const CORNERS: readonly Corner[] = [
  { number: 1, label: 'Front Left', x: 0.24, y: 0.13 },
  { number: 2, label: 'Front Right', x: 0.76, y: 0.13 },
  { number: 3, label: 'Mid Left', x: 0.13, y: 0.5 },
  { number: 4, label: 'Mid Right', x: 0.87, y: 0.5 },
  { number: 5, label: 'Rear Left', x: 0.24, y: 0.87 },
  { number: 6, label: 'Rear Right', x: 0.76, y: 0.87 },
];

export const CORNER_COUNT = CORNERS.length;

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
