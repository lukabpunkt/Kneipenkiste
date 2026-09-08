/**
 * `fall_bounce_wall` (GDD §4.3).
 *
 * Ping-Pong zwischen den Schluchtwänden: drei Aufpraller mit Squash, Sternchen, Landung
 * als Häufchen auf einem Felsvorsprung — und dann rutscht der Felsvorsprung ab.
 *
 * Die längste der sechs Sequenzen, weil der Gag zweistufig ist: Erst scheint es
 * überstanden, dann geht der Boden mit. Sie bleibt trotzdem unter fünf Sekunden — die
 * Bounces sind kurz, und die zweite Pointe braucht nur einen Wimpernschlag Pause.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';
import { climbBack, eyeContact, fallersOf, plankOf, RIVER_SURFACE, snap, splash } from './fallKit';

/** Drei Aufpraller — weniger wäre kein Ping-Pong, mehr wäre Zeitspiel. */
const BOUNCES = 3;
const BOUNCE_MS = 260;

export const BounceWall: Sequence = {
  id: 'fall_bounce_wall',
  kind: 'fall',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const fallers = fallersOf(ctx);
    const plank = plankOf(ctx);
    if (!plank || fallers.length === 0) return timeline;

    eyeContact(timeline, ctx, fallers, plank);
    const snapAt = snap(timeline, ctx, fallers, plank);

    const leftWall = STAGE.plateauLeftEnd - 20;
    const rightWall = STAGE.plateauRightStart + 20;
    /* Der Vorsprung liegt über dem Fluss — sonst gäbe es keine zweite Pointe. */
    const ledgeY = STAGE.riverY - 210;

    timeline.call(
      () => {
        for (const hiker of fallers) hiker.setFace('panic');
      },
      undefined,
      snapAt
    );

    /* --- Ping-Pong: jeder Aufprall tiefer als der vorige --- */
    for (let bounce = 0; bounce < BOUNCES; bounce += 1) {
      const at = snapAt + (bounce * BOUNCE_MS) / 1000;
      const toLeft = bounce % 2 === 0;
      const targetX = toLeft ? leftWall : rightWall;
      const targetY = plank.baseY + ((ledgeY - plank.baseY) * (bounce + 1)) / (BOUNCES + 1);

      for (const hiker of fallers) {
        timeline.to(
          hiker.view.position,
          { x: targetX, y: targetY, duration: BOUNCE_MS / 1000, ease: 'power1.in' },
          at
        );
        timeline.to(
          hiker.view,
          { rotation: toLeft ? -2 : 2, duration: BOUNCE_MS / 1000, ease: 'none' },
          at
        );

        /* Squash im Aufprallframe, dann zurück — der Kern des Cartoon-Aufpralls. */
        timeline.call(
          () => {
            hiker.squash(0.55);
            ctx.fx.starsAt(hiker.x, hiker.y - hiker.height * 0.5, 4);
            ctx.play('rock_squash');
          },
          undefined,
          at + BOUNCE_MS / 1000
        );
        timeline.call(() => hiker.squash(1.12), undefined, at + BOUNCE_MS / 1000 + 0.07);
        timeline.call(() => hiker.squash(1), undefined, at + BOUNCE_MS / 1000 + 0.14);
      }
    }

    /* --- Landung als Häufchen. Es sieht kurz nach Rettung aus. --- */
    const landAt = snapAt + (BOUNCES * BOUNCE_MS) / 1000 + 0.16;
    const ledgeX = STAGE.worldWidth * 0.42;

    fallers.forEach((hiker, index) => {
      timeline.to(
        hiker.view.position,
        { x: ledgeX + index * 14, y: ledgeY - index * 10, duration: 0.3, ease: 'power2.out' },
        landAt
      );
      timeline.to(hiker.view, { rotation: 0.4 + index * 0.2, duration: 0.3 }, landAt);
    });
    timeline.call(
      () => {
        for (const hiker of fallers) hiker.setFace('smug_shrug');
        ctx.play('relief_exhale');
      },
      undefined,
      landAt + 0.3
    );

    /* --- Und dann rutscht der Vorsprung ab --- */
    /* Die Pause ist knapp bemessen: Die Sequenz hat als längste der sechs am wenigsten Luft. */
    const slideAt = landAt + 0.5;
    timeline.call(
      () => {
        for (const hiker of fallers) hiker.setFace('help');
        ctx.play('wood_rot');
      },
      undefined,
      slideAt
    );
    for (const hiker of fallers) {
      timeline.to(hiker.view.position, { y: RIVER_SURFACE, duration: 0.55, ease: 'power2.in' }, slideAt);
      timeline.to(hiker.view, { rotation: 1.8, duration: 0.55, ease: 'none' }, slideAt);
    }
    /*
     * Kürzerer Rückweg als bei den anderen: Die Kamera ist der letzte Tween der Timeline,
     * und diese Sequenz erzählt zwei Pointen statt einer. Mit 600 ms lag sie bei 5,04 s —
     * 40 ms über dem Limit aus A4.
     */
    timeline.add(ctx.camera.followFall(420), slideAt);
    timeline.to({}, { duration: 0.55 }, slideAt);

    splash(timeline, ctx, fallers);
    climbBack(timeline, ctx, fallers, plank);

    return timeline;
  },
};

registerSequence(BounceWall);
