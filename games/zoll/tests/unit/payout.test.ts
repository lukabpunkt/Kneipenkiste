/**
 * Auszahlung (A0-Audit): Trinkwerte, Tokens, Gate-Tokens, Bestechungs-Tokens,
 * beide Boni, alle fuenf Banner.
 */

import { describe, expect, it } from 'vitest';
import {
  bannerFor,
  biggestRun,
  bonusesFor,
  collectDrinkers,
  gatePayout,
  inspectPayout,
  sipsOf,
  tallyTokens,
} from '@/core/payout';
import type { GateResult, InspectResult, Opening } from '@/core/types';

function opening(kind: InspectResult['kind'], suitcaseOf: string, amount = 0): Opening {
  return {
    suitcaseOf,
    result: { suitcaseOf, kind, amount, drinkers: [], sequenceId: 'test' },
  };
}

describe('inspectPayout', () => {
  it('caught: Reisender trinkt 2a, Beamter bekommt a', () => {
    const payout = inspectPayout('caught', 'traveler', 'officer', 5);
    expect(payout.drinkers).toEqual([{ playerId: 'traveler', sips: 10, reason: 'caught' }]);
    expect(payout.tokensTo).toEqual({ playerId: 'officer', tokens: 5 });
  });

  it('clean: Beamter trinkt 2, niemand bekommt Tokens', () => {
    const payout = inspectPayout('clean', 'traveler', 'officer', 0);
    expect(payout.drinkers).toEqual([{ playerId: 'officer', sips: 2, reason: 'harassment' }]);
    expect(payout.tokensTo).toBeUndefined();
  });

  it('diplomat: Beamter trinkt 3, der Diplomat kommt mit seiner Ware durch', () => {
    const payout = inspectPayout('diplomat', 'traveler', 'officer', 3);
    expect(payout.drinkers).toEqual([{ playerId: 'officer', sips: 3, reason: 'diplomat' }]);
    expect(payout.tokensTo).toEqual({ playerId: 'traveler', tokens: 3 });
  });

  it('diplomat mit leerem Koffer verteilt nichts', () => {
    expect(inspectPayout('diplomat', 'traveler', 'officer', 0).tokensTo).toBeUndefined();
  });
});

describe('gatePayout', () => {
  it('gibt Schmugglern ein Token je Stueck', () => {
    expect(gatePayout('smuggler', 'traveler', 4)).toEqual({ playerId: 'traveler', tokens: 4 });
  });

  it('gibt sauberen Reisenden nichts', () => {
    expect(gatePayout('ok', 'traveler', 0)).toBeUndefined();
    expect(gatePayout('smuggler', 'traveler', 0)).toBeUndefined();
  });
});

describe('bonusesFor (ADR-3)', () => {
  it('gibt +2 fuer "alle erwischt"', () => {
    const bonuses = bonusesFor('officer', [opening('caught', 'a', 2), opening('caught', 'b', 1)], 2);
    expect(bonuses).toEqual([{ playerId: 'officer', tokens: 2, reason: 'allCaught' }]);
  });

  it('gibt nichts, wenn einer durchrutscht', () => {
    expect(bonusesFor('officer', [opening('caught', 'a', 2)], 2)).toEqual([]);
  });

  it('gibt +1 fuer richtiges Durchwinken einer ehrlichen Runde', () => {
    expect(bonusesFor('officer', [], 0)).toEqual([
      { playerId: 'officer', tokens: 1, reason: 'goodInstinct' },
    ]);
  });

  it('gibt nichts fuers Durchwinken, wenn doch jemand schmuggelte', () => {
    expect(bonusesFor('officer', [], 2)).toEqual([]);
  });

  it('gibt nichts, wenn bei einer ehrlichen Runde geoeffnet wurde', () => {
    expect(bonusesFor('officer', [opening('clean', 'a')], 0)).toEqual([]);
  });
});

