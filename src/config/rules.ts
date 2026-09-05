/**
 * Spielregeln — abgeleitet aus `docs/01-GDD.md §3`.
 * Bei Widerspruechen gewinnt das GDD.
 *
 * CLAUDE.md: **Balancing-Werte stehen nur hier.** Wer eine Zahl aendert, aendert sie an
 * genau einer Stelle; `core/vault.ts` und `core/payout.ts` rechnen nur damit.
 */

/* ------------------------------------------------------------------ */
/* Spieler (GDD §3.1)                                                  */
/* ------------------------------------------------------------------ */

/** ADR-5: Zu zweit ist die Reveal-Reihenfolge trivial und das Dilemma flach. */
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

export const MAX_NAME_LENGTH = 12;

/** Runden-History im localStorage — die Statistik braucht sie (Architektur §4). */
export const MAX_ROUND_HISTORY = 100;

/* ------------------------------------------------------------------ */
/* Tresor-Oekonomie (GDD §3.2)                                         */
/* ------------------------------------------------------------------ */

/**
 * Haerte-Stufen. `cap` ist zugleich der Deckel fuer das Wachstum **und** die
 * Jackpot-Schwelle: Wer den Deckel erreicht und trotzdem teilt, sprengt den Tresor.
 */
export const HARDNESS_LEVELS = [
  { id: 'soft', startVault: 3, growth: 2, cap: 12 },
  { id: 'normal', startVault: 4, growth: 2, cap: 16 },
  { id: 'hard', startVault: 6, growth: 3, cap: 20 },
] as const;

export type Hardness = (typeof HARDNESS_LEVELS)[number]['id'];
export const HARDNESS_IDS = HARDNESS_LEVELS.map((h) => h.id) as readonly Hardness[];

export const DEFAULT_HARDNESS: Hardness = 'normal';

const HARDNESS_BY_ID = new Map<Hardness, (typeof HARDNESS_LEVELS)[number]>(
  HARDNESS_LEVELS.map((h) => [h.id, h])
);

export function hardnessSpec(id: Hardness): (typeof HARDNESS_LEVELS)[number] {
  const found = HARDNESS_BY_ID.get(id);
  if (!found) throw new Error(`Unbekannte Haerte: ${id}`);
  return found;
}

/** Bankgebuehr: In jeder Runde, in der alle teilen, trinkt jeder so viel (GDD §3.2). */
export const BANK_FEE_SIPS = 1;

/**
 * Highroller (GDD §3.7) ueberschreibt die Haerte-Tabelle: mehr Einsatz, schnelleres
 * Wachstum und **kein Deckel** — der Tresor waechst ueber die Jackpot-Schwelle hinaus,
 * bis eine Friedensrunde ihn sprengt.
 */
export const HIGHROLLER = {
  startVault: 6,
  growth: 4,
  jackpotAt: 24,
} as const;

/* ------------------------------------------------------------------ */
/* Modi (GDD §3.7)                                                     */
/* ------------------------------------------------------------------ */

export const MODE_IDS = ['oath', 'mole', 'nightShift', 'highroller', 'witness'] as const;
export type ModeId = (typeof MODE_IDS)[number];

/** Modi sind kombinierbar — deshalb Flags statt eines Enums (GDD §3.7). */
export type Modes = Record<ModeId, boolean>;

export const DEFAULT_MODES: Modes = {
  oath: false,
  mole: false,
  nightShift: false,
  highroller: false,
  witness: false,
};

/** Eid: Wer schwoert und als Alleindieb stiehlt, trinkt so viel selbst (GDD §3.7). */
export const PERJURY_SOLO_SIPS = 2;

/** Eid: Wer schwoert und mit anderen stiehlt, trinkt das Doppelte. */
export const PERJURY_MULTI_FACTOR = 2;

/** Maulwurf: trinkt bei k >= 2 nur die Haelfte (aufgerundet). */
export const MOLE_PENALTY_DIVISOR = 2;

/**
 * Kronzeuge (Backlog nach 1.0): Um welchen Faktor der Verpfeifer seine Strafe senkt.
 *
 * Was er spart, trinkt der Verpfiffene zusaetzlich — der Tresor verliert nichts. Ohne
 * diese Umlage waere Auspacken gratis, und ein Verrat ohne Preis ist keine Entscheidung.
 */
export const WITNESS_DIVISOR = 2;

