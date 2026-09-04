/**
 * Session: Spieler, Runden-Historie, Scoreboard und die Statistik, die das Spiel
 * eigentlich interessant macht (GDD §3.8, §7).
 *
 * Hier faellt keine Entscheidung — `payout.ts` rechnet, dieses Modul buchfuehrt.
 *
 * Der **Vertrauens-Index** ist der Grund, warum man das Spiel ein zweites Mal spielt:
 * Er produziert Charakterprofile der Freunde. Damit er ehrlich bleibt, zaehlen
 * erzwungene Diebstaehle nicht mit — wer als Maulwurf stehlen *musste*, hat niemanden
 * verraten (ADR-7).
 */

import {
  DEFAULT_SETTINGS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MAX_ROUND_HISTORY,
  MIN_PLAYERS,
  STORAGE_KEY,
  type Modes,
  type Settings,
} from '@/config/rules';
import { COLOR_IDS, type ColorId } from '@/config/theme';
import { createId } from './rng';
import { createStore, type Unsubscribe } from './store';
import { vaultSpec } from './vault';
import type { Player, PlayerId, RoundResult, Session } from './types';

/* ------------------------------------------------------------------ */
/* Session anlegen                                                     */
/* ------------------------------------------------------------------ */

export function createEmptySession(settings: Settings = DEFAULT_SETTINGS): Session {
  const merged = cloneSettings(settings);
  return {
    players: [],
    settings: merged,
    rounds: [],
    vault: vaultSpec(merged).startVault,
  };
}

