/**
 * Minimal Redux-style store without a library.
 *
 * dispatch(action) runs the reducer, and only when the reducer returns a new state reference do
 * the subscribers fire. Reducers stay pure, which makes the whole state layer testable in Node.
 */

/**
 * @typedef {{type: string, payload?: unknown}} Action
 * @typedef {(state: any, action: Action) => any} Reducer
 */

/**
 * Creates a store around a reducer.
 * @param {Reducer} reducer pure function (state, action) -> state
 * @param {any} initialState
 * @returns {{getState: () => any, dispatch: (action: Action) => Action, subscribe: (listener: (state: any) => void) => () => void}}
 */
export function createStore(reducer, initialState) {
  let state = initialState;
  let dispatching = false;
  const listeners = new Set();

  return {
    getState() {
      return state;
    },

    /**
     * Runs the action through the reducer and notifies subscribers if the state changed.
     * @param {Action} action
     * @returns {Action} the action, so callers can chain
     */
    dispatch(action) {
      if (dispatching) {
        throw new Error('dispatch darf nicht aus einem Reducer heraus aufgerufen werden.');
      }

      let next;
      try {
        dispatching = true;
        next = reducer(state, action);
      } finally {
        dispatching = false;
      }

      if (next !== state) {
        state = next;
        // Copy the set first so a listener may unsubscribe during notification.
        for (const listener of [...listeners]) {
          listener(state);
        }
      }
      return action;
    },

    /**
     * Registers a listener and returns the matching unsubscribe function.
     * @param {(state: any) => void} listener
     * @returns {() => void}
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