/** Nachtschicht: Stille statt Verhandlung (GDD §3.7). */
export const NIGHT_SHIFT_SILENCE_SEC = 10;

/* ------------------------------------------------------------------ */
/* Dauern (GDD §3.3 / §4.3)                                            */
/* ------------------------------------------------------------------ */

export const NEGOTIATION_SECONDS = [15, 30, 60] as const;
export type NegotiationSec = (typeof NEGOTIATION_SECONDS)[number];
export const DEFAULT_NEGOTIATION_SEC: NegotiationSec = 30;

/** Letzte 10 s faerbt sich der Ring rot, letzte 5 s tickt er (Art Direction §4.3). */
export const COUNTDOWN_WARN_SEC = 10;
export const COUNTDOWN_TICK_SEC = 5;

/** Kassel redet hoechstens alle 10 s (GDD §3.3). */
export const KASSEL_LINE_INTERVAL_MS = 10_000;

export const REVEAL_PACES = ['short', 'normal', 'long'] as const;
export type RevealPace = (typeof REVEAL_PACES)[number];
export const DEFAULT_REVEAL_PACE: RevealPace = 'normal';

/** Bedenkzeit pro Spieler; 0 = aus. Laeuft sie ab, wird TEILEN gewaehlt (GDD §3.4). */
export const THINK_TIMER_OPTIONS = [0, 5] as const;
export type ThinkTimerSec = (typeof THINK_TIMER_OPTIONS)[number];
export const DEFAULT_THINK_TIMER_SEC: ThinkTimerSec = 0;

/** Tap-Sperre auf dem Pass-Screen, damit niemand versehentlich weiterklickt. */
export const PASS_LOCK_MS = 800;

/* ------------------------------------------------------------------ */
/* Settings (Architektur §4)                                           */
/* ------------------------------------------------------------------ */

export const LOCALES = ['de', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export interface Settings {
  modes: Modes;
  hardness: Hardness;
  negotiationSec: NegotiationSec;
  revealPace: RevealPace;
  thinkTimerSec: ThinkTimerSec;
  sound: boolean;
  music: number;
  haptics: boolean;
  lowEffects: boolean;
  locale: Locale;
}

export const DEFAULT_SETTINGS: Settings = {
  modes: { ...DEFAULT_MODES },
  hardness: DEFAULT_HARDNESS,
  negotiationSec: DEFAULT_NEGOTIATION_SEC,
  revealPace: DEFAULT_REVEAL_PACE,
  thinkTimerSec: DEFAULT_THINK_TIMER_SEC,
  sound: true,
  music: 0.5,
  haptics: true,
  lowEffects: false,
  locale: 'de',
};

/* ------------------------------------------------------------------ */
/* Persistenz (Architektur §4)                                         */
/* ------------------------------------------------------------------ */

export const STORAGE_KEY = 'tresor.session.v1';

/** Einmaliger 18+-Hinweis auf dem Title-Screen (Roadmap M1.2). */
export const STORAGE_KEY_DISCLAIMER = 'tresor.disclaimer.v1';

/** Praefix der Onboarding-Flags — je Hinweis ein Eintrag (Roadmap M5.5). */
export const STORAGE_KEY_ONBOARDING = 'tresor.onboarding.v1';

/** Merker, dass nach der Installation gefragt wurde — genau einmal (Roadmap M6.3). */
export const STORAGE_KEY_INSTALL = 'tresor.install.v1';

/**
 * Vertrauens-Historie ueber mehrere Abende (Backlog nach 1.0).
 *
 * Eigener Schluessel, damit sie einen Session-Reset ueberlebt: Wer die Spieler wechselt,
 * will nicht das Gedaechtnis des Abends verlieren.
 */
export const STORAGE_KEY_HISTORY = 'tresor.history.v1';

/** Wieviele Namen die Historie behaelt. Wer am laengsten nicht spielte, fliegt zuerst. */
export const HISTORY_MAX_PLAYERS = 24;

/** Wieviele Spieltage je Name gemerkt werden. */
export const HISTORY_MAX_DAYS = 60;

/**
 * Ab welcher Runde nach der Installation gefragt wird (Roadmap M6.3).
 *
 * Beim ersten Oeffnen sagt jeder Nein — man weiss ja noch nicht, ob man das Ding behalten
 * will. Nach zwei Runden weiss man es.
 */
export const INSTALL_PROMPT_AFTER_ROUNDS = 2;
