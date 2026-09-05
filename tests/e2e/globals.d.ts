/**
 * Die Test-Bruecke, die der E2E-Build bereitstellt (`src/game/testBridge.ts`).
 * Sie existiert im Deploy-Build nicht — deshalb hier als optionales Global.
 */
interface SprengmeisterTestBridge {
  tileState(cell: number): string | undefined;
  tileColors(cell: number): string[];
  countTiles(state: string): number;
  drawCalls(): number;
  frameTimes(): number[];
  locked(): boolean;
  particles(): number;
}

declare global {
  var __sprengmeister: SprengmeisterTestBridge | undefined;
}

export {};
