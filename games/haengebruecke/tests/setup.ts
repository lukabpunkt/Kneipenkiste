/**
 * Testumgebung.
 *
 * jsdom bringt kein Canvas mit, und PIXI misst Text darüber (`CanvasTextMetrics`). Ohne
 * das schlägt jede Sequenz fehl, die eine Sprechblase zeigt — an einer Stelle, die mit
 * der Sequenz nichts zu tun hat.
 *
 * Der Ersatz misst grob über die Zeichenzahl. Das reicht: Geprüft wird, **dass** eine
 * Blase entsteht und wie lange sie steht, nicht wie breit sie ist. Wie sie aussieht,
 * entscheidet der Look-Check am echten Bild.
 */

const AVERAGE_GLYPH_RATIO = 0.55;

/*
 * PIXI prüft `instanceof CanvasRenderingContext2D`, bevor es misst — in jsdom gibt es die
 * Klasse nicht. Also wird sie hier angelegt; der Kontext ist dann eine echte Instanz.
 */
class StubCanvasContext {
  font = '10px sans-serif';

  measureText(text: string): { width: number } {
    const size = Number.parseFloat(this.font) || 10;
    return { width: text.length * size * AVERAGE_GLYPH_RATIO };
  }

  /* Was PIXI sonst noch anfasst, wenn es doch einmal zeichnen will. */
  fillText(): void {}
  save(): void {}
  restore(): void {}
  scale(): void {}
  clearRect(): void {}
}

const globalScope = globalThis as unknown as { CanvasRenderingContext2D?: unknown };
globalScope.CanvasRenderingContext2D ??= StubCanvasContext;

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, kind: string) {
    /* Nur 2D für die Textmessung; WebGL bleibt bewusst `null` — hier wird nichts gerendert. */
    return kind === '2d' ? new StubCanvasContext() : null;
  } as unknown as HTMLCanvasElement['getContext'];
}
