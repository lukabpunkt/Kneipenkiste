/**
 * E2E-Grundlage.
 *
 * M0 hat nur den Titel — der komplette Durchlauf (Lobby bis Result) kommt in M1.7.
 * Was hier schon geprueft wird: Die App startet ohne Konsolen-Fehler auf beiden
 * Referenzgeraeten, sie laedt keine externen Ressourcen und sie ist installierbar.
 */

import { expect, test } from '@playwright/test';

test('startet ohne Konsolen-Fehler und zeigt den Titel', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('./');
  /* Der Titel kommt aus i18n — welche Sprache, entscheidet der Browser (CLAUDE.md). */
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Der Zoll|Customs/);

  expect(errors).toEqual([]);
});

test.describe('Sprachwahl', () => {
  test.use({ locale: 'de-DE' });

  test('zeigt einem deutschen Browser Deutsch', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Der Zoll');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });
});

test.describe('Sprachwahl (EN)', () => {
  test.use({ locale: 'en-GB' });

  test('zeigt einem englischen Browser Englisch', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Customs');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('macht keine externen Requests (CLAUDE.md: kein Backend, keine Analytics)', async ({ page }) => {
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

test('liefert ein installierbares Manifest', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.getAttribute('link[rel="manifest"]', 'href');
  expect(href).toBeTruthy();

  const response = await request.get(new URL(href!, page.url()).toString());
  expect(response.ok()).toBe(true);

  const manifest = (await response.json()) as { name: string; display: string; icons: unknown[] };
  expect(manifest.name).toBe('Der Zoll');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
});

test('bleibt im Portrait-Frame ohne horizontales Scrollen', async ({ page }) => {
  await page.goto('./');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});
