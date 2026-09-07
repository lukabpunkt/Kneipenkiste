/**
 * Design-Tokens — abgeleitet aus `docs/02-ART-DIRECTION.md`.
 * Einzige Quelle fuer Farben, Motion und Typo-Skala im TS-Code.
 * Das CSS-Pendant liegt in `src/styles/tokens.css` und muss synchron bleiben
 * (Test: `tests/unit/theme.test.ts`).
 */

/* ------------------------------------------------------------------ */
/* Spielerfarben — identisch zu Drinkshot (Art Direction §2)           */
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

const COLOR_BY_ID = new Map<ColorId, (typeof PLAYER_COLORS)[number]>(
  PLAYER_COLORS.map((c) => [c.id, c])
);

export function colorById(id: ColorId): (typeof PLAYER_COLORS)[number] {
  const found = COLOR_BY_ID.get(id);
  if (!found) throw new Error(`Unbekannte ColorId: ${id}`);
  return found;
}

/**
 * Text auf einer Spielerfarbe ist **immer** `ink`.
 *
 * Ursprünglich bekamen nur Gelb, Cyan und Grün dunklen Text, der Rest hellen. Gemessen
 * (`npm run check:contrast`) fiel `paper` auf Rot, Blau, Lila, Orange und Pink durch —
 * zwischen 2,4:1 und 3,5:1, verlangt sind 4,5:1. Mit `ink` liegen alle acht zwischen
 * 4,7:1 und 12,8:1.
 *
 * Die Spielerfarben selbst sind unveränderlich (Art Direction §2.1, identisch zu den
 * Schwesterspielen) — also musste der Text weichen. Er passt ohnehin besser zum
 * Sticker-Look, in dem jede Outline `ink` ist.
 */
export function textColorOn(_id: ColorId): number {
  return UI_COLORS.ink;
}

/* ------------------------------------------------------------------ */
/* UI- und Buehnen-Farben (Art Direction §2)                           */
/* ------------------------------------------------------------------ */

export const UI_COLORS = {
  /* Menues: dunkel wie in der Spielefamilie */
  bgDeep: 0x0f0e1a,
  bgPanel: 0x1c1b2e,
  bgPanelRaised: 0x27263d,
  ink: 0x1a1024,
  paper: 0xfff8e7,

  /* Zoll-Akzent */
  customs: 0xffb800,
  customsShade: 0xd18e00,

  /* Die Halle — die einzige helle Buehne der Familie */
  hallFloor: 0xd8d3c6,
  hallFloorLine: 0xc4bfb0,
  hallWall: 0xeef0f4,
  steel: 0x8c93a8,
  steelDark: 0x4a506a,
  belt: 0x2e2b3f,

  /* Roentgenmonitor */
  xrayBg: 0x0b2233,
  xrayGlow: 0x3df5c6,
  xrayDim: 0x1a6b5c,

  /* Ergebnisse */
  alarm: 0xff2d55,
  ok: 0x2ed573,
  busted: 0xa55eea,
  carpet: 0xc0392b,
} as const;

/* ------------------------------------------------------------------ */
/* Typografie (Art Direction §3)                                       */
/* ------------------------------------------------------------------ */

