/**
 * Regelkern (A0-Audit): inspect in allen Faellen, gateOrder, Rotation, Packen, Bestechung.
 */

import { describe, expect, it } from 'vitest';
import { MAX_AMOUNT } from '@/config/rules';
import { modeFlags } from '@/core/modes';
import {
  allPacked,
  amountOf,
  canInspect,
  createRound,
  finishRound,
  gateOrder,
  inspect,
  isLocked,
  offerBribe,
  officerIndexFor,
  openingsLeft,
  pack,
  resolveBribe,
  runGate,
  smugglerIds,
  startHall,
} from '@/core/round';
import { makePlayers, makeRound, rngFor } from './helpers';

describe('Beamten-Rotation (GDD §3.1)', () => {
  it('rotiert Runde fuer Runde durch alle Spieler', () => {
    const players = makePlayers(5);
    const officers = Array.from(
      { length: 12 },
      (_, index) => createRound({ index, players, modes: modeFlags() }, rngFor(index)).officerId
    );
    expect(officers.slice(0, 5)).toEqual(['p0', 'p1', 'p2', 'p3', 'p4']);
    /* Nach einem vollen Umlauf faengt es wieder vorne an. */
    expect(officers.slice(5, 10)).toEqual(['p0', 'p1', 'p2', 'p3', 'p4']);
  });

  it('kommt auch mit negativen Indizes klar', () => {
    expect(officerIndexFor(-1, 5)).toBe(4);
    expect(() => officerIndexFor(0, 0)).toThrow();
  });

  it('laesst den Beamten nicht mitreisen — er wird in PASS uebersprungen', () => {
    const round = createRound({ index: 2, players: makePlayers(6), modes: modeFlags() }, rngFor(3));
    expect(round.officerId).toBe('p2');
    expect(round.travelerIds).toEqual(['p0', 'p1', 'p3', 'p4', 'p5']);
    expect(round.travelerIds).not.toContain(round.officerId);
  });

  it('wirft ohne Spieler', () => {
    expect(() => createRound({ index: 0, players: [], modes: modeFlags() }, rngFor(1))).toThrow();
  });
});

describe('pack', () => {
  it('nimmt Mengen von 0 bis 6', () => {
    let round = createRound({ index: 0, players: makePlayers(5), modes: modeFlags() }, rngFor(1));
    for (const [i, id] of round.travelerIds.entries()) round = pack(round, id, i);
    expect(round.travelerIds.map((id) => amountOf(round, id))).toEqual([0, 1, 2, 3]);
    expect(allPacked(round)).toBe(true);
    expect(smugglerIds(round)).toEqual(['p2', 'p3', 'p4']);
  });

  it('weist den Beamten und unbekannte Spieler ab', () => {
    const round = makeRound({ amounts: [0, 0, 0, 0] });
    expect(() => pack(round, round.officerId, 1)).toThrow();
    expect(() => pack(round, 'niemand', 1)).toThrow();
  });

  it('weist ungueltige Mengen ab', () => {
    const round = makeRound({ amounts: [0, 0, 0, 0] });
    expect(() => pack(round, round.travelerIds[0]!, -1)).toThrow(RangeError);
    expect(() => pack(round, round.travelerIds[0]!, MAX_AMOUNT + 1)).toThrow(RangeError);
    expect(() => pack(round, round.travelerIds[0]!, 1.5)).toThrow(RangeError);
  });

  it('erlaubt in Hochsaison bis 10', () => {
    const round = makeRound({ amounts: [0, 0, 0, 0], modes: { highSeason: true } });
    expect(() => pack(round, round.travelerIds[0]!, 10)).not.toThrow();
    expect(() => pack(round, round.travelerIds[0]!, 11)).toThrow(RangeError);
  });

  it('meldet unvollstaendiges Packen', () => {
    let round = createRound({ index: 0, players: makePlayers(5), modes: modeFlags() }, rngFor(1));
    round = pack(round, round.travelerIds[0]!, 2);
    expect(allPacked(round)).toBe(false);
    expect(() => startHall(round, rngFor(1))).toThrow();
  });
});

describe('startHall', () => {
  it('zieht die Hinweise genau einmal', () => {
    const round = makeRound({ amounts: [3, 0, 0, 0], withHints: true });
    expect(round.hints.length).toBeGreaterThan(0);
    expect(() => startHall(round, rngFor(2))).toThrow();
  });

  it('legt im Spuerhund-Modus einen verlaesslichen Hinweis dazu', () => {
    const round = makeRound({ amounts: [0, 4, 0, 0], modes: { sniffer: true }, withHints: true });
    expect(round.dogHintOf).toBe(round.travelerIds[1]);
    expect(round.dogBarks).toBe(true);
  });

  it('legt ohne Spuerhund-Modus keinen an', () => {
    const round = makeRound({ amounts: [0, 4, 0, 0], withHints: true });
    expect(round.dogHintOf).toBeUndefined();
  });
});

