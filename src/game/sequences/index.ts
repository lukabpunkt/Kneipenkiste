/**
 * Alle Sequenzen anmelden (Architektur §7).
 *
 * Ein Import mit Nebenwirkung — jede Datei registriert sich beim Laden. Das ist Absicht:
 * Eine neue Sequenz braucht genau zwei Handgriffe (Datei anlegen, hier importieren), und
 * `sequences.test.ts` prüft, dass Katalog und Registry deckungsgleich sind.
 *
 * **M3-Stand:** Die sechs Fall-Sequenzen aus GDD §4.3 fehlen noch; für jeden Bruch läuft
 * `basic_fall`. `missingImplementations()` sagt jederzeit, welche das sind.
 */

import './fall/BasicFall';
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
 * Was läuft, wenn die gewählte Fall-Sequenz noch nicht gebaut ist.
 *
 * Bis M4 ist das jede: Der Choreographer wählt aus dem Katalog (`fall_hold_hands` und so
 * weiter), gebaut ist bisher nur diese hier. Die Show soll deshalb nicht stehenbleiben.
 */
export const FALLBACK_FALL_ID = 'basic_fall';
