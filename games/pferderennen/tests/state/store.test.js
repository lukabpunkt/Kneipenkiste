/**
 * Tests for the minimal store (src/state/store.js).
 *
 * The two properties that matter: subscribers only fire when the state reference actually
 * changed, and a reducer can never dispatch into the store it is currently running in.
 */
import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../../src/state/store.js';

/** A counter reducer that returns the same reference for unknown actions. */
const counter = (state, action) => (action.type === 'inc' ? { count: state.count + 1 } : state);

describe('createStore', () => {
  it('exposes the initial state', () => {
    expect(createStore(counter, { count: 7 }).getState()).toEqual({ count: 7 });
  });

  it('runs actions through the reducer', () => {
    const store = createStore(counter, { count: 0 });
    store.dispatch({ type: 'inc' });
    store.dispatch({ type: 'inc' });
    expect(store.getState().count).toBe(2);
  });

  it('returns the dispatched action so calls can be chained', () => {
    const action = { type: 'inc' };
    expect(createStore(counter, { count: 0 }).dispatch(action)).toBe(action);
  });

  it('notifies subscribers with the new state', () => {
    const store = createStore(counter, { count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'inc' });
    expect(listener).toHaveBeenCalledWith({ count: 1 });
  });

  it('stays silent when the reducer returns the same state', () => {
    const store = createStore(counter, { count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'nothing' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const store = createStore(counter, { count: 0 });
    const listener = vi.fn();
    store.subscribe(listener)();
    store.dispatch({ type: 'inc' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('lets a listener unsubscribe itself during notification', () => {
    const store = createStore(counter, { count: 0 });
    const second = vi.fn();
    const unsubscribeFirst = store.subscribe(() => unsubscribeFirst());
    store.subscribe(second);
    expect(() => store.dispatch({ type: 'inc' })).not.toThrow();
    expect(second).toHaveBeenCalledOnce();
  });

  it('refuses a dispatch from inside a reducer', () => {
    // The reducer closes over `store`, which only exists once createStore has returned —
    // that is fine because the reference is read at dispatch time, not at definition time.
    const reentrant = (state, action) => {
      if (action.type === 'boom') store.dispatch({ type: 'inc' });
      return state;
    };
    const store = createStore(reentrant, { count: 0 });
    expect(() => store.dispatch({ type: 'boom' })).toThrow(/Reducer/);
  });

  it('recovers after a reducer threw', () => {
    const throwing = (state, action) => {
      if (action.type === 'throw') throw new Error('kaputt');
      return counter(state, action);
    };
    const store = createStore(throwing, { count: 0 });
    expect(() => store.dispatch({ type: 'throw' })).toThrow('kaputt');
    store.dispatch({ type: 'inc' });
    expect(store.getState().count).toBe(1);
  });
});
