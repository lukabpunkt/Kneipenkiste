/**
 * Das Hinweis-Modell (GDD §3.3, ADR-2, Architektur §5).
 *
 * Design-Pfeiler 2 — **falsche Sicherheit**: Die Hinweise muessen gut genug sein, um
 * ihnen zu glauben, und schlecht genug, um reinzufallen. Genau das leistet dieser
 * Baustein und nur dieser:
 *
 * - `h(n)` verschiedene Koffer bekommen einen Hinweis, nie zweimal derselbe.
 * - Jeder Hinweis zeigt mit `p_true = 0.6` auf einen Schmuggler, sonst auf einen Sauberen.
 * - **Ein Hinweis sagt nie etwas ueber die Menge.** Ein "schwerer" Koffer kann 1 oder 6
 *   Gartenzwerge enthalten — sonst waere "1 Stueck schmuggeln" sinnlos und der Beamte
 *   muesste nach einem richtigen Hinweis nicht mehr abwaegen, ob sich das Oeffnen lohnt.
 * - Gibt es keinen Schmuggler, sind zwangslaeufig **alle** Hinweise falsch.
 */

import { HINT_TRUTH_PROBABILITY, HINT_TYPES, hintCount, type HintType } from '@/config/rules';
import { SECURE_RNG, type RandomSource } from './rng';
import type { Hint, Pack, PlayerId } from './types';

export interface HintInput {
  /** Alle Reisenden dieser Runde (ohne Beamten), in Spielerreihenfolge. */
  travelerIds: readonly PlayerId[];
  /** Was jeder gepackt hat — **privat**, verlaesst diese Funktion nicht. */
  packs: Readonly<Record<PlayerId, Pack>>;
  /** Gesamt-Spielerzahl inklusive Beamtem; bestimmt h(n). */
  playerCount: number;
}

/** Reisende mit Ware bzw. ohne — die einzige Stelle, die `amount` fuer Hinweise liest. */
function split(input: HintInput): { smugglers: PlayerId[]; cleans: PlayerId[] } {
  const smugglers: PlayerId[] = [];
  const cleans: PlayerId[] = [];
  for (const id of input.travelerIds) {
    const amount = input.packs[id]?.amount ?? 0;
    if (amount > 0) smugglers.push(id);
    else cleans.push(id);
  }
  return { smugglers, cleans };
}

/**
 * Erzeugt die Hinweise einer Runde.
 *
 * Laeuft **genau einmal** beim Uebergang PACKED → HALL (Architektur §3) und produktiv
 * ueber `crypto` (CLAUDE.md). `rng` ist nur fuer Tests da.
 */
export function generateHints(input: HintInput, rng: RandomSource = SECURE_RNG): Hint[] {
  const { smugglers, cleans } = split(input);
  const target = hintCount(input.playerCount);

  const usedSuitcases = new Set<PlayerId>();
  const usedTypes = new Set<HintType>();
  const hints: Hint[] = [];

  for (let i = 0; i < target; i++) {
    const freeSmugglers = smugglers.filter((id) => !usedSuitcases.has(id));
    const freeCleans = cleans.filter((id) => !usedSuitcases.has(id));
    if (freeSmugglers.length === 0 && freeCleans.length === 0) break;

    /*
     * Der Muenzwurf. Er kann nur greifen, wenn es ueberhaupt noch einen unbenutzten
     * Schmuggler-Koffer gibt — bei einer ehrlichen Runde ist die Bedingung nie wahr,
     * und alle Hinweise sind falsch (Invariante des A0-Audits).
     */
    let truthful = freeSmugglers.length > 0 && rng.next() < HINT_TRUTH_PROBABILITY;

    /* Sind die sauberen Koffer aufgebraucht, bleibt nur ein echter Hinweis uebrig. */
    if (!truthful && freeCleans.length === 0) truthful = true;

    const pool = truthful ? freeSmugglers : freeCleans;
    const suitcaseOf = rng.pick(pool);
    usedSuitcases.add(suitcaseOf);

    hints.push({ type: pickType(rng, usedTypes), suitcaseOf, truthful });
  }

  /* Reihenfolge des Abspielens ist selbst zufaellig — sonst verraet Hinweis 1 zu viel. */
  return rng.shuffle(hints);
}

/**
 * Ein Typ, der in dieser Runde noch nicht dran war.
 *
 * `MAX_HINTS` (3) ist kleiner als die Zahl der Typen (6) — der Vorrat geht also nie aus.
 * Der Fallback steht trotzdem da, damit ein spaeteres Balancing mit mehr Hinweisen keine
 * Ausnahme wirft, sondern nur Typen wiederholt; die Invariante sichert `config.test.ts`.
 */
function pickType(rng: RandomSource, used: Set<HintType>): HintType {
  const free = HINT_TYPES.filter((type) => !used.has(type));
  /* v8 ignore next */
  const type = rng.pick(free.length > 0 ? free : HINT_TYPES);
  used.add(type);
  return type;
}

export interface DogHint {
  suitcaseOf: PlayerId;
  /** Waldi bellt genau dann, wenn wirklich Ware im Koffer ist — dieser Hinweis luegt nie. */
  barks: boolean;
}

/**
 * Spuerhund-Modus (GDD §3.7): ein **verlaesslicher** Hinweis. Waldi schnueffelt einen
 * Koffer an und bellt, wenn Ware drin ist — die Menge verraet er trotzdem nicht.
 * Bezahlt wird das mit einer Oeffnung weniger (`core/modes.ts`).
 */
export function generateDogHint(input: HintInput, rng: RandomSource = SECURE_RNG): DogHint | null {
  const { smugglers, cleans } = split(input);
  if (smugglers.length > 0) return { suitcaseOf: rng.pick(smugglers), barks: true };
  if (cleans.length > 0) return { suitcaseOf: rng.pick(cleans), barks: false };
  return null;
}
