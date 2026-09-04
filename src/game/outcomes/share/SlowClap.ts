/**
 * `share_slow_clap` — "Der langsame Applaus" (Backlog nach 1.0).
 *
 * Einer fängt an zu klatschen. Langsam, einzeln, fast höhnisch. Dann steigt der zweite
 * ein, der dritte, und am Ende klatschen alle im Takt — bis Kassel die Gebühr kassiert
 * und der Applaus mitten in der Bewegung abreißt.
 *
 * Die dritte Inszenierung für "alle teilen" und die einzige mit einem **Ton in der
 * Stille**: Zwischen den ersten Schlägen passiert nichts, und genau die Pausen machen
 * den Gag. Wer sie kürzt, bekommt Beifall statt Spott.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

/** Abstand der ersten Schläge — er wird von Klatscher zu Klatscher kürzer. */
const FIRST_GAP = 0.62;
const LAST_GAP = 0.2;

export const slowClap: OutcomeSequence = {
  id: 'share_slow_clap',
  outcome: 'allShare',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const crooks = [...room.crooks.values()];
    if (crooks.length === 0) return timeline;

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    /**
     * Ein Schlag.
     *
     * Die Arme muessen **zusammen**, nicht hoch: Am Chibi-Rig haengen sie an den Schultern
     * und drehen sich um diesen Punkt — nach aussen gedreht liest sich das als "Arme
     * breit", nicht als Klatschen. Also erst weit ausholen (Anticipation), dann hart nach
     * innen, wo sich die Haende vor der Brust treffen.
     */
    const clap = (index: number, at: number, hard: boolean): void => {
      const crook = crooks[index % crooks.length];
      if (!crook) return;
      const rest = crook.armRest;
      const open = 0.55;
      const closed = -0.75;

      timeline
        // Ausholen nach aussen.
        .to(crook.rig.armL, { rotation: rest + open, duration: 0.12, ease: 'power2.out' }, at - 0.12)
        .to(crook.rig.armR, { rotation: -rest - open, duration: 0.12, ease: 'power2.out' }, at - 0.12)
        // Und zusammen.
        .to(crook.rig.armL, { rotation: rest + closed, duration: 0.08, ease: 'power3.in' }, at)
        .to(crook.rig.armR, { rotation: -rest - closed, duration: 0.08, ease: 'power3.in' }, at)
        // Follow-Through: Die Haende federn vom Aufprall zurueck.
        .to(crook.rig.armL, { rotation: rest - 0.2, duration: 0.18, ease: 'back.out(3)' }, at + 0.08)
        .to(crook.rig.armR, { rotation: -rest + 0.2, duration: 0.18, ease: 'back.out(3)' }, at + 0.08);

      timeline.to(crook.rig.body.scale, { x: 1.06, y: 0.94, duration: 0.07 }, at);
      timeline.to(crook.rig.body.scale, { x: 1, y: 1, duration: 0.18, ease: 'elastic.out(1, 0.5)' }, at + 0.07);

      ctx.play('card_stall', at, hard ? 4 : 0);
    };

    /*
     * Der Aufbau: Erst einer allein, dann kommt pro Schlag einer dazu, und der Abstand
     * schrumpft. Nach sechs Runden klatschen alle — das ist der Moment, in dem aus Spott
     * echter Applaus wird.
     */
    const beats = 6;
    let at = 0.25;
    for (let beat = 0; beat < beats; beat++) {
      const joined = Math.min(crooks.length, beat + 1);
      for (let i = 0; i < joined; i++) clap(i, at + i * 0.02, beat === beats - 1);

      const progress = beat / (beats - 1);
      at += FIRST_GAP + (LAST_GAP - FIRST_GAP) * progress;
    }

    timeline.call(() => ctx.play('crowd_laugh'), undefined, 1.4);
    for (const crook of crooks) timeline.call(() => crook.setFace('happy'), undefined, 1.4);

    /*
     * Und aus. Kassel klingelt, alle Arme fallen mitten im Schlag herunter — der Hit-Stop
     * sitzt genau auf der Kasse, nicht danach.
     */
    timeline.call(
      () => {
        ctx.play('cash_register');
        for (const crook of crooks) crook.setFace('guilty');
        ctx.say('allShare', 1800);
      },
      undefined,
      at
    );
    timeline.add(ctx.camera.shake(6, 180), at);
    timeline.add(fx.starsAbove(STAGE.worldSize / 2, STAGE.worldSize * 0.42, 4, 700), at);

    const afterBell = hitStop(timeline, at);
    for (const crook of crooks) {
      timeline.to(crook.rig.armL, { rotation: crook.armRest, duration: 0.42, ease: 'power2.out' }, afterBell);
      timeline.to(crook.rig.armR, { rotation: -crook.armRest, duration: 0.42, ease: 'power2.out' }, afterBell);
    }

    timeline.add(buildSipCounters(ctx, 120), afterBell + 0.2);
    timeline.to({}, { duration: 1.0 });
    return timeline;
  },
};
