# Fortschritt

| Meilenstein | Status | Tag | Audit |
|---|---|---|---|
| M0 Setup & Regelkern | ✅ fertig | `v0.0.1` | A0 bestanden |
| M1 UI-Flow (Platzhalter-Schritt) | ✅ fertig | `v0.1.0` | A1 bestanden |
| M2 Schlucht, Brücke, Hikers | ✅ fertig | `v0.2.0` | A2 bestanden |
| M3 Show: Knarren, Blickkontakt, Audio | ✅ fertig | `v0.3.0` | A3 bestanden |
| M4 Fall-Sequenzen | ✅ fertig | `v0.4.0` | A4 bestanden |
| M5 Polish, Modi, A11y | ✅ fertig | `v0.5.0` | A5 bestanden |
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

## Audit A3 — 2026-09-08

**Ergebnis:** BESTANDEN

| Check | Status | Notiz |
|---|---|---|
| 1 000 simulierte Runden: gezeigte Gruppen == `RoundResult.groups`; Bruch-Reihenfolge == Skript | ✅ | `show.test.ts` prüft je Runde neun Zusicherungen: wer läuft, welche Balken knarren, welche brechen (und in welcher Reihenfolge), wer sich ansieht, wer eine Sicher-Sequenz bekommt, welches Nachspiel läuft, welche Overlays auf wen zielen, und dass kein Skript den 20-s-Deckel reisst. Zufällige Spielerzahl, Balkenzahl, Modi und Wahlen. |
| Knarren auf allen besetzten Balken (0.7 / 1.0 / morsch 0.4→1.0); Blickkontakt immer vor Bruch; Slow-Mo aktiv | ✅ | Amplituden je Gruppe im selben Test geprüft. Blickkontakt: nur Kollisionsgruppen, `at < snap.at`, nie vor dem gemeinsamen Schritt, immer mit mindestens zwei Beteiligten. Slow-Mo läuft über `timeScale` der **ganzen** Timeline — auch Nebel und Wind werden langsam. |
| Safe-, Misc- und Overlay-Sequenzen registriert, Dev-Preview, Dauer-Limits | ✅ | Neun Sequenzen gebaut: `basic_fall`, drei Sicher-, drei Misc-, zwei Overlays. `sequences.test.ts` bindet Katalog und Registry aneinander und hält fest, dass die sechs Fall-Sequenzen offen sind — der Test schlägt fehl, sobald M4 sie baut. Preview unter `?dev=1&panel=sequences`: für jede gebaute Sequenz ein Szenario, das sie auslöst. |
| Timing-Presets ± 1 s; Tap-to-Skip erst nach letztem Bruch | ✅ | Presets gegen `choreo.ts` geprüft; kurz < normal < lang. Der Hit-Stop ist in allen dreien gleich — er ist die Signatur, nicht der Puffer. Skip hängt an einem Timeline-Beat, nicht an der Wanduhr (ADR-17); über 1 000 Runden liegt jeder Bruch vor `skippableFrom`. |
| Perf-Test grün; Sound-Sync ± 50 ms; stumm voll spielbar | ✅ | JS-Loop 0,10 ms p95, 1 Draw-Call trotz Sprechblasen, Partikel-Höchststand 36 von 200. Sound-Sync ergibt sich aus der Bauweise: Jeder `play()` sitzt als `call()` auf derselben Timeline wie die Animation, es gibt also keinen zweiten Taktgeber, der auseinanderlaufen könnte. Stumm: eigener Test, alles scheitert still. |
| Wake-Lock; Tab-Wechsel Pause/Resume | ✅ | Wake-Lock von der Absprache bis zum Verteilen. Im Hintergrund hält der PIXI-Ticker an, GSAP pausiert, der AudioContext wird suspendiert. |
| Spannungs-Test: 3 Personen sehen 5 Schritte | ⏳ manuell | Siehe unten — das kann kein Test beantworten. |

**Zahlen:** 320 Unit-Tests · 40 E2E · 9 Sequenzen · 32 Sound-Keys · JS 249 KB gzip (Budget 450) · Audio 316 KB · JS-Loop 0,10 ms p95 · 1 Draw-Call.

**Was M3 gebracht hat**
- **Das Sequenz-System.** Registry, Kontext, Auswahl. Der Director besitzt die Beats, die Sequenzen besitzen, was darin passiert — deshalb tauscht M4 sechs Dateien und keine Zeile im Director (ADR-18).
- **Die Fall-Sequenz trägt den Blickkontakt.** `eyeContact` < `snap` < `climbedBack` als Labels, pro Datei prüfbar. Die Signatur des Spiels kann in M4 nicht versehentlich wegfallen.
- **Effekte:** Partikel-Pools (Splitter, Spritzer, Ringe, Sterne) ohne Allokation im Loop, Sprechblasen, Schilder, Stempel.
- **Ton:** 32 Klänge als ein 316-KB-Sprite, synthetisiert (ADR-20). Musik je Abschnitt, Wind, iOS-Entsperren beim ersten Tap.

