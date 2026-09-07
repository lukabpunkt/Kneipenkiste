/**
 * `share_group_hug` — "Ehre unter Dieben" (GDD §4.4).
 *
 * Alle Crooks laufen zur Mitte, umarmen sich, Herzchen steigen auf. Herr Kassel wischt
 * eine Träne weg — und kassiert dann mit einem Kassenklingeln von jedem einen Schluck.
 * Alle gucken sauer.
 *
 * Der Witz liegt im Umschwung: erst Rührung, dann die Rechnung. Deshalb kommt die
 * Gebühr **nach** der Umarmung und nicht währenddessen (ADR-2: Frieden ist nie gratis).
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { buildSipCounters } from '../basic';
import { hitStop } from '../juice';
import type { OutcomeContext, OutcomeSequence } from '../OutcomeSequence';

export const groupHug: OutcomeSequence = {
  id: 'share_group_hug',
  outcome: 'allShare',
  weight: 1,

  build(ctx: OutcomeContext) {
    const timeline = gsap.timeline();
    const { room, fx } = ctx;
    const center = { x: STAGE.worldSize / 2, y: STAGE.worldSize * 0.66 };
    const crooks = [...room.crooks.values()];

    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    // Anticipation: erst in die Knie, dann losrennen.
    for (const crook of crooks) {
      crook.setFace('happy');
      timeline.to(crook.rig.body.scale, { x: 1.1, y: 0.9, duration: 0.12, ease: 'power2.in' }, 0);
      timeline.to(crook.rig.body.scale, { x: 1, y: 1, duration: 0.2, ease: 'back.out(2)' }, 0.12);
    }

    // Alle laufen zur Mitte — enger Kreis, leicht versetzt, damit sie sich nicht decken.
    crooks.forEach((crook, index) => {
      const spread = (index - (crooks.length - 1) / 2) * 62;
      // Overshoot beim Ankommen: Sie rutschen einen Tick zu weit und federn zurueck.
      timeline.add(
        crook.moveTo(center.x + spread, center.y + Math.abs(spread) * 0.12, 620, 'back.out(1.6)'),
        0.15
      );
    });
    ctx.play('crowd_aah', 0.4);

    /*
     * Die Umarmung. Sie druecken zu — und **halten** kurz, statt sofort loszulassen:
     * Erst der Hit-Stop macht aus dem Zusammenzucken eine Umarmung.
     */
    timeline.add(fx.heartsAbove(center.x, center.y - 200, 6), 0.75);
    const squeezeAt = 0.8;
    for (const crook of crooks) {
      timeline.to(crook.view.scale, { x: '*=0.94', duration: 0.18, ease: 'power2.out' }, squeezeAt);
    }
    const releaseAt = hitStop(timeline, squeezeAt + 0.18);
    for (const crook of crooks) {
      timeline.to(crook.view.scale, { x: '/=0.94', duration: 0.3, ease: 'elastic.out(1, 0.5)' }, releaseAt);
    }

    // Kassel wischt eine Träne weg …
    timeline.call(() => ctx.say('allShare', 1800), undefined, 0.9);
    const tear = room.spawnProp('props/tear', room.kassel.view.x + 26, room.kassel.view.y - 150, 0.8);
    timeline.fromTo(
      tear,
      { alpha: 0, y: tear.y - 20 },
      { alpha: 1, y: tear.y + 60, duration: 0.7, ease: 'power1.in' },
      1.0
    );
    timeline.to(tear, { alpha: 0, duration: 0.2 }, 1.7);

    // … und kassiert. Kassenklingeln, alle gucken sauer.
    timeline.call(
      () => {
        ctx.play('cash_register');
        for (const crook of crooks) crook.setFace('guilty');
      },
      undefined,
      2.0
    );
    timeline.add(ctx.camera.shake(6, 180), 2.0);

    timeline.add(buildSipCounters(ctx, 120), 2.05);
    timeline.to({}, { duration: 1.2 });
    return timeline;
  },
};
