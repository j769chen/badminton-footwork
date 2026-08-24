import {
  formatCadence,
  formatClock,
  formatDistance,
  formatDurationLabel,
  formatInterval,
  formatJitter,
  formatLeadIn,
} from '@/format';

describe('formatClock', () => {
  it('pads minutes and seconds to mm:ss', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(9)).toBe('00:09');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(900)).toBe('15:00');
  });

  it('honours the rounding mode', () => {
    expect(formatClock(59.6, 'round')).toBe('01:00');
    expect(formatClock(59.1, 'ceil')).toBe('01:00');
    expect(formatClock(59.9, 'floor')).toBe('00:59');
  });

  it('never renders a negative clock', () => {
    expect(formatClock(-5)).toBe('00:00');
  });
});

describe('formatDistance', () => {
  it('uses metres below a kilometre and km at or above', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(387.6)).toBe('388 m');
    expect(formatDistance(999.4)).toBe('999 m');
    expect(formatDistance(1000)).toBe('1.00 km');
    expect(formatDistance(1214)).toBe('1.21 km');
  });

  it('clamps negatives to zero', () => {
    expect(formatDistance(-10)).toBe('0 m');
  });
});

describe('cadence formatting', () => {
  it('renders the interval to a tenth of a second', () => {
    expect(formatInterval(2.5)).toBe('2.5s');
    expect(formatInterval(3)).toBe('3.0s');
  });

  it('reports jitter as Off only when it is zero or less', () => {
    expect(formatJitter(0)).toBe('Off');
    expect(formatJitter(-1)).toBe('Off');
    expect(formatJitter(20)).toBe('±20%');
  });

  it('appends jitter to the cadence only when it applies', () => {
    expect(formatCadence(2.5, 0)).toBe('2.5s');
    expect(formatCadence(2.5, 20)).toBe('2.5s ±20%');
  });
});

describe('formatLeadIn', () => {
  it('reports Off at zero and whole seconds otherwise', () => {
    expect(formatLeadIn(0)).toBe('Off');
    expect(formatLeadIn(3)).toBe('3s');
  });
});

describe('formatDurationLabel', () => {
  it('drops the empty half of the label', () => {
    expect(formatDurationLabel(45)).toBe('45 s');
    expect(formatDurationLabel(600)).toBe('10 min');
    expect(formatDurationLabel(90)).toBe('1 min 30 s');
  });

  it('clamps negatives to zero', () => {
    expect(formatDurationLabel(-30)).toBe('0 s');
  });
});
