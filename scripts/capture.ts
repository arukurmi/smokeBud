// Capture press screenshots (and a ritual video) against a running server.
//   BASE=http://localhost:3100 OUT=docs/press npx tsx scripts/capture.ts
// Requires the e2e-style server (E2E_TEST=1) so test-login works.
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE ?? 'http://localhost:3100';
const out = process.env.OUT ?? 'docs/press';
const viewport = { width: 1440, height: 900 };

async function signIn(page: Page, email: string) {
  await page.goto(base);
  const form = page.getByTestId('test-login');
  await form.locator('input[name=email]').fill(email);
  await form.locator('button').click();
  await Promise.race([
    page.getByTestId('companion-card-mara').waitFor({ state: 'visible' }),
    page.getByTestId('history-link').waitFor({ state: 'visible' }),
  ]);
}

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();

  // landing (signed out) — let the smoke build before shooting
  let page = await browser.newPage({ viewport });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${out}/01-landing.png` });

  // companion picker
  await signIn(page, 'press@smokebud.dev');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/02-picker.png` });

  // break scene (canvas fallback) — wait for smoke to fill in
  await page.getByTestId('companion-card-mara').click();
  await page.getByTestId('canvas-scene').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(12000);
  await page.screenshot({ path: `${out}/03-break-scene.png` });
  // catch a subtitle if one is up soon
  try {
    await page.getByTestId('subtitle').waitFor({ state: 'visible', timeout: 15000 });
    await page.screenshot({ path: `${out}/04-subtitle.png` });
  } catch { /* subtitles are on their own clock */ }
  await page.close();

  // fast ritual → mood note + done screens
  page = await browser.newPage({ viewport });
  await signIn(page, 'press@smokebud.dev');
  await page.goto(`${base}/?fast=1`);
  await page.getByTestId('companion-card-mara').click();
  await page.getByTestId('mood-input').waitFor({ state: 'visible', timeout: 20000 });
  await page.screenshot({ path: `${out}/05-mood-note.png` });
  await page.getByTestId('mood-input').fill('lighter than before');
  await page.getByTestId('mood-save').click();
  await page.getByTestId('restart').waitFor({ state: 'visible' });
  await page.screenshot({ path: `${out}/06-done.png` });

  // history
  await page.goto(`${base}/history`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${out}/07-history.png` });
  await page.close();

  // video of the real-speed ritual opening (~25s)
  const ctx = await browser.newContext({ viewport, recordVideo: { dir: out, size: viewport } });
  page = await ctx.newPage();
  await signIn(page, 'press@smokebud.dev');
  await page.getByTestId('companion-card-mara').waitFor({ state: 'visible' });
  await page.waitForTimeout(1500);
  await page.getByTestId('companion-card-mara').click();
  await page.getByTestId('canvas-scene').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(22000);
  await page.close();
  await ctx.close();

  await browser.close();
  console.log(`captured into ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
