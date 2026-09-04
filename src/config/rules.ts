/**
 * Spielregeln — abgeleitet aus `docs/01-GDD.md §3` und `docs/03-ARCHITECTURE.md §5`.
 * Bei Widerspruechen gewinnt das GDD. Balancing laeuft ausschliesslich ueber diese Datei
 * (CLAUDE.md: "alle Farben/Timings/Balancing ueber Tokens").
 */

/* ------------------------------------------------------------------ */
/* Spieler (GDD §3.1)                                                  */
/* ------------------------------------------------------------------ */

/** Bei 3 startet das Spiel nicht — zwei Reisende und ein Beamter sind ein Muenzwurf. */
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;

export const MAX_NAME_LENGTH = 12;

/* ------------------------------------------------------------------ */
/* Packen (GDD §3.2)                                                   */
/* ------------------------------------------------------------------ */

/** 0 = sauber. Die Zahl ist frei waehlbar — das ist der skalierbare Bluff. */
export const MIN_AMOUNT = 0;
export const MAX_AMOUNT = 6;
/** Modus "Hochsaison" hebt die Obergrenze an (GDD §3.7). */
export const MAX_AMOUNT_HIGH_SEASON = 10;

/* ------------------------------------------------------------------ */
/* Kontrolle & Hinweise (GDD §3.3 / §3.4, Architektur §5)              */
/* ------------------------------------------------------------------ */

/**
 * Wie viele Koffer der Beamte oeffnen darf: k(n) = 1 bei 4, 2 bei 5–6, 3 bei 7–8.
 * `n` ist die **Gesamt**-Spielerzahl inklusive Beamtem.
 */
export function baseOpenings(playerCount: number): number {
  if (playerCount <= 4) return 1;
  if (playerCount <= 6) return 2;
  return 3;
}

/** h(n) = floor((n-1)/2), auf [1, 3] geklemmt. */
export const MIN_HINTS = 1;
export const MAX_HINTS = 3;

export function hintCount(playerCount: number): number {
  const raw = Math.floor((playerCount - 1) / 2);
  return Math.min(MAX_HINTS, Math.max(MIN_HINTS, raw));
}

/**
 * Wahrscheinlichkeit, dass ein Hinweis auf einen echten Schmuggler zeigt.
 * Design-Pfeiler 2 ("falsche Sicherheit") haengt an diesem einen Wert — Balancing in M6.
 */
export const HINT_TRUTH_PROBABILITY = 0.6;

export const HINT_TYPES = ['wobble', 'drip', 'heavy', 'click', 'feather', 'dog'] as const;
export type HintType = (typeof HINT_TYPES)[number];

/* ------------------------------------------------------------------ */
/* Trinkwerte & Boni (GDD §3.4 / §3.6)                                 */
/* ------------------------------------------------------------------ */

/** Erwischter Schmuggler trinkt 2 x Menge. */
export const CAUGHT_SIPS_PER_ITEM = 2;
/** Beamter oeffnet einen sauberen Koffer: Belaestigung eines unschuldigen Reisenden. */
export const HARASSMENT_SIPS = 2;
/** Beamter oeffnet den Koffer des Diplomaten. */
export const DIPLOMAT_SIPS = 3;

/** "Beamter des Monats": alle Schmuggler erwischt (und mindestens einer da). */
export const BONUS_ALL_CAUGHT = 2;
/** "Menschenkenntnis": alle durchgewunken und es gab wirklich keinen Schmuggler. */
export const BONUS_GOOD_INSTINCT = 1;

/* ------------------------------------------------------------------ */
/* Modi (GDD §3.7)                                                     */
/* ------------------------------------------------------------------ */

export const GAME_MODES = ['bribery', 'sniffer', 'diplomat', 'highSeason'] as const;
export type GameModeId = (typeof GAME_MODES)[number];

/** Modi sind kombinierbar — anders als bei den Schwesterspielen kein Einzel-Enum. */
export type ModeFlags = Record<GameModeId, boolean>;

export const DEFAULT_MODES: ModeFlags = {
  bribery: false,
  sniffer: false,
  diplomat: false,
  highSeason: false,
};

/** Bestechungsangebot: 1–3 Tokens (GDD §3.7). */
export const MIN_BRIBE = 1;
export const MAX_BRIBE = 3;

/** Spuerhund: verlaesslicher Hinweis, dafuer eine Oeffnung weniger (min 1). */
export const SNIFFER_OPENING_MALUS = 1;
/** Hochsaison: eine Oeffnung mehr. */
export const HIGH_SEASON_OPENING_BONUS = 1;

/* ------------------------------------------------------------------ */
/* Item-Sets (GDD §4.3, ADR-5: ein Set pro Runde)                      */
/* ------------------------------------------------------------------ */

export const ITEM_SETS = [
  'ducks',
  'cheese',
  'gnomes',
  'flamingos',
  'pineapples',
  'sombreros',
  'cuckoo',
  'cacti',
] as const;
export type ItemSet = (typeof ITEM_SETS)[number];

/* ------------------------------------------------------------------ */
/* Timer (GDD §3.2 / §3.3)                                             */
/* ------------------------------------------------------------------ */

export const INTERROGATION_PRESETS = [30, 45, 90] as const;
export type InterrogationSec = (typeof INTERROGATION_PRESETS)[number];
export const DEFAULT_INTERROGATION_SEC: InterrogationSec = 45;

/** Bedenkzeit im Pack-Screen; 0 = aus. Laeuft sie ab, wird 0 (sauber) gepackt. */
export const PACK_TIMER_PRESETS = [0, 10] as const;
export type PackTimerSec = (typeof PACK_TIMER_PRESETS)[number];
export const DEFAULT_PACK_TIMER_SEC: PackTimerSec = 0;

/** Tap-Sperre auf dem Pass-Screen gegen Doppeltaps (wie Drinkshot). */
export const PASS_TAP_LOCK_MS = 800;

/** "Nochmal ansehen" der Hinweise: genau einmal pro Runde (GDD §3.3). */
export const HINT_REPLAY_LIMIT = 1;

/* ------------------------------------------------------------------ */
/* Settings (Architektur §4)                                           */
/* ------------------------------------------------------------------ */

export type Locale = 'de' | 'en';

export interface Settings {
  modes: ModeFlags;
  interrogationSec: InterrogationSec;
  packTimerSec: PackTimerSec;
  sound: boolean;
  music: number;
  haptics: boolean;
  lowEffects: boolean;
  locale: Locale;
}

export const DEFAULT_SETTINGS: Settings = {
  modes: { ...DEFAULT_MODES },
  interrogationSec: DEFAULT_INTERROGATION_SEC,
  packTimerSec: DEFAULT_PACK_TIMER_SEC,
  sound: true,
  music: 0.5,
  haptics: true,
  lowEffects: false,
  locale: 'de',
};

/** localStorage-Keys (Architektur §4). */
export const STORAGE_KEY = 'zoll.session.v1';
export const STORAGE_KEY_ONBOARDING = 'zoll.onboarding.v1';

/** Wie viele Runden die Session-History haelt. */
export const MAX_ROUND_HISTORY = 50;
