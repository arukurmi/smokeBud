import { describe, it, expect } from 'vitest';
import { PRESENCE_WINDOW_MS, presenceCutoff, isActive } from '../presence';

describe('presence window', () => {
  const now = new Date('2026-07-11T12:00:00Z');
  it('cutoff is exactly 60s before now', () => {
    expect(presenceCutoff(now).getTime()).toBe(now.getTime() - PRESENCE_WINDOW_MS);
  });
  it('heartbeat 59s ago is active', () => {
    expect(isActive(new Date(now.getTime() - 59_000), now)).toBe(true);
  });
  it('heartbeat 61s ago is inactive', () => {
    expect(isActive(new Date(now.getTime() - 61_000), now)).toBe(false);
  });
  it('heartbeat exactly 60s ago is active (inclusive)', () => {
    expect(isActive(new Date(now.getTime() - 60_000), now)).toBe(true);
  });
});
