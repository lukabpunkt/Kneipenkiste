/**
 * Die Session (Architektur §4): Balkenzahl ueber die Runden, Seil-Verbrauch, Statistik,
 * Persistenz.
 *
 * Die Bruecke lebt hier, nicht in der Runde — sie ueberlebt die Runde ja gerade. Die
 * Statistik arbeitet ausschliesslich auf `RoundResult`, also auf Daten, die am Rundenende
 * ohnehin oeffentlich sind. Nichts Geheimes wird persistiert; der morsche Balken kommt in
 * `stripSecrets()` gar nicht erst mit.
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
import { createBridge } from './bridge';
import { consumeRopes, type RopeUsage } from './modes';
import { createStore, type Store } from './store';
import type { Banner, Bridge, Player, PlayerId, PlayerStats, RoundResult } from './types';

/* ------------------------------------------------------------------ */
/* Statistik (GDD §3.7)                                                */
/* ------------------------------------------------------------------ */

export function emptyStats(): PlayerStats {
  return {
    safeRounds: 0,
    falls: 0,
    sipsDrunk: 0,
    sipsGiven: 0,
    desertions: 0,
    thefts: 0,
    ropesUsed: 0,
    fellWith: {},
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

/**
 * Verrechnet eine abgeschlossene Runde.
 *
 * `fellWith` ist die Zeile, um die es abends wirklich geht: Wer landet immer wieder mit
 * wem auf demselben Balken (GDD §7)?
 */
export function applyRound(stats: StatsMap, result: RoundResult): StatsMap {
  const next: StatsMap = {};
  for (const [id, entry] of Object.entries(stats)) {
    next[id] = { ...entry, fellWith: { ...entry.fellWith } };
  }

  for (const group of result.groups) {
    if (group.collision) {
      for (const playerId of group.players) {
        const entry = ensure(next, playerId);
        entry.falls += 1;
        for (const other of group.players) {
          if (other === playerId) continue;
          entry.fellWith[other] = (entry.fellWith[other] ?? 0) + 1;
        }
      }
      continue;
    }
    /* Wer durch den morschen Balken bricht, stand zwar allein — sicher war er nicht. */
    const soloist = group.players[0]!;
    if (group.rotten) ensure(next, soloist).falls += 1;
    else ensure(next, soloist).safeRounds += 1;
  }

  for (const playerId of result.ropeUsers) ensure(next, playerId).ropesUsed += 1;
  for (const playerId of result.deserters) ensure(next, playerId).desertions += 1;
  for (const theft of result.plankThieves) ensure(next, theft.thief).thefts += 1;
  for (const drinker of result.drinkers) ensure(next, drinker.playerId).sipsDrunk += drinker.sips;
  for (const [playerId, sips] of Object.entries(result.giving)) {
    ensure(next, playerId).sipsGiven += sips;
  }

  return next;
}

export interface Highlight {
  playerId: PlayerId;
  value: number;
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

/** "Bergziege": die meisten Runden allein und trocken. */
export function mountainGoat(stats: StatsMap): Highlight | null {
  return best(stats, (s) => s.safeRounds);
}

/** "Sturzflieger": die meisten Stuerze. */
export function frequentFaller(stats: StatsMap): Highlight | null {
  return best(stats, (s) => s.falls);
}

export interface Pairing {
  a: PlayerId;
  b: PlayerId;
  falls: number;
}

/** Das haeufigste Sturz-Duo der Session — die Pointe des Abends. */
export function topPairing(stats: StatsMap): Pairing | null {
  let winner: Pairing | null = null;
  for (const [a, entry] of Object.entries(stats)) {
    for (const [b, falls] of Object.entries(entry.fellWith)) {
      /* Jedes Paar nur einmal — `fellWith` zaehlt beide Richtungen. */
      if (a >= b) continue;
      if (winner === null || falls > winner.falls) winner = { a, b, falls };
    }
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
  /** Die Bruecke ueberlebt die Runde — hier steht ihr aktueller Zustand. */
  bridge: Bridge;
  ropeUsage: RopeUsage;
  stats: StatsMap;
  history: Banner[];
}

export function emptySession(players: readonly Player[] = []): SessionSnapshot {
  return {
    version: 1,
    players: [...players],
    settings: { ...DEFAULT_SETTINGS, modes: { ...DEFAULT_SETTINGS.modes } },
    roundIndex: 0,
    bridge: createBridge(Math.max(MIN_PLAYERS, players.length)),
    ropeUsage: {},
    stats: {},
    history: [],
  };
}

export function pushHistory(snapshot: SessionSnapshot, banner: Banner): SessionSnapshot {
  return { ...snapshot, history: [...snapshot.history, banner].slice(-MAX_ROUND_HISTORY) };
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

    const players = parsed.players;
    return {
      version: 1,
      players,
      /* Fehlende Felder werden aufgefuellt, damit eine aeltere Session nicht verloren geht. */
      settings: {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
        modes: { ...DEFAULT_SETTINGS.modes, ...parsed.settings?.modes },
      },
      roundIndex: typeof parsed.roundIndex === 'number' ? parsed.roundIndex : 0,
      bridge: parsed.bridge ?? createBridge(Math.max(MIN_PLAYERS, players.length)),
      ropeUsage: parsed.ropeUsage ?? {},
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
/* Session-Controller                                                  */
/* ------------------------------------------------------------------ */

/** Vorschlags-Namen — dieselben Shotling-Namen wie in Drinkshot. */
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
  bridge(): Readonly<Bridge>;
  ropeUsage(): Readonly<RopeUsage>;

  playerById(id: PlayerId): Player | undefined;
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

  /** Nach dem Result: Bruecke uebernehmen, Seile abbuchen, Statistik fortschreiben. */
  recordRound(result: RoundResult): void;
  /** Neue Partie: Statistik, Rundenzaehler, Seile und Bruecke zurueck; Spieler bleiben. */
  resetProgress(): void;
  save(): void;
}

/** Die Bruecke haengt an der Spielerzahl — aendert die sich, wird neu gebaut. */
function bridgeForPlayers(playerCount: number): Bridge {
  return createBridge(Math.max(MIN_PLAYERS, playerCount));
}

export function createSessionController(
  initial: SessionSnapshot = emptySession(defaultPlayers(5)),
  store: StorageLike | null = storage()
): SessionController {
  const state = createStore<SessionSnapshot>(initial);

  const persist = (): void => saveSession(state.get(), store);

  /*
   * Spieler dazu oder weg heisst neue Bruecke: `B = n + 2` haengt an n, und eine halb
   * geschrumpfte Bruecke aus einer Runde mit anderer Besetzung waere schlicht falsch.
   */
  const patchPlayers = (players: Player[]): void => {
    state.set({ players, bridge: bridgeForPlayers(players.length) });
    persist();
  };

  const controller: SessionController = {
    store: state,
    get: () => state.get(),
    players: () => state.get().players,
    settings: () => state.get().settings,
    bridge: () => state.get().bridge,
    ropeUsage: () => state.get().ropeUsage,

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

      /* Die erste freie Farbe — sonst sind zwei Huete auf der Bruecke nicht zu trennen. */
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
      for (let step = 1; step <= COLOR_IDS.length; step += 1) {
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

    recordRound(result) {
      const snapshot = state.get();
      const next = pushHistory(
        {
          ...snapshot,
          bridge: result.nextBridge,
          ropeUsage: consumeRopes(snapshot.ropeUsage, result.choices),
          stats: applyRound(snapshot.stats, result),
          roundIndex: snapshot.roundIndex + 1,
        },
        result.banner
      );
      state.replace(next);
      persist();
    },

    resetProgress() {
      const snapshot = state.get();
      state.replace({
        ...snapshot,
        roundIndex: 0,
        bridge: bridgeForPlayers(snapshot.players.length),
        ropeUsage: {},
        stats: {},
        history: [],
      });
      persist();
    },

    save: persist,
  };

  return controller;
}
