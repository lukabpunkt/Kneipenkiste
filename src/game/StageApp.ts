/**
 * PIXI-Lifecycle (Architektur §8).
 *
 * **Ein** `Application`-Objekt für die gesamte Session: erzeugt beim ersten Schritt,
 * danach wiederverwendet. Zwischen zwei Runden wird nur die Bühne geleert, nie die App —
 * ein zweiter Renderer kostet auf einem Handy spürbar Akku.
 *
 * Eine Uhr: der PIXI-Ticker treibt GSAP. Zwei RAF-Schleifen nebeneinander würden bei
 * Slow-Mo und Hit-Stop auseinanderlaufen — und genau die sind die Signatur des Spiels.
 */

import { Application, Assets, Container, type Spritesheet } from 'pixi.js';
/*
 * PIXI erzeugt Shader-Code per `new Function`. Unsere CSP verbietet `unsafe-eval`,
 * deshalb der eval-freie Pfad — ohne ihn stirbt die Schlucht beim ersten Render.
 */
import 'pixi.js/unsafe-eval';
import gsap from 'gsap';
import { RENDER, STAGE } from '@/config/theme';

export interface StageAssets {
  /** Schlucht, Brücke, Schilder, Fx — alles Unbelebte. */
  world: Spritesheet;
  /** Hikers, Gustav, Balthasar — alles, was sich bewegt. */
  chars: Spritesheet;
}

/** Welche Auflösung des Atlas passt zum Gerät? */
function atlasSuffix(): '@1x' | '@2x' {
  return (globalThis.devicePixelRatio ?? 1) > 1.25 ? '@2x' : '@1x';
}

function atlasUrl(name: string): string {
  return `${import.meta.env.BASE_URL}atlas/${name}${atlasSuffix()}.json`;
}

let assetsPromise: Promise<StageAssets> | undefined;
let assetsReady = false;

/**
 * Lädt beide Atlanten. Mehrfachaufrufe teilen sich dieselbe Promise, damit der Preload
 * während der Absprache und das spätere Betreten der Schlucht nicht doppelt laden.
 */
export function loadStageAssets(): Promise<StageAssets> {
  assetsPromise ??= (async () => {
    const [world, chars] = await Promise.all([
      Assets.load<Spritesheet>(atlasUrl('world')),
      Assets.load<Spritesheet>(atlasUrl('chars')),
    ]);
    assetsReady = true;
    return { world, chars };
  })();
  return assetsPromise;
}

/**
 * Preload im Hintergrund (Roadmap M2.5) — läuft während der Absprache.
 *
 * Zwanzig Sekunden Reden sind genug Zeit für 250 KB; wer erst beim Schritt lädt, sieht
 * einen Spinner an der Stelle, an der die Show anfangen sollte.
 */
export function preloadStageAssets(): void {
  void loadStageAssets().catch((error) => {
    console.warn('[stage] Preload fehlgeschlagen', error);
    /* Beim echten Betreten der Schlucht wird erneut versucht. */
    assetsPromise = undefined;
  });
}

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

export interface StageHandle {
  readonly app: Application;
  /** Alles Spielbare hängt hier drin; gerechnet wird in Welteinheiten (1000 × 1000). */
  readonly world: Container;
  /** Bildschirmraum über der Welt — Sprechblasen und Schilder in CSS-Pixeln. */
  readonly overlay: Container;
  readonly layout: StageLayout;
  onLayout(listener: (layout: StageLayout) => void): () => void;
  attach(host: HTMLElement): void;
  detach(): void;
  clearWorld(): void;
  /** Gemessene Frame-Zeiten (Dev-Panel, Low-Effects-Erkennung). */
  frameTimes(): readonly number[];
  /**
   * Reine JS-Zeit pro Frame: unser Loop, ohne Rendern.
   *
   * Die Frame-Zeit misst, wie schnell der Bildschirm taktet — in einem Headless-Browser
   * sind das stur 33.3 ms, egal wie wenig wir tun. Diese Zahl hier misst **unsere**
   * Arbeit und ist damit die einzige, die in CI etwas aussagt (Architektur §8).
   */
  workTimes(): readonly number[];
  /** Wird vom Bühnen-Loop mit seiner gemessenen Dauer gefüttert. */
  recordWork(durationMs: number): void;
  /** Echte WebGL-Draw-Calls des letzten Frames (Audit A2: ≤ 3). */
  drawCalls(): number;
  destroy(): void;
}

