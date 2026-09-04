/**
 * Design-Tokens — abgeleitet aus `docs/02-ART-DIRECTION.md`.
 * Einzige Quelle fuer Farben, Motion und Typo-Skala im TS-Code.
 * Das CSS-Pendant liegt in `src/styles/tokens.css` und muss synchron bleiben
 * (`tests/unit/config.test.ts` prueft das automatisch).
 */

/* ------------------------------------------------------------------ */
/* Spielerfarben (Art Direction §2 / GDD §3.1) — identisch zu Drinkshot */
/* ------------------------------------------------------------------ */

export const PLAYER_COLORS = [
  { id: 'red', hex: 0xff4757, shade: 0xc0392b, symbol: 'circle', nickname: 'Rudi' },
  { id: 'blue', hex: 0x3b82f6, shade: 0x1e5bb8, symbol: 'triangle', nickname: 'Blue' },
  { id: 'green', hex: 0x2ed573, shade: 0x1e9e52, symbol: 'square', nickname: 'Gustav' },
  { id: 'yellow', hex: 0xffd32a, shade: 0xd4a800, symbol: 'star', nickname: 'Yoshi' },
  { id: 'purple', hex: 0xaf73ee, shade: 0x7b3fbf, symbol: 'diamond', nickname: 'Lilo' },
  { id: 'orange', hex: 0xff7f50, shade: 0xcc5a2e, symbol: 'heart', nickname: 'Olli' },
  { id: 'pink', hex: 0xff6b9d, shade: 0xc94a78, symbol: 'bolt', nickname: 'Pinky' },
  { id: 'cyan', hex: 0x18dcff, shade: 0x0fa6c2, symbol: 'cross', nickname: 'Turbo' },
] as const;

export type ColorId = (typeof PLAYER_COLORS)[number]['id'];
export type SymbolId = (typeof PLAYER_COLORS)[number]['symbol'];

export const COLOR_IDS = PLAYER_COLORS.map((c) => c.id) as readonly ColorId[];

const COLOR_BY_ID = new Map<ColorId, (typeof PLAYER_COLORS)[number]>(PLAYER_COLORS.map((c) => [c.id, c]));

export function colorById(id: ColorId): (typeof PLAYER_COLORS)[number] {
  const found = COLOR_BY_ID.get(id);
  if (!found) throw new Error(`Unbekannte ColorId: ${id}`);
  return found;
}

/** Auf Gelb, Cyan und Gruen steht `ink`, sonst `paper` (Kontrastregel Art Direction §2). */
const DARK_TEXT_COLORS: readonly ColorId[] = ['yellow', 'cyan', 'green'];

export function textColorOn(id: ColorId): number {
  return DARK_TEXT_COLORS.includes(id) ? UI_COLORS.ink : UI_COLORS.paper;
}

/* ------------------------------------------------------------------ */
/* UI-Farben (Art Direction §2)                                        */
/* ------------------------------------------------------------------ */

export const UI_COLORS = {
  /** App-Hintergrund ausserhalb des Feldes — die Menues bleiben dunkel wie in der Familie. */
  bgDeep: 0x0f0e1a,
  bgPanel: 0x1c1b2e,
  bgPanelRaised: 0x2a2842,
  paper: 0xfff8e7,
  ink: 0x1a1024,

  /** Primary CTA, Bauhelm, Warnstreifen. */
  hazard: 0xffb800,
  hazardShade: 0xd18e00,

  /** Die Wiese, auf der das ganze Unglueck passiert. */
  grass: 0x7ed957,
  grassDark: 0x5cb342,

  /** Erdplatte: Oberseite, 3D-Kante, offenes Loch. */
  plateTop: 0xb98352,
  plateSide: 0x8c5e33,
  plateHole: 0x4a2e17,

  /** Krater-Inneres und Russ (Russ = ink mit SOOT_ALPHA). */
  crater: 0x2b1b10,
  soot: 0x1a1024,

  /** Kiste, Konfetti, Fanfare-Glow. */
  treasure: 0xffd32a,

  /** Rauch (Alpha 0.9 → 0). */
  smoke: 0xd9d4e3,
} as const;

/** Russ liegt als `ink` mit dieser Deckkraft ueber Gesicht und Torso (Art Direction §2). */
export const SOOT_ALPHA = 0.85;

/* ------------------------------------------------------------------ */
/* Temperatur-Hinweise (Art Direction §2)                              */
/* ------------------------------------------------------------------ */

/**
 * `hot` ist derselbe Farbwert wie Spielerfarbe Rot, `cold` derselbe wie Tuerkis.
 * Damit das nicht kollidiert, sind Temperatur-Symbole **immer Icons auf hellem Kreis**
 * (`paper` mit `ink`-Outline), Spielerfarben dagegen **immer Ringe/Badges mit Symbol** —
 * zwei Formensprachen, keine Verwechslung (Art Direction §2, Look-Check A2).
 */
