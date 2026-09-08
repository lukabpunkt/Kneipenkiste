/**
 * `basic_fall` — der Sturz ohne Gag (Roadmap M3, ersetzt in M4).
 *
 * Diese Sequenz ist der Vertrag, an den sich die sechs echten Fall-Sequenzen halten
 * müssen. Drei Labels in dieser Reihenfolge, nicht verhandelbar (Architektur §7, ADR-3):
 *
 * - `eyeContact` — die beiden drehen die Köpfe zueinander, Gesicht `oh`, "Oh."-Sprechblase.
 *   Das ist das Bild, das das Spiel verkauft (GDD §1). Es steht **immer** vor dem Bruch.
 * - `snap` — der Balken reisst.
 * - `climbedBack` — alle sind nass wieder oben. Kein Hiker verschwindet (Art Direction §7).
 *
 * Was M4 austauscht, ist das, was zwischen `snap` und `climbedBack` passiert. Was M4
 * **nicht** anfassen darf, sind die Labels.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { registerSequence, type Sequence, type SequenceContext } from '../Sequence';

export const BasicFall: Sequence = {
  id: 'basic_fall',
  kind: 'fall',

  build(ctx: SequenceContext): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const plank = ctx.plank !== undefined ? ctx.bridge.planks.get(ctx.plank) : undefined;
    const fallers = ctx.players
      .map((id) => ctx.hikers.get(id))
      .filter((hiker): hiker is NonNullable<typeof hiker> => hiker !== undefined);

    if (fallers.length === 0 || !plank) return timeline;

    /* --- Blickkontakt: die Signatur --- */
    timeline.addLabel('eyeContact', 0);
    timeline.call(() => {
      fallers.forEach((hiker, index) => {
        const other = fallers[index === 0 ? 1 : index - 1];
        if (other) hiker.lookAt(other);
      });
      ctx.play('creak_1');
    }, undefined, 0);

    /* Die Sprechblase kommt kurz nach dem Blick — erst sehen, dann begreifen. */
    timeline.add(
      ctx.fx.bubbles.show(
        { text: ctx.t('step.oh'), x: plank.baseX, y: plank.baseY - 210 },
        Math.max(500, ctx.timing.snapMs - 200)
      ),
      0.3
    );

    /* Näher ran: Das Publikum soll die zwei Gesichter sehen, nicht die Brücke. */
    timeline.add(ctx.camera.zoomTo(plank.baseX, plank.baseY - 40, ctx.timing.eyeContactMs), 0);

    /* --- Der Bruch --- */
    const snapAt = ctx.timing.snapMs / 1000;
    timeline.addLabel('snap', snapAt);
    timeline.call(
      () => {
        for (const hiker of fallers) {
          hiker.stopWobble();
          hiker.setDriven(true);
          hiker.setFace('help');
        }
        ctx.fx.burstSplinters(plank.baseX, plank.baseY, 10);
        ctx.play('plank_snap');
      },
      undefined,
      snapAt
    );
    timeline.add(plank.snap(), snapAt);
    timeline.add(ctx.camera.shake(), snapAt);

    /*
     * --- Der Sturz: jeder in seine Richtung, damit zwei auch als zwei zu sehen sind ---
     *
     * `() => hiker.x + drift` statt `hiker.x + drift`: Die Timeline wird **vor** dem
     * Anlauf gebaut, da stehen alle noch auf dem Plateau. Ein fester Wert liesse die
     * Gestürzten quer über die Schlucht zurück zur Aufstellung fliegen. GSAP wertet
     * Funktionen erst beim Start des Tweens aus — genau dann, wenn sie auf dem Balken
     * stehen.
     */
    const landingY = STAGE.riverY - 10;
    fallers.forEach((hiker, index) => {
      const drift = (index - (fallers.length - 1) / 2) * 52;
      timeline.to(
        hiker.view.position,
        { y: landingY, duration: 0.8, ease: 'power2.in' },
        snapAt + 0.05
      );
      timeline.to(
        hiker.view.position,
        { x: () => hiker.x + drift, duration: 0.8, ease: 'sine.out' },
        snapAt + 0.05
      );
      timeline.to(
        hiker.view,
        { rotation: index % 2 === 0 ? 1.7 : -1.7, duration: 0.8, ease: 'none' },
        snapAt + 0.05
      );
    });

    timeline.add(ctx.camera.followFall(), snapAt + 0.05);
    timeline.call(() => ctx.play('whistle_fall'), undefined, snapAt + 0.15);

    /* --- Der Platsch --- */
    timeline.call(() => {
      for (const hiker of fallers) ctx.fx.splashAt(hiker.x, STAGE.riverY);
      ctx.play('splash');
    });
    /* Untertauchen: kurz weg, damit der Aufstieg ein Auftauchen ist. */
    timeline.to(
      fallers.map((hiker) => hiker.view),
      { alpha: 0.2, duration: 0.24 }
    );

    /*
     * --- Und hoch: jeder klettert wieder rauf (Art Direction §7) ---
     *
     * **Nach** dem Ausblenden, nicht gleichzeitig: `wetClimb` setzt die Deckkraft selbst
     * zurück, und eine noch laufende Ausblendung überschreibt sie sofort wieder. Beim
     * ersten Versuch kamen die beiden als Geister zurück.
     */
    for (const hiker of fallers) {
      timeline.call(() => hiker.wetClimb(hiker.x, plank.baseY - 4));
    }
    /* Platzhalter-Dauer: Der Aufstieg läuft in einer eigenen Timeline, die Show wartet. */
    timeline.to({}, { duration: 1.4 });
    timeline.call(() => {
      for (const hiker of fallers) hiker.setDriven(false);
      ctx.play('crowd_laugh');
    });
    timeline.addLabel('climbedBack');

    return timeline;
  },
};

registerSequence(BasicFall);
