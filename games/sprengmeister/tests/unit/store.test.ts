/**
 * Store und Event-Bus (Roadmap M0.3).
 * Klein, aber der Zustand aller Screens haengt daran.
 */

import { describe, expect, it, vi } from 'vitest';
import { createEventBus, createStore } from '@/core/store';

interface State {
  count: number;
  name: string;
}

const initial: State = { count: 0, name: 'Anna' };

describe('createStore', () => {
  it('liefert den aktuellen Zustand', () => {
    expect(createStore(initial).get()).toEqual(initial);
  });

  it('merged flach und benachrichtigt mit altem und neuem Zustand', () => {
    const store = createStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ count: 1 });

    expect(store.get()).toEqual({ count: 1, name: 'Anna' });
    expect(listener).toHaveBeenCalledWith({ count: 1, name: 'Anna' }, initial);
  });

  it('schweigt, wenn sich nichts geaendert hat', () => {
    const store = createStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ count: 0 });
    store.set({});

    expect(listener).not.toHaveBeenCalled();
  });

  it('nimmt auch eine Funktion als Patch', () => {
    const store = createStore(initial);
    store.set((state) => ({ count: state.count + 5 }));
    expect(store.get().count).toBe(5);
  });

  it('ersetzt den kompletten Zustand (Hydration)', () => {
    const store = createStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);

    const next: State = { count: 9, name: 'Rudi' };
    store.replace(next);

    expect(store.get()).toBe(next);
    expect(listener).toHaveBeenCalledTimes(1);

    // Dasselbe Objekt noch einmal loest nichts aus.
    store.replace(next);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('meldet Abonnenten wieder ab', () => {
    const store = createStore(initial);
    const listener = vi.fn();
    const off = store.subscribe(listener);

    off();
    store.set({ count: 3 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('feuert `select` nur, wenn sich der abgeleitete Wert aendert', () => {
    const store = createStore(initial);
    const listener = vi.fn();
    const off = store.select((state) => state.count, listener);

    store.set({ name: 'Rudi' });
    expect(listener).not.toHaveBeenCalled();

    store.set({ count: 2 });
    expect(listener).toHaveBeenCalledWith(2, 0);

    off();
    store.set({ count: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('createEventBus', () => {
  interface Events {
    digShown: { cell: number };
    roundOver: void;
  }

  it('ruft Handler mit ihrem Payload auf', () => {
    const bus = createEventBus<Events>();
    const handler = vi.fn();
    bus.on('digShown', handler);

    bus.emit('digShown', { cell: 7 });
    expect(handler).toHaveBeenCalledWith({ cell: 7 });
  });

  it('ignoriert Events ohne Zuhoerer', () => {
    expect(() => createEventBus<Events>().emit('roundOver', undefined)).not.toThrow();
  });

  it('meldet Handler wieder ab', () => {
    const bus = createEventBus<Events>();
    const handler = vi.fn();
    const off = bus.on('digShown', handler);

    off();
    bus.emit('digShown', { cell: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('ruft `once`-Handler genau einmal', () => {
    const bus = createEventBus<Events>();
    const handler = vi.fn();
    bus.once('digShown', handler);

    bus.emit('digShown', { cell: 1 });
    bus.emit('digShown', { cell: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('laesst Handler sich waehrend des Emits abmelden', () => {
    const bus = createEventBus<Events>();
    const second = vi.fn();

    const offFirst = bus.on('digShown', () => offFirst());
    bus.on('digShown', second);

    expect(() => bus.emit('digShown', { cell: 1 })).not.toThrow();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('raeumt alle Handler ab', () => {
    const bus = createEventBus<Events>();
    const handler = vi.fn();
    bus.on('digShown', handler);

    bus.clear();
    bus.emit('digShown', { cell: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('haelt mehrere Handler auf demselben Event', () => {
    const bus = createEventBus<Events>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('digShown', a);
    bus.on('digShown', b);

    bus.emit('digShown', { cell: 4 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
