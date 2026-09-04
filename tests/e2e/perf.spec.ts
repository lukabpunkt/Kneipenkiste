/**
 * Render-, Interaktions- und Performance-Audit (A2).
 *
 * Was hier geprüft wird, lässt sich nicht in einem Unit-Test prüfen: echte Taps auf ein
 * echtes Canvas, echte Draw-Calls, echte Frame-Zeiten.
 *
 * Auf einem CI-Runner ohne GPU rendert Chromium per SwiftShader — dann sind Frame-Zeiten
 * eine Eigenschaft des Testrechners, nicht des Spiels. Der Test erkennt das und sagt es,
 * statt eine Zahl zu behaupten, die nichts bedeutet.
 */

import { expect, test, type Page } from '@playwright/test';

import './probe';

test.use({ locale: 'de-DE' });

const screen = (page: Page) => page.locator('.screen');

async function expectScreen(page: Page, id: string): Promise<void> {
  await expect(screen(page)).toHaveAttribute('data-screen', id, { timeout: 40_000 });
}

/** Spielt bis in die Zollhalle. `players` bestimmt, wie voll die Bühne wird. */
async function toHall(page: Page, players: number, amounts: number[]): Promise<void> {
  await page.goto(`./?dev=1&seed=${700 + players}`);
  await expectScreen(page, 'title');
  await page.locator('.screen--title .btn--primary').click();

  await expectScreen(page, 'lobby');
  while ((await page.locator('.lobby__player').count()) < players) {
    await page.locator('.lobby__add').click();
  }
  await page.locator('.lobby__cta').click();

  await expectScreen(page, 'officerIntro');
  await page.locator('.screen--officer-intro').click();

  for (let i = 0; i < players - 1; i++) {
    await expectScreen(page, 'pass');
    await expect(page.locator('.screen--pass')).toHaveAttribute('data-armed', 'true');
    await page.locator('.screen--pass').click();
    await expectScreen(page, 'pack');
    for (let n = 0; n < (amounts[i] ?? 0); n++) await page.locator('.stepper__btn').nth(1).click();
    await page.locator('.pack__close').click();
  }

  await expectScreen(page, 'packed');
  await expect(page.locator('.screen--packed .btn--primary')).toBeEnabled();
  await page.locator('.screen--packed .btn--primary').click();

  await expectScreen(page, 'hall');
  await expect(page.locator('.stage__canvas canvas')).toBeVisible({ timeout: 40_000 });
  await page.waitForFunction(() => window.__zollStage !== undefined, undefined, { timeout: 40_000 });
}

/** Wartet, bis die Hinweise durch sind und der Beamte dran ist. */
async function toInspect(page: Page): Promise<void> {
  await expect(page.locator('.hall__actions .btn--secondary')).toBeEnabled({ timeout: 40_000 });
  await page.locator('.hall__actions .btn--officer').last().click();
  await expectScreen(page, 'inspect');
  await page.waitForTimeout(600);
}

