/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Eigene Env-Variablen.
 *
 * **Wichtig:** Vite ersetzt `import.meta.env.X` nur in **Punkt-Notation** zur Bauzeit.
 * Ein Zugriff ueber `import.meta.env['X']` bleibt als Laufzeit-Lookup stehen — und
 * damit bliebe auch der Code drumherum im Bundle, statt weggeworfen zu werden. Genau
 * deshalb sind diese Felder hier deklariert: damit `ui/devSeed.ts` sie mit Punkt lesen
 * kann und der Test-Seed aus dem Deploy-Build wirklich verschwindet.
 */
interface ImportMetaEnv {
  /** '1' im E2E-Build (`npm run build:e2e`). Im Deploy-Build nie gesetzt. */
  readonly VITE_E2E?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