**Drei Fehler, die erst das laufende Bild gezeigt hat:**
1. **Die Gestürzten flogen zurück zur Aufstellung.** Die Timeline entsteht vor dem Anlauf; feste Zielwerte zeigten dorthin, wo die Hikers beim Bauen standen. Jetzt sind positionsabhängige Ziele Funktionen (ADR-19).
2. **Sie kamen als Geister zurück.** Die Ausblendung lief parallel zum Aufstieg und überschrieb dessen Deckkraft.
3. **Die Kamera schob die Brücke aus dem Bild,** wenn der Kollisionsbalken am Rand lag. Der Schwenk ist jetzt auf ein Sechstel Weltbreite begrenzt.

**Offene SOLL-Follow-ups:**
1. Die Töne sind synthetisiert und klingen so. Sie zu ersetzen ist ein Austausch von WAVs in `audio-src/`, kein Code — gehört in M5 oder M6.
2. Aus M2 offen: Symbole auf der Bühne klein (~11 px); WebGPU-/Canvas-Renderer ungenutzt im Chunk (~21 KB gzip).

**Manuelle Checks für Luka vor M4:**
- [ ] **Spannungs-Test (A3, MUSS):** Drei Personen sehen fünf Schritte mit unbekanntem Ergebnis. Ziel: ≥ 2 sagen, sie waren beim Knarren unsicher, ob ihr Balken hält; ≥ 1 hörbare Reaktion beim Blickkontakt. Das ist der Kern-Check des Meilensteins — die Spannungsmaschine funktioniert oder nicht.
- [ ] **Ton auf dem Handy:** Erster Tap entsperrt? Musik wechselt zwischen Lobby, Absprache und Schritt? Kracht der Bruch im richtigen Moment? Und: einmal stumm durchspielen.
- [ ] **Sequenz-Preview** öffnen (`?dev=1&panel=sequences`) und die neun Inszenierungen einzeln ansehen — vor allem `all_safe_rot` und `rotten_crack`.
- [ ] Klingen die synthetisierten Töne erträglich genug für den Playtest, oder sollen sie vorher ersetzt werden?

**Anmerkungen für M4:**
- Der Vertrag steht: `Sequence.build(ctx)` liefert eine Timeline, `ctx.timing.snapMs` sagt, wann der Balken reisst, die drei Labels sind Pflicht. `BasicFall.ts` ist die Vorlage.
- `sequences.test.ts` erwartet ausdrücklich, dass die sechs Fall-Sequenzen **fehlen**. Wer sie baut, dreht diesen Test um — das ist die Erinnerung, ihn anzupassen.
- Gustav kann `carry()` für `fall_seesaw`, die Sterne-Partikel warten auf `fall_bounce_wall`, das "HILFE"-Schild auf `fall_coyote_delay`. Die Bausteine liegen bereit.

## Audit A4 — 2026-09-08

**Ergebnis:** BESTANDEN (ein SOLL offen: Video und Lustig-Test sind manuell)

### Eine Zeile je Sequenz

Alle sechs bauen auf `fallKit.ts` (ADR-22) und tragen dadurch dieselbe Signatur: Blickkontakt bei 0 ms, Bruch bei 900 ms, danach der eigene Gag, am Ende klettert jeder wieder hoch. Geprüft wird jede Zeile in `fallSequences.test.ts` auf einer echten Bühne ohne Renderer (ADR-23).

