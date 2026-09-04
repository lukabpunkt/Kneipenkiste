/**
 * `treasure_fanfare` — der Regelfall des Kistenfunds (GDD §4.2).
 *
 * Das Loch leuchtet golden, die Kiste springt mit Bounce heraus, klappt auf, die Flaschen
 * glaenzen, Konfetti — und der Digger tanzt mit ihr ueber dem Kopf, waehrend die anderen
 * auf der Bank neidisch zucken.
 *
 * ## Warum diese Sequenz laenger darf
 *
 * Sie beendet die Runde (GDD §3.5). Danach wartet niemand mehr auf seinen Zug — das ist
 * der einzige Moment, in dem das Spiel sich Zeit nehmen darf. `ANIM.treasureMaxMs` gibt
 * den Treasure-Sequenzen 5 s statt 3,5 s; `tests/unit/sequences.test.ts` misst nach.
 */

import gsap from 'gsap';
import { PLATE } from '@/config/choreo';
import type { CueAt, DigSequence } from '../Sequence';
import { liftLid, scheduleCues } from '../Sequence';

/*
 * Alle Digger-Bewegungen sind **relativ** (`'-=…'`). Die Sequenz wird gebaut, waehrend der
 * Digger noch auf der Bank sitzt, und laeuft erst, nachdem er an der Platte steht: Ein
 * absoluter Zielwert waere zur Bauzeit an der falschen Stelle abgelesen. GSAP loest
 * relative Werte beim Start des Tweens auf — und `yoyo` bringt sie von allein zurueck.
 */

export const fanfareSequence: DigSequence = {
  id: 'treasure_fanfare',
  kind: 'treasure',
  weight: 3,
  build(context) {
    const { tile, digger, others, lowEffects } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const content = tile.contentView;

    const cues: CueAt[] = [
      { cue: 'plate_flip', at: 0 },
      { cue: 'treasure_fanfare', at: 0.12 },
      { cue: 'bottle_clink', at: 0.66 },
      { cue: 'confetti', at: 0.72 },
      { cue: 'crowd_ooh', at: 0.5 },
    ];

    const lid = liftLid(timeline, tile);
    timeline.to(
      lid,
      {
        y: -size * 0.5,
        alpha: 0,
        rotation: 0.5,
        duration: PLATE.openMs / 1000,
        ease: 'power2.out',
        onComplete: () => tile.dropLid(),
      },
      0
    );

    /* --- Die Kiste springt heraus ----------------------------------- */
    timeline.fromTo(content, { alpha: 0 }, { alpha: 1, duration: 0.1 }, 0.12);
    timeline.fromTo(
      content,
      { y: size * 0.4 },
      { y: -size * 0.22, duration: 0.42, ease: 'back.out(2.6)' },
      0.12
    );
    timeline.fromTo(
      content.scale,
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1, duration: 0.42, ease: 'back.out(2.6)' },
      0.12
    );
    // Aufklappen: ein kurzes Ueberschwingen, damit die Kiste "auf" wirkt.
    timeline.to(content.scale, { x: 1.12, y: 0.92, duration: 0.14, ease: 'power2.out' }, 0.56);
    timeline.to(content.scale, { x: 1, y: 1, duration: 0.24, ease: 'elastic.out(1, 0.45)' });

    /* --- Der Digger tanzt ------------------------------------------- */
    timeline.add(() => digger.setFace('happy'), 0.5);
    if (!lowEffects) {
      timeline.to(
        digger.view,
        { y: `-=${size * 0.18}`, duration: 0.2, repeat: 3, yoyo: true, ease: 'sine.inOut' },
        0.7
      );
      timeline.to(
        digger.view,
        { rotation: 0.12, duration: 0.24, repeat: 3, yoyo: true, ease: 'sine.inOut' },
        0.7
      );
      timeline.set(digger.view, { rotation: 0 });

      /* Die anderen gucken neidisch: ein kleines Zucken auf der Bank. */
      others.forEach((other, index) => {
        timeline.to(
          other.view,
          { y: `-=${size * 0.06}`, duration: 0.16, yoyo: true, repeat: 1, ease: 'sine.inOut' },
          0.8 + index * 0.06
        );
      });
    }

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
