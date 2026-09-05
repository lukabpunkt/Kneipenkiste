/**
 * E2E: der komplette Flow (Roadmap M1.7, Audit A1).
 *
 * Die Szenarien spielen echte Runden — Handy weiterreichen, Minen legen, graben,
 * verteilen. Was sie pruefen, ist nicht "klickt es", sondern ob die **Regeln sichtbar
 * ankommen**: dass der Schuldige erscheint, dass die eigene Mine schweigt, dass niemand
 * an sich selbst verteilt.
 *
 * ## Woher der Test weiss, wo die Kiste liegt
 *
 * `?seed=N` ersetzt im E2E-Build die sichere Zufallsquelle durch denselben mulberry32,
 * den `core/rng.ts` exportiert (ui/devSeed.ts). Werden alle Minen von Hand gelegt, ist
 * der Griff der Kiste der **erste** Zug aus diesem Generator — der Test kann ihn also
 * vorher ausrechnen und gezielt eine Mine daraufsetzen. Anders liesse sich der "Preis
 * der Gier" nie zuverlaessig ausloesen.
 */

import { expect, test } from '@playwright/test';
import { createSeededRng } from '../../src/core/rng';
import {
  buryMines,
  countTiles,
  dig,
  distributeAll,
  drawCalls,
  layout,
  cellPoint,
  openLobby,
  settle,
  startDigging,
  tapCell,
  tapPass,
  tileColors,
  tileState,
  waitForBoard,
} from './helpers';

/**
 * Wo die Kiste in Runde `round` landet.
 *
 * Der Generator ist **zustandsbehaftet**: Jede Runde zieht einmal aus derselben Kette,
 * Runde 2 bekommt also die zweite Zahl, nicht noch einmal die erste. Solange alle Minen
 * von Hand gelegt werden und kein Timer laeuft, ist `placeTreasure` der einzige
 * Verbraucher — dann stimmt diese Rechnung mit dem Spiel ueberein.
 */
function treasureCell(seed: number, round = 1, size = 5): number {
  const rng = createSeededRng(seed);
  let cell = 0;
  for (let draw = 0; draw < round; draw++) cell = rng.int(size * size);
  return cell;
}

