import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };

/**
 * Vite-Konfiguration.
 * `base` = '/Haengebruecke/' wegen GitHub Pages (ADR-6: Repo-Name ohne Umlaut).
 */
export default defineConfig({
  base: process.env.BRIDGE_BASE ?? '/Haengebruecke/',
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
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,json,webmanifest,ogg,mp3}'],
        /*
         * Der @2x-Atlas wird **nicht** vorgeladen: Ein Gerät benutzt immer nur eine der
         * beiden Auflösungen, und beide zu precachen verdoppelt den ersten Download für
         * nichts. @1x liegt im Precache (damit die Schlucht auch offline steht), @2x holt
         * sich die Runtime-Regel unten beim ersten Schritt und behält sie danach.
         */
        globIgnores: ['**/atlas/*@2x.*'],
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
