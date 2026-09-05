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

  test('registriert einen Service Worker, der die Seite auch wirklich kontrolliert', async ({
    page,
  }) => {
    await page.goto('./');

    /*
     * Nicht „die Datei wird ausgeliefert" — das war sie auch, als niemand sie anmeldete,
     * und offline blieb die App leer. Geprueft wird, was zaehlt: Ein Worker uebernimmt
     * das Dokument, und der Precache steht (ADR-25).
     */
    const state = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      while (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const names = await caches.keys();
      const precache = names.find((name) => name.includes('precache'));
      const entries = precache ? (await (await caches.open(precache)).keys()).length : 0;
      return { scope: registration.scope, controlled: true, entries };
    });

    expect(state.controlled).toBe(true);
    expect(state.scope).toContain('/Zoll/');
    /* Ohne Atlanten, Fonts und den Hall-Chunk waere „offline" ein leeres Versprechen. */
    expect(state.entries).toBeGreaterThan(20);
  });

  test('startet ohne Netz', async ({ page, context }) => {
    await page.goto('./');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      while (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });

    /*
     * Der Test, der bisher ein Mensch mit einem Geraet im Flugmodus war. Ein Partyspiel
     * im Keller oder im Zug muss starten, auch wenn nichts geht.
     */
    await context.setOffline(true);
    await page.reload();

    await expect(screen(page)).toHaveAttribute('data-screen', 'title');
    await expect(page.locator('.screen--title .btn--primary')).toBeVisible();

    await context.setOffline(false);
  });

  test('faengt einen Chunk aus einem alten Build ab und laedt genau einmal neu', async ({
    page,
  }) => {
    await page.goto('./');

    let loads = 0;
    page.on('load', () => {
      loads += 1;
    });

    /*
     * Genau die Lage nach einem Deploy: Die `index.html` liegt noch im Cache und
     * verweist auf Chunks, die der Server nicht mehr hat. Der Einstieg ist zu diesem
     * Zeitpunkt geladen — alles Weitere sind die nachgeladenen Bruchstuecke.
     */
    await page.route('**/assets/*.js', (route) => route.fulfill({ status: 404, body: '' }));

    /* In die Lobby: Dort startet der Nachladevorgang der Halle. */
    await page.locator('.screen--title .btn--primary').click();

    await expect
      .poll(() => loads, { timeout: 15_000, message: 'Die Seite hat nicht neu geladen' })
      .toBe(1);

    /*
     * Und danach Ruhe. Ein zweiter Fehlschlag liegt nicht am Cache; eine Schleife aus
     * Neuladen waere schlimmer als eine Fehlermeldung.
     */
    await page.waitForTimeout(4_000);
    expect(loads, 'mehr als einmal neu geladen').toBe(1);
    expect(await page.evaluate(() => sessionStorage.getItem('zoll.staleChunkReload'))).toBe('1');
  });
});

test.describe('A5 — Title-Loop', () => {
  test('läuft lange, ohne Elemente nachwachsen zu lassen', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('./');
    await expect(screen(page)).toHaveAttribute('data-screen', 'title');

    /*
     * Gezaehlt wird alles ausser der Silhouette selbst. Sie wird bei jedem Wechsel
     * ersetzt, und die Item-Sets bestehen aus unterschiedlich vielen SVG-Elementen
     * (Kaese 1, Enten 3) — wer sie mitzaehlt, misst das Item-Set und nicht ein Leck.
     * Dass die Silhouette ihrerseits nicht waechst, steht als eigene Schranke daneben.
     */
    const count = async (): Promise<{ frame: number; silhouette: number }> =>
      page.evaluate(() => {
        const all = document.querySelectorAll('.title-loop *').length;
        const silhouette = document.querySelectorAll('.title-loop__silhouette *').length;
        return { frame: all - silhouette, silhouette };
      });

    const before = await count();
    expect(before.frame).toBeGreaterThan(5);

    /*
     * 45 s statt 10 min: In der Zeit laufen ~19 Silhouetten-Wechsel — genug, um einen
     * Loop zu erwischen, der bei jedem Wechsel Elemente anlegt statt sie zu ersetzen.
     * Zehn Minuten wären hier nur zehn Minuten Wartezeit in der CI.
     */
    await page.waitForTimeout(45_000);
    const after = await count();

    expect(after.frame, `${before.frame} → ${after.frame} Elemente`).toBe(before.frame);
    expect(after.silhouette, `Silhouette: ${after.silhouette} Elemente`).toBeLessThanOrEqual(3);
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
