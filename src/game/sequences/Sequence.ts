/**
 * Sequenzen und ihre Registry (Architektur §6).
 *
 * Eine Sequenz ist ein Stück Inszenierung: Sie bekommt einen Kontext, baut eine
 * GSAP-Timeline und hat sonst keinen Zustand. Sie **entscheidet nichts** — was passiert,
 * stand längst fest, als der Regelkern `inspect()` gerechnet hat.
 *
 * Die Registry wählt gewichtet aus und merkt sich die zuletzt gespielten IDs: Dieselbe
 * Sequenz zweimal hintereinander nimmt einem Gag die Pointe, und in einer Session mit
 * acht Runden fällt Wiederholung sofort auf.
 */

import type { RandomSource } from '@/core/rng';
import type { ItemSet, PlayerId } from '@/core/types';
import type { HallView } from '../HallView';
import type { Suitcase } from '../Suitcase';
import type { Traveler } from '../Traveler';
import type { Officer } from '../Officer';
import type { FxKit } from '../fx/FxKit';

export type SequenceKind =
  | 'hint'
  | 'xrayCaught'
  | 'xrayClean'
  | 'xrayOverlay'
  | 'gateClean'
  | 'gateSmuggler';

export interface SequenceContext {
  view: HallView;
  suitcase: Suitcase;
  /** Fehlt, wenn niemand zu dem Koffer gehört (sollte nicht vorkommen). */
  traveler: Traveler | undefined;
  officer: Officer;
  fx: FxKit;
  rng: RandomSource;
  itemSet: ItemSet;
  /** Menge im Koffer; 0 bei sauberen. */
  amount: number;
  suitcaseOf: PlayerId;
}

export interface Sequence {
  id: string;
  kind: SequenceKind;
  /** Relatives Gewicht in der Auswahl; muss > 0 sein. */
  weight: number;
  /*
   * `gsap.core.Timeline` ohne Import: GSAP deklariert `gsap` als globalen Namensraum,
   * und ein Wert-Import waere hier ungenutzt (`noUnusedLocals`).
   */
  build(ctx: SequenceContext): gsap.core.Timeline;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

/**
 * Wie viele der zuletzt gespielten Sequenzen gesperrt bleiben.
 *
 * Drei ist der Kompromiss: Bei zwei fällt die Wiederholung noch auf, bei vier bleibt in
 * einer Kategorie mit vier Einträgen nur noch eine übrig — und dann ist die Auswahl
 * keine mehr.
 */
export const NO_REPEAT_WINDOW = 3;

export class SequenceRegistry {
  private readonly byKind = new Map<SequenceKind, Sequence[]>();
  private readonly byId = new Map<string, Sequence>();
  /** Die zuletzt gespielten IDs je Kategorie, neueste zuerst. */
  private readonly recent = new Map<SequenceKind, string[]>();

  register(...sequences: Sequence[]): this {
    for (const sequence of sequences) {
      if (this.byId.has(sequence.id)) {
        throw new Error(`Sequenz-ID doppelt vergeben: ${sequence.id}`);
      }
      if (!(sequence.weight > 0)) {
        throw new RangeError(`Sequenz ${sequence.id} braucht ein Gewicht > 0.`);
      }
      this.byId.set(sequence.id, sequence);
      const list = this.byKind.get(sequence.kind) ?? [];
      list.push(sequence);
      this.byKind.set(sequence.kind, list);
    }
    return this;
  }

  all(kind: SequenceKind): readonly Sequence[] {
    return this.byKind.get(kind) ?? [];
  }

  get(id: string): Sequence | undefined {
    return this.byId.get(id);
  }

  ids(): string[] {
    return [...this.byId.keys()];
  }

  /**
   * Wählt gewichtet aus einer Kategorie und sperrt die Wahl für die nächsten Züge.
   *
   * Bei drei Kandidaten und einem Fenster von drei ist ab dem vierten Zug alles gesperrt.
   * Dann gibt die Sperre nach — aber **nicht ganz**: Die zuletzt gespielte Sequenz bleibt
   * ausgeschlossen. Eine Wiederholung nach zwei Runden fällt kaum auf, zweimal dasselbe
   * direkt hintereinander nimmt dem Gag die Pointe. Genau das prüft der A4-Audit.
   */
  pick(kind: SequenceKind, rng: RandomSource): Sequence {
    const candidates = this.byKind.get(kind);
    if (!candidates || candidates.length === 0) {
      throw new Error(`Keine Sequenz registriert für "${kind}".`);
    }

    const blocked = this.recent.get(kind) ?? [];
    const free = candidates.filter((s) => !blocked.includes(s.id));

    let pool = free;
    if (pool.length === 0) {
      /* Alles gesperrt: nur die letzte bleibt tabu. */
      const last = blocked[0];
      pool = candidates.filter((s) => s.id !== last);
    }
    /* Und wenn es wirklich nur eine gibt, dann eben die. */
    if (pool.length === 0) pool = candidates;

    const chosen = rng.weighted(pool, (s) => s.weight);
    this.remember(kind, chosen.id);
    return chosen;
  }

  private remember(kind: SequenceKind, id: string): void {
    const list = [id, ...(this.recent.get(kind) ?? [])];
    this.recent.set(kind, list.slice(0, NO_REPEAT_WINDOW));
  }

  /** Was zuletzt lief — Testhilfe und Dev-Panel. */
  recentOf(kind: SequenceKind): readonly string[] {
    return this.recent.get(kind) ?? [];
  }

  clearHistory(): void {
    this.recent.clear();
  }
}
