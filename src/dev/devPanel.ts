/**
 * Dev-Panel (`?dev=1`, Architektur §8).
 *
 * Zwei Aufgaben: den Zustand sichtbar machen (State, Balkenzahl, FPS, Draw-Calls) und
 * Situationen herstellen, auf die man sonst warten müsste (Todeszone, Seed, Verteilung).
 *
 * Nichts hiervon läuft ohne `?dev=1` — im Produktionsbetrieb ist der ganze Zweig tot.
 */

import { minPlankCount } from '@/config/rules';
import type { Fsm } from '@/core/fsm';

export function isDevMode(): boolean {
  return new URLSearchParams(globalThis.location?.search ?? '').has('dev');
}

/** `?seed=123` macht Sequenzwahl und Bruch-Reihenfolge reproduzierbar. */
export function devSeed(): number | null {
  const raw = new URLSearchParams(globalThis.location?.search ?? '').get('seed');
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value >>> 0 : null;
}

/**
 * Zwingt die Brücke auf `B_min`. Das ist die einzige Art, die Todeszone zu testen, ohne
 * vorher drei friedliche Runden zu spielen — und der Zustand ist derselbe, den das Spiel
 * selbst nach drei friedlichen Runden herstellt.
 */
export function forceDeathZone(fsm: Fsm): void {
  const playerCount = fsm.context.players.length;
  const target = minPlankCount(playerCount);
  const planks = fsm.context.bridge.planks.slice(0, target);

  fsm.setBridge({
    count: planks.length,
    planks,
    removed: [...fsm.context.bridge.removed, ...fsm.context.bridge.planks.slice(target)],
  });
}

/** Einen Balken weniger — so lässt sich das Schrumpfen Schritt für Schritt nachstellen. */
export function shrinkBridge(fsm: Fsm): void {
  const planks = fsm.context.bridge.planks;
  if (planks.length <= 1) return;

  fsm.setBridge({
    count: planks.length - 1,
    planks: planks.slice(0, -1),
    removed: [...fsm.context.bridge.removed, planks[planks.length - 1]!],
  });
}

/**
 * Was die Bühne über sich meldet.
 *
 * Angemeldet wird sie von der Bühne selbst (`game/stageStats.ts`) — hier steht nur der
 * Lesezugriff, damit das Panel keinen PIXI-Chunk nachladen muss, bloss um "keine Bühne"
 * anzuzeigen.
 */
export interface StageStats {
  frameTimes: readonly number[];
  /** Reine JS-Zeit pro Frame — die Zahl, die etwas über unseren Code sagt. */
  workTimes: readonly number[];
  drawCalls: number;
}

export interface DevPanelOptions {
  /**
   * Baut den aktuellen Screen neu auf.
   *
   * `setBridge` ist kein FSM-Übergang — es ändert den Zustand, ohne dass jemand davon
   * erfährt. Der Absprache-Screen zeichnet seine Brücke beim Mounten; ohne diesen Ruf
   * bliebe die alte Balkenzahl stehen, obwohl das Spiel längst in der Todeszone ist.
   */
  refresh: () => void;
  /** Frame-Zeiten und Draw-Calls der laufenden Bühne, falls eine steht. */
  stats: () => StageStats | undefined;
}

/** p50 und p95 einer Frame-Zeit-Reihe — die zwei Zahlen aus Audit A2. */
export function percentiles(times: readonly number[]): { p50: number; p95: number } {
  if (times.length === 0) return { p50: 0, p95: 0 };
  const sorted = [...times].sort((a, b) => a - b);
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!;
  return { p50: at(0.5), p95: at(0.95) };
}

export function createDevPanel(fsm: Fsm, options: DevPanelOptions): HTMLElement {
  const el = document.createElement('aside');
  el.className = 'dev-panel';
  el.dataset.dev = 'panel';

  const state = document.createElement('span');
  state.className = 'dev-panel__state';

  const bridge = document.createElement('span');
  bridge.className = 'dev-panel__bridge';

  /*
   * Die zwei Zahlen aus Audit A2, live: Frame-Median und Draw-Calls. Sie stehen hier und
   * nicht nur im Perf-Test, weil man beim Zuschauen merkt, wann es ruckelt — und dann
   * wissen will, ob es an der Zeichenlast oder an den Batches liegt.
   */
  const perf = document.createElement('span');
  perf.className = 'dev-panel__perf';
  perf.dataset.dev = 'perf';

  const button = (label: string, dev: string, onClick: () => void): HTMLButtonElement => {
    const el2 = document.createElement('button');
    el2.type = 'button';
    el2.className = 'dev-panel__button';
    el2.dataset.dev = dev;
    el2.textContent = label;
    el2.addEventListener('click', onClick);
    return el2;
  };

  const deathZone = button('Todeszone', 'deathzone', () => {
    forceDeathZone(fsm);
    render();
    options.refresh();
  });

  const shrink = button('−1 Balken', 'shrink', () => {
    shrinkBridge(fsm);
    render();
    options.refresh();
  });

  const render = (): void => {
    state.textContent = fsm.state;
    bridge.textContent = `B=${fsm.context.bridge.count} n=${fsm.context.players.length}`;
    /* Nur da sinnvoll, wo die Runde noch nicht gewählt hat. */
    const editable = fsm.state === 'NEGOTIATION' || fsm.state === 'SILENCE';
    deathZone.disabled = !editable;
    shrink.disabled = !editable;
  };

  const renderPerf = (): void => {
    const stats = options.stats();
    if (!stats) {
      perf.textContent = '';
      return;
    }
    const frame = percentiles(stats.frameTimes);
    const work = percentiles(stats.workTimes);
    perf.textContent = `${frame.p50.toFixed(1)}ms · js ${work.p95.toFixed(2)} · ${stats.drawCalls}dc`;
  };

  fsm.subscribe(render);
  render();

  const timer = globalThis.setInterval(renderPerf, 500);
  el.addEventListener('remove', () => clearInterval(timer));

  el.append(state, bridge, perf, shrink, deathZone);
  return el;
}

/** Was gerade gemessen wird — `undefined`, solange keine Bühne steht. */
export function readStageStats(): StageStats | undefined {
  return (globalThis as unknown as { __stageStats?: () => StageStats | undefined }).__stageStats?.();
}
