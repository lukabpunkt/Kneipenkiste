/**
 * Rundensimulation — reine Funktionen (Architektur §8 "Simulate 10 000 rounds").
 *
 * Zwei Aufgaben:
 * 1. **Property-Test** (Roadmap M0.5): 10 000 Runden mit Zufallszuegen, die pruefen, dass
 *    jede Runde endet, niemand negativ trinkt und die Token-Summe stimmt.
 * 2. **Balancing** (Roadmap M6.2): Verteilung von Rundenlaenge, Explosionen pro Runde und
 *    Preis-der-Gier-Rate — die Grundlage jeder Zahlenaenderung in `rules.ts`.
 *
 * Der Zufall wird injiziert: Im Test steckt ein seedbarer Generator drin (reproduzierbar),
 * im Dev-Panel der echte sichere.
 */

import type { Modes } from '@/config/rules';
import { chebyshev, closedCells, createBoard, dig, fillRandomMines, placeTreasure } from './board';
import { finishRound } from './payout';
import type { SecureRandom } from './rng';
import { randomClosedCell, playerAtTurn } from './turn';
import type { Board, Cell, DigResult, PlayerId, RoundResult } from './types';

export interface SimulatedRound {
  result: RoundResult;
  /** Das fertige Feld — fuer Invarianten-Pruefungen im Test. */
  board: Board;
  /** Wieviele Grabungen die Runde gebraucht hat. */
  digCount: number;
  /** Wieviele Grabungen einen Krater oder den Preis der Gier ausgeloest haben. */
  blastCount: number;
  greed: boolean;
}

/**
 * Wie die simulierten Spieler graben.
 *
 * - `random` — blind. Das ist die **Obergrenze**: So lange braucht eine Runde, wenn
 *   niemand die Hinweise liest. Der Property-Test nutzt sie, weil sie jede Zelle
 *   gleich wahrscheinlich trifft und damit alle Ergebnisarten durchspielt.
 * - `hints` — nutzt die Temperatur-Hinweise wie ein aufmerksamer Tisch. Das ist die
 *   Zahl, gegen die die Balancing-Ziele aus Audit A6 gemeint sind (Median 4-8 Grabungen).
 *
 * Keine der beiden benutzt eigene Trittsteine: Wann jemand seine sichere Zelle
 * verheizt, ist eine soziale Entscheidung und laesst sich nicht sinnvoll simulieren.
 */
export type DigStrategy = 'random' | 'hints';

export interface SimulateOptions {
  playerIds: readonly PlayerId[];
  modes: Modes;
  rnd: SecureRandom;
  seed: number;
  roundIndex?: number;
  strategy?: DigStrategy;
  /**
   * Notbremse. Eine Runde kann nicht laenger dauern als das Feld Zellen hat — die Kiste
   * liegt immer auf einer davon. Wird die Grenze erreicht, stimmt etwas mit `dig()` nicht.
   */
  maxDigs?: number;
}

/**
 * Spielt eine komplette Runde mit zufaelligen Zuegen: Minen vergraben, Kiste legen,
 * reihum graben, bis alle Kisten gefunden sind, abrechnen.
 */
export function simulateRound(options: SimulateOptions): SimulatedRound {
  const { playerIds, modes, rnd, seed } = options;
  const roundIndex = options.roundIndex ?? 1;

  let board = createBoard(playerIds.length);
  for (const playerId of playerIds) board = fillRandomMines(board, playerId, modes, rnd);
  board = placeTreasure(board, modes, rnd);

  const limit = options.maxDigs ?? board.size * board.size;
  const digs: DigResult[] = [];
  let blastCount = 0;
  let greed = false;

  const strategy = options.strategy ?? 'random';

  for (let turn = 0; turn < limit; turn++) {
    const cell = strategy === 'hints' ? hintedCell(board, rnd) : randomClosedCell(board, rnd);
    if (cell === null) break;

    const outcome = dig(board, cell, playerAtTurn(playerIds, roundIndex, turn), { modes, seed });
    board = outcome.board;
    digs.push(outcome.result);

    if (outcome.result.kind === 'crater' || outcome.result.kind === 'greed') blastCount += 1;
    if (outcome.result.kind === 'greed') greed = true;
    if (outcome.result.roundOver) break;
  }

  return {
    result: finishRound({ index: roundIndex, seed, modes, board, digs }),
    board,
    digCount: digs.length,
    blastCount,
    greed,
  };
}

