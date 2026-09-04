/**
 * E2E-Flow (Mobile-Emulation).
 *
 * M0 prueft nur, dass die App auf dem Handy startet, sauber laedt und als PWA
 * ausgeliefert wird. Die echten Spielszenarien aus Roadmap M1.7 — vier Spieler, drei
 * Runden, Eid-Runde, Maulwurf-Runde — kommen mit den Screens in M1 dazu.
 */

import { expect, test } from '@playwright/test';

test('startet ohne Fehler und zeigt den Titel', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));

  await page.goto('./');

  await expect(page.locator('.title__logo')).toHaveText('Der Tresor');
  await expect(page.locator('.title__tagline')).toHaveText('Teilen oder Stehlen.');
  // Startstand des Tresors bei "Normal" (GDD §3.2).
  await expect(page.locator('.title__vault')).toContainText('4');

  expect(problems).toEqual([]);
});

test('liefert ein installierbares Manifest', async ({ page, baseURL }) => {
  await page.goto('./');

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('./manifest.webmanifest');

  const response = await page.request.get(new URL('manifest.webmanifest', baseURL).toString());
  expect(response.ok()).toBe(true);

  const manifest = (await response.json()) as {
    name: string;
    display: string;
    orientation: string;
    icons: { sizes: string; purpose: string }[];
  };
  expect(manifest.name).toBe('Der Tresor');
  expect(manifest.display).toBe('standalone');
  expect(manifest.orientation).toBe('portrait');
  expect(manifest.icons.map((i) => i.sizes)).toContain('192x192');
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
});

test('haelt sich an die CSP und laedt nichts von aussen', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http://localhost') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      external.push(url);
    }
  });

  await page.goto('./');
  await page.waitForLoadState('networkidle');

  expect(external).toEqual([]);
});

test('steht im Portrait und blendet im Querformat den Hinweis ein', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.orientation-lock')).toBeHidden();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('.orientation-lock')).toBeVisible();
  await expect(page.locator('.orientation-lock__title')).toHaveText('Dreh das Handy hoch.');
});
