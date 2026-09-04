# Entscheidungen (ADR-Log)

Format: **ADR-{n} · {Datum} · {Titel}** — Kontext · Entscheidung · Konsequenz (max. 5 Zeilen).

## ADR-1 · 2026-09-03 · Gleicher Stack wie Drinkshot, Module per Kopie
Kontext: Zwei Spiele, gleiche Design-Sprache, gleiche Charaktere. Entscheidung: Vite/TS/PixiJS/GSAP; wiederverwendbare Module werden kopiert, kein Shared-Package vor v1.0 beider Spiele. Konsequenz: Keine Monorepo-Komplexität jetzt; Refactor zu `@party/core` im Backlog.

## ADR-2 · 2026-09-03 · Bankgebühr + Deckel + Jackpot
Kontext: "Alle teilen" ohne Kosten führt zu Endlos-Frieden — für ein Trinkspiel tödlich. Entscheidung: 1 Schluck Gebühr pro Friedensrunde, Deckel, Jackpot-Platzen. Konsequenz: Jede Runde fließt etwas; Druck steigt messbar; Balancing-Werte nur in `rules.ts`.

## ADR-3 · 2026-09-03 · Reveal-Reihenfolge Teiler → Diebe
Kontext: Zufällige Reihenfolge verpufft die Spannung, wenn der Dieb früh kommt. Entscheidung: Teiler zuerst, Diebe zuletzt, Maulwurf als letzter Dieb; Spieler wissen das. Konsequenz: Spannung bis zur letzten Karte in jeder Runde; Doppel-Dieb-Twist inszenierbar.

## ADR-4 · 2026-09-03 · Freie Verteilung durch den Alleindieb
Kontext: Automatisches Gleichverteilen wäre fair, aber langweilig. Entscheidung: Dieb verteilt frei per Verteil-UI, auch alles auf eine Person. Konsequenz: Rache ist Feature; zweiter Comedy-Moment; Summe wird per Invariante getestet.

## ADR-5 · 2026-09-03 · Mindestens 3 Spieler
Kontext: Bei 2 ist die Reveal-Reihenfolge trivial und das Dilemma flach. Entscheidung: Lobby startet erst ab 3. Konsequenz: Klarer Fehlertext; keine Sonderregeln für n = 2.

## ADR-6 · 2026-09-04 · Datenmodell in `core/types.ts`
Kontext: `payout.ts` braucht die Eid-Regel aus `modes.ts`, `modes.ts` braucht den Typ `Choice` — ein Zyklus. Entscheidung: Die Typen aus Architektur §4 leben in `src/core/types.ts`; beide Module importieren von dort. Konsequenz: Eine Datei mehr als in Architektur §2 gelistet, dafür keine zirkulären Imports; Architektur §2 wurde ergänzt. Zusätzlich trägt `RoundResult` das Feld `distributableSips` — die Verteil-UI braucht ihr Budget explizit, sonst müsste sie die Meineid-Regel nachrechnen.

## ADR-7 · 2026-09-04 · Erzwungene Diebstähle zählen nicht für den Vertrauens-Index
Kontext: Der Maulwurf *muss* stehlen. Zählte das als Verrat, wäre der Vertrauens-Index — laut GDD §7 der Grund, nochmal zu spielen — verfälscht und die Ausrede „Ich war der Maulwurf!" wertlos. Entscheidung: Runden, in denen ein Spieler der Maulwurf war, fallen aus seinem Vertrauens-Index und seiner Verrats-Streak heraus. Konsequenz: `PlayerStats.freeRounds` zählt nur freie Entscheidungen; `trustIndex` ist `null`, solange es keine gab.

## ADR-8 · 2026-09-04 · Lila folgt Drinkshot (`#AF73EE`), nicht dem GDD-Hex
Kontext: GDD §3.1 fordert Farben „identisch zu Drinkshot", nennt für Lila aber `#A55EEA`, während Drinkshot `#AF73EE` verwendet. Entscheidung: Die Identität der Charaktere wiegt schwerer als die Hex-Notiz — es gilt `#AF73EE`. Konsequenz: Crooks und Shotlings sind dieselben Figuren; `tests/unit/config.test.ts` friert den Wert ein. GDD §3.1 wurde entsprechend korrigiert.

## ADR-9 · 2026-09-04 · SILENCE ist ein eigener State
Kontext: Architektur §3 notiert die Nachtschicht als Klammer an NEGOTIATION. Sie ist aber ein anderer Screen mit anderem Inhalt (10 s Stille, tickende Uhr, keine Auszahlungstabelle). Entscheidung: eigener FSM-State `SILENCE` parallel zu `NEGOTIATION`, gleiche ein- und ausgehende Kanten. Konsequenz: Der Router bekommt in M1 einen sauberen Screen statt einer Sonderbehandlung; die FSM-Tests decken beide Pfade getrennt ab.

