import { describe, expect, it } from 'vitest';
import { simulate, simulateDefectCurve, simulateMatrix, simulateSession } from '@/core/simulate';
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

describe('Absprache und Wortbruch (Roadmap M6.2)', () => {
  it('haelt sich jeder an die Absprache, kracht es ausserhalb der Todeszone nie', () => {
    const report = simulate({
      playerCount: 6,
      rounds: 2000,
      seed: 42,
      strategy: 'negotiated',
      defectRate: 0,
    });

    /* Das ist die Probe auf das ganze Spiel: Die Absprache **kann** halten. */
    expect(report.collisionRate).toBe(0);
    expect(report.allSafeRate).toBe(1);
    expect(report.sipsPerRound).toBe(0);
  });

  it('kracht es in der Todeszone auch bei perfekter Absprache immer (ADR-2)', () => {
    const report = simulate({
      playerCount: 5,
      plankCount: 4,
      rounds: 500,
      seed: 43,
      strategy: 'negotiated',
      defectRate: 0,
    });

    expect(report.deathZone).toBe(true);
    expect(report.collisionRate).toBe(1);
  });

  it('steigt die Kollisionsrate monoton mit der Wortbruch-Quote', () => {
    const curve = simulateDefectCurve(6, 3000, 44, [0, 0.1, 0.2, 0.4]);
    const rates = curve.map((report) => report.collisionRate);

    for (let i = 1; i < rates.length; i += 1) {
      expect(rates[i]!, `Quote ${curve[i]!.defectRate}`).toBeGreaterThan(rates[i - 1]!);
    }
  });

  it('bleibt unter der Zufallswahl — Absprache hilft, auch wenn gelogen wird', () => {
    const random = simulate({ playerCount: 6, rounds: 3000, seed: 45 });
    const negotiated = simulate({
      playerCount: 6,
      rounds: 3000,
      seed: 45,
      strategy: 'negotiated',
      defectRate: 0.3,
    });

    expect(negotiated.collisionRate).toBeLessThan(random.collisionRate);
  });

  it('ist deterministisch ueber den Seed', () => {
    const options = { playerCount: 5, rounds: 300, seed: 46, strategy: 'negotiated' as const };
    expect(simulate(options)).toEqual(simulate(options));
  });
});

describe('Sitzung mit Schrumpfen und Reparatur (Audit A6)', () => {
  it('schrumpft eine friedliche Gruppe in die Todeszone', () => {
    /* Wer sich perfekt abspricht, nimmt der Bruecke jede Runde einen Balken (GDD §3.7). */
    const report = simulateSession({ playerCount: 5, rounds: 8, seed: 47, defectRate: 0 });

    expect(report.collisionRate).toBeGreaterThan(0);
    expect(report.roundsToDeathZone).toBe(4);
    expect(report.averagePlankCount).toBeLessThan(7);
  });

  it('haelt die Bruecke breit, solange es oft kracht', () => {
    const peaceful = simulateSession({ playerCount: 8, rounds: 8, seed: 48, defectRate: 0.02 });
    const chaotic = simulateSession({ playerCount: 8, rounds: 8, seed: 48, defectRate: 0.5 });

    /* Jede Kollision repariert auf `n + 2` — viel Krach heisst viele Balken. */
    expect(chaotic.averagePlankCount).toBeGreaterThan(peaceful.averagePlankCount);
    expect(chaotic.deathZoneRate).toBeLessThan(peaceful.deathZoneRate);
  });

  it('ist deterministisch und bleibt in gueltigen Grenzen', () => {
    const options = { playerCount: 6, rounds: 8, seed: 49, defectRate: 0.2 };
    expect(simulateSession(options)).toEqual(simulateSession(options));

    const report = simulateSession(options);
    expect(report.averagePlankCount).toBeGreaterThanOrEqual(5);
    expect(report.averagePlankCount).toBeLessThanOrEqual(8);
    expect(report.collisionRate).toBeGreaterThanOrEqual(0);
    expect(report.collisionRate).toBeLessThanOrEqual(1);
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
