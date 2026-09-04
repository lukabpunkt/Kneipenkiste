/**
 * E2E: der komplette Spielfluss (Roadmap M1.7, Audit A1).
 *
 * Vier Spieler, drei Runden — alle teilen, ein Alleingang mit Verteilung, zwei Diebe —
 * dazu eine Eid-Runde mit Meineid und eine Maulwurf-Runde. Alles unter Mobile-Emulation
 * auf iPhone 12 (WebKit) und Pixel 5 (Chromium).
 */

import { expect, test } from '@playwright/test';
import {
  atScreen,
  distributeAllToFirst,
  enableMode,
  openVault,
  playChoices,
  runReveal,
  screen,
  setPlayerCount,
  skipNegotiation,
  startGame,
  takeTurn,
  vaultValue,
} from './helpers';

/* ------------------------------------------------------------------ */
/* Grundlagen (aus M0)                                                 */
/* ------------------------------------------------------------------ */

test.describe('Start', () => {
  test('startet ohne Fehler und zeigt den Titel', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));

    await page.goto('./');
    await expect(page.locator('.title__logo')).toHaveText('Der Tresor');
    await expect(page.locator('.title__tagline')).toHaveText('Teilen oder Stehlen.');
    expect(problems).toEqual([]);
  });

  test('liefert ein installierbares Manifest', async ({ page, baseURL }) => {
    await page.goto('./');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest');

    const response = await page.request.get(new URL('manifest.webmanifest', baseURL).toString());
    expect(response.ok()).toBe(true);

    const manifest = (await response.json()) as {
      name: string;
      display: string;
      orientation: string;
      icons: { sizes: string; purpose: string }[];
    };
    expect(manifest.name).toBe('Der Tresor');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.icons.map((i) => i.sizes)).toContain('192x192');
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  test('laedt nichts von aussen (Architektur §9)', async ({ page }) => {
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

  test('blendet im Querformat den Hinweis ein', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.orientation-lock')).toBeHidden();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('.orientation-lock')).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/* Lobby                                                               */
/* ------------------------------------------------------------------ */

test.describe('Lobby', () => {
  test('startet nicht mit zwei Spielern (ADR-5)', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 2);

    const cta = page.getByRole('button', { name: 'Tresor öffnen' });
    await expect(cta).toBeDisabled();
    await expect(page.locator('.lobby__hint')).toContainText('Zu zweit ist das kein Dilemma');

    await setPlayerCount(page, 3);
    await expect(cta).toBeEnabled();
  });

  test('nimmt hoechstens acht Spieler auf', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 8);
    await expect(page.getByRole('button', { name: 'Spieler hinzufügen' })).toBeDisabled();
  });

  test('haelt Namen und Einstellungen ueber einen Reload', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 4);
    await page.locator('.lobby__name').first().fill('Anna');
    await page.locator('.chip', { hasText: 'Härte' }).click();

    await page.reload();
    await page.getByRole('button', { name: 'Spielen' }).click();
    await atScreen(page, 'lobby');

    await expect(page.locator('.lobby__name').first()).toHaveValue('Anna');
    await expect(page.locator('.chip', { hasText: 'Härte' })).toContainText('Hart');
  });

  test('alle Touch-Ziele sind mindestens 48 px hoch (Audit A1)', async ({ page }) => {
    await startGame(page);
    /*
     * In einem Rutsch messen: Einzelne Locator koennen zwischen `count()` und
     * `boundingBox()` verschwinden, wenn das 18+-Sheet gerade zuklappt.
     */
    const small = await page.locator('button').evaluateAll((buttons) =>
      buttons
        .filter((button) => button.checkVisibility?.() ?? button.getClientRects().length > 0)
        .map((button) => ({
          label: button.className,
          height: button.getBoundingClientRect().height,
        }))
        .filter((entry) => entry.height > 0 && entry.height < 48)
    );
    expect(small).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Drei Runden am Stueck (M1.7)                                        */
/* ------------------------------------------------------------------ */

test.describe('Drei Runden', () => {
  test('allShare → soloSteal mit Verteilung → multiSteal', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });

    await startGame(page);
    await setPlayerCount(page, 4);
    await openVault(page);

    /* --- Runde 1: alle teilen --- */
    await skipNegotiation(page);
    expect(await vaultValue(page)).toBe(4);
    await playChoices(page, ['share', 'share', 'share', 'share']);
    await runReveal(page);
    await atScreen(page, 'result');

    await expect(page.locator('.result__banner')).toHaveText('Ehre unter Dieben');
    // Bankgebuehr: jeder einen Schluck (ADR-2).
    await expect(page.locator('.result__drinker')).toHaveCount(4);
    await expect(page.locator('.result__drinker').first()).toContainText('trinkt 1');
    await expect(page.locator('.result__vaultNote')).toHaveText('Der Tresor wächst auf 6');

    /* --- Runde 2: einer stiehlt und verteilt --- */
    await page.getByRole('button', { name: 'Nächste Runde' }).click();
    await skipNegotiation(page);
    expect(await vaultValue(page)).toBe(6);
    await playChoices(page, ['steal', 'share', 'share', 'share']);
    await runReveal(page);

    await distributeAllToFirst(page);
    await atScreen(page, 'result');
    await expect(page.locator('.result__banner')).toHaveText('Der Alleingang');
    // Alles auf eine Person ist erlaubt (ADR-4): eine Trinkerzeile mit sechs Schluecken.
    await expect(page.locator('.result__drinker')).toHaveCount(1);
    await expect(page.locator('.result__drinker').first()).toContainText('trinkt 6');
    await expect(page.locator('.result__vaultNote')).toHaveText('Der Tresor wurde geleert');

    /* --- Runde 3: zwei Diebe --- */
    await page.getByRole('button', { name: 'Nächste Runde' }).click();
    await skipNegotiation(page);
    expect(await vaultValue(page)).toBe(4);
    await playChoices(page, ['steal', 'steal', 'share', 'share']);
    await runReveal(page);
    await atScreen(page, 'result');

    await expect(page.locator('.result__banner')).toHaveText('Zu viele Köche');
    // ⌈4/2⌉ = 2 pro Dieb.
    await expect(page.locator('.result__drinker')).toHaveCount(2);
    await expect(page.locator('.result__drinker').first()).toContainText('trinkt 2');

    /* --- Statistik nach drei Runden --- */
    await page.getByRole('button', { name: 'Statistik' }).click();
    const sheet = page.locator('.sheet__panel');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Vertrauen');
    await expect(sheet).toContainText('Meistbetrogen');

    expect(problems).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Aufdeckung                                                          */
/* ------------------------------------------------------------------ */

test.describe('Aufdeckung', () => {
  test('deckt Teiler zuerst und Diebe zuletzt auf (ADR-3)', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 4);
    await openVault(page);
    await skipNegotiation(page);
    await playChoices(page, ['steal', 'share', 'share', 'steal']);
    await runReveal(page);

    /*
     * Die Buehne ist ein Canvas — pruefbar ist sie ueber das Protokoll, das der Screen
     * mitschreibt: `playerId:choice` in genau der Reihenfolge, in der aufgedeckt wurde.
     */
    await page.waitForFunction(
      () =>
        (document.querySelector<HTMLElement>('#app > section')?.dataset['revealed'] ?? '').split(',')
          .length === 4,
      undefined,
      { timeout: 40_000 }
    );

    const revealed = (await page.locator('#app > section').getAttribute('data-revealed')) ?? '';
    expect(revealed.split(',').map((entry) => entry.split(':')[1])).toEqual([
      'share',
      'share',
      'steal',
      'steal',
    ]);

    // Jede Karte genau einmal, und alle vier Spieler kommen vor.
    expect(new Set(revealed.split(',').map((entry) => entry.split(':')[0])).size).toBe(4);
  });

  test('laesst die letzte Karte nicht wegtippen (GDD §4.3)', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 4);
    await openVault(page);
    await skipNegotiation(page);
    // Zwei Diebe: Dann endet die Runde im Result und nicht in der Verteil-UI.
    await playChoices(page, ['share', 'share', 'steal', 'steal']);
    await runReveal(page);

    const revealed = async (): Promise<string[]> => {
      const log = (await page.locator('#app > section').getAttribute('data-revealed')) ?? '';
      return log ? log.split(',') : [];
    };

    // Warten, bis die vorletzte Karte offen liegt, dann durchtippen.
    await page.waitForFunction(
      () =>
        ((document.querySelector<HTMLElement>('#app > section')?.dataset['revealed'] ?? '').match(/,/g)
          ?.length ?? -1) >= 2,
      undefined,
      { timeout: 40_000 }
    );

    /*
     * Ab hier ist die letzte Karte dran. Zwanzig Taps duerfen sie **nicht** vorziehen —
     * das ist die Regel, die den Moment schuetzt, fuer den es das Spiel gibt.
     */
    const before = (await revealed()).length;
    for (let i = 0; i < 20; i++) await page.locator('#app > section').click({ force: true });
    await page.waitForTimeout(400);
    expect((await revealed()).length).toBeLessThanOrEqual(before + 1);

    /*
     * Die Show laeuft trotzdem zu Ende — und alle vier Karten liegen offen. Abgelesen
     * wird das **auf** dem Reveal-Screen: Danach ist er samt Protokoll ausgetauscht.
     */
    await page.waitForFunction(
      () =>
        (document.querySelector<HTMLElement>('#app > section')?.dataset['revealed'] ?? '').split(',')
          .length === 4,
      undefined,
      { timeout: 40_000 }
    );
    await atScreen(page, 'result');
  });

  test('zeigt die Wahl nach dem Versiegeln nirgends mehr (Audit A1)', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 3);
    await openVault(page);
    await skipNegotiation(page);

    await takeTurn(page, 'steal');
    await atScreen(page, 'pass');

    // Weder im Markup des Folge-Screens noch irgendwo sonst steht, was gewaehlt wurde.
    const html = await page.locator('#app').innerHTML();
    expect(html).not.toContain('STEHLEN');
    expect(html).not.toContain('TEILEN');
  });
});

