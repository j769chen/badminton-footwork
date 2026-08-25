import {
  ALL_CORNER_NUMBERS,
  CORNERS,
  enabledCornerList,
  isCornerEnabled,
  MAX_CORNER_TRAVEL_M,
  normalizedTravel,
  pickNext,
  repMetres,
  type Corner,
} from '@/corners';

const byNumber = (n: number): Corner => {
  const corner = CORNERS.find((c) => c.number === n);
  if (!corner) throw new Error(`no corner ${n}`);
  return corner;
};

describe('the board', () => {
  it('numbers six corners 1..6 in board order', () => {
    expect(ALL_CORNER_NUMBERS).toEqual([1, 2, 3, 4, 5, 6]);
    expect(CORNERS).toHaveLength(6);
  });
});

describe('selection', () => {
  it('reads membership by corner number', () => {
    expect(isCornerEnabled([1, 3], byNumber(1))).toBe(true);
    expect(isCornerEnabled([1, 3], byNumber(2))).toBe(false);
  });

  it('returns the selection in board order and ignores unknown numbers', () => {
    expect(enabledCornerList([5, 1, 99]).map((c) => c.number)).toEqual([1, 5]);
  });

  it('returns nothing for an empty selection', () => {
    expect(enabledCornerList([])).toEqual([]);
  });
});

describe('repMetres', () => {
  it('is symmetric across the two columns', () => {
    expect(repMetres(byNumber(1))).toBeCloseTo(repMetres(byNumber(2)), 10);
    expect(repMetres(byNumber(5))).toBeCloseTo(repMetres(byNumber(6)), 10);
  });

  it('costs less for a mid corner than a front or rear one', () => {
    expect(repMetres(byNumber(3))).toBeLessThan(repMetres(byNumber(1)));
    expect(repMetres(byNumber(3))).toBeLessThan(repMetres(byNumber(5)));
  });

  it('measures a mid corner as out and back across half the court width', () => {
    expect(repMetres(byNumber(3))).toBeCloseTo(6.1, 6);
  });
});

describe('normalizedTravel', () => {
  it('is zero with no previous target or no move', () => {
    expect(normalizedTravel(null, byNumber(4))).toBe(0);
    expect(normalizedTravel(byNumber(4), byNumber(4))).toBe(0);
  });

  it('scores the full diagonal as 1 and stays within 0..1', () => {
    expect(normalizedTravel(byNumber(1), byNumber(6))).toBeCloseTo(1, 10);
    for (const a of CORNERS) {
      for (const b of CORNERS) {
        const travel = normalizedTravel(a, b);
        expect(travel).toBeGreaterThanOrEqual(0);
        expect(travel).toBeLessThanOrEqual(1);
      }
    }
  });

  it('scales x and y separately, so the deeper move scores higher', () => {
    const frontToRear = normalizedTravel(byNumber(1), byNumber(5));
    const crossCourt = normalizedTravel(byNumber(1), byNumber(2));
    expect(frontToRear).toBeGreaterThan(crossCourt);
  });

  it('measures the longest move as the full court diagonal', () => {
    expect(MAX_CORNER_TRAVEL_M).toBeCloseTo(Math.hypot(6.1, 6.7), 6);
  });
});

describe('pickNext', () => {
  it('repeats the only corner in a single-corner pool', () => {
    const only = byNumber(4);
    expect(pickNext(null, 'random', [4])).toBe(only);
    expect(pickNext(only, 'random', [4])).toBe(only);
    expect(pickNext(only, 'sequential', [4])).toBe(only);
  });

  describe('sequential', () => {
    it('walks the enabled corners in board order and wraps', () => {
      const seen: number[] = [];
      let current: Corner | null = null;
      for (let i = 0; i < 5; i++) {
        current = pickNext(current, 'sequential', [1, 3, 5]);
        seen.push(current.number);
      }
      expect(seen).toEqual([1, 3, 5, 1, 3]);
    });

    it('restarts the walk when the current corner left the pool', () => {
      expect(pickNext(byNumber(2), 'sequential', [1, 3, 5]).number).toBe(1);
    });
  });

  describe('random', () => {
    it('never repeats the current corner', () => {
      for (const start of CORNERS) {
        for (let i = 0; i < 200; i++) {
          expect(pickNext(start, 'random', ALL_CORNER_NUMBERS)).not.toBe(start);
        }
      }
    });

    it('can reach every other corner in the pool', () => {
      const start = byNumber(1);
      const reached = new Set<number>();
      for (let i = 0; i < 500; i++) {
        reached.add(pickNext(start, 'random', ALL_CORNER_NUMBERS).number);
      }
      expect([...reached].sort()).toEqual([2, 3, 4, 5, 6]);
    });

    it('stays inside the pool when the current corner left it', () => {
      for (let i = 0; i < 200; i++) {
        expect([1, 3, 5]).toContain(
          pickNext(byNumber(2), 'random', [1, 3, 5]).number,
        );
      }
    });

    it('picks the first of the pool when random returns its floor', () => {
      const random = jest.spyOn(Math, 'random').mockReturnValue(0);
      try {
        expect(pickNext(byNumber(1), 'random', [1, 3, 5]).number).toBe(3);
        expect(pickNext(byNumber(3), 'random', [1, 3, 5]).number).toBe(1);
      } finally {
        random.mockRestore();
      }
    });
  });
});