| Sequenz | Gag — in 1 s lesbar | Labels · Reset | Prinzipien · Ton | Dauer | Long-Tasks* |
|---|---|---|---|---|---|
| `fall_hold_hands` (Gewicht 3) | Zwei greifen sich an den Händen und drehen sich im Fall um einen gemeinsamen Punkt wie Eiskunstläufer. Wer fällt und mit wem, steht in einem einzigen Bild. | 0 / 900 / 4150 ms ✅ · trocken, aufrecht, Hut auf ✅ | Anticipation (Zusammenrücken vor dem Bruch), Follow-Through (Rotation läuft nach dem Platsch aus), Hit-Stop im Blick · `creak_1` → `plank_snap` → `whistle_fall` → `splash` | 4,15 s ✅ | 2 (Pixel 5) ✅ |
| `fall_coyote_delay` (2) | Der Balken ist weg, die beiden stehen noch 950 ms in der Luft, halten ein "HILFE"-Schild hoch — dann erst fallen sie. Die Hüte bleiben oben und schweben hinterher. | 0 / 900 / 4650 ms ✅ · Hut ist zurück am Kopf ✅ | Anticipation als Pause, Timing (die Pause **ist** der Gag), Follow-Through (Hüte), Secondary Action (Blick nach unten) · `crowd_gasp` in der Pause, `hat_flutter`, `whistle_fall` | 4,65 s ✅ | 2 ✅ |
| `fall_seesaw` (2) | Der Balken kippt wie eine Wippe: Der Schwere geht runter und katapultiert den Leichten hoch — auf Gustav, der ihn ein Stück trägt und dann fallen lässt. | 0 / 900 / 4520 ms ✅ · Gustav gibt den Passagier frei, kein Rest-Parent ✅ | Squash beim Aufprall, Overshoot beim Katapult, Arcs (Flugbahn), Appeal (Gustav lacht) · `rock_squash`, `balloon_deflate`, `vulture_screech`, `vulture_laugh` | 4,52 s ✅ | 2 ✅ |
| `fall_rope_swing` (2) | Sie greifen im letzten Moment die Seile, schwingen zur nächsten Wand, klatschen dagegen (Squash auf 0,62) — und rutschen dann doch ab. Sternchen. | 0 / 900 / 4650 ms ✅ · `body.scale` wieder 1/1 ✅ | Anticipation (Greifen), Squash & Stretch (Wandkontakt), Arcs (Pendel), Follow-Through (Sterne) · `rope_strain`, `rock_squash`, `whistle_fall` | 4,65 s ✅ | 2 ✅ |
| `fall_domino` (3, nur ab drei) | Der erste kippt auf den zweiten, der auf den dritten, im Abstand von 130 ms. Sie fallen als Stapel; der unterste fragt "Warum ich?!". | 0 / 900 / 4490 ms ✅ · Rotation 0, Stapel aufgelöst ✅ | Staggering (die Kette), Anticipation je Glied, Overshoot beim Kippen, Appeal (Sprechblase) · `step_thud` je Glied, `whistle_fall` | 4,49 s ✅ | 2 ✅ |
| `fall_bounce_wall` (2) | Ping-Pong zwischen den Wänden, drei Aufpraller mit Squash, Landung als Häufchen auf einem Felsvorsprung — und dann rutscht der Felsvorsprung ab. Zweistufige Pointe. | 0 / 900 / 4580 ms ✅ · Kamera zurück auf die Brücke ✅ | Squash & Stretch (jeder Aufprall), Timing (Bounces werden kürzer), Anticipation vor der zweiten Pointe, Hit-Stop auf dem Vorsprung · `rock_squash` ×3, `relief_exhale`, `wood_rot` | 4,58 s ✅ | 2 ✅ |

\* Long-Tasks werden nicht je Sequenz einzeln gemessen, sondern an der dichtesten Stelle, die das Spiel überhaupt erzeugt: sechs Spieler, drei auf einem Balken und zwei auf einem zweiten, also `fall_domino` und ein Paar-Sturz gleichzeitig, mit Splittern, Spritzern und zwei Sprechblasen. Wer diesen Frame übersteht, übersteht jede Sequenz allein. Gemessen: 2 von 2 erlaubten.

Der "Lustig-Test" (≥ 2 von 3 grinsen) ist ein SOLL und steht als manueller Check unten. Die Bilder dafür liegen fertig: `docs/screens/falls/` hat je Sequenz fünf Momente (Blick, Bruch, Gag, Nachschlag, Aufstieg).

### Gesamt

