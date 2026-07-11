import { test, expect } from '@playwright/test';
import { signInAsTestUser } from './helpers';

test('full ritual: pick → smoke → mood note → done', async ({ page }) => {
  await signInAsTestUser(page);
  await page.goto('/?fast=1');
  await page.getByTestId('companion-card-mara').click();
  // break-player wraps only position:fixed children, so it has no intrinsic
  // box size; assert it is mounted rather than "visible" (zero-size => hidden).
  await expect(page.getByTestId('break-player')).toBeAttached({ timeout: 10000 });
  await expect(page.getByTestId('canvas-scene')).toBeVisible({ timeout: 10000 }); // no video files → fallback
  await expect(page.getByTestId('subtitle')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('mood-input')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('mood-input').fill('lighter than before');
  await page.getByTestId('mood-save').click();
  await expect(page.getByText('see you next break.')).toBeVisible();
});

test('skip mood note still completes', async ({ page }) => {
  await signInAsTestUser(page, 'skipper@test.dev');
  await page.goto('/?fast=1');
  await page.getByTestId('companion-card-theo').click();
  await expect(page.getByTestId('mood-skip')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('mood-skip').click();
  await expect(page.getByTestId('restart')).toBeVisible();
});
