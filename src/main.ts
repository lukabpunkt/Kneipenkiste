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

/**
 * Meldet den Service Worker an.
 *
 * Ohne diesen Aufruf wird `sw.js` zwar ausgeliefert, aber nie installiert — die App
 * waere „installierbar" und trotzdem offline leer (ADR-25). Der Import ist dynamisch,
 * damit der Registrierungs-Code nicht im Einstiegs-Chunk landet, und ein Fehlschlag ist
 * folgenlos: Das Spiel laeuft online genauso.
 */
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  void import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch((error: unknown) => console.warn('[zoll] Service Worker nicht angemeldet', error));
}

/** Texte, die direkt im `index.html` stehen (Landscape-Overlay). */
function applyStaticTranslations(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  }
}

/**
 * Zeigt eine lesbare Meldung statt einer weissen Seite.
 *
 * Ein Spiel, das auf einem Tisch liegt, kann nicht "die Konsole oeffnen". Wenn der Start
 * scheitert — kaputter localStorage, fehlendes WebGL, ein Fehler in einem Modul —, soll
 * dastehen, was los ist und was hilft.
 */
function showFatal(root: HTMLElement, error: unknown): void {
  console.error('[zoll] Start fehlgeschlagen', error);

  root.replaceChildren();
  const box = document.createElement('main');
  box.className = 'screen screen--fatal';
  box.setAttribute('role', 'alert');

  const title = document.createElement('h1');
  title.className = 'fatal__title';
  title.textContent = t('fatal.headline');

  const body = document.createElement('p');
  body.className = 'fatal__body';
  body.textContent = t('fatal.body');

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn btn--primary';
  retry.textContent = t('fatal.retry');
  retry.addEventListener('click', () => {
    /*
     * Beim zweiten Versuch die gespeicherte Session wegwerfen: Der haeufigste Grund fuer
     * einen Start, der zweimal scheitert, sind kaputte Daten im localStorage.
     */
    try {
      globalThis.localStorage?.removeItem('zoll.session.v1');
    } catch {
      /* Wenn selbst das nicht geht, hilft nur noch Neuladen. */
    }
    location.reload();
  });

  box.append(title, body, retry);
  root.append(box);
}

function boot(): void {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('#app fehlt im Dokument.');

  try {
    /* Gespeicherte Sprache schlaegt die des Browsers — `app.ts` setzt sie gleich erneut. */
    setLocale(loadSession()?.settings.locale ?? detectLocale());
    applyStaticTranslations();

    const app = createApp(root);
    Reflect.set(globalThis, '__zoll', { app, version: __APP_VERSION__ });

    /* Erst wenn das Spiel steht — der Precache darf den ersten Bildaufbau nicht bremsen. */
    registerServiceWorker();
  } catch (error) {
    showFatal(root, error);
  }
}

boot();
