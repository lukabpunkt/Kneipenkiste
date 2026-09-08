/**
 * `fall_domino` (GDD §4.3) — nur ab drei Leuten auf einem Balken.
 *
 * Der Balken bricht, der erste fällt auf den zweiten, der auf den dritten. Sie fallen als
 * Stapel, und der unterste fragt: "Warum ich?!"
 *
 * `minGroup: 3` steht im Katalog (`config/sequences.ts`), nicht hier — der Choreographer
 * wählt schon in M0 aus, und eine Sequenz, die sich selbst ablehnt, käme zu spät.
 */

import gsap from 'gsap';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';
import { climbBack, eyeContact, fallersOf, plankOf, RIVER_SURFACE, snap, splash } from './fallKit';

/** Wie lange es dauert, bis der Anstoss beim Nächsten ankommt. */
const TOPPLE_STEP_MS = 130;

export const Domino: Sequence = {
  id: 'fall_domino',
  kind: 'fall',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const fallers = fallersOf(ctx);
    const plank = plankOf(ctx);
    if (!plank || fallers.length < 2) return timeline;

    eyeContact(timeline, ctx, fallers, plank);
    const snapAt = snap(timeline, ctx, fallers, plank);

    /*
     * --- Das Umkippen, einer nach dem anderen ---
     *
     * Der Versatz ist der ganze Gag: Fallen sie gleichzeitig, ist es ein Sturz. Fallen
     * sie nacheinander, ist es eine Kettenreaktion — und man sieht, wer sie ausgelöst hat.
     */
    fallers.forEach((hiker, index) => {
      const at = snapAt + (index * TOPPLE_STEP_MS) / 1000;
      timeline.call(
        () => {
          hiker.setFace(index === fallers.length - 1 ? 'help' : 'oh');
          ctx.play('step_thud');
        },
        undefined,
        at
      );
      /* Anticipation: erst gegen die Kipprichtung, dann um. */
      timeline.to(hiker.view, { rotation: -0.12, duration: 0.08, ease: 'power2.out' }, at);
      timeline.to(hiker.view, { rotation: 1.1, duration: 0.22, ease: 'power2.in' }, at + 0.08);
    });

    /* --- Der Stapel fällt als einer --- */
    const stackAt = snapAt + (fallers.length * TOPPLE_STEP_MS) / 1000 + 0.1;
    const last = fallers[fallers.length - 1]!;

    timeline.call(
      () => {
        ctx.fx.bubbles.show(
          { text: ctx.t('step.whyMe'), x: last.x, y: last.y - 150 },
          1200
        );
        ctx.play('whistle_fall');
      },
      undefined,
      stackAt
    );

    fallers.forEach((hiker, index) => {
      /* Übereinander, nicht nebeneinander — ein Stapel bleibt ein Stapel. */
      timeline.to(
        hiker.view.position,
        { y: RIVER_SURFACE - index * 18, duration: 0.85, ease: 'power2.in' },
        stackAt
      );
      timeline.to(
        hiker.view.position,
        { x: () => last.x + index * 6, duration: 0.85, ease: 'sine.inOut' },
        stackAt
      );
      timeline.to(hiker.view, { rotation: 1.5, duration: 0.85, ease: 'none' }, stackAt);
    });

    timeline.add(ctx.camera.followFall(850), stackAt);
    timeline.to({}, { duration: 0.85 }, stackAt);

    splash(timeline, ctx, fallers);
    climbBack(timeline, ctx, fallers, plank);

    return timeline;
  },
};

registerSequence(Domino);
