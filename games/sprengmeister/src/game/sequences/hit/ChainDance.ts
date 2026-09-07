/**
 * `hit_chain_dance` — zwei Minen, zwei Treffer (GDD §4.1).
 *
 * Die erste Explosion wirft den Digger hoch, die zweite trifft ihn **in der Luft** und
 * schickt ihn quer — Ping-Pong. Er landet als Haeufchen, und darueber blinken die beiden
 * Legerfarben abwechselnd.
 *
 * ## Warum sie einen Stapel braucht
 *
 * `minStack: 2` ist keine Geschmacksfrage: Die Sequenz erzaehlt, dass **zwei** Leute
 * dieselbe Platte praepariert haben. Bei einer einzelnen Mine waere der zweite Schlag
 * gelogen — und die Registry haelt sie deshalb zurueck, statt sich darauf zu verlassen,
 * dass die Auswahl schon passen wird.
 *
 * Das abwechselnde Blinken der Ringe ist der einzige Ort im Spiel, an dem zwei Farben um
 * dieselbe Stelle konkurrieren. Sie wechseln sich ab, statt nebeneinander zu stehen:
 * Zwei Ringe gleichzeitig liest niemand in der Sekunde, die er dafuer hat.
 */

import gsap from 'gsap';
import { EXPLOSION } from '@/config/choreo';
import type { CueAt, DigSequence } from '../Sequence';
import { scheduleCues } from '../Sequence';
import { blast, blastOut, standUp } from './shared';

/** Der zweite Treffer, waehrend er noch fliegt. */
const SECOND_HIT_AT = 0.42;
const LAND_AT = 1.05;

export const chainDanceSequence: DigSequence = {
  id: 'hit_chain_dance',
  kind: 'hit',
  weight: 4,
  minStack: 2,
  build(context) {
    const { tile, digger, camera, fx } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const state = blast(context, timeline);
    const cues: CueAt[] = state.cues;

    /* --- Erster Treffer: hoch ----------------------------------------- */
    blastOut(timeline, context, 0);
    timeline.to(digger.view, { y: `-=${size * 2.2}`, duration: SECOND_HIT_AT, ease: 'power2.out' }, 0.05);
    timeline.to(digger.view, { rotation: 1.2, duration: SECOND_HIT_AT, ease: 'none' }, 0.05);

    /* --- Zweiter Treffer: mitten im Flug ------------------------------- */
    timeline.add(() => {
      camera.shake();
      digger.setFace('x_eyes');
    }, SECOND_HIT_AT);
    timeline.add(fx.smoke(digger.view.x, digger.view.y - size * 1.4, 0.6), SECOND_HIT_AT);
    // Quer weg und weiter hoch — der zweite Schlag kommt von der Seite.
    timeline.to(digger.view, { x: `+=${size * 1.1}`, duration: 0.55, ease: 'power1.out' }, SECOND_HIT_AT);
    timeline.to(digger.view, { y: `-=${size * 0.6}`, duration: 0.22, ease: 'power2.out' }, SECOND_HIT_AT);
    timeline.to(digger.view, { rotation: 5.2, duration: 0.6, ease: 'none' }, SECOND_HIT_AT);
    cues.push({ cue: 'explosion_m', at: SECOND_HIT_AT });
    cues.push({ cue: 'crowd_gasp', at: SECOND_HIT_AT + 0.08 });

    /* --- Landung als Haeufchen ----------------------------------------- */
    timeline.to(digger.view, { y: () => state.spot.y, duration: 0.4, ease: 'power2.in' }, LAND_AT - 0.4);
    timeline.to(digger.body.scale, { x: 1.35, y: 0.55, duration: 0.1, ease: 'power3.out' }, LAND_AT);
    timeline.add(fx.dirt(digger.view.x, digger.view.y, 6), LAND_AT);
    cues.push({ cue: 'plate_stomp', at: LAND_AT });

    /* --- Und darueber blinken die beiden Legerfarben -------------------- */
    const blinkAt = LAND_AT + 0.15;
    const blink = EXPLOSION.ringAlternateMs / 1000;
    timeline.to(
      tile.marksView,
      { alpha: 0.25, duration: blink / 2, repeat: 5, yoyo: true, ease: 'none' },
      blinkAt
    );
    timeline.set(tile.marksView, { alpha: 1 });
    cues.push({ cue: 'fuse_click', at: blinkAt });
    cues.push({ cue: 'fuse_click', at: blinkAt + blink });
    cues.push({ cue: 'crowd_laugh', at: blinkAt + 0.3 });

    standUp(timeline, context, state, blinkAt + blink * 3);

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
