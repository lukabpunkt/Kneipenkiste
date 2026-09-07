/**
 * Spielregeln — abgeleitet aus `docs/01-GDD.md §3`.
 * Bei Widerspruechen gewinnt das GDD.
 *
 * CLAUDE.md: **Balancing-Werte stehen nur hier.** Wer eine Zahl aendert, aendert sie an
 * genau einer Stelle; `core/board.ts`, `core/payout.ts` und `core/turn.ts` rechnen nur damit.
 */

/* ------------------------------------------------------------------ */
/* Spieler (GDD §3.1)                                                  */
/* ------------------------------------------------------------------ */

/** Zu zweit weisst du immer, wer die Mine gelegt hat — dann gibt es kein Ratespiel. */
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

export const MAX_NAME_LENGTH = 12;

/** Runden-History im localStorage — die Session-Statistik braucht sie (Architektur §4). */
export const MAX_ROUND_HISTORY = 100;

/* ------------------------------------------------------------------ */
/* Das Feld (GDD §3.2)                                                 */
/* ------------------------------------------------------------------ */

export type BoardSize = 5 | 6;

/**
 * Ab dieser Spielerzahl wird das Feld gross. Grund (GDD §7): 8 Spieler × 2 Minen auf
 * 5 × 5 waeren 16 von 25 Feldern vermint — unspielbar.
 */
export const BIG_BOARD_FROM_PLAYERS = 6;

export function boardSizeFor(playerCount: number): BoardSize {
  return playerCount < BIG_BOARD_FROM_PLAYERS ? 5 : 6;
}

export function cellCount(size: BoardSize): number {
  return size * size;
}

/** Wieviele Sprengkoerper jeder Spieler vergraebt — in jedem Modus zwei (GDD §3.3). */
export const MINES_PER_PLAYER = 2;

/**
 * Doppelagent: einer davon ist ein Blindgaenger (GDD §3.6). Die Summe bleibt
 * `MINES_PER_PLAYER`, damit sich die Feld-Belegung zwischen den Modi nicht aendert.
 */
export const DOUBLE_AGENT_LOADOUT = { mine: 1, dud: 1 } as const;

/** Was ein Spieler in diesem Modus vergraebt. */
export function loadoutFor(modes: Modes): { mine: number; dud: number } {
  return modes.doubleAgent ? { ...DOUBLE_AGENT_LOADOUT } : { mine: MINES_PER_PLAYER, dud: 0 };
}

/* ------------------------------------------------------------------ */
/* Hinweise (GDD §3.4, ADR-3)                                          */
/* ------------------------------------------------------------------ */

export const HINTS = ['hot', 'warm', 'cold', 'none'] as const;
export type Hint = (typeof HINTS)[number];

/**
 * Chebyshev-Abstand zur naechsten Kiste (Koenigszuege). Bewusst unscharf: exakte Zahlen
 * wuerden die Kiste in zwei Zuegen findbar machen (ADR-3), drei Stufen halten die Runde
 * bei 4-8 Grabungen.
 */
export const HINT_THRESHOLDS = { hot: 1, warm: 2 } as const;

export function hintForDistance(distance: number): Hint {
  if (distance <= HINT_THRESHOLDS.hot) return 'hot';
  if (distance <= HINT_THRESHOLDS.warm) return 'warm';
  return 'cold';
}

/* ------------------------------------------------------------------ */
/* Auszahlung (GDD §3.4 / §3.5)                                        */
/* ------------------------------------------------------------------ */

/** Schluecke, die der Graeber pro **fremder** Mine trinkt. */
export const SIPS_PER_FOREIGN_MINE = 2;

/** Verteil-Tokens, die jeder Leger einer ausgeloesten Mine bekommt. */
export const TOKENS_PER_LAYER = 1;

/** Tokens fuer den Kistenfund — auf dem grossen Feld wird laenger gegraben, also mehr. */
export const TREASURE_TOKENS: Record<BoardSize, number> = { 5: 4, 6: 6 };

/** Zwei Kisten: je halbe Tokens (GDD §3.6), damit die Runde nicht doppelt auszahlt. */
export const TWO_CHESTS_TOKENS: Record<BoardSize, number> = { 5: 2, 6: 3 };

