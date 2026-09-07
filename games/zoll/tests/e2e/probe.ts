/**
 * Die Dev-Sonde der Bühne, wie die E2E-Tests sie sehen.
 *
 * Sie steht nur im Dev-Build (`?dev=1`) unter `window.__zollStage`. Der Typ liegt hier
 * gemeinsam, damit nicht zwei Spec-Dateien konkurrierende `Window`-Deklarationen bauen —
 * und dazu das Tippen selbst, weil jede Spec sonst dieselbe Falle neu aufstellt.
 */

import { expect, type Page } from '@playwright/test';

export interface SuitcaseRect {
  playerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SequenceReport {
  id: string;
  kind: string;
  durationSec: number;
  labels: Record<string, number>;
}

export interface StageProbe {
  suitcases(): SuitcaseRect[];
  drawCalls(): number;
  frameTimes(): number[];
  updateTimes(): number[];
  taps(): string[];
  resetTaps(): void;
  isolateTaps(): void;
  mode(): string;
  builds(): number;
  xraySequences(itemSet: string, amount: number): SequenceReport[];
  drawSequences(kind: string, count: number): string[];
  particles(): number;
  setLowEffects(value: boolean): void;
}

declare global {
  interface Window {
    __zollStage?: StageProbe;
  }
}

/**
 * Wo ein Koffer wirklich liegt — erst, wenn er stillsteht.
 *
 * Die Kamera ist ein Tween. Eine Position, die mitten in der Fahrt gemessen wurde, ist
 * beim Tippen schon veraltet, und der Tap geht ins Leere: kein Scan, keine Partikel,
 * kein Ereignis. Ein Finger trifft trotzdem, weil er die Bühne sieht — der Test muss
 * warten, bis zwei Messungen dasselbe sagen. Auf dem CI-Runner ohne GPU fällt das auf,
 * auf einem Entwicklungsrechner nie.
 */
export async function restingRect(page: Page, playerId: string): Promise<SuitcaseRect> {
  const read = async (): Promise<SuitcaseRect | undefined> => {
    const rects = await page.evaluate(() => window.__zollStage!.suitcases());
    return rects.find((rect) => rect.playerId === playerId);
  };

  let previous = await read();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.waitForTimeout(100);
    const current = await read();
    if (
      previous &&
      current &&
      Math.abs(previous.x - current.x) < 1 &&
      Math.abs(previous.y - current.y) < 1
    ) {
      return current;
    }
    previous = current;
  }

  expect(previous, `Koffer ${playerId} kommt nicht zur Ruhe`).toBeTruthy();
  return previous!;
}

/**
 * Tippt auf einen Koffer und vergewissert sich, dass die Bühne den Tap gemeldet hat.
 *
 * Kam nichts an, tippt der Test noch einmal mit frisch gemessener Position — genau wie
 * ein Mensch, dessen erster Tap nichts bewirkt hat.
 */
export async function tapSuitcase(page: Page, playerId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    /* Gezaehlt wird, nicht gesucht: Derselbe Koffer kann in einer Runde mehrfach dran sein. */
    const before = (await page.evaluate(() => window.__zollStage!.taps())).length;
    const rect = await restingRect(page, playerId);
    await page.mouse.click(rect.x, rect.y);

    const arrived = await page
      .waitForFunction(
        ([id, count]) => {
          const taps = window.__zollStage!.taps();
          return taps.length > (count as number) && taps[taps.length - 1] === id;
        },
        [playerId, before] as [string, number],
        { timeout: 3_000 }
      )
      .then(() => true)
      .catch(() => false);

    if (arrived) return;
  }

  expect(
    (await page.evaluate(() => window.__zollStage!.taps())).at(-1),
    `Kein Tap auf ${playerId} angekommen`
  ).toBe(playerId);
}
