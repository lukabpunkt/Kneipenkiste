/**
 * Informationssicherheit ist Gameplay (CLAUDE.md, A0-Audit).
 *
 * Geprueft wird nicht die Absicht, sondern die **Serialisierung**: Was ein Screen bekommt,
 * wird zu JSON gemacht und darauf abgeklopft, dass weder Mengen noch `truthful` noch die
 * Diplomat-ID darin vorkommen. Zusaetzlich greift ein Lint-Test ueber `src/ui/`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { maxAmount } from '@/core/modes';
import { packView, publicView, resultView, type ViewPhase } from '@/core/publicView';
import { finishRound, inspect, runGate } from '@/core/round';
import { makeRound, rngFor } from './helpers';

/** Alle Zahlenwerte einer Struktur — so faellt eine durchgesickerte Menge auf. */
function numbersIn(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) for (const item of value) numbersIn(item, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) numbersIn(v, out);
  return out;
}

describe('publicView in HALL', () => {
  it('enthaelt Hinweis-Typ und Koffer, aber niemals `truthful`', () => {
    const round = makeRound({ amounts: [4, 0, 2, 0, 0, 0, 0], withHints: true });
    const view = publicView(round, 'HALL');
    const json = JSON.stringify(view);

    expect(view.hints.length).toBeGreaterThan(0);
    expect(json).not.toContain('truthful');
    for (const hint of view.hints) {
      expect(Object.keys(hint).sort()).toEqual(['suitcaseOf', 'type']);
    }
  });

  it('enthaelt keine Mengen — auch nicht versteckt in einer Zahl', () => {
    /*
     * Die Mengen 5 und 7 kommen sonst nirgends im View vor (Index 0..6, k = 3, h = 3).
     * Taucht eine davon auf, ist eine Menge durchgesickert.
     */
    const round = makeRound({ amounts: [5, 0, 7, 0, 0, 0, 0], modes: { highSeason: true }, withHints: true });
    const numbers = numbersIn(publicView(round, 'HALL'));
    expect(numbers).not.toContain(5);
    expect(numbers).not.toContain(7);
  });

  it('enthaelt die Diplomat-ID nicht', () => {
    const round = makeRound({ amounts: [3, 0, 0, 0], modes: { diplomat: true }, withHints: true });
    const json = JSON.stringify(publicView(round, 'HALL'));

    expect(json).not.toContain('diplomatId');
    /* Der Diplomat selbst darf im View vorkommen — als Reisender, nicht als Diplomat. */
    expect(json).not.toContain('"hasImmunity"');
  });

  it('kennt keine `packs`', () => {
    const round = makeRound({ amounts: [3, 1, 0, 0], withHints: true });
    expect(JSON.stringify(publicView(round, 'HALL'))).not.toContain('packs');
  });
});

describe('publicView in INSPECT', () => {
  it('zeigt die Menge erst, nachdem der Koffer geoeffnet wurde', () => {
    const round = makeRound({ amounts: [6, 0, 0, 0], players: 5, withHints: true });
    const before = publicView(round, 'INSPECT');
    expect(numbersIn(before)).not.toContain(6);

    const opened = inspect(round, round.travelerIds[0]!).round;
    const after = publicView(opened, 'INSPECT');

    /* Jetzt hat das Roentgenbild sie gezeigt — jetzt darf sie im View stehen. */
    expect(after.openings[0]!.amount).toBe(6);
    /* Der zweite, ungeoeffnete Koffer verraet weiterhin nichts. */
    expect(after.suitcases[1]!).not.toHaveProperty('amount');
  });

  it('markiert nur tippbare Koffer als tippbar', () => {
    const round = makeRound({ amounts: [3, 0, 0, 0], players: 5, withHints: true });
    const opened = inspect(round, round.travelerIds[0]!).round;
    const view = publicView(opened, 'INSPECT');

    expect(view.suitcases[0]!.opened).toBe(true);
    expect(view.suitcases[0]!.inspectable).toBe(false);
    expect(view.suitcases[1]!.inspectable).toBe(true);
    expect(view.openingsLeft).toBe(1);
  });

  it('macht in HALL keinen Koffer tippbar', () => {
    const round = makeRound({ amounts: [3, 0, 0, 0], withHints: true });
    expect(publicView(round, 'HALL').suitcases.every((s) => !s.inspectable)).toBe(true);
  });

  it('zeigt den Spuerhund-Hinweis oeffentlich, ohne die Menge zu verraten', () => {
    const round = makeRound({ amounts: [0, 4, 0, 0], modes: { sniffer: true }, withHints: true });
    const view = publicView(round, 'INSPECT');

    expect(view.dogHint).toEqual({ suitcaseOf: round.travelerIds[1], barks: true });
    expect(numbersIn(view)).not.toContain(4);
  });
});

