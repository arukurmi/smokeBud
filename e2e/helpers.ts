import type { Page } from '@playwright/test';

export async function signInAsTestUser(page: Page, email = 'e2e@test.dev') {
  await page.goto('/');
  const form = page.getByTestId('test-login');
  await form.locator('input[name=email]').fill(email);
  await form.locator('button').click();
  await Promise.race([
    page.getByTestId('companion-card-mara').waitFor({ state: 'visible' }),
    page.getByTestId('history-link').waitFor({ state: 'visible' }),
  ]);
}
