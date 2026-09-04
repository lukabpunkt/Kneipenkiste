/**
 * Session, Scoreboard, Vertrauens-Index und Persistenz (GDD §3.8, Roadmap M0.7).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, MAX_NAME_LENGTH, MAX_ROUND_HISTORY, STORAGE_KEY } from '@/config/rules';
import { COLOR_IDS } from '@/config/theme';
import { applyDistribution } from '@/core/payout';
import {
  canStart,
  clearSession,
  commitRound,
  createEmptySession,
  createPlayer,
  createSessionStore,
  loadSession,
  mostBetrayed,
  nextFreeColor,
  saveSession,
  scoreboard,
  sessionStats,
  statsFor,
} from '@/core/session';
import type { RoundResult, Session } from '@/core/types';
import { makePlayers, makeSettings, resolve } from './helpers';

function sessionWith(rounds: RoundResult[], players = 4): Session {
  return { ...createEmptySession(), players: makePlayers(players), rounds };
}

describe('createEmptySession', () => {
  it('startet mit V_0 der eingestellten Haerte', () => {
    expect(createEmptySession().vault).toBe(4);
    expect(createEmptySession(makeSettings({ hardness: 'hard' })).vault).toBe(6);
    expect(createEmptySession(makeSettings({}, { highroller: true })).vault).toBe(6);
  });

  it('kopiert die Settings, statt sie zu teilen', () => {
    const settings = makeSettings();
    const session = createEmptySession(settings);
    session.settings.modes.oath = true;
    expect(settings.modes.oath).toBe(false);
  });
});

describe('createPlayer', () => {
  it('kuerzt lange Namen und setzt die Maske', () => {
    const player = createPlayer('  Ein sehr langer Name  ', 'red');
    expect(player.name).toHaveLength(MAX_NAME_LENGTH);
    expect(player.outfit.mask).toBe(true);
    expect(player.outfit.stripes).toBe(false);
    expect(player.id).toMatch(/^p_/);
  });

  it('vergibt eindeutige IDs', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createPlayer('X', 'red').id));
    expect(ids.size).toBe(200);
  });

  it('kann Ringelshirts verteilen', () => {
    expect(createPlayer('A', 'blue', true).outfit.stripes).toBe(true);
  });
});

describe('nextFreeColor / canStart', () => {
  it('findet die naechste freie Farbe', () => {
    expect(nextFreeColor([])).toBe(COLOR_IDS[0]);
    expect(nextFreeColor([createPlayer('A', COLOR_IDS[0]!)])).toBe(COLOR_IDS[1]);
  });

  it('gibt undefined zurueck, wenn alle acht vergeben sind', () => {
    const players = COLOR_IDS.map((id) => createPlayer('X', id));
    expect(nextFreeColor(players)).toBeUndefined();
  });

  it('startet erst ab 3 und hoechstens mit 8 (ADR-5)', () => {
    expect(canStart({ players: makePlayers(2) })).toBe(false);
    expect(canStart({ players: makePlayers(3) })).toBe(true);
    expect(canStart({ players: makePlayers(8) })).toBe(true);
    expect(canStart({ players: makePlayers(9) })).toBe(false);
  });
});

describe('commitRound', () => {
  it('haengt die Runde an und uebernimmt nextVault', () => {
    const session = sessionWith([]);
    const result = resolve(4, 0, 4);
    const next = commitRound(session, result);
    expect(next.rounds).toHaveLength(1);
    expect(next.vault).toBe(result.nextVault);
  });

  it('kappt die Historie bei 100 Runden', () => {
    let session = sessionWith([]);
    for (let i = 0; i < MAX_ROUND_HISTORY + 10; i++) {
      session = commitRound(session, { ...resolve(4, 0, 4), index: i + 1 });
    }
    expect(session.rounds).toHaveLength(MAX_ROUND_HISTORY);
    expect(session.rounds[0]!.index).toBe(11);
  });
});

/* ------------------------------------------------------------------ */
/* Statistik ueber fuenf Testrunden (Audit A1)                         */
/* ------------------------------------------------------------------ */

