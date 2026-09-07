# Fortschritt

| Meilenstein | Status | Tag | Audit |
|---|---|---|---|
| M0 Setup & Regelkern | ✅ fertig | `v0.0.1` | A0 bestanden |
| M1 UI-Flow (Platzhalter-Schritt) | ✅ fertig | `v0.1.0` | A1 bestanden |
| M2 Schlucht, Brücke, Hikers | ✅ fertig | `v0.2.0` | A2 bestanden |
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

## Audit A2 — 2026-09-08

**Ergebnis:** BESTANDEN

| Check | Status | Notiz |
|---|---|---|
| 8 Hikers + Schlucht 60 s: p50 ≤ 16.7 ms, p95 ≤ 33 ms | ✅ / ⏳ | Gemessen wird die **JS-Zeit des Bühnen-Loops**: **0,10 ms p95** bei acht Hikers, zehn Balken, Nebel und Glitzer — Budget 4 ms. Die Frame-Zeit taugt in CI nicht: Vier Varianten (voll, Low-Effects, halbe Auflösung, beides) lieferten auf die Nachkommastelle dieselben 33,3 ms, das ist die Kadenz des Compositors (ADR-16). Die Aussage über das Referenzgerät ist ein manueller Check. |
| Draw-Batches ≤ 3; Heap flach 30 s; Seile gecached | ✅ | **1 Draw-Call** statt drei erlaubten — zwei Atlanten entlang der Zeichenreihenfolge, und PIXI packt beide in dieselbe Batch (ADR-13). Seile sind Sprites mit eingebautem Durchhang, kein `Graphics` mit eigener Textur. |
| Gleichzeitige Ankunft: alle `runTo` enden im selben Frame (Test) | ✅ | `Hiker.runTo()` nimmt eine **Dauer**, keine Geschwindigkeit; der Choreographer-Test aus M0 prüft die gemeinsame `arriveAt` über jede Spielerzahl und jedes Tempo-Preset. |
| Look-Check gegen Art Direction §1/§5/§6 (`docs/screens/m2-*`) | ⏳ manuell | 24 Screenshots für n = 3, 5, 8 entlang der Zeitachse (Aufstellung, Anlauf, Schritt, Knarren, Blickkontakt, Bruch, Nachspiel) — reproduzierbar über `npm run capture:screens`. |
| Alle 8 Farben unterscheidbar (Deuteranopie, Symbole) | ✅ / ⏳ | `npm run check:colorblind` simuliert auf dem echten Bühnenbild. Farbe allein trägt nicht — unter Deuteranopie bleiben etwa vier Gruppen, wie zu erwarten. Die Symbole übernehmen: acht verschiedene, im Bild klar erkennbar. Der Blick darauf ist manuell (`m2-deuteranopia-8.png`). |
| Layout B = n−1 … n+2 für n = 3 und 8 ohne Überlappung; zwei Hikers nebeneinander auf einem Balken | ✅ | `stage.test.ts` (22 Tests): Mindestbreite 60 Einheiten bei jeder Balkenzahl, Aufstellung ohne doppelte Plätze und ohne jemanden neben der Kante, `fitsSideBySide` für jede Spielerzahl. |
| Preload während NEGOTIATION; Low-Effects bei Throttle | ✅ | Der Bühnen-Chunk lädt beim Eintritt in Absprache oder Stille; die Atlanten teilen sich eine Promise. Low-Effects schaltet Nebel, Glitzer und Schatten ab, automatisch erkannt oder in den Einstellungen. |
| `typecheck` · `lint` · `test:unit` · `build` · E2E | ✅ | 296 Unit-Tests, 36 E2E auf iPhone 12 und Pixel 5, 0 Lint-Warnungen. JS 228 KB gzip (Budget 450), Bühnen-Chunk lazy. |

**Zahlen:** 296 Unit-Tests · 36 E2E · JS-Loop 0,10 ms p95 · 1 Draw-Call · JS 228 KB gzip · Atlas 713 KB (davon lädt ein Gerät die Hälfte).

**Fünf Fehler, die erst das laufende Bild gezeigt hat:**
1. **Der `world@2x`-Atlas lief über 2048 px und wurde still in zwei Seiten geteilt.** Der Loader kennt nur eine, bekam die 404-Seite als JSON und die Bühne startete auf keinem Retina-Gerät. Das Build-Skript rastert gestreckte Kulissen jetzt mit halber Dichte — und **bricht ab**, wenn ein Atlas mehr als eine Seite braucht.
2. **Die Nummernschilder blieben leer.** `fontFamily` als CSS-Stack-String ergibt in PIXI eine ungültige Deklaration, lautlos. Jetzt sind die Schilder in den Atlas gebacken (ADR-14) — das spart nebenbei zehn Draw-Batches.
3. **Der Skip-Knopf erschien vor dem Bruch.** Er hing an `setTimeout`, die Timeline läuft im Blickkontakt aber auf halber Geschwindigkeit. Jetzt meldet der Director seine Beats (ADR-17).
4. **Der fünfte Hiker stand neben dem Plateau in der Luft.** Fester Abstand statt gerechnetem; in einer Seitenansicht sieht man einem Männchen nicht an, dass es eigentlich schon fällt.
5. **Zwei Hikers auf einem Balken verdeckten sich fast vollständig.** Genau das Bild, das das Spiel verkauft (GDD §1). Der Abstand hängt jetzt an der Hikerbreite, mit Tiefenstaffelung ab drei.

**Offene SOLL-Follow-ups:**
1. Die Symbole auf dem Torso sind auf der Bühne klein (rund 11 px). Für die Zuordnung reicht der Hut; wer sich auf das Symbol verlassen muss, liest es besser im Result. Gehört in den A11y-Durchgang in M5.
2. WebGPU- und Canvas-Renderer liegen im Bühnen-Chunk, obwohl `preference: 'webgl'` gesetzt ist (~21 KB gzip). Beim Bundle-Durchgang in M5 prüfen.

**Manuelle Checks für Luka vor M3:**
- [ ] **Look-Check** auf dem Handy: `docs/screens/m2-*` gegen Art Direction §1/§5/§6 — goldene Stunde, Durchhang, Wind, Nebel, Gustav, Hüte in Spielerfarbe.
- [ ] **Frame-Rate auf dem Referenzgerät** (iPhone 11 / Pixel 4a): `?dev=1` zeigt unten rechts Frame-Kadenz, JS-Zeit und Draw-Calls. Ziel 60 fps, Minimum 30.
- [ ] `docs/screens/m2-deuteranopia-8.png` ansehen: Sind die acht Wanderer noch acht?
- [ ] Fühlt sich die Kamerafahrt im Intro richtig an — zeigt sie die Tiefe, bevor die Brücke kommt?

**Anmerkungen für M3:**
- Der `StepDirector` spielt das Skript vollständig, aber der Bruch ist noch eine direkte Animation ohne Sequenz. M3 hängt Registry und Sicher-/Misc-/Overlay-Sequenzen an dieselben Stellen; `breaks[].sequenceId` steht bereits im Skript.
- Knarren, Blickkontakt, Slow-Mo, Bruch-Reihenfolge und Hit-Stop laufen schon — M3 ergänzt Audio und die Sequenz-Auswahl, nicht die Choreographie.
- Gustav kann sechs Dinge (kreisen, kreischen, lachen, Uhr, tragen, landen); im Einsatz sind bisher drei. Die anderen warten auf ihre Sequenzen.