let handle: StageHandle | undefined;

export async function getStageApp(): Promise<StageHandle> {
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

  const SAMPLES = 240;
  const samples = new Float32Array(SAMPLES);
  let sampleIndex = 0;
  let sampleCount = 0;

  const workSamples = new Float32Array(SAMPLES);
  let workIndex = 0;
  let workCount = 0;

  /*
   * Draw-Calls ehrlich zählen: PIXI legt keinen Zähler offen, also werden
   * `drawElements`/`drawArrays` umschlossen. Das ist die Zahl, die A2 prüft — nicht eine
   * interne Batch-Liste, die auch mal veraltet sein kann.
   */
  let drawsThisFrame = 0;
  let drawsLastFrame = 0;
  instrumentDrawCalls(app, () => {
    drawsThisFrame += 1;
  });

  app.ticker.add(
    (ticker) => {
      drawsLastFrame = drawsThisFrame;
      drawsThisFrame = 0;
      elapsed += ticker.deltaMS;
      gsap.updateRoot(elapsed / 1000);
      samples[sampleIndex] = ticker.deltaMS;
      sampleIndex = (sampleIndex + 1) % SAMPLES;
      if (sampleCount < SAMPLES) sampleCount += 1;
    },
    undefined,
    -100
  );

  let host: HTMLElement | undefined;
  let observer: ResizeObserver | undefined;

  /**
   * Skaliert die Welt in den Host.
   *
   * Es zählt allein die **Breite**: Die Brücke spannt sich von x 180 bis 820, und eine
   * seitlich abgeschnittene Brücke wäre kein Bildausschnitt, sondern ein kaputtes Spiel.
   * In der Höhe sieht ein Hochkant-Handy dadurch rund 2200 Welteinheiten — dafür reicht
   * die Kulisse von `skyTop` bis `floorY`.
   *
   * Die eigentliche Positionierung macht die Kamera; hier steht nur der Massstab.
   */
  const relayout = (): void => {
    if (!host) return;
    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;
    app.renderer.resize(width, height);

    const scale = width / STAGE.worldWidth;
    world.scale.set(scale);

    layout.scale = scale;
    layout.x = 0;
    layout.y = 0;
    layout.width = width;
    layout.height = height;

    for (const listener of layoutListeners) listener(layout);
  };

  /* Im Hintergrund kostet die Schlucht nichts. */
  const onVisibility = (): void => {
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

    workTimes() {
      return Array.from(workSamples.slice(0, workCount));
    },

    recordWork(durationMs) {
      workSamples[workIndex] = durationMs;
      workIndex = (workIndex + 1) % SAMPLES;
      if (workCount < SAMPLES) workCount += 1;
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

/** Räumt die Bühne ab — der Step-Screen ruft das beim Verlassen. */
export function disposeStage(): void {
  handle?.detach();
  handle?.clearWorld();
}

/** Nur für Tests und das Dev-Panel. */
export function currentStage(): StageHandle | undefined {
  return handle;
}

export function resetStageApp(): void {
  handle?.destroy();
  handle = undefined;
  assetsPromise = undefined;
  assetsReady = false;
}

function instrumentDrawCalls(app: Application, onDraw: () => void): void {
  const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
  /* Kein WebGL (Canvas-Fallback im Test) — dann meldet `drawCalls()` eben 0. */
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
/* Low-Effects (Architektur §8)                                        */
/* ------------------------------------------------------------------ */

interface DeviceInfo {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

/** Grobe Vorab-Einschätzung; die Messung darunter entscheidet endgültig. */
export function detectLowEffects(info: DeviceInfo = navigator as DeviceInfo): boolean {
  const memory = info.deviceMemory;
  const cores = info.hardwareConcurrency;
  if (memory !== undefined && memory <= RENDER.lowEffects.deviceMemoryMax) return true;
  if (cores !== undefined && cores <= RENDER.lowEffects.hardwareConcurrencyMax) return true;
  return false;
}

export function frameMedian(times: readonly number[]): number {
  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}
