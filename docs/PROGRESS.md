# Fortschritt

| Meilenstein | Status | Tag | Audit |
|---|---|---|---|
| M0 Setup & Regelkern | ✅ fertig | `v0.0.1` | A0 bestanden |
| M1 UI-Flow (Platzhalter-Schritt) | ✅ fertig | `v0.1.0` | A1 bestanden |
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

## Audit A1 — 2026-09-08

**Ergebnis:** BESTANDEN

| Check | Status | Notiz |
|---|---|---|
| E2E-Szenarien aus M1.6 grün (iPhone 12 + Pixel 5) | ✅ | 34/34 auf beiden Emulationen. Der Vier-Runden-Test spielt in einem Durchgang: allSafe → Schrumpfen, Kollision → Reparatur, Fahne mit Fahnenflucht **und** Balkendieb, Todeszone per Dev-Toggle. Dazu Seil-Verbrauch über zwei Runden, Nebel-Pfad und Schwergewicht. |
| Choose: Balken ≥ 56 px (≥ 48 bei 10), keine fremden Wahlen, Seil nur wenn verfügbar, Versiegeln ohne Zurück, Bedenkzeit-Fallback | ✅ | Höhen bei 5 und 8 Spielern gemessen (7 bzw. 10 Balken). Fremde Wahlen: eigener Test — nach p1s Wahl sieht p2 weder Markierung noch Namen. Bedenkzeit wählt nach 5 s über `crypto` und sagt es per Toast. |
| Negotiation: Regelzeile mit den Werten **dieser** Runde (Todeszone: verteilen 2); Fahnen öffentlich und stapelbar | ✅ | E2E prüft beide Textvarianten; zwei Fahnen auf einem Balken sind erlaubt und sichtbar (`components.test.ts`). |
| Distribute: quick bei allen == 1, iterate sonst; nicht an sich selbst; Summen stimmen | ✅ | Beide Pfade im E2E gespielt (Todeszone und Balkendieb erzwingen `iterate`). Der eigene Knopf ist deaktiviert — Unit- und E2E-geprüft. |
| Result: Brücken-Übersicht (Fahne vs. Wahl), Vorschau mit abgefault/repariert, Statistik nach 5 Testrunden korrekt | ✅ | `data-kind="shrunk"`/`"repaired"` im E2E; Fahne steht als Umriss **neben** dem Kopf (`components.test.ts`); Statistik-Sheet mit Bergziege, Sturzflieger und Sturz-Duo. |
| Keine hardcodierten Strings | ✅ | `a11y.test.ts` grept jede `textContent`-Zuweisung in `src/ui` und prüft zusätzlich, dass jeder benutzte i18n-Key existiert. |
| Informationssicherheit (Standing Audit) | ✅ | Kein Screen kennt `context.round`, `.choices` oder `bridge.rottenPlank`; der morsche Balken darf nur über `reveal.` kommen. Der Step-Screen bekommt das fertige `StepScript`, nicht das `RoundResult`. |
| Safe-Areas, Reload-Persistenz (inkl. Balkenzahl + Seil-Verbrauch), Back-Dialog | ✅ | Reload mitten in der Session: geschrumpfte Brücke, verbrauchtes Seil und Statistik überleben. Back-Dialog fragt und lässt sich abwählen. |
| `typecheck` · `lint` · `test:unit` · `build` | ✅ | 274 Unit-Tests, 0 Lint-Warnungen, JS 30,5 KB gzip (Budget 450 KB). |
| Unbeteiligte Person versteht jeden Screen ohne Erklärung | ⏳ manuell | Siehe unten. |

**Zahlen:** 274 Unit-Tests · 34 E2E-Tests · JS 30,5 KB gzip · CSS 5,1 KB gzip · `core/` 99,4 % Statements / 97,3 % Branches, FSM 100 %.

**Drei Bugs, die erst der E2E-Durchlauf gefunden hat:**
1. **Die Session ging beim Weg über die Lobby verloren.** `go` baute Brücke, Seile und Rundenzähler neu — nach einem Reload stand wieder `n + 2`. Behoben in ADR-10; `setPlayers` vergleicht jetzt die Spieler-IDs, statt bei jedem Aufruf neu zu bauen.
2. **Der zweite Verteiler kam nie dran.** `DISTRIBUTE → DISTRIBUTE` ist ein Selbstübergang; der Router hielt den Screen für unverändert und ließ den fertigen Verteiler stehen. Jetzt baut die App den Screen bei diesem Übergang neu auf — aber nur im `iterate`-Modus, weil der Schnellmodus seine Reihe in einer Komponente führt.
3. **Der Todeszone-Toggle wirkte unsichtbar.** `setBridge` ist kein FSM-Übergang, also erfuhr der Absprache-Screen nichts davon. Das Dev-Panel fordert jetzt ausdrücklich einen Neuaufbau an.

**Offene SOLL-Follow-ups:** keine.

**Manuelle Checks für Luka vor M2:**
- [ ] Eine Runde zu fünft auf dem Handy spielen: Versteht jemand, der die Regeln nicht kennt, jeden Screen ohne Nachfrage? (A1, MUSS-Check)
- [ ] Safe-Areas auf einem iPhone mit Notch: Sitzen Countdown oben und CTA unten im sichtbaren Bereich?
- [ ] Fühlt sich der Step-Platzhalter im Timing richtig an — knarrt es lange genug, kommt der Blickkontakt als Moment an? Das Timing ist echt, nur das Bild ist Platzhalter; Rückmeldung dazu fließt direkt in M2/M3.
- [ ] Deutsch/Englisch umschalten (Einstellungen) und einen Screen prüfen.

**Anmerkungen für M2:**
- Der Step-Screen ist der einzige Screen, der in M2 ersetzt wird. Sein Vertrag steht: Er bekommt `stepScript()` und `reveal()`, sonst nichts — der `StepDirector` kann exakt dort andocken.
- Das Nachspiel des Platzhalters folgt dem letzten Bruch direkt (ADR-12). Ab M4 gehört dieses Fenster den Fall-Sequenzen; der Deckel von 20 s ist dafür schon eingerechnet.
- Die Modus-Kombinationen sind rechnerisch geprüft (M0) und einzeln gespielt (M1). Fahne + Schwergewicht + Todeszone gleichzeitig hat noch niemand gespielt — das gehört in den A5-Check.
