import { describe, it, expect } from 'vitest';
import { parseManifest } from '../companions';

const valid = {
  name: 'Mara', scene: 'balcony at night', poster: 'poster.jpg',
  lightup: { src: 'lightup.mp4', duration: 8 },
  loops: [{ src: 'loop-1.mp4', duration: 30 }, { src: 'loop-2.mp4', duration: 28 }],
  winddown: { src: 'winddown.mp4', duration: 8 },
};

describe('parseManifest', () => {
  it('parses a valid manifest and rewrites asset URLs', () => {
    const m = parseManifest('mara', valid);
    expect(m.id).toBe('mara');
    expect(m.poster).toBe('/companions/mara/poster.jpg');
    expect(m.lightup.src).toBe('/companions/mara/lightup.mp4');
    expect(m.loops).toHaveLength(2);
  });
  it('throws when loops is empty', () => {
    expect(() => parseManifest('x', { ...valid, loops: [] })).toThrow();
  });
  it('throws when a duration is not a positive number', () => {
    expect(() => parseManifest('x', { ...valid, lightup: { src: 'a.mp4', duration: 0 } })).toThrow();
  });
});
