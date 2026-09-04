/**
 * Hinweise, Schranke und Audio auf der echten Bühne (Audit A3).
 *
 * Der wichtigste Test hier ist der Pixel-Vergleich: **Nach der Animation sieht ein Koffer
 * mit Hinweis aus wie einer ohne.** Das ist keine Kosmetik — ein Koffer, der anders
 * aussieht, verspricht eine Sicherheit, die das Hinweis-Modell nicht hergibt, und
 * zerstört Design-Pfeiler 2 ("falsche Sicherheit").
 *
 * Verglichen werden die Bildausschnitte zweier Koffer derselben Runde: einer mit
 * Hinweis, einer ohne. Sie tragen verschiedene Farben und Namen — verglichen wird
 * deshalb nicht Pixel gegen Pixel, sondern **Form gegen Form**: die Silhouette, also
 * welche Pixel überhaupt gesetzt sind.
 */

import { expect, test, type Page } from '@playwright/test';
import './probe';

test.use({ locale: 'de-DE' });

const screen = (page: Page) => page.locator('.screen');

async function expectScreen(page: Page, id: string): Promise<void> {
  await expect(screen(page)).toHaveAttribute('data-screen', id, { timeout: 40_000 });
}

/** Spielt bis in die Halle und wartet, bis die Hinweise durch sind. */
async function toHallAfterHints(page: Page, seed: number, amounts: number[]): Promise<void> {
  await page.goto(`./?dev=1&seed=${seed}`);
  await expectScreen(page, 'title');
  await page.locator('.screen--title .btn--primary').click();

  await expectScreen(page, 'lobby');
  await page.locator('.lobby__cta').click();

  await expectScreen(page, 'officerIntro');
  await page.locator('.screen--officer-intro').click();

  for (const amount of amounts) {
    await expectScreen(page, 'pass');
    await expect(page.locator('.screen--pass')).toHaveAttribute('data-armed', 'true');
    await page.locator('.screen--pass').click();
    await expectScreen(page, 'pack');
    for (let i = 0; i < amount; i++) await page.locator('.stepper__btn').nth(1).click();
    await page.locator('.pack__close').click();
  }

  await expectScreen(page, 'packed');
  await expect(page.locator('.screen--packed .btn--primary')).toBeEnabled();
  await page.locator('.screen--packed .btn--primary').click();

  await expectScreen(page, 'hall');
  await expect(page.locator('.stage__canvas canvas')).toBeVisible({ timeout: 40_000 });
  /* "Nochmal ansehen" wird frei, sobald alle Hinweise gelaufen sind. */
  await expect(page.locator('.hall__actions .btn--secondary')).toBeEnabled({ timeout: 40_000 });
  /* Und noch etwas Ruhe, damit auch das letzte Nachwippen vorbei ist. */
  await page.waitForTimeout(900);
}

