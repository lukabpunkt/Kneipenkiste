/**
 * Tresor-Oekonomie (GDD §3.2, ADR-2).
 */

import { describe, expect, it } from 'vitest';
import { HARDNESS_IDS, HIGHROLLER, hardnessSpec } from '@/config/rules';
import { grownVault, isJackpot, jackpotSips, maxVault, nextVault, vaultSpec } from '@/core/vault';
import { makeSettings } from './helpers';

describe('vaultSpec', () => {
  it('uebernimmt die GDD-Werte je Haerte', () => {
    expect(vaultSpec(makeSettings({ hardness: 'soft' }))).toEqual({
      startVault: 3,
      growth: 2,
      jackpotAt: 12,
      capped: true,
    });
    expect(vaultSpec(makeSettings({ hardness: 'normal' }))).toEqual({
      startVault: 4,
      growth: 2,
      jackpotAt: 16,
      capped: true,
    });
    expect(vaultSpec(makeSettings({ hardness: 'hard' }))).toEqual({
      startVault: 6,
      growth: 3,
      jackpotAt: 20,
      capped: true,
    });
  });

  it('Highroller ueberschreibt alles und hat keinen Deckel', () => {
    const spec = vaultSpec(makeSettings({ hardness: 'soft' }, { highroller: true }));
    expect(spec).toEqual({
      startVault: HIGHROLLER.startVault,
      growth: HIGHROLLER.growth,
      jackpotAt: HIGHROLLER.jackpotAt,
      capped: false,
    });
    expect(maxVault(spec)).toBe(Number.POSITIVE_INFINITY);
  });

  it('maxVault ist in der Klassik der Deckel', () => {
    expect(maxVault(vaultSpec(makeSettings({ hardness: 'normal' })))).toBe(16);
  });
});

describe('Wachstum und Reset', () => {
  for (const hardness of HARDNESS_IDS) {
    const spec = vaultSpec(makeSettings({ hardness }));
    const table = hardnessSpec(hardness);

    it(`${hardness}: waechst um ${table.growth} und stoppt bei ${table.cap}`, () => {
      expect(grownVault(table.startVault, spec)).toBe(table.startVault + table.growth);
      expect(grownVault(table.cap, spec)).toBe(table.cap);
      expect(grownVault(table.cap - 1, spec)).toBe(table.cap);
    });

    it(`${hardness}: jeder Dieb setzt auf V_0 zurueck`, () => {
      expect(nextVault(table.cap, { thieves: 1, jackpot: false }, spec)).toBe(table.startVault);
      expect(nextVault(table.cap, { thieves: 4, jackpot: false }, spec)).toBe(table.startVault);
    });

    it(`${hardness}: der Jackpot setzt ebenfalls zurueck`, () => {
      expect(nextVault(table.cap, { thieves: 0, jackpot: true }, spec)).toBe(table.startVault);
    });
  }
});

describe('isJackpot', () => {
  const spec = vaultSpec(makeSettings({ hardness: 'normal' }));

  it('erst am Deckel', () => {
    expect(isJackpot(15, spec)).toBe(false);
    expect(isJackpot(16, spec)).toBe(true);
    expect(isJackpot(17, spec)).toBe(true);
  });
});

describe('jackpotSips', () => {
  it('rundet auf — lieber ein Schluck zu viel als ein halber', () => {
    expect(jackpotSips(16, 4)).toBe(4);
    expect(jackpotSips(16, 5)).toBe(4);
    expect(jackpotSips(16, 3)).toBe(6);
    expect(jackpotSips(20, 8)).toBe(3);
  });

  it('braucht mindestens einen Spieler', () => {
    expect(() => jackpotSips(8, 0)).toThrow(/mindestens einen/);
  });
});
