import { test, expect } from '@playwright/test';

test('landing shows the invitation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('take a break.')).toBeVisible();
});
