/**
 * Fenster in die Buehne fuer E2E- und Perf-Tests (Roadmap M2, ADR-11).
 *
 * Das Feld ist ab M2 ein Canvas: Es gibt kein DOM mehr, an dem ein Test ablesen koennte,
 * ob eine Platte ein Krater ist oder welcher Farbring darauf liegt. Diese Bruecke legt
 * genau diese Fragen offen — **lesend**, ohne Eingriff.
 *
 * Sie existiert nur im Dev-Server und im E2E-Build, wie der Test-Seed. Im Deploy-Build
 * ist die Bedingung zur Bauzeit `false` und der ganze Zweig faellt beim Tree-Shaking
 * heraus; ein CI-Schritt prueft das am gebauten Bundle. Bewusst gibt sie **nichts**
 * heraus, was das Spiel verraten wuerde: keine ungeoeffneten Minen, keine Kistenposition
 * (ADR-2) — nur das, was ohnehin auf dem Bildschirm steht.
 */

import type { Cell } from '@/core/types';
import type { BoardStage } from './BoardStage';
import type { TileState } from './Tile';

/** Was ein Test von der Buehne erfragen darf. */
export interface TestBridge {
  /** Zustand einer Platte — `covered`, `crater`, `open_empty`, … */
  tileState(cell: Cell): TileState | undefined;
  /** Die Farben der Ringe auf einer Platte, als `#rrggbb`. */
  tileColors(cell: Cell): string[];
  /** Wieviele Platten in diesem Zustand sind — fuer Zaehlungen im Replay. */
  countTiles(state: TileState): number;
  /** Echte WebGL-Draw-Calls des letzten Frames (Audit A2: hoechstens 3). */
  drawCalls(): number;
  /** Frame-Zeiten der letzten Sekunden (Audit A2: p50 ≤ 16,7 ms). */
  frameTimes(): number[];
  /** Ist das Feld gerade gesperrt (Inszenierung laeuft)? */
  locked(): boolean;
}

declare global {
  var __sprengmeister: TestBridge | undefined;
}

function hookAllowed(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_E2E === '1';
}

/** Haengt die Bruecke ans globale Objekt — oder tut nichts, wenn sie nicht erlaubt ist. */
export function installTestBridge(stage: BoardStage, cellCount: number): void {
  if (!hookAllowed()) return;

  globalThis.__sprengmeister = {
    tileState: (cell) => stage.board.tileAt(cell)?.state,
    tileColors: (cell) => stage.board.tileAt(cell)?.debugColors() ?? [],
    countTiles: (state) => {
      let count = 0;
      for (let cell = 0; cell < cellCount; cell++) {
        if (stage.board.tileAt(cell)?.state === state) count += 1;
      }
      return count;
    },
    drawCalls: () => stage.stats().drawCalls,
    frameTimes: () => [...stage.stats().frameTimes],
    locked: () => stage.board.locked,
  };
}

export function removeTestBridge(): void {
  if (!hookAllowed()) return;
  globalThis.__sprengmeister = undefined;
}
