/**
 * Dev-Panel (`?dev=1`, Architektur §8).
 *
 * M1 kann: Seed anzeigen, Packs aufdecken, Spielstand ueberspringen. Die Sequenz-Preview
 * und "Simulate 10 000 rounds" kommen mit den Sequenzen in M3/M4.
 *
 * Das Panel deckt auf Knopfdruck die geheimen Rundendaten auf — genau deshalb liegt es
 * **nicht** unter `src/ui/`: Dort greift der Lint-Test des Standing Audits, und der soll
 * streng bleiben. Ein Screen darf das nie, ein Debug-Werkzeug hinter `?dev=1` schon.
 */

import { amountOf, smugglerIds } from '@/core/round';
import { createSeed, createSeededRng } from '@/core/rng';
import type { Fsm } from '@/core/fsm';

/**
 * Simuliert 10 000 Runden mit den Einstellungen der laufenden Partie.
 *
 * Der Vergleich „Raten gegen Hinweise" steht ganz oben: An ihm haengt Design-Pfeiler 2.
 * Faellt der Vorsprung auf null, sind die Hinweise Dekoration — und das sieht man hier,
 * ohne acht Runden am Tisch zu spielen.
 */
async function runSimulation(fsm: Fsm, out: HTMLElement): Promise<void> {
  const { defaultConfig, simulate: run } = await import('@/core/simulate');

  const playerCount = Math.max(4, fsm.context.players.length);
  const modes = fsm.context.modes;
  const seed = createSeed();

  const base = { rounds: 10_000, playerCount, modes };
  const guided = run(defaultConfig({ ...base, officer: 'hints', ignoreHint: 0 }), createSeededRng(seed));
  const blind = run(defaultConfig({ ...base, officer: 'random' }), createSeededRng(seed));

  const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

  out.textContent = [
    `10k Runden, ${playerCount} Spieler`,
    `fang-anteil  ${pct(guided.roundsWithCatch)}  (ziel 40-70)`,
    `belaestigung ${pct(guided.harassmentRounds)}  (ziel <=30)`,
    `truthful     ${pct(guided.truthfulHints)}`,
    `quote raten  ${pct(blind.hitRate)}`,
    `quote hinweis ${pct(guided.hitRate)}`,
    `vorsprung    ${((guided.hitRate - blind.hitRate) * 100).toFixed(1)} punkte`,
    `durch/runde  ${guided.smuggledThrough.toFixed(2)}`,
    `schluecke    ${guided.sipsTravelers.toFixed(1)} / ${guided.sipsOfficer.toFixed(1)}`,
  ].join('\n');
}

export function isDevMode(search = globalThis.location?.search ?? ''): boolean {
  return new URLSearchParams(search).get('dev') === '1';
}

/**
 * `?dev=1&seed=123` macht eine Runde reproduzierbar (Roadmap M1.7).
 *
 * Nur im Dev-Build: Produktiv wuerfeln Hinweise, Diplomat und Item-Set ueber `crypto`,
 * und daran darf eine URL nichts aendern koennen (CLAUDE.md).
 */
export function devSeed(search = globalThis.location?.search ?? ''): number | null {
  if (!isDevMode(search)) return null;
  const raw = new URLSearchParams(search).get('seed');
  if (raw === null) return null;
  const seed = Number(raw);
  return Number.isInteger(seed) && seed >= 0 ? seed : null;
}

export function createDevPanel(fsm: Fsm): HTMLElement {
  const el = document.createElement('aside');
  el.className = 'dev-panel';
  el.setAttribute('aria-label', 'Dev');

  const line = document.createElement('pre');
  line.className = 'dev-panel__line';
  /*
   * Stabiler Testanker. Klasse allein reicht nicht mehr: Seit der Simulation stehen zwei
   * Buttons und zwei Zeilen im Panel, und ein Selektor auf die Klasse traefe beide.
   */
  line.dataset.dev = 'state';

  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'dev-panel__btn';
  reveal.dataset.dev = 'reveal';
  reveal.textContent = 'reveal';

  let revealed = false;
  reveal.addEventListener('click', () => {
    revealed = !revealed;
    render();
  });

  /*
   * "Simuliere 10 000 Runden" (Architektur §8). Sie laeuft synchron und blockiert kurz —
   * das ist im Dev-Panel in Ordnung und ehrlicher als ein Fortschrittsbalken, der so tut,
   * als koennte man nebenher weiterspielen.
   */
  const simulate = document.createElement('button');
  simulate.type = 'button';
  simulate.className = 'dev-panel__btn';
  simulate.dataset.dev = 'simulate';
  simulate.textContent = 'simulate 10k';

  const simOut = document.createElement('pre');
  simOut.className = 'dev-panel__line';
  simOut.dataset.dev = 'simulation';

  simulate.addEventListener('click', () => {
    simOut.textContent = 'rechne …';
    /* Einen Frame Luft, damit "rechne …" wirklich erscheint. */
    globalThis.setTimeout(() => void runSimulation(fsm, simOut), 16);
  });

  el.append(line, reveal, simulate, simOut);

  function render(): void {
    const round = fsm.context.round;
    if (!round) {
      line.textContent = `${fsm.state}`;
      return;
    }

    const rows = [
      `${fsm.state} · round ${round.index + 1} · seed ${round.seed}`,
      `k=${round.maxOpenings} hints=${round.hints.length} set=${round.itemSet}`,
    ];

    if (revealed) {
      rows.push(
        ...round.travelerIds.map((id) => `  ${id}: ${amountOf(round, id)}`),
        `  smugglers: ${smugglerIds(round).join(',') || '—'}`,
        `  diplomat: ${round.diplomatId ?? '—'}`,
        ...round.hints.map((h) => `  hint ${h.type}@${h.suitcaseOf} ${h.truthful ? 'TRUE' : 'lie'}`)
      );
    }

    line.textContent = rows.join('\n');
  }

  fsm.subscribe(render);
  render();
  return el;
}
