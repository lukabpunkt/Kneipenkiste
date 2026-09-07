/**
 * Der Katalog der 14 Inszenierungen (GDD §4.3–§4.4).
 *
 * Hier stehen nur **Metadaten**: ID, Art, Gewicht, Mindest-Gruppengroesse. Die Timelines
 * liegen ab M3 in `src/game/sequences/` und melden sich unter genau diesen IDs an
 * (Registry-Test: jede Katalog-ID hat eine Implementierung, und keine Implementierung
 * fehlt im Katalog). So kann der Choreographer schon jetzt waehlen, ohne dass GSAP oder
 * PIXI in den Regelkern rutschen.
 */

export type SequenceKind = 'fall' | 'safe' | 'allSafe' | 'deathzone' | 'repair' | 'overlay';

export interface SequenceMeta {
  id: string;
  kind: SequenceKind;
  /** Relatives Gewicht in der Auswahl; > 0. */
  weight: number;
  /** Nur fuer Gruppen ab dieser Groesse. `fall_domino` braucht drei Leute. */
  minGroup?: number;
}

/* ------------------------------------------------------------------ */
/* Fall-Sequenzen (GDD §4.3) — mindestens 6 bis Release                */
/* ------------------------------------------------------------------ */

export const FALL_SEQUENCES: readonly SequenceMeta[] = [
  /* Das Bild, das das Spiel verkauft: zwei, die sich an den Haenden halten. */
  { id: 'fall_hold_hands', kind: 'fall', weight: 3 },
  { id: 'fall_coyote_delay', kind: 'fall', weight: 2 },
  { id: 'fall_seesaw', kind: 'fall', weight: 2 },
  { id: 'fall_rope_swing', kind: 'fall', weight: 2 },
  /* Braucht einen Stapel — zu zweit gibt es kein Domino. */
  { id: 'fall_domino', kind: 'fall', weight: 3, minGroup: 3 },
  { id: 'fall_bounce_wall', kind: 'fall', weight: 2 },
] as const;

/* ------------------------------------------------------------------ */
/* Sicher-Sequenzen (GDD §4.4) — mindestens 3                          */
/* ------------------------------------------------------------------ */

export const SAFE_SEQUENCES: readonly SequenceMeta[] = [
  { id: 'safe_wobble_hold', kind: 'safe', weight: 3 },
  { id: 'safe_confident_stroll', kind: 'safe', weight: 2 },
  { id: 'safe_tiptoe', kind: 'safe', weight: 2 },
] as const;

/* ------------------------------------------------------------------ */
/* Feste Inszenierungen — keine Auswahl, sie gehoeren zum Ereignis     */
/* ------------------------------------------------------------------ */

export const MISC_SEQUENCES = {
  /** Alle stehen, alle jubeln — dann fault ein Balken ab (Design-Pfeiler 3). */
  allSafeRot: 'all_safe_rot',
  deathzoneSign: 'deathzone_sign',
  repairCarpenter: 'repair_carpenter',
} as const;

export const OVERLAY_SEQUENCES = {
  rottenCrack: 'rotten_crack',
  deserterStamp: 'deserter_stamp',
} as const;

/** Alle 14 IDs — der Vollstaendigkeits-Check aus der DoD von v1.0 (GDD §9.5). */
export const ALL_SEQUENCE_IDS: readonly string[] = [
  ...FALL_SEQUENCES.map((s) => s.id),
  ...SAFE_SEQUENCES.map((s) => s.id),
  ...Object.values(MISC_SEQUENCES),
  ...Object.values(OVERLAY_SEQUENCES),
];

/** Welche Fall-Sequenzen kommen fuer eine Gruppe dieser Groesse in Frage? */
export function fallCandidates(groupSize: number): readonly SequenceMeta[] {
  return FALL_SEQUENCES.filter((s) => groupSize >= (s.minGroup ?? 2));
}
