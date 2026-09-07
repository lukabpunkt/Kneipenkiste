/**
 * Session: Spieler, Runden-Historie, Scoreboard und die Statistik, die das Spiel
 * ueber die einzelne Runde hinaus traegt (GDD §3.7).
 *
 * Hier faellt keine Entscheidung — `board.ts` entscheidet, `payout.ts` rechnet, dieses
 * Modul fuehrt Buch. Der Grund, warum es die Statistik ueberhaupt gibt (GDD §7): Das
 * Spiel produziert Feindschaften, und die Statistik gibt ihnen Namen.
 */

import {
  DEFAULT_SETTINGS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MAX_ROUND_HISTORY,
  MIN_PLAYERS,
  STORAGE_KEY,
  boardSizeFor,
  type BoardSize,
  type Modes,
  type Settings,
} from '@/config/rules';
import { COLOR_IDS, VEST_CHANCE, type ColorId } from '@/config/theme';
import { totalSips } from './payout';
import { createId, secureRandomFloat } from './rng';
import { createStore, type Unsubscribe } from './store';
import type { Player, PlayerId, RoundResult, Session } from './types';

/* ------------------------------------------------------------------ */
/* Session anlegen                                                     */
/* ------------------------------------------------------------------ */

export function createEmptySession(settings: Settings = DEFAULT_SETTINGS): Session {
  return { players: [], settings: cloneSettings(settings), rounds: [], roundIndex: 0 };
}

export function createPlayer(
  name: string,
  colorId: ColorId,
  vest = secureRandomFloat() < VEST_CHANCE
): Player {
  return {
    id: createId(),
    name: name.trim().slice(0, MAX_NAME_LENGTH),
    colorId,
    outfit: { helmet: true, vest },
  };
}

/** Die erste noch freie Spielerfarbe — Lobby-Komfort (M1.2). */
export function nextFreeColor(players: readonly Player[]): ColorId | undefined {
  const used = new Set(players.map((p) => p.colorId));
  return COLOR_IDS.find((id) => !used.has(id));
}

export function canStart(session: Pick<Session, 'players'>): boolean {
  return session.players.length >= MIN_PLAYERS && session.players.length <= MAX_PLAYERS;
}

/** Die Feldgroesse, die diese Runde bekommt (GDD §3.2) — die Lobby zeigt sie an. */
export function sessionBoardSize(session: Pick<Session, 'players'>): BoardSize {
  return boardSizeFor(session.players.length);
}

/** Traegt eine fertige Runde ein. */
export function commitRound(session: Session, result: RoundResult): Session {
  const rounds = [...session.rounds, result].slice(-MAX_ROUND_HISTORY);
  return { ...session, rounds, roundIndex: result.index };
}

/* ------------------------------------------------------------------ */
/* Statistik (GDD §3.7)                                                */
/* ------------------------------------------------------------------ */

export interface PlayerStats {
  playerId: PlayerId;
  /** Schluecke insgesamt (sofort getrunken + zugeteilt) — das Scoreboard. */
  sips: number;
  /** Wie oft eigene Minen jemanden erwischt haben. */
  blastsCaused: number;
  /** Wie oft man selbst in eine fremde Mine getreten ist. */
  blastsTaken: number;
  /** Gefundene Kisten. */
  chestsFound: number;
  /** Wie oft man den eigenen Trittstein benutzt hat — der heimliche Teil des Spiels. */
  steppingStonesUsed: number;
  /** Grabungen insgesamt. */
  digs: number;
}

export function sessionStats(session: Session): PlayerStats[] {
  return session.players.map((player) => statsFor(session, player.id));
}

