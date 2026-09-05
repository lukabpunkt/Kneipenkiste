/**
 * `hit_tree_landing` — ab in den Baum (GDD §4.1).
 *
 * Der Digger fliegt in einem Bogen quer ueber das Feld und bleibt im Cartoon-Baum am
 * Rand haengen. Der Baum wackelt, Blaetter rieseln — und dann rutscht er Ast fuer Ast
 * herunter, in drei Rucken statt in einer Bewegung.
 *
 * ## Der Bogen
 *
 * Zwei getrennte Tweens fuer x und y: x laeuft linear durch, y geht erst hoch und dann
 * runter. Zusammen ergibt das eine Wurfparabel, ohne ein Pfad-Plugin zu laden — und die
 * Ease-Kurven sind die Schwerkraft.
 *
 * Wo der Baum steht, sagt das Feld (`context.field.treeTop`). Die Zahl steht nur an
 * einer Stelle: Wird der Baum verschoben, fliegt der Digger von selbst richtig.
 */

import gsap from 'gsap';
import type { CueAt, DigSequence } from '../Sequence';
import { scheduleCues } from '../Sequence';
import { blast, blastOut, standUp } from './shared';

const FLIGHT_S = 0.62;
/** Drei Rucke abwaerts — ein Ast nach dem anderen. */
const SLIDE_STEPS = 3;

export const treeLandingSequence: DigSequence = {
  id: 'hit_tree_landing',
  kind: 'hit',
  weight: 2,
  build(context) {
    const { tile, digger, fx, field } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const state = blast(context, timeline);
    const cues: CueAt[] = state.cues;

    const target = field.treeTop;

    /* --- Der Bogen ---------------------------------------------------- */
    blastOut(timeline, context, 0);
    timeline.to(digger.view, { x: target.x, duration: FLIGHT_S, ease: 'none' }, 0.06);
    timeline.to(
      digger.view,
      { y: target.y - size * 1.2, duration: FLIGHT_S * 0.55, ease: 'power2.out' },
      0.06
    );
    timeline.to(digger.view, { y: target.y, duration: FLIGHT_S * 0.45, ease: 'power2.in' });
    timeline.to(digger.view, { rotation: 3.4, duration: FLIGHT_S, ease: 'none' }, 0.06);
    cues.push({ cue: 'whistle_fall', at: 0.06 });

    const landAt = 0.06 + FLIGHT_S;

    /* --- Einschlag: der Baum wackelt, Blaetter rieseln ----------------- */
    timeline.add(() => digger.setFace('x_eyes'), landAt);
    if (field.tree) {
      timeline.to(
        field.tree,
        { rotation: 0.08, duration: 0.09, repeat: 5, yoyo: true, ease: 'sine.inOut' },
        landAt
      );
      timeline.set(field.tree, { rotation: 0 });
    }
    timeline.add(fx.leaves(target.x, target.y - size * 0.3, 8), landAt + 0.05);
    cues.push({ cue: 'tree_rustle', at: landAt });

    /* --- Ast fuer Ast herunter ---------------------------------------- */
    let at = landAt + 0.55;
    for (let step = 0; step < SLIDE_STEPS; step++) {
      timeline.to(
        digger.view,
        {
          y: `+=${size * 0.34}`,
          rotation: `+=${step % 2 === 0 ? 0.5 : -0.7}`,
          duration: 0.2,
          ease: 'power2.in',
        },
        at
      );
      // Zwischen zwei Aesten haengt er kurz — sonst ist es ein Fall, kein Rutschen.
      timeline.to(digger.view, { y: `-=${size * 0.04}`, duration: 0.14, ease: 'sine.out' });
      cues.push({ cue: 'tree_rustle', at, detune: 4 + step * 3 });
      at += 0.42;
    }

    cues.push({ cue: 'crowd_laugh', at: at + 0.1 });
    standUp(timeline, context, state, at + 0.1);

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
