/**
 * E2E-Flow (Roadmap M1.7, Audit A1).
 *
 * Drei Runden mit 5 Spielern, jede mit einem anderen Ausgang:
 *   1. ein Fang, eine Belaestigung, ein Schmuggler kommt an der Schranke durch
 *   2. ehrliche Runde, alles durchgewunken → "Menschenkenntnis"
 *   3. Bestechung angenommen + Diplomat geoeffnet
 *
 * Gespielt wird ueber echte Taps auf die echte UI — nicht ueber den Store. Genau das
 * soll der Test finden: Screens, die den Spielzustand nicht mehr abbilden.
 */

import { expect, test, type Page } from '@playwright/test';

import { tapSuitcase } from './probe';

/** Ohne `?dev=1&seed=` waeren Item-Set, Hinweise und Diplomat nicht reproduzierbar. */
const URL_WITH_SEED = (seed: number): string => `./?dev=1&seed=${seed}`;

/* ------------------------------------------------------------------ */
/* Helfer                                                              */
/* ------------------------------------------------------------------ */

const screen = (page: Page) => page.locator('.screen');

async function expectScreen(page: Page, id: string, timeout = 20_000): Promise<void> {
  await expect(screen(page)).toHaveAttribute('data-screen', id, { timeout });
}

/**
 * Die Schranke ist der laengste Abschnitt des Spiels.
 *
 * Pro Reisendem bis zu 3 s Sequenz (`GATE.maxSequenceDuration`) plus 0,77 s Banner —
 * bei vier Reisenden lokal gemessene 14,5 s. Auf einem Runner ohne GPU dauert es
 * laenger, und die Runde ist trotzdem in Ordnung. Deshalb hier eine Grenze, die sich
 * aus der Choreografie ergibt statt aus einer runden Zahl.
 */
const GATE_TIMEOUT_MS = 8 * 5_000;

/** Der Pass-Screen ist erst nach der Tap-Sperre scharf (rules.ts: PASS_TAP_LOCK_MS). */
async function tapPass(page: Page): Promise<void> {
  await expectScreen(page, 'pass');
  const pass = page.locator('.screen--pass');
  await expect(pass).toHaveAttribute('data-armed', 'true');
  await pass.click();
}

/** Packt `amount` Stueck und schliesst den Koffer. */
async function pack(page: Page, amount: number): Promise<void> {
  await expectScreen(page, 'pack');
  const plus = page.locator('.stepper__btn').nth(1);
  for (let i = 0; i < amount; i++) await plus.click();
  await expect(page.locator('.stepper__value')).toHaveText(String(amount));
  await page.locator('.pack__close').click();
}

/** Alle Reisenden nacheinander packen lassen, dann in die Halle. */
async function packAll(page: Page, amounts: number[]): Promise<void> {
  await expectScreen(page, 'officerIntro');
  await page.locator('.screen--officer-intro').click();

  for (const amount of amounts) {
    await tapPass(page);
    await pack(page, amount);
  }

  await expectScreen(page, 'packed');
  const next = page.locator('.screen--packed .btn--primary');
  await expect(next).toBeEnabled();
  await next.click();
}

/** Wartet, bis die Buehne steht und die Hinweise durch sind, und beendet das Verhoer. */
async function endInterrogation(page: Page): Promise<void> {
  await expectScreen(page, 'hall');
  await expect(page.locator('.stage__canvas canvas')).toBeVisible({ timeout: 40_000 });
  /* "Nochmal ansehen" wird erst frei, wenn die Hinweise gelaufen sind. */
  await expect(page.locator('.hall__actions .btn--secondary')).toBeEnabled({ timeout: 40_000 });
  await page.locator('.hall__actions .btn--officer').last().click();
  await expectScreen(page, 'inspect');
  await waitForInspectableBoard(page);
}

/**
 * Wartet, bis die Bühne wirklich tippbar ist.
 *
 * `data-screen="inspect"` steht schon, bevor der Screen der Bühne den Modus gesetzt und
 * `publicView` übergeben hat — ein Tap davor liefe ins Leere. Ohne diese Wartezeit wäre
 * der Test flaky, und zwar auf eine Weise, die nach einem Bug im Spiel aussieht.
 */
async function waitForInspectableBoard(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__zollStage?.mode() === 'inspect', undefined, {
    timeout: 40_000,
  });
}

/**
 * Oeffnet einen Koffer und wartet den kompletten Scan ab.
 *
 * Getippt wird auf das Canvas an der Position, die die Dev-Sonde meldet — dieselbe
 * Stelle, an die ein Finger tippen wuerde.
 */
