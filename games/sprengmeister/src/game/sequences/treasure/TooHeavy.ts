/**
 * `treasure_too_heavy` — die Kiste gewinnt (GDD §4.2).
 *
 * Er zieht, sie ist zu schwer, er faellt nach hinten, sie landet auf ihm, die Flaschen
 * klimpern — und aus dem Kistenberg kommt ein Daumen hoch.
 *
 * Der Aufprall und das Klimpern liegen **aufeinander**, nicht nacheinander: Zwei Toene
 * kurz hintereinander waeren zwei Ereignisse, gleichzeitig sind sie eine Pointe.
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

export const tooHeavySequence: DigSequence = {
  id: 'treasure_too_heavy',
  kind: 'treasure',
  weight: 2,
  build(context) {
    const { tile, digger } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const content = tile.contentView;

    const cues: CueAt[] = [
      { cue: 'plate_flip', at: 0 },
      { cue: 'treasure_fanfare', at: 0.1, detune: -300 },
      // Der Aufprall und das Klimpern liegen aufeinander — das ist die Pointe.
      { cue: 'plate_stomp', at: 0.92 },
      { cue: 'bottle_clink', at: 0.98 },
      { cue: 'crowd_laugh', at: 1.15 },
    ];

    const lid = liftLid(timeline, tile);
    timeline.to(
      lid,
      {
        y: -size * 0.4,
        alpha: 0,
        duration: PLATE.openMs / 1000,
        ease: 'power2.out',
        onComplete: () => tile.dropLid(),
      },
      0
    );

    /* --- Ziehen: sie kommt nur zaeh heraus -------------------------- */
    timeline.fromTo(content, { alpha: 0 }, { alpha: 1, duration: 0.1, immediateRender: false }, 0.1);
    timeline.fromTo(
      content,
      { y: size * 0.34 },
      { y: -size * 0.06, duration: 0.55, ease: 'power1.out', immediateRender: false },
      0.1
    );
    // Zwei Rucke: das Gewicht wird sichtbar, bevor es umkippt.
    timeline.to(content, { y: `+=${size * 0.05}`, duration: 0.1, yoyo: true, repeat: 1 }, 0.34);

    /* --- Er faellt nach hinten -------------------------------------- */
    timeline.add(() => digger.setFace('ouch'), 0.66);
    timeline.to(digger.view, { rotation: -1.35, duration: 0.26, ease: 'power2.in' }, 0.66);
    timeline.to(digger.view, { y: `+=${size * 0.12}`, duration: 0.26, ease: 'power2.in' }, 0.66);

    /* --- Die Kiste landet auf ihm ----------------------------------- */
    timeline.to(content, { y: size * 0.1, duration: 0.22, ease: 'power3.in' }, 0.7);
    timeline.to(content.scale, { x: 1.14, y: 0.86, duration: 0.08, ease: 'power2.out' }, 0.92);
    timeline.to(content.scale, { x: 1, y: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' });

    /* --- Daumen hoch aus dem Kistenberg ----------------------------- */
    timeline.add(() => digger.setFace('happy'), 1.25);
    timeline.to(digger.view, { rotation: -1.2, duration: 0.2, ease: 'sine.out' }, 1.25);

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
