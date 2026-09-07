/**
 * `hit_shovel_pretzel` — die Schaufel wird zur Brezel (GDD §4.1).
 *
 * Die Explosion verbiegt die Schaufel, der Digger haelt sie verwirrt hoch — und dann
 * faellt ihm mit Verzoegerung die Erde auf den Kopf. Er sitzt im Sandhaufen.
 *
 * ## Der Gag ist das Warten
 *
 * Das ist die Follow-Through-Sequenz (Art Direction §7): Die Explosion ist vorbei, der
 * Digger hat schon reagiert, der Zuschauer ist fertig mit dem Moment — **dann** kommt
 * die Erde. Wer die beiden Ereignisse naeher zusammenlegt, macht aus zwei Pointen eine.
 */

import gsap from 'gsap';
import type { CueAt, DigSequence } from '../Sequence';
import { scheduleCues } from '../Sequence';
import { blast, standUp } from './shared';

/** Wann die Erde kommt. Spaet genug, dass man sie nicht mehr erwartet. */
const DIRT_FALLS_AT = 1.15;

export const shovelPretzelSequence: DigSequence = {
  id: 'hit_shovel_pretzel',
  kind: 'hit',
  weight: 3,
  build(context) {
    const { tile, digger, fx } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const state = blast(context, timeline);
    const cues: CueAt[] = state.cues;

    /* --- Die Schaufel verbiegt sich ---------------------------------- */
    timeline.add(() => {
      digger.setProp('pretzelShovel', true);
      digger.setFace('ouch');
    }, 0.06);
    // Ein kurzer Schlag nach hinten, dann steht er wieder — er fliegt hier nicht.
    timeline.to(digger.view, { rotation: -0.22, duration: 0.1, ease: 'power2.out' }, 0.06);
    timeline.to(digger.view, { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.5)' });

    /* --- Verwirrt hochhalten ------------------------------------------ */
    timeline.add(() => digger.setFace('brow'), 0.55);
    timeline.to(digger.body, { rotation: 0.1, duration: 0.3, ease: 'sine.inOut' }, 0.55);
    timeline.to(digger.body, { rotation: -0.06, duration: 0.35, ease: 'sine.inOut' }, 0.85);

    /* --- Und dann faellt die Erde ------------------------------------- */
    timeline.add(fx.dirt(digger.view.x, digger.view.y - size * 1.6, 10), DIRT_FALLS_AT - 0.25);
    timeline.add(() => digger.setFace('x_eyes'), DIRT_FALLS_AT);
    // Er sackt zusammen: gestaucht, tiefer, und bleibt so sitzen.
    timeline.to(digger.body.scale, { x: 1.24, y: 0.66, duration: 0.12, ease: 'power3.out' }, DIRT_FALLS_AT);
    timeline.to(digger.view, { y: `+=${size * 0.12}`, duration: 0.12, ease: 'power3.out' }, DIRT_FALLS_AT);
    timeline.to(digger.body.scale, { x: 1.1, y: 0.78, duration: 0.3, ease: 'power1.out' });

    cues.push({ cue: 'shovel_dig', at: 0.06, detune: -9 });
    cues.push({ cue: 'mine_place', at: DIRT_FALLS_AT - 0.1 });
    cues.push({ cue: 'crowd_laugh', at: DIRT_FALLS_AT + 0.2 });

    standUp(timeline, context, state, DIRT_FALLS_AT + 0.75);

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
