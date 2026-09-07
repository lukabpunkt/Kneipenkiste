/**
 * Zugreihenfolge (GDD §3.4, Architektur §5) — reine Funktionen.
 *
 * Der Startspieler rotiert jede Runde um eins. Grund (GDD §7): Der erste Zug ist
 * statistisch der sicherste — auf einem leeren Feld ist die Wahrscheinlichkeit, dass
 * ausgerechnet die erste Platte vermint ist, am kleinsten, und der erste Graeber hat
 * ausserdem die freie Auswahl unter seinen eigenen Trittsteinen. Ohne Rotation haette
 * Spieler 1 diesen Vorteil jede Runde.
 */

import { closedCells } from './board';
import { secureRandom, type SecureRandom } from './rng';
import type { Board, Cell, PlayerId } from './types';

/**
 * Wer die Runde eroeffnet. `roundIndex` ist 1-basiert, also faengt in Runde 1 der erste
 * Spieler der Liste an, in Runde 2 der zweite, und so weiter im Kreis.
 */
export function startingPlayerIndex(roundIndex: number, playerCount: number): number {
  if (playerCount <= 0) throw new RangeError('Ohne Spieler gibt es keine Zugreihenfolge.');
  // Modulo zweimal, damit auch ein negativer roundIndex (Tests) im Bereich landet.
  return (((roundIndex - 1) % playerCount) + playerCount) % playerCount;
}

/** Die Reihenfolge einer Runde: ab dem Startspieler einmal im Kreis. */
export function turnOrder(playerIds: readonly PlayerId[], roundIndex: number): PlayerId[] {
  const start = startingPlayerIndex(roundIndex, playerIds.length);
  return playerIds.map((_, i) => playerIds[(start + i) % playerIds.length]!);
}

/** Wer ist beim `turnNumber`-ten Zug dran (0-basiert)? Die Reihe laeuft endlos im Kreis. */
export function playerAtTurn(
  playerIds: readonly PlayerId[],
  roundIndex: number,
  turnNumber: number
): PlayerId {
  if (playerIds.length === 0) throw new RangeError('Ohne Spieler gibt es keine Zugreihenfolge.');
  const start = startingPlayerIndex(roundIndex, playerIds.length);
  const index = (((start + turnNumber) % playerIds.length) + playerIds.length) % playerIds.length;
  return playerIds[index]!;
}

/** Der naechste Spieler in der Reihe. */
export function nextPlayerIndex(currentIndex: number, playerCount: number): number {
  if (playerCount <= 0) throw new RangeError('Ohne Spieler gibt es keine Zugreihenfolge.');
  return (currentIndex + 1) % playerCount;
}

/**
 * Zug-Timer abgelaufen (GDD §3.4): Es wird eine zufaellige **geschlossene** Platte
 * gegraben. Laeuft ueber sicheren Zufall, damit ein erzwungener Zug nicht aus einem Seed
 * vorhersagbar ist — sonst koennte man den Timer bewusst auslaufen lassen, wenn man weiss,
 * was er trifft.
 *
 * Gibt `null` zurueck, wenn nichts mehr offen ist. Praktisch unerreichbar (die Kiste liegt
 * immer auf einem Feld, also endet die Runde vorher), aber der Aufrufer muss nicht raten.
 */
export function randomClosedCell(board: Board, rnd: SecureRandom = secureRandom): Cell | null {
  const closed = closedCells(board);
  if (closed.length === 0) return null;
  return closed[rnd.int(closed.length)]!;
}