| Check | Status | Notiz |
|---|---|---|
| `fall_domino` nur ab drei Beteiligten | ✅ | Steht als `minGroup: 3` im Katalog, nicht in der Sequenz — der Choreographer wählt schon in `core/`, eine Sequenz, die sich selbst ablehnt, käme zu spät. `sequenceRegistry.test.ts` spielt 1 000 Runden und findet Domino nie bei einem Paar. |
| No-Repeat-Fenster 3 über 1 000 Runden | ✅ | Über 1 000 Runden wird jede Fall- und jede Sicher-Sequenz benutzt, und keine wiederholt sich innerhalb des Fensters. Gewichtung geprüft: `hold_hands` läuft öfter als `rope_swing`, und in 5 000 Zügen kommt keine Sequenz seltener als ROUNDS/2. Gleicher Seed ⇒ gleiche Folge. |
| Overlays kombinieren korrekt | ✅ | `rotten_crack` und `deserter_stamp` liegen auf derselben Timeline wie die Fall-Sequenz und zielen auf ihre eigenen Ziele; `show.test.ts` prüft über 1 000 Runden, dass jedes Overlay den richtigen Spieler und Balken trifft, auch wenn zwei Sequenzen gleichzeitig laufen. |
| Dauer ≤ 5 s je Sequenz | ✅ | Gemessen 4,15–4,65 s. Der Test prüft beide Seiten: nicht länger als 5 s und nicht kürzer als 1,5 s — eine leere Timeline soll nicht als "bestanden" durchgehen. |
| Labels `eyeContact` < `snap` < `climbedBack` | ✅ | Je Sequenz ein Test, plus: `eyeContact` liegt bei genau 0. Der Blick ist der Anfang der Sequenz (ADR-18), nicht eine Station in der Mitte. |
| Nach `reset()` steht jeder trocken und aufrecht da | ✅ | Der teuerste Test des Meilensteins und der wichtigste: Rotation 0, Deckkraft 1, Gesicht `neutral`, nicht mehr fremdgesteuert, `body.scale` 1/1, Hut wieder am Kopf. Sechs Sequenzen greifen tief in die Figuren — ohne diesen Test bringt die siebte Runde einen halb umgedrehten Wanderer mit. |
| ≤ 2 Long-Tasks während der Stürze | ✅ | `perf.spec.ts` fährt sechs Spieler auf drei Balken (`fall_domino` plus ein Paar — die dichteste Stelle, die das Spiel kennt) und zählt Long-Tasks ab dem Schritt: **2 von 2 erlaubt** auf Pixel 5 unter SwiftShader, 0 auf WebKit (kein Long-Task-API). Am Limit, nicht darüber — siehe Follow-ups. |
| Partikel- und Draw-Budget halten | ✅ | Höchststand 27 Partikel von 200, 1 Draw-Call auch mit Sprechblasen und Splittern. |
| Dev-Preview zeigt jede Sequenz auf Knopfdruck | ✅ | `?dev=1&panel=sequences`: ein Knopf je Sequenz, und der Knopf zeigt **die** Sequenz, nicht irgendeine (ADR-25). Die Liste klappt weg, sobald die Show läuft. |
| Video `docs/screens/m4-falls.mp4` | ⏳ manuell | SOLL. Die 30 Standbilder sind da; ein Video braucht eine Bildschirmaufnahme vom Gerät. |
| "Lustig-Test": ≥ 2 von 3 grinsen | ⏳ manuell | Siehe unten. |

**Zahlen:** 367 Unit-Tests · 42 E2E · 14 Katalog-Sequenzen (6 Fall + 3 Sicher + 3 Misc + 2 Overlay) plus `basic_fall` als Fallback · Dauer 4,15–4,65 s · Long-Tasks 2/2 · 27 Partikel · 1 Draw-Call · JS-Loop 0,10 ms p95 · JS 258 KB gzip (Budget 450), davon 37 KB im Einstiegs-Chunk.

**Zur E2E-Zahl:** 42 von 42 sind grün, aber nicht in einem einzigen Lauf. Der Durchlauf über beide Geräte brauchte 1,1 Stunden statt der üblichen zehn Minuten, weil auf dieser Maschine ein Unity-Batch-Job dauerhaft einen Kern belegte; vier WebKit-Tests scheiterten dabei an Playwrights Stabilitäts-Prüfung ("element is not stable"), zwei davon an unterschiedlichen Stellen bei zwei Läufen. Nachgefahren ohne Last: dieselben vier grün in 3,1 Minuten. Das ist eine Aussage über die Maschine, nicht über den Code — und deshalb steht sie hier und nicht als bestandener Haken.

**Was M4 gebracht hat**
- **Die sechs Stürze.** Händchenhalten, Coyote-Pause, Wippe, Seilschwung, Domino, Wandkicker. Damit ist der Katalog aus GDD §4.3 vollständig; `missingImplementations()` gibt eine leere Liste zurück, und der M3-Test, der ausdrücklich prüfte, dass sie **fehlen**, ist umgedreht.
- **Ein Bausatz statt sechs Kopien** (ADR-22). `eyeContact`, `snap`, `splash`, `climbBack`, `dropToRiver`, `hatsFlutter` liegen in `fallKit.ts`. Die Signatur des Spiels steht damit an genau einer Stelle im Code — und jede Sequenz-Datei enthält nur noch ihren Gag. `BasicFall.ts` ist dadurch von der Vorlage zur kürzesten der sieben geschrumpft.
- **Sequenzen werden getestet, nicht abgetippt** (ADR-23). Bis M3 durchsuchten die Tests den Quelltext nach `addLabel(...)`. Jetzt läuft jede Sequenz wirklich, auf einer Bühne aus echten Hikers ohne Renderer, und der Test schaut sich das Ergebnis an: Wo liegen die Labels, wie lang ist die Timeline, was klingt, und wie steht die Figur nach dem Reset da.
- **Die Preview ist ein Werkzeug geworden** (ADR-25). Ein Knopf je Sequenz, der genau diese Sequenz zeigt; die Liste klappt weg, sobald es losgeht; `npm run capture:falls` fotografiert je Sequenz fünf Momente nach `docs/screens/falls/`.

