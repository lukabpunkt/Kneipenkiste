/**
 * Modi (A0-Audit): k je n, Spuerhund-Malus, Hochsaison, Mengengrenzen.
 */

import { describe, expect, it } from 'vitest';
import { MAX_AMOUNT, MAX_AMOUNT_HIGH_SEASON, baseOpenings } from '@/config/rules';
import { isValidAmount, maxAmount, maxOpenings, modeFlags } from '@/core/modes';

describe('k(n) (GDD §3.4)', () => {
  it('ist 1 bei 4, 2 bei 5–6 und 3 bei 7–8 Spielern', () => {
    expect(baseOpenings(4)).toBe(1);
    expect(baseOpenings(5)).toBe(2);
    expect(baseOpenings(6)).toBe(2);
    expect(baseOpenings(7)).toBe(3);
    expect(baseOpenings(8)).toBe(3);
  });
});

describe('maxOpenings', () => {
  it('entspricht ohne Modi genau k(n)', () => {
    for (let n = 4; n <= 8; n++) {
      expect(maxOpenings(n, modeFlags())).toBe(baseOpenings(n));
    }
  });

  it('kostet im Spuerhund-Modus eine Oeffnung — aber nie die letzte', () => {
    expect(maxOpenings(8, modeFlags({ sniffer: true }))).toBe(2);
    expect(maxOpenings(6, modeFlags({ sniffer: true }))).toBe(1);
    /* Bei 4 Spielern gibt es nur eine Oeffnung; die bleibt. */
    expect(maxOpenings(4, modeFlags({ sniffer: true }))).toBe(1);
  });

  it('gibt in Hochsaison eine Oeffnung dazu', () => {
    expect(maxOpenings(4, modeFlags({ highSeason: true }))).toBe(2);
    expect(maxOpenings(8, modeFlags({ highSeason: true }))).toBe(4);
  });

  it('hebt sich bei Spuerhund + Hochsaison auf', () => {
    for (let n = 5; n <= 8; n++) {
      expect(maxOpenings(n, modeFlags({ sniffer: true, highSeason: true }))).toBe(baseOpenings(n));
    }
  });

  it('oeffnet nie mehr Koffer, als es Reisende gibt', () => {
    expect(maxOpenings(4, modeFlags({ highSeason: true, sniffer: false }))).toBeLessThanOrEqual(3);
    /* Ein Zwei-Personen-Spiel gibt es nicht, aber die Grenze haelt trotzdem. */
    expect(maxOpenings(2, modeFlags({ highSeason: true }))).toBe(1);
  });
});

describe('Mengen', () => {
  it('geht normal bis 6 und in Hochsaison bis 10', () => {
    expect(maxAmount(modeFlags())).toBe(MAX_AMOUNT);
    expect(maxAmount(modeFlags({ highSeason: true }))).toBe(MAX_AMOUNT_HIGH_SEASON);
  });

  it('akzeptiert nur ganze Zahlen im erlaubten Bereich', () => {
    expect(isValidAmount(0, modeFlags())).toBe(true);
    expect(isValidAmount(6, modeFlags())).toBe(true);
    expect(isValidAmount(7, modeFlags())).toBe(false);
    expect(isValidAmount(7, modeFlags({ highSeason: true }))).toBe(true);
    expect(isValidAmount(-1, modeFlags())).toBe(false);
    expect(isValidAmount(2.5, modeFlags())).toBe(false);
    expect(isValidAmount(Number.NaN, modeFlags())).toBe(false);
  });
});
