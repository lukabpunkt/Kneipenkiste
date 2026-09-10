/**
 * `fall_coyote_delay` (GDD §4.3).
 *
 * Der Balken ist weg, aber sie stehen noch eine Sekunde in der Luft. Sie schauen nach
 * unten, halten ein "HILFE"-Schild hoch — und **dann** fallen sie. Die Hüte bleiben oben
 * und schweben langsam hinterher.
 *
 * Der ganze Gag ist die Pause. Sie muss lang genug sein, dass jemand sie bemerkt, und
 * kurz genug, dass sie nicht wie ein Hänger wirkt — eine Sekunde ist beides.
 */

import gsap from 'gsap';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';
import { climbBack, dropToRiver, eyeContact, fallersOf, hatsFlutter, plankOf, snap, splash } from './fallKit';

/** Wie lange die Schwerkraft wartet. */
const HANG_MS = 950;

export const CoyoteDelay: Sequence = {
  id: 'fall_coyote_delay',
  kind: 'fall',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const fallers = fallersOf(ctx);
    const plank = plankOf(ctx);
    if (!plank || fallers.length === 0) return timeline;

    eyeContact(timeline, ctx, fallers, plank);
    const snapAt = snap(timeline, ctx, fallers, plank);

    /* --- Die Pause: der Balken ist weg, sie stehen noch --- */
    timeline.call(
      () => {
        for (const hiker of fallers) hiker.setFace('scared');
      },
      undefined,
      snapAt
    );

    /* Erst nach unten schauen — das ist der Moment, in dem sie es merken. */
    timeline.call(
      () => {
        for (const hiker of fallers) {
          hiker.setFace('help');
          gsap.to(hiker.rig.head, { rotation: 0.5, duration: 0.2, ease: 'power2.out' });
        }
      },
      undefined,
      snapAt + 0.32
    );

    /* Und das Schild hochhalten. */
    timeline.call(
      () => {
        ctx.fx.signs.note(ctx.t('step.help'), plank.baseX, plank.baseY - 150);
        ctx.play('crowd_gasp');
      },
      undefined,
      snapAt + 0.5
    );

    /* Ein winziges Zappeln, damit die Pause nicht zum Standbild wird. */
    for (const hiker of fallers) {
      timeline.to(
        hiker.view,
        { rotation: 0.05, duration: 0.1, yoyo: true, repeat: 3, ease: 'sine.inOut' },
        snapAt + 0.45
      );
    }

    /* --- Und dann fällt der Groschen, und mit ihm die beiden --- */
    const dropAt = snapAt + HANG_MS / 1000;
    hatsFlutter(timeline, ctx, fallers, dropAt);
    timeline.call(() => ctx.play('whistle_fall'), undefined, dropAt);
    dropToRiver(timeline, fallers, dropAt, { durationMs: 620 });
    timeline.add(ctx.camera.followFall(700), dropAt);
    timeline.to({}, { duration: 0.62 }, dropAt);

    splash(timeline, ctx, fallers);
    climbBack(timeline, ctx, fallers, plank);

    return timeline;
  },
};

registerSequence(CoyoteDelay);
