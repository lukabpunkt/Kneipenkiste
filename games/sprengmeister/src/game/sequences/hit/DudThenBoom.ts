/**
 * `hit_dud_then_boom` — erst klick, dann bumm (GDD §4.1).
 *
 * Die Mine macht "klick". Der Digger atmet auf, wischt sich die Stirn, dreht sich weg —
 * und dann knallt es ihm in den Ruecken.
 *
 * ## Warum sie im Doppelagent-Modus gesperrt ist
 *
 * `excludeInModes: ['doubleAgent']` ist eine **Regel**, keine Vorliebe. In diesem Modus
 * legt jeder zusaetzlich einen echten Blindgaenger, der genau so anfaengt: klick,
 * Rauchwoelkchen, Schreck, nichts passiert. Wer beide Sequenzen im selben Spiel zulaesst,
 * macht den Blindgaenger wertlos — niemand koennte mehr glauben, dass es beim Klicken
 * bleibt, und der ganze Bluff des Modus waere weg (GDD §3.6).
 *
 * ## Der Aufbau
 *
 * Diese Sequenz dreht die Reihenfolge um: Der eigentliche Knall kommt **spaet**. Deshalb
 * ist sie die einzige, die den gemeinsamen `blast()`-Kopf nicht am Anfang benutzt,
 * sondern erst nach der Entwarnung. Der Farbring bleibt trotzdem an seinem Platz —
 * gemessen wird ab dem Explosions-Frame, und der liegt hier eben spaeter.
 */

import gsap from 'gsap';
import { EXPLOSION } from '@/config/choreo';
import { ANIM } from '@/config/theme';
import type { CueAt, DigSequence } from '../Sequence';
import { liftLid, scheduleCues } from '../Sequence';
import { explosionCue, RING_AT, standUp } from './shared';

/**
 * Wie lange die Entwarnung dauert, bevor es doch knallt.
 *
 * Ursprünglich 1,35 s — das war zu lang, und zwar aus zwei Gruenden. Erstens fordert
 * Audit A4 "in 1 s lesbar: wer trinkt, wie viel, wer war's"; der Farbring haengt hier am
 * Knall und kam damit erst nach 1,47 s. Zweitens zeigt der `DigDirector` das
 * Trink-Banner beim **Aufdecken**, nicht beim Knall: Am Tisch steht also schon "Anna
 * trinkt 2", waehrend der Digger sich noch die Stirn wischt. Ein kurzer Vorsprung ist
 * ein Witz — anderthalb Sekunden sind ein Widerspruch.
 */
const BOOM_AT = 0.85;

export const dudThenBoomSequence: DigSequence = {
  id: 'hit_dud_then_boom',
  kind: 'hit',
  weight: 2,
  excludeInModes: ['doubleAgent'],
  build(context) {
    const { tile, digger, camera, fx, result, lowEffects } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const stack = Math.max(1, result.foreignMines.length);
    const spot = { x: 0, y: 0 };
    const cues: CueAt[] = [
      { cue: 'plate_flip', at: 0 },
      { cue: 'fuse_click', at: 0.12 },
    ];

    timeline.add(() => {
      spot.x = digger.view.x;
      spot.y = digger.view.y;
    }, 0);

    /* --- Klick: die Platte hebt sich, mehr nicht ---------------------- */
    const lid = liftLid(timeline, tile);
    timeline.to(
      lid,
      { y: -size * 0.2, alpha: 0, duration: 0.3, ease: 'power2.out', onComplete: () => tile.dropLid() },
      0
    );
    timeline.add(() => digger.setFace('ouch'), 0.12);
    timeline.to(digger.view, { x: `-=${size * 0.18}`, duration: 0.14, ease: 'back.out(3)' }, 0.12);

    /* --- Entwarnung: Stirn wischen, wegdrehen -------------------------- */
    timeline.add(() => digger.setFace('relief'), 0.34);
    timeline.to(digger.body, { rotation: -0.12, duration: 0.18, ease: 'sine.inOut' }, 0.34);
    timeline.to(digger.body, { rotation: 0.06, duration: 0.2, ease: 'sine.inOut' }, 0.52);
    // Er dreht sich weg: die Figur spiegelt sich, der Ruecken zeigt zur Platte.
    timeline.to(digger.body.scale, { x: -1, duration: 0.2, ease: 'power2.inOut' }, 0.6);
    cues.push({ cue: 'crowd_ooh', at: 0.38 });

    /* --- BUMM ---------------------------------------------------------- */
    timeline.addLabel(EXPLOSION.frameLabel, BOOM_AT);
    timeline.add(() => {
      camera.shake(ANIM.shakeAmplitudePx * 1.2);
      digger.soot();
      digger.setFace('x_eyes');
    }, BOOM_AT);
    timeline.add(fx.smoke(tile.view.x, tile.view.y, 0.7 + stack * 0.25), BOOM_AT);
    timeline.add(fx.dirt(tile.view.x, tile.view.y, 10), BOOM_AT);
    if (!lowEffects) timeline.to({}, { duration: ANIM.hitStopMs / 1000 }, BOOM_AT);

    // Nach vorn weggeschleudert — der Schlag kam von hinten.
    timeline.to(digger.body.scale, { x: -1.3, y: 0.7, duration: 0.06, ease: 'power2.out' }, BOOM_AT);
    timeline.to(digger.view, { x: `-=${size * 0.9}`, duration: 0.4, ease: 'power2.out' }, BOOM_AT);
    timeline.to(digger.view, { rotation: -1.6, duration: 0.4, ease: 'power1.out' }, BOOM_AT);
    timeline.to(digger.body.scale, { x: -1, y: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });

    cues.push({ cue: explosionCue(stack), at: BOOM_AT });
    cues.push({ cue: 'crowd_laugh', at: BOOM_AT + 0.35 });

    /* --- Der Schuldige, gemessen ab dem Knall -------------------------- */
    timeline.addLabel(EXPLOSION.ringLabel, BOOM_AT + RING_AT);
    timeline.fromTo(
      tile.marksView.scale,
      { x: 0.4, y: 0.4 },
      { x: 1, y: 1, duration: EXPLOSION.ringGrowMs / 1000, ease: 'back.out(2.4)', immediateRender: false },
      EXPLOSION.ringLabel
    );

    /* Zurueck auf die Fuesse — und wieder richtig herum. */
    timeline.add(() => digger.setProp('pretzelShovel', false), BOOM_AT + 0.9);
    timeline.to(digger.body.scale, { x: 1, y: 1, duration: 0.3, ease: 'power2.out' }, BOOM_AT + 0.9);
    standUp(timeline, context, { cues, spot }, BOOM_AT + 0.9);

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
