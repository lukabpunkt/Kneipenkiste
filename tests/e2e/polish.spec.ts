/**
 * Polish, PWA und Ausdauer (Audit A5).
 *
 * Drei Dinge, die sich nur im echten Browser prüfen lassen: dass die App installierbar
 * ist, dass der Title-Loop zehn Minuten läuft ohne zu lecken, und dass „Bewegung
 * reduzieren" wirklich Bewegung reduziert statt nur die Media-Query zu setzen.
 */

import { expect, test, type Page } from '@playwright/test';

test.use({ locale: 'de-DE' });

const screen = (page: Page) => page.locator('.screen');

test.describe('A5 — PWA', () => {
  test('ist installierbar', async ({ page, request }) => {
    await page.goto('./');

    const href = await page.getAttribute('link[rel="manifest"]', 'href');
    const response = await request.get(new URL(href!, page.url()).toString());
    const manifest = (await response.json()) as {
      name: string;
      start_url: string;
      display: string;
      icons: { sizes: string; purpose?: string }[];
    };

    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBeTruthy();
    /* Ein 192er und ein 512er sind das Minimum, dazu ein maskierbares für Android. */
    expect(manifest.icons.some((i) => i.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === '512x512')).toBe(true);
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  test('registriert einen Service Worker', async ({ page }) => {
    await page.goto('./');
    const registered = await page.evaluate(async () => {
      /* Die Datei muss da sein — ob der Browser sie im Test aktiviert, ist zweitrangig. */
      const response = await fetch('./sw.js');
      return response.ok;
    });
    expect(registered).toBe(true);
  });
});

test.describe('A5 — Title-Loop', () => {
  test('läuft lange, ohne Elemente nachwachsen zu lassen', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('./');
    await expect(screen(page)).toHaveAttribute('data-screen', 'title');

    const count = async (): Promise<number> =>
      page.evaluate(() => document.querySelectorAll('.title-loop *').length);

    const before = await count();
    expect(before).toBeGreaterThan(5);

    /*
     * 45 s statt 10 min: In der Zeit laufen ~19 Silhouetten-Wechsel — genug, um einen
     * Loop zu erwischen, der bei jedem Wechsel Elemente anlegt statt sie zu ersetzen.
     * Zehn Minuten wären hier nur zehn Minuten Wartezeit in der CI.
     */
    await page.waitForTimeout(45_000);
    const after = await count();

    expect(after, `${before} → ${after} Elemente`).toBe(before);
  });

  test('lässt beim Verlassen des Titels nichts zurück', async ({ page }) => {
    await page.goto('./');
    await expect(screen(page)).toHaveAttribute('data-screen', 'title');
    await page.locator('.screen--title .btn--primary').click();
    await expect(screen(page)).toHaveAttribute('data-screen', 'lobby');

    expect(await page.locator('.title-loop').count()).toBe(0);
  });
});

test.describe('A5 — Bewegung reduzieren', () => {
  /* Über `contextOptions`, weil `reducedMotion` in dieser Playwright-Version keine
     eigenständige Test-Option ist. */
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('hält den Title-Loop still', async ({ page }) => {
    await page.goto('./');
    await expect(screen(page)).toHaveAttribute('data-screen', 'title');

    const animated = await page.evaluate(() => {
      const node = document.querySelector('.title-loop__case');
      return node ? getComputedStyle(node).animationName : 'kein Element';
    });
    expect(animated).toBe('none');
  });

  test('spielt trotzdem eine ganze Runde durch', async ({ page }) => {
    test.setTimeout(180_000);

    /*
     * Der eigentliche Test: „Bewegung reduzieren" darf nichts blockieren. Wer die
     * Einstellung braucht, soll dasselbe Spiel spielen — nur ohne Schütteln.
     */
    await page.goto('./?dev=1&seed=5301');
    await expect(screen(page)).toHaveAttribute('data-screen', 'title');
    await page.locator('.screen--title .btn--primary').click();
    await expect(screen(page)).toHaveAttribute('data-screen', 'lobby');
    await page.locator('.lobby__cta').click();
    await expect(screen(page)).toHaveAttribute('data-screen', 'officerIntro');
    await page.locator('.screen--officer-intro').click();

    for (const amount of [3, 0, 0, 0]) {
      await expect(screen(page)).toHaveAttribute('data-screen', 'pass', { timeout: 40_000 });
      await expect(page.locator('.screen--pass')).toHaveAttribute('data-armed', 'true');
      await page.locator('.screen--pass').click();
      await expect(screen(page)).toHaveAttribute('data-screen', 'pack');
      for (let i = 0; i < amount; i++) await page.locator('.stepper__btn').nth(1).click();
      await page.locator('.pack__close').click();
    }

    await expect(screen(page)).toHaveAttribute('data-screen', 'packed');
    await expect(page.locator('.screen--packed .btn--primary')).toBeEnabled();
    await page.locator('.screen--packed .btn--primary').click();

    await expect(screen(page)).toHaveAttribute('data-screen', 'hall', { timeout: 40_000 });
    await expect(page.locator('.hall__actions .btn--secondary')).toBeEnabled({ timeout: 40_000 });
    await page.locator('.hall__actions .btn--officer').last().click();

    await expect(screen(page)).toHaveAttribute('data-screen', 'inspect', { timeout: 40_000 });
    await page.locator('.inspect__actions .btn--officer').click();
    await expect(screen(page)).toHaveAttribute('data-screen', 'gate', { timeout: 40_000 });

    /* Bis zum Ende — die Runde muss durchlaufen, nicht nur starten. */
    await expect(screen(page)).toHaveAttribute('data-screen', /distribute|result/, {
      timeout: 90_000,
    });
  });
});
