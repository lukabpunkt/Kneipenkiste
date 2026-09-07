/**
 * Die Komponenten, an denen Regeln hängen (Audit A1).
 *
 * Getestet wird nicht das Aussehen, sondern das, was das Spiel kaputtmachen würde: dass
 * Touch-Ziele groß genug sind, dass eine Lücke an ihrer Nummer bleibt, dass niemand an
 * sich selbst verteilt und dass die Fahne neben der Wahl steht, nicht auf ihr.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBridgeTop } from '@/ui/components/bridgeTop';
import { createQuickDistribute } from '@/ui/components/quickDistribute';
import { createWeightStepper } from '@/ui/components/weightStepper';
import { createFlagRow } from '@/ui/components/flagRow';
import { createTokenStack } from '@/ui/components/tokenStack';
import { LAYOUT, plankHeightFor } from '@/config/theme';
import { MAX_PLAYERS, MIN_PLAYERS, initialPlankCount } from '@/config/rules';
import { setLocale } from '@/core/i18n';
import type { PlankModel } from '@/ui/components/bridgeTop';

beforeEach(() => setLocale('de'));

const plank = (id: number, state: PlankModel['state'] = 'normal'): PlankModel => ({ id, state });

describe('BridgeTop', () => {
  it('gibt jedem Balken ein Touch-Ziel über dem Minimum (CLAUDE.md)', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      const count = initialPlankCount(n);
      const height = plankHeightFor(count);

      /* Bis 8 Balken die volle Höhe, ab 9 die enge Variante — nie darunter. */
      expect(height).toBeGreaterThanOrEqual(LAYOUT.plankMinHeightTightPx);
      if (count < LAYOUT.plankTightThreshold) expect(height).toBe(LAYOUT.plankMinHeightPx);

      const el = createBridgeTop({ planks: Array.from({ length: count }, (_, i) => plank(i + 1)) });
      expect(el.style.getPropertyValue('--plank-height')).toBe(`${height}px`);
    }
  });

  it('macht nur bedienbare Balken zu Buttons', () => {
    const passive = createBridgeTop({ planks: [plank(1), plank(2)] });
    expect(passive.querySelectorAll('button')).toHaveLength(0);

    const active = createBridgeTop({
      planks: [{ ...plank(1), onSelect: () => undefined }, plank(2)],
    });
    expect(active.querySelectorAll('button')).toHaveLength(1);
  });

  it('darf im Anzeige-Modus flacher sein — dort gibt es nichts zu tippen', () => {
    const display = createBridgeTop({ planks: [plank(1)], display: true });
    expect(display.style.getPropertyValue('--plank-height')).toBe(`${LAYOUT.plankDisplayHeightPx}px`);
  });

  it('lässt die Lücke an ihrer Nummer stehen', () => {
    const el = createBridgeTop({ planks: [plank(1), plank(3), plank(5)], removed: [2, 4] });

    const rows = [...el.querySelectorAll('.plank')].map((node) =>
      node.classList.contains('plank--removed') ? 'lücke' : (node as HTMLElement).dataset.plank
    );
    /* Sonst rutschen die Nummern zusammen und "Balken 4 ist abgefault" ergibt keinen Sinn. */
    expect(rows).toEqual(['1', 'lücke', '3', 'lücke', '5']);
  });

  it('nennt den abgefaulten Balken beim Namen', () => {
    const el = createBridgeTop({ planks: [plank(1)], removed: [2] });
    expect(el.querySelector('.plank__rot-sign')?.textContent).toBe('Balken 2 ist abgefault');
  });

  it('zeigt Fahnen als Umriss neben den Köpfen, nicht als Kopf', () => {
    const el = createBridgeTop({
      planks: [
        {
          ...plank(3, 'resultCollision'),
          markers: [
            { playerId: 'p1', colorId: 'red' },
            { playerId: 'p2', colorId: 'blue', flag: true },
          ],
        },
      ],
    });

    expect(el.querySelectorAll('.plank__hiker')).toHaveLength(1);
    expect(el.querySelectorAll('.plank__flag')).toHaveLength(1);
  });

  it('beschreibt jeden Zustand für Screenreader', () => {
    const el = createBridgeTop({
      planks: [plank(1, 'resultCollision'), plank(2, 'resultRotten'), plank(3, 'resultSafe'), plank(4)],
    });

    const labels = [...el.querySelectorAll('.plank')].map((n) => n.getAttribute('aria-label'));
    expect(labels[0]).toContain('Es kracht');
    expect(labels[1]).toContain('Pech');
    expect(labels[2]).toContain('Verteilt');
    expect(labels[3]).toBe('Balken 4');
  });
});

