import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };

/**
 * Das Stylesheet wandert in die HTML-Datei (Roadmap M5.5).
 *
 * Es ist knapp 6 KB gzip und blockiert das erste Bild — und weil es eine eigene Datei
 * ist, kostet es auf einer Mobilverbindung eine volle Runde Latenz, bevor überhaupt
 * etwas erscheinen darf. Gemessen mit echter Drosselung war das der grösste Einzelposten
 * im First Contentful Paint.
 *
 * Gemessen mit 4× CPU-Drosselung und 150 ms RTT, Median aus vier Läufen: **576 ms**
 * First Contentful Paint mit verlinkter Datei, **308 ms** mit eingebettetem Stylesheet.
 *
 * Vertretbar ist das nur, weil die Datei klein und der Rest der App ein PWA-Precache
 * ist: Die HTML-Datei liegt ohnehin im Cache, ein separates CSS würde dort nur ein
 * zweites Mal danebenliegen. Wächst das Stylesheet über ~20 KB gzip, gehört diese
 * Entscheidung noch einmal auf den Tisch.
 */
function inlineStylesheet(): Plugin {
  return {
    name: 'haengebruecke:inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find(
        (chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.html')
      );
      if (!html || html.type !== 'asset') return;

      let source = String(html.source);

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'asset' || !chunk.fileName.endsWith('.css')) continue;

        const link = new RegExp(`<link[^>]+href="[^"]*${chunk.fileName.split('/').pop()!}"[^>]*>`);
        if (!link.test(source)) continue;

        source = source.replace(link, `<style>${String(chunk.source)}</style>`);

        /*
         * Die Datei bleibt liegen, obwohl sie im HTML nicht mehr verlinkt ist.
         *
         * Vite hängt an jeden dynamischen Import ein `__vitePreload` mit den Stylesheets
         * des Abhängigkeitsbaums. Löscht man das Asset, läuft dieser Preload beim
         * Laden der Bühne in einen 404 — Chromium schluckt das, WebKit lehnt den Import
         * mit "Unable to preload CSS" ab, und der Schritt bleibt schwarz. Genau so ist es
         * beim ersten Versuch passiert: alle fünf Perf-Tests auf iPhone 12 rot.
         *
         * Also: kein `<link>` im Kopf (darum ging es), aber die Datei existiert. Sie wird
         * beim Schritt einmal geholt, liegt bis dahin im Precache und setzt dieselben
         * Regeln noch einmal — sichtbar ändert das nichts.
         */
      }

      html.source = source;
    },
  };
}

/**
 * Vite-Konfiguration.
 * `base` = '/Haengebruecke/' wegen GitHub Pages (ADR-6: Repo-Name ohne Umlaut).
 */
export default defineConfig({
  base: process.env.HAENGEBRUECKE_BASE ?? '/Haengebruecke/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    target: 'es2022',
    sourcemap: true,
    reportCompressedSize: true,
  },
  plugins: [
    inlineStylesheet(),
    VitePWA({
      /*
       * `autoUpdate`: Ein Partyspiel-Tab bleibt oft tagelang offen. Mit `prompt` waere der
       * Ladefehler aus einem alten Chunk die Regel statt der Ausnahme (wie beim Zoll).
       */
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      injectRegister: null,
      manifest: false, // public/manifest.webmanifest liefern wir selbst aus
      workbox: {
        /*
         * `m4a` gehört dazu: Der Ton ist ein einziger Sprite, und ohne ihn im Precache
         * wäre das Spiel offline stumm — der Ausfall, den man am spätesten bemerkt.
         */
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,json,webmanifest,ogg,mp3,m4a}'],
        /*
         * Der @2x-Atlas wird **nicht** vorgeladen: Ein Gerät benutzt immer nur eine der
         * beiden Auflösungen, und beide zu precachen verdoppelt den ersten Download für
         * nichts. @1x liegt im Precache (damit die Schlucht auch offline steht), @2x holt
         * sich die Runtime-Regel unten beim ersten Schritt und behält sie danach.
         */
        /*
         * Der @2x-Atlas und die Store-Screenshots bleiben aus dem Precache: Der Atlas,
         * weil ein Gerät immer nur eine Auflösung braucht; die Screenshots, weil sie nur
         * die Installations-Ansicht schmücken und im Spiel nie geladen werden.
         */
        globIgnores: ['**/atlas/*@2x.*', '**/screenshots/*'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/atlas/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'atlas',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
