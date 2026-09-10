import { describe, expect, it } from 'vitest';
import { groupByPlank, resolvePayout, ropeUsersOf } from '@/core/payout';
import { GIVING_SAFE, GIVING_SAFE_DEATH_ZONE } from '@/config/rules';
import { allAssignments, bridgeOf, playerIds, roundOf, sipsOf } from './helpers';

/* ------------------------------------------------------------------ */
/* Die Beispiele aus dem GDD §3.5 — woertlich                          */
/* ------------------------------------------------------------------ */

describe('GDD §3.5, die drei Beispiele (n = 5, B = 7)', () => {
  it('alle auf verschiedenen Balken: niemand trinkt, die Bruecke schrumpft', () => {
    const payout = resolvePayout(roundOf({ picks: [1, 2, 3, 4, 5], plankCount: 7 }));

    expect(payout.outcome).toBe('allSafe');
    expect(payout.banner).toBe('allSafe');
    expect(payout.drinkers).toEqual([]);
    /* "Niemand trinkt, niemand verteilt." */
    expect(payout.giving).toEqual({});
  });

  it('Anna und Marc beide auf 3: die beiden trinken je 2, die anderen drei verteilen je 1', () => {
    const payout = resolvePayout(roundOf({ picks: [3, 3, 1, 2, 4], plankCount: 7 }));

    expect(payout.outcome).toBe('collision');
    expect(payout.banner).toBe('crash');
    expect(sipsOf(payout.drinkers, 'p1')).toBe(2);
    expect(sipsOf(payout.drinkers, 'p2')).toBe(2);
    expect(payout.giving).toEqual({ p3: 1, p4: 1, p5: 1 });
  });

  it('drei Leute auf 5: die drei trinken je 3, die zwei verteilen je 1', () => {
    const payout = resolvePayout(roundOf({ picks: [5, 5, 5, 1, 2], plankCount: 7 }));

    expect(sipsOf(payout.drinkers, 'p1')).toBe(3);
    expect(sipsOf(payout.drinkers, 'p2')).toBe(3);
    expect(sipsOf(payout.drinkers, 'p3')).toBe(3);
    expect(payout.giving).toEqual({ p4: 1, p5: 1 });
    /* Drei auf einem Balken ist kein Krach mehr, das ist ein Massensturz. */
    expect(payout.outcome).toBe('massCollision');
    expect(payout.banner).toBe('massCollision');
  });
});

/* ------------------------------------------------------------------ */
/* Gruppierung                                                         */
/* ------------------------------------------------------------------ */

describe('groupByPlank', () => {
  it('sortiert nach Balken und haelt die Spieler in Lobby-Reihenfolge', () => {
    const groups = groupByPlank(roundOf({ picks: [5, 2, 5, 2, 1], plankCount: 7 }));

    expect(groups.map((g) => g.plank)).toEqual([1, 2, 5]);
    expect(groups[1]!.players).toEqual(['p2', 'p4']);
    expect(groups[2]!.players).toEqual(['p1', 'p3']);
  });

  it('laesst Seil-Nutzer weg — sie stehen auf keinem Balken', () => {
    const round = roundOf({ picks: [1, 'rope', 3], modes: { rope: true } });
    expect(groupByPlank(round).map((g) => g.plank)).toEqual([1, 3]);
    expect(ropeUsersOf(round)).toEqual(['p2']);
  });
});

/* ------------------------------------------------------------------ */
/* Erschoepfende Matrix: n = 3…5, jede Verteilung auf jede Balkenzahl  */
/* ------------------------------------------------------------------ */

describe('Partitionen-Matrix (DoD M0.5)', () => {
  for (let n = 3; n <= 5; n += 1) {
    for (let b = n - 1; b <= n + 2; b += 1) {
      it(`n = ${n}, B = ${b}: jede der ${b ** n} Verteilungen rechnet konsistent ab`, () => {
        const ids = playerIds(n);

        for (const picks of allAssignments(n, b)) {
          const payout = resolvePayout(roundOf({ picks, plankCount: b }));

          const onCollision = new Set<string>();
          const alone = new Set<string>();
          for (const group of payout.groups) {
            for (const id of group.players) (group.collision ? onCollision : alone).add(id);
          }
          /* Verteilt wird nur, wenn wirklich jemand gefallen ist (GDD §3.5). */
          const anyCollision = onCollision.size > 0;

          /* Jeder steht auf genau einem Balken. */
          expect(onCollision.size + alone.size).toBe(n);

          for (const id of ids) {
            const drunk = sipsOf(payout.drinkers, id);
            const given = payout.giving[id] ?? 0;

            if (onCollision.has(id)) {
              const group = payout.groups.find((g) => g.players.includes(id))!;
              expect(drunk).toBe(group.players.length);
              expect(given).toBe(0);
            } else {
              expect(drunk).toBe(0);
              const perGiver = payout.deathZone ? GIVING_SAFE_DEATH_ZONE : GIVING_SAFE;
              expect(given).toBe(anyCollision ? perGiver : 0);
            }
          }

          /* Todeszone heisst Todeszone — unabhaengig davon, wie gewaehlt wurde. */
          expect(payout.deathZone).toBe(b < n);
        }
      });
    }
  }
});

