/**
 * Modi (GDD §3.7). Wichtigster Punkt: Die Maulwurf-Zuweisung laeuft ueber `crypto`
 * und ist gleichverteilt — wer sie vorhersagen kann, bricht das Spiel.
 */

import { describe, expect, it, vi } from 'vitest';
import { NIGHT_SHIFT_SILENCE_SEC } from '@/config/rules';
import {
  assignMole,
  forcedChoice,
  hasSworn,
  isMole,
  oathsEnabled,
  openingPhase,
  perjurerIds,
} from '@/core/modes';
import { makeIds, makeSettings, makeSetup } from './helpers';

describe('assignMole', () => {
  it('zieht niemanden, wenn der Modus aus ist', () => {
    expect(assignMole(makeIds(5), { mole: false })).toBeUndefined();
  });

  it('zieht einen der Spieler', () => {
    const ids = makeIds(5);
    for (let i = 0; i < 50; i++) {
      expect(ids).toContain(assignMole(ids, { mole: true }));
    }
  });

  it('kommt mit einer leeren Runde klar', () => {
    expect(assignMole([], { mole: true })).toBeUndefined();
  });

  it('nutzt crypto.getRandomValues, nicht Math.random', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    const mathSpy = vi.spyOn(Math, 'random');
    assignMole(makeIds(4), { mole: true });
    expect(spy).toHaveBeenCalled();
    expect(mathSpy).not.toHaveBeenCalled();
    spy.mockRestore();
    mathSpy.mockRestore();
  });

  it('ist ueber 40 000 Ziehungen gleichverteilt (< 1 Prozentpunkt Abweichung)', () => {
    const ids = makeIds(5);
    const counts = new Map(ids.map((id) => [id, 0]));
    const runs = 40_000;
    for (let i = 0; i < runs; i++) {
      const mole = assignMole(ids, { mole: true })!;
      counts.set(mole, counts.get(mole)! + 1);
    }
    for (const id of ids) {
      const share = (counts.get(id)! / runs) * 100;
      expect(Math.abs(share - 20)).toBeLessThan(1);
    }
  });
});

describe('isMole / forcedChoice', () => {
  it('zwingt nur den Maulwurf zu STEHLEN', () => {
    const setup = makeSetup({ vault: 8, steals: [false, false, false], moleId: 'p1' });
    expect(isMole('p1', setup)).toBe(true);
    expect(isMole('p0', setup)).toBe(false);
    expect(forcedChoice('p1', setup)).toBe('steal');
    expect(forcedChoice('p0', setup)).toBeUndefined();
  });

  it('zwingt niemanden ohne Maulwurf', () => {
    const setup = makeSetup({ vault: 8, steals: [false, false, false] });
    expect(forcedChoice('p0', setup)).toBeUndefined();
    expect(isMole('p0', setup)).toBe(false);
  });
});

describe('Eid', () => {
  const modes = { oath: true };

  it('findet, wer geschworen und gestohlen hat', () => {
    const setup = makeSetup({ vault: 8, steals: [true, true, false], oaths: ['p0', 'p2'] });
    expect(perjurerIds(setup, modes)).toEqual(['p0']);
  });

  it('nimmt den Maulwurf aus — Befehl ist Befehl', () => {
    const setup = makeSetup({
      vault: 8,
      steals: [true, true, false],
      oaths: ['p0', 'p1'],
      moleId: 'p1',
    });
    expect(perjurerIds(setup, modes)).toEqual(['p0']);
  });

  it('kennt ohne Modus keinen Meineid', () => {
    const setup = makeSetup({ vault: 8, steals: [true, false, false], oaths: ['p0'] });
    expect(perjurerIds(setup, { oath: false })).toEqual([]);
  });

  it('hasSworn / oathsEnabled', () => {
    const setup = makeSetup({ vault: 8, steals: [false, false, false], oaths: ['p2'] });
    expect(hasSworn('p2', setup)).toBe(true);
    expect(hasSworn('p0', setup)).toBe(false);
    expect(oathsEnabled({ oath: true })).toBe(true);
    expect(oathsEnabled({ oath: false })).toBe(false);
  });
});

describe('openingPhase', () => {
  it('ist normalerweise die Verhandlung mit der eingestellten Dauer', () => {
    expect(openingPhase(makeSettings({ negotiationSec: 60 }))).toEqual({
      kind: 'negotiation',
      seconds: 60,
    });
  });

  it('wird in der Nachtschicht zur Stille', () => {
    expect(openingPhase(makeSettings({ negotiationSec: 60 }, { nightShift: true }))).toEqual({
      kind: 'silence',
      seconds: NIGHT_SHIFT_SILENCE_SEC,
    });
  });
});
