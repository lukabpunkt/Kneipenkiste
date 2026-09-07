/**
 * `hit_helmet_rocket` — der Helm als Rakete (GDD §4.1).
 *
 * Der Helm schiesst mit Rauchspur davon, kreist einmal, der Digger schaut ihm hinterher —
 * und dann kommt er zurueck und trifft ihn am Kopf. Sternchen.
 *
 * ## Der Helm ist die Farbe
 *
 * Er traegt die Spielerfarbe (Art Direction §5), fliegt hier also als farbiger Punkt
 * durchs Bild, waehrend unten der Farbring der Leger steht. Das ist kein Konflikt: Der
 * Ring gehoert dem, der gelegt hat, der Helm dem, der getreten ist — und beide sind
 * gleichzeitig sichtbar, was am Tisch genau die richtige Frage aufwirft.
 *
 * Der zweite Treffer ist Follow-Through in Reinform: Die Bewegung ist schon vorbei, der
 * Zuschauer hat sich entspannt — und dann kommt sie zurueck.
 */

import gsap from 'gsap';
import type { CueAt, DigSequence } from '../Sequence';
import { scheduleCues } from '../Sequence';
import { blast, standUp } from './shared';

const BONK_AT = 1.35;

export const helmetRocketSequence: DigSequence = {
  id: 'hit_helmet_rocket',
  kind: 'hit',
  weight: 3,
  build(context) {
    const { tile, digger, fx } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const state = blast(context, timeline);
    const cues: CueAt[] = state.cues;

    /*
     * Die Referenz braucht der Tween beim Bauen, das **Abloesen** gehoert ins Abspielen:
     * Sonst faellt der Helm schon waehrend der Anticipation vom Kopf (ADR-23). Dasselbe
     * Muster wie `liftLid()` in `Sequence.ts`.
     */
    const helmet = digger.helmetView;
    timeline.add(() => digger.detachHelmet(), 0);

    /* --- Start: senkrecht hoch, dann eine Schleife -------------------- */
    timeline.to(helmet, { y: `-=${size * 2.6}`, duration: 0.3, ease: 'power3.out' }, 0.05);
    timeline.to(helmet, { rotation: 9, duration: 1.2, ease: 'none' }, 0.05);
    // Die Schleife: rueber, hoch, zurueck — drei Tweens, kein Pfad-Plugin.
    timeline.to(helmet, { x: `+=${size * 1.4}`, duration: 0.35, ease: 'sine.inOut' }, 0.35);
    timeline.to(helmet, { y: `-=${size * 0.5}`, duration: 0.35, ease: 'sine.out' }, 0.35);
    timeline.to(helmet, { x: `-=${size * 1.4}`, duration: 0.4, ease: 'sine.inOut' }, 0.7);
    timeline.to(helmet, { y: `+=${size * 0.4}`, duration: 0.4, ease: 'sine.in' }, 0.7);

    // Die Rauchspur haengt hinterher, nicht am Helm — sie bleibt stehen, wo er war.
    timeline.add(fx.smoke(tile.view.x, tile.view.y - size * 1.4, 0.4), 0.2);
    cues.push({ cue: 'whistle_fall', at: 0.05, detune: 9 });

    /* --- Der Digger schaut hinterher --------------------------------- */
    timeline.add(() => digger.setFace('ouch'), 0.1);
    timeline.to(digger.view, { rotation: -0.18, duration: 0.3, ease: 'sine.inOut' }, 0.3);
    timeline.to(digger.view, { rotation: 0.16, duration: 0.5, ease: 'sine.inOut' }, 0.7);

    /* --- Und dann trifft er ------------------------------------------ */
    timeline.to(
      helmet,
      {
        x: () => state.spot.x,
        y: () => state.spot.y - size * 0.9,
        rotation: 0,
        duration: 0.24,
        ease: 'power4.in',
      },
      BONK_AT - 0.24
    );
    timeline.add(() => {
      digger.setFace('x_eyes');
      digger.attachHelmet();
    }, BONK_AT);
    // Der Aufprall staucht ihn zusammen und federt zurueck (Squash, dann Overshoot).
    timeline.to(digger.body.scale, { x: 1.2, y: 0.8, duration: 0.07, ease: 'power2.out' }, BONK_AT);
    timeline.to(digger.body.scale, { x: 1, y: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
    timeline.add(fx.stars(digger.view.x, digger.view.y - size * 0.95, 5), BONK_AT + 0.02);

    cues.push({ cue: 'helmet_bonk', at: BONK_AT });
    cues.push({ cue: 'crowd_ooh', at: BONK_AT + 0.1 });

    standUp(timeline, context, state, BONK_AT + 0.7);

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