describe('bannerFor (GDD §3.8)', () => {
  it('officerOfTheMonth: alle Schmuggler erwischt', () => {
    expect(bannerFor([opening('caught', 'a', 3)], 1)).toBe('officerOfTheMonth');
  });

  it('honestRound: niemand schmuggelte', () => {
    expect(bannerFor([], 0)).toBe('honestRound');
    expect(bannerFor([opening('clean', 'a')], 0)).toBe('honestRound');
  });

  it('harassment: es wurde geoeffnet, aber nur Unschuldige', () => {
    expect(bannerFor([opening('clean', 'a'), opening('clean', 'b')], 2)).toBe('harassment');
  });

  it('smugglerParadise: kein Fang bei mindestens zwei Schmugglern', () => {
    expect(bannerFor([], 2)).toBe('smugglerParadise');
  });

  it('gotThrough: teilweise erwischt', () => {
    expect(bannerFor([opening('caught', 'a', 2)], 3)).toBe('gotThrough');
    /* Ein einzelner durchgekommener Schmuggler ist kein Paradies. */
    expect(bannerFor([], 1)).toBe('gotThrough');
  });

  it('wertet eine Diplomaten-Oeffnung nicht als Belaestigung', () => {
    expect(bannerFor([opening('diplomat', 'a', 4)], 2)).toBe('smugglerParadise');
  });
});

describe('tallyTokens', () => {
  it('summiert Kontrolle, Schranke, Boni und angenommene Bestechungen', () => {
    const openings: Opening[] = [
      {
        suitcaseOf: 'a',
        result: {
          suitcaseOf: 'a',
          kind: 'caught',
          amount: 3,
          drinkers: [{ playerId: 'a', sips: 6, reason: 'caught' }],
          tokensTo: { playerId: 'officer', tokens: 3 },
          sequenceId: 'test',
        },
      },
    ];
    const gate: GateResult[] = [
      { suitcaseOf: 'b', kind: 'smuggler', amount: 2, tokensTo: { playerId: 'b', tokens: 2 }, sequenceId: 'test' },
      { suitcaseOf: 'c', kind: 'ok', amount: 0, sequenceId: 'test' },
    ];

    const tokens = tallyTokens({
      openings,
      gate,
      bonuses: [{ playerId: 'officer', tokens: 2, reason: 'allCaught' }],
      bribes: [
        { from: 'd', amount: 3, accepted: true },
        { from: 'e', amount: 2, accepted: false },
        { from: 'f', amount: 1, accepted: null },
      ],
      officerId: 'officer',
    });

    /* 3 Fang + 2 Bonus + 3 Bestechung; abgelehnte und offene Angebote zaehlen nicht. */
    expect(tokens).toEqual({ officer: 8, b: 2 });
    expect(tokens['c']).toBeUndefined();
  });
});

describe('Hilfsfunktionen', () => {
  it('sammelt Trinker in Reihenfolge und summiert je Spieler', () => {
    const openings: Opening[] = [
      {
        suitcaseOf: 'a',
        result: {
          suitcaseOf: 'a',
          kind: 'clean',
          amount: 0,
          drinkers: [{ playerId: 'officer', sips: 2, reason: 'harassment' }],
          sequenceId: 'test',
        },
      },
      {
        suitcaseOf: 'b',
        result: {
          suitcaseOf: 'b',
          kind: 'diplomat',
          amount: 1,
          drinkers: [{ playerId: 'officer', sips: 3, reason: 'diplomat' }],
          sequenceId: 'test',
        },
      },
    ];
    const drinkers = collectDrinkers(openings);
    expect(drinkers).toHaveLength(2);
    expect(sipsOf(drinkers, 'officer')).toBe(5);
    expect(sipsOf(drinkers, 'a')).toBe(0);
  });

  it('findet die groesste durchgekommene Menge', () => {
    const gate: GateResult[] = [
      { suitcaseOf: 'a', kind: 'smuggler', amount: 2, sequenceId: 'test' },
      { suitcaseOf: 'b', kind: 'smuggler', amount: 6, sequenceId: 'test' },
      { suitcaseOf: 'c', kind: 'ok', amount: 0, sequenceId: 'test' },
    ];
    expect(biggestRun(gate)?.suitcaseOf).toBe('b');
    expect(biggestRun([{ suitcaseOf: 'c', kind: 'ok', amount: 0, sequenceId: 'test' }])).toBeNull();
  });
});
