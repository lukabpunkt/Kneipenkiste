/**
 * Dev-Panel (`?dev=1`, Roadmap M2.5).
 *
 * Ein kleines Bedienfeld ueber der Buehne: Tresor auf und zu, Karte i umdrehen, Alarm
 * ausloesen, Laser an und aus — dazu Bildrate und Draw-Calls live. Es existiert, damit
 * man die Bühne ansehen kann, ohne jedes Mal eine Runde durchzuspielen.
 *
 * Landet nie in der Produktion: Der Aufrufer baut es nur bei `?dev=1`, und
 * `main.ts` liest das genau einmal.
 */

export interface DevPanelAction {
  label: string;
  onClick: () => void;
}

export interface DevPanelOptions {
  actions: readonly DevPanelAction[];
  /** Wird jede Sekunde abgefragt: Bildrate, Draw-Calls, was sonst interessiert. */
  readStats: () => Record<string, string | number>;
}

export interface DevPanel {
  el: HTMLElement;
  destroy(): void;
}

const REFRESH_MS = 500;

export function createDevPanel(options: DevPanelOptions): DevPanel {
  const el = document.createElement('div');
  el.className = 'dev';
  // Kein `aria-hidden`: Wer das Panel oeffnet, will es auch bedienen koennen.
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Dev');

  const stats = document.createElement('dl');
  stats.className = 'dev__stats';

  const controls = document.createElement('div');
  controls.className = 'dev__controls';

  for (const action of options.actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dev__button';
    button.textContent = action.label;
    button.addEventListener('click', (event) => {
      // Sonst zaehlt der Tap zusaetzlich als Tap-to-Skip auf der Buehne.
      event.stopPropagation();
      action.onClick();
    });
    controls.append(button);
  }

  el.append(stats, controls);

  const render = (): void => {
    const values = options.readStats();
    // Zeilen wiederverwenden statt neu bauen — das Panel laeuft waehrend der Messung mit.
    const entries = Object.entries(values);
    while (stats.children.length > entries.length * 2) stats.lastElementChild?.remove();
    entries.forEach(([key, value], index) => {
      let term = stats.children[index * 2] as HTMLElement | undefined;
      let def = stats.children[index * 2 + 1] as HTMLElement | undefined;
      if (!term) {
        term = document.createElement('dt');
        def = document.createElement('dd');
        stats.append(term, def);
      }
      term.textContent = key;
      if (def) def.textContent = String(value);
    });
  };

  render();
  const timer = globalThis.setInterval(render, REFRESH_MS);

  return {
    el,
    destroy() {
      clearInterval(timer);
      el.remove();
    },
  };
}
