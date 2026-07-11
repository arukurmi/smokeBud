import { test, expect } from '@playwright/test';
import { signInAsTestUser } from './helpers';

test('history shows streak, heat-strip and mood note after a break', async ({ page }) => {
  await signInAsTestUser(page, 'history@test.dev');
  await page.goto('/?fast=1');
  await page.getByTestId('companion-card-theo').click();
  await expect(page.getByTestId('mood-input')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('mood-input').fill('calm now');
  await page.getByTestId('mood-save').click();
  await expect(page.getByTestId('restart')).toBeVisible();
  await page.goto('/history');
  await expect(page.getByTestId('week-count')).toContainText('1 break this week');
  await expect(page.getByTestId('day-streak')).toContainText('1-day streak');
  await expect(page.getByTestId('heat-strip')).toBeVisible();
  await expect(page.getByTestId('mood-timeline')).toContainText('calm now');
});

test('favorite companion is pre-highlighted next visit', async ({ page }) => {
  await signInAsTestUser(page, 'fav@test.dev');
  await page.goto('/?fast=1');
  await page.getByTestId('companion-card-theo').click();
  await expect(page.getByTestId('mood-skip')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('mood-skip').click();
  await expect(page.getByTestId('restart')).toBeVisible();
  await page.goto('/');
  await expect(page.getByTestId('companion-card-theo')).toHaveClass(/fav/);
});
