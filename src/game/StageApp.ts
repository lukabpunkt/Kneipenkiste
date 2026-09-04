/**
 * PIXI-Lifecycle (Architektur §9).
 *
 * **Ein** `Application`-Objekt fuer die gesamte Session: Es entsteht beim ersten Betreten
 * der Aufdeckung und wird danach wiederverwendet. Zwischen den Runden wird nur die Buehne
 * geleert, nie die App.
 *
 * Eine Uhr: Der PIXI-Ticker treibt GSAP (CLAUDE.md). Zwei RAF-Schleifen nebeneinander
 * wuerden bei Slow-Mo und Hit-Stop auseinanderlaufen — und genau davon lebt die letzte
 * Karte.
 */

import { Application, Assets, Container, type Spritesheet } from 'pixi.js';
/*
 * PIXI erzeugt Shader- und Uniform-Code per `new Function`. Unsere CSP verbietet
 * `unsafe-eval` (Architektur §9), deshalb der eval-freie Pfad — ohne ihn stirbt die
 * Buehne beim ersten Render mit "Current environment does not allow unsafe-eval".
 */
import 'pixi.js/unsafe-eval';
import gsap from 'gsap';
import { RENDER, STAGE } from '@/config/theme';

/**
 * Die drei Atlanten sind nach **Zeichenreihenfolge** geschnitten, nicht nach Thema
 * (ADR-14): hinter den Crooks, die Crooks, vor den Crooks. Genau drei Texturwechsel
 * pro Frame — und damit drei Draw-Calls (Audit A2).
 */
export interface StageAssets {
  /** Wand, Tisch, Laser, Tresor, Herr Kassel. */
  back: Spritesheet;
  /** Die Figuren. */
  crooks: Spritesheet;
  /** Karten, Requisiten und das Licht (Spotlight, Vignette). */
  front: Spritesheet;
}

const ATLASES = ['back', 'crooks', 'front'] as const;

/** Welche Aufloesung des Atlas passt zum Geraet? */
function atlasSuffix(): '@1x' | '@2x' {
  return (globalThis.devicePixelRatio ?? 1) > 1.25 ? '@2x' : '@1x';
}

function atlasUrl(name: string): string {
  return `${import.meta.env.BASE_URL}atlas/${name}${atlasSuffix()}.json`;
}

let assetsPromise: Promise<StageAssets> | undefined;
let assetsReady = false;

/**
 * Laedt alle Atlanten. Mehrfachaufrufe teilen sich dieselbe Promise, damit der Preload
 * waehrend der Verhandlung und das spaetere Betreten der Buehne nicht doppelt laden.
 */
export function loadStageAssets(): Promise<StageAssets> {
  assetsPromise ??= (async () => {
    const sheets = await Promise.all(ATLASES.map((name) => Assets.load<Spritesheet>(atlasUrl(name))));
    assetsReady = true;
    return Object.fromEntries(ATLASES.map((name, index) => [name, sheets[index]!])) as unknown as StageAssets;
  })();
  return assetsPromise;
}

/**
 * Preload im Hintergrund (Architektur §8) — laeuft waehrend NEGOTIATION.
 * Beim Betreten der Aufdeckung darf nichts mehr nachgeladen werden (Audit A2).
 */
export function preloadStageAssets(): void {
  void loadStageAssets().catch((error) => {
    console.warn('[stage] Preload fehlgeschlagen', error);
    // Beim echten Betreten der Buehne wird erneut versucht.
    assetsPromise = undefined;
  });
}

/** True, sobald alle Atlanten im Speicher liegen. */
export function areStageAssetsReady(): boolean {
  return assetsReady;
}

