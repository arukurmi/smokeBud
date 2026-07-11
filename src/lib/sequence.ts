import type { CompanionManifest, ClipPhase } from './companions';

export interface SequenceItem { phase: ClipPhase; src: string; duration: number }

export function buildSequence(
  m: CompanionManifest, targetSeconds = 330, rand: () => number = Math.random,
): SequenceItem[] {
  const seq: SequenceItem[] = [{ phase: 'lightup', ...m.lightup }];
  let total = m.lightup.duration + m.winddown.duration;
  let lastSrc = '';
  while (total < targetSeconds) {
    const pool = m.loops.length > 1 ? m.loops.filter((l) => l.src !== lastSrc) : m.loops;
    const pick = pool[Math.floor(rand() * pool.length)];
    seq.push({ phase: 'loop', ...pick });
    lastSrc = pick.src;
    total += pick.duration;
  }
  seq.push({ phase: 'winddown', ...m.winddown });
  return seq;
}

export function totalDuration(seq: SequenceItem[]): number {
  return seq.reduce((s, i) => s + i.duration, 0);
}
