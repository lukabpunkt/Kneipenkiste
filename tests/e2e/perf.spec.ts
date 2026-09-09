/**
 * Performance-Audit A2.
 *
 * Gefahren wird der schwerste Fall, den das Spiel kennt: acht Hikers, zehn Balken, Nebel
 * und Fluss-Glitzer an, langsamstes Tempo-Preset.
 *
 * **Was hier gemessen wird und was nicht.** Die naheliegende Zahl — die Frame-Zeit —
 * taugt in CI nichts: Ein Headless-Browser taktet stur mit 33.3 ms, ob wir nun acht
 * Hikers animieren oder gar nichts tun. Gemessen wurde das nach; alle vier Varianten
 * (voll, Low-Effects, halbe Auflösung) lieferten auf die Nachkommastelle denselben Wert.
 * Das ist die Kadenz des Compositors, nicht unsere Rechenzeit.
 *
 * Deshalb prüft dieser Test die zwei Zahlen, die tatsächlich an unserem Code hängen:
 *
 * 1. **JS-Zeit pro Frame** — was der Bühnen-Loop wirklich kostet (Architektur §8: ≤ 4 ms).
 * 2. **Draw-Batches** — die echten WebGL-Draw-Calls (Audit A2: ≤ 3).
 *
 * Die Aussage "60 fps auf dem iPhone 11" macht der manuelle Check in A2; die kann kein
 * Rechner in CI treffen, der keine hat.
 */

import { expect, test } from '@playwright/test';
import { PARTICLE_BUDGET, RENDER } from '../../src/config/theme';
import { BASE, chooseAll, endNegotiation, seedSession, startRound } from './helpers';

interface StageStats {
  frameTimes: number[];
  workTimes: number[];
  drawCalls: number;
  particles: number;
}

function percentile(times: readonly number[], q: number): number {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
}

