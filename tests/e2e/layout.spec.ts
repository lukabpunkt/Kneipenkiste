/**
 * Kein Screen läuft vertikal über (Playtest-Finding 01, ADR-28).
 *
 * ## Warum es diese Datei gibt
 *
 * Ein Playtester musste auf dem Place-Screen **scrollen**, um seine Minen überhaupt
 * vergraben zu können — der Knopf lag rund 116 px unter der Falz. Durchgekommen ist das,
 * weil die Testsuite bis dahin nur eine einzige Layout-Zusicherung hatte: „passt ins
 * Portrait-Format ohne **Quer**scrollen", und die auch nur auf dem Titel.
 *
 * Hier steht das Gegenstück. Für jeden Screen zwei Fragen:
 *
 * 1. Läuft er vertikal über?
 * 2. Liegt die **primäre Aktion** vollständig im Sichtfeld? Das ist die eigentliche
 *    Frage — ein Screen darf einen scrollenden Rumpf haben, aber der Knopf, der die
 *    Runde weiterbringt, muss ohne Scrollen erreichbar sein.
 *
 * Gemessen wird auf zwei Geräten und in der Modus-Kombination, die am meisten Platz
 * frisst: Doppelagent (zwei Werkzeug-Chips) **plus** eingeschalteter Timer.
 */

import { expect, test, type Page } from '@playwright/test';
import { buryMines, openLobby, startDigging, tapPass, waitForBoard } from './helpers';

/** Läuft der Screen über seinen eigenen Rahmen hinaus? */
async function overflows(page: Page): Promise<number> {
  return page.evaluate(() => {
    const screen = document.querySelector<HTMLElement>('[data-screen]');
    if (!screen) return -1;
    return screen.scrollHeight - screen.clientHeight;
  });
}

/** Liegt das Element vollständig im sichtbaren Bereich? */
async function fullyVisible(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) return false;
    const box = el.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= window.innerHeight && box.height > 0;
  }, selector);
}

test.describe('Vertikales Layout', () => {
  test('haelt jeden Screen des Ablaufs im Bild', async ({ page }) => {
    test.setTimeout(120_000);

    await openLobby(page, { players: 4, seed: 41 });

    /*
     * Die Lobby **darf** scrollen: Acht Spielerzeilen und fuenf Modus-Schalter passen auf
     * kein Handy. Was nicht scrollen darf, ist der Knopf, der die Runde startet — und
     * genau der lag hier zuerst rund 400 px unter der Falz. Gefunden hat es dieser Test.
     */
    expect(await fullyVisible(page, '.lobby__footer .btn'), 'Feld-verminen-Knopf').toBe(true);

    // `buryMines` erledigt Uebergabe und Platzierung fuer alle vier Spieler.
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await buryMines(page, 4);
    await startDigging(page);
    await waitForBoard(page);

    expect(await overflows(page), 'Dig').toBeLessThanOrEqual(1);
  });

  test('haelt den Vergraben-Knopf auch im engsten Fall im Bild', async ({ page }) => {
    test.setTimeout(120_000);

    /*
     * Der engste Fall, den das Spiel kennt: 6 x 6 (also acht Spieler, kleinere Platten,
     * hoeheres Feld), Doppelagent (zwei Werkzeug-Chips, 56 px plus Gap) und ein
     * eingeschalteter Timer (44 px plus Gap). Zusammen rund 184 px mehr, als der Screen
     * hat — hier muss die Trennung von Rumpf und Fuss tragen.
     */
    await openLobby(page, {
      players: 8,
      seed: 42,
      modes: ['doubleAgent'],
      placeTimerSec: 10,
    });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await tapPass(page);
    await waitForBoard(page);

    expect(await fullyVisible(page, '.place__footer .btn'), 'Vergraben-Knopf').toBe(true);
    // Und die Werkzeug-Chips sind erreichbar, ohne den Knopf aus dem Bild zu schieben.
    await expect(page.locator('.place__tools .chip--tool')).toHaveCount(2);
  });

  test('haelt den Knopf auch auf einem kleinen Geraet im Bild', async ({ page }) => {
    test.setTimeout(120_000);

    // 360 x 640 ist das kleinste Geraet, das noch als Zielgruppe gilt.
    await page.setViewportSize({ width: 360, height: 640 });

    await openLobby(page, { players: 5, seed: 43 });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await tapPass(page);
    await waitForBoard(page);

    expect(await fullyVisible(page, '.place__footer .btn'), 'Vergraben-Knopf').toBe(true);
  });
});