export function createPlayer(name: string, colorId: ColorId, stripes = false): Player {
  return {
    id: createId(),
    name: name.trim().slice(0, MAX_NAME_LENGTH),
    colorId,
    outfit: { mask: true, stripes },
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

/** Trägt eine fertige Runde ein und setzt den Tresor auf den Folgestand. */
export function commitRound(session: Session, result: RoundResult): Session {
  const rounds = [...session.rounds, result].slice(-MAX_ROUND_HISTORY);
  return { ...session, rounds, vault: result.nextVault };
}

/* ------------------------------------------------------------------ */
/* Statistik (GDD §3.8)                                                */
/* ------------------------------------------------------------------ */

export interface PlayerStats {
  playerId: PlayerId;
  /** Schluecke insgesamt — das Scoreboard. */
  sips: number;
  /** Runden, in denen der Spieler frei entscheiden durfte (ohne Maulwurf-Runden). */
  freeRounds: number;
  shares: number;
  steals: number;
  /** Anteil TEILEN in Prozent (0-100), gerundet. `null`, solange es keine freie Runde gab. */
  trustIndex: number | null;
  /** Wie oft er in Folge zuletzt gestohlen hat. */
  currentBetrayalStreak: number;
  longestBetrayalStreak: number;
  /** Meineide insgesamt. */
  perjuries: number;
  /** Schluecke, die ihm ein Alleindieb zugeteilt hat — das Mass fuer "betrogen". */
  betrayedSips: number;
}

/**
 * Statistik ueber die ganze Session, in der Reihenfolge von `session.players`.
 * Spieler, die erst spaeter dazukamen, haben entsprechend weniger Runden.
 */
export function sessionStats(session: Session): PlayerStats[] {
  return session.players.map((player) => statsFor(session, player.id));
}

export function statsFor(session: Session, playerId: PlayerId): PlayerStats {
  let sips = 0;
  let freeRounds = 0;
  let shares = 0;
  let steals = 0;
  let perjuries = 0;
  let betrayedSips = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  for (const round of session.rounds) {
    for (const drinker of round.drinkers) {
      if (drinker.playerId !== playerId) continue;
      sips += drinker.sips;
      if (drinker.reason === 'distributed') betrayedSips += drinker.sips;
    }

    if (round.perjurers.includes(playerId)) perjuries += 1;

    const choice = round.choices[playerId];
    if (choice === undefined) continue;

    // Erzwungene Diebstaehle sind kein Verrat (ADR-7).
    if (round.moleId === playerId) continue;

    freeRounds += 1;
    if (choice === 'share') {
      shares += 1;
      currentStreak = 0;
    } else {
      steals += 1;
      currentStreak += 1;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    }
  }

  return {
    playerId,
    sips,
    freeRounds,
    shares,
    steals,
    trustIndex: freeRounds === 0 ? null : Math.round((shares / freeRounds) * 100),
    currentBetrayalStreak: currentStreak,
    longestBetrayalStreak: longestStreak,
    perjuries,
    betrayedSips,
  };
}

/** Scoreboard: getrunkene Schluecke pro Spieler. */
export function scoreboard(session: Session): Record<PlayerId, number> {
  const out: Record<PlayerId, number> = {};
  for (const player of session.players) out[player.id] = 0;
  for (const round of session.rounds) {
    for (const drinker of round.drinkers) {
      out[drinker.playerId] = (out[drinker.playerId] ?? 0) + drinker.sips;
    }
  }
  return out;
}

/**
 * "Meistbetrogen": Wem haben Alleindiebe die meisten Schluecke aufgedrueckt.
 * Bei Gleichstand gewinnt der erste in der Spielerliste; ohne Verteilung: `undefined`.
 */
export function mostBetrayed(session: Session): PlayerId | undefined {
  let best: PlayerId | undefined;
  let bestSips = 0;
  for (const stats of sessionStats(session)) {
    if (stats.betrayedSips > bestSips) {
      best = stats.playerId;
      bestSips = stats.betrayedSips;
    }
  }
  return best;
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
    const parsed = JSON.parse(raw) as Partial<Session>;
    return hydrate(parsed, fallback);
  } catch {
    // Kaputter oder fremder Eintrag: lieber frisch anfangen als abstuerzen.
    return fallback;
  }
}

export function saveSession(session: Session, storage: Storage | undefined = globalThis.localStorage): void {
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

  /** Naechste freie Farbe, Default-Name. `null`, wenn schon acht am Tisch sitzen. */
  addPlayer(nameFor: (index: number) => string): Player | null;
  removePlayer(id: PlayerId): void;
  renamePlayer(id: PlayerId, name: string): void;
  /** Fuellt bis `MIN_PLAYERS` auf — beim ersten Start der App. */
  ensureMinimumPlayers(nameFor: (index: number) => string): void;
  playerById(id: PlayerId): Player | undefined;

  setSettings(patch: Partial<Settings>): void;
  setModes(patch: Partial<Modes>): void;

  /** Traegt eine fertige Runde ein und uebernimmt `nextVault`. */
  recordRound(result: RoundResult): void;
  /** Tresorstand direkt setzen — z. B. wenn die Haerte in der Lobby wechselt. */
  setVault(vault: number): void;

  canStart(): boolean;
  scoreboard(): Record<PlayerId, number>;
  stats(): PlayerStats[];

  /** Runden und Tresor zuruecksetzen; Spieler und Settings bleiben. */
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
      // Die Haelfte traegt Ringelshirt (Art Direction §5) — hier einmal gewuerfelt und
      // dann fest, damit ein Spieler nicht jede Runde die Garderobe wechselt.
      const player = createPlayer(nameFor(players.length + 1), colorId, players.length % 2 === 1);
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
      const settings: Settings = { ...store.get().settings, ...patch };
      commit({ settings });
      // Haerte oder Highroller geaendert und noch keine Runde gespielt: Der Tresor
      // startet mit dem neuen V_0, statt einen Stand aus der alten Einstellung zu behalten.
      if (store.get().rounds.length === 0) commit({ vault: vaultSpec(settings).startVault });
    },

    setModes(patch) {
      api.setSettings({ modes: { ...store.get().settings.modes, ...patch } });
    },

    recordRound(result) {
      commit(commitRound(store.get(), result));
    },

    setVault(vault) {
      commit({ vault });
    },

    canStart() {
      return canStart(store.get());
    },

    scoreboard() {
      return scoreboard(store.get());
    },

    stats() {
      return sessionStats(store.get());
    },

    resetRounds() {
      commit({ rounds: [], vault: vaultSpec(store.get().settings).startVault });
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
  const vault =
    typeof parsed.vault === 'number' && Number.isFinite(parsed.vault)
      ? parsed.vault
      : vaultSpec(settings).startVault;

  return { ...fallback, players, settings, rounds, vault };
}