async function openCase(page: Page, playerId: string): Promise<string> {
  /*
   * Erst warten, bis das Board wieder frei ist. Während einer Sequenz sperrt der Screen
   * es — ein Tap davor wird korrekt verworfen, und der Test hätte auf ein Ereignis
   * gewartet, das nie kommen darf.
   */
  await expect(page.locator('.inspect__banner')).toHaveAttribute('data-kind', 'idle', {
    timeout: 30_000,
  });

  await tapSuitcase(page, playerId);

  /* Waehrend des Scans darf das Ergebnis nirgends stehen — "Scanline ist heilig". */
  const banner = page.locator('.inspect__banner');
  await expect(banner).toHaveAttribute('data-kind', 'scanning');
  await expect(banner).toHaveText(/Röntgen läuft/);

  await expect(banner).toHaveAttribute('data-kind', /caught|clean|diplomat/, { timeout: 20_000 });
  return (await banner.getAttribute('data-kind')) ?? '';
}

/** Verteilt alle Tokens des aktuellen Besitzers auf den ersten moeglichen Spieler. */
async function distributeAll(page: Page): Promise<void> {
  while ((await screen(page).getAttribute('data-screen')) === 'distribute') {
    const target = page.locator('.distribute__btn').first();
    const done = page.locator('.screen--distribute .btn--primary');

    while (!(await done.isEnabled())) await target.click();
    await done.click();
    await page.waitForTimeout(500);
  }
}

/** Startet eine Partie mit 5 Spielern und den gewuenschten Modi. */
async function startGame(page: Page, seed: number, modes: string[] = []): Promise<void> {
  await page.goto(URL_WITH_SEED(seed));
  await expectScreen(page, 'title');
  await page.locator('.screen--title .btn--primary').click();

  await expectScreen(page, 'lobby');
  await expect(page.locator('.lobby__player')).toHaveCount(5);

  /* Ueber `data-mode`, nicht ueber den Text: Der Test soll nicht an der Sprache haengen. */
  for (const mode of modes) {
    await page.locator(`.mode[data-mode="${mode}"]`).click();
    await expect(page.locator(`.mode[data-mode="${mode}"]`)).toHaveAttribute('data-on', 'true');
  }

  await page.locator('.lobby__cta').click();
}

/* ------------------------------------------------------------------ */
/* Die drei Szenarien aus M1.7                                         */
/* ------------------------------------------------------------------ */

/*
 * Fest auf Deutsch: Die Szenarien pruefen die Banner-Texte aus dem GDD. Dass die
 * Sprach-Erkennung selbst funktioniert, pruefen die beiden Tests weiter unten.
 */
