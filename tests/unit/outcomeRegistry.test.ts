/**
 * Die elf Inszenierungen (Roadmap M4.1/M4.6, Audit A4).
 *
 * Hier laufen sie alle einmal durch — mit der Buehnen-Attrappe aus `stageDouble.ts`,
 * also ohne Renderer, aber mit echten GSAP-Timelines und echtem Zeitplan. Geprueft wird,
 * was das Spiel kaputt macht, wenn es bricht:
 *
 * 1. **Dauer 2–8 s.** Kuerzer ist keine Pointe, laenger ist eine Geiselnahme.
 * 2. **Der Trinker-Zaehler-Moment.** Eine Show ohne Zahl beantwortet die einzige Frage
 *    nicht, die am Tisch zaehlt: Wer trinkt?
 * 3. **Reset-Invariante.** Nach `reset()` steht die Buehne wie vorher — sonst schleppt
 *    Runde 4 einen plattgedrueckten Crook aus Runde 3 mit.
 * 4. **Vollstaendigkeit.** Fuer jeden der fuenf Outcomes ist etwas registriert, und die
 *    Auswahl wiederholt sich ueber 1 000 Runden nie im Fenster.
 * 5. **Jeder Frame-Name existiert im Atlas.** Ein Tippfehler in `spawnProp()` faellt sonst
 *    erst auf der Buehne auf, mitten in der Show.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NO_REPEAT_WINDOW } from '@/config/choreo';
import { ANIM } from '@/config/theme';
import { resolveRound } from '@/core/payout';
import { createSeededRng } from '@/core/rng';
import { OUTCOMES, type Outcome } from '@/core/types';
import { vaultSpec } from '@/core/vault';
import {
  allSequences,
  clearRecent,
  clearRegistry,
  outcomeById,
  overlayById,
  pickOutcomeSequence,
  sequencesFor,
} from '@/game/outcomes/OutcomeSequence';
import { ALL_OUTCOMES, ALL_OVERLAYS, registerAll, resetRegistration } from '@/game/outcomes/registry';
import { makeIds, makeSettings, makeSetup } from './helpers';
import { stageDouble } from './stageDouble';

beforeEach(() => {
  clearRegistry();
  clearRecent();
  resetRegistration();
  registerAll();
});

afterEach(() => {
  clearRegistry();
  clearRecent();
  resetRegistration();
});

/* ------------------------------------------------------------------ */
/* Vollstaendigkeit                                                    */
/* ------------------------------------------------------------------ */

