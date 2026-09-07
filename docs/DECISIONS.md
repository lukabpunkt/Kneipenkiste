# Entscheidungen (ADR-Log)

Format: **ADR-{n} · {Datum} · {Titel}** — Kontext · Entscheidung · Konsequenz (max. 5 Zeilen).

## ADR-1 · 2026-09-07 · Gleicher Stack wie die Schwesterspiele, Module per Kopie
Kontext: Fünf Spiele, eine Familie. Entscheidung: Vite/TS/PixiJS/GSAP; Module kopieren (Tresor ist das architektonisch nächste Spiel), Shared-Package erst nach v1.0 aller Spiele. Konsequenz: Keine Monorepo-Komplexität jetzt.

## ADR-2 · 2026-09-07 · Untergrenze n−1 (Todeszone) und Reparatur nach Kollision
Kontext: Ohne Untergrenze schrumpft die Brücke ins Absurde; ohne Reparatur bleibt sie nach einem Crash klein. Entscheidung: B_min = n−1 mit angekündigter Todeszone (verteilen 2), Reparatur auf n+2 nach jeder Kollision. Konsequenz: Klarer Rhythmus Frieden → Druck → Crash → Neustart.

## ADR-3 · 2026-09-07 · Fake-Knarren + Blickkontakt als Signatur
Kontext: Ein Reveal, bei dem sofort klar ist, wer fällt, hat keine Spannung. Entscheidung: Alle besetzten Balken knarren (sichere mit 70 %), Kollisions-Hikers haben immer Slow-Mo-Blickkontakt vor dem Bruch. Konsequenz: Choreographer-Tests erzwingen Reihenfolge; jede Fall-Sequenz trägt das Label `eyeContact`.

## ADR-4 · 2026-09-07 · Brücke-von-oben als DOM/SVG, nur der Schritt als PIXI
Kontext: Wahl und Übersicht sind Buttons und Listen, kein Rendering-Problem. Entscheidung: Inline-SVG-Komponente `BridgeTop` mit Zuständen für Negotiation/Choose/Result; PIXI ausschließlich für STEP. Konsequenz: Kleinster PIXI-Anteil der Familie, schnelle M1.

## ADR-5 · 2026-09-07 · Distribute-Schnellmodus
Kontext: Meist verteilen 3–6 Spieler je 1 Schluck; Einzel-Iteration mit Pass-Screens wäre länger als die Show. Entscheidung: Quick-Modus (öffentliches Badge-Grid) bei allen Guthaben == 1, Iteration sonst. Konsequenz: Zwei Distribute-Pfade, beide getestet.

## ADR-6 · 2026-09-07 · Repo-Name ohne Umlaut
Kontext: Lokaler Ordner heißt "Hängebrücke"; Umlaute in GitHub-URLs und Vite-`base` sind fehleranfällig. Entscheidung: Repo `Haengebruecke`, `base: '/Haengebruecke/'`, App-Titel bleibt "Die Hängebrücke". Konsequenz: Ordnername und Repo-Name weichen bewusst ab; in CLAUDE.md dokumentiert.

## ADR-7 · 2026-09-07 · Das Seil zählt als Fahnenflucht
Kontext: GDD §3.6 definiert Fahnenflucht als "Fahne gesetzt, dann **anderen Balken** gewählt" — das Seil ist kein Balken und fiel durch die Definition. Entscheidung: Wer eine Fahne setzt und dann das Seil nimmt, ist Fahnenflüchtiger. Konsequenz: Rein statistisch/dramaturgisch (Banner, Session-Statistik); die Auszahlung ändert sich nicht, weil Seil-Nutzer ohnehin nichts verteilen und nie stürzen.

## ADR-8 · 2026-09-07 · Der abfaulende Balken fällt in `resolveRound`, nicht bei RESULT
Kontext: Architektur §3 sagt "Schrumpf-Balken bei RESULT-Eintritt", GDD §4.2 zeigt ihn aber schon im Nachspiel der Show abbrechen. Entscheidung: `resolveRound()` zieht ihn (mit `crypto`) und legt ihn als `removedPlank` ins `RoundResult`. Konsequenz: Ein Entscheidungspunkt statt zwei; `docs/03-ARCHITECTURE.md §3` ist entsprechend zu lesen — die Show inszeniert weiterhin nur, was schon feststeht.

## ADR-9 · 2026-09-07 · Verteilt wird nur, wenn jemand gefallen ist
Kontext: Architektur §5 formuliert das Verteil-Guthaben unbedingt ("sicher → 1"), GDD §3.5 sagt für "alle sicher" ausdrücklich "Niemand trinkt, **niemand verteilt**" — und die Invariante `allSafe ⇒ giving leer` steht in derselben Architektur. Entscheidung: Das GDD gewinnt; Guthaben gibt es nur in Runden mit mindestens einer Kollision. Konsequenz: Design-Pfeiler 3 bleibt scharf — eine friedliche Runde bringt niemandem etwas ein und kostet trotzdem einen Balken. Ein reiner Morsch-Bruch löst kein Verteilen aus.

## ADR-10 · 2026-09-08 · "Auf die Brücke" setzt die Session nicht zurück
Kontext: `go` baute Brücke, Seil-Verbrauch und Rundenzähler neu — damit verlor jede wiederhergestellte Session ihren Fortschritt, sobald der Weg einmal über die Lobby führte (E2E-Befund). Entscheidung: `go` startet nur die Runde; die Brücke folgt ausschließlich einer Änderung der Besetzung (`setPlayers` vergleicht die IDs), `quit` räumt nur die laufende Runde ab. Konsequenz: Neu anfangen ist eine ausdrückliche Geste — "Session zurücksetzen" in den Einstellungen; Reload-Persistenz (Audit A1) funktioniert damit überhaupt erst.

## ADR-11 · 2026-09-08 · Die Brücke ist nur dort ein Touch-Ziel, wo man sie antippt
Kontext: Die 56-px-Regel aus CLAUDE.md auf jede Brücken-Darstellung anzuwenden, schob in der Absprache genau den Satz unter die Falz, an dem das Spiel hängt ("Versprechen sind nicht bindend"). Entscheidung: `BridgeTop` bekommt einen `display`-Modus mit `plankDisplayHeightPx` (34 px) für Negotiation, Result und Step; im Choose-Screen gelten unverändert ≥ 56 px (≥ 48 bei 10 Balken). Konsequenz: Die Touch-Ziel-Regel schützt weiter Buttons, nicht Bilder; der A1-Check misst nur den Choose-Screen.

## ADR-12 · 2026-09-08 · Der Step-Platzhalter spielt das echte StepScript
Kontext: M1 braucht einen DOM-Platzhalter für den Schritt. Ein frei erfundenes Timing hätte die Spannungs-Dramaturgie erst in M3 zum ersten Mal wirklich laufen lassen. Entscheidung: Der Platzhalter spielt `buildStepScript()` mit seinen tatsächlichen Zeiten ab — gleichzeitige Ankunft, Knarren mit Amplituden, Slow-Mo-Blickkontakt vor jedem Bruch, Tap-to-Skip erst danach. Nur das Nachspiel folgt dem letzten Bruch direkt, statt die 5 Sekunden abzuwarten, die ab M4 den Fall-Sequenzen gehören. Konsequenz: M2/M3 tauschen das Rendering, nicht die Choreographie; das Skript ist ab jetzt jede Runde im Einsatz.