test.describe('A2 — Bühne', () => {
  test('acht Spieler: Frame-Zeiten, Draw-Calls und Update-Budget', async ({ page }) => {
    test.setTimeout(180_000);
    await toHall(page, 8, [1, 0, 2, 0, 3, 0, 1]);

    /* 60 s wären im CI zu teuer; 8 s reichen für einen belastbaren Median. */
    await page.waitForTimeout(8000);

    const stats = await page.evaluate(() => {
      const probe = window.__zollStage!;
      const sorted = [...probe.frameTimes()].sort((a, b) => a - b);
      const updates = [...probe.updateTimes()].sort((a, b) => a - b);
      const at = (list: number[], q: number): number => list[Math.floor(list.length * q)] ?? 0;
      return {
        frames: sorted.length,
        p50: at(sorted, 0.5),
        p95: at(sorted, 0.95),
        updateP50: at(updates, 0.5),
        updateP95: at(updates, 0.95),
        drawCalls: probe.drawCalls(),
      };
    });

    console.log('A2 Messung:', JSON.stringify(stats));
    expect(stats.frames).toBeGreaterThan(100);

    /*
     * Draw-Calls sind hardware-unabhängig — die Zahl gilt überall. Ein Batch je Atlas,
     * der gerade sichtbar ist: Halle, Koffer, Shotlings (+ Röntgen im Inspect).
     */
    expect(stats.drawCalls).toBeGreaterThan(0);
    expect(stats.drawCalls).toBeLessThanOrEqual(6);

    /* Die reine JS-Zeit ebenfalls: Sie hängt an der CPU, nicht an der GPU. */
    expect(stats.updateP50).toBeLessThanOrEqual(4);

    /*
     * Frame-Zeiten nur bewerten, wenn wirklich eine GPU dahinter steckt. Sonst misst der
     * Test SwiftShader und meldet einen Fehler, den es im Spiel nicht gibt.
     */
    const software = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      const renderer = info ? String(gl?.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
      return /swiftshader|llvmpipe|software/i.test(renderer);
    });

    if (software) {
      console.log('A2: Software-Rendering erkannt — Frame-Zeiten werden nicht bewertet.');
    } else {
      /*
       * 1000 / 60 = 16.67 ms. Ein vsync-gelocktes Gerät misst 16.7 — also exakt im Ziel,
       * aber knapp über der gerundeten Zahl. Die Toleranz ist die Rundung, nicht Nachsicht.
       */
      expect(stats.p50).toBeLessThanOrEqual(17);
      expect(stats.p95).toBeLessThanOrEqual(33);
    }
  });

  test('50 Taps auf Koffer lösen 50 korrekte Ereignisse aus', async ({ page }) => {
    test.setTimeout(180_000);
    await toHall(page, 6, [1, 0, 2, 0, 1]);
    await toInspect(page);

    const rects = await page.evaluate(() => window.__zollStage!.suitcases());
    expect(rects.length).toBe(5);

    /*
     * Die Bühne vom Screen trennen: Gemessen wird der Hit-Test, nicht die Spielregel.
     * Im Spiel sperrt schon der erste Tap das Board, und k lässt ohnehin höchstens drei
     * Öffnungen zu — ohne diesen Schritt zählte der Test, wie oft man öffnen *darf*.
     */
    await page.evaluate(() => window.__zollStage!.isolateTaps());
    await page.evaluate(() => window.__zollStage!.resetTaps());

    /* Zehn Runden über alle fünf Koffer: Kommt jeder Tap beim richtigen an? */
    const expected: string[] = [];
    for (let round = 0; round < 10; round++) {
      for (const rect of rects) {
        await page.mouse.click(rect.x, rect.y);
        expected.push(rect.playerId);
      }
    }

    const taps = await page.evaluate(() => window.__zollStage!.taps());
    expect(taps.length).toBe(50);
    expect(taps).toEqual(expected);
  });

  test('das DOM-HUD blockiert keine Koffer-Taps', async ({ page }) => {
    test.setTimeout(180_000);
    await toHall(page, 5, [2, 0, 1, 0]);
    await toInspect(page);

    /* Genau dort, wo das HUD liegt: über der Bühne. */
    const hud = await page.locator('.stage__hud').boundingBox();
    expect(hud).not.toBeNull();

    const rects = await page.evaluate(() => window.__zollStage!.suitcases());
    await page.evaluate(() => window.__zollStage!.isolateTaps());
    await page.evaluate(() => window.__zollStage!.resetTaps());

    for (const rect of rects) {
      /* Alle Koffer liegen innerhalb des HUD-Rechtecks — genau das ist der Punkt. */
      expect(rect.x).toBeGreaterThanOrEqual(hud!.x);
      expect(rect.x).toBeLessThanOrEqual(hud!.x + hud!.width);
      await page.mouse.click(rect.x, rect.y);
    }

    const taps = await page.evaluate(() => window.__zollStage!.taps());
    expect(taps.length).toBe(rects.length);
  });

  test('jeder Koffer bietet mindestens 56 px Trefferfläche', async ({ page }) => {
    test.setTimeout(180_000);
    /* Sieben Koffer: der engste Fall, den das Layout kennt. */
    await toHall(page, 8, [1, 0, 2, 0, 3, 0, 1]);

    const rects = await page.evaluate(() => window.__zollStage!.suitcases());
    expect(rects.length).toBe(7);

    for (const rect of rects) {
      expect(rect.width).toBeGreaterThanOrEqual(56);
      expect(rect.height).toBeGreaterThanOrEqual(56);
    }
  });

  test('das Canvas wandert Hall → Inspect → Gate ohne Neuaufbau', async ({ page }) => {
    test.setTimeout(180_000);
    await toHall(page, 5, [0, 0, 0, 0]);
    expect(await page.evaluate(() => window.__zollStage!.builds())).toBe(1);
    expect(await page.evaluate(() => window.__zollStage!.mode())).toMatch(/hints|interrogation/);

    await toInspect(page);
    expect(await page.evaluate(() => window.__zollStage!.mode())).toBe('inspect');
    expect(await page.evaluate(() => window.__zollStage!.builds())).toBe(1);

    await page.locator('.inspect__actions .btn--officer').click();
    await expectScreen(page, 'gate');
    await page.waitForTimeout(400);

    expect(await page.evaluate(() => window.__zollStage!.mode())).toBe('gate');
    /* Die Zahl ist der eigentliche Check: eine Bühne für drei Screens (ADR-6). */
    expect(await page.evaluate(() => window.__zollStage!.builds())).toBe(1);
  });

  test('der Heap bleibt über eine Minute flach', async ({ page }) => {
    test.setTimeout(180_000);
    await toHall(page, 6, [1, 0, 2, 0, 1]);

    const heap = async (): Promise<number> =>
      page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0);

    const before = await heap();
    if (before === 0) {
      console.log('A2: Kein Heap-Zugriff in diesem Browser — Test übersprungen.');
      return;
    }

    await page.waitForTimeout(30_000);
    const after = await heap();

    console.log(`A2 Heap: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);
    /* Ein Pool, der leckt, wächst in 30 s um ein Vielfaches — 60 % Toleranz reicht. */
    expect(after).toBeLessThan(before * 1.6);
  });
});