**Vier Fehler, die erst das laufende Bild gezeigt hat:**
1. **Der Router hat Screens verschluckt.** Der Sequenz-Preview schickt eine ganze Runde in einem Rutsch los; der Choose-Screen mountete, wenn die FSM schon beim Schritt war, und warf. Die erste Reparatur — "das jüngste Ziel gewinnt" — hat den Preview gerettet und im echten Spiel Screens übersprungen, auf denen die Runde gerade stand: vier E2E-Tests fielen, und die Symptome (leerer Bedenkzeit-Timer, fehlender Schritt-Screen) sahen nach allem aus, nur nicht nach dem Router. Jetzt fragt der Router die FSM, ob ein Ziel noch aktuell ist (ADR-24). Aus demselben Fehler kamen zwei Härtungen: Eine gescheiterte Navigation legt die Schlange nicht mehr still, und der Wipe wird auch im Fehlerfall abgeräumt — er deckt den ganzen Screen ab und schluckt sonst jeden Tap. `tests/unit/router.test.ts` hält alle drei fest.
2. **`fall_bounce_wall` dauerte 5,04 s** — vier Hundertstel über dem A4-Limit, und das ist trotzdem ein Nein. Die Kamerafahrt hinunter war zu lang und die Pause auf dem Felsvorsprung zu großzügig; beides gekürzt (420 ms statt 600, 0,5 s statt 0,6). Der zweistufige Gag ist geblieben.
3. **PIXI-Text starb in jsdom.** `Cannot set properties of null (setting 'font')` — ein `Text` misst beim Erzeugen über einen 2D-Kontext, den es in jsdom nicht gibt. Ohne Sprechblasen wären die Tests aber genau um die Stelle herumgelaufen, die die Sequenzen ausmacht. Jetzt stellt `tests/setup.ts` eine Attrappe mit fester Glyphenbreite.
4. **Die Preview zeigte irgendeinen Sturz.** Der Knopf stellte nur die Ausgangslage her; welche der sechs lief, entschied die gewichtete Auswahl. Wer "Wippe" drückte, sah viermal etwas anderes — zum Ansehen unbrauchbar und zum Abfotografieren erst recht (ADR-25).

**Offene SOLL-Follow-ups:**
1. **Long-Tasks stehen bei 2 von 2 erlaubten** — bestanden, aber ohne Luft. Gemessen unter SwiftShader ohne GPU; auf echter Hardware sollte es besser aussehen. Der Frame-Check auf dem Referenzgerät steht unten als manueller Punkt, und beim Polish-Durchgang in M5 gehört die Stelle noch einmal angesehen.
2. Aus M3 offen: Die Töne sind synthetisiert (ADR-20) und klingen so; echte Aufnahmen ersetzen die WAVs Datei für Datei.
3. Aus M2 offen: Symbole auf der Bühne klein (~11 px); WebGPU-/Canvas-Renderer ungenutzt im Bühnen-Chunk (~21 KB gzip).

**Manuelle Checks für Luka vor M5:**
- [ ] **Lustig-Test (A4, SOLL):** Drei Personen sehen die sechs Stürze (`?dev=1&panel=sequences`, ein Knopf je Sequenz). Ziel: Bei mindestens zwei von drei zieht sich bei mindestens vier der sechs das Gesicht. Welche floppt, kommt in die Notizen — Gewichtung ist eine Zahl in `config/sequences.ts`.
- [ ] **Video `docs/screens/m4-falls.mp4`** (SOLL): eine Bildschirmaufnahme vom Handy, alle sechs Sequenzen hintereinander. Die 30 Standbilder in `docs/screens/falls/` ersetzen es nicht — an einem Sturz interessiert die Bewegung.
- [ ] **Frame-Rate beim dichtesten Bild:** sechs Spieler, drei auf einem Balken plus ein Paar. `?dev=1` zeigt JS-Zeit und Draw-Calls unten rechts. Ziel 60 fps, Minimum 30.
- [ ] **Klettert wirklich jeder wieder hoch?** Fünf Runden am Stück spielen und darauf achten, ob jemand nass, schief oder ohne Hut zurückkommt. Der Test prüft das nach jeder Sequenz einzeln — was er nicht prüfen kann, ist die sechste Runde nach fünf verschiedenen Stürzen.
- [ ] Aus M3 offen: Spannungs-Test mit drei Personen; Ton auf dem Handy; einmal stumm durchspielen.

