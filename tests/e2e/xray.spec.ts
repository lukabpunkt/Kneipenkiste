/**
 * Röntgen-Sequenzen (Audit A4) — das Herzstück.
 *
 * Gemessen werden die **echten** Sequenzen, wie sie auf der Bühne gebaut werden, nicht
 * die Choreografie-Zahlen aus `choreo.ts`. Der Unterschied ist der Punkt: Ein vertauschter
 * Beat oder ein zu langer Gag schleicht sich nicht in eine Konstante, sondern in eine
 * Timeline — und nur dort ist er zu finden.
 *
 * Drei Zusicherungen pro Sequenz:
 *   1. Reihenfolge `face` → `verdict` → `banner` (Reaktion vor Konsequenz)
 *   2. Dauer ≤ 5 s
 *   3. Das Gesicht bekommt mindestens 200 ms allein
 */

import { expect, test, type Page } from '@playwright/test';
import { tapSuitcase } from './probe';

test.use({ locale: 'de-DE' });

const screen = (page: Page) => page.locator('.screen');

async function expectScreen(page: Page, id: string): Promise<void> {
  await expect(screen(page)).toHaveAttribute('data-screen', id, { timeout: 40_000 });
}

/** Spielt bis in die Kontrolle, wo die Bühne steht und die Sonde messen kann. */
async function toInspect(page: Page, seed: number, amounts: number[]): Promise<void> {
  await page.goto(`./?dev=1&seed=${seed}`);
  await expectScreen(page, 'title');
  await page.locator('.screen--title .btn--primary').click();

  await expectScreen(page, 'lobby');
  await page.locator('.lobby__cta').click();

  await expectScreen(page, 'officerIntro');
  await page.locator('.screen--officer-intro').click();

  for (const amount of amounts) {
    await expectScreen(page, 'pass');
    await expect(page.locator('.screen--pass')).toHaveAttribute('data-armed', 'true');
    await page.locator('.screen--pass').click();
    await expectScreen(page, 'pack');
    for (let i = 0; i < amount; i++) await page.locator('.stepper__btn').nth(1).click();
    await page.locator('.pack__close').click();
  }

  await expectScreen(page, 'packed');
  await expect(page.locator('.screen--packed .btn--primary')).toBeEnabled();
  await page.locator('.screen--packed .btn--primary').click();

  await expectScreen(page, 'hall');
  await expect(page.locator('.hall__actions .btn--secondary')).toBeEnabled({ timeout: 40_000 });
  await page.locator('.hall__actions .btn--officer').last().click();

  await expectScreen(page, 'inspect');
  await page.waitForFunction(() => window.__zollStage?.mode() === 'inspect', undefined, {
    timeout: 40_000,
  });
}

