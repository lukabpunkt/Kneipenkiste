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
import { FALL_SEQUENCES, MISC_SEQUENCES, OVERLAY_SEQUENCES, SAFE_SEQUENCES } from '@/config/sequences';
import type { SequencePicker } from '@/core/choreographer';
import type { Fsm } from '@/core/fsm';
import type { Choice } from '@/core/types';

export interface PreviewScenario {
  id: string;
  label: string;
  /** Wie viele mindestens mitspielen müssen, damit das Szenario aufgeht. */
  players: number;
  /**
   * Wer wohin tritt — Index = Spieler.
   *
   * Die Liste beschreibt nur den **interessanten Teil**: die Gruppe, die stürzen soll.
   * Wer in der Lobby darüber hinaus dabei ist, bekommt einen eigenen freien Balken
   * (`fullPicks`). Sonst müsste man vor jedem Preview die Spielerzahl anpassen.
   */
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
 * Bei den Fall-Sequenzen ist "garantiert" eine Näherung: Welche von ihnen läuft, wählt
 * der Choreographer gewichtet und mit No-Repeat. Das Szenario stellt sicher, dass eine
 * Gruppe der **richtigen Grösse** stürzt — `fall_domino` braucht drei, der Rest zwei —,
 * und wer eine bestimmte sehen will, drückt ein paar Mal.
 */
export const PREVIEW_SCENARIOS: PreviewScenario[] = [
  {
    id: 'basic_fall',
    label: 'Sturz zu zweit',
    players: 4,
    picks: [2, 2, 4, 5],
  },
  {
    id: 'basic_fall_three',
    label: 'Sturz zu dritt (auch fall_domino)',
    players: 5,
    picks: [3, 3, 3, 5, 6],
  },
  ...FALL_SEQUENCES.map((meta) => ({
    id: meta.id,
    label: `Sturz: ${meta.id.replace('fall_', '')}`,
    players: (meta.minGroup ?? 2) + 2,
    /* Genau so viele auf einen Balken, wie die Sequenz mindestens braucht. */
    picks: [
      ...Array.from({ length: meta.minGroup ?? 2 }, () => 3),
      ...Array.from({ length: 2 }, (_, i) => 5 + i),
    ] as (number | 'rope')[],
  })),
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

/**
 * Welche Fall-Sequenz der Preview erzwingt — `null`, wenn der Choreographer wählen soll.
 *
 * Ohne das zeigt ein Knopf mit der Aufschrift "Sturz: seesaw" irgendeinen Sturz: Die
 * Auswahl läuft gewichtet und mit No-Repeat, und ein Szenario kann nur die **Grösse** der
 * Gruppe festlegen. Für einen Preview ist das wertlos — man will die eine sehen.
 *
 * Gilt nur im Dev-Modus. Im Spiel wählt immer der Choreographer.
 */
let forcedFall: string | null = null;

export function forcedFallId(): string | null {
  return forcedFall;
}

export function setForcedFall(id: string | null): void {
  forcedFall = id;
}

/**
 * Ein Picker, der die erzwungene Sequenz zurückgibt und sonst den echten fragt.
 *
 * `minGroup` wird respektiert: `fall_domino` bei einem Paar zu erzwingen ergäbe eine
 * Sequenz, die mit zwei Leuten nichts anzufangen weiss.
 */
export function withForcedFall(picker: SequencePicker): SequencePicker {
  return {
    pickFall(groupSize) {
      if (forcedFall) {
        const meta = FALL_SEQUENCES.find((entry) => entry.id === forcedFall);
        if (meta && groupSize >= (meta.minGroup ?? 2)) return meta.id;
      }
      return picker.pickFall(groupSize);
    },
    pickSafe: () => picker.pickSafe(),
  };
}

export function isSequencePanel(): boolean {
  return new URLSearchParams(globalThis.location?.search ?? '').get('panel') === 'sequences';
}

/**
 * Füllt die Wahl auf die tatsächliche Spielerzahl auf.
 *
 * Jeder Zusätzliche bekommt einen Balken, auf dem sonst niemand steht — er soll die
 * Sequenz nicht stören, sondern nur dabei sein. Reichen die freien Balken nicht, stellt
 * er sich zu jemandem: In der Todeszone ist das ohnehin unvermeidlich.
 */
export function fullPicks(
  scenario: PreviewScenario,
  playerCount: number,
  planks: readonly number[]
): (number | 'rope')[] {
  const picks = scenario.picks.slice(0, playerCount);
  const used = new Set(picks.filter((pick): pick is number => pick !== 'rope'));

  for (let i = picks.length; i < playerCount; i += 1) {
    const free = planks.find((plank) => !used.has(plank));
    const chosen = free ?? planks[planks.length - 1] ?? 1;
    used.add(chosen);
    picks.push(chosen);
  }
  return picks;
}

/**
 * Spielt ein Szenario: setzt Modi und Brücke, schickt alle durch die Wahl und startet
 * den Schritt. Danach läuft die Show wie immer.
 */
export function runScenario(fsm: Fsm, scenario: PreviewScenario, playerIds: string[]): void {
  /* Nur Fall-Sequenzen lassen sich erzwingen — der Rest hängt am Rundenausgang. */
  setForcedFall(scenario.id.startsWith('fall_') ? scenario.id : null);

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

  /* Auf die Spielerzahl der Lobby auffüllen — sonst bleibt die Runde in CHOOSE stehen. */
  const picks = fullPicks(scenario, fsm.context.players.length, fsm.context.bridge.planks);

  for (const pick of picks) {
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
  el.dataset.open = 'true';

  /*
   * Die Liste klappt weg, sobald eine Sequenz läuft. Sonst verdeckt sie genau die Hälfte
   * der Bühne, die man ansehen wollte — beim ersten Versuch fiel der ganze Sturz dahinter.
   */
  const title = document.createElement('button');
  title.type = 'button';
  title.className = 'dev-sequences__toggle';
  title.textContent = 'Sequenzen';
  title.addEventListener('click', () => {
    el.dataset.open = el.dataset.open === 'true' ? 'false' : 'true';
  });
  el.append(title);

  const list = document.createElement('div');
  list.className = 'dev-sequences__list';

  for (const scenario of PREVIEW_SCENARIOS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dev-sequences__item';
    button.dataset.scenario = scenario.id;
    button.textContent = scenario.label;
    button.addEventListener('click', () => {
      el.dataset.open = 'false';
      runScenario(fsm, scenario, playerIds());
    });
    list.append(button);
  }

  el.append(list);
  return el;
}
