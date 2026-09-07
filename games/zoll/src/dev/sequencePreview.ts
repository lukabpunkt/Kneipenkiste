/**
 * Sequenz-Preview (`?dev=1&panel=sequences`, Roadmap M3.1).
 *
 * Jede Sequenz auf Knopfdruck, auf der echten Bühne, mit echten Assets. Ein Unit-Test
 * kann prüfen, dass eine Timeline existiert und wie lange sie dauert — ob sie **gut
 * aussieht**, sieht man nur, wenn man sie sich ansieht, und zwar oft.
 *
 * Deshalb liegt die Preview nicht hinter einem Build-Flag, sondern hinter einer URL: Sie
 * muss auf dem Handy erreichbar sein, auf dem das Spiel später läuft.
 */

import { HINT_TYPES, type HintType } from '@/config/rules';
import type { Stage } from '@/game/stage';
import type { PlayerId } from '@/core/types';

export function isSequencePanel(search = globalThis.location?.search ?? ''): boolean {
  return new URLSearchParams(search).get('panel') === 'sequences';
}

export interface SequencePreview {
  el: HTMLElement;
  destroy(): void;
}

/**
 * Baut die Preview für eine laufende Bühne.
 *
 * Sie spielt auf dem **ersten** Koffer — welcher, ist für die Beurteilung egal, und ein
 * fester macht zwei Läufe vergleichbar.
 */
export function createSequencePreview(stage: Stage, itemSet: Parameters<Stage['gate']['play']>[1]): SequencePreview {
  const el = document.createElement('aside');
  el.className = 'seq-preview';
  el.setAttribute('aria-label', 'Sequenz-Preview');

  const target = (): PlayerId | undefined => stage.view.suitcaseIds()[0];

  const button = (label: string, run: () => void): HTMLButtonElement => {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'seq-preview__btn';
    node.textContent = label;
    node.addEventListener('click', run);
    return node;
  };

  const hints = document.createElement('div');
  hints.className = 'seq-preview__row';
  for (const type of HINT_TYPES) {
    hints.append(
      button(type, () => {
        const id = target();
        if (!id) return;
        void stage.hints.play([{ type: type as HintType, suitcaseOf: id }], itemSet, () => undefined);
      })
    );
  }

  const gates = document.createElement('div');
  gates.className = 'seq-preview__row';
  for (const kind of ['ok', 'smuggler'] as const) {
    gates.append(
      button(`gate:${kind}`, () => {
        const id = target();
        if (!id) return;
        void stage.gate.play(
          { suitcaseOf: id, kind, amount: kind === 'smuggler' ? 4 : 0, sequenceId: 'preview' },
          itemSet,
          () => undefined
        );
      })
    );
  }

  /*
   * Die Röntgen-Sequenzen. Sie spielen ohne Scan davor — hier geht es um die Sequenz
   * selbst, nicht um den Bildaufbau. Der ist im Spiel und im A4-Test gedeckt.
   */
  const xray = document.createElement('div');
  xray.className = 'seq-preview__row';
  for (const kind of ['xrayCaught', 'xrayClean', 'xrayOverlay'] as const) {
    for (const sequence of stage.registry.all(kind)) {
      xray.append(
        button(sequence.id.replace(/^(caught|clean|diplomat)_?/, ''), () => {
          const id = target();
          if (!id) return;
          stage.view.reset();
          const ctx = stage.view.sequenceContext(id, itemSet, 4, stage.rng);
          if (ctx) sequence.build(ctx);
        })
      );
    }
  }

  const others = document.createElement('div');
  others.className = 'seq-preview__row';
  others.append(
    button('dog:bark', () => {
      const id = target();
      if (id) void stage.hints.dogHint(id, true);
    }),
    button('dog:quiet', () => {
      const id = target();
      if (id) void stage.hints.dogHint(id, false);
    }),
    button('bribe', () => {
      const id = target();
      if (id) void stage.bribe.offer(id, 2, 'Preview');
    }),
    button('bribe:ok', () => {
      const id = target();
      if (id) void stage.bribe.accept(id, 2);
    })
  );

  el.append(hints, xray, gates, others);

  return {
    el,
    destroy: () => el.remove(),
  };
}
