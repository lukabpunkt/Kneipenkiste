# Fortschritt

| Meilenstein | Status | Tag | Audit |
|---|---|---|---|
| M0 Setup & Regelkern | ✅ fertig | `v0.0.1` | A0 bestanden |
| M1 UI-Flow (Platzhalter-Schritt) | ⬜ offen | – | – |
| M2 Schlucht, Brücke, Hikers | ⬜ offen | – | – |
| M3 Show: Knarren, Blickkontakt, Audio | ⬜ offen | – | – |
| M4 Fall-Sequenzen | ⬜ offen | – | – |
| M5 Polish, Modi, A11y | ⬜ offen | – | – |
| M6 Playtest & Release | ⬜ offen | – | – |

## Audit-Reports

## Audit A0 — 2026-09-07

**Ergebnis:** BESTANDEN

| Check | Status | Notiz |
|---|---|---|
| Struktur nach Architektur §2; `rules.ts` enthält GDD-Werte (3–8; B_0 = n+2; B_min = n−1; Trinkwert m_b; Verteilen 1 / 2; Modi) | ✅ | `config.test.ts` hält jeden Wert gegen die GDD-Referenz. Neu gegenüber §2: `config/sequences.ts` (Katalog-Metadaten der 14 Inszenierungen) und `core/choice.ts` (Balken-oder-Seil-Helfer, aus `types.ts` herausgezogen, damit `types.ts` reine Typen bleibt). |
| `payout.test.ts`: GDD-Beispiele (n=5, B=7) explizit; erschöpfende Partitionen n = 3…5; Stichproben n = 6…8 | ✅ | Alle drei GDD-§3.5-Beispiele wörtlich; erschöpfend für n = 3…5 × B = n−1…n+2 (bis 16 807 Verteilungen je Zelle); 5 Stichproben für n = 6…8. |
| `bridge.test.ts`: Schrumpfen bis B_min und nicht darunter; Reparatur auf n+2; entfernter Balken via `crypto`; Todeszone-Pigeonhole | ✅ | Pigeonhole liegt in `payout.test.ts` ("Todeszone (ADR-2)"), weil er die Abrechnung braucht: erschöpfend für n = 3…6 bei B = n−1, plus Property-Test. |
| Modi: Fahnenflucht, Balkendieb, Morsch, Schwergewicht, Seil, Nebel-Pfad | ✅ | 23 Tests in `modes.test.ts` inkl. Kombinationen (Fahne+Schwergewicht, Morsch+Seil) und Randfällen (zwei Fahnen auf einem Balken, Besitzer nicht anwesend). Nebel-Pfad in `fsm.test.ts`. |
| Banner-Logik alle 6 Fälle | ✅ | `payout.test.ts` → "Banner-Logik, alle sechs Fälle". Rangfolge: Todeszone > Massensturz > Fahnenflucht > Krach > Pech > Alle drüben. |
| Choreographer: gleiche Ankunftszeit, Knarren für besetzte Balken, Blickkontakt < Bruch, Domino ≥ 3, deterministisch, ≤ 20 s | ✅ | 24 Tests; Gleichzeitigkeit und "Blickkontakt vor Bruch" zusätzlich über 2 000 zufällige Runden im Property-Test. |
| `publicView.test.ts`: CHOOSE-View ohne fremde Wahlen und ohne morschen Balken | ✅ | Prüft die serialisierte Projektion als Ganzes, nicht Einzelfelder — ein später dazugebautes Feld fällt automatisch auf. |
| Property-Test 10 000 Runden: Invarianten aus Architektur §5 | ✅ | Zufällige Spielerzahl, Balkenzahl, Modi und Wahlen; 7 Invarianten. Zusätzlich 2 000 Runden gegen `buildStepScript`. |
| `Math.random` in `src/core/` → 0 Treffer | ✅ | Grep im Test (`rng.test.ts`) und als eigener CI-Schritt; ESLint `no-restricted-properties` verbietet es zusätzlich. |
| FSM-Branch-Coverage 100 %, `core/` ≥ 95 % | ✅ | FSM 100 / 100 / 100 / 100. `core/` gesamt: 99,4 % Statements, **97,3 % Branches**, 100 % Functions. |
| CI grün | ✅ | `typecheck` · `lint` (0 Warnings) · `test:unit` (245) · `build` · E2E 8/8 auf iPhone 12 (WebKit) + Pixel 5 (Chromium), lokal ausgeführt. |
| Titel auf Handy; PWA installierbar | ✅ / ⏳ | E2E prüft Titel, Manifest (name, standalone, portrait, 3 Icons) und dass nichts horizontal scrollt — auf beiden Emulationen. Installation auf echtem Gerät: siehe manuelle Checks. |

**Zahlen:** 245 Unit-Tests · 8 E2E-Tests · JS-Bundle 6,9 KB gzip (Budget 450 KB) · Precache 126 KB.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M1:**
- [ ] Repo `Haengebruecke` auf GitHub anlegen, pushen, GitHub Pages einmalig aktivieren:
      `gh api --method POST repos/lukabpunkt/Haengebruecke/pages -f build_type=workflow`
- [ ] `npm run dev -- --host` und die App auf dem iPhone öffnen: Titel lesbar, Portrait-Rahmen sitzt, Safe-Areas stimmen.
- [ ] PWA auf iOS und Android installieren ("Zum Home-Bildschirm"): Icon, Name "Hängebrücke", Splash, Start im Standalone-Modus.
- [ ] Querformat auf dem Handy: Das Landscape-Overlay muss erscheinen.

**Anmerkungen für M1 und M6:**
- Drei Widersprüche zwischen den Planungsdokumenten sind als ADR-7, ADR-8 und ADR-9 aufgelöst. Der wichtigste ist **ADR-9**: In einer Runde ohne Kollision verteilt niemand (GDD §3.5 gewinnt gegen die unbedingte Formulierung in Architektur §5). Das hält Design-Pfeiler 3 scharf.
- `npm run balance` liefert schon jetzt die Matrix für M6. Bei **rein zufälliger** Wahl liegt die Kollisionsrate deutlich über dem A6-Zielkorridor (n = 5, B = 7: 85 %), weil echte Gruppen sich absprechen. Der Korridor ist erst im Playtest messbar — die Zahl hier ist die Untergrenze, an der sich Balancing-Änderungen prüfen lassen.
- Asset- und Audio-Pipeline (`build:atlas`, `build:audio`) sind lauffähig portiert und melden sauber, dass `assets-src/` und `audio-src/` noch leer sind. Gefüllt werden sie in M2.1 bzw. M3.5.
