/**
 * Session: Beamten-Rotation, Statistik ueber alle Runden, Persistenz (Architektur §4).
 *
 * Die Statistik arbeitet ausschliesslich auf `RoundResult` — also auf Daten, die am
 * Rundenende ohnehin oeffentlich sind (ADR-4). Nichts Geheimes wird persistiert.
 */

import {
  DEFAULT_SETTINGS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MAX_ROUND_HISTORY,
  MIN_PLAYERS,
  STORAGE_KEY,
  type Settings,
} from '@/config/rules';
import { COLOR_IDS, PLAYER_COLORS, colorById, type ColorId } from '@/config/theme';
import { officerIndexFor } from './round';
import { createStore, type Store } from './store';
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
  settings: Settings;
  roundIndex: number;
  stats: StatsMap;
  /** Nur die Banner der letzten Runden — mehr braucht die Result-Historie nicht. */
  history: RoundResult['banner'][];
}

export function emptySession(players: readonly Player[] = []): SessionSnapshot {
  return {
    version: 1,
    players: [...players],
    settings: { ...DEFAULT_SETTINGS, modes: { ...DEFAULT_SETTINGS.modes } },
    roundIndex: 0,
    stats: {},
    history: [],
  };
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
      /* Fehlende Felder werden aufgefuellt, damit eine aeltere Session nicht verloren geht. */
      settings: {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
        modes: { ...DEFAULT_SETTINGS.modes, ...parsed.settings?.modes },
      },
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

/* ------------------------------------------------------------------ */
/* Session-Controller (die eine Stelle, an der Spieler & Settings leben) */
/* ------------------------------------------------------------------ */

/** Vorschlags-Namen fuer neue Spieler — dieselben Shotling-Namen wie in Drinkshot. */
export function defaultPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => {
    const color = PLAYER_COLORS[i % PLAYER_COLORS.length]!;
    return { id: `p${i + 1}`, name: color.nickname, colorId: color.id, symbol: color.symbol };
  });
}

export interface SessionController {
  readonly store: Store<SessionSnapshot>;
  get(): Readonly<SessionSnapshot>;
  players(): readonly Player[];
  settings(): Readonly<Settings>;

  playerById(id: PlayerId): Player | undefined;
  /** Name eines Spielers — die eine Stelle, an der Screens aus einer ID Text machen. */
  nameOf(id: PlayerId): string;
  colorOf(id: PlayerId): ColorId;

  canAddPlayer(): boolean;
  canRemovePlayer(): boolean;
  addPlayer(): Player | null;
  removePlayer(id: PlayerId): void;
  renamePlayer(id: PlayerId, name: string): void;
  cycleColor(id: PlayerId): void;

  setSettings(patch: Partial<Settings>): void;
  setModes(patch: Partial<Settings['modes']>): void;

  /** Wer kontrolliert die naechste Runde? */
  nextOfficer(): Player | undefined;
  recordRound(result: RoundResult): void;
  /** Neue Partie: Statistik und Rundenzaehler zurueck, Spieler bleiben. */
  resetProgress(): void;
  save(): void;
}

export function createSessionController(
  initial: SessionSnapshot = emptySession(defaultPlayers(5)),
  store: StorageLike | null = storage()
): SessionController {
  const state = createStore<SessionSnapshot>(initial);

  const persist = (): void => saveSession(state.get(), store);

  const patchPlayers = (players: Player[]): void => {
    state.set({ players });
    persist();
  };

  const controller: SessionController = {
    store: state,
    get: () => state.get(),
    players: () => state.get().players,
    settings: () => state.get().settings,

    playerById: (id) => state.get().players.find((p) => p.id === id),

    nameOf(id) {
      return this.playerById(id)?.name ?? id;
    },

    colorOf(id) {
      return this.playerById(id)?.colorId ?? COLOR_IDS[0]!;
    },

    canAddPlayer: () => state.get().players.length < MAX_PLAYERS,
    canRemovePlayer: () => state.get().players.length > MIN_PLAYERS,

    addPlayer() {
      const players = state.get().players;
      if (players.length >= MAX_PLAYERS) return null;

      /* Die erste Farbe, die noch keiner hat — sonst sind zwei Koffer nicht zu trennen. */
      const taken = new Set(players.map((p) => p.colorId));
      const free = COLOR_IDS.find((id) => !taken.has(id)) ?? COLOR_IDS[0]!;
      const color = colorById(free);

      const used = new Set(players.map((p) => p.id));
      let index = players.length + 1;
      while (used.has(`p${index}`)) index += 1;

      const player: Player = {
        id: `p${index}`,
        name: color.nickname,
        colorId: color.id,
        symbol: color.symbol,
      };
      patchPlayers([...players, player]);
      return player;
    },

    removePlayer(id) {
      const players = state.get().players;
      if (players.length <= MIN_PLAYERS) return;
      patchPlayers(players.filter((p) => p.id !== id));
    },

    renamePlayer(id, name) {
      const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
      if (trimmed.length === 0) return;
      patchPlayers(state.get().players.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
    },

    cycleColor(id) {
      const players = state.get().players;
      const player = players.find((p) => p.id === id);
      if (!player) return;

      const taken = new Set(players.filter((p) => p.id !== id).map((p) => p.colorId));
      const start = COLOR_IDS.indexOf(player.colorId);
      for (let step = 1; step <= COLOR_IDS.length; step++) {
        const candidate = COLOR_IDS[(start + step) % COLOR_IDS.length]!;
        if (taken.has(candidate)) continue;
        const color = colorById(candidate);
        patchPlayers(
          players.map((p) => (p.id === id ? { ...p, colorId: color.id, symbol: color.symbol } : p))
        );
        return;
      }
    },

    setSettings(patch) {
      state.set({ settings: { ...state.get().settings, ...patch } });
      persist();
    },

    setModes(patch) {
      const settings = state.get().settings;
      state.set({ settings: { ...settings, modes: { ...settings.modes, ...patch } } });
      persist();
    },

    nextOfficer() {
      const snapshot = state.get();
      if (snapshot.players.length === 0) return undefined;
      return officerFor(snapshot.players, snapshot.roundIndex);
    },

    recordRound(result) {
      const snapshot = state.get();
      state.replace({
        ...pushHistory(snapshot, result.banner),
        stats: applyRound(snapshot.stats, result),
        roundIndex: snapshot.roundIndex + 1,
      });
      persist();
    },

    resetProgress() {
      state.set({ stats: {}, history: [], roundIndex: 0 });
      persist();
    },

    save: persist,
  };

  return controller;
}
