/**
 * Auszahlung (GDD §3.5, Architektur §5) — reine Funktionen.
 *
 * Zwei Zeitpunkte, bewusst getrennt (ADR-5):
 *
 * 1. **Sofort**, mitten in der Grabphase: Wer auf eine fremde Mine tritt, trinkt auf der
 *    Stelle. Das Handy bleibt liegen, es geht weiter — `digPayout()`.
 * 2. **Am Rundenende**: Die gesammelten Verteil-Tokens werden auf dem Distribute-Screen
 *    vergeben — `finishRound()` rechnet zusammen, wer wieviele hat.
 *
 * Hier faellt keine Entscheidung ueber den Inhalt einer Zelle — das hat `board.ts`
 * bereits getan. Dieses Modul rechnet nur.
 */

import {
  SIPS_PER_FOREIGN_MINE,
  TOKENS_PER_LAYER,
  treasureTokens,
  type BoardSize,
  type Modes,
} from '@/config/rules';
import { COWARD_SIPS, cowards, masterBonuses } from './modes';
import type { Board, DigResult, Distribution, Drinker, Kill, PlayerId, RoundResult } from './types';
import { replayView } from './board';

/* ------------------------------------------------------------------ */
/* Sofort-Konsequenz einer Grabung                                     */
/* ------------------------------------------------------------------ */

export interface DigPayout {
  /** Was der Graeber jetzt sofort trinkt. 0, wenn nichts passiert ist. */
  sips: number;
  /** Verteil-Tokens, die diese Grabung erzeugt hat. */
  tokens: Record<PlayerId, number>;
  /** Zeilen fuer den Kill-Feed ("Rudi → Anna"). */
  kills: Kill[];
}

/**
 * Was eine einzelne Grabung kostet und einbringt.
 *
 * - Fremde Mine(n): 2 Schluecke **pro** Mine, jeder Leger bekommt 1 Token.
 * - Kiste: 4 Tokens (6 × 6: 6; bei zwei Kisten die Haelfte).
 * - "Preis der Gier": beides.
 * - Blindgaenger, leeres Feld und der stumme eigene Trittstein: nichts.
 *
 * Die Kettenreaktion taucht hier nicht auf — sie raeumt das Feld und verraet Leger,
 * aber niemand trinkt dafuer (GDD §3.6).
 */
export function digPayout(result: DigResult, size: BoardSize, modes: Modes): DigPayout {
  const tokens: Record<PlayerId, number> = {};
  const kills: Kill[] = [];
  let sips = 0;

  if (result.kind === 'crater' || result.kind === 'greed') {
    sips = SIPS_PER_FOREIGN_MINE * result.foreignMines.length;
    for (const layer of result.foreignMines) {
      tokens[layer] = (tokens[layer] ?? 0) + TOKENS_PER_LAYER;
      kills.push({ layer, victim: result.by, cell: result.cell });
    }
  }

  if (result.treasureFound) {
    tokens[result.by] = (tokens[result.by] ?? 0) + treasureTokens(size, modes);
  }

  return { sips, tokens, kills };
}

/* ------------------------------------------------------------------ */
/* Rundenabschluss                                                     */
/* ------------------------------------------------------------------ */

export interface RoundInput {
  /** 1-basiert. */
  index: number;
  seed: number;
  modes: Modes;
  board: Board;
  digs: readonly DigResult[];
  /** Erst nach dem Distribute-Screen gefuellt. */
  distribution?: readonly Distribution[];
}

/**
 * Fasst eine gespielte Runde zusammen: Trinker, Kill-Feed, Token-Konten, Replay.
 *
 * Reihenfolge der Token-Besitzer ist die des DISTRIBUTE-Screens (Architektur §3):
 * **Finder zuerst**, danach die Leger in der Reihenfolge ihrer Explosionen.
 */
