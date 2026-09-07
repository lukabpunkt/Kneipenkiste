/**
 * Session: Scoreboard, Statistik, Persistenz (Roadmap M0.6, Audit A0).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MAX_ROUND_HISTORY, STORAGE_KEY } from '@/config/rules';
import {
  canStart,
  clearSession,
  commitRound,
  createEmptySession,
  createPlayer,
  createSessionStore,
  deadliestLayer,
  loadSession,
  mostBlasted,
  nextFreeColor,
  saveSession,
  scoreboard,
  sessionBoardSize,
  sessionStats,
  statsFor,
} from '@/core/session';
import type { RoundResult, Session } from '@/core/types';
import { modes, players } from './helpers';

/** Eine Runde, wie `finishRound` sie liefert — hier von Hand, damit die Zahlen sprechen. */
function round(patch: Partial<RoundResult> = {}): RoundResult {
  return {
    index: 1,
    size: 5,
    seed: 1,
    modes: modes(),
    digs: [],
    drinkers: [],
    kills: [],
    tokens: {},
    distribution: [],
    finderIds: [],
    replay: [],
    ...patch,
  };
}

function sessionWith(rounds: RoundResult[], playerCount = 4): Session {
  return { ...createEmptySession(), players: players(playerCount), rounds };
}

describe('Session anlegen', () => {
  it('startet leer und laesst sich erst ab drei Spielern starten', () => {
    const empty = createEmptySession();
    expect(empty.rounds).toEqual([]);
    expect(canStart(empty)).toBe(false);
    expect(canStart({ players: players(3) })).toBe(true);
    expect(canStart({ players: players(9) })).toBe(false);
  });

  it('kuerzt zu lange Namen', () => {
    const player = createPlayer('Bartholomäus der Dritte', 'red');
    expect(player.name).toHaveLength(12);
    expect(player.outfit.helmet).toBe(true);
  });

  it('vergibt die naechste freie Farbe', () => {
    expect(nextFreeColor([])).toBe('red');
    expect(nextFreeColor(players(3))).toBe('yellow');
    expect(nextFreeColor(players(8))).toBeUndefined();
  });

  it('zeigt die Feldgroesse, die diese Runde bekommt (GDD §3.2)', () => {
    expect(sessionBoardSize({ players: players(5) })).toBe(5);
    expect(sessionBoardSize({ players: players(6) })).toBe(6);
  });

  it('traegt eine Runde ein und merkt sich ihren Index', () => {
    const after = commitRound(createEmptySession(), round({ index: 3 }));
    expect(after.rounds).toHaveLength(1);
    expect(after.roundIndex).toBe(3);
  });

  it('haelt die Historie kurz', () => {
    let session = createEmptySession();
    for (let i = 1; i <= MAX_ROUND_HISTORY + 10; i++) session = commitRound(session, round({ index: i }));

    expect(session.rounds).toHaveLength(MAX_ROUND_HISTORY);
    expect(session.rounds[0]?.index).toBe(11);
  });
});

describe('Statistik (GDD §3.7)', () => {
  const session = sessionWith([
    round({
      index: 1,
      drinkers: [{ playerId: 'p1', sips: 2, reason: 'mine' }],
      kills: [{ layer: 'p2', victim: 'p1', cell: 3 }],
      finderIds: ['p3'],
      tokens: { p2: 1, p3: 4 },
      distribution: [{ from: 'p3', to: 'p1', sips: 4 }],
      digs: [
        {
          cell: 9,
          by: 'p4',
          kind: 'empty',
          hint: 'cold',
          foreignMines: [],
          dudOwners: [],
          ownMineConsumed: true,
          ownDudConsumed: false,
          treasureFound: false,
          chainReveals: [],
          roundOver: false,
          sequenceId: '',
        },
      ],
    }),
    round({
      index: 2,
      drinkers: [{ playerId: 'p4', sips: 2, reason: 'mine' }],
      kills: [{ layer: 'p2', victim: 'p4', cell: 7 }],
      finderIds: ['p1'],
      tokens: { p2: 1, p1: 4 },
    }),
  ]);

  it('zaehlt Schluecke inklusive dessen, was verteilt wurde', () => {
    // p1: 2 aus der Explosion + 4 von p3 zugeteilt.
    expect(statsFor(session, 'p1').sips).toBe(6);
    expect(scoreboard(session)).toEqual({ p1: 6, p2: 0, p3: 0, p4: 2 });
  });

  it('trennt verursachte und kassierte Sprengungen', () => {
    expect(statsFor(session, 'p2').blastsCaused).toBe(2);
    expect(statsFor(session, 'p2').blastsTaken).toBe(0);
    expect(statsFor(session, 'p1').blastsTaken).toBe(1);
  });

  it('zaehlt Kisten und benutzte Trittsteine', () => {
    expect(statsFor(session, 'p1').chestsFound).toBe(1);
    expect(statsFor(session, 'p3').chestsFound).toBe(1);
    expect(statsFor(session, 'p4').steppingStonesUsed).toBe(1);
    expect(statsFor(session, 'p4').digs).toBe(1);
  });

  it('kuert Meistgesprengten und gefaehrlichsten Leger', () => {
    // p1 und p4 kassieren je eine — bei Gleichstand gewinnt der erste in der Liste.
    expect(mostBlasted(session)).toBe('p1');
    expect(deadliestLayer(session)).toBe('p2');
  });

  it('laesst die Titel ohne Treffer offen', () => {
    const quiet = sessionWith([round()]);
    expect(mostBlasted(quiet)).toBeUndefined();
    expect(deadliestLayer(quiet)).toBeUndefined();
  });

  it('liefert eine Zeile pro Spieler, in Listenreihenfolge', () => {
    expect(sessionStats(session).map((s) => s.playerId)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
});

describe('Persistenz', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('speichert und laedt eine Session', () => {
    const session = sessionWith([round({ index: 2 })], 3);
    saveSession(session);

    const loaded = loadSession();
    expect(loaded.players).toHaveLength(3);
    expect(loaded.rounds).toHaveLength(1);
  });

  it('faengt kaputte Eintraege ab', () => {
    localStorage.setItem(STORAGE_KEY, '{kein json');
    expect(loadSession().players).toEqual([]);
  });

  it('ergaenzt fehlende Felder aus den Defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ players: null, settings: { sound: false } }));

    const loaded = loadSession();
    expect(loaded.players).toEqual([]);
    expect(loaded.rounds).toEqual([]);
    expect(loaded.roundIndex).toBe(0);
    expect(loaded.settings.sound).toBe(false);
    // Modi kommen vollstaendig zurueck, auch wenn sie im Speicher fehlten.
    expect(loaded.settings.modes.doubleAgent).toBe(false);
  });

  it('uebernimmt einen gespeicherten Rundenzaehler', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ roundIndex: 7 }));
    expect(loadSession().roundIndex).toBe(7);
  });

  it('raeumt den Speicher wieder ab', () => {
    saveSession(sessionWith([]));
    clearSession();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('laeuft auch ohne Storage weiter (Private Mode)', () => {
    expect(loadSession(undefined).players).toEqual([]);
    expect(() => saveSession(createEmptySession(), undefined)).not.toThrow();
    expect(() => clearSession(undefined)).not.toThrow();
  });

  it('laeuft weiter, wenn der Speicher voll ist oder blockt', () => {
    // Safari im Private Mode wirft beim Schreiben statt still zu verweigern. Eine
    // laufende Runde darf daran nicht sterben — sie verliert nur ihre Persistenz.
    const hostile = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;

    expect(loadSession(hostile).players).toEqual([]);
    expect(() => saveSession(createEmptySession(), hostile)).not.toThrow();
    expect(() => clearSession(hostile)).not.toThrow();
  });
});

