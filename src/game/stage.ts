/**
 * Die Bühne über drei Screens hinweg (ADR-6).
 *
 * Hall, Inspect und Gate zeigen dieselbe Zollhalle. Statt sie dreimal aufzubauen, lebt
 * hier **eine** `HallView` pro Runde, und beim Screenwechsel wandert nur das Canvas in
 * einen anderen Host. Das A2-Audit prüft genau das: kein Neuaufbau zwischen den Screens.
 *
 * Der Stage-Controller kennt den Regelkern nicht. Er bekommt Namen, Farben und
 * `publicView` — mehr nicht.
 */

import type { ColorId } from '@/config/theme';
import { createSeededRng } from '@/core/rng';
import type { PlayerId } from '@/core/types';
import { noteStageBuild } from '@/dev/stageProbe';
import { GateDirector } from './GateDirector';
import { getHallApp, loadHallAssets, type HallAppHandle } from './HallApp';
import { HallView } from './HallView';
import { HintDirector } from './HintDirector';
import { InspectDirector } from './InspectDirector';

export interface StagePlayer {
  id: PlayerId;
  name: string;
  colorId: ColorId;
}

export interface StageRequest {
  /** Wechselt der Wert, wird die Bühne neu aufgebaut — genau einmal pro Runde. */
  roundKey: string;
  seed: number;
  players: StagePlayer[];
  officerId: PlayerId;
  travelerIds: PlayerId[];
  lowEffects: boolean;
}

export interface Stage {
  readonly app: HallAppHandle;
  readonly view: HallView;
  readonly hints: HintDirector;
  readonly inspect: InspectDirector;
  readonly gate: GateDirector;
  /** Hängt das Canvas in einen Host — beim Screenwechsel, ohne Neuaufbau. */
  attach(host: HTMLElement): void;
  detach(): void;
}

interface StageState extends Stage {
  roundKey: string;
  stopTicker: () => void;
}

let current: StageState | undefined;

/**
 * Gibt die Bühne der laufenden Runde zurück und baut sie beim ersten Aufruf auf.
 *
 * Der zweite und dritte Screen bekommen dieselbe Instanz — daran hängt, dass die Koffer
 * beim Wechsel von Hall nach Inspect nicht neu einrollen.
 */
export async function ensureStage(request: StageRequest): Promise<Stage> {
  if (current && current.roundKey === request.roundKey) return current;

  disposeStage();

  const [app, assets] = await Promise.all([getHallApp(), loadHallAssets()]);

  const view = new HallView({
    app,
    assets,
    /* Die Inszenierung darf seeded sein — sie entscheidet nichts (CLAUDE.md). */
    rng: createSeededRng(request.seed),
    players: request.players,
    officerId: request.officerId,
    travelerIds: request.travelerIds,
    lowEffects: request.lowEffects,
  });

  view.mount();
  noteStageBuild();

  const offLayout = app.onLayout(() => {
    view.camera.syncHome();
    view.relayoutHitAreas();
  });

  /*
   * Eine Uhr für Atmen, Blinzeln und Band. Die gemessene Dauer landet im Update-Budget
   * des A2-Audits (≤ 4 ms) — deshalb wird sie hier und nicht im Screen genommen.
   */
  const tick = (ticker: { deltaMS: number }): void => {
    const started = performance.now();
    view.update(ticker.deltaMS);
    app.recordUpdate(performance.now() - started);
  };
  app.app.ticker.add(tick);

  current = {
    app,
    view,
    hints: new HintDirector(view),
    inspect: new InspectDirector(view),
    gate: new GateDirector(view),
    roundKey: request.roundKey,
    stopTicker: () => {
      app.app.ticker.remove(tick);
      offLayout();
    },
    attach(host) {
      app.attach(host);
      view.camera.syncHome();
      view.relayoutHitAreas();
    },
    detach() {
      app.detach();
    },
  };

  return current;
}

/** Die laufende Bühne, falls es sie gibt. */
export function currentStage(): Stage | undefined {
  return current;
}

/** Räumt die Bühne ab — am Rundenende, beim Abbruch und im Test. */
export function disposeStage(): void {
  if (!current) return;
  current.stopTicker();
  current.hints.stop();
  current.inspect.stop();
  current.gate.stop();
  current.detach();
  current.view.destroy();
  current = undefined;
}