export function statsFor(session: Session, playerId: PlayerId): PlayerStats {
  let sips = 0;
  let blastsCaused = 0;
  let blastsTaken = 0;
  let chestsFound = 0;
  let steppingStonesUsed = 0;
  let digs = 0;

  for (const round of session.rounds) {
    sips += totalSips(round)[playerId] ?? 0;
    for (const kill of round.kills) {
      if (kill.layer === playerId) blastsCaused += 1;
      if (kill.victim === playerId) blastsTaken += 1;
    }
    for (const finder of round.finderIds) {
      if (finder === playerId) chestsFound += 1;
    }
    for (const dig of round.digs) {
      if (dig.by !== playerId) continue;
      digs += 1;
      if (dig.ownMineConsumed) steppingStonesUsed += 1;
      if (dig.ownDudConsumed) steppingStonesUsed += 1;
    }
  }

  return { playerId, sips, blastsCaused, blastsTaken, chestsFound, steppingStonesUsed, digs };
}

/** Scoreboard: getrunkene Schluecke pro Spieler. */
export function scoreboard(session: Session): Record<PlayerId, number> {
  const out: Record<PlayerId, number> = {};
  for (const player of session.players) out[player.id] = 0;
  for (const round of session.rounds) {
    for (const [playerId, sips] of Object.entries(totalSips(round))) {
      out[playerId] = (out[playerId] ?? 0) + sips;
    }
  }
  return out;
}

/**
 * Bei Gleichstand gewinnt der erste in der Spielerliste; ohne Treffer `undefined`.
 * Beide Titel sind bewusst gegenlaeufig: Der eine sammelt Mitleid, der andere Respekt.
 */
function leaderBy(session: Session, pick: (stats: PlayerStats) => number): PlayerId | undefined {
  let best: PlayerId | undefined;
  let bestValue = 0;
  for (const stats of sessionStats(session)) {
    const value = pick(stats);
    if (value > bestValue) {
      best = stats.playerId;
      bestValue = value;
    }
  }
  return best;
}

/** "Meistgesprengt": Wer ist am oeftesten in eine fremde Mine getreten. */
export function mostBlasted(session: Session): PlayerId | undefined {
  return leaderBy(session, (s) => s.blastsTaken);
}

/** "Gefaehrlichster Leger": Wessen Minen haben am oeftesten getroffen. */
export function deadliestLayer(session: Session): PlayerId | undefined {
  return leaderBy(session, (s) => s.blastsCaused);
}

/* ------------------------------------------------------------------ */
/* Persistenz (Architektur §4)                                         */
/* ------------------------------------------------------------------ */

export function loadSession(storage: Storage | undefined = globalThis.localStorage): Session {
  const fallback = createEmptySession();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return hydrate(JSON.parse(raw) as Partial<Session>, fallback);
  } catch {
    // Kaputter oder fremder Eintrag: lieber frisch anfangen als abstuerzen.
    return fallback;
  }
}

export function saveSession(
  session: Session,
  storage: Storage | undefined = globalThis.localStorage
): void {
  if (!storage) return;
  try {
    const trimmed: Session = { ...session, rounds: session.rounds.slice(-MAX_ROUND_HISTORY) };
    storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Private Mode / voller Speicher: Das Spiel laeuft ohne Persistenz weiter.
  }
}

export function clearSession(storage: Storage | undefined = globalThis.localStorage): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // s. o.
  }
}

/* ------------------------------------------------------------------ */
/* SessionStore — der Zustand, den sich alle Screens teilen            */
/* ------------------------------------------------------------------ */

export interface SessionStore {
  readonly state: Readonly<Session>;
  subscribe(listener: (session: Readonly<Session>) => void): Unsubscribe;

  /** Naechste freie Farbe, Default-Name. `null`, wenn schon acht auf der Bank sitzen. */
  addPlayer(nameFor: (index: number) => string): Player | null;
  removePlayer(id: PlayerId): void;
  renamePlayer(id: PlayerId, name: string): void;
  /** Fuellt bis `MIN_PLAYERS` auf — beim ersten Start der App. */
  ensureMinimumPlayers(nameFor: (index: number) => string): void;
  playerById(id: PlayerId): Player | undefined;

