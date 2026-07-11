import { test, expect } from '@playwright/test';
import { signInAsTestUser } from './helpers';

test('presence counter shows during a session', async ({ page }) => {
  await signInAsTestUser(page, 'presence@test.dev');
  await page.goto('/?fast=1');
  await page.getByTestId('companion-card-mara').click();
  await expect(page.getByTestId('presence')).toContainText('on a smoke break right now', { timeout: 10000 });
});

test('presence counter hides when the api fails', async ({ page }) => {
  await signInAsTestUser(page, 'presence2@test.dev');
  await page.route('**/api/presence', (r) => r.abort());
  await page.goto('/?fast=1');
  await page.getByTestId('companion-card-mara').click();
  // break-player wraps only position:fixed children, so it has no intrinsic
  // box size; assert it is mounted rather than "visible" (zero-size => hidden).
  await expect(page.getByTestId('break-player')).toBeAttached();
  await page.waitForTimeout(3000);
  await expect(page.getByTestId('presence')).toHaveCount(0);
});
