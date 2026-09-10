import { describe, expect, it } from 'vitest';
import { consumeRopes, findPlankThieves, flagOf, isDeserter, isRottenBreak, noModes, ropeAvailable, weightOf } from '@/core/modes';
import { groupByPlank, resolvePayout } from '@/core/payout';
import { roundOf, sipsOf } from './helpers';

/* ------------------------------------------------------------------ */
/* Fahne (GDD §3.6)                                                    */
/* ------------------------------------------------------------------ */

describe('Modus "Fahne"', () => {
  it('ohne den Modus gibt es weder Fahnen noch Fahnenflucht', () => {
    const round = roundOf({ picks: [5, 2, 3], flags: { p1: 3 } });
    expect(flagOf(round, 'p1')).toBeUndefined();
    expect(isDeserter(round, 'p1', { plank: 5 })).toBe(false);
    expect(resolvePayout(round).deserters).toEqual([]);
  });

  it('Fahnenflucht: sicher gestanden heisst kein Guthaben', () => {
    /* p1 verspricht 3, geht auf 5. p2 und p3 kollidieren, es gibt also etwas zu verteilen. */
    const payout = resolvePayout(
      roundOf({ picks: [5, 2, 2, 4], plankCount: 6, modes: { flags: true }, flags: { p1: 3 } })
    );

    expect(payout.deserters).toEqual(['p1']);
    expect(sipsOf(payout.drinkers, 'p1')).toBe(0);
    expect(payout.giving.p1).toBeUndefined();
    /* p4 stand ebenso sicher — der hat aber sein Wort nicht gebrochen. */
    expect(payout.giving.p4).toBe(1);
  });

  it('Fahnenflucht: wer stuerzt, trinkt doppelt', () => {
    const payout = resolvePayout(
      roundOf({ picks: [5, 5, 2], plankCount: 6, modes: { flags: true }, flags: { p1: 3 } })
    );

    expect(sipsOf(payout.drinkers, 'p1')).toBe(4);
    expect(payout.drinkers.find((d) => d.playerId === 'p1')!.reason).toBe('deserterDouble');
    /* p2 hat nichts versprochen und trinkt normal. */
    expect(sipsOf(payout.drinkers, 'p2')).toBe(2);
    expect(payout.drinkers.find((d) => d.playerId === 'p2')!.reason).toBe('collision');
  });

  it('wer seine Fahne einhaelt, ist kein Fahnenfluechtiger', () => {
    const round = roundOf({ picks: [3, 1, 2], modes: { flags: true }, flags: { p1: 3 } });
    expect(isDeserter(round, 'p1', { plank: 3 })).toBe(false);
    expect(resolvePayout(round).deserters).toEqual([]);
  });

  it('das Seil zaehlt als Fahnenflucht (ADR-7)', () => {
    const round = roundOf({ picks: ['rope', 1, 2], modes: { flags: true, rope: true }, flags: { p1: 3 } });
    expect(isDeserter(round, 'p1', { rope: true })).toBe(true);
    expect(resolvePayout(round).deserters).toEqual(['p1']);
  });

  it('Balkendieb: +2 Guthaben, obwohl er selbst faellt', () => {
    /* p2 hat die 3 fuer sich reklamiert und steht drauf. p1 tritt trotzdem drauf. */
    const payout = resolvePayout(
      roundOf({ picks: [3, 3, 1, 2], plankCount: 6, modes: { flags: true }, flags: { p2: 3 } })
    );

    expect(payout.plankThieves).toEqual([{ thief: 'p1', victim: 'p2' }]);
    expect(payout.giving.p1).toBe(2);
    /* Er faellt trotzdem mit. */
    expect(sipsOf(payout.drinkers, 'p1')).toBe(2);
    /* Der Bestohlene bekommt nichts — er liegt im Fluss. */
    expect(payout.giving.p2).toBeUndefined();
  });

  it('kein Diebstahl ohne Besitzer auf dem Balken', () => {
    /* p2 hatte die 3 reklamiert, steht aber selbst woanders: dann ist die 3 Freiwild. */
    const round = roundOf({ picks: [3, 5, 3, 2], plankCount: 6, modes: { flags: true }, flags: { p2: 3 } });
    expect(findPlankThieves(round, groupByPlank(round))).toEqual([]);
  });

  it('zwei Fahnen auf demselben Balken: beide sind Besitzer, keiner ist Dieb', () => {
    const round = roundOf({
      picks: [3, 3, 1],
      plankCount: 6,
      modes: { flags: true },
      flags: { p1: 3, p2: 3 },
    });
    expect(findPlankThieves(round, groupByPlank(round))).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Morscher Balken                                                     */
/* ------------------------------------------------------------------ */

describe('Modus "Morscher Balken"', () => {
  it('wer allein drauf steht, trinkt 1', () => {
    const payout = resolvePayout(
      roundOf({ picks: [2, 1, 3], plankCount: 5, modes: { rotten: true }, rottenPlank: 2 })
    );

    expect(payout.groups.find((g) => g.plank === 2)!.rotten).toBe(true);
    expect(sipsOf(payout.drinkers, 'p1')).toBe(1);
    expect(payout.drinkers[0]!.reason).toBe('rotten');
    expect(payout.outcome).toBe('collision');
    expect(payout.banner).toBe('badLuck');
  });

  it('zu zweit auf dem morschen Balken ist es eine ganz normale Kollision', () => {
    const round = roundOf({ picks: [2, 2, 3], plankCount: 5, modes: { rotten: true }, rottenPlank: 2 });
    const groups = groupByPlank(round);

    expect(groups.find((g) => g.plank === 2)!.rotten).toBe(false);
    expect(isRottenBreak(round, groups[0]!)).toBe(false);
    expect(sipsOf(resolvePayout(round).drinkers, 'p1')).toBe(2);
  });

  it('ohne den Modus ist der Balken nur ein Balken', () => {
    const round = roundOf({ picks: [2, 1, 3], plankCount: 5, rottenPlank: 2 });
    expect(resolvePayout(round).drinkers).toEqual([]);
  });

  it('wer durchbricht, verteilt nichts', () => {
    /* p1 auf dem morschen Balken, p2 und p3 kollidieren — es gaebe also etwas zu verteilen. */
    const payout = resolvePayout(
      roundOf({ picks: [2, 4, 4, 1], plankCount: 5, modes: { rotten: true }, rottenPlank: 2 })
    );
    expect(payout.giving.p1).toBeUndefined();
    expect(payout.giving.p4).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Schwergewicht                                                       */
/* ------------------------------------------------------------------ */

describe('Modus "Schwergewicht"', () => {
  it('ohne den Modus zaehlt jeder als 1', () => {
    const round = roundOf({ picks: [1, 2, 3], weights: { p1: 3 } });
    expect(weightOf(round, 'p1')).toBe(1);
  });

  it('Kollision: trinkt Personen x Gewicht', () => {
    const payout = resolvePayout(
      roundOf({ picks: [1, 1, 3], plankCount: 5, modes: { weights: true }, weights: { p1: 3, p2: 1 } })
    );
    expect(sipsOf(payout.drinkers, 'p1')).toBe(6);
    expect(sipsOf(payout.drinkers, 'p2')).toBe(2);
  });

  it('sicher: verteilt sein Gewicht', () => {
    const payout = resolvePayout(
      roundOf({ picks: [1, 1, 3], plankCount: 5, modes: { weights: true }, weights: { p3: 3 } })
    );
    expect(payout.giving.p3).toBe(3);
  });

  it('in der Todeszone verteilt er das Doppelte seines Gewichts', () => {
    const payout = resolvePayout(
      roundOf({ picks: [1, 1, 3], plankCount: 2, modes: { weights: true }, weights: { p3: 2 } })
    );
    expect(payout.deathZone).toBe(true);
    expect(payout.giving.p3).toBe(4);
  });
});

/* ------------------------------------------------------------------ */
/* Seil                                                                */
/* ------------------------------------------------------------------ */

describe('Modus "Seil"', () => {
  it('kostet einen Schluck und bringt nichts ein', () => {
    const payout = resolvePayout(roundOf({ picks: ['rope', 1, 1], modes: { rope: true } }));

    expect(payout.ropeUsers).toEqual(['p1']);
    expect(sipsOf(payout.drinkers, 'p1')).toBe(1);
    expect(payout.drinkers.find((d) => d.playerId === 'p1')!.reason).toBe('ropeFee');
    expect(payout.giving.p1).toBeUndefined();
  });

  it('ist einmal pro Session verfuegbar und danach weg', () => {
    const modes = { ...noModes(), rope: true };
    expect(ropeAvailable(modes, {}, 'p1')).toBe(true);

    const usage = consumeRopes({}, { p1: { rope: true }, p2: { plank: 2 } });
    expect(usage).toEqual({ p1: 1 });
    expect(ropeAvailable(modes, usage, 'p1')).toBe(false);
    expect(ropeAvailable(modes, usage, 'p2')).toBe(true);
  });

  it('ohne den Modus ist es nie verfuegbar', () => {
    expect(ropeAvailable(noModes(), {}, 'p1')).toBe(false);
  });

  it('rettet auch aus der Todeszone', () => {
    /* Drei Leute, zwei Balken: ohne Seil garantierter Crash fuer zwei von dreien. */
    const payout = resolvePayout(roundOf({ picks: ['rope', 1, 2], plankCount: 2, modes: { rope: true } }));

    expect(payout.deathZone).toBe(true);
    expect(payout.groups.every((g) => !g.collision)).toBe(true);
    expect(sipsOf(payout.drinkers, 'p1')).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Nebel                                                               */
/* ------------------------------------------------------------------ */

describe('Modus "Nebel"', () => {
  it('aendert die Abrechnung nicht — nur den Weg dorthin (FSM-Test)', () => {
    const withFog = resolvePayout(roundOf({ picks: [1, 1, 3], plankCount: 5, modes: { fog: true } }));
    const without = resolvePayout(roundOf({ picks: [1, 1, 3], plankCount: 5 }));

    expect(withFog.drinkers).toEqual(without.drinkers);
    expect(withFog.giving).toEqual(without.giving);
    expect(withFog.banner).toBe(without.banner);
  });
});

/* ------------------------------------------------------------------ */
/* Kombinationen (Audit A5 verlangt sie spielbar, A0 rechnerisch)      */
/* ------------------------------------------------------------------ */

describe('Modus-Kombinationen', () => {
  it('Fahne + Schwergewicht: der Fahnenfluechtige trinkt Gewicht x Personen x 2', () => {
    const payout = resolvePayout(
      roundOf({
        picks: [5, 5, 1],
        plankCount: 6,
        modes: { flags: true, weights: true },
        flags: { p1: 3 },
        weights: { p1: 2 },
      })
    );
    expect(sipsOf(payout.drinkers, 'p1')).toBe(8);
  });

  it('Morsch + Seil: der Seil-Nutzer kann den morschen Balken nicht erwischen', () => {
    const payout = resolvePayout(
      roundOf({ picks: ['rope', 1, 3], plankCount: 5, modes: { rotten: true, rope: true }, rottenPlank: 4 })
    );
    expect(payout.drinkers).toEqual([{ playerId: 'p1', sips: 1, reason: 'ropeFee' }]);
  });
});

describe('Robustheit', () => {
  it('behandelt den Morsch-Modus ohne gezogenen Balken als harmlos', () => {
    /* Kann passieren, wenn der Modus mitten in einer Session eingeschaltet wird. */
    const round = roundOf({ picks: [1, 2, 3], plankCount: 5, modes: { rotten: true } });
    expect(round.bridge.rottenPlank).toBeUndefined();
    expect(isRottenBreak(round, groupByPlank(round)[0]!)).toBe(false);
    expect(resolvePayout(round).drinkers).toEqual([]);
  });
});
