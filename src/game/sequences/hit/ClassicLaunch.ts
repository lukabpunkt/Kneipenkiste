/**
 * `hit_classic_launch` — der Klassiker (GDD §4.1).
 *
 * Rauchpilz, der Digger fliegt kerzengerade nach oben aus dem Bild, eine Sekunde Stille,
 * dann kommt er russgeschwaerzt kopfueber zurueck und steckt mit dem Kopf im Krater. Die
 * Beine strampeln. Der Helm landet 300 ms spaeter obendrauf.
 *
 * ## Die Sekunde Stille
 *
 * Sie ist der eigentliche Gag. Ein Digger, der sofort zurueckfaellt, ist ein Sprung; ein
 * Digger, der weg ist und dessen Rueckkehr man erwartet, ist eine Pointe. Wichtig ist
 * dabei, dass die Stille **nach** dem Farbring liegt: Wer schuld ist, steht schon da,
 * waehrend alle nach oben gucken.
 *
 * Der spaet landende Helm ist Follow-Through (Art Direction §7): Die schwerste Bewegung
 * hoert zuletzt auf.
 */

import gsap from 'gsap';
import type { CueAt, DigSequence } from '../Sequence';
import { scheduleCues } from '../Sequence';
import { blast, blastOut, settleBody, standUp } from './shared';

/** Wann der Digger wieder auftaucht — eine Sekunde nach dem Abflug. */
const RETURN_AT = 1.25;
/** Der Helm ist schwerer und kommt spaeter. */
const HELMET_LANDS_AT = RETURN_AT + 0.3;

export const classicLaunchSequence: DigSequence = {
  id: 'hit_classic_launch',
  kind: 'hit',
  weight: 3,
  build(context) {
    const { tile, digger, fx } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const state = blast(context, timeline);
    const cues: CueAt[] = state.cues;

    /* --- Kerzengerade nach oben aus dem Bild ------------------------- */
    blastOut(timeline, context, 0);
    /*
     * Die Referenz braucht der Tween beim Bauen, das **Abloesen** gehoert ins Abspielen:
     * Sonst faellt der Helm schon waehrend der Anticipation vom Kopf (ADR-23). Dasselbe
     * Muster wie `liftLid()` in `Sequence.ts`.
     */
    const helmet = digger.helmetView;
    timeline.add(() => digger.detachHelmet(), 0);
    timeline.to(digger.view, { y: `-=${size * 9}`, duration: 0.5, ease: 'power2.out' }, 0.06);
    timeline.to(digger.view, { rotation: 0.4, duration: 0.5, ease: 'none' }, 0.06);
    timeline.to(helmet, { y: `-=${size * 11}`, rotation: 6, duration: 0.6, ease: 'power2.out' }, 0.06);

    cues.push({ cue: 'whistle_fall', at: 0.1, detune: 5 });

    /* --- Stille -------------------------------------------------------
     * Nichts passiert. Auf dem Bildschirm steht der Krater mit dem Farbring, und alle
     * am Tisch gucken nach oben.
     */

    /* --- Kopfueber zurueck in den Krater ----------------------------- */
    timeline.set(digger.view, { rotation: Math.PI }, RETURN_AT - 0.35);
    timeline.set(digger.view, { y: `-=${size * 3}` }, RETURN_AT - 0.35);
    timeline.to(
      digger.view,
      { y: tile.view.y + size * 0.28, duration: 0.35, ease: 'power3.in' },
      RETURN_AT - 0.35
    );
    timeline.add(() => {
      digger.setFace('x_eyes');
      digger.kickLegs(true);
    }, RETURN_AT);
    timeline.add(fx.dirt(tile.view.x, tile.view.y, 6), RETURN_AT);
    settleBody(timeline, context, RETURN_AT);
    cues.push({ cue: 'plate_stomp', at: RETURN_AT, detune: -4 });

    /* --- Und dann, mit Verspaetung, der Helm ------------------------- */
    timeline.to(
      helmet,
      { x: digger.view.x, y: tile.view.y - size * 0.1, rotation: 0, duration: 0.26, ease: 'power3.in' },
      HELMET_LANDS_AT
    );
    timeline.to(helmet, { y: `+=${size * 0.06}`, duration: 0.14, ease: 'bounce.out' });
    cues.push({ cue: 'helmet_bonk', at: HELMET_LANDS_AT + 0.26 });
    cues.push({ cue: 'crowd_laugh', at: HELMET_LANDS_AT + 0.4 });

    // Er zieht den Kopf aus dem Krater und stellt sich hin — die Runde geht weiter.
    standUp(timeline, context, state, HELMET_LANDS_AT + 0.5);

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