export const TEMP_COLORS = {
  hot: 0xff4757,
  warm: 0xffb800,
  cold: 0x18dcff,
} as const;

/** Der helle Kreis unter jedem Temperatur-Icon — die Formensprache, die es von Spielerfarben trennt. */
export const TEMP_BADGE = {
  fill: UI_COLORS.paper,
  outline: UI_COLORS.ink,
  outlineWidthPx: 3,
} as const;

/* ------------------------------------------------------------------ */
/* Typografie (Art Direction §3)                                       */
/* ------------------------------------------------------------------ */

export const FONTS = {
  display: '"Luckiest Guy", "Comic Sans MS", system-ui, sans-serif',
  body: '"Nunito", system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;

/** Groessen-Skala in px (root 16). */
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  '2xl': 40,
  hero: 64,
  mega: 96,
} as const;

/** Sticker-Look: Outline-Stroke + Drop-Shadow fuer Display-Zahlen. */
export const STICKER = {
  strokeWidthPx: 4,
  strokeColor: UI_COLORS.ink,
  shadowOffsetYPx: 4,
  shadowColor: UI_COLORS.ink,
} as const;

/* ------------------------------------------------------------------ */
/* Motion (Art Direction §7 + Drinkshot §9)                            */
/* ------------------------------------------------------------------ */

export const MOTION = {
  fast: 120, // Tap-Feedback
  base: 260, // Screen-Elemente
  slow: 420, // Wipes, grosse Panels
  easeOvershoot: 'back.out(2.5)',
  easeSnappy: 'power3.inOut',
  easeDrop: 'bounce.out',
  easeElastic: 'elastic.out(1, 0.4)',
  wipeMs: 320,
  sheetMs: 260,
  sheetEase: 'cubic-bezier(.2,.9,.3,1.2)',
  countUpMs: 620,
  staggerMs: 70,
} as const;

/** Alias fuer die DOM-Helfer in `ui/animate.ts` — dieselben Werte, sprechender Name. */
export const UI_TIMING = MOTION;

/* ------------------------------------------------------------------ */
/* Animations-Konstanten der Inszenierungen (Art Direction §7)         */
/* ------------------------------------------------------------------ */

export const ANIM: {
  hitStopMs: number;
  squashScaleX: number;
  squashScaleY: number;
  squashMs: number;
  followThroughMs: readonly [number, number];
  shakeMs: number;
  shakeAmplitudePx: number;
  sequenceMaxMs: number;
  treasureMaxMs: number;
  colorRingMaxDelayMs: number;
} = {
  hitStopMs: 80,
  squashScaleX: 1.3,
  squashScaleY: 0.7,
  squashMs: 60,
  followThroughMs: [100, 150] as const,
  /**
   * Screen-Shake bei der Explosion (Art Direction §6). Kein `as const`-Literal: Ein
   * Doppelstapel schlaegt haerter zu und skaliert den Wert (`DigDirector`).
   */
  shakeMs: 250,
  shakeAmplitudePx: 12,
  /** Erlaubte Dauer einer DigSequence (Audit A3/A4). Treasure darf laenger. */
  sequenceMaxMs: 3500,
  treasureMaxMs: 5000,
  /**
   * Design-Prioritaet 2 (CLAUDE.md): Der Farbring der Leger erscheint spaetestens so
   * lange nach dem Explosions-Frame — vor jedem Gag. Harte Grenze, Timeline-Label-Test.
   */
  colorRingMaxDelayMs: 300,
} as const;

/* ------------------------------------------------------------------ */
/* Partikel-Budget (Art Direction §8)                                  */
/* ------------------------------------------------------------------ */

export const PARTICLE_BUDGET = {
  smoke: { max: 12, lifeMs: 900 },
  dirt: { max: 20, lifeMs: 800 },
  stars: { max: 8, lifeMs: 900 },
  confetti: { max: 100, lifeMs: 2500 },
  leaves: { max: 12, lifeMs: 1400 },
  colorRing: { max: 2, lifeMs: 700 },
  /** Harte Obergrenze aktiver Sprites auf der Buehne (Art Direction §8). */
  maxActiveSprites: 200 as number,
} as const;

/* ------------------------------------------------------------------ */
/* Buehne / Rendering (Architektur §8, Art Direction §6)               */
/* ------------------------------------------------------------------ */

