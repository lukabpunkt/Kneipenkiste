/**
 * Vitest-Setup: ein Canvas-Stub fuer jsdom.
 *
 * PixiJS fragt beim Import, ob der Browser moderne Canvas-Blendmodi kann, und ruft dazu
 * `getContext('2d')`. jsdom kennt das nicht und schreibt bei jedem Import eine
 * Fehlermeldung ins Log — die Tests laufen trotzdem, aber die Ausgabe ist danach voll
 * mit Stacktraces, die nichts bedeuten.
 *
 * Hier steht deshalb die kleinste Antwort, die PixiJS zufriedenstellt. Gezeichnet wird in
 * Unit-Tests ohnehin nichts: Was das Rendern betrifft, pruefen `perf.spec.ts` und der
 * Look-Check am Geraet.
 */

const noop = (): void => undefined;

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => ({
    fillRect: noop,
    clearRect: noop,
    getImageData: (_x: number, _y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(Math.max(1, width * height * 4)),
    }),
    putImageData: noop,
    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    drawImage: noop,
    fillText: noop,
    measureText: () => ({ width: 0 }),
    beginPath: noop,
    closePath: noop,
    stroke: noop,
    fill: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    setTransform: noop,
    canvas: { width: 1, height: 1 },
  }),
});
