/**
 * `hit_crater_hop` — Kapitulation im Krater (GDD §4.1).
 *
 * Die Explosion setzt den Digger in einen tiefen Krater. Man sieht nur noch den Helm —
 * und dann kommt eine Hand mit einer weissen Fahne heraus.
 *
 * ## Die kuerzeste der acht
 *
 * Sie braucht keinen Flug und keine Rueckkehr: Er verschwindet nach unten, wartet, und
 * gibt auf. Das macht sie zur ruhigen Variante zwischen den lauten — nicht jede
 * Explosion darf ein Feuerwerk sein, sonst nutzt sich der Effekt in der dritten Runde ab.
 *
 * Der Trick ist das Verschwinden: Der Digger sinkt hinter die Plattenebene, statt
 * ausgeblendet zu werden. Ausblenden waere ein Verschwinden, Sinken ist ein Krater.
 */

import gsap from 'gsap';
import type { CueAt, DigSequence } from '../Sequence';
import { scheduleCues } from '../Sequence';
import { blast, standUp } from './shared';

const FLAG_AT = 1.05;

export const craterHopSequence: DigSequence = {
  id: 'hit_crater_hop',
  kind: 'hit',
  weight: 2,
  build(context) {
    const { tile, digger, fx } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const state = blast(context, timeline);
    const cues: CueAt[] = state.cues;

    /* --- Kurz hoch, dann tief hinein ---------------------------------- */
    timeline.to(digger.view, { y: `-=${size * 0.7}`, duration: 0.22, ease: 'power2.out' }, 0.05);
    timeline.to(digger.view, { x: tile.view.x, duration: 0.42, ease: 'sine.inOut' }, 0.05);
    timeline.to(digger.view, { y: tile.view.y + size * 0.95, duration: 0.26, ease: 'power2.in' }, 0.27);
    timeline.add(() => digger.setFace('x_eyes'), 0.5);
    timeline.add(fx.dirt(tile.view.x, tile.view.y, 8), 0.5);
    cues.push({ cue: 'plate_stomp', at: 0.5, detune: -6 });

    /*
     * Die Stille im Loch. Auf dem Bildschirm passiert eine halbe Sekunde lang nichts —
     * das ist der Aufbau fuer die Fahne.
     */

    /* --- Die weisse Fahne --------------------------------------------- */
    timeline.add(() => digger.setProp('whiteFlag', true), FLAG_AT);
    timeline.fromTo(
      digger.view,
      { y: tile.view.y + size * 0.95 },
      { y: tile.view.y + size * 0.78, duration: 0.24, ease: 'back.out(2.4)', immediateRender: false },
      FLAG_AT
    );
    // Winken: zweimal hin und her, dann bleibt sie oben.
    timeline.to(
      digger.body,
      { rotation: 0.14, duration: 0.28, repeat: 3, yoyo: true, ease: 'sine.inOut' },
      FLAG_AT + 0.1
    );
    cues.push({ cue: 'crowd_laugh', at: FLAG_AT + 0.15 });
    cues.push({ cue: 'crowd_ooh', at: FLAG_AT + 0.55, detune: -3 });

    standUp(timeline, context, state, FLAG_AT + 1.15);

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