export function treasureTokens(size: BoardSize, modes: Modes): number {
  return modes.twoChests ? TWO_CHESTS_TOKENS[size] : TREASURE_TOKENS[size];
}

/** Wieviele Kisten diese Runde vergraben werden. */
export function chestCount(modes: Modes): number {
  return modes.twoChests ? 2 : 1;
}

/* ------------------------------------------------------------------ */
/* Modi (GDD §3.6)                                                     */
/* ------------------------------------------------------------------ */

export const MODE_IDS = [
  'doubleAgent',
  'nightDigger',
  'twoChests',
  'chainReaction',
  'masterBonus',
] as const;
export type ModeId = (typeof MODE_IDS)[number];

/** Modi sind kombinierbar — deshalb Flags statt eines Enums (GDD §3.6). */
export type Modes = Record<ModeId, boolean>;

export const DEFAULT_MODES: Modes = {
  doubleAgent: false,
  nightDigger: false,
  twoChests: false,
  chainReaction: false,
  masterBonus: false,
};

/** Kettenreaktion: die 8 Koenigsnachbarn fliegen mit hoch (GDD §3.6). */
export const CHAIN_NEIGHBOURS = 8;

/** Sprengmeister-Bonus: ab so vielen **verschiedenen** Opfern gibt es das Extra-Token. */
export const MASTER_BONUS_VICTIMS = 2;
export const MASTER_BONUS_TOKENS = 1;

/** Sprengmeister-Bonus: Wer alle eigenen Sprengkoerper selbst als Trittstein nutzt, trinkt so viel. */
export const COWARD_SIPS = 1;

/* ------------------------------------------------------------------ */
/* Timer (GDD §3.3 / §3.4)                                             */
/* ------------------------------------------------------------------ */

/** Bedenkzeit auf dem Place-Screen; 0 = aus. Laeuft sie ab, werden Minen zufaellig gesetzt. */
export const PLACE_TIMER_OPTIONS = [0, 10] as const;
export type PlaceTimerSec = (typeof PLACE_TIMER_OPTIONS)[number];
export const DEFAULT_PLACE_TIMER_SEC: PlaceTimerSec = 0;

/** Bedenkzeit pro Zug in der Grabphase; 0 = aus. Laeuft sie ab, wird zufaellig gegraben. */
export const DIG_TIMER_OPTIONS = [0, 10] as const;
export type DigTimerSec = (typeof DIG_TIMER_OPTIONS)[number];
export const DEFAULT_DIG_TIMER_SEC: DigTimerSec = 0;

/** Letzte Sekunden faerbt sich der Ring rot bzw. tickt (Art Direction §4.2). */
export const COUNTDOWN_WARN_SEC = 5;
export const COUNTDOWN_TICK_SEC = 3;

/** Tap-Sperre auf dem Pass-Screen, damit niemand versehentlich weiterklickt. */
export const PASS_LOCK_MS = 800;

/* ------------------------------------------------------------------ */
/* Settings (Architektur §4)                                           */
/* ------------------------------------------------------------------ */

export const LOCALES = ['de', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export interface Settings {
  modes: Modes;
  placeTimerSec: PlaceTimerSec;
  digTimerSec: DigTimerSec;
  sound: boolean;
  music: number;
  haptics: boolean;
  lowEffects: boolean;
  locale: Locale;
}

export const DEFAULT_SETTINGS: Settings = {
  modes: { ...DEFAULT_MODES },
  placeTimerSec: DEFAULT_PLACE_TIMER_SEC,
  digTimerSec: DEFAULT_DIG_TIMER_SEC,
  sound: true,
  music: 0.5,
  haptics: true,
  lowEffects: false,
  locale: 'de',
};

/* ------------------------------------------------------------------ */
/* Persistenz (Architektur §4)                                         */
/* ------------------------------------------------------------------ */

export const STORAGE_KEY = 'sprengmeister.session.v1';

/** Einmaliger 18+-Hinweis auf dem Title-Screen (Roadmap M1.2). */
export const STORAGE_KEY_DISCLAIMER = 'sprengmeister.disclaimer.v1';

/** Praefix der Onboarding-Flags — je Hinweis ein Eintrag (Roadmap M5.4). */
export const STORAGE_KEY_ONBOARDING = 'sprengmeister.onboarding.v1';
