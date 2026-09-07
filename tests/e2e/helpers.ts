/**
 * E2E-Helfer.
 *
 * Sie spielen das Spiel so, wie eine Gruppe es spielt: tippen, weitergeben, warten.
 * Nichts hier greift an der UI vorbei in den Zustand — sonst würde der Test etwas
 * anderes prüfen als das, was auf der Party passiert.
 */

import { expect, type Page } from '@playwright/test';
import type { GameModeId, Pace, Settings } from '../../src/config/rules';

export const BASE = '/Haengebruecke/';

/**
 * Die App mit Dev-Panel. Die Todeszone lässt sich sonst nur erreichen, indem man drei
 * friedliche Runden vorspielt — der Toggle stellt exakt denselben Zustand her
 * (`B_min = n − 1`), nur in einem Tap (Roadmap M1.6).
 */
export const BASE_DEV = '/Haengebruecke/?dev=1';

/**
 * Eine vorbereitete Session in den Storage legen, bevor die App startet.
 *
 * Das ist kein Test-Schleichweg: Es ist derselbe Snapshot, den die App selbst schreibt
 * (`STORAGE_KEY`, Version 1). So starten die Szenarien mit fünf Spielern und kurzem
 * Tempo, statt jede Runde 20 Sekunden Absprache abzuwarten.
 */
export async function seedSession(
  page: Page,
  options: { playerCount?: number; modes?: Partial<Record<GameModeId, boolean>>; pace?: Pace } = {}
): Promise<void> {
  const playerCount = options.playerCount ?? 5;

  await page.addInitScript(
    ([count, modes, pace]) => {
      /*
       * `addInitScript` läuft bei **jedem** Laden, also auch nach `page.reload()`. Würde
       * hier stumpf geschrieben, überschriebe der Reload genau die Session, deren
       * Überleben der Persistenz-Test prüft.
       */
      if (localStorage.getItem('haengebruecke.session.v1')) return;

      const colors = [
        { id: 'red', symbol: 'circle', nickname: 'Rudi' },
        { id: 'blue', symbol: 'triangle', nickname: 'Blue' },
        { id: 'green', symbol: 'square', nickname: 'Gustav' },
        { id: 'yellow', symbol: 'star', nickname: 'Yoshi' },
        { id: 'purple', symbol: 'diamond', nickname: 'Lilo' },
        { id: 'orange', symbol: 'heart', nickname: 'Olli' },
        { id: 'pink', symbol: 'bolt', nickname: 'Pinky' },
        { id: 'cyan', symbol: 'cross', nickname: 'Turbo' },
      ];
      const players = Array.from({ length: count as number }, (_, i) => {
        const color = colors[i]!;
        return { id: `p${i + 1}`, name: color.nickname, colorId: color.id, symbol: color.symbol };
      });

      localStorage.setItem(
        'haengebruecke.session.v1',
        JSON.stringify({
          version: 1,
          players,
          settings: {
            modes: { flags: false, rotten: false, weights: false, fog: false, rope: false, ...(modes as object) },
            negotiationSec: 10,
            thinkTimerSec: 0,
            pace: pace as Pace,
            sound: false,
            music: 0,
            haptics: false,
            lowEffects: true,
            locale: 'de',
          },
          roundIndex: 0,
          bridge: {
            count: (count as number) + 2,
            planks: Array.from({ length: (count as number) + 2 }, (_, i) => i + 1),
            removed: [],
          },
          ropeUsage: {},
          stats: {},
          history: [],
        } satisfies { version: 1; settings: Settings } & Record<string, unknown>)
      );
    },
    [playerCount, options.modes ?? {}, options.pace ?? 'short'] as const
  );
}

/** Lobby → Absprache. */
export async function startRound(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Auf die Brücke' }).click();
  await expect(page.locator('[data-screen="negotiation"], [data-screen="silence"]')).toBeVisible();
}

/** Absprache abkürzen. Im Nebel gibt es den Knopf nicht — dort läuft die Uhr ab. */
export async function endNegotiation(page: Page): Promise<void> {
  const ready = page.getByRole('button', { name: 'Alle bereit' });
  if (await ready.isVisible().catch(() => false)) await ready.click();
  await expect(page.locator('[data-screen="pass"]')).toBeVisible({ timeout: 15_000 });
}

/**
 * Handy annehmen.
 *
 * Der Pass-Screen ist 800 ms taub (`PASS_TAP_LOCK_MS`) — ein durchgereichter Doppeltap
 * darf nicht die Wahl des Nächsten öffnen. `data-armed` ist das einzige verlässliche
 * Signal dafür: `.pass__cta` steht die ganze Zeit im DOM und ist für Playwright auch mit
 * `opacity: 0` "sichtbar".
 */
export async function tapPass(page: Page): Promise<void> {
  await expect(page.locator('[data-screen="pass"][data-armed="true"]')).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-screen="pass"]').click();
  await expect(page.locator('[data-screen="choose"]')).toBeVisible();
}

/**
 * Alle wählen der Reihe nach. `picks` ist eine Balkennummer pro Spieler, oder `'rope'`.
 * Genau der Ablauf am Tisch: Pass-Screen antippen, Balken tippen, weitergeben.
 */
export async function chooseAll(page: Page, picks: (number | 'rope')[]): Promise<void> {
  for (const [index, pick] of picks.entries()) {
    await tapPass(page);
    if (pick === 'rope') await page.getByRole('button', { name: 'Seil nehmen (einmalig)' }).click();
    else await page.locator(`[data-screen="choose"] .plank[data-plank="${pick}"]`).click();

    const last = index === picks.length - 1;
    await expect(page.locator(last ? '[data-screen="sealed"]' : '[data-screen="pass"]')).toBeVisible();
  }
}

/** Die Show ansehen und danach weiter. */
export async function watchStep(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Der Schritt' }).click();
  await expect(page.locator('[data-screen="step"]')).toBeVisible();

  /* Tap-to-Skip ist bis zum letzten Bruch gesperrt (GDD §4.2). */
  const skip = page.locator('.step__skip');
  await expect(skip).toBeEnabled({ timeout: 30_000 });
  await skip.click();
}

/**
 * Verteilen, egal ob Schnellmodus oder Einzel-Iteration.
 *
 * Abbruchbedingung ist das Result, **nicht** "gerade ist kein Knopf aktiv": Zwischen dem
 * letzten Schluck eines Verteilers und dem nächsten liegt eine kurze Pause, in der alle
 * Ziele deaktiviert sind. Wer dort aufhört, verpasst die restlichen Verteiler.
 */
export async function distribute(page: Page): Promise<void> {
  const result = page.locator('[data-screen="result"]');

  for (let guard = 0; guard < 60; guard += 1) {
    if (await result.isVisible().catch(() => false)) return;

    const target = page.locator('[data-screen="distribute"] button:not([disabled])').first();
    if ((await target.count()) > 0) await target.click().catch(() => undefined);
    else await page.waitForTimeout(150);
  }

  await expect(result).toBeVisible({ timeout: 15_000 });
}

/** Eine komplette Runde von der Absprache bis zum Result. */
export async function playRound(page: Page, picks: (number | 'rope')[]): Promise<void> {
  await endNegotiation(page);
  await chooseAll(page, picks);
  await watchStep(page);
  await distribute(page);
}
