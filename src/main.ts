/**
 * Einstiegspunkt.
 *
 * Sprache setzen, statische Texte übersetzen, App starten, Service Worker registrieren.
 * Alles Weitere entscheidet die FSM (`src/app.ts`).
 */

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';

import { createApp } from './app';
import { detectLocale, setLocale, t } from '@/core/i18n';

/** Statische Texte im HTML (Landscape-Overlay) übersetzen. */
function translateStaticNodes(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  }
}

function boot(): void {
  setLocale(detectLocale());

  const root = document.querySelector<HTMLElement>('#app');
  /* v8 ignore next */
  if (!root) return;

  createApp(root);
  /* Nach `createApp`: Die App setzt die gespeicherte Sprache, das Overlay folgt ihr. */
  translateStaticNodes();

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  }
}

boot();
