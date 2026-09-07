/**
 * M0: Rauchtest. Er beantwortet genau die zwei Fragen der DoD — laedt die App auf einem
 * Handy, und ist sie installierbar? Der gespielte Flow kommt in M1 (Roadmap M1.6).
 */

import { expect, test } from '@playwright/test';

test('startet ohne Fehler und zeigt den Titel', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('./');

  await expect(page.locator('h1')).toHaveText('Die Hängebrücke');
  /* Standing Audit: keine console.error im E2E. */
  expect(errors).toEqual([]);
});

test('ist als PWA installierbar', async ({ page, request }) => {
  await page.goto('./');

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();

  const manifest = await (await request.get(new URL(href!, page.url()).toString())).json();
  expect(manifest.name).toBe('Die Hängebrücke');
  expect(manifest.display).toBe('standalone');
  expect(manifest.orientation).toBe('portrait');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
});

test('folgt der Browsersprache', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-GB' });
  const page = await context.newPage();
  await page.goto('/Haengebruecke/');

  await expect(page.locator('h1')).toHaveText('The Rope Bridge');
  expect(await page.locator('html').getAttribute('lang')).toBe('en');
  await context.close();
});

test('bleibt im Portrait-Rahmen, ohne horizontal zu scrollen', async ({ page }) => {
  await page.goto('./');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
