/**
 * Choreografie — alle Zeiten der Inszenierung an einem Ort (Art Direction §6/§7,
 * Roadmap M0.2). Der `DigDirector` und die Sequenzen lesen ausschliesslich hier.
 *
 * Design-Prioritaet 1 (CLAUDE.md): "Jeder Tap ist ein Nervenmoment." Die Summe aus
 * `ANTICIPATION` ist die Jenga-Sekunde — sie wird nicht gekuerzt, um Zeit zu sparen.
 */

/* ------------------------------------------------------------------ */
/* Anticipation vor dem Ergebnis (Art Direction §6)                    */
/* ------------------------------------------------------------------ */

export const ANTICIPATION = {
  /** Der Digger laeuft zur Platte. */
  walkMs: 250,
  /** Drei Schaufelstoesse mit Squash. */
  shovelStrokes: 3,
  shovelStrokeMs: 120,
  /** Stille, in der nur die Platte zittert — der eigentliche Nervenmoment. */
  holdMs: 200,
} as const;

/** ~900 ms vom Tap bis zur Aufloesung (Art Direction §6). */
export const ANTICIPATION_TOTAL_MS =
  ANTICIPATION.walkMs + ANTICIPATION.shovelStrokes * ANTICIPATION.shovelStrokeMs + ANTICIPATION.holdMs;

/* ------------------------------------------------------------------ */
/* Platte (Art Direction §4.1)                                         */
/* ------------------------------------------------------------------ */

export const PLATE = {
  /** Tap-Feedback: die Platte wackelt sofort, noch bevor der Digger losgeht. */
  pressMs: 80,
  pressScale: 0.94,
  /** Der Deckel kippt nach hinten weg. */
  openMs: 260,
  openEase: 'back.in(1.7)',
  /** Bestaetigung auf dem Place-Screen: die Platten stampfen sich fest. */
  stompMs: 400,
  /** Mine wird beim Legen in die Erde geschoben. */
  minePlaceMs: 320,
} as const;

/* ------------------------------------------------------------------ */
/* Banner & Toasts (Art Direction §4.2 / §4.3)                         */
/* ------------------------------------------------------------------ */

export const BANNER = {
  /** Turn-Banner wechselt per Wipe in der neuen Spielerfarbe. */
  turnWipeMs: 200,
  /** Trink-Banner faehrt als Schaerpe ein und bleibt so lange stehen. */
  drinkHoldMs: 2200,
  drinkInMs: 260,
  drinkOutMs: 200,
  /** Kill-Feed-Toast laeuft parallel zum Trink-Banner. */
  killFeedHoldMs: 2000,
  /** Haptik-Impuls bei der Explosion. */
  hapticsMs: 60,
} as const;

/* ------------------------------------------------------------------ */
/* Explosion (Art Direction §7, CLAUDE.md Design-Prioritaet 2)         */
/* ------------------------------------------------------------------ */

export const EXPLOSION = {
  /**
   * Label, an dem in jeder Hit-Timeline der Explosions-Frame sitzt. Der Test in
   * `sequences.test.ts` misst von hier aus zum `colorRing`-Label.
   */
  frameLabel: 'boom',
  ringLabel: 'colorRing',
  /**
   * Ziel-Versatz des Leger-Rings. Die harte Obergrenze (300 ms) steht als
   * `ANIM.colorRingMaxDelayMs` in `theme.ts` — hier steht, worauf wir zielen.
   */
  ringDelayMs: 120,
  ringGrowMs: 500,
  /** Zwei Legerfarben blinken abwechselnd (hit_chain_dance). */
  ringAlternateMs: 260,
} as const;

/* ------------------------------------------------------------------ */
/* Kettenreaktion (GDD §3.6)                                           */
/* ------------------------------------------------------------------ */

export const CHAIN = {
  /** Versatz zwischen den Nachbar-Kratern — eine Welle, keine Salve. */
  stepMs: 80,
} as const;

/* ------------------------------------------------------------------ */
/* Feld-Replay im Result (GDD §4.4, Art Direction §4.6)                */
/* ------------------------------------------------------------------ */

export const REPLAY = {
  /** Welle von der Kiste nach aussen, Verzoegerung pro Chebyshev-Ring. */
  ringStepMs: 40,
  plateFlipMs: 220,
  /** Gesamtdauer der Welle bleibt unter dieser Grenze (GDD §4.4). */
  maxTotalMs: 2000,
} as const;

/* ------------------------------------------------------------------ */
/* Kamera (Art Direction §6)                                           */
/* ------------------------------------------------------------------ */

export const CAMERA = {
  zoomInMs: 260,
  zoomOutMs: 320,
  ease: 'power2.inOut',
} as const;

/* ------------------------------------------------------------------ */
/* Kleine Sequenzen (GDD §4.3)                                         */
/* ------------------------------------------------------------------ */

export const EMPTY_SEQUENCE = {
  /** Platte kippt weg, Tier winkt, Temperatur-Symbol ploppt mit Overshoot rein. */
  totalMs: 800,
  critterMs: 400,
  tempPopMs: 300,
  tempPopEase: 'back.out(3)',
} as const;

/**
 * Wieviele verschiedene Sequenzen einer Art nicht wiederholt werden duerfen
 * (Architektur §6: "No-Repeat 3 pro Kind").
 */
export const NO_REPEAT_WINDOW = 3;
