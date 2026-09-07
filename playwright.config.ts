import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PREVIEW_PORT ?? '4173';
const BASE_URL = `http://localhost:${PORT}/Haengebruecke/`;

/**
 * Mobile-Emulation ist Pflicht (CLAUDE.md "Mobile First").
 * In M0 laeuft nur der Boot-Rauchtest; ab M1 der komplette Flow, ab M3 `perf.spec.ts`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /*
   * Eine gespielte Runde dauert echte Zeit: Der Countdown laeuft ab, die Show braucht bis
   * zu 20 Sekunden, Banner stehen. Playwrights 30-s-Standard geht von statischen Seiten
   * aus — hier waere er eine Zeitmessung des Spiels, nicht ein Test seiner Funktion.
   */
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  /* Die App erkennt die Browsersprache; die Referenz ist Deutsch (CLAUDE.md). */
  use: { baseURL: BASE_URL, locale: 'de-DE', trace: 'on-first-retry' },
  projects: [
    { name: 'iPhone 12', use: { ...devices['iPhone 12'] } },
    {
      name: 'Pixel 5',
      use: {
        ...devices['Pixel 5'],
        /*
         * SwiftShader statt echter GPU: Headless-Chromium hat in CI keine, und ohne
         * WebGL startet die PIXI-Schlucht gar nicht erst. Die Frame-Zeiten sind damit
         * eine Aussage über **unseren** Code, nicht über die Grafikkarte — die Aussage
         * über das Referenzgerät macht der manuelle Check in A2.
         */
        launchOptions: {
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
        },
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
