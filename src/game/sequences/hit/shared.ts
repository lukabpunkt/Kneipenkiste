/**
 * Was alle acht Hit-Sequenzen gemeinsam haben (GDD §4.1, Audit A4).
 *
 * Der Anfang jeder Explosion ist immer derselbe, und das ist Absicht: Krachen, Wackeln,
 * Rauch, Erde — und **der Farbring der Leger ≤ 300 ms danach**. Erst dann trennen sich
 * die acht Wege. Wer schuld ist, darf nie hinter dem Gag warten (Design-Prioritaet 2);
 * stuende dieser Block acht Mal einzeln da, wuerde er irgendwann in einer der acht
 * Sequenzen verrutschen.
 *
 * Die 7 Animationsprinzipien (Art Direction §7) verteilen sich so:
 *
 * - **Anticipation** liegt vor der Sequenz, im `DigDirector` (Laufen, drei Stoesse,
 *   zitternde Platte). Sie ist der Nervenmoment, nicht die Explosion.
 * - **Squash & Stretch** und **Overshoot** stecken in `blastOut()` und in jedem Aufprall.
 * - **Hit-Stop**: `ANIM.hitStopMs` Stille direkt nach dem Frame — ohne sie wirkt der
 *   Knall wie ein Schubser.
 * - **Follow-Through** ist die Sache jeder einzelnen Sequenz (die Erde, die verspaetet
 *   auf den Kopf faellt; der Helm, der 300 ms spaeter landet).
 * - **Sound-Sync**: alle Cues einer Sequenz werden in einem Callback vorgeplant (ADR-13).
 */

import { ANTICIPATION, EXPLOSION } from '@/config/choreo';
import { ANIM } from '@/config/theme';
import type { AudioCue } from '@/audio/AudioManager';
import type { CueAt, SequenceContext } from '../Sequence';
import { liftLid } from '../Sequence';

/** Der Ring sitzt hier — der Zielwert aus `choreo.ts`, hart begrenzt durch `ANIM`. */
export const RING_AT = EXPLOSION.ringDelayMs / 1000;

/** Je mehr Minen unter der Platte lagen, desto tiefer der Knall (GDD §6). */
export function explosionCue(stack: number): AudioCue {
  if (stack >= 3) return 'explosion_l';
  return stack >= 2 ? 'explosion_m' : 'explosion_s';
}

/** Wo der Digger stand, als es knallte — gefuellt beim Abspielen, nicht beim Bauen. */
export interface Blast {
  cues: CueAt[];
  spot: { x: number; y: number };
}

/**
 * Der gemeinsame Kopf jeder Hit-Sequenz: Deckel weg, Rauchpilz, Erde, Kamera-Ruck,
 * Russ auf den Digger — und der Farbring der Leger.
 *
 * Gibt die Cues zurueck, die die Sequenz noch um ihre eigenen ergaenzt, und den Platz,
 * an dem der Digger stand: Am Ende jeder Sequenz muss er dorthin zurueck, denn die Runde
 * geht weiter und der `DigDirector` schickt ihn von dort zur Bank (`standUp`).
 */
export function blast(context: SequenceContext, timeline: gsap.core.Timeline): Blast {
  const { tile, digger, camera, fx, result, lowEffects } = context;
  const size = tile.size;
  const stack = Math.max(1, result.foreignMines.length);

  timeline.addLabel(EXPLOSION.frameLabel, 0);

  /*
   * Der Standplatz wird beim **Abspielen** gemerkt: Beim Bauen sitzt der Digger noch auf
   * der Bank. Alles Weitere rechnet von hier aus.
   */
  const spot = { x: 0, y: 0 };
  timeline.add(() => {
    spot.x = digger.view.x;
    spot.y = digger.view.y;
  }, 0);

  /* --- Der Deckel fliegt weg --------------------------------------- */
  const lid = liftLid(timeline, tile);
  timeline.to(
    lid,
    {
      y: -size * 0.9,
      rotation: 1.8,
      alpha: 0,
      duration: 0.32,
      ease: 'power2.out',
      onComplete: () => tile.dropLid(),
    },
    0
  );

  /* --- Rauch und Erde ---------------------------------------------- */
  timeline.add(fx.smoke(tile.view.x, tile.view.y, 0.7 + stack * 0.25), 0);
  timeline.add(fx.dirt(tile.view.x, tile.view.y, 8 + stack * 4), 0);
  timeline.add(() => {
    camera.shake(stack > 1 ? ANIM.shakeAmplitudePx * 1.4 : undefined);
    digger.soot();
  }, 0);

  /*
   * Hit-Stop: Nach dem Frame steht alles kurz still. Die Pause ist der Unterschied
   * zwischen "es hat geknallt" und "etwas hat sich bewegt" (Art Direction §7).
   */
  if (!lowEffects) {
    timeline.to({}, { duration: ANIM.hitStopMs / 1000 }, 0);
  }

  /* --- Der Schuldige, vor jedem Gag -------------------------------- */
  timeline.addLabel(EXPLOSION.ringLabel, RING_AT);
  timeline.fromTo(
    tile.marksView.scale,
    { x: 0.4, y: 0.4 },
    { x: 1, y: 1, duration: EXPLOSION.ringGrowMs / 1000, ease: 'back.out(2.4)', immediateRender: false },
    EXPLOSION.ringLabel
  );

  return {
    spot,
    cues: [
      { cue: 'plate_flip', at: 0 },
      { cue: explosionCue(stack), at: 0 },
    ],
  };
}

