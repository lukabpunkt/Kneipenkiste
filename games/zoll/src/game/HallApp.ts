/**
 * PIXI-Lifecycle (Architektur §8).
 *
 * **Ein** `Application`-Objekt für die gesamte Session. Die Zollhalle wird in drei
 * Screens gebraucht — Hall, Inspect, Gate — und statt sie dreimal aufzubauen, wandert
 * dasselbe Canvas zwischen den Screen-Hosts (ADR-6).
 *
 * Eine Uhr: der PIXI-Ticker treibt GSAP. Zwei RAF-Schleifen nebeneinander liefen bei
 * Slow-Mo und Hit-Stop auseinander.
 */

import { Application, Assets, Container, type Spritesheet } from 'pixi.js';
/*
 * PIXI erzeugt Shader-Code per `new Function`. Unsere CSP verbietet `unsafe-eval`,
 * deshalb der eval-freie Pfad — ohne ihn stirbt die Halle beim ersten Render.
 */
import 'pixi.js/unsafe-eval';
import gsap from 'gsap';
import { RENDER, STAGE } from '@/config/theme';

export interface HallAssets {
  shotlings: Spritesheet;
  hall: Spritesheet;
  suitcases: Spritesheet;
  items: Spritesheet;
  xray: Spritesheet;
  dog: Spritesheet;
}

export type AtlasName = keyof HallAssets;

const ATLASES: readonly AtlasName[] = ['shotlings', 'hall', 'suitcases', 'items', 'xray', 'dog'];

/** Welche Auflösung des Atlas passt zum Gerät? */
function atlasSuffix(): '@1x' | '@2x' {
  return (globalThis.devicePixelRatio ?? 1) > 1.25 ? '@2x' : '@1x';
}

function atlasUrl(name: string): string {
  return `${import.meta.env.BASE_URL}atlas/${name}${atlasSuffix()}.json`;
}

let assetsPromise: Promise<HallAssets> | undefined;
let assetsReady = false;

/**
 * Lädt alle Atlanten. Mehrfachaufrufe teilen sich dieselbe Promise, damit der Preload in
 * der Lobby und das spätere Betreten der Halle nicht doppelt laden.
 */
export function loadHallAssets(): Promise<HallAssets> {
  assetsPromise ??= (async () => {
    const sheets = await Promise.all(ATLASES.map((name) => Assets.load<Spritesheet>(atlasUrl(name))));
    assetsReady = true;
    return Object.fromEntries(ATLASES.map((name, i) => [name, sheets[i]!])) as unknown as HallAssets;
  })();
  return assetsPromise;
}

/** Preload im Hintergrund — läuft während der Lobby (Roadmap M2.6). */
export function preloadHallAssets(): void {
  void loadHallAssets().catch((error) => {
    console.warn('[hall] Preload fehlgeschlagen', error);
    /* Beim echten Betreten der Halle wird erneut versucht. */
    assetsPromise = undefined;
  });
}

export function areHallAssetsReady(): boolean {
  return assetsReady;
}

export interface HallLayout {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HallAppHandle {
  readonly app: Application;
  /** Alles Sichtbare hängt hier drin, gerechnet in Welteinheiten (1000 × 1000). */
  readonly world: Container;
  /** Bildschirmraum über der Welt — unskaliert, in CSS-Pixeln. */
  readonly overlay: Container;
  readonly layout: HallLayout;
  onLayout(listener: (layout: HallLayout) => void): () => void;
  /** Welt- → Bildschirmkoordinaten, allokationsfrei. */
  worldToScreen(x: number, y: number, out: { x: number; y: number }): void;
  /** Hängt das Canvas in einen Host und startet den Ticker. */
  attach(host: HTMLElement): void;
  /** Nimmt das Canvas aus dem DOM und pausiert — die App bleibt am Leben. */
  detach(): void;
  clearWorld(): void;
  frameTimes(): readonly number[];
  /** Echte WebGL-Draw-Calls des letzten Frames (Audit A2: ≤ 3). */
  drawCalls(): number;
  updateTimes(): readonly number[];
  recordUpdate(durationMs: number): void;
  destroy(): void;
}

let handle: HallAppHandle | undefined;

export async function getHallApp(): Promise<HallAppHandle> {
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

  const layout: HallLayout = { scale: 1, x: 0, y: 0, width: 1, height: 1 };
  const layoutListeners = new Set<(value: HallLayout) => void>();

  /* --- Eine Uhr: PIXI treibt GSAP --- */
  gsap.ticker.remove(gsap.updateRoot);
  let elapsed = 0;

  const SAMPLES = 240;
  const samples = new Float32Array(SAMPLES);
  let sampleIndex = 0;
  let sampleCount = 0;

  const updateSamples = new Float32Array(SAMPLES);
  let updateIndex = 0;
  let updateCount = 0;

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
   * Die Halle füllt die **Breite** des Hosts, nicht das Quadrat.
   *
   * Ein "contain" auf 1000 × 1000 ließe auf einem Handy links und rechts nichts übrig,
   * dafür oben und unten viel Luft — die Halle ist aber eine Szene in die Breite. Also:
   * Breite füllen, senkrecht so ausrichten, dass eher die Decke wegfällt als der Boden.
   */
  const relayout = (): void => {
    if (!host) return;
    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;
    app.renderer.resize(width, height);

    const scale = Math.max(width / STAGE.worldWidth, height / STAGE.worldHeight * 0.62);
    const x = (width - STAGE.worldWidth * scale) / 2;
    /* 0.42 statt 0.5: Der Boden mit Koffern und Leuten ist wichtiger als die Wand. */
    const y = (height - STAGE.worldHeight * scale) * 0.42;

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
    /* Im Hintergrund kostet die Halle nichts. */
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

    /* Die Kamera verschiebt und skaliert `world` zur Laufzeit — deshalb die
       tatsächliche Transformation lesen, nicht die Ruhelage. */
    worldToScreen(x, y, out) {
      out.x = world.position.x + x * world.scale.x;
      out.y = world.position.y + y * world.scale.y;
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

    frameTimes: () => Array.from(samples.slice(0, sampleCount)),
    drawCalls: () => drawsLastFrame,
    updateTimes: () => Array.from(updateSamples.slice(0, updateCount)),

    recordUpdate(durationMs) {
      updateSamples[updateIndex] = durationMs;
      updateIndex = (updateIndex + 1) % SAMPLES;
      if (updateCount < SAMPLES) updateCount++;
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

/** Die laufende Halle, falls es sie schon gibt — Testhilfe und Dev-Panel. */
export function currentHallApp(): HallAppHandle | undefined {
  return handle;
}

/** Nur für Tests: gibt den Singleton frei. */
export function resetHallApp(): void {
  handle?.destroy();
  handle = undefined;
  assetsPromise = undefined;
  assetsReady = false;
}

/**
 * Legt einen Zähler um die WebGL-Draw-Aufrufe. Schlägt still fehl, wenn kein WebGL da
 * ist — dann liefert `drawCalls()` eben 0.
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
/* Low-Effects-Erkennung                                               */
/* ------------------------------------------------------------------ */

interface DeviceInfo {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

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
