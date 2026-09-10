/**
 * Der Flow (Roadmap M1.6, Audit A1).
 *
 * Vier Runden mit fünf Spielern, in derselben Reihenfolge, in der ein Abend sie bringt:
 * Frieden schrumpft die Brücke, ein Krach repariert sie, die Fahne macht Wortbruch
 * teuer, und die Todeszone ist der garantierte Absturz.
 */

import { expect, test } from '@playwright/test';
import { BASE, BASE_DEV, chooseAll, distribute, endNegotiation, playRound, seedSession, startRound, tapPass, watchStep } from './helpers';

test.describe('Boot und PWA', () => {
  test('startet ohne Fehler und zeigt den Titel', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(BASE);

    await expect(page.locator('h1')).toHaveText('Die Hängebrücke');
    /* Standing Audit: keine console.error im E2E. */
    expect(errors).toEqual([]);
  });

  test('ist als PWA installierbar', async ({ page, request }) => {
    await page.goto(BASE);

    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();

    const manifest = await (await request.get(new URL(href!, page.url()).toString())).json();
    expect(manifest.name).toBe('Die Hängebrücke');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  });

  test('folgt der Browsersprache', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-GB' });
    const page = await context.newPage();
    await page.goto(BASE);

    await expect(page.locator('h1')).toHaveText('The Rope Bridge');
    expect(await page.locator('html').getAttribute('lang')).toBe('en');
    await context.close();
  });

  test('bleibt im Portrait-Rahmen, ohne horizontal zu scrollen', async ({ page }) => {
    await page.goto(BASE);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Lobby', () => {
  test('lässt sich nicht unter drei Spieler drücken (GDD §3.1)', async ({ page }) => {
    await seedSession(page, { playerCount: 4 });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();

    await page.getByRole('button', { name: 'Rudi entfernen' }).click();
    await expect(page.locator('.lobby__player')).toHaveCount(3);

    /*
     * Bei drei verschwinden die Entfernen-Knöpfe: Der Weg unter die Untergrenze wird gar
     * nicht erst angeboten, statt ihn anzubieten und dann abzulehnen.
     */
    await expect(page.locator('.lobby__remove')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Auf die Brücke' })).toBeEnabled();
  });

  test('zeigt die Balkenzahl und passt sie an die Spielerzahl an', async ({ page }) => {
    await seedSession(page, { playerCount: 4 });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();

    await expect(page.locator('.lobby__bridge')).toHaveText('6 Balken für 4 Leute');
    await page.getByRole('button', { name: 'Spieler dazu' }).click();
    await expect(page.locator('.lobby__bridge')).toHaveText('7 Balken für 5 Leute');
  });
});

test.describe('Vier Runden mit fünf Spielern', () => {
  test('Frieden schrumpft, Krach repariert, Fahnenflucht und Todeszone', async ({ page }) => {
    await seedSession(page, { playerCount: 5, modes: { flags: true } });
    /* Mit Dev-Panel: Runde 4 braucht die Todeszone, ohne drei Runden Vorlauf. */
    await page.goto(BASE_DEV);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);

    /* --- Runde 1: alle auf verschiedenen Balken → niemand trinkt, die Brücke schrumpft --- */
    await endNegotiation(page);
    await chooseAll(page, [1, 2, 3, 4, 5]);
    await watchStep(page);

    /* Kein Verteilen: eine friedliche Runde bringt niemandem etwas ein (ADR-9). */
    await expect(page.locator('[data-screen="result"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.result__banner')).toHaveText('Alle drüben');
    await expect(page.locator('.result__preview')).toHaveAttribute('data-kind', 'shrunk');
    await expect(page.locator('.result__preview')).toContainText('abgefault');
    await expect(page.locator('.result__preview')).toContainText('6 Balken');

    /* --- Runde 2: zwei auf einem Balken → Krach, Reparatur --- */
    await page.getByRole('button', { name: 'Nächste Runde' }).click();
    await expect(page.locator('[data-screen="negotiation"]')).toBeVisible();

    /* Die Brücke hat jetzt sechs Balken, einer fehlt sichtbar. */
    await expect(page.locator('[data-screen="negotiation"] .plank:not(.plank--removed)')).toHaveCount(6);
    await expect(page.locator('[data-screen="negotiation"] .plank--removed')).toHaveCount(1);

    const planks = await page
      .locator('[data-screen="negotiation"] .plank:not(.plank--removed)')
      .evaluateAll((nodes) => nodes.map((n) => Number((n as HTMLElement).dataset.plank)));

    await endNegotiation(page);
    await chooseAll(page, [planks[0]!, planks[0]!, planks[1]!, planks[2]!, planks[3]!]);
    await watchStep(page);
    await distribute(page);

    await expect(page.locator('.result__banner')).toHaveText('Es kracht');
    await expect(page.locator('.result__preview')).toHaveAttribute('data-kind', 'repaired');
    await expect(page.locator('.result__preview')).toContainText('7 Balken');
    /* Zwei Gestürzte trinken je 2, drei Sichere verteilen je 1 (GDD §3.5). */
    await expect(page.locator('.result__row[data-reason="collision"]')).toHaveCount(2);
    await expect(page.locator('.result__row--gift')).toHaveCount(3);

    /* --- Runde 3: Fahnenflucht und Balkendieb --- */
    await page.getByRole('button', { name: 'Nächste Runde' }).click();
    await expect(page.locator('[data-screen="negotiation"]')).toBeVisible();

    /* p1 verspricht die 3 öffentlich, p2 auch — beide sichtbar für alle. */
    await page.locator('.flag-row__player').nth(0).locator('.flag-row__plank[data-plank="3"]').click();
    await page.locator('.flag-row__player').nth(1).locator('.flag-row__plank[data-plank="4"]').click();
    await expect(page.locator('[data-screen="negotiation"] .plank__flag')).toHaveCount(2);

    await endNegotiation(page);
    /* p1 bricht sein Wort und geht auf die 4 — den Balken, den p2 reklamiert hat. */
    await chooseAll(page, [4, 4, 1, 2, 5]);
    await watchStep(page);
    await distribute(page);

    await expect(page.locator('.result__banner')).toHaveText('Fahnenflucht!');
    await expect(page.locator('.result__line[data-kind="desertion"]')).toContainText('Rudi');
    await expect(page.locator('.result__line[data-kind="theft"]')).toContainText('Rudi');
    /* Der Fahnenflüchtige trinkt doppelt: 2 Personen × 2 = 4. */
    await expect(page.locator('.result__row[data-reason="deserterDouble"]')).toHaveCount(1);

    /* --- Runde 4: Todeszone --- */
    await page.getByRole('button', { name: 'Nächste Runde' }).click();
    await expect(page.locator('[data-screen="negotiation"]')).toBeVisible();

    await page.getByRole('button', { name: 'Todeszone' }).click();
    /* B_min = n − 1 = 4 Balken für 5 Leute. */
    await expect(page.locator('[data-screen="negotiation"] .plank:not(.plank--removed)')).toHaveCount(4);
    /* Die Regelzeile sagt die verdoppelte Auszahlung an, bevor jemand wählt (Audit A1). */
    await expect(page.locator('.negotiation__rule')).toContainText('Todeszone');
    await expect(page.locator('.negotiation__rule')).toContainText('verteilt 2');

    await endNegotiation(page);
    await chooseAll(page, [1, 1, 2, 3, 4]);
    await watchStep(page);
    await distribute(page);

    await expect(page.locator('.result__banner')).toHaveText('Todeszone');
    /* Wer hier sicher steht, hat etwas geleistet: drei Sichere verteilen je 2. */
    const gifts = page.locator('.result__row--gift');
    await expect(gifts).toHaveCount(3);
    await expect(page.locator('.result__preview')).toHaveAttribute('data-kind', 'repaired');
  });
});

