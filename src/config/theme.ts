/**
 * Design-Tokens — abgeleitet aus `docs/02-ART-DIRECTION.md`.
 * Einzige Quelle fuer Farben, Motion und Typo-Skala im TS-Code.
 * Das CSS-Pendant liegt in `src/styles/tokens.css` und muss synchron bleiben
 * (Test: `tests/unit/config.test.ts`).
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
 * Text auf einer Spielerfarbe ist **immer** `ink` — gemessen in den Schwesterspielen:
 * `paper` faellt auf Rot, Blau, Lila, Orange und Pink unter 4,5:1, `ink` liegt auf allen
 * acht Farben zwischen 4,7:1 und 12,8:1. Passt ohnehin zum Sticker-Look.
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

  /* Canyon-Akzent (Primary CTA) */
  canyon: 0xffb800,
  canyonShade: 0xd18e00,

  /* Die Schlucht — goldene Stunde */
  skyTop: 0x2b4c8c,
  skyHorizon: 0xf5a25d,
  rock: 0xc4693e,
  rockDark: 0x8c4426,
  mist: 0xdce3f0,
  river: 0x3fa7d6,

  /* Die Bruecke */
  wood: 0x9c8a72,
  woodDark: 0x6b5b48,
  woodRotten: 0x5a6b3f,
  rope: 0xd9b77a,

  /* Ergebnisse */
  safe: 0x2ed573,
  danger: 0xff2d55,
  flag: 0xffffff,
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

/** Balken-Nummernschilder haengen leicht schief am Seil (Art Direction §3). */
export const PLANK_SIGN_TILT_DEG = { min: -4, max: 4 } as const;

/* ------------------------------------------------------------------ */
/* Layout (Art Direction §4, CLAUDE.md "Mobile First")                 */
/* ------------------------------------------------------------------ */

export const LAYOUT = {
  /** Referenzgeraet iPhone 12. */
  designWidth: 390,
  designHeight: 844,
  /** Balken-Buttons im Choose-Screen. */
  plankMinHeightPx: 56,
  /** Ab 10 Balken darf er auf diese Hoehe schrumpfen — aber niemals darunter. */
  plankMinHeightTightPx: 48,
  /** Ab wie vielen Balken die enge Variante greift. */
  plankTightThreshold: 9,
  /**
   * Nicht bedienbare Bruecken (Negotiation, Result, Step) duerfen flacher sein: Die
   * 56-px-Regel schuetzt Touch-Ziele, nicht Bilder. Bliebe die Bruecke ueberall so hoch,
   * schoebe sie in der Absprache genau den Satz unter die Falz, an dem das Spiel haengt
   * ("Versprechen sind nicht bindend").
   */
  plankDisplayHeightPx: 34,
  /** Vertikaler Abstand zwischen zwei Balken im SVG. */
  plankGapPx: 8,
} as const;

/**
 * Hoehe eines Balken-Buttons fuer B Balken — nie unter dem Touch-Ziel-Minimum.
 * Audit A1 misst genau diesen Wert.
 */
export function plankHeightFor(plankCount: number): number {
  return plankCount >= LAYOUT.plankTightThreshold
    ? LAYOUT.plankMinHeightTightPx
    : LAYOUT.plankMinHeightPx;
}

/* ------------------------------------------------------------------ */
/* Motion (Art Direction §7)                                           */
/* ------------------------------------------------------------------ */

/**
 * Timings der **DOM-Schicht** in Millisekunden (`Element.animate`, CSS).
 * Die Buehnen-Timings der PIXI-Sequenzen stehen in `config/choreo.ts`.
 */
