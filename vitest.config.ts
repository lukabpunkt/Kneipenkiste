import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/core/**/*.ts', 'src/ui/devSeed.ts'],
      // `types.ts` enthaelt ausschliesslich Interfaces und Typ-Aliase — nach dem
      // Transpilieren bleibt davon keine ausfuehrbare Zeile uebrig.
      exclude: ['src/core/types.ts'],
      thresholds: {
        // CLAUDE.md / Audit A0: die Logik ist der Kern, sie wird komplett getestet.
        'src/core/**/*.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        /*
         * Der Test-Seed entscheidet, ob die Kistenposition vorhersagbar ist (ADR-11) —
         * er wird wie Kernlogik behandelt, obwohl er in `ui/` liegt: jede Zeile, jede
         * Funktion.
         *
         * Bei den Zweigen sind rund 54 % das Maximum des Erreichbaren, und das ist kein
         * Nachlassen: Die fehlenden sind `import.meta.env.VITE_E2E` (wird nie
         * ausgewertet, weil Vitest mit `DEV === true` laeuft und `||` kurzschliesst),
         * der gesperrte Zustand selbst (eine Bau-Eigenschaft, keine Laufzeit-Frage) und
         * die `?? ''`-Fallbacks fuer `location.search` (in jsdom immer gesetzt).
         * Ob der Hook im Deploy-Build verschwindet, kann ohnehin kein Unit-Test zeigen —
         * das prueft der CI-Schritt am gebauten Bundle (ADR-11).
         */
        'src/ui/devSeed.ts': {
          branches: 50,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        // Die FSM ist der einzige Ort mit Zustandsuebergaengen — hier gilt 100 %.
        'src/core/fsm.ts': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  },
});
