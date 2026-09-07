/**
 * Die vier Leer-Sequenzen (GDD §4.3): Wurm, Kaefer, Knochen, Stiefel.
 *
 * Der Deckel kippt weg, ein kleines Ding im Loch macht eine Bewegung, das
 * Temperatur-Symbol ploppt mit Overshoot herein, der Digger reagiert darauf. 800 ms,
 * dann ist der Zug vorbei — das ist die haeufigste Sequenz im Spiel und darf sich
 * deshalb nie wie eine Unterbrechung anfuehlen.
 *
 * ## Der wichtigste Satz dieser Datei
 *
 * **`dig_own_mine_silent` ist keine eigene Sequenz.** Wer seinen eigenen Trittstein
 * aufgraebt, bekommt exakt diese vier hier — dieselben IDs, dieselben Sounds, dieselben
 * Zeiten. Es gibt keinen Zweig, der die beiden Faelle trennt, weil `kindFor()` beide auf
 * `'empty'` abbildet und das `DigResult` sie gar nicht unterscheidbar macht (ADR-2).
 * Genau daran haengt der Kern des Spiels: Wer seine sicheren Felder benutzt, darf sich
 * dabei nicht verraten. `emptySequences.test.ts` prueft das Paar explizit nach.
 *
 * Welches Tier im Loch liegt, entscheidet der Seed der Zelle (`core/board.ts#critterFor`)
 * — die Sequenz waehlt nur die Bewegung dazu und weiss nicht, was sie bewegt.
 */

import gsap from 'gsap';
import { EMPTY_SEQUENCE, PLATE } from '@/config/choreo';
import type { CueAt, DigSequence, SequenceContext } from '../Sequence';
import { liftLid, scheduleCues } from '../Sequence';

/** Was eine der vier Varianten beisteuert: ihre Bewegung und ihre Toene. */
interface Variant {
  /** Baut die Bewegung des Fundstuecks in die Timeline. */
  move(timeline: gsap.core.Timeline, content: gsap.TweenTarget, size: number): void;
  /** Zusaetzliche Cues zu den gemeinsamen (Deckel, Temperatur). */
  cues: readonly CueAt[];
}

const CRITTER_AT = EMPTY_SEQUENCE.critterMs / 1000;

/**
 * Der gemeinsame Rumpf. Die vier Varianten unterscheiden sich **nur** in der Bewegung
 * des Fundstuecks — Deckel, Temperatur-Pop und Digger-Reaktion sind bei allen bis aufs
 * Frame identisch, damit der Rhythmus des Spiels gleich bleibt.
 */
function build(context: SequenceContext, variant: Variant): gsap.core.Timeline {
  const { tile, digger, result } = context;
  const timeline = gsap.timeline();
  const size = tile.size;

  const cues: CueAt[] = [{ cue: 'plate_flip', at: 0 }, ...variant.cues];

  /* --- Der Deckel kippt nach hinten weg ---------------------------- */
  const lid = liftLid(timeline, tile);
  timeline.to(
    lid,
    {
      rotation: -0.85,
      y: -size * 0.3,
      alpha: 0,
      duration: PLATE.openMs / 1000,
      ease: PLATE.openEase,
      onComplete: () => tile.dropLid(),
    },
    0
  );

  /* --- Das Fundstueck ---------------------------------------------- */
  const content = tile.contentView;
  timeline.fromTo(content, { alpha: 0 }, { alpha: 1, duration: 0.12, immediateRender: false }, 0.08);
  variant.move(timeline, content, size);

  /* --- Das Temperatur-Symbol ploppt herein -------------------------- */
  if (result.hint !== 'none') {
    cues.push({ cue: `temp_${result.hint}`, at: CRITTER_AT });
    timeline.fromTo(
      tile.hintView.scale,
      { x: 0, y: 0 },
      {
        x: 1,
        y: 1,
        duration: EMPTY_SEQUENCE.tempPopMs / 1000,
        ease: EMPTY_SEQUENCE.tempPopEase,
        immediateRender: false,
      },
      CRITTER_AT
    );
  }

  /*
   * Die Reaktion des Diggers (GDD §4.3): HEISS → schwitzen, WARM → Augenbraue,
   * KALT → zittern. Eine kleine Geste, aber sie macht aus einem Icon ein Gefuehl — und
   * sie sagt allen am Tisch dasselbe wie das Icon, nicht mehr.
   */
  timeline.add(() => digger.reactToHint(result.hint), CRITTER_AT);

  scheduleCues(timeline, context.audio, cues);
  return padTo(timeline, EMPTY_SEQUENCE.totalMs / 1000);
}

