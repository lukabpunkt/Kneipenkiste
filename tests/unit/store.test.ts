/**
 * Store und Event-Bus (Architektur §1) — aus Drinkshot uebernommen, hier mitgetestet.
 */

import { describe, expect, it, vi } from 'vitest';
import { createEventBus, createStore } from '@/core/store';

describe('createStore', () => {
  it('merged flach und meldet nur echte Aenderungen', () => {
    const store = createStore({ a: 1, b: 2 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ a: 1 });
    expect(listener).not.toHaveBeenCalled();

    store.set({ a: 3 });
    expect(store.get()).toEqual({ a: 3, b: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('nimmt eine Funktion als Patch', () => {
    const store = createStore({ n: 1 });
    store.set((state) => ({ n: state.n + 1 }));
    expect(store.get().n).toBe(2);
  });

  it('replace tauscht den ganzen State', () => {
    const store = createStore({ n: 1 });
    const listener = vi.fn();
    store.subscribe(listener);

    const next = { n: 9 };
    store.replace(next);
    expect(store.get()).toBe(next);
    expect(listener).toHaveBeenCalledTimes(1);

    store.replace(next);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('meldet Abonnenten wieder ab', () => {
    const store = createStore({ n: 1 });
    const listener = vi.fn();
    store.subscribe(listener)();
    store.set({ n: 2 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('select feuert nur bei Aenderung des abgeleiteten Werts', () => {
    const store = createStore({ a: 1, b: 1 });
    const listener = vi.fn();
    const off = store.select((s) => s.a, listener);

    store.set({ b: 2 });
    expect(listener).not.toHaveBeenCalled();

    store.set({ a: 2 });
    expect(listener).toHaveBeenCalledWith(2, 1);

    off();
    store.set({ a: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('createEventBus', () => {
  interface Events {
    showFinished: { roundIndex: number };
    ping: void;
  }

  it('ruft Handler mit der Nutzlast', () => {
    const bus = createEventBus<Events>();
    const handler = vi.fn();
    bus.on('showFinished', handler);
    bus.emit('showFinished', { roundIndex: 2 });
    expect(handler).toHaveBeenCalledWith({ roundIndex: 2 });
  });

  it('ignoriert Events ohne Handler', () => {
    const bus = createEventBus<Events>();
    expect(() => bus.emit('ping', undefined)).not.toThrow();
  });

  it('meldet ab', () => {
    const bus = createEventBus<Events>();
    const handler = vi.fn();
    bus.on('ping', handler)();
    bus.emit('ping', undefined);
    expect(handler).not.toHaveBeenCalled();
  });

  it('once feuert genau einmal', () => {
    const bus = createEventBus<Events>();
    const handler = vi.fn();
    bus.once('ping', handler);
    bus.emit('ping', undefined);
    bus.emit('ping', undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once laesst sich vorher abbestellen', () => {
    const bus = createEventBus<Events>();
    const handler = vi.fn();
    bus.once('ping', handler)();
    bus.emit('ping', undefined);
    expect(handler).not.toHaveBeenCalled();
  });

  it('erlaubt Abmelden waehrend des Emits', () => {
    const bus = createEventBus<Events>();
    const second = vi.fn();
    const off = bus.on('ping', () => off());
    bus.on('ping', second);
    expect(() => bus.emit('ping', undefined)).not.toThrow();
    expect(second).toHaveBeenCalled();
  });

  it('clear entfernt alles', () => {
    const bus = createEventBus<Events>();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.clear();
    bus.emit('ping', undefined);
    expect(handler).not.toHaveBeenCalled();
  });
});