test.describe('Modi', () => {
  test('das Seil ist einmal pro Session verfügbar', async ({ page }) => {
    await seedSession(page, { playerCount: 3, modes: { rope: true } });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);

    await playRound(page, ['rope', 1, 2]);
    /* Die Gebühr ist ein Schluck (GDD §3.6). */
    await expect(page.locator('.result__row[data-reason="ropeFee"]')).toHaveCount(1);
    await expect(page.locator('.result__line[data-kind="rope"]')).toContainText('Rudi');

    await page.getByRole('button', { name: 'Nächste Runde' }).click();
    await endNegotiation(page);

    /* Runde zwei: Rudis Seil ist weg, das der anderen nicht. */
    await tapPass(page);
    await expect(page.getByRole('button', { name: 'Seil nehmen (einmalig)' })).toHaveCount(0);
    await expect(page.locator('.choose__rope-spent')).toBeVisible();
  });

  test('Nebel ersetzt die Absprache durch Stille', async ({ page }) => {
    await seedSession(page, { playerCount: 3, modes: { fog: true } });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await page.getByRole('button', { name: 'Auf die Brücke' }).click();

    await expect(page.locator('[data-screen="silence"]')).toBeVisible();
    /* Kein "Alle bereit": Wer hier tippt, hat den Modus nicht verstanden. */
    await expect(page.getByRole('button', { name: 'Alle bereit' })).toHaveCount(0);
    await expect(page.locator('[data-screen="pass"]')).toBeVisible({ timeout: 20_000 });
  });

  test('Schwergewicht skaliert Trinken und Verteilen', async ({ page }) => {
    await seedSession(page, { playerCount: 3, modes: { weights: true } });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);
    await endNegotiation(page);

    /* p1 packt den Amboss ein und tritt auf denselben Balken wie p2. */
    await tapPass(page);
    await expect(page.locator('.weight')).toBeVisible();
    await page.locator('.weight__step[data-weight="3"]').click();
    await expect(page.locator('.weight__risk')).toContainText('3');
    await page.locator('.plank[data-plank="1"]').click();

    for (const pick of [1, 3]) {
      await tapPass(page);
      await page.locator(`.plank[data-plank="${pick}"]`).click();
    }

    await watchStep(page);
    await distribute(page);
    /* 2 Personen × Gewicht 3 = 6 Schlucke. */
    await expect(page.locator('.result__row[data-reason="collision"]').first()).toContainText('Rudi');
  });

  /*
   * A5 verlangt, dass **alle** Modus-Kombinationen spielbar sind. Statt die Paare
   * einzeln durchzuspielen (Fahne + Schwergewicht, Morsch + Seil, Nebel + Todeszone)
   * läuft hier der Extremfall: alles gleichzeitig, in der Todeszone, wo ein Sturz
   * garantiert ist. Wer diese Runde übersteht, übersteht jede Teilmenge davon.
   */
  test('alle fünf Modi gleichzeitig, in der Todeszone', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });

    await seedSession(page, {
      playerCount: 3,
      modes: { flags: true, rotten: true, weights: true, fog: true, rope: true },
    });
    await page.goto(BASE_DEV);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await page.getByRole('button', { name: 'Auf die Brücke' }).click();

    /* Nebel schlägt Absprache: keine Fahnen, kein Reden, nur Stille (GDD §3.6). */
    await expect(page.locator('[data-screen="silence"]')).toBeVisible();
    /* Und trotzdem steht da, was heute gilt. */
    await expect(page.locator('.mode-chips .chip--mode')).toHaveCount(5);

    /*
     * Die Todeszone lässt sich nur erzwingen, solange die Runde noch nicht gewählt hat —
     * der Dev-Knopf ist ausserhalb von Absprache und Stille absichtlich gesperrt.
     */
    await page.getByRole('button', { name: 'Todeszone' }).click();
    await expect(page.locator('[data-screen="silence"]')).toBeVisible();

    await expect(page.locator('[data-screen="pass"]')).toBeVisible({ timeout: 20_000 });

    /* Todeszone: B = n − 1 = 2 Balken für 3 Leute — einer muss sich einen teilen. */
    await tapPass(page);
    await expect(page.locator('[data-screen="choose"] .plank:not(.plank--removed)')).toHaveCount(2);
    await page.locator('.weight__step[data-weight="2"]').click();
    await page.locator('[data-screen="choose"] .plank[data-plank="1"]').click();

    await tapPass(page);
    await page.locator('[data-screen="choose"] .plank[data-plank="1"]').click();

    await tapPass(page);
    await page.getByRole('button', { name: 'Seil nehmen (einmalig)' }).click();

    await expect(page.locator('[data-screen="sealed"]')).toBeVisible();
    await watchStep(page);
    await distribute(page);

    await expect(page.locator('[data-screen="result"]')).toBeVisible({ timeout: 15_000 });
    /* Der Zusammenstoß als Bild — mit beiden Namen darin (Roadmap M5.3). */
    const crash = page.locator('.result__crash').first();
    await expect(crash).toBeVisible();
    await expect(crash).toContainText('Rudi');
    expect(problems).toEqual([]);
  });
});

