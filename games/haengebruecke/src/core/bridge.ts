/**
 * Die Bruecke — reine Funktionen (GDD §3.2, Architektur §5).
 *
 * Kein Zustand, keine Seiteneffekte: Jede Funktion gibt eine neue `Bridge` zurueck.
 * Welcher Balken abfault und welcher morsch ist, entscheidet ausschliesslich sicherer
 * Zufall (CLAUDE.md) — die Quelle kommt als `RandomSource` herein, damit Tests
 * deterministisch bleiben, ohne dass `Math.random` in den Kern rutscht.
 */

import { initialPlankCount, minPlankCount } from '@/config/rules';
import type { RandomSource } from './rng';
import type { Bridge, PlankId } from './types';

/** Frische Bruecke: `B = n + 2`, Balken 1…B. */
export function createBridge(playerCount: number): Bridge {
  const count = initialPlankCount(playerCount);
  return {
    count,
    planks: Array.from({ length: count }, (_, i) => i + 1),
    removed: [],
  };
}

/** Kann die Bruecke noch einen Balken verlieren? */
export function canShrink(bridge: Bridge, playerCount: number): boolean {
  return bridge.count > minPlankCount(playerCount);
}

export interface ShrinkOutcome {
  bridge: Bridge;
  /** Welcher Balken abgefault ist — `undefined`, wenn die Untergrenze erreicht war. */
  removedPlank?: PlankId;
}

/**
 * Frieden kostet einen Balken (Design-Pfeiler 3). Die Nummern der uebrigen Balken bleiben,
 * damit "Balken 4 ist abgefault" auch in der naechsten Runde noch stimmt — die Luecke
 * bleibt zwischen den Seilen sichtbar.
 */
export function shrink(bridge: Bridge, playerCount: number, rng: RandomSource): ShrinkOutcome {
  if (!canShrink(bridge, playerCount)) return { bridge };

  const removedPlank = rng.pick(bridge.planks);
  const next: Bridge = {
    count: bridge.count - 1,
    planks: bridge.planks.filter((p) => p !== removedPlank),
    removed: [...bridge.removed, removedPlank].sort((a, b) => a - b),
  };
  if (bridge.rottenPlank !== undefined) next.rottenPlank = bridge.rottenPlank;
  return { bridge: next, removedPlank };
}

/** Nach jeder Kollision kommt Balthasar (ADR-2). */
export function repair(playerCount: number): Bridge {
  return createBridge(playerCount);
}

/**
 * Todeszone: weniger Balken als Spieler. Nach dem Schubfachprinzip muessen sich dann
 * mindestens zwei Leute einen Balken teilen — der garantierte Crash als Event (ADR-2).
 */
export function isDeathZone(bridge: Bridge, playerCount: number): boolean {
  return bridge.count < playerCount;
}

/**
 * Der morsche Balken (Modus). Faellt beim Eintritt in NEGOTIATION und bleibt privat,
 * bis das Result ihn zeigt.
 */
export function pickRottenPlank(bridge: Bridge, rng: RandomSource): Bridge {
  return { ...bridge, rottenPlank: rng.pick(bridge.planks) };
}

/** Ohne den morschen Balken — die Fassung, die ein Screen sehen darf. */
export function withoutSecrets(bridge: Bridge): Bridge {
  return { count: bridge.count, planks: [...bridge.planks], removed: [...bridge.removed] };
}
