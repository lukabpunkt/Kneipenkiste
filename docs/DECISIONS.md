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