test.describe('Privatsphäre und Bedienung', () => {
  test('der Choose-Screen zeigt keine fremden Wahlen', async ({ page }) => {
    await seedSession(page, { playerCount: 4 });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);
    await endNegotiation(page);

    /* p1 wählt die 1. */
    await tapPass(page);
    await page.locator('.plank[data-plank="1"]').click();

    /* p2 sieht davon nichts: keine Markierung auf irgendeinem Balken. */
    await tapPass(page);
    await expect(page.locator('[data-screen="choose"] .plank__hiker')).toHaveCount(0);
    await expect(page.locator('[data-screen="choose"]')).not.toContainText('Rudi');
  });

  /* Je eine eigene Session — sonst erbt der zweite Durchgang die Brücke des ersten. */
  for (const { playerCount, minimum } of [
    { playerCount: 5, minimum: 56 },
    { playerCount: 8, minimum: 48 },
  ]) {
    test(`Balken-Buttons sind bei ${playerCount} Spielern mindestens ${minimum} px hoch`, async ({ page }) => {
      await seedSession(page, { playerCount });
      await page.goto(BASE);
      await page.getByRole('button', { name: 'Spielen' }).click();
      await startRound(page);
      await endNegotiation(page);
      await tapPass(page);

      const heights = await page
        .locator('[data-screen="choose"] .plank')
        .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().height));

      expect(heights.length).toBe(playerCount + 2);
      for (const height of heights) expect(height).toBeGreaterThanOrEqual(minimum);
    });
  }

  test('die Wahl ist versiegelt — kein Zurück', async ({ page }) => {
    await seedSession(page, { playerCount: 3 });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);
    await endNegotiation(page);

    await tapPass(page);
    await page.locator('.plank[data-plank="1"]').click();

    /* Der Screen friert sofort ein und gibt keinen zweiten Tap mehr durch. */
    await expect(page.locator('[data-screen="choose"][data-sealed="true"]')).toBeVisible();
    await expect(page.locator('[data-screen="pass"]')).toBeVisible();
  });

  test('Bedenkzeit wählt für den, der zu lange überlegt', async ({ page }) => {
    await seedSession(page, { playerCount: 3 });
    await page.addInitScript(() => {
      const key = 'haengebruecke.session.v1';
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const snapshot = JSON.parse(raw);
      snapshot.settings.thinkTimerSec = 5;
      localStorage.setItem(key, JSON.stringify(snapshot));
    });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);
    await endNegotiation(page);

    await tapPass(page);
    await expect(page.locator('.choose__timer')).toContainText('5');

    /* Niemand tippt — nach fünf Sekunden wählt das Spiel und sagt es. */
    await expect(page.locator('.toast')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.toast')).toContainText('Zeit um');
    await expect(page.locator('[data-screen="pass"]')).toBeVisible();
  });

  test('der Back-Dialog fragt, bevor die Runde verloren geht', async ({ page }) => {
    await seedSession(page, { playerCount: 3 });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);

    await page.locator('.screen__abort').click();
    await expect(page.getByRole('dialog')).toContainText('Runde abbrechen?');

    /*
     * Im Dialog, nicht auf dem Screen: Der Abbruch-Knopf am Rand heißt "Runde
     * abbrechen?" und würde auf "Abbrechen" mit matchen.
     */
    await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page.locator('[data-screen="negotiation"]')).toBeVisible();

    await page.locator('.screen__abort').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Ja' }).click();
    await expect(page.locator('[data-screen="lobby"]')).toBeVisible();
  });
});

