/**
 * Choreografie-Tokens — alle Timings der Inszenierung in Sekunden (GSAP-Einheit).
 * Quelle: GDD §4, Art Direction §7, Roadmap M0.2.
 *
 * Directors lesen ausschliesslich von hier; keine Magic-Numbers in Sequenzen.
 */

/* ------------------------------------------------------------------ */
/* Zollhalle: Einfahrt & Hinweise (GDD §3.3)                           */
/* ------------------------------------------------------------------ */

export const HALL = {
  /** Ein Koffer rollt aufs Band. */
  suitcaseRollIn: 0.55,
  /** Versatz zwischen zwei einrollenden Koffern. */
  suitcaseStagger: 0.18,
  /** Ruhe, bevor der erste Hinweis laeuft. */
  beforeHints: 0.6,
} as const;

export const HINTS = {
  /** Jede Hinweis-Animation (Audit A3: <= 1.8 s). */
  duration: 1.5,
  /** Pause zwischen zwei Hinweisen. */
  gap: 0.45,
  /** Das kleine Icon setzt sich nach der Animation. */
  iconPopIn: 0.22,
  /** Spuerhund-Bark als Zusatz-Beat. */
  barkDuration: 0.9,
} as const;

/* ------------------------------------------------------------------ */
/* Kontrolle: die Roentgen-Sequenz (GDD §4.1) — "Scanline ist heilig"  */
/* ------------------------------------------------------------------ */

export const XRAY = {
  /** Koffer faehrt ins Geraet. */
  travelIn: 0.6,
  /** Monitor flackert an. */
  powerUp: 0.35,
  /** Zeilenweiser Bildaufbau. */
  scanDuration: 1.2,
  /** Der Lootbox-Moment: Stocken bei 50 %. */
  stallAt: 0.5,
  stallDuration: 0.4,
  /** Reaktion vor Konsequenz: erst das Gesicht des Reisenden. */
  faceReaction: 0.2,
  /** Danach Alarm / Stempel. */
  verdict: 0.35,
  /** Banner steht. */
  bannerHold: 2.2,
  /** Harte Obergrenze pro Sequenz (Test in M4). */
  maxSequenceDuration: 5.0,
} as const;

/** Timeline-Labels, auf die die Sequenz-Tests pruefen (Architektur §6). */
export const XRAY_LABELS = {
  scanStart: 'scanStart',
  stall: 'stall',
  scanComplete: 'scanComplete',
  /** Muss immer >= `scanComplete` liegen — das Ergebnis ist nie vor 100 % erkennbar. */
  revealed: 'revealed',
  face: 'face',
  verdict: 'verdict',
  banner: 'banner',
} as const;

/* ------------------------------------------------------------------ */
/* Schranke (GDD §3.5 / §4.2)                                          */
/* ------------------------------------------------------------------ */

export const GATE = {
  /** Reisender laeuft zur Schranke. */
  walkUp: 0.5,
  /** Stempel-Slam. */
  stamp: 0.25,
  /** Schmuggler-Koffer: Ampel bleibt gelb, bevor er aufklappt. */
  smugglerStall: 0.6,
  /** Pause zwischen zwei Koffern. */
  gap: 0.35,
  /** Harte Obergrenze pro Sequenz (Test in M3). */
  maxSequenceDuration: 3.0,
} as const;

/* ------------------------------------------------------------------ */
/* Kamera (Art Direction §6)                                           */
/* ------------------------------------------------------------------ */

export const CAMERA = {
  toXray: 0.5,
  backFromXray: 0.4,
  toGate: 0.5,
  shake: 0.3,
} as const;

/* ------------------------------------------------------------------ */
/* HUD & Screens                                                       */
/* ------------------------------------------------------------------ */

export const HUD = {
  /** Fragevorschlag im Verhoer wechselt. */
  questionRotateSec: 8,
  /** Letzte Sekunden des Verhoers ticken hoerbar. */
  tickFromSec: 10,
  bannerIn: 0.3,
  bannerOut: 0.25,
} as const;

/** Screen-Wipe zwischen Screens (wie Drinkshot). */
export const WIPE = { duration: 0.32 } as const;