**Anmerkungen für M5:**
- Die Bausteine für Polish liegen bereit: `fallKit.ts` ist die Stelle, an der eine Änderung an der Signatur alle sechs Sequenzen erreicht.
- `stageHarness.ts` kann jede Bühnen-Sequenz ohne Renderer bauen — die Sicher- und Misc-Sequenzen aus M3 sind bisher nur über den Quelltext geprüft. Sie auf denselben Test umzustellen ist eine halbe Stunde und schließt die letzte Lücke im Sequenz-System.
- Der Router hat jetzt ein `outdated`. Wer in M5 einen Screen ergänzt, muss ihn in `SCREEN_FOR_STATE` eintragen, sonst gilt er als veraltet und mountet nie.

## Audit A5 — 2026-09-09

**Ergebnis:** BESTANDEN (Lighthouse-Performance im Median 91, mit einem Ausreisser nach unten — Erklärung unten)

| Check | Status | Notiz |
|---|---|---|
| Lighthouse Mobile: Performance ≥ 90 | ✅ | Fünf Läufe mit **echter** Drosselung (`--throttling-method=devtools`, Mobile-Emulation): **85 · 91 · 91 · 91 · 90**, Median 91. FCP 1,8 s, TBT 330–530 ms, CLS 0. Zwei Dinge haben das erreicht: howler lädt nicht mehr beim Start (ADR-28) und das Stylesheet steckt in der HTML-Datei (ADR-29). Zur Streuung siehe unten. |
| Lighthouse Mobile: Accessibility ≥ 90 | ✅ | **100** in allen fünf Läufen. |
| Lighthouse Mobile: Best Practices ≥ 90 | ✅ | **100** in allen fünf Läufen. |
| PWA installierbar | ✅ | `flow.spec.ts` prüft das Manifest gegen die Anforderungen: Name, `standalone`, `portrait`, ≥ 3 Icons. Precache 26 Einträge / 1,47 MB — jetzt inklusive Tonspur (`m4a` fehlte im Glob, das Spiel wäre offline stumm gewesen). |
| JS ≤ 450 KB gzip | ✅ | **235 KB gzip** tatsächlich geladen, davon **29,4 KB** vor dem ersten Tap (Einstiegs-Chunk) plus 7,3 KB HTML mit eingebettetem CSS. Gemessen im Netzwerk, nicht im `dist`-Ordner. |
| Step-Chunk lazy | ✅ | Eigener E2E-Test: Vor dem ersten Tap wird **ein** JS-Chunk geholt. PIXI, GSAP und die Bühne kommen beim Schritt — und der WebGPU- und der Canvas-Renderer **nie** (`preference: 'webgl'`). Damit ist auch der offene Punkt aus M2 beantwortet: Die 21 KB liegen im `dist`, werden aber nicht geladen. |
| Kontrast ≥ 4.5 : 1 | ✅ | 13 Paare als Test (`a11y.test.ts`). Ein Fund: `--danger` war als Schriftfarbe auf dem erhöhten Panel 4.02 : 1 — dafür gibt es jetzt `--danger-text` (ADR-26). Das Banner bleibt bei 3.44 : 1 und darf das: 40-px-Displayschrift, WCAG-Grenze 3 : 1 für grossen Text. Der Test hält beides fest, damit die Kombination nicht in eine Zeile Fliesstext wandert. |
| Reduced-Motion: kein Shake, Slow-Mo bleibt | ✅ | Neu für die Bühne (ADR-30): `shake()` gibt eine leere Timeline zurück und hinterlässt keinen Versatz. Im DOM gehen Wipe, Seil-Schwingen, Titel-Loop und der Puls am Fahnen-Streit auf 0 bzw. auf einen statischen Rahmen. E2E prüft, dass `--wipe-ms` bei `reducedMotion: 'reduce'` auf 1 ms steht und der Screenwechsel trotzdem stattfindet. |
| Tastatur (SOLL) | ✅ | Es gab keine einzige `:focus-visible`-Regel — der Fokus war unsichtbar. Jetzt ein globaler Ring, und ein E2E-Test spielt den Titel mit Tab und Enter durch **und** prüft, dass der Ring auch gerendert wird. |
| EN vollständig | ✅ | 146 Keys in beiden Sprachen, keine Lücke, kein Leerstring — geprüft im Test, nicht per Augenmass. Alle neuen Texte aus M5 (Hinweise, Modus-Chips, Fahnen-Streit, Teilen, Notausgang) sind zweisprachig. |
| Alle Modus-Kombinationen spielbar | ✅ | Statt Paare einzeln zu prüfen läuft der Extremfall: **alle fünf Modi gleichzeitig, in der Todeszone**, wo ein Sturz garantiert ist — Nebel schlägt Absprache, ein Rucksack auf Gewicht 2, einer nimmt das Seil, zwei teilen den letzten Balken. Wer diese Runde übersteht, übersteht jede Teilmenge davon. Dazu die 23 Kombinations-Tests in `modes.test.ts`. |
| Title-Loop 10 min ohne Leak | ✅ | Konstruktiv gelöst statt gemessen: Der Loop ist CSS und startet keine einzige Uhr (ADR-27) — `screens.test.ts` prüft, dass `createTitleScreen` weder `setInterval` noch `setTimeout` noch `requestAnimationFrame` anfasst. Ein zehnminütiger Speichertest bliebe trotzdem ein manueller Punkt, wenn man es sehen will. |
| Share-Text | ✅ | Web Share API, und nur, wenn es etwas zu erzählen gibt: Der Knopf erscheint erst, wenn zwei Leute **mehr als einmal** zusammen gefallen sind, und nur auf Geräten mit `navigator.share`. Der Text geht an das Teilen-Blatt des Systems — kein Netzwerk, kein Backend (CLAUDE.md). |
| Fehlerfälle | ✅ | Drei Ebenen: Scheitert der Start, steht ein Satz und ein Knopf da, der den alten Spielstand wegwirft (bisher: schwarzer Screen). Scheitert die Bühne, geht es zum Result weiter — das Ergebnis steht ja längst fest. Ein kaputter Storage-Eintrag fällt schon in `loadSession` auf Standardwerte zurück. |