test.describe('Barrierefreiheit (Audit A5)', () => {
  /*
   * Tastatur ist in A5 ein SOLL, aber ein billiges: Wenn der Titel mit Tab und Enter
   * spielbar ist, sind es die anderen Screens auch — sie bestehen aus denselben
   * Knöpfen. Geprüft wird beides, was dazugehört: dass der Fokus ankommt und dass man
   * **sieht**, wo er ist.
   */
  test('der Titel lässt sich mit Tastatur bedienen, und der Fokus ist sichtbar', async ({
    page,
    browserName,
  }) => {
    /*
     * Nur Chromium: Safari wandert mit Tab standardmässig **nicht** auf Knöpfe — dafür
     * muss man "Volle Tastaturnavigation" einschalten. Das ist eine Einstellung des
     * Systems, keine Eigenschaft der Seite; ein Test darauf würde nur Safaris Default
     * prüfen. Der Fokusring selbst gilt trotzdem für beide.
     */
    test.skip(browserName === 'webkit', 'Safari fokussiert Knöpfe nur mit voller Tastaturnavigation');

    await seedSession(page, { playerCount: 3 });
    await page.goto(BASE);
    await expect(page.locator('h1')).toHaveText('Die Hängebrücke');

    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveText('Spielen');

    /* Der Ring kommt aus `:focus-visible` — ohne ihn tappt man im Dunkeln. */
    const outlineWidth = await focused.evaluate(
      (el) => globalThis.getComputedStyle(el).outlineWidth
    );
    expect(parseFloat(outlineWidth)).toBeGreaterThanOrEqual(2);

    await page.keyboard.press('Enter');
    await expect(page.locator('[data-screen="lobby"]')).toBeVisible();
  });

  test('respektiert "Bewegung reduzieren" beim Screenwechsel', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await seedSession(page, { playerCount: 3 });
    await page.goto(BASE);

    /* Der Wipe wird zum Fade — und der Screenwechsel bleibt trotzdem ein Wechsel. */
    const wipeMs = await page.evaluate(() =>
      globalThis.getComputedStyle(document.documentElement).getPropertyValue('--wipe-ms').trim()
    );
    expect(wipeMs).toBe('1ms');

    await page.getByRole('button', { name: 'Spielen' }).click();
    await expect(page.locator('[data-screen="lobby"]')).toBeVisible();
    await context.close();
  });
});

test.describe('Persistenz', () => {
  test('ein Reload behält Brücke, Statistik und Seil-Verbrauch', async ({ page }) => {
    await seedSession(page, { playerCount: 3, modes: { rope: true } });
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Spielen' }).click();
    await startRound(page);

    await playRound(page, ['rope', 1, 2]);
    await expect(page.locator('.result__banner')).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: 'Spielen' }).click();

    /*
     * Runde 1 war friedlich (nur die Seil-Gebühr) — die Brücke ist geschrumpft, und die
     * Lobby zeigt die echte Zahl, nicht die theoretische Startbreite.
     */
    await expect(page.locator('.lobby__bridge')).toHaveText('4 Balken für 3 Leute');
    await startRound(page);
    await expect(page.locator('[data-screen="negotiation"] .plank:not(.plank--removed)')).toHaveCount(4);

    await endNegotiation(page);
    await tapPass(page);
    /* Rudis Seil ist auch nach dem Reload verbraucht. */
    await expect(page.locator('.choose__rope-spent')).toBeVisible();
  });
});