## ADR-10 · 2026-09-04 · Tooling und Assets aus Drinkshot kopiert
Kontext: Drinkshot steht bei M4; Roadmap M0 sagt, fertige Module zu kopieren statt neu zu bauen. Entscheidung: `core/store.ts`, `core/rng.ts`, `core/i18n.ts`, `styles/base.css`, `scripts/build-atlas.mjs`, `scripts/build-audio-sprite.mjs` sowie die Tooling-Configs sind Kopien mit Tresor-Anpassungen; `i18n.ts` wurde um `tList()` für Kassels Sprüche erweitert. Ergänzt um `scripts/build-icons.mjs` (PWA-Icons aus `assets-src/svg/app-icon.svg`). Konsequenz: M0 baut auf erprobtem Code; ein gemeinsames `@party/core` bleibt Backlog (ADR-1).

## ADR-11 · 2026-09-04 · TEILEN zeigt anstoßende Gläser statt eines Handschlags
Kontext: GDD §3.4 und Art Direction §4.1 fordern für die TEILEN-Karte „zwei Hände, die sich schütteln". Bei 60 px Kantenlänge und 3,6 px Strichstärke wird ein Handschlag unlesbar — im Test las er sich als Korb. Entscheidung: zwei anstoßende Gläser mit Funken. Konsequenz: Dieselbe Aussage („wir sind uns einig"), auf einen Blick lesbar, zitiert die `share_toast`-Inszenierung aus GDD §4.4 und passt zur Schluck-Währung; GDD §3.4 und Art Direction §4.1 wurden angepasst.

## ADR-12 · 2026-09-04 · Der Reveal-Platzhalter hält schon die Reveal-Gesetze ein
Kontext: Roadmap M1.5 verlangt nur „Karten als einfache Liste nacheinander umdrehen". Entscheidung: Der DOM-Platzhalter liest trotzdem `result.revealOrder` (Teiler zuerst, Diebe zuletzt, Maulwurf am Ende) und respektiert die Tap-to-Skip-Regel (ab Karte 2, nie bei der letzten). Konsequenz: Das Spiel ist ab M1 wirklich party-tauglich — die Spannung kommt aus der Reihenfolge, nicht aus den Effekten; die E2E-Zusicherungen zu ADR-3 gelten schon jetzt und überleben den Umbau in M3.

