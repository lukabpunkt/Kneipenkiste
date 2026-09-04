/**
 * Dev-Panel (`?dev=1`, Architektur §8).
 *
 * Vier Dinge, die man beim Bauen dieses Spiels ständig braucht:
 *
 * - **FPS und Draw-Calls.** Audit A2 verlangt p50 ≤ 16,7 ms und höchstens 3 Batches;
 *   ohne Anzeige merkt man eine Regression erst im Perf-Test.
 * - **Reveal mines.** Der einzige erlaubte Blick auf das private Board — und er läuft
 *   über `debugRevealAll()`, das absichtlich so heißt, dass es in einem Diff auffällt.
 * - **Seed.** Damit ein Fehler zweimal passiert.
 * - **Spielerzahl.** 8 Diggers auf 6 × 6 ist der Fall, der weh tut.
 *
 * Das Panel existiert nur, wenn `?dev=1` gesetzt ist — im normalen Spiel wird es nie
 * gebaut, und `Reveal mines` ist damit nicht erreichbar.
 */

import type { Fsm } from '@/core/fsm';
import type { BoardStage } from '@/game/BoardStage';

export interface DevPanel {
  el: HTMLElement;
  start(): void;
  stop(): void;
}

/** Ist der Dev-Modus aktiv? */
export function devMode(search = globalThis.location?.search ?? ''): boolean {
  return new URLSearchParams(search).has('dev');
}

/**
 * Median einer Messreihe. Bewusst hier statt aus `BoardApp` importiert: Das Panel soll
 * den Board-Chunk nicht in den Einstiegs-Chunk ziehen (Architektur §1).
 */
function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

export function createDevPanel(fsm: Fsm, stageOf: () => BoardStage | undefined): DevPanel {
  const el = document.createElement('aside');
  el.className = 'dev-panel';
  el.setAttribute('aria-hidden', 'true');

  const stats = document.createElement('pre');
  stats.className = 'dev-panel__stats';

  const actions = document.createElement('div');
  actions.className = 'dev-panel__actions';

  const revealButton = document.createElement('button');
  revealButton.type = 'button';
  revealButton.textContent = 'Reveal';
  revealButton.addEventListener('click', () => toggleReveal());

  const seedLabel = document.createElement('span');

  actions.append(revealButton, seedLabel);
  el.append(stats, actions);

  let timer: ReturnType<typeof setInterval> | undefined;
  let revealed = false;

  /**
   * Zeigt das private Board — **nur hier**, und nur im Dev-Modus. Der Rest des Spiels
   * kommt an diese Daten nicht heran (ADR-2).
   */
  function toggleReveal(): void {
    const stage = stageOf();
    if (!stage) return;

    revealed = !revealed;
    revealButton.textContent = revealed ? 'Hide' : 'Reveal';
    if (revealed) stage.renderReplay(fsm.replay());
    else stage.renderPublic(fsm.view());
  }

  function render(): void {
    const stage = stageOf();
    const frames = stage?.stats().frameTimes ?? [];
    const p50 = median([...frames]);
    const fps = p50 > 0 ? 1000 / p50 : 0;

    stats.textContent = [
      `p50   ${p50.toFixed(1)} ms  (${fps.toFixed(0)} fps)`,
      `draws ${stage?.stats().drawCalls ?? 0}`,
      `state ${fsm.state}`,
      `seed  ${fsm.context.seed}`,
      `round ${fsm.context.roundIndex} · ${fsm.context.players.length} Spieler`,
    ].join('\n');
    seedLabel.textContent = `?seed=${fsm.context.seed}`;
  }

  return {
    el,
    start() {
      render();
      timer = globalThis.setInterval(render, 500);
    },
    stop() {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    },
  };
}
