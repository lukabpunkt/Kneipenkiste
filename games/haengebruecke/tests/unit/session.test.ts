import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyRound,
  clearSession,
  createSessionController,
  defaultPlayers,
  emptySession,
  emptyStats,
  frequentFaller,
  loadSession,
  mountainGoat,
  pushHistory,
  saveSession,
  topPairing,
  type StatsMap,
} from '@/core/session';
import { resolveRound } from '@/core/round';
import { createSeededRng } from '@/core/rng';
import { MAX_ROUND_HISTORY, STORAGE_KEY } from '@/config/rules';
import { roundOf, type RoundOptions } from './helpers';

const rng = (seed: number) => createSeededRng(seed);

function play(options: RoundOptions) {
  return resolveRound(roundOf(options), { rng: rng(options.seed ?? 1) });
}

/* ------------------------------------------------------------------ */
/* Statistik                                                           */
/* ------------------------------------------------------------------ */

describe('applyRound', () => {
  it('zaehlt sichere Runden und Stuerze', () => {
    const stats = applyRound({}, play({ picks: [1, 1, 3, 4], plankCount: 6 }));

    expect(stats.p1!.falls).toBe(1);
    expect(stats.p2!.falls).toBe(1);
    expect(stats.p3!.safeRounds).toBe(1);
    expect(stats.p4!.safeRounds).toBe(1);
    expect(stats.p3!.falls).toBe(0);
  });

  it('merkt sich, wer mit wem gefallen ist (GDD §7)', () => {
    let stats: StatsMap = {};
    stats = applyRound(stats, play({ picks: [1, 1, 3], plankCount: 5 }));
    stats = applyRound(stats, play({ picks: [2, 2, 3], plankCount: 5 }));
    stats = applyRound(stats, play({ picks: [1, 3, 3], plankCount: 5 }));

    expect(stats.p1!.fellWith).toEqual({ p2: 2 });
    expect(stats.p2!.fellWith).toEqual({ p1: 2, p3: 1 });
    expect(topPairing(stats)).toEqual({ a: 'p1', b: 'p2', falls: 2 });
  });

  it('zaehlt drei auf einem Balken als Sturz mit beiden anderen', () => {
    const stats = applyRound({}, play({ picks: [1, 1, 1], plankCount: 5 }));
    expect(stats.p1!.fellWith).toEqual({ p2: 1, p3: 1 });
  });

  it('wertet den morschen Balken als Sturz, nicht als sichere Runde', () => {
    const stats = applyRound(
      {},
      play({ picks: [2, 1, 3], plankCount: 5, modes: { rotten: true }, rottenPlank: 2 })
    );
    expect(stats.p1!.falls).toBe(1);
    expect(stats.p1!.safeRounds).toBe(0);
    expect(stats.p1!.sipsDrunk).toBe(1);
  });

  it('zaehlt Seile, Fahnenfluchten und Diebstaehle', () => {
    const stats = applyRound(
      {},
      play({
        picks: ['rope', 3, 3, 1],
        plankCount: 6,
        modes: { rope: true, flags: true },
        flags: { p1: 5, p3: 3 },
      })
    );

    expect(stats.p1!.ropesUsed).toBe(1);
    expect(stats.p1!.desertions).toBe(1);
    /* p2 steht auf der 3, die p3 fuer sich reklamiert hatte. */
    expect(stats.p2!.thefts).toBe(1);
    expect(stats.p2!.sipsGiven).toBe(2);
  });

  it('summiert Schlucke ueber die Runden, ohne die alte Map zu veraendern', () => {
    const first = applyRound({}, play({ picks: [1, 1, 3], plankCount: 5 }));
    const second = applyRound(first, play({ picks: [1, 1, 3], plankCount: 5 }));

    expect(first.p1!.sipsDrunk).toBe(2);
    expect(second.p1!.sipsDrunk).toBe(4);
    expect(second.p3!.sipsGiven).toBe(2);
  });

  it('faengt bei einer leeren Statistik an', () => {
    expect(emptyStats()).toEqual({
      safeRounds: 0,
      falls: 0,
      sipsDrunk: 0,
      sipsGiven: 0,
      desertions: 0,
      thefts: 0,
      ropesUsed: 0,
      fellWith: {},
    });
  });
});

