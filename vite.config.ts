import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };

/**
 * Vite-Konfiguration.
 * `base` = '/Sprengmeister/' wegen GitHub Pages (CLAUDE.md "Projekt-Infos").
 * Ein alternativer Host, der aus dem Root serviert, setzt `SPRENGMEISTER_BASE=/`.
 */
export default defineConfig({
  base: process.env.SPRENGMEISTER_BASE ?? '/Sprengmeister/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    /*
     * Eigener Port, nicht der Vite-Standard 4173: Drinkshot und Der Tresor liegen auf
     * demselben Rechner und belegen ihn. Ein fremder Preview-Server auf dem Port faellt
     * nicht als Fehler auf — er liefert einfach das andere Spiel aus, und die E2E-Tests
     * scheitern an Meldungen, die mit diesem Projekt nichts zu tun haben.
     */
    port: 4183,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    reportCompressedSize: true,
  },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      strategies: 'generateSW',
      injectRegister: null,
      manifest: false, // wir liefern public/manifest.webmanifest selbst aus
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,json,webmanifest,ogg,mp3}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
