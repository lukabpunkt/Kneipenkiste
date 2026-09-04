/**
 * Session: Rotation, Statistik, Persistenz (A0/A1-Audit).
 */

import { describe, expect, it } from 'vitest';
import {
  applyRound,
  bestNose,
  boldestSmuggler,
  clearSession,
  emptySession,
  emptyStats,
  hitRate,
  loadSession,
  officerFor,
  pushHistory,
  saveSession,
  type StatsMap,
} from '@/core/session';
import { finishRound, inspect, runGate } from '@/core/round';
import { makePlayers, makeRound, rngFor } from './helpers';

function playedRound(amounts: number[], openIndexes: number[] = []) {
  let round = makeRound({ amounts, players: amounts.length + 1, withHints: true });
  for (const i of openIndexes) round = inspect(round, round.travelerIds[i]!).round;
  const { round: gated, gate } = runGate(round, undefined, rngFor(11));
  return finishRound(gated, gate);
}

describe('officerFor', () => {
  it('folgt der Rotation aus dem GDD', () => {
    const players = makePlayers(4);
    expect(officerFor(players, 0).id).toBe('p0');
    expect(officerFor(players, 3).id).toBe('p3');
    expect(officerFor(players, 4).id).toBe('p0');
  });
});

describe('applyRound', () => {
  it('zaehlt Treffer, Belaestigungen und Schluecke des Beamten', () => {
    /* 5 Spieler → k = 2: ein Fang, eine Belaestigung. */
    const result = playedRound([4, 0, 0, 0], [0, 1]);
    const stats = applyRound({}, result);
    const officer = stats[result.officerId]!;

    expect(officer.roundsAsOfficer).toBe(1);
    expect(officer.openings).toBe(2);
    expect(officer.hits).toBe(1);
    expect(officer.harassed).toBe(1);
    expect(officer.sipsDrunk).toBe(2);
    expect(hitRate(officer)).toBe(0.5);
  });

  it('zaehlt Erwischte mit Menge und Schluecken', () => {
    const result = playedRound([5, 0, 0, 0], [0]);
    const stats = applyRound({}, result);
    const caught = stats[result.travelerIds[0]!]!;

    expect(caught.caughtCount).toBe(1);
    expect(caught.caughtAmount).toBe(5);
    expect(caught.sipsDrunk).toBe(10);
    expect(caught.smuggledThrough).toBe(0);
  });

  it('zaehlt durchgekommene Ware an der Schranke', () => {
    const result = playedRound([3, 6, 0, 0], []);
    const stats = applyRound({}, result);

    expect(stats[result.travelerIds[0]!]!.smuggledThrough).toBe(3);
    expect(stats[result.travelerIds[1]!]!.smuggledThrough).toBe(6);
    expect(stats[result.travelerIds[1]!]!.boldestRun).toBe(6);
  });

  it('schreibt die Ware des geoeffneten Diplomaten dem Diplomaten gut', () => {
    let round = makeRound({ amounts: [4, 4, 4, 4], modes: { diplomat: true }, withHints: true });
    const diplomatId = round.diplomatId!;
    round = inspect(round, diplomatId).round;
    const { round: gated, gate } = runGate(round, undefined, rngFor(3));
    const stats = applyRound({}, finishRound(gated, gate));

    expect(stats[diplomatId]!.smuggledThrough).toBe(4);
    expect(stats[diplomatId]!.caughtCount).toBe(0);
    expect(stats[gated.officerId]!.hits).toBe(0);
    expect(stats[gated.officerId]!.harassed).toBe(0);
    expect(stats[gated.officerId]!.sipsDrunk).toBe(3);
  });

  it('summiert ueber mehrere Runden, ohne die alte Map zu veraendern', () => {
    const first = applyRound({}, playedRound([2, 0, 0, 0], [0]));
    const snapshot = JSON.parse(JSON.stringify(first)) as StatsMap;
    const second = applyRound(first, playedRound([3, 0, 0, 0], [0]));

    expect(first).toEqual(snapshot);
    expect(second[Object.keys(second)[0]!]).toBeDefined();
  });
});

describe('Highlights', () => {
  it('findet den dreistesten Schmuggler und den besten Riecher', () => {
    const stats: StatsMap = {
      a: { ...emptyStats(), boldestRun: 4 },
      b: { ...emptyStats(), boldestRun: 6 },
      c: { ...emptyStats(), openings: 4, hits: 3 },
      d: { ...emptyStats(), openings: 2, hits: 1 },
    };

    expect(boldestSmuggler(stats)).toEqual({ playerId: 'b', value: 6 });
    expect(bestNose(stats)).toEqual({ playerId: 'c', value: 0.75 });
  });

  it('gibt null zurueck, solange niemand geschmuggelt oder geoeffnet hat', () => {
    expect(boldestSmuggler({ a: emptyStats() })).toBeNull();
    expect(bestNose({ a: emptyStats() })).toBeNull();
    expect(hitRate(emptyStats())).toBeNull();
  });
});

describe('Persistenz', () => {
  function memoryStorage() {
    const map = new Map<string, string>();
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
      removeItem: (key: string) => void map.delete(key),
    };
  }

  it('speichert und laedt einen Snapshot', () => {
    const store = memoryStorage();
    const snapshot = pushHistory(emptySession(makePlayers(4)), 'harassment');

    saveSession(snapshot, store);
    expect(loadSession(store)).toEqual(snapshot);

    clearSession(store);
    expect(loadSession(store)).toBeNull();
  });

  it('kappt die History bei 50 Runden', () => {
    let snapshot = emptySession();
    for (let i = 0; i < 60; i++) snapshot = pushHistory(snapshot, 'honestRound');
    expect(snapshot.history).toHaveLength(50);
  });

  it('verwirft kaputte oder fremde Daten', () => {
    const store = memoryStorage();
    store.setItem('zoll.session.v1', 'kein JSON');
    expect(loadSession(store)).toBeNull();

    store.setItem('zoll.session.v1', JSON.stringify({ version: 99, players: [] }));
    expect(loadSession(store)).toBeNull();

    store.setItem('zoll.session.v1', JSON.stringify({ version: 1, players: 'kaputt' }));
    expect(loadSession(store)).toBeNull();
  });

  it('faellt auf Defaults zurueck, wenn Felder fehlen', () => {
    const store = memoryStorage();
    store.setItem('zoll.session.v1', JSON.stringify({ version: 1, players: [] }));
    expect(loadSession(store)).toEqual({ version: 1, players: [], roundIndex: 0, stats: {}, history: [] });
  });

  it('benutzt ohne Argument den localStorage des Browsers', () => {
    const snapshot = emptySession(makePlayers(4));
    saveSession(snapshot);
    expect(loadSession()).toEqual(snapshot);
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it('laeuft ohne Storage einfach weiter', () => {
    expect(() => saveSession(emptySession(), null)).not.toThrow();
    expect(loadSession(null)).toBeNull();
    expect(() => clearSession(null)).not.toThrow();
  });

  it('ueberlebt einen Storage, der wirft (Safari, privater Modus)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('nope');
      },
      setItem: () => {
        throw new Error('nope');
      },
      removeItem: () => {
        throw new Error('nope');
      },
    };
    expect(() => saveSession(emptySession(), throwing)).not.toThrow();
    expect(loadSession(throwing)).toBeNull();
    expect(() => clearSession(throwing)).not.toThrow();
  });
});
