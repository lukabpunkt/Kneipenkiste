/**
 * Die Dev-Sonde der Bühne, wie die E2E-Tests sie sehen.
 *
 * Sie steht nur im Dev-Build (`?dev=1`) unter `window.__zollStage`. Der Typ liegt hier
 * gemeinsam, damit nicht zwei Spec-Dateien konkurrierende `Window`-Deklarationen bauen.
 */

export interface SuitcaseRect {
  playerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageProbe {
  suitcases(): SuitcaseRect[];
  drawCalls(): number;
  frameTimes(): number[];
  updateTimes(): number[];
  taps(): string[];
  resetTaps(): void;
  isolateTaps(): void;
  mode(): string;
  builds(): number;
}

declare global {
  interface Window {
    __zollStage?: StageProbe;
  }
}
