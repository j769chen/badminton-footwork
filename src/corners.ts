export type Corner = {
  number: number;
  label: string;
  x: number;
  y: number;
};

export type SwitchOrder = 'random' | 'sequential';

export const ORDER_LABELS: Record<SwitchOrder, string> = {
  random: 'Random',
  sequential: 'Sequential',
};

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

export const ALL_CORNER_NUMBERS: readonly number[] = CORNERS.map(
  (c) => c.number,
);

export const MIN_ENABLED_CORNERS = 1;

const COURT_WIDTH_M = 6.1;
const COURT_DEPTH_M = 6.7;
const METRES_PER_X = COURT_WIDTH_M / (RIGHT_X - LEFT_X);
const METRES_PER_Y = COURT_DEPTH_M / (BOTTOM_Y - TOP_Y);

const CENTRE = { x: 0.5, y: 0.5 };

type Point = { x: number; y: number };

const metresBetween = (a: Point, b: Point) =>
  Math.hypot((a.x - b.x) * METRES_PER_X, (a.y - b.y) * METRES_PER_Y);

export function repMetres(corner: Corner): number {
  return 2 * metresBetween(corner, CENTRE);
}

export const MAX_CORNER_TRAVEL_M = CORNERS.reduce((max, a) => {
  for (const b of CORNERS) max = Math.max(max, metresBetween(a, b));
  return max;
}, 0);

export function normalizedTravel(prev: Corner | null, next: Corner): number {
  if (prev === null || prev === next) return 0;
  return metresBetween(prev, next) / MAX_CORNER_TRAVEL_M;
}

export const isCornerEnabled = (
  enabled: readonly number[],
  corner: Corner,
): boolean => enabled.includes(corner.number);

export function enabledCornerList(enabled: readonly number[]): Corner[] {
  return CORNERS.filter((corner) => isCornerEnabled(enabled, corner));
}

export function pickNext(
  current: Corner | null,
  order: SwitchOrder,
  enabled: readonly number[],
): Corner {
  const pool = enabledCornerList(enabled);
  if (pool.length === 1) return pool[0];

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
