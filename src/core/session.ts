/**
 * Session: Beamten-Rotation, Statistik ueber alle Runden, Persistenz (Architektur §4).
 *
 * Die Statistik arbeitet ausschliesslich auf `RoundResult` — also auf Daten, die am
 * Rundenende ohnehin oeffentlich sind (ADR-4). Nichts Geheimes wird persistiert.
 */

import { MAX_ROUND_HISTORY, STORAGE_KEY } from '@/config/rules';
import { officerIndexFor } from './round';
import type { Player, PlayerId, PlayerStats, RoundResult } from './types';

/* ------------------------------------------------------------------ */
/* Rotation (GDD §3.1)                                                 */
/* ------------------------------------------------------------------ */

/** Wer kontrolliert die Runde mit diesem Index? */
export function officerFor(players: readonly Player[], roundIndex: number): Player {
  return players[officerIndexFor(roundIndex, players.length)]!;
}

/* ------------------------------------------------------------------ */
/* Statistik (GDD §3.8)                                                */
/* ------------------------------------------------------------------ */

export function emptyStats(): PlayerStats {
  return {
    smuggledThrough: 0,
    caughtAmount: 0,
    caughtCount: 0,
    roundsAsOfficer: 0,
    openings: 0,
    hits: 0,
    harassed: 0,
    boldestRun: 0,
    sipsDrunk: 0,
  };
}

export type StatsMap = Record<PlayerId, PlayerStats>;

function ensure(stats: StatsMap, id: PlayerId): PlayerStats {
  const existing = stats[id];
  if (existing) return existing;
  const fresh = emptyStats();
  stats[id] = fresh;
  return fresh;
}

/** Verrechnet eine abgeschlossene Runde in die laufende Session-Statistik. */
export function applyRound(stats: StatsMap, result: RoundResult): StatsMap {
  const next: StatsMap = { ...stats };
  for (const id of Object.keys(next)) next[id] = { ...next[id]! };

  const officer = ensure(next, result.officerId);
  officer.roundsAsOfficer += 1;

  for (const opening of result.openings) {
    officer.openings += 1;
    const traveler = ensure(next, opening.suitcaseOf);

    if (opening.result.kind === 'caught') {
      officer.hits += 1;
      traveler.caughtCount += 1;
      traveler.caughtAmount += opening.result.amount;
    } else if (opening.result.kind === 'clean') {
      officer.harassed += 1;
    } else {
      /*
       * Der Diplomat kommt mit seiner Ware durch — fuer den Beamten war es weder Treffer
       * noch Belaestigung, sondern eine Lektion in Aussenpolitik.
       */
      traveler.smuggledThrough += opening.result.amount;
      traveler.boldestRun = Math.max(traveler.boldestRun, opening.result.amount);
    }
  }

  for (const entry of result.gate) {
    if (entry.kind !== 'smuggler') continue;
    const traveler = ensure(next, entry.suitcaseOf);
    traveler.smuggledThrough += entry.amount;
    traveler.boldestRun = Math.max(traveler.boldestRun, entry.amount);
  }

  for (const drinker of result.drinkers) {
    ensure(next, drinker.playerId).sipsDrunk += drinker.sips;
  }

  return next;
}

/** Trefferquote als Beamter — `null`, solange nie geoeffnet wurde. */
export function hitRate(stats: PlayerStats): number | null {
  if (stats.openings === 0) return null;
  return stats.hits / stats.openings;
}

export interface Highlight {
  playerId: PlayerId;
  value: number;
}

/** "Dreistester Schmuggler": hoechste Einzelmenge, die durchkam. */
export function boldestSmuggler(stats: StatsMap): Highlight | null {
  return best(stats, (s) => s.boldestRun);
}

/** "Bester Riecher": beste Trefferquote, mindestens eine Oeffnung. */
export function bestNose(stats: StatsMap): Highlight | null {
  let winner: Highlight | null = null;
  for (const [playerId, entry] of Object.entries(stats)) {
    const rate = hitRate(entry);
    if (rate === null) continue;
    if (winner === null || rate > winner.value) winner = { playerId, value: rate };
  }
  return winner;
}

function best(stats: StatsMap, valueOf: (s: PlayerStats) => number): Highlight | null {
  let winner: Highlight | null = null;
  for (const [playerId, entry] of Object.entries(stats)) {
    const value = valueOf(entry);
    if (value <= 0) continue;
    if (winner === null || value > winner.value) winner = { playerId, value };
  }
  return winner;
}

/* ------------------------------------------------------------------ */
/* Persistenz                                                          */
/* ------------------------------------------------------------------ */

export interface SessionSnapshot {
  version: 1;
  players: Player[];
  roundIndex: number;
  stats: StatsMap;
  /** Nur die Banner der letzten Runden — mehr braucht die Result-Historie nicht. */
  history: RoundResult['banner'][];
}

export function emptySession(players: readonly Player[] = []): SessionSnapshot {
  return { version: 1, players: [...players], roundIndex: 0, stats: {}, history: [] };
}

export function pushHistory(snapshot: SessionSnapshot, banner: RoundResult['banner']): SessionSnapshot {
  const history = [...snapshot.history, banner];
  return { ...snapshot, history: history.slice(-MAX_ROUND_HISTORY) };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    /* Safari im privaten Modus wirft beim blossen Zugriff. Dann eben ohne Persistenz. */
    return null;
  }
}

export function saveSession(snapshot: SessionSnapshot, store: StorageLike | null = storage()): void {
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* Quota voll oder gesperrt — die Session laeuft trotzdem weiter. */
  }
}

export function loadSession(store: StorageLike | null = storage()): SessionSnapshot | null {
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionSnapshot>;
    if (parsed.version !== 1 || !Array.isArray(parsed.players)) return null;
    return {
      version: 1,
      players: parsed.players,
      roundIndex: typeof parsed.roundIndex === 'number' ? parsed.roundIndex : 0,
      stats: parsed.stats ?? {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return null;
  }
}

export function clearSession(store: StorageLike | null = storage()): void {
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* siehe saveSession */
  }
}