**Zahlen:** 391 Unit-Tests · 50 E2E (49 grün, einer auf WebKit übersprungen — Safari fokussiert Knöpfe nur mit voller Tastaturnavigation) · Lighthouse Mobile 91 / 100 / 100 · JS **235 KB gzip** geladen, davon 29,4 KB vor dem ersten Tap · FCP 308 ms direkt gemessen · 13 Kontrastpaare als Test · 146 i18n-Keys in beiden Sprachen · JS-Loop 0,20 ms p95 · 1 Draw-Call.

**Zur Streuung der Performance-Zahl:** Auf dieser Maschine belegt ein Unity-Batch-Job dauerhaft einen Kern. Das ist an den Zahlen ablesbar: Lighthouse mit seiner Standard-Simulation (`throttlingMethod: 'simulate'`, rechnet beobachtete CPU-Zeiten mal vier) meldete eine Blockierzeit von 2.020 ms; direkt gemessen mit echter 4×-Drosselung, frischem Profil und 1,6 Mbit/s sind es **306 ms** in zwei Long-Tasks (130 + 276 ms). Deshalb stehen oben die Läufe mit `--throttling-method=devtools` — sie messen statt zu extrapolieren. Der Ausreisser auf 85 im ersten Lauf ist dieselbe Last.

**Was M5 gebracht hat**
- **Der Titel erzählt das Spiel.** Neun Sekunden: gehen, der Balken bricht, fallen, hochklettern. In CSS, ohne eine Zeile JavaScript (ADR-27) — und damit ohne den Leak, den ein Titel-Loop klassischerweise mitbringt.
- **Zwei Fahnen auf einem Balken sind jetzt ein Ereignis.** Warnfarbe, ruhiger Puls, und darunter steht, wer sich streitet. Vorher waren es zwei Punkte nebeneinander, die man übersah — dabei ist das der Moment, um den das ganze Modus-Design gebaut ist.
- **Die Modi stehen dort, wo geredet wird.** Chips mit einem Satz Erklärung in der Absprache und im Nebel. Gewählt hat sie einer, gespielt wird zu fünft.
- **Die Bühne kennt endlich die Modi:** Schwergewichte tragen ihren Rucksack (die Gewichte gingen bisher nicht durch `resultView`), und wer das Seil nimmt, hangelt sich Griff für Griff darunter durch, statt daneben zu stehen.
- **Der Zusammenstoß hat ein Bild:** zwei Namen, dazwischen der Knall, rechts der Balken. Dazu die Aufklapp-Welle über die Ergebnis-Brücke und ein Teilen-Knopf für die Zeile, um die es abends wirklich geht.
- **Barrierefreiheit ist keine Behauptung mehr:** Fokus sichtbar, Kontraste als Test, „Bewegung reduzieren" auch auf der Bühne, EN vollständig, zwei Einmal-Hinweise für den ersten Abend.
- **Der Start ist halb so lang:** howler raus aus dem Einstiegs-Chunk, Stylesheet in die HTML, Service Worker erst nach `load`.