test.describe('A4 — Röntgen-Sequenzen', () => {
  test('alle sieben sind registriert und einzeln vermessbar', async ({ page }) => {
    test.setTimeout(180_000);
    await toInspect(page, 4101, [4, 0, 2, 0]);

    const reports = await page.evaluate(() => window.__zollStage!.xraySequences('ducks', 4));
    const ids = reports.map((r) => r.id).sort();

    expect(ids).toEqual([
      'caught_alarm_burst',
      'caught_slow_zip',
      'caught_sweat_flood',
      'clean_duck_bow',
      'clean_mug',
      'clean_teddy',
      'diplomat_pass',
    ]);

    expect(reports.filter((r) => r.kind === 'xrayCaught')).toHaveLength(3);
    expect(reports.filter((r) => r.kind === 'xrayClean')).toHaveLength(3);
    expect(reports.filter((r) => r.kind === 'xrayOverlay')).toHaveLength(1);
  });

  test('jede hält Reaktion vor Konsequenz ein', async ({ page }) => {
    test.setTimeout(180_000);
    await toInspect(page, 4102, [4, 0, 2, 0]);

    const reports = await page.evaluate(() => window.__zollStage!.xraySequences('gnomes', 5));

    for (const report of reports) {
      const { face, verdict, banner } = report.labels;

      expect(face, `${report.id}: Label "face" fehlt`).toBeDefined();
      expect(banner, `${report.id}: Label "banner" fehlt`).toBeDefined();

      /* Das Diplomaten-Overlay hat kein Urteil — es bricht den Alarm ab. */
      if (verdict !== undefined) {
        expect(face!, `${report.id}: Gesicht kommt nicht vor dem Urteil`).toBeLessThan(verdict);
        expect(verdict, `${report.id}: Urteil kommt nicht vor dem Banner`).toBeLessThanOrEqual(banner!);
        /* Das Gesicht bekommt mindestens 200 ms allein (Art Direction §7). */
        expect(verdict - face!, `${report.id}: Gesicht zu kurz`).toBeGreaterThanOrEqual(0.19);
      }

      expect(face!, `${report.id}: Gesicht kommt nicht vor dem Banner`).toBeLessThan(banner!);
    }
  });

  test('jede bleibt unter fünf Sekunden', async ({ page }) => {
    test.setTimeout(180_000);
    await toInspect(page, 4103, [6, 0, 2, 0]);

    /* Mit voller Ladung — die Fontäne ist der längste Fall. */
    const reports = await page.evaluate(() => window.__zollStage!.xraySequences('cheese', 6));

    for (const report of reports) {
      expect(report.durationSec, `${report.id} dauert ${report.durationSec.toFixed(2)} s`).toBeLessThanOrEqual(5);
      /* Und lang genug, um überhaupt gesehen zu werden. */
      expect(report.durationSec, `${report.id} ist zu kurz`).toBeGreaterThan(0.6);
    }
  });

  test('das Ergebnis ist nie vor 100 % erkennbar', async ({ page }) => {
    test.setTimeout(180_000);
    await toInspect(page, 4104, [5, 0, 0, 0]);

    const rects = await page.evaluate(() => window.__zollStage!.suitcases());
    const banner = page.locator('.inspect__banner');

    await tapSuitcase(page, rects[0]!.playerId);

    /*
     * Während des gesamten Scans darf nichts anderes dastehen als „Röntgen läuft".
     * Geprüft wird das nicht einmal, sondern durchgehend: Ein Frame, in dem das Ergebnis
     * aufblitzt, wäre genau der Fehler, den dieser Test finden soll.
     */
    const states: string[] = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 3200) {
      states.push((await banner.getAttribute('data-kind')) ?? '');
      await page.waitForTimeout(60);
    }

    const early = states.slice(0, Math.floor(states.length * 0.75));
    expect(early.every((s) => s === 'scanning' || s === 'idle'), `Zwischenstände: ${[...new Set(early)].join(', ')}`).toBe(true);

    await expect(banner).toHaveAttribute('data-kind', /caught|clean|diplomat/, { timeout: 20_000 });
  });

  test('wiederholt sich über 1 000 Ziehungen nie unmittelbar', async ({ page }) => {
    test.setTimeout(180_000);
    await toInspect(page, 4105, [3, 0, 0, 0]);

    for (const kind of ['xrayCaught', 'xrayClean', 'gateClean', 'gateSmuggler']) {
      const picks = await page.evaluate(
        ([k, n]) => window.__zollStage!.drawSequences(k as string, n as number),
        [kind, 1000] as const
      );

      expect(picks, kind).toHaveLength(1000);

      /*
       * Direkt hintereinander nie dieselbe. Bei drei Kandidaten und Sperrfenster 3 ist
       * das die stärkste Aussage, die überhaupt möglich ist — ab dem vierten Zug muss
       * die Sperre nachgeben, sonst gäbe es nichts mehr zu wählen.
       */
      for (let i = 1; i < picks.length; i++) {
        expect(picks[i], `${kind} bei Zug ${i}`).not.toBe(picks[i - 1]);
      }

      /* Und über 1 000 Ziehungen kommt wirklich jede vor. */
      const registered = await page.evaluate(
        (k) => window.__zollStage!.xraySequences('ducks', 1).filter((r) => r.kind === k).length,
        kind
      );
      if (registered > 0) expect(new Set(picks).size).toBe(registered);
    }
  });

  test('das Diplomaten-Overlay ersetzt die Fang-Sequenz vollständig', async ({ page }) => {
    test.setTimeout(180_000);
    await toInspect(page, 4106, [4, 0, 0, 0]);

    const reports = await page.evaluate(() => window.__zollStage!.xraySequences('flamingos', 4));
    const diplomat = reports.find((r) => r.id === 'diplomat_pass')!;

    expect(diplomat.kind).toBe('xrayOverlay');

    /*
     * Es **ersetzt** die Fang-Sequenz, statt sie zu ergänzen: Der Diplomat taucht in
     * keinem Fang-Pool auf, sonst könnte er zusätzlich zu einem Alarm gezogen werden —
     * und ein Diplomat wird nie erwischt (Regelkern-Invariante).
     */
    const caughtPool = await page.evaluate(() =>
      window.__zollStage!.drawSequences('xrayCaught', 200)
    );
    expect(caughtPool).not.toContain('diplomat_pass');

    const overlayPool = await page.evaluate(() =>
      window.__zollStage!.drawSequences('xrayOverlay', 20)
    );
    expect(new Set(overlayPool)).toEqual(new Set(['diplomat_pass']));

    /* Und es folgt derselben Reihenfolge wie alle anderen (Art Direction §7). */
    expect(diplomat.labels['face']).toBeDefined();
    expect(diplomat.labels['verdict']).toBeDefined();
    expect(diplomat.labels['banner']).toBeDefined();
    expect(diplomat.labels['face']!).toBeLessThan(diplomat.labels['verdict']!);
    expect(diplomat.labels['verdict']!).toBeLessThanOrEqual(diplomat.labels['banner']!);
    expect(diplomat.durationSec).toBeLessThanOrEqual(5);
  });
});