describe('publicView in GATE', () => {
  it('bleibt bis zum Reveal genauso verschwiegen', () => {
    const round = makeRound({ amounts: [5, 0, 0, 0], withHints: true });
    const phases: ViewPhase[] = ['HALL', 'INSPECT', 'GATE'];
    for (const phase of phases) {
      expect(numbersIn(publicView(round, phase))).not.toContain(5);
    }
  });
});

describe('packView', () => {
  it('zeigt nur das eigene Pack', () => {
    /* Die 9 der Mitreisenden kommt sonst nirgends im View vor — anders als die 6, die dort
       als `maxAmount` legitim steht. */
    const round = makeRound({ amounts: [2, 9, 9, 9], modes: { highSeason: true } });
    const view = packView(round, round.travelerIds[0]!, maxAmount(round.modes));

    expect(view.amount).toBe(2);
    expect(numbersIn(view)).not.toContain(9);
  });

  it('verraet die Immunitaet nur dem Diplomaten selbst', () => {
    const round = makeRound({ amounts: [1, 1, 1, 1], modes: { diplomat: true } });
    const diplomatId = round.diplomatId!;
    const other = round.travelerIds.find((id) => id !== diplomatId)!;

    expect(packView(round, diplomatId, 6).hasImmunity).toBe(true);
    expect(packView(round, other, 6).hasImmunity).toBe(false);
  });

  it('weist Nicht-Reisende ab', () => {
    const round = makeRound({ amounts: [1, 1, 1, 1] });
    expect(() => packView(round, round.officerId, 6)).toThrow();
  });
});

describe('resultView', () => {
  it('loest am Ende alles auf: Mengen, `truthful` und den Diplomaten', () => {
    let round = makeRound({ amounts: [5, 0, 3, 0], players: 5, modes: { diplomat: true }, withHints: true });
    round = inspect(round, round.travelerIds[0]!).round;

    const { round: gated, gate } = runGate(round, undefined, rngFor(2));
    const view = resultView(finishRound(gated, gate));

    expect(view.suitcases.map((s) => s.amount)).toEqual([5, 0, 3, 0]);
    expect(view.hintResolutions.every((h) => typeof h.truthful === 'boolean')).toBe(true);
    expect(view.diplomatId).toBeDefined();
    expect(view.suitcases[0]!.opened).toBe(true);
  });

  it('laesst die Diplomat-ID weg, wenn der Modus aus war', () => {
    const round = makeRound({ amounts: [0, 0, 0, 0], withHints: true });
    const { round: gated, gate } = runGate(round, undefined, rngFor(1));
    expect(resultView(finishRound(gated, gate)).diplomatId).toBeUndefined();
  });
});

describe('Lint: kein Screen fasst geheime Felder an', () => {
  /*
   * Der Test aus dem Standing Audit. Er laeuft ueber `src/ui/` und `src/game/`, weil dort
   * ab M1 die Screens und ab M2 die Directors liegen — beide duerfen ausschliesslich mit
   * `publicView` arbeiten.
   */
  const roots = ['src/ui', 'src/game'];
  const forbidden = [/\.packs\b/, /\bdiplomatId\b/, /truthful/];

  function walk(dir: string, out: string[] = []): string[] {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return out; /* Ordner gibt es erst ab M1/M2. */
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (full.endsWith('.ts')) out.push(full);
    }
    return out;
  }

  it('findet weder `round.packs` noch `diplomatId` noch `truthful`', () => {
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        const source = readFileSync(file, 'utf8');
        for (const pattern of forbidden) {
          if (pattern.test(source)) offenders.push(`${file}: ${pattern}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
