/**
 * Einstiegspunkt.
 *
 * In M0 gibt es noch keine Screens (die kommen in M1). Was hier steht, ist genau das,
 * was die DoD von M0 verlangt: ein Titel, der auf dem Handy erscheint, die Sprache aus
 * dem Browser, der Service Worker — und der Nachweis, dass der Regelkern laeuft.
 */

import './styles/tokens.css';
import './styles/base.css';

import { detectLocale, setLocale, t } from '@/core/i18n';
import { createBridge } from '@/core/bridge';
import { createSessionController, defaultPlayers, emptySession } from '@/core/session';

declare const __APP_VERSION__: string;

/** Statische Texte im HTML (Landscape-Overlay) uebersetzen. */
function translateStaticNodes(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  }
}

function renderPlaceholder(root: HTMLElement, plankCount: number): void {
  const heading = document.createElement('h1');
  heading.textContent = t('app.title');

  const tagline = document.createElement('p');
  tagline.textContent = t('app.tagline');

  const bridge = document.createElement('p');
  bridge.textContent = t('lobby.bridgeInfo', { count: plankCount, players: 5 });

  const version = document.createElement('small');
  version.textContent = `v${__APP_VERSION__}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'boot';
  wrapper.append(heading, tagline, bridge, version);
  root.replaceChildren(wrapper);
}

function boot(): void {
  setLocale(detectLocale());
  translateStaticNodes();

  const root = document.querySelector<HTMLElement>('#app');
  /* v8 ignore next */
  if (!root) return;

  /* Die Session lebt ab hier; M1 haengt Router und Screens daran. */
  const session = createSessionController(emptySession(defaultPlayers(5)));
  renderPlaceholder(root, createBridge(session.players().length).count);

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  }
}

boot();
