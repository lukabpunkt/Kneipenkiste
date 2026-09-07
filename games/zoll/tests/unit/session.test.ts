/**
 * Session: Rotation, Statistik, Persistenz (A0/A1-Audit).
 */

import { describe, expect, it } from 'vitest';
import {
  applyRound,
  createSessionController,
  defaultPlayers,
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
    expect(loadSession(store)).toEqual(emptySession());
  });

  it('ergaenzt neue Settings-Felder in einer aelteren Session', () => {
    const store = memoryStorage();
    store.setItem(
      'zoll.session.v1',
      JSON.stringify({ version: 1, players: [], settings: { sound: false, modes: { sniffer: true } } })
    );
    const loaded = loadSession(store)!;

    /* Was gespeichert war, bleibt … */
    expect(loaded.settings.sound).toBe(false);
    expect(loaded.settings.modes.sniffer).toBe(true);
    /* … alles andere kommt aus den Defaults, statt `undefined` zu sein. */
    expect(loaded.settings.interrogationSec).toBe(45);
    expect(loaded.settings.modes.bribery).toBe(false);
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

describe('SessionController', () => {
  function memoryStorage() {
    const map = new Map<string, string>();
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
      removeItem: (key: string) => void map.delete(key),
    };
  }

  function controller(count = 5) {
    return createSessionController(emptySession(defaultPlayers(count)), memoryStorage());
  }

  it('legt fuenf Spieler mit eigenen Farben an', () => {
    const session = controller();
    expect(session.players()).toHaveLength(5);
    expect(new Set(session.players().map((p) => p.colorId)).size).toBe(5);
    expect(session.nameOf('p1')).toBe('Rudi');
    /* Unbekannte IDs geben die ID zurueck, statt `undefined` in die UI zu lassen. */
    expect(session.nameOf('gibt-es-nicht')).toBe('gibt-es-nicht');
  });

  it('haelt die Spielerzahl zwischen 4 und 8', () => {
    const session = controller(4);
    expect(session.canRemovePlayer()).toBe(false);
    session.removePlayer('p1');
    expect(session.players()).toHaveLength(4);

    for (let i = 0; i < 6; i++) session.addPlayer();
    expect(session.players()).toHaveLength(8);
    expect(session.canAddPlayer()).toBe(false);
    expect(session.addPlayer()).toBeNull();
  });

  it('gibt jedem neuen Spieler eine freie Farbe', () => {
    const session = controller(4);
    session.addPlayer();
    session.addPlayer();
    expect(new Set(session.players().map((p) => p.colorId)).size).toBe(session.players().length);
  });

  it('vergibt IDs, die es noch nicht gibt', () => {
    const session = controller(5);
    session.removePlayer('p2');
    const added = session.addPlayer()!;
    expect(session.players().filter((p) => p.id === added.id)).toHaveLength(1);
  });

  it('benennt um und kappt zu lange Namen', () => {
    const session = controller();
    session.renamePlayer('p1', '  Kommissar Rex mit Anhang  ');
    expect(session.nameOf('p1')).toBe('Kommissar Re');

    session.renamePlayer('p1', '   ');
    expect(session.nameOf('p1')).toBe('Kommissar Re');
  });

  it('schaltet nur auf Farben um, die frei sind', () => {
    const session = controller(4);
    const before = session.colorOf('p1');
    session.cycleColor('p1');

    expect(session.colorOf('p1')).not.toBe(before);
    expect(new Set(session.players().map((p) => p.colorId)).size).toBe(4);

    /* Unbekannte Spieler aendern nichts. */
    const snapshot = session.players();
    session.cycleColor('niemand');
    expect(session.players()).toEqual(snapshot);
  });

  it('laesst die Farbe stehen, wenn alle anderen belegt sind', () => {
    const session = controller(8);
    const before = session.colorOf('p1');
    session.cycleColor('p1');
    expect(session.colorOf('p1')).toBe(before);
  });

  it('speichert Settings und Modi getrennt', () => {
    const session = controller();
    session.setSettings({ interrogationSec: 90 });
    session.setModes({ diplomat: true });

    expect(session.settings().interrogationSec).toBe(90);
    expect(session.settings().modes.diplomat).toBe(true);
    expect(session.settings().modes.bribery).toBe(false);
  });

  it('rotiert den Beamten ueber die Runden', () => {
    const session = controller(4);
    expect(session.nextOfficer()!.id).toBe('p1');

    session.recordRound(playedRound([0, 0, 0], []));
    expect(session.get().roundIndex).toBe(1);
    expect(session.nextOfficer()!.id).toBe('p2');
  });

  it('schreibt Statistik und History fort und setzt sie zurueck', () => {
    const session = controller(5);
    session.recordRound(playedRound([4, 0, 0, 0], [0]));

    expect(session.get().history).toEqual(['officerOfTheMonth']);
    expect(Object.keys(session.get().stats).length).toBeGreaterThan(0);

    session.resetProgress();
    expect(session.get().stats).toEqual({});
    expect(session.get().roundIndex).toBe(0);
    expect(session.players()).toHaveLength(5);
  });

  it('ueberlebt einen Neustart der App', () => {
    const store = memoryStorage();
    const first = createSessionController(emptySession(defaultPlayers(6)), store);
    first.renamePlayer('p1', 'Waldi');
    first.setModes({ sniffer: true });

    const second = createSessionController(loadSession(store)!, store);
    expect(second.nameOf('p1')).toBe('Waldi');
    expect(second.settings().modes.sniffer).toBe(true);
  });

  it('kommt ohne Argumente aus', () => {
    const session = createSessionController();
    expect(session.players()).toHaveLength(5);
    expect(session.store.get().version).toBe(1);
  });
});

describe('Statistik ueber fuenf Runden (Audit A1)', () => {
  /**
   * Fuenf gespielte Runden mit bekannten Ausgaengen, danach muss jede Zahl im
   * Statistik-Sheet stimmen. Die Erwartungen sind von Hand nachgerechnet — sonst prueft
   * der Test nur, dass der Code tut, was der Code tut.
   *
   * Der Beamte rotiert: Runde 1 → p0, Runde 2 → p1, … Die Reisenden sind jeweils die
   * uebrigen vier in Spielerreihenfolge, und `open` sind Indizes in `travelerIds`.
   */
  const ROUNDS = [
    /* 1 · Beamter p0 · Reisende p1..p4 = 4/0/0/0 · oeffnet p1  → Fang ueber 4       */
    { amounts: [4, 0, 0, 0], open: [0] },
    /* 2 · Beamter p1 · Reisende p0,p2,p3,p4 = 0/3/0/0 · oeffnet p0 → Belaestigung   */
    { amounts: [0, 3, 0, 0], open: [0] },
    /* 3 · Beamter p2 · Reisende p0,p1,p3,p4 = 6/0/2/0 · winkt durch                 */
    { amounts: [6, 0, 2, 0], open: [] },
    /* 4 · Beamter p3 · Reisende p0,p1,p2,p4 = 1/1/0/0 · faengt beide                */
    { amounts: [1, 1, 0, 0], open: [0, 1] },
    /* 5 · Beamter p4 · Reisende p0,p1,p2,p3 = 0/0/0/5 · faengt p3 mit 5             */
    { amounts: [0, 0, 0, 5], open: [3] },
  ];

  function playFive() {
    const map = new Map<string, string>();
    const store = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
    const session = createSessionController(emptySession(makePlayers(5)), store);

    ROUNDS.forEach((spec, index) => {
      let round = makeRound({
        amounts: spec.amounts,
        players: 5,
        index,
        seed: 900 + index,
        withHints: true,
      });
      for (const i of spec.open) round = inspect(round, round.travelerIds[i]!).round;
      const { round: gated, gate } = runGate(round, undefined, rngFor(index));
      session.recordRound(finishRound(gated, gate));
    });

    return session;
  }

  it('zaehlt Runden und History mit', () => {
    const session = playFive();
    expect(session.get().roundIndex).toBe(5);
    expect(session.get().history).toHaveLength(5);
  });

  it('zaehlt fuer jeden Spieler die Beamten-Bilanz richtig', () => {
    const stats = playFive().get().stats;

    /* p0: eine Runde Beamter, eine Oeffnung, ein Treffer. */
    expect(stats['p0']!.roundsAsOfficer).toBe(1);
    expect(stats['p0']!.openings).toBe(1);
    expect(stats['p0']!.hits).toBe(1);
    expect(hitRate(stats['p0']!)).toBe(1);

    /* p1 griff daneben: eine Oeffnung, kein Treffer, eine Belaestigung. */
    expect(stats['p1']!.openings).toBe(1);
    expect(stats['p1']!.hits).toBe(0);
    expect(stats['p1']!.harassed).toBe(1);
    expect(hitRate(stats['p1']!)).toBe(0);

    /* p2 winkte durch — ohne Oeffnung gibt es keine Quote, auch keine schlechte. */
    expect(stats['p2']!.openings).toBe(0);
    expect(hitRate(stats['p2']!)).toBeNull();

    /* p3 erwischte beide Schmuggler seiner Runde. */
    expect(stats['p3']!.openings).toBe(2);
    expect(stats['p3']!.hits).toBe(2);
  });

  it('zaehlt durchgekommene und erwischte Ware richtig', () => {
    const stats = playFive().get().stats;

    /* p0 brachte 6 durch (Runde 3) und wurde mit 1 erwischt (Runde 4). */
    expect(stats['p0']!.smuggledThrough).toBe(6);
    expect(stats['p0']!.boldestRun).toBe(6);
    expect(stats['p0']!.caughtAmount).toBe(1);
    expect(stats['p0']!.caughtCount).toBe(1);

    /* p1 wurde zweimal erwischt: 4 und 1. */
    expect(stats['p1']!.caughtAmount).toBe(5);
    expect(stats['p1']!.caughtCount).toBe(2);
    expect(stats['p1']!.smuggledThrough).toBe(0);

    /* p2 kam mit 3 durch, weil in Runde 2 nur der falsche Koffer geoeffnet wurde. */
    expect(stats['p2']!.smuggledThrough).toBe(3);

    /* p3 brachte 2 durch und wurde mit 5 erwischt. */
    expect(stats['p3']!.smuggledThrough).toBe(2);
    expect(stats['p3']!.caughtAmount).toBe(5);

    /* p4 hat nie geschmuggelt. */
    expect(stats['p4']!.smuggledThrough).toBe(0);
    expect(stats['p4']!.caughtCount).toBe(0);
  });

  it('zaehlt die Schluecke jedes Spielers richtig', () => {
    const stats = playFive().get().stats;

    /* p1: 8 (Fang ueber 4) + 2 als belaestigender Beamter + 2 (Fang ueber 1). */
    expect(stats['p1']!.sipsDrunk).toBe(12);
    /* p0: nur der Fang ueber 1 Stueck. */
    expect(stats['p0']!.sipsDrunk).toBe(2);
    /* p3: der Fang ueber 5. */
    expect(stats['p3']!.sipsDrunk).toBe(10);
    /* p2 wurde nie erwischt und hat als Beamter niemanden belaestigt. */
    expect(stats['p2']!.sipsDrunk).toBe(0);
  });

  it('kuert den dreistesten Schmuggler und den besten Riecher', () => {
    const stats = playFive().get().stats;

    expect(boldestSmuggler(stats)).toEqual({ playerId: 'p0', value: 6 });
    /* Mehrere haben 100 % — wer gewinnt, ist egal, die Quote muss stimmen. */
    expect(bestNose(stats)!.value).toBe(1);
  });
});
