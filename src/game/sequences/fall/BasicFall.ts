/**
 * `basic_fall` — der Sturz ohne Gag.
 *
 * Seit M4 hat jeder Bruch seine eigene Sequenz; diese hier läuft nur noch als Rückfall,
 * wenn eine gewählte ID nicht gefunden wird. Sie bleibt trotzdem, und sie bleibt
 * vollständig: Ein Tippfehler im Katalog soll die Show nicht anhalten, und was dann läuft,
 * muss die Signatur genauso tragen wie alles andere.
 *
 * Zugleich ist sie die kürzestmögliche Vorlage — Blickkontakt, Bruch, Sturz, Platsch,
 * Aufstieg, sonst nichts. Wer eine siebte Fall-Sequenz baut, fängt hier an.
 */

import gsap from 'gsap';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';
import { climbBack, dropToRiver, eyeContact, fallersOf, plankOf, snap, splash } from './fallKit';

export const BasicFall: Sequence = {
  id: 'basic_fall',
  kind: 'fall',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const fallers = fallersOf(ctx);
    const plank = plankOf(ctx);
    if (!plank || fallers.length === 0) return timeline;

    eyeContact(timeline, ctx, fallers, plank);
    const snapAt = snap(timeline, ctx, fallers, plank);

    timeline.call(
      () => {
        for (const hiker of fallers) hiker.setFace('help');
        ctx.play('whistle_fall');
      },
      undefined,
      snapAt
    );

    dropToRiver(timeline, fallers, snapAt + 0.05);
    timeline.add(ctx.camera.followFall(), snapAt + 0.05);
    timeline.to({}, { duration: 0.8 }, snapAt + 0.05);

    splash(timeline, ctx, fallers);
    climbBack(timeline, ctx, fallers, plank);

    return timeline;
  },
};

registerSequence(BasicFall);
