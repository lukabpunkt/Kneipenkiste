/**
 * Die Registry der laufenden Session.
 *
 * Eine Instanz für das ganze Spiel: Nur so kann sie sich merken, was zuletzt lief, und
 * Wiederholungen über Rundengrenzen hinweg vermeiden (Architektur §6). In einer Session
 * mit acht Runden fällt eine wiederholte Röntgen-Sequenz sofort auf — sie ist der Moment,
 * auf den alle warten.
 */

import { GATE_SEQUENCES } from './gate';
import { HINT_SEQUENCES } from './hints';
import { SequenceRegistry } from './Sequence';
import { CAUGHT_SEQUENCES } from './xray/caught';
import { CLEAN_SEQUENCES, OVERLAY_SEQUENCES } from './xray/clean';

let instance: SequenceRegistry | undefined;

/** Die Registry der Session. */
export function sequenceRegistry(): SequenceRegistry {
  instance ??= new SequenceRegistry().register(
    ...HINT_SEQUENCES,
    ...GATE_SEQUENCES,
    ...CAUGHT_SEQUENCES,
    ...CLEAN_SEQUENCES,
    ...OVERLAY_SEQUENCES
  );
  return instance;
}

/** Nur für Tests: frische Registry ohne Historie. */
export function resetSequenceRegistry(): void {
  instance = undefined;
}

export { CAUGHT_SEQUENCES, CLEAN_SEQUENCES, OVERLAY_SEQUENCES };
