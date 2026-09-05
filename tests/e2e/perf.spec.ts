/**
 * Performance des Feldes (Roadmap M2, Audit A2).
 *
 * Der schwerste Fall des Spiels: **6 × 6 mit 8 Diggers.** 36 Platten, 8 gerigte Figuren,
 * Wiese, Zaun, Baum — und darauf laeuft die Grabung mit Kamera-Zoom und Shake.
 *
 * Gemessen wird, was das Audit verlangt:
 * - Frame-Zeit p50 ≤ 16,7 ms, p95 ≤ 33 ms (60 fps mit Luft nach oben)
 * - hoechstens 3 Draw-Batches
 * - flacher Heap ueber 30 s
 *
 * **Zur Aussagekraft:** Headless-Chromium rendert je nach Maschine per SwiftShader in
 * Software. Der Test sagt das dann und wertet die Frame-Zeiten als Hinweis statt als
 * Urteil — eine Zahl, die nur den Testrechner beschreibt, waere schlimmer als keine.
 * Verbindlich ist die Messung auf dem Referenzgeraet (CLAUDE.md).
 */

import { expect, test, type Page } from '@playwright/test';
import {
  buryMines,
  drawCalls,
  frameTimes,
  openLobby,
  startDigging,
  tapCell,
  waitForBoard,
} from './helpers';

/**
 * Das Frame-Budget aus Audit A2 — plus eine Millisekunde Messtoleranz.
 *
 * 60 fps heisst 16,7 ms. Ein an die Bildwiederholung gekoppelter Loop liefert aber
 * `performance.now()`-Abstaende von 16,6 bis 17,0 ms, je nachdem, wo im Intervall gemessen
 * wird — die Grenze exakt auf 16,7 zu legen hiesse, eine Zahl **unterhalb** des
 * Vsync-Abstands zu fordern. Was der Test wirklich sucht, sind ausgelassene Frames, und
 * die liegen bei 33 ms; alles um 17 ms ist ein sauberes 60-Hz-Bild.
 */
const FRAME_BUDGET_MS = 16.7 + 1;
const DROPPED_FRAME_MS = 33;

/** p-Quantil einer Messreihe. */
function quantile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[index]!;
}

/** Laeuft das Rendern in Software? Dann ist die Frame-Zeit eine Eigenschaft des Rechners. */
async function isSoftwareRenderer(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return true;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|software/i.test(renderer);
  });
}

test.describe('Feld-Performance (Audit A2)', () => {
  test('haelt 6 × 6 mit 8 Diggers fluessig', async ({ page }) => {
    test.setTimeout(120_000);

    await openLobby(page, { players: 8, seed: 12 });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await buryMines(page, 8);
    await startDigging(page);
    await waitForBoard(page);

    // 30 s Leerlauf: Das Feld steht, die Platten wackeln, die Diggers atmen.
    await page.waitForTimeout(30_000);

    const idle = await frameTimes(page);
    expect(idle.length).toBeGreaterThan(60);

    const p50 = quantile(idle, 0.5);
    const p95 = quantile(idle, 0.95);
    const software = await isSoftwareRenderer(page);

    console.info(
      `[perf] p50 ${p50.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms · ` +
        `draws ${await drawCalls(page)} · ${software ? 'Software-Renderer' : 'GPU'}`
    );

    // Draw-Batches gelten immer — sie haengen nicht an der Maschine.
    const draws = await drawCalls(page);
    expect(draws).toBeGreaterThan(0);
    expect(draws).toBeLessThanOrEqual(3);

    if (software) {
      /*
       * Ohne GPU sagt die Frame-Zeit nichts ueber das Spiel. Statt eine Zahl zu
       * erfinden, wird hier nur geprueft, dass ueberhaupt gerendert wird — und die
       * Messung fuer das Referenzgeraet bleibt ein manueller Check (Audit A2).
       */
      expect(p50).toBeLessThan(100);
      return;
    }

    expect(p50).toBeLessThanOrEqual(FRAME_BUDGET_MS);
    expect(p95).toBeLessThanOrEqual(DROPPED_FRAME_MS);
  });

  test('haelt den Heap flach, wenn dieselbe Runde weiterlaeuft', async ({ page }) => {
    test.setTimeout(120_000);

    await openLobby(page, { players: 8, seed: 13 });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await buryMines(page, 8);
    await startDigging(page);
    await waitForBoard(page);

    const heap = (): Promise<number> =>
      page.evaluate(
        () => (performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0
      );

    const before = await heap();
    // Zehn Grabungen mit voller Inszenierung — Kamera, Banner, Ringe, Digger-Wege.
    for (let cell = 0; cell < 10; cell++) {
      if (!(await page.locator('[data-screen="dig"]').isVisible())) break;
      await tapCell(page, cell, 6, 8);
      await page.waitForTimeout(3500);
    }
    const after = await heap();

    if (before === 0 || after === 0) {
      test.skip(true, 'performance.memory ist in diesem Browser nicht verfuegbar.');
      return;
    }

    /*
     * Pools statt Allokationen im Loop (CLAUDE.md): Zehn Grabungen duerfen den Heap
     * nicht verdoppeln. Grosszuegig gefasst, weil der GC selbst entscheidet, wann er
     * laeuft — ein echtes Leck faellt trotzdem auf.
     */
    console.info(`[perf] Heap ${(before / 1e6).toFixed(1)} → ${(after / 1e6).toFixed(1)} MB`);
    expect(after).toBeLessThan(before * 2);
  });

  test('bricht waehrend der Sequenzen nicht ein (Roadmap M3.8)', async ({ page }) => {
    test.setTimeout(120_000);

    /*
     * Der Leerlauf-Test oben misst ein stehendes Feld. Hier laeuft das Gegenteil: Kamera,
     * Digger, Platte, Ringe und Sequenz gleichzeitig — der einzige Moment, in dem das
     * Spiel wirklich etwas zu tun hat. Genau hier faellt eine teure Sequenz auf.
     */
    await openLobby(page, { players: 8, seed: 14 });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await buryMines(page, 8);
    await startDigging(page);
    await waitForBoard(page);

    // Leerlauf-Messungen aussortieren: erst graben, dann ablesen.
    const during: number[] = [];
    for (let cell = 0; cell < 6; cell++) {
      if (!(await page.locator('[data-screen="dig"]').isVisible())) break;
      await tapCell(page, cell, 6, 8);
      await page.waitForTimeout(1200);
      during.push(...(await frameTimes(page)));
    }

    expect(during.length).toBeGreaterThan(60);
    const p50 = quantile(during, 0.5);
    const p95 = quantile(during, 0.95);
    const software = await isSoftwareRenderer(page);

    console.info(
      `[perf] Sequenzen p50 ${p50.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms · ` +
        `draws ${await drawCalls(page)} · ${software ? 'Software-Renderer' : 'GPU'}`
    );

    // Auch mit voller Inszenierung bleiben es hoechstens 3 Batches.
    expect(await drawCalls(page)).toBeLessThanOrEqual(3);

    if (software) {
      expect(p50).toBeLessThan(100);
      return;
    }
    expect(p50).toBeLessThanOrEqual(FRAME_BUDGET_MS);
    expect(p95).toBeLessThanOrEqual(DROPPED_FRAME_MS);
  });
});
