import { defineConfig, devices } from '@playwright/test';

/**
 * Mobile-Emulation ist Pflicht (CLAUDE.md "Mobile First").
 * Ab M1 laeuft `flow.spec.ts`, ab M3 `perf.spec.ts` (Architektur §8).
 */
export default defineConfig({
  testDir: './tests/e2e',
  /*
   * Bewusst nicht parallel: Ab M2 spielen die Tests Grab-Sequenzen in Echtzeit ab und
   * messen dabei Wartezeiten. Zwei davon gleichzeitig nehmen sich die CPU weg — die
   * Zeitmessungen werden falsch und gesunde Tests flaky.
   */
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /*
   * Fast jede Zusicherung haengt hinter einer Animation: 320 ms Wipe, 260 ms Sheet,
   * ~900 ms Grab-Anticipation. Zehn Sekunden finden echte Haenger und reparieren
   * keine gesunden Tests.
   */
  expect: { timeout: 10_000 },
  /*
   * Ein Test, der zwei komplette Runden spielt, gräbt ein Dutzend Platten in Echtzeit
   * auf. Zwei Minuten sind immer noch kurz genug, um einen echten Haenger zu finden.
   */
  timeout: 120_000,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4173/Sprengmeister/',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'iPhone 12', use: { ...devices['iPhone 12'] } },
    {
      name: 'Pixel 5',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          /*
           * Ohne diese Flags rendert Headless-Chromium per SwiftShader in Software.
           * Das Feld laeuft dann mit 30 statt 60 fps — eine Eigenschaft des
           * Testrechners, nicht des Spiels. `perf.spec.ts` (M3) erkennt das und sagt es.
           */
          args: ['--use-angle=default', '--enable-gpu', '--ignore-gpu-blocklist'],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/Sprengmeister/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
