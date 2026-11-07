import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  timeout: 45000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4318', viewport: { width: 1440, height: 1000 }, trace: 'on-first-retry', screenshot: 'only-on-failure',
    ...(process.env['PLAYWRIGHT_CHANNEL'] ? { channel: process.env['PLAYWRIGHT_CHANNEL'] } : {}) },
  webServer: { command: 'node scripts/e2e-server.mjs', url: 'http://127.0.0.1:4318/health', reuseExistingServer: false, timeout: 60000 },
});