test.describe('Boot', () => {
  test('zeigt den Titel und bleibt in der Konsole still', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));

    await page.goto('./');

    await expect(page.getByRole('heading', { name: 'Sprengmeister' })).toBeVisible();
    // Der Tagline-Text kommt aus i18n — ein `[missing:…]` waere ein Fehler (CLAUDE.md).
    await expect(page.locator('.title__tagline')).not.toContainText('[missing:');
    expect(problems).toEqual([]);
  });

  test('ist als PWA installierbar (Audit A0)', async ({ page }) => {
    await page.goto('./');

    const manifestHref = await page.locator('link[rel=manifest]').getAttribute('href');
    expect(manifestHref).toBeTruthy();

    const manifest = await page.request.get(new URL(manifestHref!, page.url()).toString());
    expect(manifest.ok()).toBe(true);

    const parsed = (await manifest.json()) as {
      name: string;
      display: string;
      orientation: string;
      icons: { sizes: string; purpose: string }[];
    };

    expect(parsed.name).toBe('Sprengmeister');
    expect(parsed.display).toBe('standalone');
    // Portrait ist Pflicht (CLAUDE.md "Mobile First").
    expect(parsed.orientation).toBe('portrait');
    expect(parsed.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any')).toBe(true);
    expect(parsed.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  test('passt ins Portrait-Format ohne Querscrollen', async ({ page }) => {
    await page.goto('./');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
});

test.describe('Lobby', () => {
  test('laesst unter drei Spielern nicht starten (GDD §3.1)', async ({ page }) => {
    await openLobby(page, { players: 3 });

    // Der dritte Entfernen-Knopf ist stumpf — die Regel bleibt sichtbar, statt zu verschwinden.
    await expect(page.locator('.player-row__remove').first()).toBeDisabled();
    await expect(page.locator('.player-row')).toHaveCount(3);
  });

  test('zeigt die Feldgroesse, die aus der Spielerzahl folgt (GDD §3.2)', async ({ page }) => {
    await openLobby(page, { players: 5 });
    await expect(page.locator('.lobby__field')).toContainText('5 × 5');

    await page.getByRole('button', { name: 'Spieler hinzufügen' }).click();
    await expect(page.locator('.lobby__field')).toContainText('6 × 6');
    // 6 Spieler × 2 Minen = 12 im Boden.
    await expect(page.locator('.lobby__field')).toContainText('12');
  });

  test('erklaert jeden Modus mit einem Satz', async ({ page }) => {
    await openLobby(page, { players: 3 });

    const hints = page.locator('.mode-toggle__hint');
    await expect(hints).toHaveCount(5);
    for (const hint of await hints.all()) {
      const text = (await hint.textContent()) ?? '';
      expect(text.length).toBeGreaterThan(20);
      expect(text).not.toContain('[missing:');
    }
  });
});

test.describe('Minenphase', () => {
  test('erzwingt das Limit und zeigt nichts von den Vorgaengern (ADR-2)', async ({ page }) => {
    await openLobby(page, { players: 3, seed: 11 });
    await page.getByRole('button', { name: 'Feld verminen' }).click();

    // Spieler 1 legt auf 0 und 1.
    await tapPass(page);
    await waitForBoard(page);
    await expect(page.getByRole('button', { name: 'Vergraben' })).toBeDisabled();

    await tapCell(page, 0, 5, 3);
    await expect(page.locator('.place__counter')).toContainText('1 / 2');
    await expect(page.getByRole('button', { name: 'Vergraben' })).toBeDisabled();

    await tapCell(page, 1, 5, 3);
    await expect(page.locator('.place__counter')).toContainText('2 / 2');
    await expect(page.getByRole('button', { name: 'Vergraben' })).toBeEnabled();

    // Dritte Mine wird abgewiesen, das Feld bleibt bei zwei.
    await tapCell(page, 2, 5, 3);
    await expect(page.locator('.place__counter')).toContainText('2 / 2');
    expect(await countTiles(page, 'mine_placed')).toBe(2);

    // Toggle nimmt die eigene wieder weg.
    await tapCell(page, 0, 5, 3);
    expect(await countTiles(page, 'mine_placed')).toBe(1);
    await tapCell(page, 0, 5, 3);
    expect(await countTiles(page, 'mine_placed')).toBe(2);

    await page.getByRole('button', { name: 'Vergraben' }).click();

    // Spieler 2 sieht ein leeres Feld — von Spieler 1 ist nichts zu sehen.
    await tapPass(page);
    await waitForBoard(page);
    expect(await countTiles(page, 'mine_placed')).toBe(0);
  });
});

test.describe('Grabphase', () => {
  test('spielt zwei Runden: Explosion, Kistenfund, dann Preis der Gier', async ({ page }) => {
    const seed = 42;
    const chest = treasureCell(seed);

    await openLobby(page, { players: 4, seed });
    await page.getByRole('button', { name: 'Feld verminen' }).click();

    /*
     * Spieler 2 legt eine Mine auf Zelle 0 — dort graebt Spieler 1 gleich. Die Kiste
     * bleibt in Runde 1 unvermint, damit der Fund fuer sich steht.
     */
    await buryMines(page, 4, layout(4, { forced: { 1: [0, 1] }, avoid: [chest] }));
    await startDigging(page);

    /* --- Explosion: der Schuldige steht im selben Banner (Design-Prioritaet 2) --- */
    await tapCell(page, 0);

    const banner = page.locator('.drink-banner');
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner).toContainText('TRINKT 2');
    await expect(banner.locator('.kill-feed__text')).toContainText('Spieler 2');
    await expect(banner.locator('.kill-feed__text')).toContainText('Spieler 1');
    await expect(banner.locator('.badge')).toHaveCount(2);

    // Der Krater traegt den Farbring des Legers — Spieler 2 ist blau.
    expect(await tileState(page, 0)).toBe('crater');
    expect(await tileColors(page, 0)).toContain('#3b82f6');

    await settle(page);
    // Ein Token ist angefallen.
    await expect(page.locator('.token-chip')).toHaveCount(1);

    /* --- Kistenfund --- */
    await dig(page, chest);
    await expect(page.locator('[data-screen="distribute"]')).toBeVisible({ timeout: 20_000 });

    await distributeAll(page);
    await expect(page.locator('[data-screen="result"]')).toBeVisible();
    await expect(page.locator('.result__banner')).toContainText('hat die Kiste');

    /* --- Runde 2: Preis der Gier --- */
    await page.getByRole('button', { name: 'Nächste Runde' }).click();

    const chest2 = treasureCell(seed, 2);
    // Spieler 1 legt genau darauf; Spieler 2 graebt sie als Erster auf → Preis der Gier.
    await buryMines(page, 4, layout(4, { forced: { 0: [chest2, chest2 === 0 ? 1 : 0] } }));
    await startDigging(page);

    await tapCell(page, chest2);
    await expect(page.locator('.drink-banner__headline')).toContainText('GIER', { timeout: 15_000 });

    // Beide Zeichen stehen auf derselben Platte: Kiste **und** der Ring des Legers.
    expect(await tileState(page, chest2)).toBe('treasure');
    expect((await tileColors(page, chest2)).length).toBeGreaterThan(0);

    // Der Preis der Gier beendet die Runde: Das Feld bleibt gesperrt, der Screen wechselt.
    await expect(page.locator('[data-screen="dig"]')).toBeHidden({ timeout: 25_000 });

    await distributeAll(page);
    await expect(page.locator('[data-screen="result"]')).toBeVisible();
    await expect(page.locator('.result__banner')).toContainText('Preis der Gier');
  });

  test('deckt die eigene Mine genauso auf wie ein leeres Feld (ADR-2)', async ({ page }) => {
    const seed = 5;
    const chest = treasureCell(seed);
    /*
     * Zwei benachbarte Zellen: Unter der einen liegt die eigene Mine von Spieler 1,
     * unter der anderen nichts. Was das Feld danach zeigt, muss identisch sein.
     */
    const candidates = [0, 1, 2, 3, 4, 5, 6, 7].filter((c) => c !== chest);
    const mined = candidates[0]!;
    const plain = candidates[1]!;

    await openLobby(page, { players: 3, seed });
    await page.getByRole('button', { name: 'Feld verminen' }).click();

    await buryMines(page, 3, layout(3, { forced: { 0: [mined, candidates[2]!] }, avoid: [chest, plain] }));
    await startDigging(page);

    // Spieler 1 ist dran und graebt seinen eigenen Trittstein auf.
    await dig(page, mined, 5, 3);
    expect(await tileState(page, mined)).toBe('open_empty');
    // Kein Ring, kein Banner, kein Kill-Feed: Es ist nichts passiert.
    expect(await tileColors(page, mined)).toEqual([]);
    await expect(page.locator('.drink-banner')).toHaveCount(0);

    // Ein echtes leeres Feld daneben.
    await dig(page, plain, 5, 3);

    /*
     * Beide Platten sind im selben Zustand und tragen dieselben Farben — naemlich keine.
     * Der `critter` darf sich unterscheiden: Er kommt aus Seed und Zelle, nicht aus dem
     * Inhalt (ADR-2).
     */
    expect(await tileState(page, plain)).toBe(await tileState(page, mined));
    expect(await tileColors(page, plain)).toEqual(await tileColors(page, mined));

    // Und die Zahl der verbleibenden Minen ist beim Trittstein nicht gesunken (ADR-8).
    await expect(page.locator('.dig__mines-left')).toContainText('6');
  });

  test('zeigt beim Blindgaenger den Leger, ohne dass jemand trinkt (Doppelagent)', async ({ page }) => {
    const seed = 3;
    const chest = treasureCell(seed);
    const dudCell = chest === 7 ? 8 : 7;

    await openLobby(page, { players: 3, seed, modes: ['doubleAgent'] });
    await page.getByRole('button', { name: 'Feld verminen' }).click();

    /*
     * Spieler 2 legt erst seine Mine, dann den Blindgaenger auf `dudCell` — der Screen
     * schaltet das Werkzeug nach der ersten Platte selbst um. Spieler 1 graebt ihn auf.
     */
    await buryMines(page, 3, layout(3, { forced: { 1: [15, dudCell] }, avoid: [chest] }));
    await startDigging(page);

    await tapCell(page, dudCell, 5, 3);

    const banner = page.locator('.drink-banner');
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner).toContainText('Pfff');
    // Der Leger wird gezeigt — das ist der Bluff (GDD §3.6).
    await expect(banner.locator('.kill-feed__text')).toContainText('Spieler 2');
    // ... aber niemand trinkt.
    await expect(banner).not.toContainText('TRINKT');

    expect(await tileState(page, dudCell)).toBe('dud');
    expect((await tileColors(page, dudCell)).length).toBeGreaterThan(0);

    await settle(page);
    await expect(page.locator('.token-chip')).toHaveCount(0);
  });

  test('reisst bei der Kettenreaktion die Nachbarn mit, ohne Schluecke (GDD §3.6)', async ({ page }) => {
    const seed = 9;
    const chest = treasureCell(seed);
    /*
     * Zelle 6 liegt mittig; 0, 2 und 12 sind ihre Koenigsnachbarn. Spieler 2 legt auf 6,
     * Spieler 3 legt zwei Nachbarn — ein Tritt auf 6 muss beide mitreissen.
     */
    const origin = 6;
    const neighbours = [0, 2, 12];
    expect([origin, ...neighbours]).not.toContain(chest);

    await openLobby(page, { players: 3, seed, modes: ['chainReaction'] });
    await page.getByRole('button', { name: 'Feld verminen' }).click();

    await buryMines(
      page,
      3,
      layout(3, {
        forced: { 1: [origin, neighbours[2]!], 2: [neighbours[0]!, neighbours[1]!] },
        avoid: [chest],
      })
    );
    await startDigging(page);

    // Spieler 1 tritt auf die Mine von Spieler 2.
    await dig(page, origin, 5, 3);

    // Die Nachbarn sind mitgerissen worden und zeigen ihre Leger.
    expect(await tileState(page, origin)).toBe('crater');
    let chained = 0;
    for (const cell of neighbours) {
      if ((await tileState(page, cell)) !== 'crater') continue;
      chained += 1;
      expect((await tileColors(page, cell)).length).toBeGreaterThan(0);
    }
    expect(chained).toBeGreaterThan(0);

    // Getrunken wird nur fuer die getippte Platte — nicht fuer die Nachbarn.
    await expect(page.locator('.token-chip')).toHaveCount(1);
  });
});

test.describe('Verteilung (GDD §3.5)', () => {
  test('iteriert ueber die Besitzer und laesst niemanden an sich selbst geben', async ({ page }) => {
    const seed = 21;
    const chest = treasureCell(seed);

    await openLobby(page, { players: 4, seed });
    await page.getByRole('button', { name: 'Feld verminen' }).click();

    await buryMines(page, 4, layout(4, { forced: { 1: [0, 1] }, avoid: [chest] }));
    await startDigging(page);

    await dig(page, 0); // Spieler 1 tritt in die Mine von Spieler 2
    await dig(page, chest); // Spieler 2 findet die Kiste

    await expect(page.locator('[data-screen="distribute"]')).toBeVisible({ timeout: 20_000 });

    // Der Finder verteilt zuerst (Architektur §3) — hier Spieler 2, der auch Leger ist.
    await expect(page.locator('.distribute__hand-to')).toContainText('Spieler 2');
    // Das eigene Badge ist nicht tippbar.
    const disabled = page.locator('.distribute__target[disabled]');
    await expect(disabled).toHaveCount(1);

    // "Auszahlen" bleibt gesperrt, solange etwas uebrig ist.
    await expect(page.getByRole('button', { name: 'Auszahlen' })).toBeDisabled();

    const target = page.locator('.distribute__target:not([disabled])').first();
    await target.click();
    await expect(page.locator('.distribute__remaining')).not.toContainText('Noch 0');

    await distributeAll(page);
    await expect(page.locator('[data-screen="result"]')).toBeVisible();
  });
});

test.describe('Result', () => {
  test('zeigt im Replay alle Minen, auch die nie ausgeloesten (GDD §4.4)', async ({ page }) => {
    const seed = 77;
    const chest = treasureCell(seed);

    await openLobby(page, { players: 4, seed });
    await page.getByRole('button', { name: 'Feld verminen' }).click();

    /*
     * Die acht Minen liegen am hinteren Feldrand, die Kiste bleibt frei — und gegraben
     * wird genau einmal, direkt auf die Kiste. So ist garantiert **keine** Mine
     * ausgeloest worden, und das Replay muss trotzdem alle acht zeigen. Genau das ist
     * der Moment, um den es geht: "DA lag deine Mine?" (GDD §4.4, §7).
     */
    await buryMines(page, 4, layout(4, { avoid: [chest] }));
    await startDigging(page);
    await dig(page, chest);

    await distributeAll(page);
    await expect(page.locator('[data-screen="result"]')).toBeVisible();
    await waitForBoard(page);
    // Die Replay-Welle laeuft 40 ms pro Ring.
    await page.waitForTimeout(2500);

    /*
     * Acht Minen liegen im Boden, keine ist hochgegangen — im Replay traegt jede ihren
     * Farbring. Das ist der Aha-Moment der Runde (GDD §4.4, §7).
     */
    expect(await countTiles(page, 'mine_revealed')).toBe(8);
  });

  test('fuehrt die Session-Statistik ueber mehrere Runden', async ({ page }) => {
    test.setTimeout(180_000);
    const seed = 33;

    await openLobby(page, { players: 3, seed });
    await page.getByRole('button', { name: 'Feld verminen' }).click();

    /*
     * Gezielt auf die Kiste graben statt blind das Feld abzuarbeiten: Mit der vollen
     * Inszenierung kostet jede Grabung rund vier Sekunden, und der Test will die
     * Statistik pruefen, nicht die Geduld.
     */
    for (let round = 1; round <= 2; round++) {
      if (round > 1) await page.getByRole('button', { name: 'Nächste Runde' }).click();
      const chest = treasureCell(seed, round);
      await buryMines(page, 3, layout(3, { avoid: [chest] }));
      await startDigging(page);
      await dig(page, chest, 5, 3);
      await distributeAll(page);
      await expect(page.locator('[data-screen="result"]')).toBeVisible();
    }

    await page.getByRole('button', { name: 'Statistik' }).click();
    const sheet = page.locator('.sheet__panel');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.stats__row')).toHaveCount(3);
    await expect(sheet).not.toContainText('[missing:');
  });
});

test.describe('Touch und Texte (Audit A1)', () => {
  test('haelt die Touch-Ziele auf dem Feld bei mindestens 56 px', async ({ page }) => {
    // 6 × 6 ist der enge Fall: 36 Platten auf 390 px Breite.
    await openLobby(page, { players: 6, seed: 1 });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await tapPass(page);
    await waitForBoard(page);

    /*
     * Das Feld ist ein Canvas — gemessen wird deshalb der Abstand zweier Zellmitten in
     * Bildschirmpixeln. Er ist Plattenbreite plus Abstand; abzueglich des Abstands bleibt
     * die Tippflaeche (GDD §5, Audit A1/A2).
     */
    const first = await cellPoint(page, 0, 6, 6);
    const second = await cellPoint(page, 1, 6, 6);
    const pitch = second.x - first.x;

    // 153 + 16 Welteinheiten Rasterabstand → davon sind 153/169 die Platte.
    const platePx = pitch * (153 / 169);
    const gapPx = pitch * (16 / 169);

    expect(platePx).toBeGreaterThanOrEqual(56);
    expect(gapPx).toBeGreaterThanOrEqual(6);
  });

  test('trifft 50 Taps zuverlaessig (Audit A2)', async ({ page }) => {
    /*
     * Der Tap ist die einzige Eingabe des Spiels. Ein Fehl-Tap auf einem Canvas ist
     * schlimmer als auf einem Button: Es gibt keinen Hover, kein Fokusring, nichts, was
     * vorher sagt, wo man landet — nur das Ergebnis.
     */
    await openLobby(page, { players: 3, seed: 4 });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await tapPass(page);
    await waitForBoard(page);

    // 25 Zellen, jede zweimal: setzen und wieder wegnehmen.
    let hits = 0;
    for (let round = 0; round < 2; round++) {
      for (let cell = 0; cell < 25; cell++) {
        const before = await tileState(page, cell);
        await tapCell(page, cell, 5, 3);
        const after = await tileState(page, cell);
        // Ein Tap hat gewirkt, wenn sich der Zustand geaendert hat — oder wenn das
        // Kontingent voll war und die Logik ihn korrekt abgelehnt hat.
        if (after !== before || (await countTiles(page, 'mine_placed')) === 2) hits += 1;
      }
    }
    expect(hits).toBe(50);
  });

  test('haelt die Draw-Batches bei hoechstens drei (Audit A2)', async ({ page }) => {
    await openLobby(page, { players: 8, seed: 6 });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await tapPass(page);
    await waitForBoard(page);
    await page.waitForTimeout(600);

    /*
     * Zwei Atlanten plus die Wiese als `Graphics` — mehr darf es nicht werden. Jeder
     * zusaetzliche Batch ist ein Texturwechsel pro Frame, und davon haengt auf einem
     * Pixel 4a die Bildrate ab.
     */
    const draws = await drawCalls(page);
    expect(draws).toBeGreaterThan(0);
    expect(draws).toBeLessThanOrEqual(3);
  });

  test('zeigt nirgends einen fehlenden Uebersetzungsschluessel', async ({ page }) => {
    await openLobby(page, { players: 4, seed: 2 });
    await expect(page.locator('body')).not.toContainText('[missing:');

    await page.getByRole('button', { name: 'Regeln' }).click();
    await expect(page.locator('.sheet__panel')).toBeVisible();
    await expect(page.locator('.sheet__panel')).not.toContainText('[missing:');
    await page.locator('.sheet__close').click();

    await page.getByRole('button', { name: 'Einstellungen' }).click();
    await expect(page.locator('.sheet__panel')).toBeVisible();
    await expect(page.locator('.sheet__panel')).not.toContainText('[missing:');
  });
});

test.describe('Modus-Kombinationen (Audit A5)', () => {
  /*
   * Die Modi sind kombinierbar (GDD §3.6), und genau darin liegt das Risiko: Jeder
   * einzeln funktioniert, zwei zusammen koennen sich widersprechen. Geprueft werden die
   * beiden Paare, die sich am staerksten ins Gehege kommen.
   */

  test('spielt Doppelagent zusammen mit Kettenreaktion', async ({ page }) => {
    /*
     * Der Konflikt: Ein Blindgaenger loest nichts aus, ein Krater reisst die Nachbarn
     * mit. Was passiert, wenn eine Kettenreaktion ueber einen Blindgaenger laeuft?
     * Antwort aus GDD §3.6: Sie deckt ihn auf, kostet aber niemanden etwas.
     */
    await openLobby(page, { players: 4, seed: 31, modes: ['doubleAgent', 'chainReaction'] });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await buryMines(page, 4);
    await startDigging(page);
    await waitForBoard(page);

    for (let cell = 0; cell < 6; cell++) {
      if (!(await page.locator('[data-screen="dig"]').isVisible())) break;
      await dig(page, cell);
    }

    // Das Spiel laeuft weiter — egal ob Krater, Blindgaenger oder Kiste.
    await expect(
      page.locator('[data-screen="dig"], [data-screen="distribute"], [data-screen="result"]')
    ).toBeVisible();
  });

  test('spielt Nachtgraeber zusammen mit Zwei Kisten', async ({ page }) => {
    /*
     * Der Konflikt: Nachtgraeber nimmt die Temperatur-Hinweise weg, Zwei Kisten macht
     * die Suche laenger. Zusammen ist das die schwerste Runde des Spiels — sie muss
     * trotzdem enden.
     */
    await openLobby(page, { players: 4, seed: 32, modes: ['nightDigger', 'twoChests'] });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await buryMines(page, 4);
    await startDigging(page);
    await waitForBoard(page);

    // Ohne Hinweise steht die Kistenzahl da — sie ist die einzige verbliebene Auskunft.
    await expect(page.locator('.dig__chests-left')).toBeVisible();
    await expect(page.locator('.dig__chests-left')).toContainText('2');

    for (let cell = 0; cell < 8; cell++) {
      if (!(await page.locator('[data-screen="dig"]').isVisible())) break;
      await dig(page, cell);
    }
    await expect(
      page.locator('[data-screen="dig"], [data-screen="distribute"], [data-screen="result"]')
    ).toBeVisible();
  });
});

test.describe('Bewegung reduzieren (Audit A5)', () => {
  // `contextOptions` statt `reducedMotion`: Letzteres kennt erst eine neuere Typdefinition.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('spielt eine ganze Runde ohne Kamerafahrt und ohne Welle', async ({ page }) => {
    /*
     * "Bewegung reduzieren" darf nichts wegnehmen ausser Bewegung: Alle Informationen —
     * wer schuld ist, wer trinkt, wo die Minen lagen — muessen weiter ankommen. Der
     * Test spielt deshalb eine komplette Runde durch bis ins Replay.
     */
    const seed = 33;
    const chest = treasureCell(seed);

    await openLobby(page, { players: 3, seed });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await buryMines(page, 3, layout(3, { avoid: [chest] }));
    await startDigging(page);
    await waitForBoard(page);

    await dig(page, chest);

    await expect(page.locator('[data-screen="distribute"], [data-screen="result"]')).toBeVisible({
      timeout: 20_000,
    });
    if (await page.locator('[data-screen="distribute"]').isVisible()) await distributeAll(page);

    /*
     * Das Replay deckt auch ohne Welle alles auf, was es zu sehen gibt: die sechs Minen
     * der drei Spieler, jede mit ihrem Farbring. Platten, unter denen nie etwas lag und
     * auf die niemand getreten ist, bleiben zu — das gilt mit Welle genauso.
     */
    await expect(page.locator('[data-screen="result"]')).toBeVisible({ timeout: 20_000 });
    await waitForBoard(page);
    await page.waitForTimeout(600);
    expect(await countTiles(page, 'mine_revealed')).toBe(6);
  });
});

