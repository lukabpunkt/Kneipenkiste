/**
 * Vertrauens-Historie über mehrere Abende (Backlog nach 1.0).
 *
 * Die Session-Statistik (GDD §3.8) endet mit dem Abend. Was sie nicht beantwortet, ist
 * die Frage, die nach dem dritten Abend am Tisch fällt: *Wem kann man eigentlich trauen?*
 * Dafür braucht es einen Speicher, der eine neue Runde Spieler überlebt.
 *
 * **Der Schlüssel ist der Name, nicht die ID.** Spieler-IDs entstehen neu, sobald jemand
 * aus der Lobby fliegt und wieder dazukommt — über zwei Abende hinweg wäre damit jeder
 * ein Unbekannter. Der Name ist das einzige Stück Identität, das ohne Konto überlebt.
 * Der Preis steht in ADR-35: Wer sich umbenennt, fängt bei null an, und zwei Marcs an
 * verschiedenen Abenden sind derselbe Marc.
 *
 * **Was hier steht, sind Trinkdaten mit Klarnamen.** Sie liegen ausschliesslich auf
 * diesem Gerät, gehen an niemanden, und die Einstellungen haben einen Knopf, der sie
 * loescht. Kein Backend, keine Analytics (CLAUDE.md).
 */

import { HISTORY_MAX_DAYS, HISTORY_MAX_PLAYERS, STORAGE_KEY_HISTORY } from '@/config/rules';
import type { Player, RoundResult } from './types';

/** Was über einen Namen über alle Abende bekannt ist. */
export interface HistoryEntry {
  name: string;
  /** Kalendertage, an denen dieser Name gespielt hat (ISO, aufsteigend). */
  days: string[];
  /** Runden, in denen er frei entscheiden durfte — Maulwurf-Runden zählen nicht (ADR-7). */
  freeRounds: number;
  shares: number;
  steals: number;
  /** Schlücke insgesamt. */
  sips: number;
  perjuries: number;
}

export type History = Record<string, HistoryEntry>;

export function emptyHistory(): History {
  return {};
}

/** Anteil TEILEN in Prozent, gerundet. `null`, solange es keine freie Runde gab. */
export function trustIndexOf(entry: HistoryEntry): number | null {
  if (entry.freeRounds === 0) return null;
  return Math.round((entry.shares / entry.freeRounds) * 100);
}

/** Wie viele Abende dieser Name mitgespielt hat. */
export function eveningsOf(entry: HistoryEntry): number {
  return entry.days.length;
}

function blank(name: string): HistoryEntry {
  return { name, days: [], freeRounds: 0, shares: 0, steals: 0, sips: 0, perjuries: 0 };
}

/**
 * Trägt eine fertige Runde in die Historie ein.
 *
 * Reine Funktion: Sie bekommt die alte Historie und gibt eine neue zurück. Aufgerufen
 * wird sie an derselben Stelle wie `recordRound()` — sobald die Runde durch ist.
 *
 * `today` kommt von aussen, nicht aus `new Date()` im Rumpf: Sonst wäre die Funktion
 * nicht testbar, und ein Test, der um Mitternacht anders ausgeht, ist kein Test.
 */
export function recordRoundInHistory(
  history: History,
  result: RoundResult,
  players: readonly Player[],
  today: string
): History {
  const next: History = { ...history };

  for (const player of players) {
    const key = normalizeName(player.name);
    if (!key) continue;

    const before = next[key] ?? blank(player.name);
    const entry: HistoryEntry = {
      ...before,
      // Der zuletzt benutzte Name gewinnt — Grossschreibung darf sich ändern.
      name: player.name,
      days: before.days.includes(today) ? before.days : [...before.days, today].slice(-HISTORY_MAX_DAYS),
    };

    for (const drinker of result.drinkers) {
      if (drinker.playerId === player.id) entry.sips += drinker.sips;
    }
    if (result.perjurers.includes(player.id)) entry.perjuries += 1;

    const choice = result.choices[player.id];
    // Erzwungene Diebstähle sind kein Verrat (ADR-7) — genau wie in der Session-Statistik.
    if (choice !== undefined && result.moleId !== player.id) {
      entry.freeRounds += 1;
      if (choice === 'share') entry.shares += 1;
      else entry.steals += 1;
    }

    next[key] = entry;
  }

  return prune(next);
}

/**
 * Hält die Historie klein.
 *
 * Ohne Deckel wächst sie mit jedem Namen, der je am Tisch sass — und das ist auf einem
 * Handy, das ein Trinkspiel speichert, irgendwann viel. Wer am längsten nicht mehr
 * gespielt hat, fliegt zuerst.
 */
function prune(history: History): History {
  const entries = Object.entries(history);
  if (entries.length <= HISTORY_MAX_PLAYERS) return history;

  const lastDay = (entry: HistoryEntry): string => entry.days.at(-1) ?? '';
  const kept = entries
    .sort(([, a], [, b]) => lastDay(b).localeCompare(lastDay(a)))
    .slice(0, HISTORY_MAX_PLAYERS);
  return Object.fromEntries(kept);
}

/** Namen sind der Schlüssel — also ohne Rand und ohne Gross-/Kleinschreibung. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Die Historie in Anzeigereihenfolge: erst die, die am meisten gespielt haben.
 *
 * `onlyNames` beschränkt auf die Leute, die heute am Tisch sitzen — im Ergebnis-Screen
 * interessiert niemanden, wem man vor drei Wochen nicht trauen konnte.
 */
export function historyRanking(history: History, onlyNames?: readonly string[]): HistoryEntry[] {
  const filter = onlyNames ? new Set(onlyNames.map(normalizeName)) : undefined;
  return Object.entries(history)
    .filter(([key]) => !filter || filter.has(key))
    .map(([, entry]) => entry)
    .sort((a, b) => b.freeRounds - a.freeRounds || a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------------ */
/* Persistenz — eigener Schlüssel, überlebt jeden Session-Reset         */
/* ------------------------------------------------------------------ */

export function loadHistory(storage: Storage | undefined = globalThis.localStorage): History {
  if (!storage) return emptyHistory();
  try {
    const raw = storage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return emptyHistory();
    const parsed = JSON.parse(raw) as unknown;
    return hydrate(parsed);
  } catch {
    // Kaputter oder fremder Eintrag: lieber ohne Historie als gar nicht starten.
    return emptyHistory();
  }
}

export function saveHistory(
  history: History,
  storage: Storage | undefined = globalThis.localStorage
): void {
  try {
    storage?.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch {
    // Private Mode / voller Speicher: Der Abend läuft ohne Gedächtnis weiter.
  }
}

export function clearHistory(storage: Storage | undefined = globalThis.localStorage): void {
  try {
    storage?.removeItem(STORAGE_KEY_HISTORY);
  } catch {
    // s. o.
  }
}

/** Nimmt nur an, was aussieht wie ein Eintrag — der Rest fliegt still raus. */
function hydrate(parsed: unknown): History {
  if (!parsed || typeof parsed !== 'object') return emptyHistory();
  const out: History = {};

  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const raw = value as Partial<HistoryEntry>;
    if (typeof raw.name !== 'string') continue;

    out[key] = {
      name: raw.name,
      days: Array.isArray(raw.days) ? raw.days.filter((day) => typeof day === 'string') : [],
      freeRounds: count(raw.freeRounds),
      shares: count(raw.shares),
      steals: count(raw.steals),
      sips: count(raw.sips),
      perjuries: count(raw.perjuries),
    };
  }
  return out;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

/** Heutiges Datum als ISO-Tag. Eigene Funktion, damit Tests sie ersetzen können. */
export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