describe('Auszeichnungen', () => {
  it('kuert Bergziege und Sturzflieger', () => {
    let stats: StatsMap = {};
    for (let i = 0; i < 3; i += 1) {
      stats = applyRound(stats, play({ picks: [1, 1, 3], plankCount: 5, seed: i }));
    }

    expect(mountainGoat(stats)).toEqual({ playerId: 'p3', value: 3 });
    expect(frequentFaller(stats)).toEqual({ playerId: 'p1', value: 3 });
  });

  it('gibt null zurueck, solange nichts passiert ist', () => {
    expect(mountainGoat({})).toBeNull();
    expect(frequentFaller({})).toBeNull();
    expect(topPairing({})).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Persistenz                                                          */
/* ------------------------------------------------------------------ */

describe('Persistenz', () => {
  beforeEach(() => localStorage.clear());

  it('speichert und laedt eine Session', () => {
    const snapshot = emptySession(defaultPlayers(4));
    saveSession(snapshot);

    const loaded = loadSession();
    expect(loaded?.players).toHaveLength(4);
    expect(loaded?.bridge.count).toBe(6);
  });

  it('gibt null zurueck, wenn nichts gespeichert ist', () => {
    expect(loadSession()).toBeNull();
  });

  it('verwirft kaputte oder fremde Daten', () => {
    localStorage.setItem(STORAGE_KEY, 'kein JSON');
    expect(loadSession()).toBeNull();

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadSession()).toBeNull();
  });

  it('fuellt fehlende Felder einer aelteren Session auf', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, players: defaultPlayers(3), settings: { pace: 'long' } })
    );

    const loaded = loadSession()!;
    expect(loaded.settings.pace).toBe('long');
    expect(loaded.settings.modes.rope).toBe(false);
    expect(loaded.bridge.count).toBe(5);
    expect(loaded.ropeUsage).toEqual({});
    expect(loaded.history).toEqual([]);
  });

  it('loescht die Session', () => {
    saveSession(emptySession(defaultPlayers(3)));
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it('kommt ohne Storage aus (Safari im privaten Modus)', () => {
    expect(() => saveSession(emptySession(), null)).not.toThrow();
    expect(loadSession(null)).toBeNull();
    expect(() => clearSession(null)).not.toThrow();
  });

  it('haelt die Historie kurz', () => {
    let snapshot = emptySession(defaultPlayers(3));
    for (let i = 0; i < MAX_ROUND_HISTORY + 5; i += 1) snapshot = pushHistory(snapshot, 'crash');
    expect(snapshot.history).toHaveLength(MAX_ROUND_HISTORY);
  });
});

/* ------------------------------------------------------------------ */
/* Controller                                                          */
/* ------------------------------------------------------------------ */

describe('SessionController', () => {
  beforeEach(() => localStorage.clear());

  it('legt fuenf Spieler mit verschiedenen Farben an', () => {
    const session = createSessionController();
    expect(session.players()).toHaveLength(5);
    expect(new Set(session.players().map((p) => p.colorId)).size).toBe(5);
    expect(session.bridge().count).toBe(7);
  });

  it('nimmt Spieler auf und weg, und baut die Bruecke passend neu', () => {
    const session = createSessionController(emptySession(defaultPlayers(3)));
    expect(session.bridge().count).toBe(5);

    session.addPlayer();
    expect(session.players()).toHaveLength(4);
    expect(session.bridge().count).toBe(6);

    session.removePlayer('p1');
    expect(session.players().map((p) => p.id)).toEqual(['p2', 'p3', 'p4']);
    expect(session.bridge().count).toBe(5);
  });

  it('haelt sich an die Grenzen 3 und 8', () => {
    const full = createSessionController(emptySession(defaultPlayers(8)));
    expect(full.canAddPlayer()).toBe(false);
    expect(full.addPlayer()).toBeNull();

    const minimal = createSessionController(emptySession(defaultPlayers(3)));
    expect(minimal.canRemovePlayer()).toBe(false);
    minimal.removePlayer('p1');
    expect(minimal.players()).toHaveLength(3);
  });

  it('benennt um, ohne leere Namen zuzulassen', () => {
    const session = createSessionController(emptySession(defaultPlayers(3)));
    session.renamePlayer('p1', '  Anna  ');
    expect(session.nameOf('p1')).toBe('Anna');

    session.renamePlayer('p1', '   ');
    expect(session.nameOf('p1')).toBe('Anna');
    expect(session.nameOf('p9')).toBe('p9');
  });

  it('kuerzt zu lange Namen', () => {
    const session = createSessionController(emptySession(defaultPlayers(3)));
    session.renamePlayer('p1', 'Bartholomäus-Ferdinand');
    expect(session.nameOf('p1').length).toBeLessThanOrEqual(12);
  });

  it('wechselt nur auf freie Farben', () => {
    const session = createSessionController(emptySession(defaultPlayers(3)));
    const before = session.colorOf('p1');
    session.cycleColor('p1');

    const after = session.colorOf('p1');
    expect(after).not.toBe(before);
    expect(new Set(session.players().map((p) => p.colorId)).size).toBe(3);

    /* Unbekannte Spieler aendern nichts. */
    session.cycleColor('p9');
    expect(session.colorOf('p1')).toBe(after);
  });

  it('laesst die Farbe, wenn alle acht vergeben sind', () => {
    const session = createSessionController(emptySession(defaultPlayers(8)));
    const before = session.colorOf('p1');
    session.cycleColor('p1');
    expect(session.colorOf('p1')).toBe(before);
    expect(session.colorOf('p9')).toBe(session.players()[0]!.colorId);
  });

  it('speichert Settings und Modi', () => {
    const session = createSessionController(emptySession(defaultPlayers(3)));
    session.setSettings({ pace: 'long' });
    session.setModes({ rope: true });

    expect(session.settings().pace).toBe('long');
    expect(session.settings().modes.rope).toBe(true);
    expect(loadSession()?.settings.modes.rope).toBe(true);
  });

  it('uebernimmt nach der Runde Bruecke, Seile und Statistik', () => {
    const session = createSessionController(emptySession(defaultPlayers(3)));
    const result = play({ picks: ['rope', 1, 1], modes: { rope: true } });

    session.recordRound(result);

    expect(session.bridge().count).toBe(5);
    expect(session.ropeUsage()).toEqual({ p1: 1 });
    expect(session.get().stats.p2!.falls).toBe(1);
    expect(session.get().roundIndex).toBe(1);
    expect(session.get().history).toEqual([result.banner]);
  });

  it('setzt die Partie zurueck, behaelt aber die Spieler', () => {
    const session = createSessionController(emptySession(defaultPlayers(3)));
    session.recordRound(play({ picks: [1, 1, 3], modes: { rope: true } }));
    session.resetProgress();

    expect(session.players()).toHaveLength(3);
    expect(session.get().stats).toEqual({});
    expect(session.get().roundIndex).toBe(0);
    expect(session.ropeUsage()).toEqual({});
    expect(session.bridge().count).toBe(5);
  });

  it('findet Spieler und faellt sonst auf Standards zurueck', () => {
    const session = createSessionController(emptySession(defaultPlayers(3)));
    expect(session.playerById('p2')?.id).toBe('p2');
    expect(session.playerById('p9')).toBeUndefined();
    session.save();
    expect(loadSession()).not.toBeNull();
  });
});