export const MOTION = {
  /** Tap-Feedback auf Buttons. */
  fast: 120,
  /** Screen-Elemente. */
  base: 260,
  /** Grosse Panels. */
  slow: 420,
  /** Screen-Wipe zwischen zwei Screens. */
  wipeMs: 320,
  /** Bottom-Sheet faehrt hoch. */
  sheetMs: 260,
  sheetEase: 'cubic-bezier(.2,.9,.3,1.2)',
  /** Result: Zahlen zaehlen hoch, Balken bauen sich auf. */
  countUpMs: 620,
  /** Versatz zwischen zwei Listenzeilen. */
  staggerMs: 70,
  /** Versiegeln der Wahl im Choose-Screen. */
  sealMs: 420,
  /** Banner-Schaerpe faehrt ein. */
  bannerMs: 520,
  /** Seile schwingen im Leerlauf (CSS). */
  ropeIdleMs: 4000,
  /* GSAP-Easings fuer die Buehne (M2+). */
  easeOut: 'power2.out',
  easeIn: 'power2.in',
  easeBack: 'back.out(1.7)',
  easeElastic: 'elastic.out(1, 0.5)',
} as const;

/** Alias fuer die DOM-Helfer in `ui/animate.ts` — dieselben Werte, sprechender Name. */
export const UI_TIMING = MOTION;

/** Hex-Zahl → CSS-Farbstring. */
export function hex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Buehne (Art Direction §6) — logische Welt 1000 x 1000               */
/* ------------------------------------------------------------------ */

export const STAGE = {
  worldWidth: 1000,
  worldHeight: 1000,
  /**
   * Wie weit die Kulisse ueber die 1000 x 1000 hinausreicht.
   *
   * Ein Hochkant-Handy ist etwa 1 : 2.2. Passt man die **Breite** ein — und das muss man,
   * sonst ist die Bruecke seitlich abgeschnitten und das Spiel unspielbar —, dann sieht
   * man rund 2200 Welteinheiten Hoehe. Die Kulisse muss dieses Band fuellen, sonst klaffen
   * oben und unten Loecher.
   */
  skyTop: -900,
  floorY: 2100,
  /** Linkes Plateau: x 0–180, Bruecke 180–820, rechtes Plateau 820–1000. */
  plateauLeftEnd: 180,
  plateauRightStart: 820,
  /** Hoehe der Brueckenaufhaengung. */
  bridgeY: 420,
  /** Durchhang der Catenary in Welt-Einheiten. */
  bridgeSagY: 90,
  /** Ein Balken ist mindestens so breit, dass zwei Hikers nebeneinander passen. */
  plankWidthMin: 60,
  /** Luecke zwischen zwei Balken — dadurch sieht man, dass es einzelne Bretter sind. */
  plankGap: 14,
  /**
   * Dicke eines Balkens in Welteinheiten.
   *
   * Die Welt ist 1000 breit, ein Handy 390 px — ein 22 Einheiten dicker Balken wird zu
   * neun Bildpunkten und liest sich als Strich, nicht als Brett.
   */
  plankHeight: 34,
  /**
   * Der Fluss liegt tief.
   *
   * Naeher an der Bruecke waere er bequemer zu animieren — aber dann fuellt Wasser das
   * halbe Bild, und die Schlucht ist keine Schlucht mehr, sondern ein Teich. Die Tiefe
   * ist das Erste, was das Intro zeigt (GDD §4.2).
   */
  riverY: 1150,
  /**
   * Die ferne Schluchtwand faengt **unter** dem tiefsten Punkt der Bruecke an.
   *
   * Zwei Zwaenge, die sich fast widersprechen: Faengt sie zu hoch an, zieht ihre Oberkante
   * eine harte Linie quer durch die Bruecke. Faengt sie zu tief an, haengt die Bruecke vor
   * Himmel und die Schlucht wirkt flach. `bridgeY + bridgeSagY + 50` ist der Punkt, an dem
   * die Bruecke frei vor Luft haengt und die Tiefe trotzdem gleich darunter anfaengt.
   */
  wallY: 560,
  /** Vier Nebelbaenke driften zwischen diesen Hoehen (Parallax). */
  mistY: [700, 830, 960, 1080],
  /** Gustavs Pfahl auf dem linken Plateau — er steht auf der Lauffläche. */
  perch: { x: 58, y: 420 },
  /** Wo die Hikers antreten, bevor sie loslaufen: auf der Kante des linken Plateaus. */
  startX: 26,
  startY: 420,
  /**
   * Wie weit die Aufstellung nach rechts reichen darf.
   *
   * Nicht bis zur Plateau-Kante: Der letzte Hiker soll auf Fels stehen, nicht schon halb
   * ueber der Schlucht — auch wenn das die Reihe enger macht.
   */
  startEndX: 140,
  /** Zweite Reihe, sobald es fuer eine zu eng wird (ab 7 Hikers, Art Direction §6). */
  startRowOffset: { x: 16, y: -40 },
  /** Weiter als das stehen auch drei Leute nicht auseinander. */
  startSpacingMax: 44,
} as const;