/**
 * Das Ende jeder Hit-Sequenz: Der Digger steht wieder aufrecht auf seinem Platz.
 *
 * Kein Kosmetik-Detail, sondern Bedingung: Die Runde geht nach einer Explosion weiter,
 * und der `DigDirector` schickt ihn von hier zur Bank. Wer als Haufen liegen bleibt,
 * rutscht im naechsten Moment quer ueber das Feld nach Hause — und der Zug danach
 * beginnt mit einem Digger, der auf dem Kopf steht.
 *
 * Der Russ bleibt (Art Direction §7), das Gesicht auch: Er hat schliesslich gerade eine
 * Mine gefunden. Die Zielwerte sind Funktionen, weil `spot` erst beim Abspielen gefuellt
 * wird — GSAP loest sie beim Start des Tweens auf.
 */
export function standUp(
  timeline: gsap.core.Timeline,
  context: SequenceContext,
  blastState: Blast,
  at?: gsap.Position
): void {
  const { digger } = context;
  timeline.add(() => {
    digger.kickLegs(false);
    digger.attachHelmet();
    digger.setProp('hairFan', false);
    digger.setProp('whiteFlag', false);
    digger.setProp('pretzelShovel', false);
  }, at);
  timeline.to(
    digger.view,
    {
      x: () => blastState.spot.x,
      y: () => blastState.spot.y,
      rotation: 0,
      alpha: 1,
      duration: 0.3,
      ease: 'power2.out',
    },
    at
  );
  timeline.to(digger.body.scale, { x: 1, y: 1, duration: 0.3, ease: 'power2.out' }, at);
  timeline.to(digger.body, { rotation: 0, x: 0, y: 0, duration: 0.3, ease: 'power2.out' }, at);
}

/**
 * Der Digger wird hochgeworfen: erst gestaucht, dann gestreckt.
 *
 * Squash & Stretch in zwei Tweens — die Stauchung passiert im Moment des Knalls, die
 * Streckung waehrend des Flugs. Ohne sie sieht ein fliegender Digger aus wie ein
 * verschobenes Bild.
 */
export function blastOut(timeline: gsap.core.Timeline, context: SequenceContext, at = 0): void {
  const { digger } = context;
  timeline.to(
    digger.body.scale,
    { x: ANIM.squashScaleX, y: ANIM.squashScaleY, duration: ANIM.squashMs / 1000, ease: 'power2.out' },
    at
  );
  timeline.to(
    digger.body.scale,
    { x: 0.82, y: 1.24, duration: 0.14, ease: 'power2.in' },
    at + ANIM.squashMs / 1000
  );
}

/** Zurueck in eine normale Silhouette — mit Overshoot, damit es federt. */
export function settleBody(timeline: gsap.core.Timeline, context: SequenceContext, at?: number): void {
  timeline.to(context.digger.body.scale, { x: 1, y: 1, duration: 0.34, ease: 'elastic.out(1, 0.45)' }, at);
}

/** Wie lange die Anticipation gedauert hat — fuer Sequenzen, die darauf Bezug nehmen. */
export const ANTICIPATION_S =
  (ANTICIPATION.walkMs + ANTICIPATION.shovelStrokes * ANTICIPATION.shovelStrokeMs) / 1000;
