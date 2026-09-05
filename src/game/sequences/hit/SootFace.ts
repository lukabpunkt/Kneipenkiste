/**
 * `hit_soot_face` — die Explosion ins Gesicht (GDD §4.1).
 *
 * Kleine Explosion direkt vor der Nase: Der Digger bleibt stehen, das Gesicht ist
 * komplett schwarz, die Augen blinzeln weiss daraus hervor, die Haare stehen als Faecher
 * hoch. Er hustet ein Rauchringchen und kippt steif nach hinten.
 *
 * ## Warum er zuerst stehen bleibt
 *
 * Alle anderen Hit-Sequenzen werfen ihn weg. Diese haelt ihn fest — eine Sekunde lang
 * passiert **nichts** ausser einem schwarzen Gesicht, und genau diese Stille ist der
 * Witz. Das steife Umkippen danach ist die Aufloesung, kein Sturz: `power2.in` ohne
 * Federung, wie ein Brett.
 */

import gsap from 'gsap';
import type { CueAt, DigSequence } from '../Sequence';
import { scheduleCues } from '../Sequence';
import { blast, standUp } from './shared';

/** Wann er umkippt. Davor: das schwarze Gesicht, und sonst nichts. */
const TIP_AT = 1.1;

export const sootFaceSequence: DigSequence = {
  id: 'hit_soot_face',
  kind: 'hit',
  weight: 3,
  build(context) {
    const { tile, digger, fx } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const state = blast(context, timeline);
    const cues: CueAt[] = state.cues;

    /* --- Stehen bleiben, nur zittern --------------------------------- */
    timeline.add(() => {
      digger.setFace('soot_blink');
      digger.setProp('hairFan', true);
    }, 0.08);
    timeline.to(
      digger.view,
      { x: `+=${size * 0.03}`, duration: 0.05, repeat: 5, yoyo: true, ease: 'none' },
      0.08
    );
    // Der Faecher schnellt hoch — Overshoot, sonst wirkt er angeklebt.
    timeline.fromTo(
      digger.body.scale,
      { x: 1.14, y: 0.9 },
      { x: 1, y: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)', immediateRender: false },
      0.08
    );

    /* --- Das Rauchringchen ------------------------------------------- */
    timeline.add(fx.smoke(digger.view.x, digger.view.y - size * 0.5, 0.35), 0.62);
    cues.push({ cue: 'dud_pfff', at: 0.62, detune: 7 });

    /* --- Und dann kippt er steif nach hinten ------------------------- */
    timeline.add(() => digger.setFace('x_eyes'), TIP_AT);
    timeline.to(digger.view, { rotation: -1.5, duration: 0.34, ease: 'power2.in' }, TIP_AT);
    timeline.to(digger.view, { y: `+=${size * 0.14}`, duration: 0.34, ease: 'power2.in' }, TIP_AT);
    cues.push({ cue: 'plate_stomp', at: TIP_AT + 0.34 });
    cues.push({ cue: 'crowd_laugh', at: TIP_AT + 0.42 });

    standUp(timeline, context, state, TIP_AT + 0.8);

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
