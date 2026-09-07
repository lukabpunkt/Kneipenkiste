/**
 * Dev-Panel (`?dev=1`, Architektur §8).
 *
 * In M1 kann es das Nötigste, um die vier E2E-Szenarien reproduzierbar zu machen: einen
 * Seed setzen und die Brücke in die Todeszone zwingen. Der Sequenz-Preview, der
 * Verteilungs-Editor und die FPS-Anzeige kommen mit der Bühne in M2.
 *
 * Nichts hiervon läuft ohne `?dev=1` — im Produktions-Build ist der ganze Zweig tot.
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

export interface DevPanelOptions {
  /**
   * Baut den aktuellen Screen neu auf.
   *
   * `setBridge` ist kein FSM-Übergang — es ändert den Zustand, ohne dass jemand davon
   * erfährt. Der Absprache-Screen zeichnet seine Brücke beim Mounten; ohne diesen Ruf
   * bliebe die alte Balkenzahl stehen, obwohl das Spiel längst in der Todeszone ist.
   */
  refresh: () => void;
}

export function createDevPanel(fsm: Fsm, options: DevPanelOptions): HTMLElement {
  const el = document.createElement('aside');
  el.className = 'dev-panel';
  el.dataset.dev = 'panel';

  const state = document.createElement('span');
  state.className = 'dev-panel__state';

  const bridge = document.createElement('span');
  bridge.className = 'dev-panel__bridge';

  const deathZone = document.createElement('button');
  deathZone.type = 'button';
  deathZone.className = 'dev-panel__button';
  deathZone.dataset.dev = 'deathzone';
  deathZone.textContent = 'Todeszone';
  deathZone.addEventListener('click', () => {
    forceDeathZone(fsm);
    render();
    options.refresh();
  });

  const render = (): void => {
    state.textContent = fsm.state;
    bridge.textContent = `B=${fsm.context.bridge.count} n=${fsm.context.players.length}`;
    /* Nur da sinnvoll, wo die Runde noch nicht gewählt hat. */
    deathZone.disabled = fsm.state !== 'NEGOTIATION' && fsm.state !== 'SILENCE';
  };

  fsm.subscribe(render);
  render();

  el.append(state, bridge, deathZone);
  return el;
}
