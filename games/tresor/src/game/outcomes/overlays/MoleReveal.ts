/**
 * `mole_reveal` (GDD §4.4) — die Ausrede bekommt ein Gesicht.
 *
 * Nach dem Flip der letzten Diebeskarte fällt dem Maulwurf ein Bergbauhelm auf den Kopf.
 * Er zuckt mit den Schultern: Befehl ist Befehl. Genau dafür gibt es den Modus — jeder
 * am Tisch kann behaupten, er sei es gewesen, und einmal pro Runde stimmt es sogar.
 */

import gsap from 'gsap';
import type { OutcomeContext, OverlaySequence } from '../OutcomeSequence';
import type { DecisionCard } from '../../DecisionCard';
import type { Crook } from '../../Crook';

export const moleReveal: OverlaySequence = {
  id: 'mole_reveal',

  buildOnCard(ctx: OutcomeContext, card: DecisionCard, crook: Crook): gsap.core.Timeline {
    const timeline = gsap.timeline();

    ctx.play('anvil', 0.12);

    // Der Helm plumpst auf die Karte.
    timeline.add(card.dropHelmet(), 0.1);

    /*
     * Das Schulterzucken: Beide Arme kurz hoch, Kopf leicht schief. Mehr braucht es
     * nicht — "Befehl ist Befehl" liest man an der Geste ab, nicht an einer Sprechblase.
     */
    timeline.call(() => crook.setFace('guilty'), undefined, 0.2);
    timeline.add(crook.shrug(), 0.24);

    return timeline;
  },
};