test.describe('Bühne', () => {
  test('acht Hikers: Frame-Budget und Draw-Batches (Audit A2)', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });

    await seedSession(page, { playerCount: 8, pace: 'long' });
    await page.goto(`${BASE}?dev=1`);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);
    await endNegotiation(page);

    /* Zwei auf einem Balken, der Rest verteilt — ein Bruch, sieben Sichere. */
    await chooseAll(page, [3, 3, 5, 6, 7, 8, 9, 10]);
    await page.getByRole('button', { name: 'Der Schritt' }).click();

    const canvas = page.locator('.step__stage canvas');
    await expect(canvas).toBeVisible({ timeout: 30_000 });

    /* Erst laufen lassen, dann messen: Die ersten Frames enthalten den Aufbau. */
    await page.waitForTimeout(8000);

    const stats = (await page.evaluate(
      () => (globalThis as { __stageStats?: () => StageStats }).__stageStats?.() ?? null
    )) as StageStats | null;

    expect(stats, 'die Bühne meldet keine Messwerte').not.toBeNull();
    expect(stats!.frameTimes.length).toBeGreaterThan(60);
    expect(stats!.workTimes.length).toBeGreaterThan(60);

    const work95 = percentile(stats!.workTimes, 0.95);
    const frame50 = percentile(stats!.frameTimes, 0.5);
    console.log(
      `JS p95 ${work95.toFixed(2)} ms · Frame-Kadenz p50 ${frame50.toFixed(1)} ms · ` +
        `${stats!.drawCalls} Draw-Calls`
    );

    /*
     * Der Loop rechnet Wind, Nebel-Parallax, Fluss-Glitzer, Schilder-Schwingen und acht
     * Walk-Cycles. Reisst er das Budget, wird im Loop allokiert oder gerechnet, was in den
     * Aufbau gehört.
     */
    expect(work95).toBeLessThanOrEqual(RENDER.budgetMs.update);

    /*
     * Das eigentliche Ergebnis von ADR-13: Zwei Atlanten statt sieben, und PIXI packt
     * beide in dieselbe Batch. Steigt diese Zahl, ist eine Textur dazugekommen, die nicht
     * in den Atlas gehört — ein PIXI-`Text` zum Beispiel.
     */
    expect(stats!.drawCalls).toBeGreaterThan(0);
    expect(stats!.drawCalls).toBeLessThanOrEqual(RENDER.maxDrawBatches);

    expect(problems).toEqual([]);
  });

  test('bleibt im Partikel-Budget, während es kracht (Art Direction §8)', async ({ page }) => {
    await seedSession(page, { playerCount: 8, pace: 'normal' });
    await page.goto(`${BASE}?dev=1`);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);
    await endNegotiation(page);

    /* Vier Kollisionsgruppen: der Fall mit den meisten Splittern und Spritzern. */
    await chooseAll(page, [1, 1, 2, 2, 3, 3, 4, 4]);
    await page.getByRole('button', { name: 'Der Schritt' }).click();
    await expect(page.locator('.step__stage canvas')).toBeVisible({ timeout: 30_000 });

    /* Über den ganzen Bruch messen, nicht danach — der Höchststand zählt. */
    let peak = 0;
    let peakDraws = 0;
    for (let i = 0; i < 40; i += 1) {
      await page.waitForTimeout(300);
      const stats = (await page.evaluate(
        () => (globalThis as { __stageStats?: () => StageStats }).__stageStats?.() ?? null
      )) as StageStats | null;
      if (!stats) break;
      peak = Math.max(peak, stats.particles);
      peakDraws = Math.max(peakDraws, stats.drawCalls);
    }

    console.log(`Partikel-Höchststand ${peak} · Draw-Calls max ${peakDraws}`);

    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(PARTICLE_BUDGET.total);
    /*
     * Auch mit Sprechblasen: Ein PIXI-`Text` bringt seine eigene Textur mit. Bleibt das
     * hier unter drei, batcht PIXI sie mit — steigt es, gehört der Text in den Atlas.
     */
    expect(peakDraws).toBeLessThanOrEqual(RENDER.maxDrawBatches);
  });

  test('bleibt während der Fall-Sequenzen bei höchstens zwei Long-Tasks (Audit A4)', async ({ page }) => {
    await seedSession(page, { playerCount: 6, pace: 'normal' });
    await page.goto(`${BASE}?dev=1`);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);
    await endNegotiation(page);

    /*
     * Drei auf einem Balken (`fall_domino` möglich) plus ein Paar: die dichteste Stelle,
     * die das Spiel kennt — zwei Sequenzen gleichzeitig, Splitter, Spritzer, Sprechblasen.
     */
    await chooseAll(page, [1, 1, 1, 3, 3, 5]);

    /*
     * Long-Tasks zählen, **bevor** die Show anfängt. Ein Task über 50 ms ist ein Frame,
     * der ausfällt — und im Bruch fällt genau der auf, an dem es kracht.
     */
    await page.evaluate(() => {
      const target = globalThis as unknown as { __longTasks?: number };
      target.__longTasks = 0;
      try {
        new PerformanceObserver((list) => {
          target.__longTasks = (target.__longTasks ?? 0) + list.getEntries().length;
        }).observe({ entryTypes: ['longtask'] });
      } catch {
        /* Kein Long-Task-API (WebKit) — dann bleibt der Zähler bei 0 und der Test bei Chromium. */
      }
    });

    await page.getByRole('button', { name: 'Der Schritt' }).click();
    await expect(page.locator('.step__stage canvas')).toBeVisible({ timeout: 30_000 });

    const skip = page.locator('.step__skip');
    await expect(skip).toBeEnabled({ timeout: 40_000 });
    /* Bis ans Ende laufen lassen — der Aufstieg gehört zur Sequenz. */
    await page.waitForTimeout(3000);

    const longTasks = (await page.evaluate(
      () => (globalThis as unknown as { __longTasks?: number }).__longTasks ?? 0
    )) as number;

    console.log(`Long-Tasks während der Stürze: ${longTasks}`);
    expect(longTasks).toBeLessThanOrEqual(2);
  });

  test('räumt die Bühne ab, wenn der Schritt vorbei ist', async ({ page }) => {
    await seedSession(page, { playerCount: 3 });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);
    await endNegotiation(page);
    await chooseAll(page, [1, 1, 3]);
    await page.getByRole('button', { name: 'Der Schritt' }).click();

    await expect(page.locator('.step__stage canvas')).toBeVisible({ timeout: 30_000 });

    const skip = page.locator('.step__skip');
    await expect(skip).toBeEnabled({ timeout: 40_000 });
    await skip.click();

    /*
     * Kein Canvas mehr im Dokument: Ein PIXI-Ticker, der im Result weiterläuft, kostet
     * auf einem Handy spürbar Akku (Architektur §8).
     */
    await expect(page.locator('canvas')).toHaveCount(0, { timeout: 15_000 });
  });

  /*
   * Bundle-Prüfung (Roadmap M5.5, Audit A5) — an dem gemessen, was das Gerät wirklich
   * lädt, nicht an dem, was in `dist/` liegt. Vite legt für WebGPU- und Canvas-Renderer
   * eigene Chunks an; ob sie je geholt werden, sieht man nur im Netzwerk.
   */
  test('lädt die Bühne erst beim Schritt und nie den falschen Renderer (Audit A5)', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.js')) scripts.push(request.url().split('/').pop() ?? '');
    });

    await seedSession(page, { playerCount: 3 });
    await page.goto(BASE);
    await expect(page.locator('h1')).toHaveText('Die Hängebrücke');

    /*
     * Vor dem ersten Tap darf nichts von der Bühne da sein: kein PIXI, kein GSAP, kein
     * Renderer (Architektur §1). Der Ton darf kommen — er lädt nach `load` im Idle und
     * blockiert damit nichts (ADR-28); gezählt wird deshalb nicht die Anzahl der Chunks,
     * sondern **wer** dabei ist.
     */
    expect(scripts.some((name) => name.startsWith('WebGLRenderer'))).toBe(false);
    expect(scripts.some((name) => name.startsWith('RenderTargetSystem'))).toBe(false);
    expect(scripts.some((name) => name.startsWith('browserAll'))).toBe(false);

    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);
    await endNegotiation(page);
    await chooseAll(page, [1, 1, 3]);
    await page.getByRole('button', { name: 'Der Schritt' }).click();
    await expect(page.locator('.step__stage canvas')).toBeVisible({ timeout: 30_000 });

    /* Der WebGL-Renderer kommt, die beiden anderen bleiben liegen — `preference: 'webgl'`. */
    expect(scripts.some((name) => name.startsWith('WebGLRenderer'))).toBe(true);
    expect(scripts.filter((name) => name.startsWith('WebGPURenderer'))).toEqual([]);
    expect(scripts.filter((name) => name.startsWith('CanvasRenderer'))).toEqual([]);
  });
});
