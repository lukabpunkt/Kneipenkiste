/**
 * Router: Fehler-Resilienz und Fokus (Roadmap M5.5, Audit A5).
 *
 * Zwei Dinge, die man erst merkt, wenn sie fehlen:
 *
 * 1. **Ein kaputter Screen darf nicht die Runde mitnehmen.** Wirft eine Screen-Fabrik,
 *    stand vorher ein weisses Bild da — der alte Screen war abgeraeumt, der neue kam
 *    nie. Am Tisch heisst das: Das Handy reagiert mitten in der Runde nicht mehr.
 * 2. **Nach jedem Wechsel gehoert der Fokus dem neuen Screen.** Sonst liegt er im
 *    Nichts, die Tab-Reihenfolge faengt oben an, und ein Screenreader liest gar nichts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFsm } from '@/core/fsm';
import { createSessionStore } from '@/core/session';
import { createRouter, type ScreenFactory } from '@/ui/router';

function harness(): { host: HTMLElement; router: ReturnType<typeof createRouter> } {
  const host = document.createElement('div');
  document.body.append(host);

  const session = createSessionStore(undefined);
  const fsm = createFsm({ players: [...session.state.players], settings: session.state.settings });
  const router = createRouter({ host, context: { fsm, session, dev: false } });
  return { host, router };
}

/** Ein Screen, der einfach nur da ist. */
const plain =
  (label: string): ScreenFactory =>
  () => {
    const el = document.createElement('section');
    el.textContent = label;
    return { el };
  };

describe('Router', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('zeigt den Screen, den er mounten soll', async () => {
    const { host, router } = harness();
    router.register('title', plain('Titel'));

    await router.go('title');

    expect(host.textContent).toContain('Titel');
    expect(router.current).toBe('title');
  });

  it('faengt eine werfende Screen-Fabrik ab, statt weiss zu werden', async () => {
    const { host, router } = harness();
    const boom = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    router.register('title', () => {
      throw new Error('kaputt');
    });

    await expect(router.go('title')).resolves.toBeUndefined();

    const alert = host.querySelector('[role="alert"]');
    expect(alert, 'es gibt eine Ersatzseite').not.toBeNull();
    // Und sie bietet einen Weg zurueck, statt nur zu melden.
    expect(alert?.querySelector('button')).not.toBeNull();
    // Der Screen gilt trotzdem als betreten — sonst haengt die Navigation fest.
    expect(router.current).toBe('title');

    expect(boom).toHaveBeenCalled();
    boom.mockRestore();
  });

  it('setzt den Fokus auf den neuen Screen (Audit A5)', async () => {
    const { host, router } = harness();
    router.register('title', plain('Titel'));

    await router.go('title');

    const screen = host.firstElementChild as HTMLElement;
    expect(document.activeElement).toBe(screen);
  });

  it('meldet jeden Wechsel — daran haengt der Soundtrack', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const session = createSessionStore(undefined);
    const fsm = createFsm({ players: [...session.state.players], settings: session.state.settings });

    const seen: string[] = [];
    const router = createRouter({
      host,
      context: { fsm, session, dev: false },
      onNavigate: (id) => seen.push(id),
    });
    router.register('title', plain('Titel'));
    router.register('lobby', plain('Lobby'));

    await router.go('title');
    await router.go('lobby');

    expect(seen).toEqual(['title', 'lobby']);
  });

  it('raeumt den alten Screen ab, bevor der neue kommt', async () => {
    const { router } = harness();
    const destroy = vi.fn();

    router.register('title', () => ({ el: document.createElement('section'), destroy }));
    router.register('lobby', plain('Lobby'));

    await router.go('title');
    await router.go('lobby');

    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