describe('inspect', () => {
  it('erwischt einen Schmuggler: 2a Schluecke, a Tokens fuer den Beamten', () => {
    const round = makeRound({ amounts: [4, 0, 0, 0] });
    const { result } = inspect(round, round.travelerIds[0]!);

    expect(result.kind).toBe('caught');
    expect(result.amount).toBe(4);
    expect(result.drinkers).toEqual([{ playerId: round.travelerIds[0], sips: 8, reason: 'caught' }]);
    expect(result.tokensTo).toEqual({ playerId: round.officerId, tokens: 4 });
    expect(result.sequenceId).toBe('basic_caught');
  });

  it('sauberer Koffer: der Beamte trinkt 2 und bekommt nichts', () => {
    const round = makeRound({ amounts: [0, 0, 0, 0] });
    const { result } = inspect(round, round.travelerIds[0]!);

    expect(result.kind).toBe('clean');
    expect(result.amount).toBe(0);
    expect(result.drinkers).toEqual([{ playerId: round.officerId, sips: 2, reason: 'harassment' }]);
    expect(result.tokensTo).toBeUndefined();
  });

  it('Diplomat: der Beamte trinkt 3, der Diplomat behaelt seine Ware', () => {
    const round = makeRound({ amounts: [5, 0, 0, 0], modes: { diplomat: true } });
    const diplomatId = round.diplomatId!;
    const amount = amountOf(round, diplomatId);
    const { result } = inspect(round, diplomatId);

    expect(result.kind).toBe('diplomat');
    expect(result.drinkers).toEqual([{ playerId: round.officerId, sips: 3, reason: 'diplomat' }]);
    if (amount > 0) expect(result.tokensTo).toEqual({ playerId: diplomatId, tokens: amount });
    else expect(result.tokensTo).toBeUndefined();
  });

  it('wird der Diplomat nie als erwischt gewertet — auch mit vollem Koffer', () => {
    /* Seeds durchprobieren, bis der Diplomat wirklich Ware dabei hat. */
    for (let seed = 0; seed < 40; seed++) {
      const round = makeRound({ amounts: [6, 6, 6, 6], modes: { diplomat: true }, seed });
      const { result } = inspect(round, round.diplomatId!);
      expect(result.kind).toBe('diplomat');
      expect(result.amount).toBe(6);
    }
  });

  it('weist einen bereits geoeffneten Koffer ab', () => {
    const round = makeRound({ amounts: [2, 0, 0, 0, 0, 0] });
    const first = inspect(round, round.travelerIds[0]!).round;
    expect(() => inspect(first, round.travelerIds[0]!)).toThrow(/bereits geoeffnet/);
  });

  it('weist einen bezahlten Koffer ab', () => {
    let round = makeRound({ amounts: [2, 0, 0, 0], modes: { bribery: true } });
    round = offerBribe(round, round.travelerIds[0]!, 2);
    round = resolveBribe(round, round.travelerIds[0]!, true);

    expect(isLocked(round, round.travelerIds[0]!)).toBe(true);
    expect(canInspect(round, round.travelerIds[0]!)).toBe(false);
    expect(() => inspect(round, round.travelerIds[0]!)).toThrow(/gesperrt/);
  });

  it('weist Nicht-Reisende ab', () => {
    const round = makeRound({ amounts: [2, 0, 0, 0] });
    expect(() => inspect(round, round.officerId)).toThrow();
  });

  it('haelt das Oeffnungs-Limit ein', () => {
    /* 5 Spieler → k = 2. */
    let round = makeRound({ amounts: [1, 1, 1, 1], players: 5 });
    expect(round.maxOpenings).toBe(2);

    round = inspect(round, round.travelerIds[0]!).round;
    round = inspect(round, round.travelerIds[1]!).round;

    expect(openingsLeft(round)).toBe(0);
    expect(canInspect(round, round.travelerIds[2]!)).toBe(false);
    expect(() => inspect(round, round.travelerIds[2]!)).toThrow(/Keine Oeffnung/);
  });
});

