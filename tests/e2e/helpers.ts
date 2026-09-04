/**
 * E2E-Hilfen (Roadmap M1.7).
 *
 * Das Spiel ist Pass-the-Phone: Ein Testlauf muss dasselbe tun wie vier Leute am Tisch —
 * Handy weiterreichen, Minen legen, graben, verteilen. Diese Datei kapselt das, damit die
 * Szenarien selbst lesbar bleiben.
 *
 * Die Kistenposition steuert `?seed=` (nur im Dev- und E2E-Build, siehe ui/devSeed.ts).
 * Ohne diesen Hook liesse sich nie pruefen, was passiert, wenn jemand die Kiste findet.
 */

import { expect, type Page } from '@playwright/test';

/**
 * Den Pass-Screen antippen, bis er den Tap annimmt.
 *
 * Der Screen ignoriert die ersten `PASS_LOCK_MS` (800 ms) — die Sperre soll verhindern,
 * dass der vorherige Spieler aus Reflex noch einmal tippt und den Minen-Screen des
 * naechsten sieht. Sie startet erst **nach** dem Wipe, weil `activate()` erst dann
 * laeuft; auf die Klasse `is-locked` zu warten, waere ein Rennen gegen genau diesen
 * Moment. Deshalb wird geklickt, bis der Place-Screen da ist.
 */
export async function tapPass(page: Page): Promise<void> {
  const screen = page.locator('[data-screen="pass"]');
  await expect(screen).toBeVisible();

  await expect(async () => {
    await screen.click();
    await expect(page.locator('[data-screen="place"]')).toBeVisible({ timeout: 400 });
  }).toPass({ timeout: 15_000 });
}

export interface StartOptions {
  players: number;
  seed?: number;
  modes?: readonly string[];
  placeTimerSec?: number;
  digTimerSec?: number;
}

/** Titel → Lobby, Spieler einstellen, Modi setzen. Endet auf dem Lobby-Screen. */
export async function openLobby(page: Page, options: StartOptions): Promise<void> {
  const query = options.seed === undefined ? '' : `?seed=${options.seed}`;
  await page.goto(`./${query}`);

  await page.getByRole('button', { name: 'Spielen' }).click();
  await expect(page.locator('[data-screen="lobby"]')).toBeVisible();

  while ((await page.locator('.player-row').count()) < options.players) {
    await page.getByRole('button', { name: 'Spieler hinzufügen' }).click();
  }
  while ((await page.locator('.player-row').count()) > options.players) {
    await page.locator('.player-row__remove:not([disabled])').first().click();
  }

  for (const mode of options.modes ?? []) {
    await page.locator(`.mode-toggle[data-mode="${mode}"]`).click();
    await expect(page.locator(`.mode-toggle[data-mode="${mode}"]`)).toHaveAttribute('aria-checked', 'true');
  }

  if (options.placeTimerSec !== undefined) await pickTimer(page, 'Minen legen', options.placeTimerSec);
  if (options.digTimerSec !== undefined) await pickTimer(page, 'Graben', options.digTimerSec);
}

async function pickTimer(page: Page, label: string, seconds: number): Promise<void> {
  const row = page.locator('.timer-row', { hasText: label });
  await row.getByRole('radio', { name: seconds === 0 ? 'Aus' : `${seconds} s` }).click();
}

/**
 * Teilt jedem Spieler zwei Zellen zu — die Grundlage jedes Szenarios.
 *
 * `forced` legt fest, wo ein bestimmter Spieler graben *muss* (dort wird spaeter
 * jemand hineintreten); alle anderen bekommen automatisch Zellen vom hinteren Ende des
 * Feldes, weit weg von den Testzellen. `avoid` haelt die Kiste frei, damit ein Szenario
 * den "Preis der Gier" gezielt ausloesen oder gezielt vermeiden kann.
 *
 * Von Hand abgezaehlte Indexlisten sind hier zu fehleranfaellig: Ein Off-by-one ergibt
 * eine Zelle, die es nicht gibt, und der Test laeuft in einen Timeout statt in eine
 * Fehlermeldung.
 */
export function layout(
  playerCount: number,
  spec: {
    forced?: Record<number, readonly number[]>;
    avoid?: readonly number[];
    size?: number;
    perPlayer?: number;
  } = {}
): (playerIndex: number) => readonly number[] {
  const size = spec.size ?? 5;
  const perPlayer = spec.perPlayer ?? 2;
  const taken = new Set<number>(spec.avoid ?? []);

  for (const cells of Object.values(spec.forced ?? {})) {
    for (const cell of cells) taken.add(cell);
  }

  const assigned: Record<number, number[]> = {};
  // Von hinten auffuellen: Die Szenarien arbeiten vorne, die Fuellminen stoeren dort nicht.
  let next = size * size - 1;

  for (let index = 0; index < playerCount; index++) {
    const forced = spec.forced?.[index];
    if (forced) {
      if (forced.length !== perPlayer) {
        throw new Error(`Spieler ${index} braucht genau ${perPlayer} Zellen, bekam ${forced.length}.`);
      }
      assigned[index] = [...forced];
      continue;
    }

    const cells: number[] = [];
    while (cells.length < perPlayer) {
      if (next < 0) throw new Error('Zu wenige freie Zellen fuer dieses Szenario.');
      if (!taken.has(next)) {
        taken.add(next);
        cells.push(next);
      }
      next -= 1;
    }
    assigned[index] = cells;
  }

  return (playerIndex) => assigned[playerIndex] ?? [];
}

