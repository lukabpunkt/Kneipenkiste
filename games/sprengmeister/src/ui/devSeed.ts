/**
 * Test-Seed fuer die Kistenposition (Roadmap M1.7, ADR-11).
 *
 * Die Kiste faellt produktiv **ausschliesslich** ueber `crypto.getRandomValues`
 * (CLAUDE.md) — genau deshalb kann ein E2E-Test sonst nie pruefen, was passiert, wenn
 * jemand die Kiste findet oder in den "Preis der Gier" tritt. Mit `?seed=N` bekommt die
 * FSM stattdessen einen reproduzierbaren Generator.
 *
 * **Das gibt es nur im Dev-Server und im E2E-Build.** Landet der Hook im Deploy-Build,
 * haengt jeder `?seed=1` an die Live-URL und kennt die einzige Information, die sonst
 * niemand am Tisch hat — das Spiel waere kaputt.
 */

import { createSeededRng, secureRandom, type SecureRandom } from '@/core/rng';

/**
 * Ob der Hook ueberhaupt existiert — als **Modul-Konstante**, nicht als Funktion.
 *
 * Drei Anlaeufe waren noetig, bis der Zweig wirklich aus dem Deploy-Bundle verschwand,
 * und alle drei Fallstricke liegen beim Bundler, nicht im Verhalten:
 *
 * 1. `import.meta.env['VITE_E2E']` in Bracket-Notation wird nicht zur Bauzeit ersetzt.
 * 2. Ein Default-Parameter (`allowed = hookAllowed()`) laesst den Wert durch eine
 *    Variable laufen, die von aussen gesetzt werden koennte — der Zweig bleibt stehen.
 * 3. Auch ein Funktionsaufruf im `if` reicht nicht: Rollup inlined ihn nicht zuverlaessig.
 *
 * Eine Konstante loest sich zur Bauzeit zu `false` auf, und alles dahinter faellt weg.
 * Ob das geklappt hat, kann kein Unit-Test zeigen — der CI-Schritt durchsucht das
 * gebaute Bundle.
 */
const HOOK_ALLOWED = import.meta.env.DEV || import.meta.env.VITE_E2E === '1';

/**
 * Die Zufallsquelle fuer Kistenposition und Timer-Fallback.
 * Ohne `?seed=` — und in jedem echten Build — ist das `crypto.getRandomValues`.
 */
export function secureSource(search = globalThis.location?.search ?? ''): SecureRandom {
  if (!HOOK_ALLOWED) return secureRandom;

  const raw = new URLSearchParams(search).get('seed');
  if (raw === null) return secureRandom;

  const seed = Number.parseInt(raw, 10);
  if (!Number.isFinite(seed)) return secureRandom;

  const rng = createSeededRng(seed);
  return { int: (maxExclusive) => rng.int(maxExclusive) };
}

/** Ist gerade ein Test-Seed aktiv? Der Dig-Screen zeigt dann einen Hinweis. */
export function seedActive(search = globalThis.location?.search ?? ''): boolean {
  return HOOK_ALLOWED && new URLSearchParams(search).has('seed');
}
