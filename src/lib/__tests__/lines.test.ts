import { describe, it, expect } from 'vitest';
import { LINES, pickLine } from '../lines';

describe('lines', () => {
  it('has at least 10 lines', () => { expect(LINES.length).toBeGreaterThanOrEqual(10); });
  it('never repeats the excluded line', () => {
    for (let i = 0; i < 50; i++) expect(pickLine(Math.random, LINES[0])).not.toBe(LINES[0]);
  });
});
