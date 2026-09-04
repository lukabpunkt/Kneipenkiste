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
  dig,
  digUntilRoundOver,
  distributeAll,
  layout,
  openLobby,
  settle,
  startDigging,
  tapPass,
  treasureCellFromReplay,
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
    await expect(page.getByRole('button', { name: 'Vergraben' })).toBeDisabled();

    await page.locator('.tile[data-cell="0"]').click();
    await expect(page.locator('.place__counter')).toContainText('1 / 2');
    await expect(page.getByRole('button', { name: 'Vergraben' })).toBeDisabled();

    await page.locator('.tile[data-cell="1"]').click();
    await expect(page.locator('.place__counter')).toContainText('2 / 2');
    await expect(page.getByRole('button', { name: 'Vergraben' })).toBeEnabled();

    // Dritte Mine wird abgewiesen, das Feld bleibt bei zwei.
    await page.locator('.tile[data-cell="2"]').click();
    await expect(page.locator('.place__counter')).toContainText('2 / 2');
    await expect(page.locator('.tile--armed')).toHaveCount(2);

    // Toggle nimmt die eigene wieder weg.
    await page.locator('.tile[data-cell="0"]').click();
    await expect(page.locator('.tile--armed')).toHaveCount(1);
    await page.locator('.tile[data-cell="0"]').click();

    await page.getByRole('button', { name: 'Vergraben' }).click();

    // Spieler 2 sieht ein leeres Feld — von Spieler 1 ist nichts zu sehen.
    await tapPass(page);
    await expect(page.locator('[data-screen="place"] .tile').first()).toBeVisible();
    await expect(page.locator('.tile--armed')).toHaveCount(0);
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
    await page.locator('.tile[data-cell="0"]').click();

    const banner = page.locator('.drink-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('TRINKT 2');
    await expect(banner.locator('.kill-feed__text')).toContainText('Spieler 2');
    await expect(banner.locator('.kill-feed__text')).toContainText('Spieler 1');
    await expect(banner.locator('.badge')).toHaveCount(2);

    await settle(page);

    // Der Krater traegt den Farbring des Legers.
    await expect(page.locator('.tile[data-cell="0"]')).toHaveClass(/tile--crater/);
    await expect(page.locator('.tile[data-cell="0"] .tile__ring')).toHaveCount(1);
    // Ein Token ist angefallen.
    await expect(page.locator('.token-chip')).toHaveCount(1);

    /* --- Kistenfund --- */
    await dig(page, chest);
    await expect(page.locator('[data-screen="distribute"]')).toBeVisible();

    await distributeAll(page);
    await expect(page.locator('[data-screen="result"]')).toBeVisible();
    await expect(page.locator('.result__banner')).toContainText('hat die Kiste');
    expect(await treasureCellFromReplay(page)).toBe(chest);

    /* --- Runde 2: Preis der Gier --- */
    await page.getByRole('button', { name: 'Nächste Runde' }).click();

    const chest2 = treasureCell(seed, 2);
    // Spieler 1 legt genau darauf; Spieler 2 graebt sie als Erster auf → Preis der Gier.
    await buryMines(page, 4, layout(4, { forced: { 0: [chest2, chest2 === 0 ? 1 : 0] } }));
    await startDigging(page);

    await page.locator(`.tile[data-cell="${chest2}"]`).click();
    await expect(page.locator('.drink-banner__headline')).toContainText('GIER');
    // Der Preis der Gier beendet die Runde: Das Feld bleibt gesperrt, der Screen wechselt.
    await expect(page.locator('[data-screen="dig"]')).toBeHidden({ timeout: 20_000 });

    await distributeAll(page);
    await expect(page.locator('[data-screen="result"]')).toBeVisible();
    await expect(page.locator('.result__banner')).toContainText('Preis der Gier');

    // Beide Zeichen stehen auf derselben Platte: Krater **und** Kiste.
    const greedTile = page.locator(`[data-screen="result"] .tile[data-cell="${chest2}"]`);
    await expect(greedTile).toHaveClass(/tile--greed/);
    await expect(greedTile.locator('.tile__chest')).toHaveCount(1);
    expect(await greedTile.locator('.tile__ring').count()).toBeGreaterThan(0);
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
    await dig(page, mined);
    const minedTile = page.locator(`.tile[data-cell="${mined}"]`);
    await expect(minedTile).toHaveClass(/tile--empty/);
    await expect(minedTile.locator('.tile__ring')).toHaveCount(0);
    // Kein Banner, kein Kill-Feed: Es ist nichts passiert.
    await expect(page.locator('.drink-banner')).toHaveCount(0);
    const minedHtml = await minedTile.innerHTML();
    const minedClasses = await minedTile.getAttribute('class');

    // Ein echtes leeres Feld daneben.
    await dig(page, plain);
    const plainTile = page.locator(`.tile[data-cell="${plain}"]`);
    const plainClasses = await plainTile.getAttribute('class');

    /*
     * Die Klassenlisten muessen identisch sein. Der `critter` darf sich unterscheiden —
     * er kommt aus Seed und Zelle, nicht aus dem Inhalt (ADR-2).
     */
    expect(minedClasses).toBe(plainClasses);
    expect(minedHtml).not.toContain('tile__ring');

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

    await page.locator(`.tile[data-cell="${dudCell}"]`).click();

    const banner = page.locator('.drink-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Pfff');
    // Der Leger wird gezeigt — das ist der Bluff (GDD §3.6).
    await expect(banner.locator('.kill-feed__text')).toContainText('Spieler 2');
    // ... aber niemand trinkt.
    await expect(banner).not.toContainText('TRINKT');

    await settle(page);
    await expect(page.locator(`.tile[data-cell="${dudCell}"]`)).toHaveClass(/tile--dud/);
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
    await dig(page, origin);

    // Die mitgerissenen Krater sind als solche markiert und zeigen ihre Leger.
    const chained = page.locator('.tile--chained');
    expect(await chained.count()).toBeGreaterThan(0);
    for (const tile of await chained.all()) {
      expect(await tile.locator('.tile__ring').count()).toBeGreaterThan(0);
    }

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

    await expect(page.locator('[data-screen="distribute"]')).toBeVisible();

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

    const rings = page.locator('[data-screen="result"] .tile__ring--revealed');
    expect(await rings.count()).toBe(8);
    // Keine davon ist hochgegangen — alle acht tragen das "Puh"-Schild.
    expect(await page.locator('.tile__phew').count()).toBe(8);
  });

  test('fuehrt die Session-Statistik ueber mehrere Runden', async ({ page }) => {
    const seed = 33;

    await openLobby(page, { players: 3, seed });
    await page.getByRole('button', { name: 'Feld verminen' }).click();

    for (let round = 0; round < 2; round++) {
      if (round > 0) await page.getByRole('button', { name: 'Nächste Runde' }).click();
      await buryMines(page, 3);
      await startDigging(page);
      await digUntilRoundOver(page);
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
    await expect(page.locator('[data-screen="place"] .tile').first()).toBeVisible();

    const box = await page.locator('.tile').first().boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(56);
    expect(box!.height).toBeGreaterThanOrEqual(56);

    // Abstand zwischen zwei Platten ≥ 6 px.
    const second = await page.locator('.tile').nth(1).boundingBox();
    expect(second!.x - (box!.x + box!.width)).toBeGreaterThanOrEqual(6);
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