export function finishRound(input: RoundInput): RoundResult {
  const { index, seed, modes, board, digs } = input;
  const size = board.size;

  const drinkersBy = new Map<string, Drinker>();
  const tokens: Record<PlayerId, number> = {};
  const kills: Kill[] = [];
  const finderIds: PlayerId[] = [];
  /** Reihenfolge, in der Spieler ihr erstes Token bekommen haben. */
  const tokenOrder: PlayerId[] = [];

  const addTokens = (playerId: PlayerId, amount: number): void => {
    if (amount === 0) return;
    if (tokens[playerId] === undefined) tokenOrder.push(playerId);
    tokens[playerId] = (tokens[playerId] ?? 0) + amount;
  };

  const addSips = (playerId: PlayerId, sips: number, reason: Drinker['reason']): void => {
    if (sips === 0) return;
    const key = `${playerId}:${reason}`;
    const existing = drinkersBy.get(key);
    if (existing) existing.sips += sips;
    else drinkersBy.set(key, { playerId, sips, reason });
  };

  for (const dig of digs) {
    const payout = digPayout(dig, size, modes);
    addSips(dig.by, payout.sips, 'mine');
    kills.push(...payout.kills);
    if (dig.treasureFound) finderIds.push(dig.by);
    // Der Finder steht vorn im Distribute-Screen, auch wenn er vorher schon Leger war.
    for (const [playerId, amount] of Object.entries(payout.tokens)) addTokens(playerId, amount);
  }

  // Der Finder darf zuerst verteilen (Architektur §3), danach die Leger in Explosionsreihenfolge.
  const distributeOrder = [
    ...finderIds.filter((id) => tokens[id] !== undefined),
    ...tokenOrder.filter((id) => !finderIds.includes(id)),
  ];

  for (const [playerId, amount] of Object.entries(masterBonuses(digs, modes))) {
    addTokens(playerId, amount);
    if (!distributeOrder.includes(playerId)) distributeOrder.push(playerId);
  }
  for (const playerId of cowards(digs, modes)) addSips(playerId, COWARD_SIPS, 'coward');

  return {
    index,
    size,
    seed,
    modes: { ...modes },
    digs: [...digs],
    drinkers: [...drinkersBy.values()],
    kills,
    tokens,
    distribution: [...(input.distribution ?? [])],
    finderIds,
    replay: replayView(board).cells,
  };
}

/**
 * Wer verteilt in welcher Reihenfolge (DISTRIBUTE-Screen, Architektur §3):
 * Finder zuerst, danach die Leger in der Reihenfolge ihrer Explosionen.
 */
export function distributeOrder(round: RoundResult): PlayerId[] {
  const withTokens = (id: PlayerId): boolean => (round.tokens[id] ?? 0) > 0;
  const finders = round.finderIds.filter(withTokens);
  const layers: PlayerId[] = [];
  for (const kill of round.kills) {
    if (withTokens(kill.layer) && !finders.includes(kill.layer) && !layers.includes(kill.layer)) {
      layers.push(kill.layer);
    }
  }
  // Sprengmeister-Bonus kann jemandem ein Token geben, der nirgends sonst auftaucht.
  const rest = Object.keys(round.tokens).filter(
    (id) => withTokens(id) && !finders.includes(id) && !layers.includes(id)
  );
  return [...finders, ...layers, ...rest];
}

/* ------------------------------------------------------------------ */
/* Verteilung (DISTRIBUTE-Screen, GDD §3.5)                            */
/* ------------------------------------------------------------------ */

/**
 * Prueft eine Verteilung, bevor sie in die Runde geschrieben wird:
 * Man verteilt genau seine Tokens und **nie an sich selbst**.
 */
export function validateDistribution(
  round: RoundResult,
  from: PlayerId,
  assignments: Record<PlayerId, number>
): { ok: true } | { ok: false; reason: 'self' | 'amount' | 'negative' } {
  let total = 0;
  for (const [to, sips] of Object.entries(assignments)) {
    if (sips < 0) return { ok: false, reason: 'negative' };
    if (to === from && sips > 0) return { ok: false, reason: 'self' };
    total += sips;
  }
  if (total !== (round.tokens[from] ?? 0)) return { ok: false, reason: 'amount' };
  return { ok: true };
}

/** Traegt eine gepruefte Verteilung ein. */
export function applyDistribution(
  round: RoundResult,
  from: PlayerId,
  assignments: Record<PlayerId, number>
): RoundResult {
  const added: Distribution[] = [];
  for (const [to, sips] of Object.entries(assignments)) {
    if (sips > 0) added.push({ from, to, sips });
  }
  return { ...round, distribution: [...round.distribution, ...added] };
}

/**
 * Was am Ende wirklich getrunken wird: Sofort-Schluecke plus alles, was einem zugeteilt
 * wurde. Grundlage fuer Result-Screen und Scoreboard.
 */
export function totalSips(round: RoundResult): Record<PlayerId, number> {
  const out: Record<PlayerId, number> = {};
  for (const drinker of round.drinkers) {
    out[drinker.playerId] = (out[drinker.playerId] ?? 0) + drinker.sips;
  }
  for (const entry of round.distribution) {
    out[entry.to] = (out[entry.to] ?? 0) + entry.sips;
  }
  return out;
}