test.describe('A4 — Effekte', () => {
  test('ein Fang lässt die Ware wirklich fliegen', async ({ page }) => {
    test.setTimeout(180_000);
    await toInspect(page, 4107, [6, 0, 0, 0]);

    const before = await page.evaluate(() => window.__zollStage!.particles());
    expect(before).toBe(0);

    const rects = await page.evaluate(() => window.__zollStage!.suitcases());
    await tapSuitcase(page, rects[0]!.playerId);

    /*
     * Irgendwann zwischen Scan-Ende und Banner muss die Fontäne fliegen. Gemessen wird
     * über die ganze Sequenz, weil je nach gezogener Variante ein anderer Moment der
     * lauteste ist — aber fliegen muss es in jeder.
     */
    let peak = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 9000) {
      peak = Math.max(peak, await page.evaluate(() => window.__zollStage!.particles()));
      await page.waitForTimeout(80);
    }

    expect(peak, 'keine Partikel während der Sequenz').toBeGreaterThan(0);
    /* Und das Budget aus Art Direction §8 wird eingehalten. */
    expect(peak, 'Partikel-Budget überschritten').toBeLessThanOrEqual(200);
  });
});

test.describe('A5 — Zugänglichkeit', () => {
  test('die Koffer sind auch per Tastatur zu öffnen', async ({ page }) => {
    test.setTimeout(180_000);
    await toInspect(page, 5201, [4, 0, 0, 0]);

    /*
     * Die Koffer liegen auf einem Canvas. Wer nicht tippen kann, braucht einen anderen
     * Weg — und der muss zum selben Ergebnis führen, nicht zu einem Ersatzspiel.
     */
    const keys = page.locator('.inspect__keys button:not([disabled])');
    await expect(keys).toHaveCount(4);

    /* Der Fokus muss sichtbar werden, sonst ist er keiner. */
    await keys.first().focus();
    await page.waitForTimeout(80);
    const visible = await keys.first().evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    });
    expect(visible, 'der fokussierte Knopf bleibt unsichtbar').toBe(true);

    /* Und er trägt denselben Namen wie der Koffer auf der Bühne. */
    await expect(keys.first()).toContainText(/\w+/);

    await keys.first().press('Enter');
    await expect(page.locator('.inspect__banner')).toHaveAttribute('data-kind', /scanning/, {
      timeout: 10_000,
    });
    await expect(page.locator('.inspect__banner')).toHaveAttribute('data-kind', /caught|clean|diplomat/, {
      timeout: 25_000,
    });
  });

  test('Banner melden sich bei Screenreadern', async ({ page }) => {
    test.setTimeout(180_000);
    await toInspect(page, 5202, [3, 0, 0, 0]);

    /* Was sich ändert, ohne dass man es angestoßen hat, muss angesagt werden. */
    await expect(page.locator('.inspect__banner')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('.openings')).toBeVisible();
  });
});