describe('Bestechung (Modus)', () => {
  it('sperrt den Koffer, wenn der Beamte annimmt', () => {
    let round = makeRound({ amounts: [3, 0, 0, 0], modes: { bribery: true } });
    round = offerBribe(round, round.travelerIds[0]!, 3);
    expect(round.bribes[0]!.accepted).toBeNull();

    round = resolveBribe(round, round.travelerIds[0]!, true);
    expect(isLocked(round, round.travelerIds[0]!)).toBe(true);
  });

  it('laesst den Koffer offen, wenn der Beamte ablehnt', () => {
    let round = makeRound({ amounts: [3, 0, 0, 0], modes: { bribery: true } });
    round = offerBribe(round, round.travelerIds[0]!, 1);
    round = resolveBribe(round, round.travelerIds[0]!, false);

    expect(isLocked(round, round.travelerIds[0]!)).toBe(false);
    expect(canInspect(round, round.travelerIds[0]!)).toBe(true);
  });

  it('erlaubt auch sauberen Reisenden ein Angebot — wer besticht, wirkt schuldig', () => {
    let round = makeRound({ amounts: [0, 0, 0, 0], modes: { bribery: true } });
    round = offerBribe(round, round.travelerIds[0]!, 2);
    expect(round.bribes).toHaveLength(1);
  });

  it('erlaubt das Nachbessern eines offenen Angebots, nicht aber eines entschiedenen', () => {
    let round = makeRound({ amounts: [3, 0, 0, 0], modes: { bribery: true } });
    round = offerBribe(round, round.travelerIds[0]!, 1);
    round = offerBribe(round, round.travelerIds[0]!, 3);
    expect(round.bribes).toHaveLength(1);
    expect(round.bribes[0]!.amount).toBe(3);

    round = resolveBribe(round, round.travelerIds[0]!, false);
    expect(() => offerBribe(round, round.travelerIds[0]!, 2)).toThrow();
    expect(() => resolveBribe(round, round.travelerIds[0]!, true)).toThrow();
  });

  it('weist Angebote ausserhalb des Modus, von Fremden und mit falscher Hoehe ab', () => {
    const off = makeRound({ amounts: [3, 0, 0, 0] });
    expect(() => offerBribe(off, off.travelerIds[0]!, 2)).toThrow();

    const on = makeRound({ amounts: [3, 0, 0, 0], modes: { bribery: true } });
    expect(() => offerBribe(on, on.officerId, 2)).toThrow();
    expect(() => offerBribe(on, on.travelerIds[0]!, 5 as 1 | 2 | 3)).toThrow(RangeError);
    expect(() => resolveBribe(on, on.travelerIds[0]!, true)).toThrow(/Kein Angebot/);
  });
});

describe('gateOrder (ADR-4)', () => {
  it('schickt saubere Koffer zuerst und Schmuggler zuletzt', () => {
    for (let seed = 0; seed < 100; seed++) {
      const round = makeRound({ amounts: [3, 0, 5, 0, 1, 0, 2], seed });
      const order = gateOrder(round, rngFor(seed));

      const amounts = order.map((id) => amountOf(round, id));
      const firstSmuggler = amounts.findIndex((a) => a > 0);
      /* Ab dem ersten Schmuggler darf kein sauberer Koffer mehr kommen. */
      expect(amounts.slice(firstSmuggler).every((a) => a > 0)).toBe(true);
    }
  });

  it('laesst geoeffnete Koffer aus', () => {
    let round = makeRound({ amounts: [3, 0, 5, 0], players: 5 });
    round = inspect(round, round.travelerIds[0]!).round;

    const order = gateOrder(round, rngFor(9));
    expect(order).not.toContain(round.travelerIds[0]);
    expect(order).toHaveLength(3);
  });

  it('schickt einen nicht geoeffneten Diplomaten wie jeden anderen durch (ADR-7)', () => {
    const round = makeRound({ amounts: [4, 4, 4, 4], modes: { diplomat: true } });
    expect(gateOrder(round, rngFor(4))).toContain(round.diplomatId);
  });

  it('laesst bezahlte Koffer passieren — gesperrt heisst nicht unsichtbar', () => {
    let round = makeRound({ amounts: [6, 0, 0, 0], modes: { bribery: true } });
    round = offerBribe(round, round.travelerIds[0]!, 3);
    round = resolveBribe(round, round.travelerIds[0]!, true);

    const { gate } = runGate(round, undefined, rngFor(5));
    const entry = gate.find((g) => g.suitcaseOf === round.travelerIds[0]);
    expect(entry?.kind).toBe('smuggler');
    expect(entry?.tokensTo).toEqual({ playerId: round.travelerIds[0], tokens: 6 });
  });

  it('berechnet die Reihenfolge nur einmal', () => {
    const round = makeRound({ amounts: [3, 0, 5, 0] });
    const first = runGate(round, undefined, rngFor(1));
    const second = runGate(first.round, undefined, rngFor(999));
    expect(second.round.gateOrder).toEqual(first.round.gateOrder);
  });
});

describe('finishRound', () => {
  it('zaehlt Kontrolle, Schranke, Bestechung und Boni zusammen', () => {
    let round = makeRound({ amounts: [4, 0, 3, 0], players: 5, modes: { bribery: true } });
    const [a, b, c] = round.travelerIds as [string, string, string];

    round = offerBribe(round, b, 2);
    round = resolveBribe(round, b, true);
    round = inspect(round, a).round;

    const { round: gated, gate } = runGate(round, undefined, rngFor(3));
    const result = finishRound(gated, gate);

    /* Beamter: 4 aus dem Fang + 2 Bestechung. Schmuggler c: 3 durchgekommen. */
    expect(result.tokens[result.officerId]).toBe(6);
    expect(result.tokens[c]).toBe(3);
    expect(result.banner).toBe('gotThrough');
    expect(result.drinkers).toEqual([{ playerId: a, sips: 8, reason: 'caught' }]);
  });
});
