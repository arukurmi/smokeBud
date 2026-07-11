import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseManifest, loadCompanions } from '../companions';

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

describe('loadCompanions', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('skips a folder with a malformed manifest and returns the valid ones', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'companions-'));

    const goodDir = path.join(tmpDir, 'mara');
    fs.mkdirSync(goodDir);
    fs.writeFileSync(path.join(goodDir, 'manifest.json'), JSON.stringify(valid));

    const badDir = path.join(tmpDir, 'broken');
    fs.mkdirSync(badDir);
    fs.writeFileSync(path.join(badDir, 'manifest.json'), '{ not valid json');

    const companions = loadCompanions(tmpDir);
    expect(companions).toHaveLength(1);
    expect(companions[0].id).toBe('mara');
  });
});
