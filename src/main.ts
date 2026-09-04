/**
 * Einstiegspunkt.
 *
 * Alles Weitere haengt in `app.ts`: FSM, Session, Router. Hier steht nur, was das
 * Dokument selbst betrifft.
 */

import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';
import '@/styles/screens.css';

import { createApp } from '@/app';
import { detectLocale, setLocale, t } from '@/core/i18n';
import { loadSession } from '@/core/session';

declare const __APP_VERSION__: string;

/** Texte, die direkt im `index.html` stehen (Landscape-Overlay). */
function applyStaticTranslations(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  }
}

function boot(): void {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('#app fehlt im Dokument.');

  /* Gespeicherte Sprache schlaegt die des Browsers — `app.ts` setzt sie gleich erneut. */
  setLocale(loadSession()?.settings.locale ?? detectLocale());
  applyStaticTranslations();

  const app = createApp(root);
  Reflect.set(globalThis, '__zoll', { app, version: __APP_VERSION__ });
}

boot();
