/**
 * Test-Seed fuer die Kistenposition (Roadmap M1.7).
 *
 * Die Kiste faellt produktiv **ausschliesslich** ueber `crypto.getRandomValues`
 * (CLAUDE.md) — genau deshalb kann ein E2E-Test sonst nie prüfen, was passiert, wenn
 * jemand die Kiste findet oder in den "Preis der Gier" tritt. Mit `?seed=N` bekommt die
 * FSM stattdessen einen reproduzierbaren Generator.
 *
 * **Das gibt es nur im Dev-Server und im E2E-Build.** Der Deploy-Build setzt `VITE_E2E`
 * nicht; die Bedingung ist dann zur Bauzeit `false`, und der ganze Zweig faellt beim
 * Tree-Shaking heraus. `tests/e2e/flow.spec.ts` prueft, dass ein normaler Build den
 * Parameter ignoriert.
 */

import { createSeededRng, secureRandom, type SecureRandom } from '@/core/rng';

/**
 * Nur hier steht, wann der Hook ueberhaupt existieren darf.
 *
 * Beide Bedingungen **muessen** in Punkt-Notation stehen: Vite ersetzt nur die zur
 * Bauzeit durch Konstanten. Ein `import.meta.env['VITE_E2E']` bliebe ein
 * Laufzeit-Lookup — und mit ihm der ganze Zweig im Deploy-Bundle. Dann koennte jeder
 * `?seed=` an die Live-URL haengen und die Kistenposition ausrechnen; das Spiel waere
 * kaputt. `tests/unit/devSeed.test.ts` und ein CI-Schritt halten das fest.
 */
function hookAllowed(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_E2E === '1';
}

/**
 * Die Zufallsquelle fuer Kistenposition und Timer-Fallback.
 * Ohne `?seed=` — und in jedem echten Build — ist das `crypto.getRandomValues`.
 *
 * `allowed` ist injizierbar, damit der Test **beide** Faelle durchspielen kann: Vitest
 * laeuft mit `DEV === true`, der gesperrte Zustand waere sonst nicht erreichbar. Der
 * Default ist derselbe Ausdruck, den der Bundler zur Bauzeit aufloest.
 */
export function secureSource(
  search = globalThis.location?.search ?? '',
  allowed = hookAllowed()
): SecureRandom {
  if (!allowed) return secureRandom;

  const raw = new URLSearchParams(search).get('seed');
  if (raw === null) return secureRandom;

  const seed = Number.parseInt(raw, 10);
  if (!Number.isFinite(seed)) return secureRandom;

  const rng = createSeededRng(seed);
  return { int: (maxExclusive) => rng.int(maxExclusive) };
}

/** Ist gerade ein Test-Seed aktiv? Der Dig-Screen zeigt dann einen Hinweis. */
export function seedActive(search = globalThis.location?.search ?? '', allowed = hookAllowed()): boolean {
  return allowed && new URLSearchParams(search).has('seed');
}
