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

import { expect, type Locator, type Page } from '@playwright/test';

/* ------------------------------------------------------------------ */
/* Das PIXI-Feld antippen (ab M2)                                      */
/* ------------------------------------------------------------------ */

/**
 * Die Welt ist 1000 × 1500 Einheiten im Hochformat (ADR-12); das Feld sitzt oben, die
 * Digger-Baenke darunter. Diese Zahlen spiegeln `config/theme.ts` — sie stehen hier noch
 * einmal, damit der Test die Umrechnung **unabhaengig** vom Produktionscode macht. Ein
 * Test, der dieselbe Funktion benutzt wie der Code, prueft nur sich selbst.
 */
const WORLD = { width: 1000, height: 1500 } as const;
const LAYOUT = { 5: { plate: 185, gap: 18 }, 6: { plate: 153, gap: 16 } } as const;
const FIELD_TOP = { single: 155, double: 255 } as const;

/** Bildschirmposition einer Zelle im Canvas. */
export async function cellPoint(
  page: Page,
  cell: number,
  size: 5 | 6 = 5,
  playerCount = 4
): Promise<{ x: number; y: number }> {
  const canvas: Locator = page.locator('.stage-host canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Das Canvas ist nicht sichtbar.');

  const layout = LAYOUT[size];
  const extent = size * layout.plate + (size - 1) * layout.gap;
  const top = playerCount >= 6 ? FIELD_TOP.double : FIELD_TOP.single;

  const worldX =
    (WORLD.width - extent) / 2 + layout.plate / 2 + (cell % size) * (layout.plate + layout.gap);
  const worldY = top + layout.plate / 2 + Math.floor(cell / size) * (layout.plate + layout.gap);

  return {
    x: box.x + (worldX / WORLD.width) * box.width,
    y: box.y + (worldY / WORLD.height) * box.height,
  };
}

/** Tippt eine Platte im PIXI-Feld an. */
export async function tapCell(page: Page, cell: number, size: 5 | 6 = 5, playerCount = 4): Promise<void> {
  const point = await cellPoint(page, cell, size, playerCount);
  await page.mouse.click(point.x, point.y);
}

/** Wartet, bis das Feld gerendert ist — `activate()` laeuft erst nach dem Wipe. */
export async function waitForBoard(page: Page): Promise<void> {
  await expect(page.locator('.stage-host canvas')).toBeVisible({ timeout: 20_000 });
  // Die Bruecke steht erst, wenn die Buehne fertig gemountet ist.
  await page.waitForFunction(() => globalThis.__sprengmeister !== undefined, { timeout: 20_000 });
  await page.waitForTimeout(200);
}

/* ------------------------------------------------------------------ */
/* Die Test-Bruecke (src/game/testBridge.ts)                           */
/* ------------------------------------------------------------------ */

/**
 * Das Feld ist ein Canvas — ein Test kann daran nichts ablesen. Diese Helfer fragen die
 * Bruecke, die der E2E-Build bereitstellt (ADR-11).
 */
export function tileState(page: Page, cell: number): Promise<string | undefined> {
  return page.evaluate((c) => globalThis.__sprengmeister?.tileState(c), cell);
}

export function tileColors(page: Page, cell: number): Promise<string[]> {
  return page.evaluate((c) => globalThis.__sprengmeister?.tileColors(c) ?? [], cell);
}

export function countTiles(page: Page, state: string): Promise<number> {
  return page.evaluate((s) => globalThis.__sprengmeister?.countTiles(s as never) ?? 0, state);
}

export function drawCalls(page: Page): Promise<number> {
  return page.evaluate(() => globalThis.__sprengmeister?.drawCalls() ?? 0);
}

export function frameTimes(page: Page): Promise<number[]> {
  return page.evaluate(() => globalThis.__sprengmeister?.frameTimes() ?? []);
}

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
  const size = playerCount >= 6 ? 6 : 5;

  for (let index = 0; index < playerCount; index++) {
    await tapPass(page);
    await waitForBoard(page);

    const cells = cellsFor?.(index) ?? [index * 2, index * 2 + 1];
    for (const cell of cells) {
      await tapCell(page, cell, size, playerCount);
      await page.waitForTimeout(120);
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
  await waitForBoard(page);
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
  /*
   * Das Feld sagt selbst, wann es fertig ist: Der `DigDirector` sperrt es fuer die Dauer
   * der Inszenierung und gibt es danach wieder frei (Architektur §3).
   *
   * Auf das Banner zu warten reicht nicht — bei einem leeren Feld gibt es keins, und der
   * Test wuerde pruefen, bevor die Anticipation ueberhaupt durch ist.
   */
  await page
    .waitForFunction(() => globalThis.__sprengmeister?.locked() === true, { timeout: 5000 })
    .catch(() => undefined);

  await page.waitForFunction(
    () =>
      document.querySelector('[data-screen="dig"]') === null ||
      globalThis.__sprengmeister?.locked() === false,
    { timeout: 25_000 }
  );
  await page.waitForTimeout(250);
}

/** Eine Platte aufgraben und warten, bis die Inszenierung durch ist. */
export async function dig(page: Page, cell: number, size: 5 | 6 = 5, playerCount = 4): Promise<void> {
  await tapCell(page, cell, size, playerCount);
  await settle(page);
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
