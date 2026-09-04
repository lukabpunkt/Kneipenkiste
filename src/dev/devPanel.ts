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
import type { Fsm } from '@/core/fsm';

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

  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'dev-panel__btn';
  reveal.textContent = 'reveal';

  let revealed = false;
  reveal.addEventListener('click', () => {
    revealed = !revealed;
    render();
  });

  el.append(line, reveal);

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