describe('Statistik ueber fuenf Runden', () => {
  /*
   * Runde 1: alle teilen (je 1 Gebuehr)
   * Runde 2: p0 stiehlt allein, verteilt 6 komplett an p1
   * Runde 3: p0 und p1 stehlen (je ⌈4/2⌉ = 2)
   * Runde 4: alle teilen
   * Runde 5: p0 stiehlt allein, verteilt 6 an p1 (4) und p2 (2)
   */
  const rounds: RoundResult[] = [
    resolve(4, 0, 4),
    applyDistribution(resolve(4, 1, 6), { p1: 6 }),
    resolve(4, 2, 4),
    resolve(4, 0, 4),
    applyDistribution(resolve(4, 1, 6), { p1: 4, p2: 2 }),
  ];
  const session = sessionWith(rounds);

  it('zaehlt das Scoreboard richtig', () => {
    expect(scoreboard(session)).toEqual({
      p0: 1 + 2 + 1, // Gebuehr, Split, Gebuehr
      p1: 1 + 6 + 2 + 1 + 4,
      p2: 1 + 1 + 2,
      p3: 1 + 1,
    });
  });

  it('berechnet den Vertrauens-Index', () => {
    const stats = Object.fromEntries(sessionStats(session).map((s) => [s.playerId, s]));
    // p0 teilt in 2 von 5 Runden.
    expect(stats['p0']!.trustIndex).toBe(40);
    // p1 stiehlt nur in Runde 3.
    expect(stats['p1']!.trustIndex).toBe(80);
    expect(stats['p2']!.trustIndex).toBe(100);
    expect(stats['p3']!.trustIndex).toBe(100);
  });

  it('kennt die Verrats-Streak', () => {
    const stats = Object.fromEntries(sessionStats(session).map((s) => [s.playerId, s]));
    // p0: Runde 2, 3 und 5 gestohlen — zuletzt in Runde 5, also Streak 1.
    expect(stats['p0']!.currentBetrayalStreak).toBe(1);
    expect(stats['p0']!.longestBetrayalStreak).toBe(2);
    expect(stats['p2']!.longestBetrayalStreak).toBe(0);
  });

  it('findet den Meistbetrogenen', () => {
    expect(mostBetrayed(session)).toBe('p1'); // 6 + 4 zugeteilte Schluecke
    expect(statsFor(session, 'p1').betrayedSips).toBe(10);
    expect(statsFor(session, 'p2').betrayedSips).toBe(2);
  });

  it('gibt ohne Verteilung niemanden zurueck', () => {
    expect(mostBetrayed(sessionWith([resolve(4, 0, 4)]))).toBeUndefined();
  });
});

describe('Vertrauens-Index und der Maulwurf (ADR-7)', () => {
  it('zaehlt erzwungene Diebstaehle nicht als Verrat', () => {
    const settings = makeSettings({}, { mole: true });
    const round = resolve(4, 2, 8, settings, { moleId: 'p1' });
    const stats = statsFor(sessionWith([round]), 'p1');
    expect(stats.freeRounds).toBe(0);
    expect(stats.steals).toBe(0);
    expect(stats.trustIndex).toBeNull();
    expect(stats.currentBetrayalStreak).toBe(0);
  });

  it('zaehlt die anderen Diebe derselben Runde ganz normal', () => {
    const settings = makeSettings({}, { mole: true });
    const round = resolve(4, 2, 8, settings, { moleId: 'p1' });
    expect(statsFor(sessionWith([round]), 'p0').steals).toBe(1);
  });
});