/* ------------------------------------------------------------------ */
/* Eid-Modus                                                           */
/* ------------------------------------------------------------------ */

test.describe('Eid', () => {
  test('bestraft den Meineid des Alleindiebs', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 4);
    await enableMode(page, 'Eid');
    await openVault(page);
    await atScreen(page, 'negotiation');

    // Spieler 1 schwoert oeffentlich — und stiehlt dann.
    const oath = page.locator('.oath').first();
    await oath.click();
    await expect(oath).toHaveAttribute('aria-pressed', 'true');
    await expect(oath.locator('.badge')).toHaveClass(/is-sworn/);

    await page.getByRole('button', { name: 'Alle bereit' }).click();
    await playChoices(page, ['steal', 'share', 'share', 'share']);
    await runReveal(page);

    // Meineid: Er trinkt 2 selbst und verteilt nur die restlichen 2 (GDD §3.7).
    await atScreen(page, 'distribute');
    await expect(page.locator('.distribute__headline')).toContainText('2');

    await distributeAllToFirst(page);
    await atScreen(page, 'result');
    await expect(page.locator('.result__banner')).toHaveText('MEINEID!');
    await expect(page.locator('.result__drinker--perjury')).toHaveCount(1);
  });
});

/* ------------------------------------------------------------------ */
/* Maulwurf-Modus                                                      */
/* ------------------------------------------------------------------ */