export const FONTS = {
  display: '"Luckiest Guy", "Comic Sans MS", system-ui, sans-serif',
  body: '"Nunito", system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;

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

/**
 * Stempel-Schrift (Art Direction §3): Rechteck-Rahmen, leicht rotiert, Slam-In.
 * Die Rotation wird pro Stempel seeded aus diesem Bereich gezogen.
 */
export const STAMP = {
  rotationDeg: { min: -8, max: 8 },
  shakePx: 6,
  inkNoiseAlpha: 0.12,
  cornerRadiusPx: 8,
} as const;

/* ------------------------------------------------------------------ */
/* Roentgenmonitor (Art Direction §4.4)                                */
/* ------------------------------------------------------------------ */

export const XRAY = {
  /** CRT-Ecken-Rundung in logischen Einheiten. */
  cornerRadius: 24,
  /** Scanline-Overlay: Linienstaerke px / Alpha. */
  scanlineWidthPx: 2,
  scanlineAlpha: 0.15,
  /** Leichtes Flackern des Monitors. */
  flickerAlpha: { min: 0.97, max: 1.0 },
  /** Bloom auf den Silhouetten — nur waehrend `scan()` (Architektur §8). */
  bloomStrength: 1.4,
  bloomBlur: 6,
} as const;

/* ------------------------------------------------------------------ */
/* Buehne (Art Direction §6)                                           */
/* ------------------------------------------------------------------ */

export const STAGE = {
  /** Logische Welt; skaliert per contain in den Screen. */
  worldWidth: 1000,
  worldHeight: 1000,
  /** Kofferreihe auf dem Band. */
  maxSuitcasesPerRow: 7,
  /** Ab 7 Koffern skaliert die Reihe herunter, Tippflaeche bleibt >= 56 px. */
  crowdedScale: 0.85,
  minTouchPx: 56,
  /** Kamera-Zoom auf den Monitor beim Oeffnen. */
  inspectZoom: 1.2,
  alarmShakePx: 10,
} as const;

/* ------------------------------------------------------------------ */
/* Buehnen-Layout in Welteinheiten (Art Direction §6)                  */
/* ------------------------------------------------------------------ */

/**
 * Die Halle in der 1000x1000-Welt. Alle Positionen stehen hier, damit ein Blick genuegt,
 * um die Buehne zu verstehen — und damit "der Koffer sitzt zu hoch" eine Zahl ist.
 */
export const LAYOUT = {
  /** Wand oben, Boden darunter. */
  wallBottom: 430,
  /** Split-Flap-Tafel "ANKUNFT". */
  board: { x: 210, y: 92, width: 300 },
  clock: { x: 618, y: 90, size: 92 },
  pictogram: { x: 470, y: 88, size: 84 },

  /** Foerderband. Breit genug fuer zwei Kofferreihen (ADR-13). */
  belt: { top: 366, height: 132, left: 0, right: 706 },
  /** Das Roentgengeraet am Ende des Bandes. */
  machine: { x: 830, y: 388, width: 264, height: 224 },
  /** Der Monitor darueber, zur Kamera gedreht. */
  monitor: { x: 830, y: 190, width: 268, height: 206 },

  /**
   * Die Koffer auf dem Band.
   *
   * Bis vier Koffer eine Reihe, ab fuenf zwei — anders liegen die Tippflaechen auf einem
   * 390 px breiten Handy naeher beieinander als 56 px und ueberlappen sich (ADR-13).
   *
   * Die hintere Reihe steht auf dem Band, die vordere davor auf dem Boden. Der Abstand
   * ist kein Geschmack, sondern Arithmetik: Zwei Trefferflaechen von je 56 px brauchen
   * uebereinander 286 Welteinheiten, und so hoch ist kein Foerderband.
   */
  suitcases: {
    rowFront: 592,
    rowBack: 440,
    left: 96,
    right: 630,
    maxWidth: 158,
    /** Ab dieser Anzahl wird auf zwei Reihen verteilt. */
    twoRowsFrom: 5,
    backScale: 0.88,
  },

  /** Die gelbe Linie, hinter der die Reisenden warten. */
  yellowLine: 672,
  /**
   * Fusspunkte der Reisenden — **eine** Reihe.
   *
   * Die Art Direction sah bei 7–8 Spielern zwei Reihen vor. Seit die Koffer selbst zwei
   * Reihen brauchen (ADR-13), waere das die dritte uebereinander, und die Huete der
   * hinteren Leute lagen auf den vorderen Koffern. Eine breitere Reihe mit leichter
   * Ueberlappung liest sich als Schlange und kostet nichts — die Reisenden sind kein
   * Tippziel.
   */
  travelers: { row: 862, left: 96, right: 726 },
  /** Der Beamte steht rechts neben dem Geraet. */
  officer: { x: 846, y: 880 },
  /** Waldi liegt links unten. */
  dog: { x: 112, y: 968 },
  /** Die Schranke, rechts unten — im Gate-Modus schwenkt die Kamera darauf. */
  gate: { x: 912, y: 872, width: 150 },

  /** Charakter-Hoehe in Welteinheiten. */
  travelerHeight: 176,
  officerHeight: 210,
} as const;

/* ------------------------------------------------------------------ */
/* Rendering (Architektur §8)                                          */
/* ------------------------------------------------------------------ */

export const RENDER = {
  maxResolution: 2,
  antialias: false,
  powerPreference: 'high-performance',
  /** Low-Effects-Auto-Erkennung. */
  lowEffects: {
    deviceMemoryMax: 3,
    hardwareConcurrencyMax: 4,
    frameMedianMaxMs: 22,
    probeDurationMs: 2000,
  },
  /** Frame-Budget auf dem Referenzgeraet (Audit A2). */
  budgetMs: { update: 4, render: 8 },
} as const;

/* ------------------------------------------------------------------ */
/* Charaktere (Art Direction §5)                                       */
/* ------------------------------------------------------------------ */

/** Gesichter des Reisenden. */
export const TRAVELER_FACES = [
  'neutral',
  'blink',
  'happy',
  'too_wide_smile',
  'sweat_1',
  'sweat_2',
  'sweat_3',
  'whistle',
  'outraged',
  'smug_bow',
  'x_eyes',
  'ouch',
  'panic',
  'scared',
  'wave',
  'spiral',
] as const;
export type TravelerFace = (typeof TRAVELER_FACES)[number];

/** Gesichter des Beamten. */
export const OFFICER_FACES = ['stern', 'suspicious', 'blush', 'triumph', 'facepalm'] as const;
export type OfficerFace = (typeof OFFICER_FACES)[number];

/** Wie oft der Beamte einen Schnurrbart traegt (Art Direction §5.2). */
export const MUSTACHE_CHANCE = 0.5;

/** Blinzeln: alle 2–5 s fuer 120 ms. */
export const BLINK_INTERVAL_MS = [2000, 5000] as const;
export const BLINK_DURATION_MS = 120;

/* ------------------------------------------------------------------ */
/* Partikel-Budget (Art Direction §8)                                  */
/* ------------------------------------------------------------------ */

export const PARTICLE_BUDGET = {
  itemFountain: 12,
  sweat: 10,
  confetti: 100,
  feathers: 6,
  /** Obergrenze aktiver Sprites insgesamt. */
  totalSprites: 200,
} as const;

/* ------------------------------------------------------------------ */
/* Motion (Art Direction §7, wie Drinkshot)                            */
/* ------------------------------------------------------------------ */

/**
 * Timings der **DOM-Schicht** in Millisekunden (`Element.animate`, CSS).
 * Die Buehnen-Timings der PIXI-Sequenzen stehen in Sekunden in `config/choreo.ts` —
 * das ist die Einheit, die GSAP erwartet.
 */
export const MOTION = {
  fast: 120, // Tap-Feedback
  base: 260, // Screen-Elemente
  slow: 420, // grosse Panels
  /** Screen-Wipe zwischen den Screens. */
  wipeMs: 320,
  /** Bottom-Sheet Slide-up. */
  sheetMs: 260,
  sheetEase: 'cubic-bezier(.2,.9,.3,1.2)',
  /** Result: Zahlen zaehlen hoch, Balken wachsen. */
  countUpMs: 620,
  /** Versatz zwischen zwei Zeilen — Listen bauen sich von oben auf. */
  staggerMs: 70,
  /* GSAP-Easings fuer die Buehne (M2+). */
  easeOvershoot: 'back.out(1.7)',
  easeSnappy: 'power2.inOut',
  easeDrop: 'power2.in',
} as const;

/** Alias fuer die DOM-Helfer in `ui/animate.ts` — dieselben Werte, sprechender Name. */
export const UI_TIMING = MOTION;

/** Hex-Zahl → CSS-Farbstring. */
export function hex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}
