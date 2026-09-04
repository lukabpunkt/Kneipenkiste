/**
 * Performance der Reveal-Show (Architektur §9, Audit A3).
 *
 * Zielwerte auf dem Referenzgeraet, REVEAL mit 8 Spielern, Outcome
 * `multiSteal/TugOfWar`, CPU 4x gedrosselt: p50 <= 20 ms, p95 <= 40 ms, <= 2 Long-Tasks.
 *
 * Der echte Test entsteht in Roadmap M3.9 — vorher gibt es keine Buehne, die man messen
 * koennte. Bis dahin steht hier ein bewusst uebersprungener Platzhalter, damit
 * `npm run test:perf` und die CI schon jetzt einen definierten Ausgang haben.
 */

import { test } from '@playwright/test';

test.skip('REVEAL mit 8 Spielern haelt das Frame-Budget', () => {
  // TODO(M3.9): Buehne oeffnen, 8 Crooks aufstellen, Show abspielen, Frame-Zeiten messen.
});
