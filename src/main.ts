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
import { clearSession } from '@/core/session';
import { detectLocale, setLocale, t } from '@/core/i18n';

/** Statische Texte im HTML (Landscape-Overlay) übersetzen. */
function translateStaticNodes(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  }
}

/**
 * Der letzte Ausweg (Roadmap M5.5).
 *
 * Wenn der Start scheitert, ist der wahrscheinlichste Grund ein Zustand im Storage, den
 * diese Version nicht mehr versteht. Ein schwarzer Screen wäre die schlechteste Antwort:
 * Auf einer Party gibt es keine Konsole, in die jemand schaut. Also ein Satz und ein
 * Knopf, der die Sitzung wegwirft und neu lädt — der Abend geht weiter.
 */
function renderBootFailure(root: HTMLElement, error: unknown): void {
  console.error('[boot] Start fehlgeschlagen', error);

  root.replaceChildren();
  const box = document.createElement('section');
  box.className = 'screen screen--boot-failed';

  const text = document.createElement('p');
  text.textContent = t('app.bootFailed');

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'btn btn--primary';
  action.textContent = t('app.bootFailedAction');
  action.addEventListener('click', () => {
    clearSession();
    globalThis.location.reload();
  });

  box.append(text, action);
  root.append(box);
}

/**
 * Der Service Worker meldet sich erst an, wenn der Titel steht (Roadmap M5.5).
 *
 * Bei der Installation lädt Workbox den ganzen Precache — Chunks, Atlas, Schriften, Ton.
 * Passiert das während des Starts, konkurriert es mit dem ersten Bild: gemessen wurde
 * eine Blockierzeit, die den Lighthouse-Wert allein aus dieser Reihenfolge drückte.
 * Nach `load` ist der Titel längst da, und das Nachladen stört niemanden mehr.
 */
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  const register = (): void => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  };

  if (document.readyState === 'complete') register();
  else globalThis.addEventListener('load', register, { once: true });
}

function boot(): void {
  setLocale(detectLocale());

  const root = document.querySelector<HTMLElement>('#app');
  /* v8 ignore next */
  if (!root) return;

  try {
    createApp(root);
  } catch (error) {
    renderBootFailure(root, error);
    return;
  }
  /* Nach `createApp`: Die App setzt die gespeicherte Sprache, das Overlay folgt ihr. */
  translateStaticNodes();

  registerServiceWorker();
}

boot();
