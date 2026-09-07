/**
 * Store und Event-Bus (aus Drinkshot uebernommen, hier mitgetestet).
 */

import { describe, expect, it, vi } from 'vitest';
import { createEventBus, createStore } from '@/core/store';

describe('createStore', () => {
  it('merged flach und meldet nur echte Aenderungen', () => {
    const store = createStore({ a: 1, b: 'x' });
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ a: 2 });
    expect(store.get()).toEqual({ a: 2, b: 'x' });
    expect(listener).toHaveBeenCalledTimes(1);

    store.set({ a: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('nimmt eine Funktion als Patch', () => {
    const store = createStore({ count: 1 });
    store.set((state) => ({ count: state.count + 1 }));
    expect(store.get().count).toBe(2);
  });

  it('ersetzt den ganzen State', () => {
    const store = createStore({ a: 1 });
    const listener = vi.fn();
    store.subscribe(listener);

    const next = { a: 9 };
    store.replace(next);
    expect(store.get()).toBe(next);
    expect(listener).toHaveBeenCalledTimes(1);

    store.replace(next);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('meldet abgeleitete Werte nur bei deren Aenderung', () => {
    const store = createStore({ a: 1, b: 1 });
    const listener = vi.fn();
    const off = store.select((state) => state.a, listener);

    store.set({ b: 2 });
    expect(listener).not.toHaveBeenCalled();

    store.set({ a: 5 });
    expect(listener).toHaveBeenCalledWith(5, 1);

    off();
    store.set({ a: 6 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('meldet Abonnenten wieder ab', () => {
    const store = createStore({ a: 1 });
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.set({ a: 2 });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('createEventBus', () => {
  it('verteilt Events und meldet ab', () => {
    const bus = createEventBus<{ tick: number }>();
    const listener = vi.fn();
    const off = bus.on('tick', listener);

    bus.emit('tick', 1);
    expect(listener).toHaveBeenCalledWith(1);

    off();
    bus.emit('tick', 2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('feuert `once` genau einmal', () => {
    const bus = createEventBus<{ tick: number }>();
    const listener = vi.fn();
    bus.once('tick', listener);

    bus.emit('tick', 1);
    bus.emit('tick', 2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('vertraegt Abmelden waehrend des Emits', () => {
    const bus = createEventBus<{ tick: number }>();
    const second = vi.fn();
    const offSecond = bus.on('tick', second);
    bus.on('tick', () => offSecond());

    expect(() => bus.emit('tick', 1)).not.toThrow();
  });

  it('ignoriert Events ohne Zuhoerer und laesst sich leeren', () => {
    const bus = createEventBus<{ tick: number }>();
    expect(() => bus.emit('tick', 1)).not.toThrow();

    const listener = vi.fn();
    bus.on('tick', listener);
    bus.clear();
    bus.emit('tick', 1);
    expect(listener).not.toHaveBeenCalled();
  });
});
