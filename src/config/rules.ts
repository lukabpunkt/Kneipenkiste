/**
 * Spielregeln — abgeleitet aus `docs/01-GDD.md §3` und `docs/03-ARCHITECTURE.md §5`.
 * Bei Widerspruechen gewinnt das GDD. Balancing laeuft ausschliesslich ueber diese Datei
 * (CLAUDE.md: "alles Balancing ueber Tokens"); Aenderungen brauchen einen ADR.
 */

/* ------------------------------------------------------------------ */
/* Spieler (GDD §3.1)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Bei 2 startet das Spiel nicht: Mit `B = n + 2 = 4` Balken fuer zwei Leute ist die
 * Kollision so unwahrscheinlich, dass die Absprache keinen Gegner hat.
 */
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

export const MAX_NAME_LENGTH = 12;

/* ------------------------------------------------------------------ */
/* Die Bruecke (GDD §3.2)                                              */
/* ------------------------------------------------------------------ */

/** Startbreite einer Session: zwei Balken mehr als Spieler. */
export const PLANK_SURPLUS = 2;

/**
 * Untergrenze: ein Balken **weniger** als Spieler. Ab hier ist eine Kollision nach dem
 * Schubfachprinzip garantiert — das ist die Todeszone (ADR-2).
 */
export const PLANK_DEFICIT_MIN = 1;

export function initialPlankCount(playerCount: number): number {
  return playerCount + PLANK_SURPLUS;
}

export function minPlankCount(playerCount: number): number {
  return playerCount - PLANK_DEFICIT_MIN;
}

/* ------------------------------------------------------------------ */
/* Auszahlung (GDD §3.5)                                               */
/* ------------------------------------------------------------------ */

/**
 * Wer auf einem Kollisionsbalken steht, trinkt so viele Schlucke, wie Leute drauf stehen.
 * Der Faktor ist 1 — die Zahl der Mitfallenden *ist* die Strafe.
 */
export const COLLISION_SIPS_PER_PERSON = 1;

/** Wer allein auf dem morschen Balken steht: Pech, ein Schluck. */
export const ROTTEN_SIPS = 1;

/** Gebuehr fuer das Seil (Modus) — der Preis fuer garantierte Sicherheit. */
export const ROPE_FEE_SIPS = 1;

/** Ein sicher stehender Spieler verteilt so viel. */
export const GIVING_SAFE = 1;
/** In der Todeszone ist sicheres Stehen eine Leistung. */
export const GIVING_SAFE_DEATH_ZONE = 2;

/** Ein Fahnenfluechtiger, der stuerzt, trinkt doppelt (Modus "Fahne"). */
export const DESERTER_SIP_FACTOR = 2;
/** Wer einen Balken mit fremder Fahne kapert, verteilt das extra — auch wenn er faellt. */
export const PLANK_THIEF_BONUS = 2;

/**
 * Ab wie vielen Personen auf **einem** Balken aus "Es kracht" ein "Massensturz" wird.
 * Zwei Kollisionsgruppen tun es auch (GDD §3.7).
 */
export const MASS_COLLISION_GROUP_SIZE = 3;
export const MASS_COLLISION_GROUP_COUNT = 2;

/* ------------------------------------------------------------------ */
/* Modi (GDD §3.6)                                                     */
/* ------------------------------------------------------------------ */

export const GAME_MODES = ['flags', 'rotten', 'weights', 'fog', 'rope'] as const;
export type GameModeId = (typeof GAME_MODES)[number];

/** Modi sind frei kombinierbar. */
export type ModeFlags = Record<GameModeId, boolean>;

export const DEFAULT_MODES: ModeFlags = {
  flags: false,
  rotten: false,
  weights: false,
  fog: false,
  rope: false,
};

/** Schwergewicht: Rucksack 1–3. */
export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 3;
export const DEFAULT_WEIGHT = 1;
export type Weight = 1 | 2 | 3;

/** Seil: einmal pro Spieler pro Session. Mehr, und es waere die Standardwahl. */
export const ROPE_USES_PER_SESSION = 1;

/* ------------------------------------------------------------------ */
/* Timer (GDD §3.3 / §3.4)                                             */
/* ------------------------------------------------------------------ */

export const NEGOTIATION_PRESETS = [10, 20, 40] as const;
export type NegotiationSec = (typeof NEGOTIATION_PRESETS)[number];
export const DEFAULT_NEGOTIATION_SEC: NegotiationSec = 20;

/** Modus "Nebel": keine Absprache, nur Stille mit Wind. */
export const FOG_SILENCE_SEC = 10;

/** Bedenkzeit im Choose-Screen; 0 = aus. Laeuft sie ab, waehlt das Spiel zufaellig. */
export const THINK_TIMER_PRESETS = [0, 5] as const;
export type ThinkTimerSec = (typeof THINK_TIMER_PRESETS)[number];
export const DEFAULT_THINK_TIMER_SEC: ThinkTimerSec = 0;

/** Tap-Sperre auf dem Pass-Screen gegen Doppeltaps (wie Drinkshot). */
export const PASS_TAP_LOCK_MS = 800;

/** Sealed-Screen: derselbe Knopfplatz wie "Versiegeln" davor — kurz taub schalten. */
export const SEALED_ARM_MS = 400;

/** Wie lange ein Banner nach dem Schritt stehen bleibt (ms). */
export const BANNER_MS = 2200;

/** Nur die letzten Runden landen in der Result-Historie. */
export const MAX_ROUND_HISTORY = 20;

/* ------------------------------------------------------------------ */
/* Settings (Architektur §4)                                           */
/* ------------------------------------------------------------------ */

export type Locale = 'de' | 'en';

export const PACE_PRESETS = ['short', 'normal', 'long'] as const;
export type Pace = (typeof PACE_PRESETS)[number];

export interface Settings {
  modes: ModeFlags;
  negotiationSec: NegotiationSec;
  thinkTimerSec: ThinkTimerSec;
  pace: Pace;
  sound: boolean;
  music: number;
  haptics: boolean;
  lowEffects: boolean;
  locale: Locale;
}

export const DEFAULT_SETTINGS: Settings = {
  modes: { ...DEFAULT_MODES },
  negotiationSec: DEFAULT_NEGOTIATION_SEC,
  thinkTimerSec: DEFAULT_THINK_TIMER_SEC,
  pace: 'normal',
  sound: true,
  music: 0.6,
  haptics: true,
  lowEffects: false,
  locale: 'de',
};

export const STORAGE_KEY = 'haengebruecke.session.v1';
