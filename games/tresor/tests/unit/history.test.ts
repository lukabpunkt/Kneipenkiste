/**
 * Vertrauens-Historie über mehrere Abende (Backlog nach 1.0, ADR-35).
 *
 * Reiner Kern, also geprüft wie jede Regel. Die interessanten Fragen sind nicht die
 * Summen — die sind trivial —, sondern die Ränder: Was passiert bei erzwungenen
 * Diebstählen, bei Umbenennungen, bei kaputten Speicherständen, und was passiert, wenn
 * jemand die App zwei Jahre lang benutzt?
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { HISTORY_MAX_DAYS, HISTORY_MAX_PLAYERS, STORAGE_KEY_HISTORY } from '@/config/rules';
import {
  clearHistory,
  emptyHistory,
  eveningsOf,
  historyRanking,
  loadHistory,
  normalizeName,
  recordRoundInHistory,
  saveHistory,
  todayKey,
  trustIndexOf,
  type History,
} from '@/core/history';
import { resolveRound } from '@/core/payout';
import type { Player } from '@/core/types';
import { makeIds, makePlayers, makeSettings, makeSetup } from './helpers';

const settings = makeSettings();

function round(steals: boolean[], overrides = {}) {
  return resolveRound(makeIds(steals.length), makeSetup({ vault: 8, steals, ...overrides }), settings);
}

/** Spieler mit sprechenden Namen — der Name ist der Schlüssel (ADR-35). */
function named(names: readonly string[]): Player[] {
  return makePlayers(names.length).map((player, index) => ({ ...player, name: names[index]! }));
}

describe('recordRoundInHistory()', () => {
  const players = named(['Marc', 'Rudi', 'Tine', 'Bea']);

  it('zählt freie Wahlen, Schlücke und Meineide', () => {
    const result = round([true, false, false, false]);
    const history = recordRoundInHistory(emptyHistory(), result, players, '2026-09-05');

    expect(history['marc']!.steals).toBe(1);
    expect(history['marc']!.freeRounds).toBe(1);
    expect(history['rudi']!.shares).toBe(1);
    expect(eveningsOf(history['marc']!)).toBe(1);
  });

  it('rechnet erzwungene Diebstähle nicht an (ADR-7)', () => {
    const ids = makeIds(4);
    const moleSettings = makeSettings({}, { mole: true });
    const result = resolveRound(
      ids,
      makeSetup({ vault: 8, steals: [false, false, false, true], moleId: ids[3]! }),
      moleSettings
    );

    const history = recordRoundInHistory(emptyHistory(), result, players, '2026-09-05');
    /*
     * Bea musste stehlen. Die Runde zählt ihr weder als freie Wahl noch als Verrat —
     * sonst wäre der Vertrauens-Index eine Auszeichnung für Pech.
     */
    expect(history['bea']!.freeRounds).toBe(0);
    expect(history['bea']!.steals).toBe(0);
    expect(trustIndexOf(history['bea']!)).toBeNull();
  });

  it('sammelt über mehrere Abende und zählt jeden Tag einmal', () => {
    let history = emptyHistory();
    // Abend 1: zwei Runden, Marc stiehlt einmal.
    history = recordRoundInHistory(history, round([true, false, false, false]), players, '2026-09-05');
    history = recordRoundInHistory(history, round([false, false, false, false]), players, '2026-09-05');
    // Abend 2: eine Runde, Marc teilt.
    history = recordRoundInHistory(history, round([false, false, false, false]), players, '2026-09-12');

    const marc = history['marc']!;
    expect(eveningsOf(marc)).toBe(2);
    expect(marc.freeRounds).toBe(3);
    expect(marc.shares).toBe(2);
    // Zwei von drei Mal geteilt.
    expect(trustIndexOf(marc)).toBe(67);
  });

  it('führt denselben Namen über Groß- und Kleinschreibung zusammen', () => {
    let history = recordRoundInHistory(
      emptyHistory(),
      round([true, false, false, false]),
      named(['marc', 'Rudi', 'Tine', 'Bea']),
      '2026-09-05'
    );
    history = recordRoundInHistory(
      history,
      round([false, false, false, false]),
      named(['  MARC ', 'Rudi', 'Tine', 'Bea']),
      '2026-09-06'
    );

    expect(Object.keys(history).filter((key) => key.includes('marc'))).toHaveLength(1);
    expect(history['marc']!.freeRounds).toBe(2);
    // Der zuletzt benutzte Name gewinnt für die Anzeige.
    expect(history['marc']!.name).toBe('  MARC ');
  });

  it('ignoriert leere Namen', () => {
    const history = recordRoundInHistory(
      emptyHistory(),
      round([true, false, false, false]),
      named(['   ', 'Rudi', 'Tine', 'Bea']),
      '2026-09-05'
    );
    expect(Object.keys(history)).toEqual(['rudi', 'tine', 'bea']);
  });

  it('hält Tage und Namen gedeckelt', () => {
    let history = emptyHistory();

    // Ein Name, viele Tage.
    for (let day = 0; day < HISTORY_MAX_DAYS + 20; day++) {
      const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
      history = recordRoundInHistory(history, round([false, false, false, false]), players, date);
    }
    expect(history['marc']!.days.length).toBe(HISTORY_MAX_DAYS);

    // Viele Namen, ein Tag.
    let many = emptyHistory();
    for (let i = 0; i < HISTORY_MAX_PLAYERS + 10; i++) {
      const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      many = recordRoundInHistory(
        many,
        round([false, false, false, false]),
        named([`P${i}a`, `P${i}b`, `P${i}c`, `P${i}d`]),
        date
      );
    }
    expect(Object.keys(many).length).toBe(HISTORY_MAX_PLAYERS);
    // Behalten wird, wer zuletzt gespielt hat.
    expect(many[`p${HISTORY_MAX_PLAYERS + 9}a`]).toBeDefined();
    expect(many['p0a']).toBeUndefined();
  });
});

