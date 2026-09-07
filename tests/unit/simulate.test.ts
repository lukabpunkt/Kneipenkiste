import { describe, expect, it } from 'vitest';
import { simulate, simulateMatrix } from '@/core/simulate';
import { isRopeChoice, plankOf } from '@/core/choice';

describe('simulate', () => {
  it('ist deterministisch ueber den Seed', () => {
    const a = simulate({ playerCount: 5, rounds: 500, seed: 2024 });
    const b = simulate({ playerCount: 5, rounds: 500, seed: 2024 });
    expect(a).toEqual(b);
  });

  it('bestaetigt das Schubfachprinzip: in der Todeszone kracht es immer', () => {
    const report = simulate({ playerCount: 5, plankCount: 4, rounds: 1000, seed: 7 });
    expect(report.deathZone).toBe(true);
    expect(report.collisionRate).toBe(1);
    expect(report.allSafeRate).toBe(0);
  });

  it('zeigt, dass mehr Balken den Druck senken', () => {
    const tight = simulate({ playerCount: 5, plankCount: 5, rounds: 4000, seed: 11 });
    const roomy = simulate({ playerCount: 5, plankCount: 7, rounds: 4000, seed: 11 });

    expect(tight.collisionRate).toBeGreaterThan(roomy.collisionRate);
    expect(roomy.allSafeRate).toBeGreaterThan(tight.allSafeRate);
  });

  it('haelt alle Raten in [0, 1] und zaehlt Schlucke', () => {
    const report = simulate({ playerCount: 6, rounds: 1000, seed: 3 });

    for (const rate of [report.collisionRate, report.massCollisionRate, report.allSafeRate]) {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    }
    expect(report.sipsPerRound).toBeGreaterThan(0);
    expect(report.plankCount).toBe(8);
  });

  it('ignoriert Balkenzahlen ueber der frischen Bruecke', () => {
    expect(simulate({ playerCount: 4, plankCount: 99, rounds: 10, seed: 1 }).plankCount).toBe(6);
  });

  it('liefert die Matrix fuer den Balancing-Pass', () => {
    const matrix = simulateMatrix(200, 5);
    /* 6 Spielerzahlen x 4 Balkenzahlen. */
    expect(matrix).toHaveLength(24);
    expect(matrix.filter((r) => r.deathZone)).toHaveLength(6);
    expect(matrix.every((r) => r.rounds === 200)).toBe(true);
  });
});

describe('choice-Helfer', () => {
  it('unterscheidet Balken und Seil', () => {
    expect(isRopeChoice({ rope: true })).toBe(true);
    expect(isRopeChoice({ plank: 3 })).toBe(false);
    expect(plankOf({ plank: 3 })).toBe(3);
    expect(plankOf({ rope: true })).toBeNull();
  });
});