describe('Stichproben n = 6…8', () => {
  const samples: { n: number; b: number; picks: number[]; drinks: Record<string, number>; gives: string[] }[] = [
    /* Friedlich = folgenlos: keine Trinker, aber eben auch nichts zu verteilen. */
    { n: 6, b: 8, picks: [1, 2, 3, 4, 5, 6], drinks: {}, gives: [] },
    { n: 6, b: 8, picks: [1, 1, 3, 3, 5, 6], drinks: { p1: 2, p2: 2, p3: 2, p4: 2 }, gives: ['p5', 'p6'] },
    { n: 7, b: 9, picks: [4, 4, 4, 4, 1, 2, 3], drinks: { p1: 4, p2: 4, p3: 4, p4: 4 }, gives: ['p5', 'p6', 'p7'] },
    { n: 8, b: 10, picks: [1, 2, 3, 4, 5, 6, 7, 7], drinks: { p7: 2, p8: 2 }, gives: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] },
    { n: 8, b: 7, picks: [1, 1, 2, 3, 4, 5, 6, 7], drinks: { p1: 2, p2: 2 }, gives: ['p3', 'p4', 'p5', 'p6', 'p7', 'p8'] },
  ];

  for (const sample of samples) {
    it(`n = ${sample.n}, B = ${sample.b}, Wahl ${sample.picks.join('/')}`, () => {
      const payout = resolvePayout(roundOf({ picks: sample.picks, plankCount: sample.b }));

      for (const id of playerIds(sample.n)) {
        expect(sipsOf(payout.drinkers, id)).toBe(sample.drinks[id] ?? 0);
      }
      const perGiver = payout.deathZone ? GIVING_SAFE_DEATH_ZONE : GIVING_SAFE;
      expect(payout.giving).toEqual(Object.fromEntries(sample.gives.map((id) => [id, perGiver])));
    });
  }
});

/* ------------------------------------------------------------------ */
/* Todeszone                                                           */
/* ------------------------------------------------------------------ */

describe('Todeszone (ADR-2)', () => {
  it('Schubfachprinzip: bei B < n gibt es in JEDER Verteilung eine Kollision', () => {
    for (let n = 3; n <= 6; n += 1) {
      const b = n - 1;
      for (const picks of allAssignments(n, b)) {
        const payout = resolvePayout(roundOf({ picks, plankCount: b }));
        expect(payout.groups.some((g) => g.collision)).toBe(true);
        expect(payout.outcome).toBe('deathZone');
        expect(payout.banner).toBe('deathZone');
        /* "allSafe" ist hier mathematisch unmoeglich (Architektur §5). */
        expect(payout.outcome).not.toBe('allSafe');
      }
    }
  });

  it('sicher Stehende verteilen 2 statt 1', () => {
    const payout = resolvePayout(roundOf({ picks: [1, 1, 2, 3], plankCount: 3 }));
    expect(payout.deathZone).toBe(true);
    expect(payout.giving).toEqual({ p3: 2, p4: 2 });
  });
});

/* ------------------------------------------------------------------ */
/* Banner (GDD §3.7)                                                   */
/* ------------------------------------------------------------------ */

describe('Banner-Logik, alle sechs Faelle', () => {
  it('"Alle drüben"', () => {
    expect(resolvePayout(roundOf({ picks: [1, 2, 3], plankCount: 5 })).banner).toBe('allSafe');
  });

  it('"Es kracht"', () => {
    expect(resolvePayout(roundOf({ picks: [1, 1, 3], plankCount: 5 })).banner).toBe('crash');
  });

  it('"Massensturz" bei zwei Kollisionsgruppen', () => {
    expect(resolvePayout(roundOf({ picks: [1, 1, 3, 3], plankCount: 6 })).banner).toBe('massCollision');
  });

  it('"Massensturz" bei drei auf einem Balken', () => {
    expect(resolvePayout(roundOf({ picks: [1, 1, 1, 4], plankCount: 6 })).banner).toBe('massCollision');
  });

  it('"Todeszone" schlaegt alles', () => {
    const payout = resolvePayout(
      roundOf({ picks: [1, 1, 1, 2], plankCount: 3, modes: { flags: true }, flags: { p1: 3 } })
    );
    expect(payout.banner).toBe('deathZone');
  });

  it('"Fahnenflucht!" — auch wenn der Verraeter trocken bleibt', () => {
    const payout = resolvePayout(
      roundOf({ picks: [5, 2, 3], plankCount: 5, modes: { flags: true }, flags: { p1: 3 } })
    );
    expect(payout.deserters).toEqual(['p1']);
    expect(payout.banner).toBe('desertion');
    /* Die Regel bleibt aber die Regel: Ohne Kollision schrumpft die Bruecke. */
    expect(payout.outcome).toBe('allSafe');
  });

  it('"Pech" beim morschen Balken', () => {
    const payout = resolvePayout(
      roundOf({ picks: [1, 2, 3], plankCount: 5, modes: { rotten: true }, rottenPlank: 2 })
    );
    expect(payout.banner).toBe('badLuck');
    expect(payout.outcome).toBe('collision');
  });
});

/* ------------------------------------------------------------------ */
/* Leere Bruecke, Randfaelle                                           */
/* ------------------------------------------------------------------ */

describe('Randfaelle', () => {
  it('eine Runde, in der alle das Seil nehmen, hat keine Gruppen', () => {
    const payout = resolvePayout(roundOf({ picks: ['rope', 'rope', 'rope'], modes: { rope: true } }));

    expect(payout.groups).toEqual([]);
    expect(payout.ropeUsers).toEqual(['p1', 'p2', 'p3']);
    expect(payout.outcome).toBe('allSafe');
    expect(payout.giving).toEqual({});
    /* Die Gebuehr faellt trotzdem an. */
    expect(payout.drinkers.map((d) => d.sips)).toEqual([1, 1, 1]);
  });

  it('ignoriert Spieler ohne Wahl (abgebrochene Runde)', () => {
    const round = roundOf({ picks: [1, 2, 3], plankCount: 5 });
    delete round.choices.p2;
    const payout = resolvePayout(round);

    expect(payout.groups.map((g) => g.plank)).toEqual([1, 3]);
    expect(bridgeOf(5).count).toBe(5);
  });
});
