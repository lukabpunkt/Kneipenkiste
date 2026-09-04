/**
 * `dud_pfff` — der Blindgaenger (GDD §4.1, Doppelagent-Modus).
 *
 * Die Platte hebt sich, es macht "Pfff", ein Rauchwoelkchen steigt auf, der Digger
 * springt zurueck, das Herz klopft sichtbar — und dann steht die Farbe des Legers da,
 * waehrend am Tisch gelacht wird.
 *
 * ## Warum der Ring hier genauso schnell kommt wie bei einer Explosion
 *
 * Es knallt nicht, aber es ist trotzdem ein Anschlag: Jemand hat dieses Feld praepariert.
 * "Der Schuldige ist immer sichtbar" (Design-Prioritaet 2) gilt deshalb auch hier, und
 * der Ring liegt auf demselben Versatz wie bei einem Krater. Das ist ausserdem der ganze
 * Sinn des Modus — man sieht, **wer** dort gelegt hat, und weiss beim naechsten Mal
 * trotzdem nicht, ob es knallt.
 *
 * Der Schreck selbst ist der Gag: `crowd_laugh` kommt erst, nachdem der Digger
 * zurueckgesprungen ist. Wer zuerst lacht und dann erschrickt, dreht die Pointe um.
 */

import gsap from 'gsap';
import { EXPLOSION, PLATE } from '@/config/choreo';
import type { CueAt, DigSequence } from '../Sequence';
import { liftLid, scheduleCues } from '../Sequence';

/** Wann der Digger zurueckspringt — direkt auf das "Pfff". */
const RECOIL_AT = 0.18;
const RING_AT = EXPLOSION.ringDelayMs / 1000;

export const dudSequence: DigSequence = {
  id: 'dud_pfff',
  kind: 'dud',
  weight: 1,
  build(context) {
    const { tile, digger, lowEffects } = context;
    const timeline = gsap.timeline();
    const size = tile.size;

    const cues: CueAt[] = [
      { cue: 'plate_flip', at: 0 },
      { cue: 'dud_pfff', at: RECOIL_AT },
      { cue: 'crowd_laugh', at: 0.9 },
    ];

    /*
     * Der Nullpunkt der Sequenz ist der Moment des Aufdeckens — der Director haengt sie
     * genau dort ein. Das Label macht den Abstand zum Ring **innerhalb** der Sequenz
     * messbar, damit `sequences.test.ts` nicht die halbe Buehne aufbauen muss.
     */
    timeline.addLabel(EXPLOSION.frameLabel, 0);

    /* --- Die Platte hebt sich, statt wegzukippen -------------------- */
    const lid = liftLid(timeline, tile);
    timeline.to(
      lid,
      {
        y: -size * 0.22,
        alpha: 0,
        duration: PLATE.openMs / 1000,
        ease: 'power2.out',
        onComplete: () => tile.dropLid(),
      },
      0
    );

    /* --- Pfff: das Rauchwoelkchen quillt heraus --------------------- */
    const content = tile.contentView;
    timeline.fromTo(
      content.scale,
      { x: 0.3, y: 0.3 },
      { x: 1.15, y: 1.15, duration: 0.4, ease: 'power2.out' },
      RECOIL_AT
    );
    timeline.fromTo(content, { alpha: 0 }, { alpha: 1, duration: 0.14 }, RECOIL_AT);
    timeline.to(
      content,
      { y: -size * 0.24, alpha: 0.15, duration: 0.7, ease: 'sine.out' },
      RECOIL_AT + 0.2
    );

    /*
     * Der Digger springt zurueck — **relativ**, nicht auf einen zur Bauzeit gemerkten
     * Punkt: Beim Bauen sitzt er noch auf der Bank, beim Abspielen steht er an der Platte.
     */
    timeline.add(() => digger.setFace('ouch'), RECOIL_AT);
    timeline.to(
      digger.view,
      {
        x: `-=${size * 0.3}`,
        y: `+=${size * 0.16}`,
        duration: 0.16,
        ease: 'back.out(3)',
      },
      RECOIL_AT
    );

    /*
     * Das klopfende Herz: ein doppelter Puls auf dem ganzen Digger. Bei Low-Effects
     * faellt er weg — er traegt keine Information, nur Charakter.
     */
    if (!lowEffects) {
      timeline.to(
        digger.view.scale,
        { x: '+=0.05', y: '+=0.05', duration: 0.12, repeat: 3, yoyo: true, ease: 'sine.inOut' },
        RECOIL_AT + 0.2
      );
    }

    timeline.add(() => digger.setFace('relief'), 0.95);
    timeline.to(
      digger.view,
      { x: `+=${size * 0.3}`, y: `-=${size * 0.16}`, duration: 0.22, ease: 'power1.inOut' },
      1.0
    );

    /* --- Der Schuldige ---------------------------------------------- */
    timeline.addLabel(EXPLOSION.ringLabel, RING_AT);
    timeline.fromTo(
      tile.marksView.scale,
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1, duration: EXPLOSION.ringGrowMs / 1000, ease: 'back.out(2.4)' },
      EXPLOSION.ringLabel
    );

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