  setSettings(patch: Partial<Settings>): void;
  setModes(patch: Partial<Modes>): void;

  recordRound(result: RoundResult): void;

  canStart(): boolean;
  boardSize(): BoardSize;
  scoreboard(): Record<PlayerId, number>;
  stats(): PlayerStats[];

  /** Runden zuruecksetzen; Spieler und Settings bleiben. */
  resetRounds(): void;
  /** Alles zurueck auf Werkszustand. */
  reset(): void;
}

/**
 * Store mit Persistenz. Jede Aenderung landet sofort im `localStorage` — wer das Handy
 * mitten in der Runde sperrt, findet die Session danach wieder.
 */
export function createSessionStore(
  initial: Session = loadSession(),
  storage: Storage | undefined = globalThis.localStorage
): SessionStore {
  const store = createStore<Session>(initial);

  const commit = (patch: Partial<Session>): void => {
    store.set(patch);
    saveSession(store.get(), storage);
  };

  const api: SessionStore = {
    get state() {
      return store.get();
    },

    subscribe(listener) {
      return store.subscribe((session) => listener(session));
    },

    addPlayer(nameFor) {
      const players = store.get().players;
      if (players.length >= MAX_PLAYERS) return null;
      const colorId = nextFreeColor(players) ?? COLOR_IDS[0]!;
      // Die Warnweste wird einmal gewuerfelt und bleibt dann — kein Garderobenwechsel je Runde.
      const player = createPlayer(nameFor(players.length + 1), colorId);
      commit({ players: [...players, player] });
      return player;
    },

    removePlayer(id) {
      commit({ players: store.get().players.filter((player) => player.id !== id) });
    },

    renamePlayer(id, name) {
      const trimmed = name.slice(0, MAX_NAME_LENGTH);
      commit({
        players: store
          .get()
          .players.map((player) => (player.id === id ? { ...player, name: trimmed } : player)),
      });
    },

    ensureMinimumPlayers(nameFor) {
      while (store.get().players.length < MIN_PLAYERS) {
        if (api.addPlayer(nameFor) === null) break;
      }
    },

    playerById(id) {
      return store.get().players.find((player) => player.id === id);
    },

    setSettings(patch) {
      commit({ settings: { ...store.get().settings, ...patch } });
    },

    setModes(patch) {
      api.setSettings({ modes: { ...store.get().settings.modes, ...patch } });
    },

    recordRound(result) {
      commit(commitRound(store.get(), result));
    },

    canStart() {
      return canStart(store.get());
    },

    boardSize() {
      return sessionBoardSize(store.get());
    },

    scoreboard() {
      return scoreboard(store.get());
    },

    stats() {
      return sessionStats(store.get());
    },

    resetRounds() {
      commit({ rounds: [], roundIndex: 0 });
    },

    reset() {
      store.replace(createEmptySession());
      saveSession(store.get(), storage);
    },
  };

  return api;
}

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

function cloneSettings(settings: Settings): Settings {
  return { ...settings, modes: { ...settings.modes } };
}

/** Baut aus einem gespeicherten Objekt eine gueltige Session — fehlende Felder ergaenzt. */
function hydrate(parsed: Partial<Session>, fallback: Session): Session {
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(parsed.settings ?? {}),
    modes: { ...DEFAULT_SETTINGS.modes, ...(parsed.settings?.modes ?? {}) },
  };
  const players = Array.isArray(parsed.players) ? parsed.players.slice(0, MAX_PLAYERS) : [];
  const rounds = Array.isArray(parsed.rounds) ? parsed.rounds.slice(-MAX_ROUND_HISTORY) : [];
  const roundIndex =
    typeof parsed.roundIndex === 'number' && Number.isFinite(parsed.roundIndex) ? parsed.roundIndex : 0;

  return { ...fallback, players, settings, rounds, roundIndex };
}