/**
 * Feld-Geometrie in Welteinheiten (Art Direction §6, ADR-12).
 *
 * Die Werte folgen **rueckwaerts aus der Touch-Regel**: Bei 390 px Geraetebreite bleiben
 * dem Canvas rund 370 px, und jede Platte muss davon mindestens 56 px bekommen (GDD §5).
 * Bei 6 × 6 heisst das 6 × 56 px + 5 × 6 px = 366 px — praktisch die volle Breite. In
 * Welteinheiten (Breite 1000) sind das die Zahlen hier; sie fuellen das Feld absichtlich
 * fast randlos aus. Die Tippflaeche gewinnt gegen die Randbreite.
 */
export const FIELD_LAYOUT = {
  5: { plate: 185, gap: 18 },
  6: { plate: 153, gap: 16 },
} as const;

export const STAGE = {
  /**
   * Logische Weltgroesse, aufloesungsunabhaengig — **Hochformat** (ADR-12).
   *
   * Eine quadratische Welt kann Feld und Digger-Bank nicht beide tragen: Entweder die
   * Platten fallen unter 56 px, oder die Diggers stehen auf dem Feld. Hochformat loest
   * beides — die Breite gehoert dem Feld, die zusaetzliche Hoehe den Baenken.
   */
  worldSize: 1000,
  worldHeight: 1500,
  /**
   * Oberkante des Plattenfeldes. Der Streifen darueber traegt Zaun, Baum und Schild —
   * bei 6–8 Spielern zusaetzlich die hintere Digger-Bank.
   */
  fieldTop: { single: 155, double: 255 },
  /** Kamera faehrt auf die aktive Platte (Art Direction §6). */
  plateZoom: 1.12,
  panMs: 400,
  /** Ab so vielen Spielern sitzt die Digger-Bank in zwei Reihen (oben + unten). */
  twoBenchesFrom: 6,
  /**
   * Digger-Hoehe in Welteinheiten. Passt in den Streifen unter dem Feld: Bei acht
   * Spielern werden sie kleiner, damit die Bank nicht zugestopft wirkt.
   */
  diggerHeight: { min: 140, max: 180 } as const,
  headRatio: 0.45,
  blinkIntervalMs: [2000, 5000] as const,
  blinkDurationMs: 120,
  /** Eine zufaellige verdeckte Platte wackelt in diesem Abstand — "da lebt was". */
  plateIdleWiggleMs: [6000, 10_000] as const,
} as const;

export const RENDER = {
  maxResolution: 2,
  antialias: false,
  powerPreference: 'high-performance',
  /** Low-Effects-Auto-Detect-Schwellen (Architektur §8). */
  lowEffects: {
    deviceMemoryMax: 3,
    hardwareConcurrencyMax: 4,
    frameMedianMaxMs: 22,
    probeDurationMs: 2000,
  },
  /** Frame-Budget auf dem Referenzgeraet. */
  budgetMs: { update: 4, render: 8 },
} as const;

/* ------------------------------------------------------------------ */
/* Touch (GDD §5, Audit A1)                                            */
/* ------------------------------------------------------------------ */

/** Das Feld muss einhaendig tippbar sein, waehrend das Handy auf dem Tisch liegt. */
export const TOUCH = {
  minTargetPx: 56,
  minGapPx: 6,
} as const;

/* ------------------------------------------------------------------ */
/* Digger-Ausstattung (Art Direction §5)                               */
/* ------------------------------------------------------------------ */

/** Diggers tragen **immer** Helm — der Helm ist der Traeger der Spielerfarbe. */
export const VEST_CHANCE = 0.5;

/** Gesichter: die aus Drinkshot plus die sechs neuen des Sprengmeisters. */
export const FACE_IDS = [
  'neutral',
  'blink',
  'happy',
  'ouch',
  'x_eyes',
  'sweat',
  'brow',
  'shiver',
  'soot_blink',
  'relief',
  'smug_gap_tooth',
] as const;
export type FaceId = (typeof FACE_IDS)[number];

/** Fundstuecke im leeren Loch (Art Direction §5.1). */
export const CRITTER_IDS = ['worm', 'beetle', 'bone', 'boot'] as const;
export type CritterId = (typeof CRITTER_IDS)[number];

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

/**
 * Digger-Hoehe fuer eine Spielerzahl. Zwischen 3 und 8 Spielern linear interpoliert,
 * damit die Bank nie zugestopft wirkt und kleine Runden gross aussehen.
 */
export function diggerHeightFor(playerCount: number): number {
  const clamped = Math.min(8, Math.max(3, playerCount));
  const t = (clamped - 3) / 5;
  return STAGE.diggerHeight.max + (STAGE.diggerHeight.min - STAGE.diggerHeight.max) * t;
}

/** Hex-Zahl → CSS-Farbstring. */
export function hex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}
