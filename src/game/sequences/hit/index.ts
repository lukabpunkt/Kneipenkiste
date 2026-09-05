/**
 * Die acht Hit-Sequenzen (GDD §4.1, Roadmap M4).
 *
 * Jede erzaehlt denselben Satz — "du bist in eine fremde Mine getreten" — und keine
 * erzaehlt ihn zweimal gleich. Der gemeinsame Kopf steht in `shared.ts`: Knall, Rauch,
 * Erde, und **der Farbring der Leger ≤ 300 ms danach**. Was danach kommt, ist der Gag.
 *
 * Zwei haben Bedingungen, und beide sind Regeln, keine Vorlieben:
 * `hit_chain_dance` braucht zwei gestapelte Minen, weil sie von zwei Legern erzaehlt;
 * `hit_dud_then_boom` faellt im Doppelagent-Modus aus, weil sie sonst den echten
 * Blindgaenger entwertet.
 */

import type { DigSequence } from '../Sequence';
import { chainDanceSequence } from './ChainDance';
import { classicLaunchSequence } from './ClassicLaunch';
import { craterHopSequence } from './CraterHop';
import { dudThenBoomSequence } from './DudThenBoom';
import { helmetRocketSequence } from './HelmetRocket';
import { shovelPretzelSequence } from './ShovelPretzel';
import { sootFaceSequence } from './SootFace';
import { treeLandingSequence } from './TreeLanding';

export const HIT_SEQUENCES: readonly DigSequence[] = [
  classicLaunchSequence,
  sootFaceSequence,
  helmetRocketSequence,
  shovelPretzelSequence,
  treeLandingSequence,
  craterHopSequence,
  chainDanceSequence,
  dudThenBoomSequence,
];
