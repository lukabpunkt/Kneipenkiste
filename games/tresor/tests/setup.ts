/**
 * Test-Setup fuer die Unit-Suite.
 *
 * jsdom bringt kein Canvas mit. Sobald ein Test ein Modul importiert, das irgendwo auf
 * PixiJS trifft, ruft PIXI beim Laden `canvas.getContext('2d')` auf und jsdom schreibt
 * einen mehrzeiligen "Not implemented"-Stacktrace nach stderr — bei jedem Lauf, ohne dass
 * etwas kaputt waere.
 *
 * Der Stub gibt ein Minimal-Objekt zurueck. Er ersetzt kein Canvas: Wer wirklich rendern
 * will, gehoert in die E2E-Suite, wo ein echter Browser laeuft.
 */

const noop = (): void => undefined;

const stub2d = {
  fillRect: noop,
  clearRect: noop,
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  putImageData: noop,
  createImageData: () => ({ data: new Uint8ClampedArray(4) }),
  setTransform: noop,
  drawImage: noop,
  save: noop,
  restore: noop,
  beginPath: noop,
  moveTo: noop,
  lineTo: noop,
  closePath: noop,
  stroke: noop,
  fill: noop,
  translate: noop,
  scale: noop,
  rotate: noop,
  arc: noop,
  measureText: () => ({ width: 0 }),
  fillText: noop,
  globalCompositeOperation: 'source-over',
} as unknown as CanvasRenderingContext2D;

HTMLCanvasElement.prototype.getContext = function getContext(contextId: string): RenderingContext | null {
  // Nur 2D: Fuer WebGL gibt es keinen sinnvollen Stub, und niemand soll ihn versehentlich
  // fuer echt halten.
  return contextId === '2d' ? stub2d : null;
} as HTMLCanvasElement['getContext'];
