import { describe, it, expect } from 'vitest';
import { buildSequence, totalDuration } from '../sequence';
import type { CompanionManifest } from '../companions';

const m: CompanionManifest = {
  id: 'mara', name: 'Mara', scene: 'balcony', poster: '/p.jpg',
  lightup: { src: '/l.mp4', duration: 8 },
  loops: [
    { src: '/a.mp4', duration: 30 },
    { src: '/b.mp4', duration: 28 },
    { src: '/c.mp4', duration: 32 },
  ],
  winddown: { src: '/w.mp4', duration: 8 },
};

describe('buildSequence', () => {
  it('starts with lightup and ends with winddown', () => {
    const seq = buildSequence(m, 330, () => 0.5);
    expect(seq[0].phase).toBe('lightup');
    expect(seq.at(-1)!.phase).toBe('winddown');
    expect(seq.slice(1, -1).every((s) => s.phase === 'loop')).toBe(true);
  });
  it('reaches the target duration', () => {
    const seq = buildSequence(m, 330, () => 0.5);
    expect(totalDuration(seq)).toBeGreaterThanOrEqual(330);
  });
  it('never repeats the same loop clip back to back', () => {
    for (let s = 0; s < 20; s++) {
      const rnd = mulberry(s);
      const seq = buildSequence(m, 330, rnd).filter((i) => i.phase === 'loop');
      for (let i = 1; i < seq.length; i++) expect(seq[i].src).not.toBe(seq[i - 1].src);
    }
  });
  it('handles a single-loop manifest without infinite loop', () => {
    const one = { ...m, loops: [m.loops[0]] };
    const seq = buildSequence(one, 90, () => 0.5);
    expect(totalDuration(seq)).toBeGreaterThanOrEqual(90);
  });
});

function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
