/**
 * Playwright configuration for the end-to-end smoke tests.
 *
 * The tests run against the dependency-free static server, not the dev server, because that is
 * how GitHub Pages serves the game: no transform, no bundler, exactly the files in the repo.
 * Two browsers on a phone-sized viewport, because a phone being passed around the table is the
 * device this game is actually played on.
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  // A race takes half a minute even when it is skipped, and CI machines are slow.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: `node scripts/serve.js --port=${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