test.describe('Maulwurf', () => {
  test('zwingt genau einen Spieler zum Stehlen', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 4);
    await enableMode(page, 'Maulwurf');
    await openVault(page);
    await skipNegotiation(page);

    let moleTurns = 0;
    for (let i = 0; i < 4; i++) {
      await atScreen(page, 'pass');
      await page.waitForSelector('.screen--pass:not(.is-locked)');
      await screen(page).click();
      await atScreen(page, 'choice');

      const isMole = await page.locator('.screen--choice-mole').count();
      if (isMole > 0) {
        moleTurns += 1;
        // Die TEILEN-Karte haengt in Ketten und reagiert nur mit einem Ruetteln.
        await expect(page.locator('.card--share')).toHaveClass(/is-locked/);
        await expect(page.locator('.choice__headline')).toHaveText('Du bist der Maulwurf.');
        await page.locator('.card--share').click();
        await expect(page.locator('.screen--choice')).toBeVisible();
        await page.locator('.card--steal').click();
      } else {
        await page.locator('.card--share').click();
      }
    }
    expect(moleTurns).toBe(1);

    await atScreen(page, 'sealed');
    await runReveal(page);

    // Genau ein Dieb → Alleingang, und der Maulwurf ist die letzte Karte.
    await atScreen(page, 'distribute');
    await distributeAllToFirst(page);
    await atScreen(page, 'result');
    await expect(page.locator('.result__banner')).toHaveText('Der Alleingang');
    await expect(page.locator('.result__sub')).toContainText('Der Maulwurf');
  });
});

/* ------------------------------------------------------------------ */
/* Nachtschicht                                                        */
/* ------------------------------------------------------------------ */

test.describe('Nachtschicht', () => {
  test('ersetzt die Verhandlung durch zehn Sekunden Stille', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 3);
    await enableMode(page, 'Nachtschicht');
    await openVault(page);

    await atScreen(page, 'silence');
    await expect(page.locator('.silence__headline')).toHaveText('Nachtschicht.');
    await expect(page.getByRole('button', { name: 'Alle bereit' })).toHaveCount(0);

    // Der Countdown laeuft von 10 herunter und schickt das Handy dann auf die Reise.
    await expect(page.locator('.ring__value')).toHaveText(/^(10|9|8)$/);
    await atScreen(page, 'pass', 20_000);
  });
});

/* ------------------------------------------------------------------ */
/* Runde abbrechen (Architektur §3)                                    */
/* ------------------------------------------------------------------ */

test.describe('Zurueck-Knopf', () => {
  test('fragt nach, bevor eine Runde verworfen wird', async ({ page }) => {
    await startGame(page);
    await setPlayerCount(page, 3);
    await openVault(page);
    await skipNegotiation(page);
    await atScreen(page, 'pass');

    await page.goBack();
    await expect(page.locator('.sheet__panel')).toBeVisible();
    await expect(page.locator('.sheet__title')).toHaveText('Runde abbrechen?');

    // Weiterspielen laesst die Runde stehen.
    await page.getByRole('button', { name: 'Weiterspielen' }).click();
    await expect(page.locator('.sheet__panel')).toHaveCount(0);
    await atScreen(page, 'pass');

    // Abbrechen fuehrt zurueck in die Lobby.
    await page.goBack();
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    await atScreen(page, 'lobby');
  });
});