/**
 * Die geheime Minenphase fuer alle Spieler durchspielen.
 *
 * `cellsFor(index)` liefert die Zellen, die Spieler `index` vergraebt — so kann ein Test
 * genau bestimmen, wer wen spaeter erwischt. Ohne Angabe legt jeder zwei freie Zellen.
 */
export async function buryMines(
  page: Page,
  playerCount: number,
  cellsFor?: (playerIndex: number) => readonly number[]
): Promise<void> {
  for (let index = 0; index < playerCount; index++) {
    await tapPass(page);
    // Wie bei `startDigging`: erst wenn eine Platte da ist, laeuft `activate()` durch.
    await expect(page.locator('[data-screen="place"] .tile--covered').first()).toBeVisible();

    const cells = cellsFor?.(index) ?? [index * 2, index * 2 + 1];
    for (const cell of cells) {
      await page.locator(`.tile[data-cell="${cell}"]`).click();
    }

    const bury = page.getByRole('button', { name: 'Vergraben' });
    await expect(bury).toBeEnabled();
    await bury.click();
  }

  await expect(page.locator('[data-screen="buried"]')).toBeVisible();
}

/**
 * Vom Buried-Screen in die Grabphase.
 *
 * Gewartet wird auf die **erste Platte**, nicht nur auf den Screen: Der Router haengt
 * den Screen vor dem Wipe ein und ruft `activate()` erst danach — dazwischen steht das
 * Feld zwar im DOM, ist aber noch leer. Wer nur auf `[data-screen="dig"]` wartet,
 * beginnt also zu graben, bevor es etwas zu graben gibt.
 */
export async function startDigging(page: Page): Promise<void> {
  await page.getByRole('button', { name: "Los geht's" }).click();
  await expect(page.locator('[data-screen="dig"]')).toBeVisible();
  await expect(page.locator('.tile--covered').first()).toBeVisible({ timeout: 15_000 });
}

/**
 * Warten, bis eine Grabung abgeschlossen ist.
 *
 * Zwei moegliche Ausgaenge, und der Test muss beide kennen: Normalerweise gibt das Feld
 * sich nach dem Banner wieder frei. Findet jemand die Kiste, bleibt es **absichtlich**
 * gesperrt und der Screen wechselt — auf ein Entsperren zu warten, das nie kommt,
 * waere ein sicherer Timeout.
 */
export async function settle(page: Page): Promise<void> {
  await expect(async () => {
    if (!(await page.locator('[data-screen="dig"]').isVisible())) return;
    await expect(page.locator('.board')).not.toHaveAttribute('aria-busy', 'true', { timeout: 500 });
  }).toPass({ timeout: 20_000 });
}

/** Eine Platte aufgraben und warten, bis die Inszenierung durch ist. */
export async function dig(page: Page, cell: number): Promise<void> {
  await page.locator(`.tile[data-cell="${cell}"]`).click();
  await settle(page);
}

/**
 * Findet die Kiste, indem der Reihe nach gegraben wird — fuer Tests, die nur ein
 * Rundenende brauchen und denen egal ist, wie es zustande kommt.
 */
export async function digUntilRoundOver(page: Page, maxDigs = 40): Promise<void> {
  for (let i = 0; i < maxDigs; i++) {
    if (!(await page.locator('[data-screen="dig"]').isVisible())) return;
    const closed = page.locator('.tile--covered:not([disabled])').first();
    if ((await closed.count()) === 0) return;
    await closed.click();
    await settle(page);
  }
  throw new Error(`Die Runde war nach ${maxDigs} Grabungen nicht vorbei — das kann nicht sein.`);
}

/**
 * Warten, bis die Runde wirklich vorbei ist.
 *
 * Nach dem letzten Zug laeuft noch der Wipe — wer direkt danach den Screen abfragt,
 * trifft ihn im Wechsel und bekommt weder das eine noch das andere.
 */
export async function awaitRoundEnd(page: Page): Promise<void> {
  await expect(page.locator('[data-screen="distribute"], [data-screen="result"]').first()).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Alle Verteil-Schritte durchklicken: jeder gibt alles dem ersten erlaubten Ziel.
 *
 * Der Screen bleibt zwischen zwei Verteilern derselbe und wird nur neu aufgebaut
 * (DistributeScreen: `router.refresh()`), deshalb ist der Name im Kopf das einzige
 * verlaessliche Signal, dass der naechste an der Reihe ist.
 */
export async function distributeAll(page: Page): Promise<void> {
  await awaitRoundEnd(page);

  for (let step = 0; step < 10; step++) {
    if (!(await page.locator('[data-screen="distribute"]').isVisible())) break;

    const before = await page.locator('.distribute__hand-to').textContent();
    const target = page.locator('.distribute__target:not([disabled])').first();
    const payout = page.getByRole('button', { name: 'Auszahlen' });

    while (await payout.isDisabled()) {
      await target.click();
    }
    await payout.click();

    await expect(async () => {
      if (await page.locator('[data-screen="result"]').isVisible()) return;
      expect(await page.locator('.distribute__hand-to').textContent()).not.toBe(before);
    }).toPass({ timeout: 15_000 });
  }

  await expect(page.locator('[data-screen="result"]')).toBeVisible({ timeout: 20_000 });
}

/** Die Zelle, unter der die Kiste liegt — aus dem Replay des Result-Screens. */
export async function treasureCellFromReplay(page: Page): Promise<number> {
  const tile = page.locator('[data-screen="result"] .tile', { has: page.locator('.tile__chest') }).first();
  const cell = await tile.getAttribute('data-cell');
  return Number(cell);
}
