/**
 * Accessibility und Reduced-Motion (Roadmap M5.5, Audit A5).
 *
 * Drei Zusagen, die man nur im echten Browser pruefen kann:
 *
 * 1. **Reduzierte Bewegung wird respektiert** — und zwar so, dass das Spiel trotzdem
 *    vollstaendig spielbar bleibt. Eine Zusage, die den Ablauf blockiert, waere schlimmer
 *    als keine.
 * 2. **Der Fokus wandert mit** — nach jedem Screenwechsel liegt er im neuen Screen und
 *    nicht im Nichts.
 * 3. **Jeder Screen sagt einem Screenreader, wo er ist** — Ueberschrift, Beschriftungen,
 *    aria-live fuer alles, was sich ohne Zutun aendert.
 */

import { expect, test } from '@playwright/test';
import {
  atScreen,
  openVault,
  playChoices,
  runReveal,
  screen,
  setPlayerCount,
  skipNegotiation,
  startGame,
} from './helpers';

test.describe('Reduzierte Bewegung', () => {
  /*
   * `emulateMedia` statt `test.use({ reducedMotion })`: Es schaltet dieselbe Media-Query,
   * ist aber in jeder Playwright-Version typisiert und steht direkt beim Test — man sieht
   * beim Lesen, warum die Seite sich anders verhaelt.
   */
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('haelt den Title-Loop an und laesst trotzdem alles spielen', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));

    await page.goto('./');

    /*
     * Der schleichende Crook faellt komplett weg (nicht nur langsamer): Wer Bewegung
     * reduziert haben will, will keine Figur, die alle vierzehn Sekunden durchs Bild geht.
     */
    await expect(page.locator('.titleLoop__crook')).toBeHidden();
    // Das Licht bleibt — es ist Stimmung, keine Bewegung.
    await expect(page.locator('.titleLoop__spot')).toBeVisible();

    // Und der ganze Weg bis zur Aufdeckung funktioniert unveraendert.
    await startGame(page);
    await setPlayerCount(page, 3);
    await openVault(page);
    await skipNegotiation(page);
    await playChoices(page, ['share', 'share', 'steal']);
    // Der Wipe wird zum Fade, der Pass-Screen bleibt 800 ms taub — der Ablauf steht.
    await runReveal(page);
    expect(problems).toEqual([]);
  });

  test('laesst keine Endlos-Animation auf dem Title laufen', async ({ page }) => {
    await page.goto('./');
    /*
     * `getAnimations()` fragt den Browser, was tatsaechlich laeuft — nicht, was im CSS
     * steht. Genau das ist der Punkt: Eine Regel, die eine `@media`-Abfrage vergisst,
     * faellt hier auf, eine, die sie hat, nicht.
     */
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => animation.playState === 'running')
        .map((animation) => (animation as CSSAnimation).animationName ?? 'unbenannt')
    );
    expect(running).toEqual([]);
  });
});

test.describe('Fokus und Screenreader', () => {
  test('setzt den Fokus nach jedem Screenwechsel in den neuen Screen', async ({ page }) => {
    await startGame(page);

    // Nach dem Wipe liegt der Fokus im Lobby-Screen — nicht auf `body`.
    const inScreen = await page.evaluate(() => {
      const host = document.querySelector('#app > section');
      return !!host && !!document.activeElement && host.contains(document.activeElement);
    });
    expect(inScreen).toBe(true);

    await setPlayerCount(page, 3);
    await openVault(page);
    await expect(screen(page).locator('h1')).toBeVisible();
  });

  test('gibt jedem Screen eine Ueberschrift und beschriftet jede Taste', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 3);

    for (const step of ['lobby', 'negotiation'] as const) {
      if (step === 'negotiation') await openVault(page);
      await atScreen(page, step);

      // Genau eine H1 pro Screen: Sie ist die Ansage beim Betreten.
      await expect(screen(page).locator('h1')).toHaveCount(1);

      /*
       * Jede Taste braucht einen Namen. Icon-Knoepfe (das X zum Entfernen) haben keinen
       * Text — sie muessen ihn ueber `aria-label` mitbringen.
       */
      const unnamed = await screen(page)
        .locator('button')
        .evaluateAll((buttons) =>
          buttons.filter(
            (button) =>
              !button.getAttribute('aria-label') && (button.textContent ?? '').trim() === ''
          ).length
        );
      expect(unnamed, `${step}: Tasten ohne Namen`).toBe(0);
    }
  });

  test('meldet Kassels Kommentare hoeflich statt aufdringlich', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 3);
    await openVault(page);
    await atScreen(page, 'negotiation');

    /*
     * `polite`, nicht `assertive`: Kassel ist Deko. Ein Screenreader soll ihn erwaehnen,
     * wenn er Luft hat, und nicht die Vorlesung des Countdowns unterbrechen.
     */
    await expect(page.locator('.negotiation__kassel')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('.negotiation__kassel')).not.toBeEmpty();
  });
});
