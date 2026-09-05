/**
 * Helfer fuer die E2E-Durchlaeufe.
 *
 * Alle Wartebedingungen haengen an Zustaenden, nie an Uhrzeiten: Der Router blendet mit
 * einem 320-ms-Wipe um, der Pass-Screen ist 800 ms taub, die Versiegelung dauert 540 ms.
 * Wer hier mit `waitForTimeout` arbeitet, baut sich flaky Tests.
 */

import { expect, type Page } from '@playwright/test';

export type ScreenId =
  | 'title'
  | 'lobby'
  | 'negotiation'
  | 'silence'
  | 'pass'
  | 'choice'
  | 'sealed'
  | 'reveal'
  | 'witness'
  | 'distribute'
  | 'result';

/** Wartet, bis genau dieser Screen gemountet ist. */
export async function atScreen(page: Page, id: ScreenId, timeout = 40_000): Promise<void> {
  await page.waitForFunction(
    (want) => document.querySelector<HTMLElement>('#app > section')?.dataset['screen'] === want,
    id,
    { timeout }
  );
}

export function screen(page: Page) {
  return page.locator('#app > section').first();
}

/** Title → Lobby, inklusive des einmaligen 18+-Hinweises. */
export async function startGame(page: Page): Promise<void> {
  await page.goto('./');
  await page.getByRole('button', { name: 'Spielen' }).click();
  const confirm = page.getByRole('button', { name: 'Los' });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await atScreen(page, 'lobby');
}

/** Fuellt die Lobby auf `count` Spieler auf. */
export async function setPlayerCount(page: Page, count: number): Promise<void> {
  const rows = page.locator('.lobby__row');
  while ((await rows.count()) < count) {
    await page.getByRole('button', { name: 'Spieler hinzufügen' }).click();
  }
  while ((await rows.count()) > count) {
    await page.locator('.lobby__remove').last().click();
  }
  await expect(rows).toHaveCount(count);
}

/** Schaltet einen Modus-Chip in der Lobby ein. */
export async function enableMode(page: Page, label: string): Promise<void> {
  const option = page.locator('.modes__option', { hasText: label }).first();
  if ((await option.getAttribute('aria-pressed')) !== 'true') await option.click();
  await expect(option).toHaveAttribute('aria-pressed', 'true');
}

/** Lobby → Verhandlung (bzw. Stille in der Nachtschicht). */
export async function openVault(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Tresor öffnen' }).click();
}

/** Beendet die Verhandlung sofort, statt 30 s zu warten. */
export async function skipNegotiation(page: Page): Promise<void> {
  await atScreen(page, 'negotiation');
  await page.getByRole('button', { name: 'Alle bereit' }).click();
}

/** Ein Spieler nimmt das Handy und waehlt. */
export async function takeTurn(page: Page, choice: 'share' | 'steal'): Promise<void> {
  await atScreen(page, 'pass');
  // Die 800-ms-Sperre ist eine MUSS-Regel (Audit A1) — hier warten wir sie ab.
  await page.waitForSelector('.screen--pass:not(.is-locked)');
  await screen(page).click();
  await atScreen(page, 'choice');
  await page.locator(choice === 'share' ? '.card--share' : '.card--steal').click();
}

/** Gibt das Handy reihum und waehlt fuer jeden. */
export async function playChoices(page: Page, choices: readonly ('share' | 'steal')[]): Promise<void> {
  for (const choice of choices) await takeTurn(page, choice);
  await atScreen(page, 'sealed');
}

/** Sealed → Reveal → (Distribute) → Result. */
export async function runReveal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Tresor öffnen' }).click();
  await atScreen(page, 'reveal');
}

/**
 * Verteilt alle Schluecke auf den ersten Teiler und zahlt aus.
 *
 * Gewartet wird auf den **Rest-Zaehler**, nicht auf den Knopf: Jeder Tap startet eine
 * Muenzflug-Animation, und wer in dieser Zeit `isDisabled()` fragt, fragt mitten in der
 * Bewegung. Der Zaehler traegt `is-done`, sobald nichts mehr uebrig ist — das ist ein
 * Zustand, kein Zeitpunkt.
 */
export async function distributeAllToFirst(page: Page): Promise<void> {
  await atScreen(page, 'distribute');
  const payout = page.getByRole('button', { name: 'Auszahlen' });
  const target = page.locator('.distribute__target').first();
  const remaining = page.locator('.distribute__remaining');

  for (let i = 0; i < 40; i++) {
    if (await remaining.evaluate((el) => el.classList.contains('is-done'))) break;
    await target.click();
  }

  await expect(remaining).toHaveClass(/is-done/);
  await expect(payout).toBeEnabled();
  await payout.click();
}

/** Der Tresorstand, wie ihn der Flip-Counter anzeigt. */
export async function vaultValue(page: Page): Promise<number> {
  const label = await page.locator('.flip__digits').first().getAttribute('aria-label');
  return Number(label);
}
