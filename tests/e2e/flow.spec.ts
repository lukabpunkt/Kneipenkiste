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

/** Ohne `?dev=1&seed=` waeren Item-Set, Hinweise und Diplomat nicht reproduzierbar. */
const URL_WITH_SEED = (seed: number): string => `./?dev=1&seed=${seed}`;

/* ------------------------------------------------------------------ */
/* Helfer                                                              */
/* ------------------------------------------------------------------ */

const screen = (page: Page) => page.locator('.screen');

async function expectScreen(page: Page, id: string): Promise<void> {
  await expect(screen(page)).toHaveAttribute('data-screen', id, { timeout: 20_000 });
}

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

/** Wartet, bis die Hinweise durch sind, und beendet das Verhoer. */
async function endInterrogation(page: Page): Promise<void> {
  await expectScreen(page, 'hall');
  await page.locator('.hall__actions .btn--officer').last().click();
  await expectScreen(page, 'inspect');
}

/** Oeffnet einen Koffer und wartet den kompletten Scan ab. */
async function openCase(page: Page, playerId: string): Promise<string> {
  const card = page.locator(`button.suitcase[data-player="${playerId}"]`);
  await expect(card).toBeVisible();
  await card.click();

  const monitor = page.locator('.xray');
  /* Waehrend des Scans darf das Ergebnis nirgends stehen — "Scanline ist heilig". */
  await expect(monitor).toHaveAttribute('data-state', /scanning|stall/);
  await expect(page.locator('.xray__text')).toHaveText(/Röntgen läuft/);

  await expect(monitor).toHaveAttribute('data-state', /caught|clean|diplomat/, { timeout: 15_000 });
  return (await monitor.getAttribute('data-state')) ?? '';
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
    await expect(page.locator('.xray__text')).toContainText('trinkt 8');

    expect(await openCase(page, 'p3')).toBe('clean');
    await expect(page.locator('.xray__text')).toContainText('Rudi');

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

    await expectScreen(page, 'distribute');
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

    /* Der erste Reisende bietet 2 Tokens, der Beamte nimmt an. */
    const firstCase = page.locator('.hall__slot').first();
    await firstCase.locator('.bribe__btn', { hasText: '2' }).click();
    await firstCase.locator('.hall__offer-actions .btn--officer').first().click();
    await expect(firstCase.locator('.suitcase__lock')).toBeVisible();

    const bribedId = await firstCase.locator('.suitcase').getAttribute('data-player');

    await page.locator('.hall__actions .btn--officer').last().click();
    await expectScreen(page, 'inspect');

    /* Ein bezahlter Koffer ist nicht mehr tippbar. */
    await expect(page.locator(`button.suitcase[data-player="${bribedId}"]`)).toHaveCount(0);

    /* Wer der Diplomat ist, verraet nur das Dev-Panel. */
    await page.locator('.dev-panel__btn').click();
    const debug = (await page.locator('.dev-panel__line').textContent()) ?? '';
    const diplomatId = /diplomat: (\w+)/.exec(debug)?.[1];
    expect(diplomatId).toBeTruthy();

    if (diplomatId === bribedId) {
      /* Gesperrt schlaegt Immunitaet — dann wird eben ein anderer geoeffnet. */
      expect(await openCase(page, 'p2' === bribedId ? 'p3' : 'p2')).toBe('caught');
    } else {
      expect(await openCase(page, diplomatId!)).toBe('diplomat');
      await expect(page.locator('.xray__text')).toContainText('trinkt 3');
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

test('haelt die Koffer-Tippflaeche bei mindestens 56 px (CLAUDE.md)', async ({ page }) => {
  await startGame(page, 404);
  await packAll(page, [1, 0, 2, 0]);
  await endInterrogation(page);

  for (const card of await page.locator('.suitcase').all()) {
    const box = await card.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(56);
    expect(box!.height).toBeGreaterThanOrEqual(56);
  }
});
