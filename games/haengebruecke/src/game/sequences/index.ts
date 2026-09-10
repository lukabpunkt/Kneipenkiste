/**
 * Alle Sequenzen anmelden (Architektur §7).
 *
 * Ein Import mit Nebenwirkung — jede Datei registriert sich beim Laden. Das ist Absicht:
 * Eine neue Sequenz braucht genau zwei Handgriffe (Datei anlegen, hier importieren), und
 * `sequences.test.ts` prüft, dass Katalog und Registry deckungsgleich sind.
 *
 * **M4-Stand:** Alle vierzehn Inszenierungen aus GDD §9.5 sind gebaut.
 * `missingImplementations()` meldet jetzt nichts mehr — der Test darauf ist die
 * Absicherung, dass das so bleibt, wenn jemand den Katalog erweitert.
 */

import './fall/BasicFall';
import './fall/HoldHands';
import './fall/CoyoteDelay';
import './fall/Seesaw';
import './fall/RopeSwing';
import './fall/Domino';
import './fall/BounceWall';
import './safe/WobbleHold';
import './safe/ConfidentStroll';
import './safe/Tiptoe';
import './misc/AllSafeRot';
import './misc/DeathzoneSign';
import './misc/RepairCarpenter';
import './overlays/RottenCrack';
import './overlays/DeserterStamp';

export {
  getSequence,
  missingImplementations,
  registerSequence,
  registeredIds,
  sequencesOfKind,
  type Sequence,
  type SequenceContext,
  type SequenceTiming,
} from './Sequence';

/**
 * Was läuft, wenn eine gewählte Fall-Sequenz nicht gefunden wird.
 *
 * Seit M4 sollte das nie vorkommen — der Katalog und die Registry sind deckungsgleich,
 * und ein Test hält das fest. Der Rückfall bleibt trotzdem: Eine Show, die wegen eines
 * Tippfehlers im Katalog stehenbliebe, wäre die schlechtere Antwort.
 */
export const FALLBACK_FALL_ID = 'basic_fall';