test.describe('A3 — Hinweise', () => {
  test('ein Koffer mit Hinweis sieht aus wie einer ohne', async ({ page }) => {
    test.setTimeout(180_000);
    await toHallAfterHints(page, 3103, [3, 0, 2, 0]);

    /* Welche Koffer einen Hinweis tragen, verrät die Marker-Leiste im HUD. */
    const withHint = await page
      .locator('.hall__marker')
      .filter({ has: page.locator('.hint-icon') })
      .first()
      .getAttribute('data-player');
    const withoutHint = await page
      .locator('.hall__marker')
      .filter({ hasNot: page.locator('.hint-icon') })
      .first()
      .getAttribute('data-player');

    expect(withHint, 'kein Koffer mit Hinweis gefunden').toBeTruthy();
    expect(withoutHint, 'kein Koffer ohne Hinweis gefunden').toBeTruthy();

    const rects = await page.evaluate(() => window.__zollStage!.suitcases());
    const a = rects.find((r) => r.playerId === withHint)!;
    const b = rects.find((r) => r.playerId === withoutHint)!;

    /*
     * Die Silhouette beider Koffer vergleichen: Welche Pixel sind gegenüber dem
     * Hallenboden gesetzt? Farbe und Name unterscheiden sich zwangsläufig — die Form
     * darf es nicht.
     */
    const shapeOf = async (rect: typeof a): Promise<string> =>
      page.evaluate(
        ({ x, y, width, height }) => {
          const canvas = document.querySelector<HTMLCanvasElement>('.stage__canvas canvas')!;
          const box = canvas.getBoundingClientRect();
          const scale = canvas.width / box.width;

          const sx = Math.round((x - box.left - width / 2) * scale);
          const sy = Math.round((y - box.top - height / 2) * scale);
          const sw = Math.round(width * scale);
          const sh = Math.round(height * scale);

          const copy = document.createElement('canvas');
          copy.width = sw;
          copy.height = sh;
          const target = copy.getContext('2d')!;
          target.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
          const data = target.getImageData(0, 0, sw, sh).data;

          /* Die Silhouette als Bitmaske: dunkle Outline-Pixel gegen alles andere. */
          let mask = '';
          for (let i = 0; i < data.length; i += 4) {
            const luminance = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
            mask += luminance < 90 ? '1' : '0';
          }
          return mask;
        },
        rect
      );

    const shapeA = await shapeOf(a);
    const shapeB = await shapeOf(b);
    expect(shapeA.length).toBe(shapeB.length);
    expect(shapeA.length).toBeGreaterThan(1000);

    let same = 0;
    for (let i = 0; i < shapeA.length; i++) if (shapeA[i] === shapeB[i]) same += 1;
    const agreement = same / shapeA.length;

    /*
     * 97 % statt 100 %: Die Koffer stehen an verschiedenen Stellen, die Namen sind
     * verschieden lang, und die vordere Reihe steht vor dem Band statt darauf. Was
     * verboten ist, wäre ein systematischer Unterschied — eine Neigung, ein Versatz, ein
     * anderer Ton. Der schlüge hier sofort durch.
     */
    expect(agreement, `Silhouetten stimmen nur zu ${(agreement * 100).toFixed(1)} % überein`).toBeGreaterThan(0.97);
  });

  test('die Hinweis-Icons hängen an den Koffern, die der Kern gewählt hat', async ({ page }) => {
    test.setTimeout(180_000);
    await toHallAfterHints(page, 3104, [4, 0, 1, 0]);

    /* Das Dev-Panel kennt die Wahrheit — der Screen darf sie nicht kennen. */
    await page.locator('.dev-panel__btn').click();
    const debug = (await page.locator('.dev-panel__line').textContent()) ?? '';
    const expected = [...debug.matchAll(/hint (\w+)@(\w+)/g)].map((m) => m[2]!);
    expect(expected.length).toBeGreaterThan(0);

    const marked: string[] = [];
    for (const marker of await page.locator('.hall__marker').all()) {
      if ((await marker.locator('.hint-icon').count()) > 0) {
        marked.push((await marker.getAttribute('data-player'))!);
      }
    }

    expect(marked.sort()).toEqual([...expected].sort());
  });

  test('"Nochmal ansehen" geht genau einmal', async ({ page }) => {
    test.setTimeout(180_000);
    await toHallAfterHints(page, 3105, [2, 0, 0, 0]);

    const replay = page.locator('.hall__actions .btn--secondary');
    await expect(replay).toBeEnabled();
    await replay.click();

    /* Während die Wiederholung läuft, ist der Knopf gesperrt … */
    await expect(replay).toBeDisabled();
    /* … und danach bleibt er es (HINT_REPLAY_LIMIT = 1). */
    await page.waitForTimeout(8000);
    await expect(replay).toBeDisabled();
  });
});

test.describe('A3 — Schranke', () => {
  test('spielt jeden Koffer und wechselt dabei die Sequenz', async ({ page }) => {
    test.setTimeout(180_000);
    await toHallAfterHints(page, 3106, [0, 3, 0, 2]);

    await page.locator('.hall__actions .btn--officer').last().click();
    await expectScreen(page, 'inspect');
    await page.waitForFunction(() => window.__zollStage?.mode() === 'inspect', undefined, {
      timeout: 40_000,
    });

    await page.locator('.inspect__actions .btn--officer').click();
    await expectScreen(page, 'gate');

    /* Vier Koffer, jeder mit Banner — der letzte ist ein Schmuggler (ADR-4). */
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      await expect(page.locator('.gate__banner')).toBeVisible({ timeout: 40_000 });
      seen.push((await page.locator('.gate__banner').getAttribute('data-kind'))!);
      if (i < 3) await expect(page.locator('.gate__banner')).toBeHidden({ timeout: 40_000 });
    }

    expect(seen).toHaveLength(4);
    expect(seen.at(-1)).toBe('smuggler');
    /* Saubere zuerst: Vor dem ersten Schmuggler darf kein zweiter Wechsel liegen. */
    expect(seen.indexOf('smuggler')).toBeGreaterThan(0);
    expect(seen.slice(seen.indexOf('smuggler')).every((k) => k === 'smuggler')).toBe(true);
  });
});