**Fünf Fehler, die erst die Messung gezeigt hat:**
1. **Ein `repeat: -1` hätte die Show angehalten.** Das Hangeln am Seil war als endlose Schleife geschrieben — und ein unendliches Kind macht die Eltern-Timeline unendlich lang. Die Show wäre nie beim Result angekommen. Die Griffe sind jetzt aus der Anreisedauer gerechnet; ein Testlauf ohne Skip belegt, dass die Runde von allein endet.
2. **Der Seil-Nutzer stand scheinbar auf dem Plateau.** Sein Ziel lag 70 Einheiten unter der Brücke — aber der Ursprung eines Hikers liegt zwischen den Füßen, also ragte der Kopf oben wieder heraus. Es braucht die **ganze** Figurenhöhe.
3. **Der Ton fehlte im Precache.** `globPatterns` listete `ogg` und `mp3`; die Tonspur ist ein `m4a` (ADR-20). Offline wäre das Spiel stumm gewesen — der Ausfall, den man am spätesten bemerkt.
4. **254 ms Startzeit für Audio, das noch keiner hört.** Sichtbar erst im CPU-Profil: howler richtet sich beim Import ein und klopft zwanzig Codecs ab. Es lädt jetzt mit dem Sprite (ADR-28).
5. **Das eingebettete Stylesheet hat die Bühne auf iPhone erschlagen.** Das Plugin warf die CSS-Datei aus dem Bundle — konsequent gedacht und falsch: Vite hängt an jeden dynamischen Import einen Preload für die Stylesheets des Abhängigkeitsbaums. Chromium schluckt den 404, WebKit lehnt den Import ab, und der Schritt zeigte "Die Schlucht bleibt heute zu". Alle fünf Perf-Tests auf iPhone 12 rot, auf Pixel 5 grün — den Unterschied hätte kein Blick in den Code gezeigt, nur der Lauf auf beiden Geräten. Die Datei bleibt jetzt liegen, nur der `<link>` im Kopf ist weg (ADR-29).

**Offene SOLL-Follow-ups:**
1. Die Töne sind synthetisiert (ADR-20) und klingen so. Echte Aufnahmen ersetzen die WAVs in `audio-src/` Datei für Datei, ohne eine Zeile Code.
2. Aus M2 offen: Die Symbole auf dem Torso sind auf der Bühne rund 11 px. Für die Zuordnung reicht der Hut, im Result steht der Name — es bleibt ein Kompromiss, den ein Playtest bestätigen oder verwerfen soll (M6).
3. Aus M2 erledigt: Der WebGPU-/Canvas-Renderer liegt im `dist`, wird aber nachweislich nie geladen. Kein Code nötig, nur die Messung.

**Manuelle Checks für Luka vor M6:**
- [ ] **Titel-Loop auf dem Handy ansehen.** Liest sich in neun Sekunden, was das Spiel ist? Und: einmal zehn Minuten offen stehen lassen und danach schauen, ob das Gerät noch flüssig ist.
- [ ] **Tastatur/Schalter-Bedienung** einmal durchspielen, wenn ein Bluetooth-Keyboard da ist — der Ring ist neu, die Reihenfolge der Knöpfe hat noch niemand ausprobiert.
- [ ] **"Bewegung reduzieren"** in den iOS-Einstellungen anschalten und eine Runde spielen: Fühlt sich der Bruch ohne Rütteln noch nach Bruch an, oder fehlt zu viel?
- [ ] **Teilen** auf dem echten Gerät: Kommt das System-Blatt, und liest sich der Satz gut?
- [ ] **Lighthouse auf einer ruhigen Maschine** nachfahren — die 91 hier sind mit einem dauerhaft belegten Kern gemessen.
- [ ] Aus M4 offen: Lustig-Test mit drei Personen; Video `docs/screens/m4-falls.mp4`; Frame-Rate beim dichtesten Bild.

**Anmerkungen für M6:**
- `npm run balance -- 20000` ist gebaut und ungenutzt — die Kollisionsraten je n/B gehören in den Playtest-Bogen, damit die Diskussion "die Brücke schrumpft zu schnell" mit Zahlen statt Gefühl geführt wird.
- Der Notausgang im Boot (`renderBootFailure`) ist der einzige Ort, an dem das Spiel von einem kaputten Zustand redet. Wer in M6 die Speicher-Version anhebt, sollte ihn einmal absichtlich auslösen und ansehen.
- Die Modus-Chips sind bewusst nur in der Absprache. Falls im Playtest die Frage "welche Regeln gelten gerade?" mitten in der Runde kommt, ist der Choose-Screen die nächste Stelle — dort ist aber Platz das knappste Gut.