/**
 * Wie hoch ein Hiker in Welteinheiten ist.
 *
 * Bei acht Spielern auf einer Bruecke mit zehn Balken duerfen zwei nebeneinander auf
 * einem Balken stehen, ohne sich zu ueberlappen (Audit A2) — deshalb haengt die Groesse
 * an der Spielerzahl, nicht an einer festen Zahl.
 */
export function hikerHeightFor(playerCount: number): number {
  return playerCount <= 4 ? 150 : playerCount <= 6 ? 132 : 112;
}

/**
 * Wie breit ein Hiker in Welteinheiten dasteht (Schultern samt Armen).
 *
 * Aus der Zeichnung: Das Rig ist 276 Einheiten hoch und rund 128 breit — die Arme stehen
 * bei 44 ab, der Kopf ist 106 breit. Der Faktor haelt beides zusammen, wenn sich die
 * Hoehe aendert.
 */
export function hikerWidthFor(playerCount: number): number {
  return hikerHeightFor(playerCount) * 0.46;
}

/**
 * Wie weit zwei Hikers auf **einem** Balken auseinanderstehen.
 *
 * Das ist keine Kosmetik. "Zwei Maennchen auf einem Balken, die sich anschauen" ist das
 * Bild, das das Spiel verkauft (GDD §1) — und das Bild gibt es nur, wenn beide zu sehen
 * sind. Zu zweit stehen sie Schulter an Schulter; ab drei ruecken sie enger zusammen und
 * staffeln sich in die Tiefe, weil sie sonst neben dem Balken stuenden.
 */
export function hikerSpreadFor(playerCount: number, occupants: number): number {
  const width = hikerWidthFor(playerCount);
  return occupants <= 2 ? width : width * 0.72;
}

/** Wie weit ein gestaffelter Hiker nach vorn rueckt (Welteinheiten, groesser = naeher). */
export const HIKER_DEPTH_STEP = 7;

/* ------------------------------------------------------------------ */
/* Renderer (Architektur §8)                                           */
/* ------------------------------------------------------------------ */

export const RENDER = {
  maxResolution: 2,
  antialias: false,
  powerPreference: 'high-performance',
  /** Low-Effects-Auto-Erkennung: Nebel-Parallax und Fluss-Glitzer gehen zuerst. */
  lowEffects: {
    deviceMemoryMax: 3,
    hardwareConcurrencyMax: 4,
    frameMedianMaxMs: 22,
    probeDurationMs: 2000,
  },
  /** Frame-Budget auf dem Referenzgeraet (Audit A2: p50 <= 16.7 ms). */
  budgetMs: { update: 4, render: 8 },
  /** Audit A2: mehr als drei Draw-Batches heisst, die Atlas-Aufteilung stimmt nicht. */
  maxDrawBatches: 3,
} as const;

/** Partikel-Budget (Art Direction §8) — Gesamt <= 200 aktive Sprites. */
export const PARTICLE_BUDGET = {
  splinters: 16,
  splash: 24,
  waterRings: 3,
  riverSparkle: 30,
  mist: 4,
  stars: 8,
  confetti: 60,
  total: 200,
} as const;
