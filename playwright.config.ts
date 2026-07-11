import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:3100' },
  webServer: {
    command:
      'rm -f prisma/e2e.db && DATABASE_URL=file:./e2e.db npx prisma db push --skip-generate && ' +
      'E2E_TEST=1 DATABASE_URL=file:./e2e.db AUTH_SECRET=e2e-secret AUTH_TRUST_HOST=true PORT=3100 npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
