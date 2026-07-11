import { describe, it, expect } from 'vitest';
import { breaksThisWeek, dayStreak, heatStrip } from '../streaks';

const d = (s: string) => new Date(s);
const now = d('2026-07-11T15:00:00'); // a Saturday

describe('breaksThisWeek', () => {
  it('counts sessions since Monday only', () => {
    const dates = [d('2026-07-06T09:00:00'), d('2026-07-10T22:00:00'), d('2026-07-05T09:00:00')]; // Mon, Fri, prev Sun
    expect(breaksThisWeek(dates, now)).toBe(2);
  });
  it('returns 0 for empty history', () => { expect(breaksThisWeek([], now)).toBe(0); });
});

describe('dayStreak', () => {
  it('counts consecutive days ending today', () => {
    const dates = [d('2026-07-11T08:00:00'), d('2026-07-10T08:00:00'), d('2026-07-09T08:00:00'), d('2026-07-07T08:00:00')];
    expect(dayStreak(dates, now)).toBe(3);
  });
  it('streak survives when today has no break yet (ends yesterday)', () => {
    const dates = [d('2026-07-10T08:00:00'), d('2026-07-09T08:00:00')];
    expect(dayStreak(dates, now)).toBe(2);
  });
  it('is 0 when last break was 2+ days ago', () => {
    expect(dayStreak([d('2026-07-08T08:00:00')], now)).toBe(0);
  });
});

describe('heatStrip', () => {
  it('returns one bucket per day, oldest first, with counts', () => {
    const strip = heatStrip([d('2026-07-11T08:00:00'), d('2026-07-11T20:00:00')], now, 7);
    expect(strip).toHaveLength(7);
    expect(strip.at(-1)).toEqual({ date: '2026-07-11', count: 2 });
    expect(strip[0].count).toBe(0);
  });
});
