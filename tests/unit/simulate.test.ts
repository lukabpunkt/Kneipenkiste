/**
 * Rundensimulation (Roadmap M6.2).
 *
 * Sie ist die Grundlage des Balancing-Passes — also muss sie selbst stimmen. Geprüft
 * wird, dass sie den Regelkern wirklich abbildet: p_true kommt heraus, was hineingesteckt
 * wurde, ein Beamter, der nie öffnet, fängt niemanden, und mehr Öffnungen bedeuten mehr
 * Fänge.
 */

import { describe, expect, it } from 'vitest';
import { HINT_TRUTH_PROBABILITY } from '@/config/rules';
import { modeFlags } from '@/core/modes';
import { createSeededRng } from '@/core/rng';
import { defaultConfig, simulate } from '@/core/simulate';

const rng = (seed = 1): ReturnType<typeof createSeededRng> => createSeededRng(seed);

describe('simulate', () => {
  it('bildet p_true ab', () => {
    /* Die Simulation benutzt `generateHints` — sie muss dieselbe Quote liefern. */
    const result = simulate(defaultConfig({ rounds: 20_000, playerCount: 8 }), rng(7));
    expect(Math.abs(result.truthfulHints - HINT_TRUTH_PROBABILITY)).toBeLessThan(0.05);
  });

  it('fängt niemanden, wenn der Beamte nie öffnet', () => {
    const result = simulate(defaultConfig({ rounds: 2000, officer: 'never' }), rng(2));
    expect(result.roundsWithCatch).toBe(0);
    expect(result.harassmentRounds).toBe(0);
    expect(result.hitRate).toBe(0);
    expect(result.caughtAmount).toBe(0);
    /* Alles kommt durch. */
    expect(result.smuggledThrough).toBeGreaterThan(0);
  });

  it('fängt mit Hinweisen mehr als ohne', () => {
    /*
     * Der Kern des Hinweis-Modells: Wer den Hinweisen folgt, ist besser dran als wer
     * würfelt — aber nicht dramatisch. Wäre der Unterschied null, wären die Hinweise
     * wertlos; wäre er riesig, gäbe es nichts mehr zu entscheiden.
     */
    const withHints = simulate(defaultConfig({ rounds: 20_000, officer: 'hints' }), rng(3));
    const random = simulate(defaultConfig({ rounds: 20_000, officer: 'random' }), rng(3));

    expect(withHints.hitRate).toBeGreaterThan(random.hitRate);
    expect(withHints.hitRate - random.hitRate).toBeLessThan(0.35);
  });

  it('lässt bei einer ehrlichen Gruppe nur ehrliche Runden zu', () => {
    const result = simulate(
      defaultConfig({ rounds: 500, smuggler: { chance: 0, greed: 0.5 } }),
      rng(4)
    );
    expect(result.banners.honestRound).toBe(1);
    expect(result.roundsWithCatch).toBe(0);
    expect(result.smuggledThrough).toBe(0);
  });

  it('lässt bei einer gierigen Gruppe keine ehrliche Runde zu', () => {
    const result = simulate(
      defaultConfig({ rounds: 500, smuggler: { chance: 1, greed: 0.5 } }),
      rng(5)
    );
    expect(result.banners.honestRound).toBe(0);
  });

  it('verteilt alle Banner auf 1', () => {
    const result = simulate(defaultConfig({ rounds: 5000 }), rng(6));
    const sum = Object.values(result.banners).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('bringt in Hochsaison mehr Ware ins Spiel — aber nicht mehr durch die Grenze', () => {
    /*
     * Ein Befund aus dem Balancing-Pass, kein Zufall: Die zusätzliche Öffnung frisst die
     * zusätzliche Gier genau auf. Über 20 000 Runden und drei Seeds bleibt „durchgekommen"
     * bei ~4,1 Stück, während „erwischt" von ~3,0 auf ~6,6 steigt.
     *
     * Hochsaison ist also kein Schmuggler-Modus, sondern ein Trink-Modus. Der Test hält
     * das fest, damit eine spätere Regeländerung auffällt statt durchzurutschen.
     */
    const normal = simulate(defaultConfig({ rounds: 20_000 }), rng(8));
    const high = simulate(
      defaultConfig({ rounds: 20_000, modes: modeFlags({ highSeason: true }) }),
      rng(8)
    );

    /* Mehr Ware insgesamt … */
    expect(high.smuggledThrough + high.caughtAmount).toBeGreaterThan(
      (normal.smuggledThrough + normal.caughtAmount) * 1.4
    );
    /* … und deutlich mehr Schlücke. */
    expect(high.sipsTravelers).toBeGreaterThan(normal.sipsTravelers * 1.8);
    /* Aber durch die Grenze kommt fast genau dasselbe. */
    expect(Math.abs(high.smuggledThrough - normal.smuggledThrough)).toBeLessThan(0.3);
  });

  it('ist bei gleichem Seed reproduzierbar', () => {
    const a = simulate(defaultConfig({ rounds: 1000 }), rng(9));
    const b = simulate(defaultConfig({ rounds: 1000 }), rng(9));
    expect(a).toEqual(b);
  });

  it('zählt "reingefallen" nur bei sauberen Koffern mit Hinweis', () => {
    /* Ohne Schmuggler zeigt jeder Hinweis auf einen sauberen Koffer. */
    const result = simulate(
      defaultConfig({ rounds: 2000, smuggler: { chance: 0, greed: 0.5 }, ignoreHint: 0 }),
      rng(10)
    );
    /* Der Beamte öffnet k Koffer und folgt dabei den Hinweisen — er fällt fast immer rein. */
    expect(result.fooledByHint).toBeGreaterThan(0.9);
  });
});
