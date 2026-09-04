# Entscheidungen (ADR-Log)

Format: **ADR-{n} · {Datum} · {Titel}** — Kontext · Entscheidung · Konsequenz (max. 5 Zeilen).

## ADR-1 · 2026-09-04 · Gleicher Stack wie Drinkshot/Tresor, Module per Kopie
Kontext: Drei Spiele, eine Familie. Entscheidung: Vite/TS/PixiJS/GSAP; Module kopieren, Shared-Package erst nach v1.0 aller drei. Konsequenz: Keine Monorepo-Komplexität jetzt.

## ADR-2 · 2026-09-04 · Eigene Mine wird stumm als leeres Feld aufgedeckt
Kontext: Der Kern des Pitches sind "sichere Trittsteine". Würde die eigene Mine sichtbar, wäre der Vorteil weg. Entscheidung: Identischer Code-Pfad zu leerem Feld, `publicView` erzwingt Ununterscheidbarkeit, Test. Konsequenz: Information bleibt asymmetrisch; Beobachten des Grabverhaltens wird zum Meta-Spiel.

## ADR-3 · 2026-09-04 · Temperatur-Hinweise statt Distanzzahlen
Kontext: Exakte Zahlen finden die Kiste in 2 Zügen. Entscheidung: Drei Stufen (Chebyshev 1 / 2 / ≥3). Konsequenz: 4–8 Grabungen pro Runde; Balancing über `rules.ts`.

## ADR-4 · 2026-09-04 · Kiste darf auf verminter Zelle liegen
Kontext: Die letzte Grabung soll nie sicher sein. Entscheidung: Kiste uniform über alle Zellen, "Preis der Gier" als eigenes Ergebnis. Konsequenz: Seltener Doppelmoment, eigene Sequenz.

## ADR-5 · 2026-09-04 · Tokens statt Sofort-Verteilen
Kontext: Verteilen mitten in der Grabphase bricht den Fluss und erfordert Handy-Übergabe. Entscheidung: Trinken sofort, Verteilen gesammelt am Rundenende. Konsequenz: Eigener Distribute-Screen mit Iteration.

## ADR-6 · 2026-09-04 · BoardView als wiederverwendbare PIXI-Komponente mit Modi
Kontext: Das Feld wird in Place, Dig und Result gebraucht und ist interaktiv. Entscheidung: Ein Canvas, Modus-Umschaltung, Canvas wird zwischen Screen-Hosts umgehängt. Konsequenz: Keine Neuinitialisierung, konsistenter Look, ein Hit-Testing-Pfad.

## ADR-7 · 2026-09-04 · Kettenreaktion: eine Ebene, Kisten bleiben verschont, eigene Minen werden gezeigt
Kontext: Das GDD sagt „alle Minen auf den 8 Nachbarfeldern explodieren mit" und lässt drei Fragen offen. Entscheidung: (a) **keine Kaskade** — nur die direkten Nachbarn des Tap-Feldes, sonst räumt ein Tap im dichten Feld das halbe Brett; (b) eine Nachbarzelle mit **Kiste bleibt zu**, sonst könnte die Runde enden, ohne dass jemand die Kiste *gefunden* hat — kein Finder, keine Tokens, kein Moment; (c) auch **eigene Minen des Gräbers** werden mit Legerfarbe gezeigt — der Modus soll Leger verraten, und der Trittstein ist in diesem Moment ohnehin verbraucht. Konsequenz: der einzige Ort, an dem ADR-2 nicht greift; erklärt in `board.ts#applyChainReaction`, acht Tests.

## ADR-8 · 2026-09-04 · `minesRemaining` zählt gezeigte Explosionen, nicht verbrauchte Minen
Kontext: Architektur §4 gibt dem `publicView` die „Anzahl verbleibender Minen gesamt". Zählt man sie ehrlich, sinkt sie bei jedem stumm aufgegrabenen eigenen Trittstein — und jeder am Tisch liest an dieser Ziffer ab, was das Spiel verschweigt. Entscheidung: `minesRemaining` = Minen gesamt minus Summe der `blamed` über gezeigte Krater; verbrauchte eigene Minen bleiben in der Zahl stehen. Konsequenz: Die Zahl ist nach einem Trittstein bewusst „falsch" und genau deshalb richtig; im Feld-Replay stimmt am Rundenende wieder alles. Test in `publicView.test.ts`.

## ADR-9 · 2026-09-04 · Temperatur-Hinweise rechnen gegen alle Kisten, auch gefundene
Kontext: Bei „Zwei Kisten" könnten die Hinweise nach dem ersten Fund auf die verbleibende Kiste umschwenken — dann bedeuten schon offen liegende Hinweise plötzlich etwas anderes als beim Aufgraben. Entscheidung: `hintFor` misst immer zur nächstgelegenen Kiste über **alle** Positionen; ein gezeigter Hinweis ändert nie seine Bedeutung. Konsequenz: Hinweise neben der gefundenen Kiste sind danach nutzlos, aber nie irreführend (Design-Priorität 4).

## ADR-10 · 2026-09-04 · Rundensimulation mit zwei Grabstrategien
Kontext: Der Property-Test (M0.5) braucht einen Rundensimulator, der später auch das Balancing trägt (M6.2). Mit rein zufälligen Zügen liegt der Median bei 13 Grabungen — dem Erwartungswert für blindes Suchen; gegen die Zielwerte aus A6 (4–8) sieht das nach einem Balancing-Fehler aus, heißt aber nur, dass niemand die Hinweise liest. Entscheidung: `simulateRound` bekommt `strategy: 'random' | 'hints'`; der Property-Test nutzt `random` (trifft alle Ergebnisarten), das Balancing `hints`. Konsequenz: Die Kennzahlen sind interpretierbar; die Heuristik hat eine dokumentierte Schwäche bei zwei Kisten.