## ADR-13 · 2026-09-04 · Die Maulwurf-Karte bleibt bedienbar
Kontext: Die verriegelte TEILEN-Karte war mit `aria-disabled="true"` ausgezeichnet. Entscheidung: Sie bekommt stattdessen ein sprechendes `aria-label` und bleibt fokussierbar. Konsequenz: Der Maulwurf erfährt beim Antippen, dass die Karte existiert und warum sie gesperrt ist (Rütteln + „Nicht für dich"); ein totes Element hätte ihm genau diese Information verschwiegen — und Screenreader-Nutzer noch mehr.

## ADR-14 · 2026-09-04 · Atlanten nach Zeichenreihenfolge, nicht nach Thema
Kontext: Sechs thematische Atlanten (crooks, cards, vault, room, props, kassel) hätten pro Frame bis zu sechs Texturwechsel bedeutet — Audit A2 erlaubt drei. Entscheidung: Drei Atlanten entlang der Zeichenreihenfolge — `back` (Wand, Laser, Tisch, Tresor), `crooks` (alle Figuren inkl. Herrn Kassel), `front` (Karten, Requisiten, Licht, Sprechblase). Konsequenz: Gemessen 2 Draw-Calls bei acht Crooks. Zwei Dinge liegen dafür bewusst „falsch": die Farbsymbole doppelt (`crooks/symbols` für den Torso, `cards/symbols` für die Kartenrückseite) und das Licht beim `front`-Atlas statt beim Raum — beides billiger als ein Texturwechsel.

## ADR-15 · 2026-09-04 · PIXI und GSAP nur im Reveal-Chunk
Kontext: Ein statischer Import von `StageApp` im Negotiation-Screen zog PixiJS und GSAP in den Einstiegs-Chunk — 170 KB gzip für jeden Screen, obwohl nur die Aufdeckung sie braucht. Entscheidung: Alle `game/`-Module werden dynamisch importiert; der Negotiation- und der Silence-Screen stoßen den Preload per `import()` an. Konsequenz: Einstiegs-Chunk 25 KB gzip, Bühnen-Chunk 92 KB gzip und lädt während der Verhandlung. Architektur §1 („Reveal-Chunk lazy") ist damit umgesetzt, nicht nur geplant.

## ADR-16 · 2026-09-04 · Die Sprechblase ist ein 9-Slice-Sprite
Kontext: Als `Graphics` gezeichnet kostete Kassels Sprechblase zwei zusätzliche Draw-Calls (Rahmen + Text) — gemessen 4 statt 3, sobald er sprach. Entscheidung: Der Rahmen ist ein `NineSliceSprite` aus dem `front`-Atlas, der Zipfel ein eigener Sprite; nur der Text bleibt ein `Text`. Konsequenz: 2 Draw-Calls auch während er spricht. Der Text bleibt bewusst kein BitmapText — Kassels Sätze kommen aus der i18n, sind zweisprachig und voller Umlaute.

## ADR-17 · 2026-09-04 · Die Bühne skaliert auf die Breite
Kontext: Drinkshots Arena passt komplett ins Bild (`Math.min`), weil sie ein Kreis ist. Im Hochformat wäre der Tresorraum damit ein Streifen in der Mitte; mit `Math.max` läge dagegen der halbe Halbkreis außerhalb des Bildes. Entscheidung: `scale = width / 1000`, vertikal zentriert; Wand und Boden reichen bewusst weit über die Weltgrenzen hinaus. Konsequenz: Der Halbkreis nutzt die volle Breite, die Komposition steht im unteren Bilddrittel — dort, wo auf einem Handy der Daumen und der Blick sind.

## ADR-18 · 2026-09-04 · Der Reveal-Screen protokolliert, was er zeigt
Kontext: Ab M2 ist die Aufdeckung ein Canvas — ein E2E-Test kann dort nicht mehr nachsehen, welche Karte aufgedeckt wurde. Entscheidung: Der Screen schreibt jede aufgedeckte Karte als `playerId:choice` in `data-revealed`. Konsequenz: Die wichtigste Zusicherung des Spiels — gezeigte Karten == getroffene Wahlen, in der Reihenfolge aus `revealOrder` — bleibt prüfbar; A3 („1 000 simulierte Runden") baut darauf auf.

## ADR-19 · 2026-09-04 · Platzhalter-Sounds werden synthetisiert, nicht geladen
Kontext: GDD §6 nennt ein howler-Sprite mit 26 Cues. Es gibt aber keine Sounddateien, und die Toolchain hat keinen OGG/MP3-Encoder. Entscheidung: Der `AudioManager` erzeugt die Cues zur Laufzeit über Web Audio (Oszillator + Rauschen + Hüllkurve), hinter genau der API, die ein howler-Sprite ebenfalls bedienen würde. Konsequenz: Kein Byte Bundle, offline ab dem ersten Start, und die Cues liegen exakt auf der Zeitachse der Show — Audit A3 fordert ±50 ms Sound-Sync, was mit dekodierten Dateien schwerer zu halten wäre. In M6 tauscht man den Klangerzeuger hinter der Fassade aus, ohne einen Aufrufer anzufassen. Übernommen aus Drinkshot (dortige ADR-20).

## ADR-20 · 2026-09-04 · Die Outcome-Auswahl trifft der Director, nicht `payout.ts`
Kontext: Architektur §5 sieht `resolveRound()` mit einem `pickOutcomeSequence`-Haken vor. Die Registry lebt aber im Bühnen-Chunk, der erst während der Verhandlung lädt (ADR-15) — der Regelkern dürfte sie nur kennen, wenn PixiJS zurück in den Einstiegs-Chunk wanderte. Entscheidung: `resolveRound()` trägt den Platzhalter `basic_outcome` ein; der `RevealDirector` ersetzt ihn durch die gewichtete Wahl aus der Registry. Konsequenz: Der Regelkern bleibt frei von der Bühne, und deterministisch bleibt es trotzdem — beide ziehen aus demselben Runden-Seed.

## ADR-21 · 2026-09-04 · Canvas-Stub im Unit-Setup
Kontext: Sobald ein Unit-Test ein Modul importiert, das irgendwo PixiJS berührt, ruft PIXI beim Laden `canvas.getContext('2d')` auf und jsdom schreibt einen mehrzeiligen „Not implemented"-Stacktrace nach stderr — bei jedem Lauf, ohne dass etwas kaputt wäre. Entscheidung: `tests/setup.ts` stubbt `getContext` für 2D und gibt für WebGL bewusst `null` zurück. Konsequenz: Die Testausgabe bleibt lesbar, und niemand hält den Stub für ein Canvas — wer wirklich rendern will, gehört in die E2E-Suite.
