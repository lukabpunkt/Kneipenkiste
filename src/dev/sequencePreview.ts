/**
 * Sequenz-Preview (`?dev=1&panel=sequences`, Roadmap M3.3).
 *
 * Jede Inszenierung auf Knopfdruck, ohne eine Runde zu spielen. Eine Sequenz zwölfmal
 * hintereinander zu sehen ist der einzige Weg, ihr Timing zu beurteilen — und beim
 * normalen Spielen bekommt man sie vielleicht jede fünfte Runde.
 *
 * Der Trick: Statt die Sequenz künstlich zu isolieren, wird eine **Runde konstruiert**,
 * die sie auslöst, und dann ganz normal gespielt. Was man sieht, ist damit genau das, was
 * auf der Party passiert — nicht eine Laborfassung davon.
 */

import { DEFAULT_MODES, type GameModeId } from '@/config/rules';
import { MISC_SEQUENCES, OVERLAY_SEQUENCES, SAFE_SEQUENCES } from '@/config/sequences';
import type { Fsm } from '@/core/fsm';
import type { Choice } from '@/core/types';

export interface PreviewScenario {
  id: string;
  label: string;
  /** Wie viele mitspielen. */
  players: number;
  /** Wer wohin tritt — Index = Spieler. */
  picks: (number | 'rope')[];
  modes?: Partial<Record<GameModeId, boolean>>;
  /** Fahnen setzen (nur im Fahne-Modus). */
  flags?: Record<number, number>;
  /** Die Brücke vorher auf so viele Balken bringen (Todeszone). */
  plankCount?: number;
}

/**
 * Für jede gebaute Sequenz eine Runde, die sie garantiert auslöst.
 *
 * Die Fall-Sequenzen aus GDD §4.3 fehlen hier, weil sie noch nicht gebaut sind — bis M4
 * läuft für jeden Bruch `basic_fall`, und den zeigt schon das erste Szenario.
 */
export const PREVIEW_SCENARIOS: PreviewScenario[] = [
  {
    id: 'basic_fall',
    label: 'Sturz zu zweit (basic_fall)',
    players: 4,
    picks: [2, 2, 4, 5],
  },
  {
    id: 'basic_fall_three',
    label: 'Sturz zu dritt',
    players: 5,
    picks: [3, 3, 3, 5, 6],
  },
  ...SAFE_SEQUENCES.map((meta) => ({
    id: meta.id,
    /* Sichere Sequenzen laufen nur, wenn irgendwo etwas kracht — sonst gibt es nichts zu überstehen. */
    label: `Sicher: ${meta.id.replace('safe_', '')}`,
    players: 4,
    picks: [1, 1, 4, 5] as (number | 'rope')[],
  })),
  {
    id: MISC_SEQUENCES.allSafeRot,
    label: 'Alle drüben, ein Balken fault ab',
    players: 4,
    picks: [1, 2, 3, 4],
  },
  {
    id: MISC_SEQUENCES.repairCarpenter,
    label: 'Balthasar repariert',
    players: 4,
    picks: [2, 2, 4, 5],
  },
  {
    id: MISC_SEQUENCES.deathzoneSign,
    label: 'Todeszone-Schild',
    players: 4,
    picks: [1, 1, 2, 3],
    plankCount: 3,
  },
  {
    id: OVERLAY_SEQUENCES.rottenCrack,
    label: 'Morscher Balken',
    players: 4,
    picks: [2, 1, 4, 5],
    modes: { rotten: true },
  },
  {
    id: OVERLAY_SEQUENCES.deserterStamp,
    label: 'Fahnenflucht + Balkendieb',
    players: 4,
    picks: [3, 3, 1, 5],
    modes: { flags: true },
    flags: { 0: 5, 1: 3 },
  },
];

export function isSequencePanel(): boolean {
  return new URLSearchParams(globalThis.location?.search ?? '').get('panel') === 'sequences';
}

/**
 * Spielt ein Szenario: setzt Modi und Brücke, schickt alle durch die Wahl und startet
 * den Schritt. Danach läuft die Show wie immer.
 */
export function runScenario(fsm: Fsm, scenario: PreviewScenario, playerIds: string[]): void {
  fsm.send({ type: 'quit' });
  fsm.send({ type: 'start' });
  fsm.setModes({ ...DEFAULT_MODES, ...scenario.modes });
  fsm.send({ type: 'go' });

  if (scenario.plankCount !== undefined) {
    const planks = fsm.context.bridge.planks.slice(0, scenario.plankCount);
    fsm.setBridge({ count: planks.length, planks, removed: fsm.context.bridge.planks.slice(planks.length) });
  }

  for (const [index, plank] of Object.entries(scenario.flags ?? {})) {
    const playerId = playerIds[Number(index)];
    if (playerId) fsm.raiseFlag(playerId, plank);
  }

  fsm.send({ type: 'ready' });

  for (const pick of scenario.picks) {
    fsm.send({ type: 'tap' });
    const choice: Choice = pick === 'rope' ? { rope: true } : { plank: pick };
    fsm.send({ type: 'seal', choice });
  }

  /* SEALED → STEP: Ab hier rechnet `resolveRound()` und die Show läuft. */
  fsm.send({ type: 'tap' });
}

export function createSequencePanel(fsm: Fsm, playerIds: () => string[]): HTMLElement {
  const el = document.createElement('aside');
  el.className = 'dev-sequences';
  el.dataset.dev = 'sequences';

  const title = document.createElement('h2');
  title.textContent = 'Sequenzen';
  el.append(title);

  for (const scenario of PREVIEW_SCENARIOS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dev-sequences__item';
    button.dataset.scenario = scenario.id;
    button.textContent = scenario.label;
    button.addEventListener('click', () => runScenario(fsm, scenario, playerIds()));
    el.append(button);
  }

  return el;
}
