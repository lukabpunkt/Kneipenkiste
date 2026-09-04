/**
 * E2E-Smoke-Test (M0).
 *
 * Der vollstaendige Flow — Lobby bis Result — kommt in M1, sobald es Screens gibt
 * (Roadmap M1.7). Hier steht nur, was in M0 pruefbar ist und im Audit A0 gefordert wird:
 * Der Titel laedt auf einem Handy, die PWA-Metadaten stimmen, und die Konsole ist still.
 */

import { expect, test } from '@playwright/test';

test.describe('Boot', () => {
  test('zeigt den Titel und bleibt in der Konsole still', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));

    await page.goto('./');

    await expect(page.getByRole('heading', { name: 'Sprengmeister' })).toBeVisible();
    // Der Tagline-Text kommt aus i18n — ein `[missing:…]` waere ein Fehler (CLAUDE.md).
    await expect(page.locator('.boot__tagline')).not.toContainText('[missing:');
    expect(problems).toEqual([]);
  });

  test('ist als PWA installierbar (Audit A0)', async ({ page }) => {
    await page.goto('./');

    const manifestHref = await page.locator('link[rel=manifest]').getAttribute('href');
    expect(manifestHref).toBeTruthy();

    const manifest = await page.request.get(new URL(manifestHref!, page.url()).toString());
    expect(manifest.ok()).toBe(true);

    const parsed = (await manifest.json()) as {
      name: string;
      display: string;
      orientation: string;
      icons: { sizes: string; purpose: string }[];
    };

    expect(parsed.name).toBe('Sprengmeister');
    expect(parsed.display).toBe('standalone');
    // Portrait ist Pflicht (CLAUDE.md "Mobile First").
    expect(parsed.orientation).toBe('portrait');
    expect(parsed.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any')).toBe(true);
    expect(parsed.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  test('passt ins Portrait-Format ohne Querscrollen', async ({ page }) => {
    await page.goto('./');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
});
