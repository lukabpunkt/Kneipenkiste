import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PREVIEW_PORT ?? '4173';
const BASE_URL = `http://localhost:${PORT}/Zoll/`;

/**
 * Mobile-Emulation ist Pflicht (CLAUDE.md "Mobile First").
 * Ab M1 laeuft `flow.spec.ts`, ab M3 `perf.spec.ts` (Architektur §8).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /*
   * Eine gespielte Runde dauert echte Zeit: Hinweise laufen ab, der Scan stockt bei 50 %,
   * Banner stehen. Playwrights 30-s-Standard geht von statischen Seiten aus — hier waere
   * er eine Zeitmessung des Spiels, nicht ein Test seiner Funktion.
   */
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: BASE_URL, trace: 'on-first-retry' },
  projects: [
    { name: 'iPhone 12', use: { ...devices['iPhone 12'] } },
    {
      name: 'Pixel 5',
      use: {
        ...devices['Pixel 5'],
        launchOptions: { args: ['--use-angle=default', '--enable-gpu', '--ignore-gpu-blocklist'] },
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