describe('Registrierung', () => {
  it('registriert jede Inszenierung aus der Liste', () => {
    // Elf aus GDD §4.4, dazu die Nachzuegler aus dem Backlog nach 1.0.
    expect(ALL_OUTCOMES.length).toBeGreaterThanOrEqual(11);
    for (const sequence of ALL_OUTCOMES) {
      expect(outcomeById(sequence.id)?.id).toBe(sequence.id);
    }
    // Plus `basic_outcome` als Rueckfall — und sonst nichts.
    expect(allSequences()).toHaveLength(ALL_OUTCOMES.length + 1);
  });

  it('hat fuer jeden Outcome mindestens eine Sequenz', () => {
    for (const outcome of OUTCOMES) {
      expect(sequencesFor(outcome).length, `keine Sequenz fuer "${outcome}"`).toBeGreaterThan(0);
    }
  });

  it('hat für jeden Fall genug Varianten (GDD §4.4)', () => {
    const count = (outcome: Outcome): number =>
      ALL_OUTCOMES.filter((sequence) => sequence.outcome === outcome).length;

    /*
     * "Mindestens 2 Varianten pro Fall bis Release" (GDD §4.4) — mit einer Ausnahme:
     * Der Jackpot kommt selten genug, dass ihn niemand zweimal an einem Abend sieht.
     * Die Zahlen wachsen mit dem Backlog; geprueft wird die Untergrenze, nicht der
     * Stand von gestern.
     */
    expect(count('allShare')).toBeGreaterThanOrEqual(2);
    expect(count('soloSteal')).toBeGreaterThanOrEqual(3);
    expect(count('multiSteal')).toBeGreaterThanOrEqual(3);
    expect(count('allSteal')).toBeGreaterThanOrEqual(2);
    expect(count('jackpot')).toBeGreaterThanOrEqual(1);

    // Und die Summe deckt sich mit der Liste — keine Sequenz faellt durchs Raster.
    const total = OUTCOMES.reduce((sum, outcome) => sum + count(outcome), 0);
    expect(total).toBe(ALL_OUTCOMES.length);
  });

  it('vergibt jede ID genau einmal und jedes Gewicht groesser null', () => {
    const ids = ALL_OUTCOMES.map((sequence) => sequence.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const sequence of ALL_OUTCOMES) expect(sequence.weight).toBeGreaterThan(0);
  });

  it('registriert beide Overlays und laesst sich mehrfach aufrufen', () => {
    for (const overlay of ALL_OVERLAYS) expect(overlayById(overlay.id)).toBeDefined();
    expect(() => registerAll()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Auswahl ueber 1 000 Runden                                          */
/* ------------------------------------------------------------------ */

describe('Auswahl (1 000 Runden)', () => {
  it('wiederholt sich nie innerhalb des No-Repeat-Fensters', () => {
    const rng = createSeededRng(8080);
    const history = new Map<Outcome, string[]>();

    for (let i = 0; i < 1000; i++) {
      for (const outcome of OUTCOMES) {
        const picked = pickOutcomeSequence(outcome, rng)!;
        expect(sequencesFor(outcome).map((s) => s.id)).toContain(picked);

        const seen = history.get(outcome) ?? [];
        /*
         * Bei nur einer Sequenz je Typ — Jackpot — muss dieselbe wiederkommen duerfen,
         * sonst stuende die Buehne leer. Das Fenster gilt nur, wo es Alternativen gibt.
         */
        if (sequencesFor(outcome).length > NO_REPEAT_WINDOW) {
          expect(seen.slice(-NO_REPEAT_WINDOW)).not.toContain(picked);
        }
        seen.push(picked);
        history.set(outcome, seen);
      }
    }

    // Jede Sequenz kommt ueber 1 000 Runden auch wirklich dran.
    for (const outcome of OUTCOMES) {
      const seen = new Set(history.get(outcome));
      expect(seen.size).toBe(sequencesFor(outcome).length);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Jede Sequenz einzeln                                                */
/* ------------------------------------------------------------------ */

/** Ein Ergebnis, das zu diesem Outcome passt — die Sequenz bekommt echte Daten. */
function resultFor(outcome: Outcome): { result: ReturnType<typeof resolveRound>; ids: string[] } {
  const settings = makeSettings();
  const spec = vaultSpec(settings);
  const ids = makeIds(4);

  const steals: Record<Outcome, boolean[]> = {
    allShare: [false, false, false, false],
    soloSteal: [true, false, false, false],
    multiSteal: [true, true, false, false],
    allSteal: [true, true, true, true],
    jackpot: [false, false, false, false],
  };

  const vault = outcome === 'jackpot' ? spec.jackpotAt : spec.startVault + 2;
  const result = resolveRound(ids, makeSetup({ vault, steals: steals[outcome] }), settings);
  expect(result.outcome).toBe(outcome);
  return { result, ids };
}

describe.each(ALL_OUTCOMES.map((sequence) => [sequence.id, sequence] as const))(
  '%s',
  (id, sequence) => {
    it('dauert zwischen 2 und 8 Sekunden', () => {
      const { result, ids } = resultFor(sequence.outcome);
      const stage = stageDouble(result, ids);
      const timeline = sequence.build(stage.ctx);
      const ms = timeline.duration() * 1000;

      expect(ms, `${id} dauert ${Math.round(ms)} ms`).toBeGreaterThanOrEqual(ANIM.outcomeMinMs);
      expect(ms, `${id} dauert ${Math.round(ms)} ms`).toBeLessThanOrEqual(ANIM.outcomeMaxMs);
      timeline.kill();
    });

    it('endet mit dem Trinker-Zaehler-Moment', () => {
      const { result, ids } = resultFor(sequence.outcome);
      const stage = stageDouble(result, ids);
      const timeline = sequence.build(stage.ctx);
      timeline.progress(1, false);

      /*
       * Beim Alleingang steht erst nach der Verteil-UI fest, wer trinkt (GDD §3.6) —
       * dort darf der Zaehler leer bleiben. Ueberall sonst muss eine Zahl fallen.
       */
      if (result.drinkers.length > 0) expect(stage.counters).toBeGreaterThan(0);
      timeline.kill();
    });

    it('sagt Kassel einen Satz zum Ausgang', () => {
      const { result, ids } = resultFor(sequence.outcome);
      const stage = stageDouble(result, ids);
      const timeline = sequence.build(stage.ctx);
      timeline.progress(1, false);

      expect(stage.lines.length).toBeGreaterThan(0);
      timeline.kill();
    });

    it('spielt mindestens einen Sound-Cue', () => {
      const { result, ids } = resultFor(sequence.outcome);
      const stage = stageDouble(result, ids);
      const timeline = sequence.build(stage.ctx);
      timeline.progress(1, false);

      expect(stage.cues.length).toBeGreaterThan(0);
      timeline.kill();
    });

    it('stellt die Figuren nach reset() wieder gerade hin', () => {
      const { result, ids } = resultFor(sequence.outcome);
      const stage = stageDouble(result, ids);
      const before = [...stage.crooks.values()].map((crook) => ({ ...crook.position }));

      const timeline = sequence.build(stage.ctx);
      // Mitten im Getuemmel abbrechen: Genau dort raeumt eine Sequenz am schlechtesten auf.
      timeline.progress(0.6, true);
      timeline.kill();
      stage.reset();

      [...stage.crooks.values()].forEach((crook, index) => {
        expect(crook.view.alpha).toBe(1);
        expect(crook.view.rotation).toBe(0);
        expect(crook.view.scale.x).toBe(1);
        expect(crook.body.rotation).toBe(0);
        expect(crook.body.scale.x).toBe(1);
        expect(crook.body.scale.y).toBe(1);
        expect(crook.head.rotation).toBe(0);
        expect(crook.bag).toBe(false);
        expect(crook.props).toBe(0);
        // Die Sitzposition gehoert der Buehne, nicht der Inszenierung.
        expect({ ...crook.position }).toEqual(before[index]);
      });
      expect(stage.props).toHaveLength(0);
    });
  }
);

describe('Animationsprinzipien (Art Direction §7)', () => {
  /**
   * Der Hit-Stop ist das Prinzip, das beim Schreiben am leichtesten vergessen wird —
   * und das man am staerksten vermisst. Er laesst sich nicht aus der Timeline ablesen
   * (eine Luecke im Zeitplan sieht aus wie keine Luecke), deshalb prueft der Test die
   * Quelle: Jede Sequenz muss `hitStop()` aus `juice.ts` benutzen.
   *
   * Die uebrigen sechs Prinzipien sind Augenmass und stehen im Audit A4 als manuelle
   * Zeile — ein Test, der `back.out` zaehlt, prueft Schreibweise, nicht Wirkung.
   */
  it('setzt in jeder Sequenz einen Hit-Stop', async () => {
    const { readdirSync } = await import('node:fs');
    const root = join(process.cwd(), 'src/game/outcomes');

    const files: string[] = [];
    for (const dir of readdirSync(root, { withFileTypes: true })) {
      if (!dir.isDirectory() || dir.name === 'overlays') continue;
      for (const entry of readdirSync(join(root, dir.name))) {
        if (entry.endsWith('.ts')) files.push(join(root, dir.name, entry));
      }
    }
    expect(files).toHaveLength(ALL_OUTCOMES.length);

    const without = files.filter((file) => !readFileSync(file, 'utf8').includes('hitStop('));
    expect(without, `ohne Hit-Stop: ${without.join(', ')}`).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

describe('Overlays', () => {
  it('lassen sich mit jeder Dieb-Sequenz kombinieren', () => {
    const thiefOutcomes: Outcome[] = ['soloSteal', 'multiSteal', 'allSteal'];

    for (const outcome of thiefOutcomes) {
      for (const sequence of sequencesFor(outcome)) {
        const { result, ids } = resultFor(outcome);
        const stage = stageDouble(result, ids);
        const crook = stage.crooks.get(result.thieves[0]!)!;
        const card = {
          view: { addChild: () => {}, position: { x: 0, y: 0 } },
          dropHelmet: () => gsap.timeline().to({}, { duration: 0.6 }),
        };

        for (const overlay of ALL_OVERLAYS) {
          const combined = overlay.buildOnCard(
            stage.ctx,
            card as never,
            crook as never
          );
          expect(combined.duration()).toBeGreaterThan(0);
          // Ein Overlay legt sich ueber die Karte, es darf die Show nicht sprengen.
          expect(combined.duration() * 1000).toBeLessThanOrEqual(ANIM.outcomeMaxMs);
          combined.kill();
        }

        sequence.build(stage.ctx).kill();
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Atlas-Abgleich                                                      */
/* ------------------------------------------------------------------ */

describe('Atlas', () => {
  /**
   * Jeder Frame-Name, den der Buehnen-Code anfasst, muss im Atlas liegen.
   *
   * PIXI wirft zur Laufzeit, wenn ein Frame fehlt — und zwar erst beim Bau der Figur,
   * also mitten in der Aufdeckung. Genau so ist `props/sign_deal` durchgerutscht: Die
   * SVG lag unter `crooks/`, `spawnProp()` sucht aber im `front`-Atlas.
   */
  it('kennt jeden Frame, den der Code benutzt', async () => {
    const { readdirSync } = await import('node:fs');
    const root = process.cwd();

    const frames = new Set<string>();
    for (const file of readdirSync(join(root, 'public/atlas'))) {
      if (!file.endsWith('@1x.json')) continue;
      const atlas = JSON.parse(readFileSync(join(root, 'public/atlas', file), 'utf8')) as {
        frames: Record<string, unknown>;
      };
      for (const name of Object.keys(atlas.frames)) frames.add(name);
    }
    expect(frames.size).toBeGreaterThan(50);

    const used = new Set<string>();
    const walk = (dir: string): void => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          walk(path);
        } else if (entry.name.endsWith('.ts')) {
          const source = readFileSync(join(root, path), 'utf8');
          for (const match of source.matchAll(
            /'((?:props|cards|crooks|kassel|room|vault|back|front)\/[a-z0-9_/]+)'/g
          )) {
            used.add(match[1]!);
          }
        }
      }
    };
    walk('src/game');

    const missing = [...used].filter((frame) => !frames.has(frame));
    expect(missing, `Frames fehlen im Atlas: ${missing.join(', ')}`).toEqual([]);
  });
});
