/**
 * `basic_outcome` — die Inszenierung, die immer geht (Roadmap M3.6).
 *
 * Sie tut genau das Minimum, das eine Auszahlung braucht: Die Kamera geht in die Totale,
 * jeder Trinker bekommt seine Zahl ueber den Kopf, und die Crooks setzen das Gesicht auf,
 * das zu ihrer Lage passt. Kein Amboss, kein Fluchtauto — die kommen in M4.
 *
 * Sie bleibt danach als **Rueckfalloption** bestehen: Solange fuer einen Outcome noch
 * keine eigene Sequenz registriert ist, laeuft diese. Eine leere Buehne waere schlimmer
 * als eine schlichte.
 */

import gsap from 'gsap';
import { ANIM } from '@/config/theme';
import type { OutcomeContext, OutcomeSequence } from './OutcomeSequence';

export const BASIC_OUTCOME_ID = 'basic_outcome';

/** Wie lange die Zahlen stehen bleiben, bevor der Screen wechselt. */
const HOLD_MS = 1400;

/**
 * Baut die Zaehler-Timeline. Auch die spezialisierten Sequenzen aus M4 rufen sie am
 * Ende auf — der Trinker-Zaehler-Moment ist Pflicht (Architektur §7).
 */
export function buildSipCounters(ctx: OutcomeContext, startDelayMs = 0): gsap.core.Timeline {
  const timeline = gsap.timeline();
  const { result } = ctx;

  /*
   * Mehrere Gruende koennen denselben Spieler treffen — Meineid plus Verteilung. Fuer
   * die Anzeige zaehlt die Summe: "Rudi trinkt 2" und gleich danach "Rudi trinkt 6"
   * uebereinander waere keine Ansage, sondern ein Rechenraetsel.
   */
  const total = new Map<string, number>();
  for (const drinker of result.drinkers) {
    total.set(drinker.playerId, (total.get(drinker.playerId) ?? 0) + drinker.sips);
  }

  let index = 0;
  for (const [playerId, sips] of total) {
    if (sips <= 0) continue;
    const at = ctx.positionOf(playerId);
    // Gestaffelt, damit die Zahlen nacheinander lesbar sind, nicht als Wolke.
    timeline.add(ctx.counters.pop(at.x, at.y - 40, sips, startDelayMs + index * 140), 0);
    ctx.play('coin_shimmer', (startDelayMs + index * 140) / 1000);
    index += 1;
  }

  if (index === 0) {
    // Niemand trinkt: Der Screen braucht trotzdem einen Takt, sonst schneidet er hart.
    timeline.to({}, { duration: 0.4 });
  }
  return timeline;
}

export const basicOutcome: OutcomeSequence = {
  id: BASIC_OUTCOME_ID,
  // Der Outcome-Typ ist hier egal — die Sequenz wird nie ueber die Registry gewaehlt,
  // sondern nur als Rueckfall benutzt. `allShare` ist der harmloseste Platzhalter.
  outcome: 'allShare',
  weight: 1,

  build(ctx) {
    const timeline = gsap.timeline();
    const { result, room } = ctx;

    // Zurueck in die Totale: Bei der Auszahlung sollen alle im Bild sein.
    timeline.add(ctx.camera.reset(), 0);
    room.lookAhead();

    // Gesichter: Diebe grinsen, Teiler schauen unschuldig — ausser es hat sie erwischt.
    for (const crook of ctx.thieves) crook.setFace('smug');
    for (const crook of ctx.sharers) {
      crook.setFace(result.outcome === 'soloSteal' ? 'jaw_drop' : 'happy');
    }

    if (result.outcome === 'allSteal') {
      for (const crook of ctx.thieves) crook.setFace('guilty');
      timeline.add(ctx.camera.shake(ANIM.shakeAmplitudePx, ANIM.shakeMs), 0);
      ctx.play('brawl');
    } else if (result.outcome === 'jackpot') {
      timeline.add(room.vault.burst(), 0);
      ctx.play('jackpot_choir');
    } else if (result.outcome === 'allShare') {
      ctx.play('cash_register', 0.2);
    }

    timeline.add(buildSipCounters(ctx, 260), 0);
    timeline.to({}, { duration: HOLD_MS / 1000 });
    return timeline;
  },
};