describe('historyRanking()', () => {
  it('sortiert nach gespielten Runden und filtert auf den heutigen Tisch', () => {
    let history = emptyHistory();
    history = recordRoundInHistory(history, round([false, false, false, false]), named(['Marc', 'Rudi', 'Tine', 'Bea']), '2026-09-05');
    history = recordRoundInHistory(history, round([false, false, false, false]), named(['Marc', 'Rudi', 'Ole', 'Ida']), '2026-09-06');

    expect(historyRanking(history).map((entry) => entry.name)).toEqual([
      // Marc und Rudi zweimal, der Rest einmal — danach alphabetisch.
      'Marc',
      'Rudi',
      'Bea',
      'Ida',
      'Ole',
      'Tine',
    ]);

    // Heute sitzen nur drei am Tisch.
    expect(historyRanking(history, ['Marc', 'Ole', 'gibtsnicht']).map((e) => e.name)).toEqual([
      'Marc',
      'Ole',
    ]);
  });
});

describe('Persistenz', () => {
  beforeEach(() => clearHistory(globalThis.localStorage));

  it('überlebt Speichern und Laden', () => {
    const history = recordRoundInHistory(
      emptyHistory(),
      round([true, false, false, false]),
      named(['Marc', 'Rudi', 'Tine', 'Bea']),
      '2026-09-05'
    );
    saveHistory(history, globalThis.localStorage);
    expect(loadHistory(globalThis.localStorage)['marc']!.steals).toBe(1);
  });

  it('verträgt einen kaputten Eintrag, statt abzustürzen', () => {
    globalThis.localStorage.setItem(STORAGE_KEY_HISTORY, '{kein json');
    expect(loadHistory(globalThis.localStorage)).toEqual({});

    globalThis.localStorage.setItem(
      STORAGE_KEY_HISTORY,
      JSON.stringify({ marc: { name: 'Marc', days: ['2026-09-05', 7], shares: -3, steals: 'viele' } })
    );
    const loaded = loadHistory(globalThis.localStorage);
    // Was nicht plausibel ist, wird auf null gesetzt — nicht uebernommen.
    expect(loaded['marc']).toEqual({
      name: 'Marc',
      days: ['2026-09-05'],
      freeRounds: 0,
      shares: 0,
      steals: 0,
      sips: 0,
      perjuries: 0,
    });
  });

  it('kommt ohne Speicher aus', () => {
    expect(loadHistory(undefined)).toEqual({});
    expect(() => saveHistory(emptyHistory(), undefined)).not.toThrow();
  });
});

describe('Hilfsfunktionen', () => {
  it('normalisiert Namen', () => {
    expect(normalizeName('  Marc  ')).toBe('marc');
    expect(normalizeName('MARC')).toBe('marc');
  });

  it('liefert den heutigen Tag als ISO-Datum', () => {
    expect(todayKey(new Date('2026-09-05T22:31:00Z'))).toBe('2026-09-05');
  });

  it('gibt keinen Vertrauens-Index ohne freie Runde', () => {
    const empty: History[string] = {
      name: 'Marc',
      days: [],
      freeRounds: 0,
      shares: 0,
      steals: 0,
      sips: 0,
      perjuries: 0,
    };
    expect(trustIndexOf(empty)).toBeNull();
  });
});