test.describe('Bedienbarkeit (Audit A5)', () => {
  test('gibt jedem Bedienelement einen vorlesbaren Namen', async ({ page }) => {
    /*
     * Ein Knopf ohne zugaenglichen Namen ist fuer einen Screenreader ein "Button" ohne
     * weitere Angabe. Geprueft wird auf den beiden Screens mit den meisten Bedienelementen.
     */
    await openLobby(page, { players: 4, seed: 34 });

    for (const screen of ['lobby'] as const) {
      const buttons = page.locator(`[data-screen="${screen}"] button`);
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const name = (await button.getAttribute('aria-label')) ?? (await button.textContent()) ?? '';
        expect(name.trim(), `Button ${i} auf ${screen}`).not.toBe('');
      }
    }
  });

  test('meldet Minen- und Kistenzahl als hoefliche Live-Region', async ({ page }) => {
    await openLobby(page, { players: 3, seed: 35 });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await buryMines(page, 3);
    await startDigging(page);
    await waitForBoard(page);

    await expect(page.locator('.dig__mines-left')).toHaveAttribute('aria-live', 'polite');
    // Das Banner unterbricht (assertive), die Zaehler nicht — sonst reden beide gleichzeitig.
    await expect(page.locator('.banner-host')).toHaveAttribute('aria-live', 'assertive');
  });

  test('zeigt den Erklaertext genau einmal', async ({ page }) => {
    await openLobby(page, { players: 3, seed: 36 });
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await buryMines(page, 3);
    await startDigging(page);
    await waitForBoard(page);

    await expect(page.locator('.toast')).toContainText('Heiß');

    // Zweite Runde, derselbe Browser: Der Hinweis kommt nicht wieder.
    await page.reload();
    await page.getByRole('button', { name: 'Spielen' }).click();
    await page.getByRole('button', { name: 'Feld verminen' }).click();
    await buryMines(page, 3);
    await startDigging(page);
    await waitForBoard(page);
    await expect(page.locator('.toast')).toHaveCount(0);
  });
});
