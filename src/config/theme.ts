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

/** Weisser Text auf Gelb/Cyan/Gruen ist verboten — diese bekommen `ink`. */
const DARK_TEXT_COLORS: readonly ColorId[] = ['yellow', 'cyan', 'green'];

export function textColorOn(id: ColorId): number {
  return DARK_TEXT_COLORS.includes(id) ? UI_COLORS.ink : UI_COLORS.paper;
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
