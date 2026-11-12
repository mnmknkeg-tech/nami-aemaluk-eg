import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config.
 * Runs the marketplace dev server and smoke-tests critical public pages.
 * Backend-dependent flows (checkout, login) need the Go backend running —
 * set GO_BACKEND_URL and extend the tests gradually.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/responsive-global-setup.ts',
  // Chromium launch + first compile on a cold dev server can exceed 30s here.
  timeout: 120_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev:marketplace',
        url: 'http://localhost:5174/fonts/fonts.css',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { NEXT_PUBLIC_BACKEND_URL: 'http://127.0.0.1:4179' },
      },
});