describe('Statistik-Randfaelle', () => {
  it('liefert ohne Runden neutrale Werte', () => {
    const stats = statsFor(sessionWith([]), 'p0');
    expect(stats).toMatchObject({ sips: 0, freeRounds: 0, trustIndex: null, perjuries: 0 });
  });

  it('ignoriert Runden, in denen der Spieler nicht dabei war', () => {
    const session = sessionWith([resolve(3, 0, 4)], 4);
    expect(statsFor(session, 'p3').freeRounds).toBe(0);
  });

  it('zaehlt Meineide', () => {
    const settings = makeSettings({}, { oath: true });
    const round = resolve(4, 2, 8, settings, { oaths: ['p0'] });
    expect(statsFor(sessionWith([round]), 'p0').perjuries).toBe(1);
    expect(statsFor(sessionWith([round]), 'p1').perjuries).toBe(0);
  });

  it('zaehlt auch Spieler mit, die nicht mehr in der Liste stehen', () => {
    const session = sessionWith([resolve(4, 0, 4)], 3);
    expect(scoreboard(session)['p3']).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Persistenz                                                          */
/* ------------------------------------------------------------------ */

describe('Persistenz', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('speichert und laedt eine Session', () => {
    const session = commitRound(sessionWith([]), resolve(4, 0, 4));
    saveSession(session);
    const loaded = loadSession();
    expect(loaded.players).toHaveLength(4);
    expect(loaded.rounds).toHaveLength(1);
    expect(loaded.vault).toBe(6);
  });

  it('liefert ohne Eintrag eine leere Session', () => {
    expect(loadSession().players).toEqual([]);
  });

  it('ueberlebt kaputte Eintraege', () => {
    localStorage.setItem(STORAGE_KEY, '{nope');
    expect(loadSession().players).toEqual([]);
  });

  it('ergaenzt fehlende Felder aus den Defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ players: null, settings: { sound: false } }));
    const loaded = loadSession();
    expect(loaded.players).toEqual([]);
    expect(loaded.rounds).toEqual([]);
    expect(loaded.settings.sound).toBe(false);
    expect(loaded.settings.modes).toEqual(DEFAULT_SETTINGS.modes);
    expect(loaded.vault).toBe(4);
  });

  it('kappt eine zu lange Historie beim Speichern', () => {
    const rounds = Array.from({ length: MAX_ROUND_HISTORY + 5 }, (_, i) => ({
      ...resolve(4, 0, 4),
      index: i + 1,
    }));
    saveSession(sessionWith(rounds));
    expect(loadSession().rounds).toHaveLength(MAX_ROUND_HISTORY);
  });

  it('kommt ohne Storage klar', () => {
    expect(loadSession(undefined).players).toEqual([]);
    expect(() => saveSession(sessionWith([]), undefined)).not.toThrow();
    expect(() => clearSession(undefined)).not.toThrow();
  });

  it('ueberlebt einen Storage, der wirft', () => {
    const broken = {
      getItem: () => {
        throw new Error('nope');
      },
      setItem: () => {
        throw new Error('voll');
      },
      removeItem: () => {
        throw new Error('nope');
      },
    } as unknown as Storage;
    expect(loadSession(broken).players).toEqual([]);
    expect(() => saveSession(sessionWith([]), broken)).not.toThrow();
    expect(() => clearSession(broken)).not.toThrow();
  });

  it('leert den Eintrag', () => {
    saveSession(sessionWith([]));
    clearSession();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('schreibt jede Aenderung des Stores weg', () => {
    const store = createSessionStore(sessionWith([]));
    store.setVault(12);
    expect(loadSession().vault).toBe(12);
  });
});

/* ------------------------------------------------------------------ */
/* SessionStore — der Zustand, den sich alle Screens teilen (M1.1)     */
/* ------------------------------------------------------------------ */

describe('SessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const freshStore = () => createSessionStore(createEmptySession());
  const nameFor = (index: number) => `Spieler ${index}`;

  it('legt Spieler mit freier Farbe und Default-Namen an', () => {
    const store = freshStore();
    const first = store.addPlayer(nameFor);
    const second = store.addPlayer(nameFor);
    expect(first?.name).toBe('Spieler 1');
    expect(second?.name).toBe('Spieler 2');
    expect(first?.colorId).not.toBe(second?.colorId);
    expect(store.state.players).toHaveLength(2);
  });

  it('verteilt Ringelshirts an jeden zweiten Crook (Art Direction §5)', () => {
    const store = freshStore();
    store.ensureMinimumPlayers(nameFor);
    store.addPlayer(nameFor);
    expect(store.state.players.map((p) => p.outfit.stripes)).toEqual([false, true, false, true]);
  });

  it('nimmt keinen neunten Spieler auf', () => {
    const store = freshStore();
    for (let i = 0; i < 8; i++) expect(store.addPlayer(nameFor)).not.toBeNull();
    expect(store.addPlayer(nameFor)).toBeNull();
    expect(store.state.players).toHaveLength(8);
  });

  it('fuellt auf die Mindestzahl auf und laesst sie danach in Ruhe', () => {
    const store = freshStore();
    store.ensureMinimumPlayers(nameFor);
    expect(store.state.players).toHaveLength(3);
    store.ensureMinimumPlayers(nameFor);
    expect(store.state.players).toHaveLength(3);
    expect(store.canStart()).toBe(true);
  });

  it('benennt um, kuerzt lange Namen und entfernt Spieler', () => {
    const store = freshStore();
    const player = store.addPlayer(nameFor)!;
    store.renamePlayer(player.id, 'Ein viel zu langer Name');
    expect(store.playerById(player.id)?.name).toHaveLength(MAX_NAME_LENGTH);

    store.removePlayer(player.id);
    expect(store.playerById(player.id)).toBeUndefined();
    expect(store.canStart()).toBe(false);
  });

  it('zieht den Tresor nach, solange keine Runde gespielt ist', () => {
    const store = freshStore();
    expect(store.state.vault).toBe(4);
    store.setSettings({ hardness: 'hard' });
    expect(store.state.vault).toBe(6);
    store.setModes({ highroller: true });
    expect(store.state.vault).toBe(6);
  });

  it('laesst einen laufenden Tresor in Ruhe, sobald Runden gespielt sind', () => {
    const store = freshStore();
    store.ensureMinimumPlayers(nameFor);
    store.recordRound(resolve(3, 0, 4));
    expect(store.state.vault).toBe(6);
    store.setSettings({ hardness: 'hard' });
    // Mitten in der Session wechselt der Tresorstand nicht — nur neue Runden rechnen anders.
    expect(store.state.vault).toBe(6);
  });

  it('traegt Runden ein und uebernimmt nextVault', () => {
    const store = freshStore();
    store.ensureMinimumPlayers(nameFor);
    const round = resolve(3, 2, 4);
    store.recordRound(round);
    expect(store.state.rounds).toHaveLength(1);
    expect(store.state.vault).toBe(round.nextVault);
  });

  it('liefert Scoreboard und Statistik ueber die eigenen Spieler', () => {
    const store = createSessionStore({ ...createEmptySession(), players: makePlayers(4) });
    store.recordRound(resolve(4, 0, 4));
    expect(store.scoreboard()['p0']).toBe(1);
    expect(store.stats().map((s) => s.playerId)).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(store.stats()[0]!.trustIndex).toBe(100);
  });

  it('benachrichtigt Abonnenten und meldet sie wieder ab', () => {
    const store = freshStore();
    let calls = 0;
    const off = store.subscribe(() => {
      calls += 1;
    });
    store.addPlayer(nameFor);
    expect(calls).toBe(1);
    off();
    store.addPlayer(nameFor);
    expect(calls).toBe(1);
  });

  it('setzt Runden zurueck, behaelt aber Spieler und Settings', () => {
    const store = freshStore();
    store.ensureMinimumPlayers(nameFor);
    store.setSettings({ hardness: 'hard' });
    store.recordRound(resolve(3, 0, 6));

    store.resetRounds();
    expect(store.state.rounds).toEqual([]);
    expect(store.state.players).toHaveLength(3);
    expect(store.state.settings.hardness).toBe('hard');
    expect(store.state.vault).toBe(6);
  });

  it('reset stellt den Werkszustand her', () => {
    const store = freshStore();
    store.ensureMinimumPlayers(nameFor);
    store.setSettings({ hardness: 'hard' });
    store.reset();
    expect(store.state.players).toEqual([]);
    expect(store.state.settings.hardness).toBe('normal');
    expect(loadSession().players).toEqual([]);
  });

  it('setVault schreibt den Stand direkt fort', () => {
    const store = freshStore();
    store.setVault(11);
    expect(store.state.vault).toBe(11);
    expect(loadSession().vault).toBe(11);
  });
});
