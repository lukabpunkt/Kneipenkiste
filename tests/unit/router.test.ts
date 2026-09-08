/**
 * Der Router (Architektur §4).
 *
 * Zwei Eigenschaften, die im E2E teuer und hier billig zu prüfen sind: Ein Screen, den
 * die FSM längst verlassen hat, darf nicht mehr mounten — und ein Screen, der beim Bauen
 * scheitert, darf den Router nicht für den Rest der Sitzung stilllegen.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, type ScreenContext, type ScreenId } from '@/ui/router';

/** Der Router reicht den Kontext nur durch; die Test-Screens sehen nicht hinein. */
const CONTEXT = {} as unknown as Omit<ScreenContext, 'router'>;

interface Probe {
  host: HTMLElement;
  mounted: ScreenId[];
  activated: ScreenId[];
}

function createProbe(): Probe {
  return { host: document.createElement('div'), mounted: [], activated: [] };
}

function registerAll(
  router: ReturnType<typeof createRouter>,
  probe: Probe,
  ids: readonly ScreenId[]
): void {
  for (const id of ids) {
    router.register(id, () => {
      probe.mounted.push(id);
      return {
        el: document.createElement('section'),
        activate: () => probe.activated.push(id),
      };
    });
  }
}

describe('Router', () => {
  let probe: Probe;

  beforeEach(() => {
    probe = createProbe();
  });

  it('mountet jeden Zwischenschritt, solange die FSM dort steht', async () => {
    const router = createRouter({ host: probe.host, context: CONTEXT });
    registerAll(router, probe, ['pass', 'choose', 'sealed']);

    /* Ohne `await`: Alle drei landen im selben Tick in der Schlange. */
    void router.go('pass');
    void router.go('choose');
    await router.go('sealed');

    expect(probe.mounted).toEqual(['pass', 'choose', 'sealed']);
    expect(probe.activated).toEqual(['pass', 'choose', 'sealed']);
    expect(router.current).toBe('sealed');
  });

  it('überspringt Ziele, die beim Ausführen veraltet sind', async () => {
    /* Der Sequenz-Preview schickt eine ganze Runde los; die FSM steht dann beim Schritt. */
    const router = createRouter({
      host: probe.host,
      context: CONTEXT,
      outdated: (id) => id !== 'step',
    });
    registerAll(router, probe, ['pass', 'choose', 'sealed', 'step']);

    void router.go('pass');
    void router.go('choose');
    void router.go('sealed');
    await router.go('step');

    expect(probe.mounted).toEqual(['step']);
    expect(router.current).toBe('step');
  });

  it('bleibt benutzbar, wenn ein Screen beim Bauen scheitert', async () => {
    const router = createRouter({ host: probe.host, context: CONTEXT });
    registerAll(router, probe, ['pass', 'result']);
    router.register('choose', () => {
      throw new Error('Choose ohne Spieler.');
    });

    await router.go('pass');
    await expect(router.go('choose')).rejects.toThrow('Choose ohne Spieler.');

    /* Kein liegengebliebener Wipe: Die Farbfläche würde jeden Tap schlucken. */
    expect(probe.host.querySelector('.wipe')).toBeNull();

    /* Die Kette darf nicht im Rejected-Zustand liegen bleiben. */
    await router.go('result');
    expect(router.current).toBe('result');
    expect(probe.mounted).toEqual(['pass', 'result']);
  });

  it('baut den aktuellen Screen bei refresh neu auf', async () => {
    const router = createRouter({ host: probe.host, context: CONTEXT });
    registerAll(router, probe, ['lobby']);

    await router.go('lobby');
    await router.refresh();

    expect(probe.mounted).toEqual(['lobby', 'lobby']);
    expect(probe.activated).toEqual(['lobby', 'lobby']);
  });

  it('räumt den alten Screen ab, bevor der neue kommt', async () => {
    const destroy = vi.fn();
    const router = createRouter({ host: probe.host, context: CONTEXT });
    router.register('title', () => ({ el: document.createElement('section'), destroy }));
    registerAll(router, probe, ['lobby']);

    await router.go('title');
    await router.go('lobby');

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(probe.host.querySelectorAll('[data-screen]')).toHaveLength(1);
  });
});