describe('QuickDistribute (ADR-5)', () => {
  const players = [
    { id: 'p1', name: 'Rudi', colorId: 'red' as const },
    { id: 'p2', name: 'Blue', colorId: 'blue' as const },
    { id: 'p3', name: 'Gustav', colorId: 'green' as const },
  ];

  it('lässt niemanden an sich selbst verteilen (Audit A1)', () => {
    const { el } = createQuickDistribute({
      givers: [{ ...players[2]!, sips: 1 }],
      players,
      onComplete: () => undefined,
    });

    const disabled = [...el.querySelectorAll<HTMLButtonElement>('.quick__target')].filter((b) => b.disabled);
    expect(disabled).toHaveLength(1);
    expect(disabled[0]!.textContent).toContain('Gustav');
  });

  it('sammelt eine Zeile pro Verteiler und meldet die Summe', () => {
    const onComplete = vi.fn();
    const { el } = createQuickDistribute({
      givers: [
        { ...players[1]!, sips: 1 },
        { ...players[2]!, sips: 1 },
      ],
      players,
      onComplete,
    });

    const pick = (name: string): void => {
      const button = [...el.querySelectorAll<HTMLButtonElement>('.quick__target')].find(
        (b) => b.textContent?.includes(name) && !b.disabled
      );
      button!.click();
    };

    pick('Rudi');
    expect(onComplete).not.toHaveBeenCalled();
    pick('Rudi');

    expect(onComplete).toHaveBeenCalledWith([
      { from: 'p2', to: 'p1', sips: 1 },
      { from: 'p3', to: 'p1', sips: 1 },
    ]);
  });

  it('markiert, wer gerade dran ist', () => {
    const { el } = createQuickDistribute({
      givers: [
        { ...players[0]!, sips: 1 },
        { ...players[1]!, sips: 1 },
      ],
      players,
      onComplete: () => undefined,
    });

    const states = [...el.querySelectorAll<HTMLElement>('.quick__giver')].map((n) => n.dataset.state);
    expect(states).toEqual(['active', 'waiting']);
  });
});

describe('WeightStepper', () => {
  it('zeigt beide Seiten der Wette', () => {
    const stepper = createWeightStepper({ value: 1, givingPerWeight: 2, onChange: () => undefined });

    /* Todeszone: verteilt 2 × Gewicht, stürzt mit Gewicht × Personen. */
    expect(stepper.el.querySelector('.weight__risk')?.textContent).toContain('2');

    stepper.el.querySelector<HTMLButtonElement>('.weight__step[data-weight="3"]')!.click();
    expect(stepper.value()).toBe(3);
    expect(stepper.el.querySelector('.weight__risk')?.textContent).toContain('6');
  });

  it('meldet jede Änderung genau einmal', () => {
    const onChange = vi.fn();
    const stepper = createWeightStepper({ value: 1, givingPerWeight: 1, onChange });

    stepper.el.querySelector<HTMLButtonElement>('.weight__step[data-weight="2"]')!.click();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('FlagRow', () => {
  it('setzt eine Fahne und holt sie beim zweiten Tap wieder ein', () => {
    const onFlag = vi.fn();
    const el = createFlagRow({
      players: [{ id: 'p1', name: 'Rudi', colorId: 'red', flag: 3 }],
      planks: [1, 2, 3],
      onFlag,
    });

    el.querySelector<HTMLButtonElement>('.flag-row__plank[data-plank="2"]')!.click();
    expect(onFlag).toHaveBeenCalledWith('p1', 2);

    /* Nochmal auf die eigene Fahne: einholen. Man darf es sich überlegen, solange geredet wird. */
    el.querySelector<HTMLButtonElement>('.flag-row__plank[data-plank="3"]')!.click();
    expect(onFlag).toHaveBeenCalledWith('p1', null);
  });
});

describe('TokenStack', () => {
  it('zeigt Becher, bis Zählen schneller als Sehen wäre', () => {
    expect(createTokenStack({ count: 3 }).querySelectorAll('.tokens__cup')).toHaveLength(3);

    const many = createTokenStack({ count: 9 });
    expect(many.querySelectorAll('.tokens__cup')).toHaveLength(5);
    expect(many.querySelector('.tokens__count')?.textContent).toBe('×9');
  });

  it('bleibt für Screenreader eine Zahl mit Einheit', () => {
    expect(createTokenStack({ count: 1 }).getAttribute('aria-label')).toBe('1 Schluck');
    expect(createTokenStack({ count: 4 }).getAttribute('aria-label')).toBe('4 Schlücke');
  });
});
