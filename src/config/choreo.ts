/**
 * Choreografie der Aufdeckung — abgeleitet aus `docs/01-GDD.md §4.3` und
 * `docs/02-ART-DIRECTION.md §7`.
 *
 * CLAUDE.md: **Alle Timings stehen hier.** `core/choreographer.ts` baut daraus das
 * Skript, der `RevealDirector` (M3) spielt es ab — beide erfinden keine eigenen Zahlen.
 *
 * Die Reihenfolge selbst ist Gesetz und steht nicht hier, sondern im Choreographer:
 * Teiler zuerst, Diebe zuletzt, Maulwurf als letzter Dieb (ADR-3).
 */

import type { RevealPace } from './rules';

/* ------------------------------------------------------------------ */
/* Dauer-Presets (GDD §4.3)                                            */
/* ------------------------------------------------------------------ */

/** Basis-Verweildauer einer Karte, bevor Tempo-Kurve und Raffung greifen. */
export const PACE_HOLD_MS: Record<RevealPace, number> = {
  short: 1800,
  normal: 2800,
  long: 3800,
};

/**
 * Tempo-Kurve (Art Direction §7): Die Verweildauer sinkt linear von 100 % auf 70 %
 * bis zur **vorletzten** Karte — die Show zieht an, statt gleichmaessig zu tuckern.
 */
export const TEMPO_CURVE = {
  startFactor: 1.0,
  endFactor: 0.7,
} as const;

/** Die letzte Karte bekommt 160 % Verweildauer. Sie ist der Moment, fuer den es das Spiel gibt. */
export const LAST_CARD_FACTOR = 1.6;

/** Harter Deckel der gesamten Show (GDD §4.3). Darueber werden die fruehen Karten gerafft. */
export const MAX_SHOW_MS = 40_000;

/**
 * Untergrenze fuer eine geraffte Karte. Auch bei 8 Spielern und "Lang" muss man noch
 * sehen, was auf der Karte steht — Raffung darf die Show nicht unlesbar machen.
 */
export const MIN_CARD_HOLD_MS = 900;

/* ------------------------------------------------------------------ */
/* Fake-Stocken (Art Direction §7)                                     */
/* ------------------------------------------------------------------ */

/**
 * Jede Karte stockt einmal bei 60 % des Flips, die letzte zweimal (60 % und 85 %).
 * Nie mehr — sonst wird es nervig.
 */
export const STALLS_NORMAL: readonly number[] = [0.6];
export const STALLS_LAST: readonly number[] = [0.6, 0.85];

/** Wie lange ein Stocken haelt. */
export const STALL_MS = 200;

/* ------------------------------------------------------------------ */
/* Beats (GDD §4.3)                                                    */
/* ------------------------------------------------------------------ */

export const INTRO_MS = 2000;
export const OUTRO_MS = 1500;

/** Alarm-Beat nach der ersten aufgedeckten STEHLEN-Karte. */
export const ALARM_MS = 600;

/**
 * Zeitfenster, das der Choreographer fuer die Ergebnis-Inszenierung reserviert.
 * Die tatsaechliche Dauer bestimmt die Sequenz selbst (Architektur §7: 2-8 s);
 * dieser Wert ist die Planungsgroesse fuer den 40-s-Deckel.
 */
export const OUTCOME_BUDGET_MS = 5000;

/** Feinstruktur eines Karten-Beats (Art Direction §5.1, GDD §4.3). */
export const CARD: {
  panMs: number;
  liftMs: number;
  flipMs: number;
  flashMs: number;
  lastCardTimeScale: number;
} = {
  /** Kamera faehrt auf die Karte, bevor sie sich hebt. */
  panMs: 400,
  /** Anticipation: Die Karte hebt sich vom Tisch. */
  liftMs: 260,
  /** Reine Drehzeit ohne Stocken (scale.x 1 → 0 → 1). */
  flipMs: 520,
  /** Gruenes bzw. rotes Aufleuchten nach dem Flip. */
  flashMs: 220,
  /** Die letzte Karte dreht sich in Slow-Mo. */
  lastCardTimeScale: 0.55,
} as const;

/** Letzte Karte: Spotlight wird enger, Herzschlag laeuft (GDD §4.3). */
export const LAST_CARD = {
  spotShrinkTo: 0.55,
  spotShrinkMs: 700,
} as const;

/**
 * Herzschlag bei der letzten Karte (GDD §4.3).
 *
 * Das Tempo steigt ueber die Verweildauer hinweg. Waehrenddessen wird die Musik
 * abgesenkt — sonst traegt der Puls nicht, und genau der ist der Effekt.
 */
export const HEARTBEAT = {
  bpm: [70, 132] as const,
  /** Auf diesen Anteil faellt die Musik. */
  duckTo: 0.25,
  duckMs: 400,
} as const;

/** Trommelwirbel wird pro Karte schneller (GDD §4.5). */
export const DRUMROLL: { rateStart: number; rateEnd: number } = {
  rateStart: 1.0,
  rateEnd: 1.35,
};

/* ------------------------------------------------------------------ */
/* Tap-to-Skip (GDD §4.3)                                              */
/* ------------------------------------------------------------------ */

/**
 * Ab der zweiten Karte (0-basiert: Index 1) darf getippt werden.
 * Nie bei der letzten Karte und nie waehrend der Auszahlungs-Inszenierung —
 * das ist die Regel, die die Show schuetzt.
 */
export const SKIP_FROM_CARD_INDEX = 1;

/* ------------------------------------------------------------------ */
/* Outcome-Auswahl (Architektur §6)                                    */
/* ------------------------------------------------------------------ */

/** Eine Inszenierung wiederholt sich fruehestens nach so vielen Runden ihres Typs. */
export const NO_REPEAT_WINDOW = 3;

/* ------------------------------------------------------------------ */
/* Abgeleitete Timings                                                 */
/* ------------------------------------------------------------------ */

/**
 * Faktor der Tempo-Kurve fuer Karte `index` von `count` Karten.
 * Die letzte Karte laeuft nicht ueber die Kurve, sondern ueber `LAST_CARD_FACTOR`.
 */
export function tempoFactor(index: number, count: number): number {
  if (index >= count - 1) return LAST_CARD_FACTOR;
  if (count <= 2) return TEMPO_CURVE.startFactor;
  // Linear ueber die Karten 0 .. count-2 (die vorletzte erreicht endFactor).
  const t = index / (count - 2);
  return TEMPO_CURVE.startFactor + (TEMPO_CURVE.endFactor - TEMPO_CURVE.startFactor) * t;
}

/** Die Stall-Punkte einer Karte. */
export function stallsFor(isLast: boolean): readonly number[] {
  return isLast ? STALLS_LAST : STALLS_NORMAL;
}

/** Feste Kosten einer Show ausserhalb der Karten: Intro + Outcome + Outro. */
export function fixedShowMs(hasAlarm: boolean): number {
  return INTRO_MS + (hasAlarm ? ALARM_MS : 0) + OUTCOME_BUDGET_MS + OUTRO_MS;
}