test.describe('Drei Runden', () => {
  test.use({ locale: 'de-DE' });

  test('Runde 1: ein Fang, eine Belaestigung, ein Schmuggler kommt durch', async ({ page }) => {
    await startGame(page, 101);

    /* Rudi (p1) ist Beamter; es reisen p2..p5 mit 4 / 0 / 3 / 0. */
    await expect(page.locator('.screen--officer-intro')).toContainText('Rudi');
    await packAll(page, [4, 0, 3, 0]);

    await endInterrogation(page);
    /* 5 Spieler → k = 2. */
    await expect(page.locator('.openings__label')).toHaveText(/2/);

    expect(await openCase(page, 'p2')).toBe('caught');
    await expect(page.locator('.inspect__banner')).toContainText('trinkt 8');

    expect(await openCase(page, 'p3')).toBe('clean');
    await expect(page.locator('.inspect__banner')).toContainText('Rudi');

    /* Nach der letzten Oeffnung geht es von selbst zur Schranke. */
    await expectScreen(page, 'gate');

    /* Der uebrige Schmuggler (p4, 3 Stueck) kommt durch und verteilt. */
    await expect(page.locator('.gate__banner')).toContainText('DURCHGEKOMMEN', {
      timeout: 20_000,
    });

    await expectScreen(page, 'distribute');
    await distributeAll(page);

    await expectScreen(page, 'result');
    await expect(page.locator('.result__banner')).toHaveAttribute('data-banner', 'gotThrough');

    /* Alle Mengen sind jetzt oeffentlich — auch die der nie geoeffneten Koffer. */
    await expect(page.locator('.result__case')).toHaveCount(4);
    await expect(page.locator('.result__hint')).toHaveCount(2);
  });

  /* ------------------------------------------------------------------ */
  /* Runde 2: ehrliche Runde, durchgewunken → Menschenkenntnis           */
  /* ------------------------------------------------------------------ */

  test('Runde 2: ehrliche Runde durchgewunken gibt Menschenkenntnis', async ({ page }) => {
    await startGame(page, 202);
    await packAll(page, [0, 0, 0, 0]);
    await endInterrogation(page);

    await page.locator('.inspect__actions .btn--officer').click();
    await expectScreen(page, 'gate');

    /* Vier Reisende laufen einzeln durch — das dauert. */
    await expectScreen(page, 'distribute', GATE_TIMEOUT_MS);
    /* Der Bonus ist der einzige Token der Runde — der Beamte verteilt ihn. */
    await expect(page.locator('.distribute__headline')).toContainText('Rudi');
    await distributeAll(page);

    await expectScreen(page, 'result');
    await expect(page.locator('.result__banner')).toHaveAttribute('data-banner', 'honestRound');
    /* Niemand wurde geoeffnet, also trinkt auch niemand. */
    await expect(page.locator('.result__drinker')).toHaveCount(0);
    /* Alle Hinweise haben gelogen — es gab ja nichts zu finden. */
    await expect(page.locator('.result__hint[data-truthful="true"]')).toHaveCount(0);
  });

  /* ------------------------------------------------------------------ */
  /* Runde 3: Bestechung + Diplomat                                      */
  /* ------------------------------------------------------------------ */

  test('Runde 3: angenommene Bestechung sperrt den Koffer, der Diplomat kommt durch', async ({ page }) => {
    await startGame(page, 303, ['bribery', 'diplomat']);
    await packAll(page, [5, 5, 5, 5]);

    await expectScreen(page, 'hall');
    await expect(page.locator('.stage__canvas canvas')).toBeVisible({ timeout: 40_000 });
    /* "Nochmal ansehen" wird erst frei, wenn die Hinweise gelaufen sind. */
    await expect(page.locator('.hall__actions .btn--secondary')).toBeEnabled({ timeout: 40_000 });

    /* Der erste Reisende bietet 2 Tokens, der Beamte nimmt an. */
    const firstMarker = page.locator('.hall__marker').first();
    const bribedId = await firstMarker.getAttribute('data-player');
    await firstMarker.locator('.bribe__btn', { hasText: '2' }).click();
    await firstMarker.locator('.hall__offer-actions .btn--officer').first().click();
    /* Angenommen heisst: kein Bestechungs-Chip mehr an diesem Koffer. */
    await expect(firstMarker.locator('.bribe')).toHaveCount(0);

    await page.locator('.hall__actions .btn--officer').last().click();
    await expectScreen(page, 'inspect');
    await waitForInspectableBoard(page);

    /* Wer der Diplomat ist, verraet nur das Dev-Panel. */
    await page.locator('[data-dev="reveal"]').click();
    const debug = (await page.locator('[data-dev="state"]').textContent()) ?? '';
    const diplomatId = /diplomat: (\w+)/.exec(debug)?.[1];
    expect(diplomatId).toBeTruthy();

    if (diplomatId === bribedId) {
      /* Gesperrt schlaegt Immunitaet — dann wird eben ein anderer geoeffnet. */
      expect(await openCase(page, bribedId === 'p2' ? 'p3' : 'p2')).toBe('caught');
    } else {
      expect(await openCase(page, diplomatId!)).toBe('diplomat');
      await expect(page.locator('.inspect__banner')).toContainText('trinkt 3');
    }
  });
});

/* ------------------------------------------------------------------ */
/* Grundlagen                                                          */
/* ------------------------------------------------------------------ */

test('startet ohne Konsolen-Fehler und zeigt den Titel', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Der Zoll|Customs/);

  expect(errors).toEqual([]);
});

test.describe('Sprachwahl', () => {
  test.use({ locale: 'de-DE' });

  test('zeigt einem deutschen Browser Deutsch', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Der Zoll');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });
});

test.describe('Sprachwahl (EN)', () => {
  test.use({ locale: 'en-GB' });

  test('zeigt einem englischen Browser Englisch', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Customs');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('macht keine externen Requests (CLAUDE.md: kein Backend, keine Analytics)', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http://localhost') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      external.push(url);
    }
  });

  await page.goto('./');
  await page.waitForLoadState('networkidle');

  expect(external).toEqual([]);
});

test('liefert ein installierbares Manifest', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.getAttribute('link[rel="manifest"]', 'href');
  expect(href).toBeTruthy();

  const response = await request.get(new URL(href!, page.url()).toString());
  expect(response.ok()).toBe(true);

  const manifest = (await response.json()) as { name: string; display: string; icons: unknown[] };
  expect(manifest.name).toBe('Der Zoll');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
});

test('bleibt im Portrait-Frame ohne horizontales Scrollen', async ({ page }) => {
  await page.goto('./');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});

/* Die Tippflaechen der Koffer misst `perf.spec.ts` — sie liegen auf dem Canvas. */
