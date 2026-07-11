export const LINES = [
  'long day, huh.',
  "the rain's nice tonight.",
  'no rush. it burns at its own pace.',
  "you don't have to say anything.",
  'the city never really sleeps, does it.',
  'i needed this too.',
  'breathe out slow. let it drift.',
  'five minutes is enough sometimes.',
  'whatever it was, it can wait out here.',
  'the quiet ones are the best breaks.',
  "look at that sky. doesn't ask anything of you.",
  'same time tomorrow, maybe.',
];

export function pickLine(rand: () => number = Math.random, exclude?: string): string {
  const pool = LINES.filter((l) => l !== exclude);
  const src = pool.length > 0 ? pool : LINES;
  return src[Math.floor(rand() * src.length)];
}