/** Haelt die Sequenz auf ihrer Solldauer, egal wie lang die Teile geraten sind. */
function padTo(timeline: gsap.core.Timeline, seconds: number): gsap.core.Timeline {
  const missing = seconds - timeline.duration();
  if (missing > 0) timeline.to({}, { duration: missing }, timeline.duration());
  return timeline;
}

/** Der Wurm winkt — hin, her, zurueck in die Mitte. */
export const wormSequence: DigSequence = {
  id: 'dig_empty_worm',
  kind: 'empty',
  weight: 3,
  build: (context) =>
    build(context, {
      cues: [{ cue: 'worm_squeak', at: 0.16 }],
      move: (timeline, content) => {
        timeline
          .to(content, { rotation: 0.34, duration: 0.16, ease: 'sine.inOut' }, 0.16)
          .to(content, { rotation: -0.28, duration: 0.18, ease: 'sine.inOut' })
          .to(content, { rotation: 0, duration: 0.14, ease: 'sine.out' });
      },
    }),
};

/** Der Kaefer trippelt einmal quer durchs Loch und wieder zurueck. */
export const beetleSequence: DigSequence = {
  id: 'dig_empty_beetle',
  kind: 'empty',
  weight: 3,
  build: (context) =>
    build(context, {
      // Derselbe Cue, hoeher gestimmt: ein Kaefer piept kleiner als ein Wurm.
      cues: [{ cue: 'worm_squeak', at: 0.14, detune: 500 }],
      move: (timeline, content, size) => {
        timeline
          .to(content, { x: size * 0.14, duration: 0.2, ease: 'sine.inOut' }, 0.14)
          .to(content, { x: -size * 0.14, duration: 0.26, ease: 'sine.inOut' })
          .to(content, { x: 0, duration: 0.2, ease: 'sine.inOut' });
      },
    }),
};

/** Der Knochen wackelt kurz — dann schnappt ihn sich etwas von oben weg. */
export const boneSequence: DigSequence = {
  id: 'dig_empty_bone',
  kind: 'empty',
  weight: 2,
  build: (context) =>
    build(context, {
      cues: [
        { cue: 'worm_squeak', at: 0.16, detune: -700 },
        { cue: 'whistle_fall', at: 0.52, detune: 700 },
      ],
      move: (timeline, content, size) => {
        timeline
          .to(content, { y: -size * 0.08, duration: 0.18, ease: 'sine.out' }, 0.16)
          .to(content, { y: 0, duration: 0.14, ease: 'sine.in' })
          .to(content, { y: -size * 0.9, alpha: 0, duration: 0.24, ease: 'back.in(2)' }, 0.52);
      },
    }),
};

/** Der alte Stiefel kippt um und schaukelt aus. */
export const bootSequence: DigSequence = {
  id: 'dig_empty_boot',
  kind: 'empty',
  weight: 2,
  build: (context) =>
    build(context, {
      cues: [{ cue: 'plate_stomp', at: 0.34, detune: 600 }],
      move: (timeline, content) => {
        timeline
          .to(content, { rotation: -0.2, duration: 0.2, ease: 'sine.in' }, 0.14)
          .to(content, { rotation: 0.04, duration: 0.34, ease: 'elastic.out(1, 0.4)' });
      },
    }),
};

/*
 * Die vier stehen bewusst in **einer** Datei, obwohl die Architektur je eine vorsieht
 * (`empty/Worm.ts`, `Beetle.ts`, …). Sie sind Varianten desselben Ablaufs: Deckel,
 * Fundstueck, Temperatur-Pop, Digger-Reaktion — nur die Bewegung im Loch unterscheidet
 * sich, oft um drei Zeilen. Vier Dateien mit je drei eigenen Zeilen und einem Import
 * haetten die Gemeinsamkeit versteckt, auf die es hier ankommt: dass alle vier exakt
 * gleich lang sind und gleich klingen (ADR-2).
 */
export const EMPTY_SEQUENCES: readonly DigSequence[] = [
  wormSequence,
  beetleSequence,
  boneSequence,
  bootSequence,
];
