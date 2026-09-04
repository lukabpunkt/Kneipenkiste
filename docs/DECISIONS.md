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