describe('SessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function store() {
    return createSessionStore(createEmptySession());
  }

  it('fuegt Spieler mit freien Farben hinzu und stoppt bei acht', () => {
    const s = store();
    for (let i = 0; i < MAX_PLAYERS; i++) expect(s.addPlayer((n) => `Spieler ${n}`)).not.toBeNull();

    expect(s.state.players).toHaveLength(MAX_PLAYERS);
    expect(new Set(s.state.players.map((p) => p.colorId)).size).toBe(MAX_PLAYERS);
    expect(s.addPlayer((n) => `Spieler ${n}`)).toBeNull();
  });

  it('fuellt bis zur Mindestzahl auf und meldet Startbereitschaft', () => {
    const s = store();
    expect(s.canStart()).toBe(false);

    s.ensureMinimumPlayers((n) => `Spieler ${n}`);
    expect(s.state.players).toHaveLength(3);
    expect(s.canStart()).toBe(true);
    expect(s.boardSize()).toBe(5);
  });

  it('benennt um, entfernt und findet Spieler', () => {
    const s = store();
    const player = s.addPlayer(() => 'Anna')!;

    s.renamePlayer(player.id, 'Bartholomäus der Dritte');
    expect(s.playerById(player.id)?.name).toHaveLength(12);

    s.removePlayer(player.id);
    expect(s.playerById(player.id)).toBeUndefined();
  });

  it('aendert Einstellungen und Modi einzeln', () => {
    const s = store();

    s.setSettings({ sound: false });
    s.setModes({ chainReaction: true });

    expect(s.state.settings.sound).toBe(false);
    expect(s.state.settings.modes.chainReaction).toBe(true);
    expect(s.state.settings.modes.doubleAgent).toBe(false);
  });

  it('meldet Aenderungen an Abonnenten und meldet sie wieder ab', () => {
    const s = store();
    let calls = 0;
    const off = s.subscribe(() => {
      calls += 1;
    });

    s.addPlayer(() => 'Anna');
    expect(calls).toBe(1);

    off();
    s.addPlayer(() => 'Rudi');
    expect(calls).toBe(1);
  });

  it('traegt Runden ein und liefert Scoreboard und Statistik', () => {
    const s = store();
    s.ensureMinimumPlayers((n) => `Spieler ${n}`);
    const [a, b] = s.state.players;

    s.recordRound(
      round({
        drinkers: [{ playerId: a!.id, sips: 3, reason: 'mine' }],
        kills: [{ layer: b!.id, victim: a!.id, cell: 1 }],
      })
    );

    expect(s.scoreboard()[a!.id]).toBe(3);
    expect(s.stats().find((x) => x.playerId === b!.id)?.blastsCaused).toBe(1);
  });

  it('setzt Runden zurueck und behaelt die Spieler', () => {
    const s = store();
    s.ensureMinimumPlayers((n) => `Spieler ${n}`);
    s.recordRound(round({ index: 4 }));

    s.resetRounds();
    expect(s.state.rounds).toEqual([]);
    expect(s.state.roundIndex).toBe(0);
    expect(s.state.players).toHaveLength(3);
  });

  it('setzt auf Werkszustand zurueck', () => {
    const s = store();
    s.ensureMinimumPlayers((n) => `Spieler ${n}`);

    s.reset();
    expect(s.state.players).toEqual([]);
    expect(s.state.rounds).toEqual([]);
  });

  it('schreibt jede Aenderung sofort in den Speicher', () => {
    const s = store();
    s.addPlayer(() => 'Anna');
    expect(loadSession().players).toHaveLength(1);
  });
});