export interface StageLayout {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageAppHandle {
  readonly app: Application;
  /** Alles Sichtbare haengt hier drin; gerechnet wird in Welteinheiten (1000 × 1000). */
  readonly world: Container;
  /** Bildschirmraum ueber der Welt — Vignette und Alarm-Blitz, unskaliert. */
  readonly overlay: Container;
  readonly layout: StageLayout;
  onLayout(listener: (layout: StageLayout) => void): () => void;
  /** Haengt das Canvas in ein Host-Element und startet den Ticker. */
  attach(host: HTMLElement): void;
  /** Nimmt das Canvas aus dem DOM und pausiert — die App bleibt am Leben. */
  detach(): void;
  /** Leert die Buehne zwischen zwei Runden; App und Pools bleiben bestehen. */
  clearWorld(): void;
  /** Gemessene Frame-Zeiten (Dev-Panel, Low-Effects-Erkennung). */
  frameTimes(): readonly number[];
  /** Echte WebGL-Draw-Calls des letzten Frames (Audit A2: ≤ 3 Batches). */
  drawCalls(): number;
  destroy(): void;
}

let handle: StageAppHandle | undefined;

/** Erzeugt die App beim ersten Aufruf und gibt danach immer dieselbe Instanz zurueck. */
export async function getStageApp(): Promise<StageAppHandle> {
  if (handle) return handle;

  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    antialias: RENDER.antialias,
    autoDensity: true,
    resolution: Math.min(globalThis.devicePixelRatio ?? 1, RENDER.maxResolution),
    powerPreference: RENDER.powerPreference,
    preference: 'webgl',
  });

  const world = new Container();
  const overlay = new Container();
  app.stage.addChild(world, overlay);

  const layout: StageLayout = { scale: 1, x: 0, y: 0, width: 1, height: 1 };
  const layoutListeners = new Set<(value: StageLayout) => void>();

  /* --- Eine Uhr: PIXI treibt GSAP --- */
  gsap.ticker.remove(gsap.updateRoot);
  let elapsed = 0;

  /* --- Frame-Zeiten fuer Dev-Panel und Low-Effects-Erkennung --- */
  const SAMPLES = 240;
  const samples = new Float32Array(SAMPLES);
  let sampleIndex = 0;
  let sampleCount = 0;

  /*
   * Draw-Calls ehrlich zaehlen: PIXI legt keinen offiziellen Zaehler offen, also werden
   * `drawElements`/`drawArrays` im WebGL-Kontext umschlossen. Das ist die Zahl, die im
   * A2-Audit zaehlt — nicht eine interne Batch-Liste, die auch mal veraltet sein kann.
   */
  let drawsThisFrame = 0;
  let drawsLastFrame = 0;
  instrumentDrawCalls(app, () => {
    drawsThisFrame++;
  });

  app.ticker.add(
    (ticker) => {
      drawsLastFrame = drawsThisFrame;
      drawsThisFrame = 0;
      elapsed += ticker.deltaMS;
      gsap.updateRoot(elapsed / 1000);
      samples[sampleIndex] = ticker.deltaMS;
      sampleIndex = (sampleIndex + 1) % SAMPLES;
      if (sampleCount < SAMPLES) sampleCount++;
    },
    undefined,
    -100
  );

  let host: HTMLElement | undefined;
  let observer: ResizeObserver | undefined;

  /**
   * Skaliert die Welt auf die **Breite** des Hosts.
   *
   * Das Spiel laeuft im Hochformat: Der Bildschirm ist deutlich hoeher als breit. Wuerde
   * die quadratische Welt komplett hineinpassen (`Math.min`), blieben oben und unten
   * breite leere Baender; wuerde sie die Diagonale fuellen (`Math.max`), waere seitlich
   * nur das mittlere Drittel des Halbkreises zu sehen — die aeusseren Karten laegen
   * ausserhalb des Bildes.
   *
   * Also: Breite exakt fuellen, vertikal zentrieren. Was ueber die Welt hinausragt, ist
   * Wand und Boden — `VaultRoom` zeichnet die bewusst grosszuegig ueber die Weltgrenzen
   * hinaus.
   */
  const relayout = (): void => {
    if (!host) return;
    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;
    app.renderer.resize(width, height);

    const scale = width / STAGE.worldSize;
    const x = 0;
    const y = (height - STAGE.worldSize * scale) / 2;

    world.scale.set(scale);
    world.position.set(x, y);

    layout.scale = scale;
    layout.x = x;
    layout.y = y;
    layout.width = width;
    layout.height = height;

    for (const listener of layoutListeners) listener(layout);
  };

  const onVisibility = (): void => {
    // Im Hintergrund kostet die Buehne nichts (Architektur §9).
    if (document.hidden) {
      app.ticker.stop();
      gsap.globalTimeline.pause();
    } else {
      gsap.globalTimeline.resume();
      app.ticker.start();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  handle = {
    app,
    world,
    overlay,
    layout,

    onLayout(listener) {
      layoutListeners.add(listener);
      listener(layout);
      return () => layoutListeners.delete(listener);
    },

    attach(target) {
      host = target;
      target.append(app.canvas);
      observer?.disconnect();
      observer = new ResizeObserver(relayout);
      observer.observe(target);
      relayout();
      app.ticker.start();
    },

    detach() {
      observer?.disconnect();
      observer = undefined;
      app.canvas.remove();
      host = undefined;
      app.ticker.stop();
    },

    clearWorld() {
      world.removeChildren();
      overlay.removeChildren();
    },

    frameTimes() {
      return Array.from(samples.slice(0, sampleCount));
    },

    drawCalls() {
      return drawsLastFrame;
    },

    destroy() {
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      app.destroy(true, { children: true });
      handle = undefined;
    },
  };

  return handle;
}

/** Aktuelle Welt-Transformation — Testwerkzeuge leiten daraus Bildausschnitte ab. */
export function stageLayout(): StageLayout | undefined {
  return handle?.layout;
}

/** Frame-Zeiten der laufenden Buehne — Testhilfe fuer `perf.spec.ts` (M3). */
export function stageFrameTimes(): readonly number[] {
  return handle?.frameTimes() ?? [];
}

/** Draw-Calls des letzten Frames — Audit A2. */
export function stageDrawCalls(): number {
  return handle?.drawCalls() ?? 0;
}

/** Nur fuer Tests: gibt den Singleton frei. */
export function resetStageApp(): void {
  handle?.destroy();
  handle = undefined;
  assetsPromise = undefined;
  assetsReady = false;
}

/**
 * Legt einen Zaehler um die WebGL-Draw-Aufrufe. Schlaegt still fehl, wenn der Renderer
 * kein WebGL nutzt — dann liefert `drawCalls()` eben 0.
 */
function instrumentDrawCalls(app: Application, onDraw: () => void): void {
  const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
  if (!gl) return;
  const drawElements = gl.drawElements.bind(gl);
  const drawArrays = gl.drawArrays.bind(gl);
  gl.drawElements = ((...args: Parameters<WebGLRenderingContext['drawElements']>) => {
    onDraw();
    return drawElements(...args);
  }) as WebGLRenderingContext['drawElements'];
  gl.drawArrays = ((...args: Parameters<WebGLRenderingContext['drawArrays']>) => {
    onDraw();
    return drawArrays(...args);
  }) as WebGLRenderingContext['drawArrays'];
}

/* ------------------------------------------------------------------ */
/* Low-Effects-Erkennung (Architektur §9)                              */
/* ------------------------------------------------------------------ */

interface DeviceInfo {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

/**
 * Grobe Vorab-Einschaetzung anhand der Geraete-Angaben. Der zweite Teil der Regel — der
 * gemessene Frame-Median ueber die ersten 2 s — laeuft in `measureLowEffects()`.
 */
export function detectLowEffects(info: DeviceInfo = navigator as DeviceInfo): boolean {
  const memory = info.deviceMemory;
  const cores = info.hardwareConcurrency;
  if (memory !== undefined && memory <= RENDER.lowEffects.deviceMemoryMax) return true;
  if (cores !== undefined && cores <= RENDER.lowEffects.hardwareConcurrencyMax) return true;
  return false;
}

/** Median einer Frame-Zeit-Reihe. */
export function frameMedian(times: readonly number[]): number {
  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

/**
 * Misst nach dem Betreten der Buehne und meldet, ob der Low-Effects-Modus greifen soll.
 * Loest mit `true` auf, wenn der Frame-Median ueber der Schwelle liegt.
 */
export function measureLowEffects(target: StageAppHandle): Promise<boolean> {
  return new Promise((resolve) => {
    globalThis.setTimeout(() => {
      resolve(frameMedian(target.frameTimes()) > RENDER.lowEffects.frameMedianMaxMs);
    }, RENDER.lowEffects.probeDurationMs);
  });
}