/**
 * Waehlt eine Zelle so, wie ein aufmerksamer Tisch waehlen wuerde: Ein "HEISS" schraenkt
 * die Kiste auf seine acht Nachbarn ein, ein "WARM" auf den Ring darum. Mehrere Hinweise
 * schneiden sich — wer schon zwei offene Felder hat, hat die Kiste oft eingekreist.
 *
 * Gibt es keinen brauchbaren Hinweis (erster Zug, oder Nachtgraeber-Modus), wird zufaellig
 * gegraben.
 *
 * **Bekannte Grenze:** Im Modus "Zwei Kisten" bedeutet ein "HEISS" nur, dass *eine* der
 * beiden Kisten nebenan liegt. Der Schnitt ueber alle Hinweise ist dann oft leer, und die
 * Heuristik faellt auf Zufall zurueck — die Zahlen fuer diesen Modus sind entsprechend
 * pessimistisch und beschreiben eher einen ratlosen als einen aufmerksamen Tisch.
 */
function hintedCell(board: Board, rnd: SecureRandom): Cell | null {
  const closed = closedCells(board);
  if (closed.length === 0) return null;

  const opened = Object.values(board.opened);
  const candidates = closed.filter((cell) =>
    opened.every((open) => {
      const d = chebyshev(cell, open.cell, board.size);
      switch (open.hint) {
        case 'hot':
          return d <= 1;
        case 'warm':
          return d === 2;
        case 'cold':
          return d >= 3;
        // Kisten-Platten und der Nachtgraeber-Modus sagen nichts.
        case 'none':
          return true;
      }
    })
  );

  // Widerspruechliche Hinweise kann es nicht geben, aber ein leerer Schnitt waere kein
  // Grund, den Zug zu verweigern — dann graebt der Tisch eben irgendwo.
  const pool = candidates.length > 0 ? candidates : closed;
  return pool[rnd.int(pool.length)]!;
}

/* ------------------------------------------------------------------ */
/* Auswertung ueber viele Runden (Roadmap M6.2)                        */
/* ------------------------------------------------------------------ */

export interface SimulationSummary {
  rounds: number;
  /** Grabungen pro Runde: Median und Spanne. Ziel laut Audit A6: 4-8 im Median. */
  digsMedian: number;
  digsMin: number;
  digsMax: number;
  /** Explosionen pro Runde im Mittel. Ziel: 1-3. */
  blastsMean: number;
  /** Anteil der Runden mit "Preis der Gier". Ziel: 5-15 %. */
  greedRate: number;
  /** Runden, die nicht mit einem Kistenfund endeten — muss 0 sein. */
  unfinished: number;
}

export function summarise(rounds: readonly SimulatedRound[]): SimulationSummary {
  const digs = rounds.map((r) => r.digCount).sort((a, b) => a - b);
  const blasts = rounds.reduce((sum, r) => sum + r.blastCount, 0);
  const greedy = rounds.filter((r) => r.greed).length;
  const unfinished = rounds.filter((r) => r.result.finderIds.length === 0).length;

  return {
    rounds: rounds.length,
    digsMedian: digs[Math.floor(digs.length / 2)] ?? 0,
    digsMin: digs[0] ?? 0,
    digsMax: digs[digs.length - 1] ?? 0,
    blastsMean: rounds.length === 0 ? 0 : blasts / rounds.length,
    greedRate: rounds.length === 0 ? 0 : greedy / rounds.length,
    unfinished,
  };
}
