/**
 * Choreographie-Tokens — die Zeitachse des Schritts (GDD §4.2, Architektur §6).
 *
 * Der Choreographer liest ausschliesslich hier; kein Timing steht im Code der Sequenzen.
 * Alle Werte in Millisekunden, sofern nicht anders benannt.
 */

import type { Pace } from './rules';

/* ------------------------------------------------------------------ */
/* Phasen je Dauer-Preset (GDD §4.2)                                   */
/* ------------------------------------------------------------------ */

export interface PhaseTimings {
  /** Kamerafahrt ueber die Schlucht, Geier, Wind. */
  intro: number;
  /** Todeszone-Schild schwingt zusaetzlich ins Bild. */
  deathZoneIntroExtra: number;
  /** Alle Hikers laufen gleichzeitig los und kommen gleichzeitig an. */
  run: number;
  /** Gemeinsamer Hit-Stop im Moment des Auftretens (Signatur, CLAUDE.md). */
  hitStop: number;
  /** Knarren aller besetzten Balken bis zum ersten Bruch. */
  creak: number;
  /** Nachspiel: Winken, Hochklettern, Zimmermann oder abfaulender Balken. */
  aftermath: number;
}

/**
 * "Kurz" und "Lang" skalieren Anlauf und Knarren — Intro und Hit-Stop bleiben, damit die
 * Signatur des gleichzeitigen Schritts in jedem Preset gleich hart sitzt.
 */
export const PACE_TIMINGS: Record<Pace, PhaseTimings> = {
  short: { intro: 1000, deathZoneIntroExtra: 700, run: 1400, hitStop: 120, creak: 1400, aftermath: 2000 },
  normal: { intro: 1500, deathZoneIntroExtra: 900, run: 2000, hitStop: 120, creak: 2000, aftermath: 2800 },
  long: { intro: 2000, deathZoneIntroExtra: 1100, run: 2600, hitStop: 120, creak: 2600, aftermath: 4000 },
};

/* ------------------------------------------------------------------ */
/* Knarren (Art Direction §7)                                          */
/* ------------------------------------------------------------------ */

/**
 * Die Amplituden sind die halbe Spannungsdramaturgie: Wuerde nur der Kollisionsbalken
 * knarren, waere das Ergebnis im Moment des Schritts verraten (ADR-3).
 */
export const CREAK_AMPLITUDE = {
  /** Sicherer Balken — Fake, aber deutlich. */
  safe: 0.7,
  /** Kollisionsbalken — die volle Amplitude. */
  collision: 1.0,
  /** Morscher Balken: taeuschend leise, dann ploetzlich voll. */
  rottenStart: 0.4,
  rottenEnd: 1.0,
} as const;

/** Ab wann im Knarren der morsche Balken aus der Tarnung faellt (Anteil der Knarr-Phase). */
export const ROTTEN_REVEAL_AT = 0.6;

/* ------------------------------------------------------------------ */
/* Blickkontakt — die Signatur (GDD §4.2, ADR-3)                       */
/* ------------------------------------------------------------------ */

export const EYE_CONTACT = {
  /** Slow-Mo-Faktor waehrend des Blickkontakts. */
  slowMo: 0.5,
  /** Wie lange sich die beiden ansehen (in Slow-Mo-Zeit gemessen). */
  durationMs: 800,
  /** Wie lange vor dem Bruch der Blickkontakt beginnt. */
  leadMs: 900,
  /** Die "Oh."-Sprechblase erscheint kurz nach dem ersten Blick. */
  bubbleDelayMs: 300,
} as const;

/* ------------------------------------------------------------------ */
/* Bruch (GDD §4.2)                                                    */
/* ------------------------------------------------------------------ */

/** Mehrere Kollisionsbalken brechen nacheinander, nicht im Chor. */
export const BREAK_STAGGER_MS = 400;

/** Kamera: Zoom auf den Kollisionsbalken, Shake beim Bruch (Art Direction §6). */
export const CAMERA = {
  introZoom: 1.3,
  creakZoom: 1.15,
  shakePx: 10,
  shakeMs: 250,
  fallPanMs: 900,
} as const;

/* ------------------------------------------------------------------ */
/* Deckel (Architektur §6)                                             */
/* ------------------------------------------------------------------ */

/**
 * Ein Massensturz mit vier Kollisionsgruppen darf die Show nicht auf eine Minute
 * aufblaehen. Ueberschreitet das Skript diesen Deckel, rafft der Choreographer die
 * Bruch-Abstaende — nie den Blickkontakt (der ist die Signatur).
 */
export const MAX_STEP_MS = 20_000;

/** Untergrenze fuer den geraffte Bruch-Versatz. */
export const MIN_BREAK_STAGGER_MS = 120;

/** Wie lange eine Fall-Sequenz laenger laeuft als ihr Bruch-Zeitpunkt (Puffer im Skript). */
export const FALL_SEQUENCE_MS = 5000;
/** Sicher-Sequenzen laufen parallel ab dem ersten Bruch. */
export const SAFE_SEQUENCE_MS = 3000;

/* ------------------------------------------------------------------ */
/* Sequenz-Auswahl (Architektur §6)                                    */
/* ------------------------------------------------------------------ */

/** Eine Sequenz darf sich erst nach so vielen anderen wiederholen. */
export const SEQUENCE_NO_REPEAT = 3;

/* ------------------------------------------------------------------ */
/* HUD (Art Direction §4.2)                                            */
/* ------------------------------------------------------------------ */

export const HUD = {
  /**
   * Ab hier wird der Countdown dringlich: Ring pulst, Gustav schaut auf die Uhr.
   * Frueher waere es keine Dringlichkeit mehr, sondern Grundrauschen.
   */
  tickFromSec: 5,
  /** Wie lange die Versiegelt-Bestaetigung im Choose-Screen steht. */
  sealConfirmMs: 700,
  /** Wie lange der DOM-Platzhalter des Schritts pro Phase braucht (M1; M2 ersetzt ihn). */
  placeholderStepMs: 2600,
} as const;
