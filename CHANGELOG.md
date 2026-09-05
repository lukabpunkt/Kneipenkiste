# Changelog

Alle nennenswerten Änderungen, ein Abschnitt je Meilenstein. Die Entscheidungen dahinter
stehen in [`docs/DECISIONS.md`](docs/DECISIONS.md), die Audit-Berichte in
[`docs/PROGRESS.md`](docs/PROGRESS.md).

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [SemVer](https://semver.org/lang/de/).

## [Unveröffentlicht]

- Playtest (Audit A6) und die Top-5-Findings daraus. `v1.0.0` wird erst danach getaggt
  (ADR-22): Rundenlänge und Explosionsrate stellt der Tisch scharf, nicht die Simulation.

## [0.5.0] — 2026-09-05 — Polish, Modi, Accessibility

### Neu

- **Title-Loop**: Der Digger gräbt, fliegt aus dem Bild und kommt zurück — als DOM, nicht
  als PixiJS, damit der Einstiegs-Chunk ohne Renderer bleibt (ADR-19).
- **Nachtgräber-Look**: dunkleres Feld, zwei Laternen — ohne zusätzlichen Draw-Batch.
- **Zwei-Kisten-Anzeige** in der Grabphase, **Sprengmeister**- und **Feigling**-Titel im
  Result, Abzeichen für den gefährlichsten Leger.
- **Result-Juice**: Schluck-Balken mit Count-Ups, Replay-Welle mit Ton.
- **Share-Text** über die Web Share API, mit Zwischenablage als Rückfallebene.
- **Idle-Wackeln**: alle paar Sekunden bewegt sich eine verdeckte Platte.
- Einmaliger Erklärtext zur Temperatur beim ersten Graben.

### Geändert

- „Bewegung reduzieren" nimmt jetzt auch die **Kamerafahrt** heraus und macht aus der
  Replay-Welle einen Fade.
- Kontrast-Regel festgehalten: Auf hellem Grund trennt die Ink-Kontur, auf dunklem die
  Farbe (ADR-20). Farbabstände werden als ΔE gerechnet, nicht als WCAG-Kontrast.

### Behoben

- Der Router zeigte eine weiße Fläche, wenn eine Screen-Fabrik warf — jetzt steht dort
  eine Ersatzseite mit Neu-laden-Knopf.
- `share()` meldete „in die Zwischenablage kopiert", obwohl es gar keine Zwischenablage
  gab: `await undefined` gelingt eben.

## [0.4.0] — 2026-09-05 — Die acht Hit-Sequenzen

### Neu

- **8 Hit-Sequenzen** (GDD §4.1): `classic_launch`, `soot_face`, `helmet_rocket`,
  `shovel_pretzel`, `tree_landing`, `crater_hop`, `chain_dance`, `dud_then_boom`.
- **Effekt-Kasten** (`fx/`): Rauch, Erde, Sternchen, Blätter, Konfetti aus Pools, mit
  harten Obergrenzen aus dem Partikel-Budget (ADR-16).
- Der Digger bekommt abnehmbaren Helm, Haarfächer, Brezel-Schaufel, weiße Fahne und
  zappelnde Beine.

### Behoben

- `fromTo` schrieb seine Startwerte beim **Bauen** der Sequenz — der Digger sprang in
  `hit_crater_hop` schon während der Anticipation in den Krater (ADR-17).
- `hit_dud_then_boom` hielt den Knall 1,35 s zurück, während das Banner das Ergebnis
  längst zeigte. Jetzt 0,85 s (ADR-18).

## [0.3.0] — 2026-09-05 — Leer-, Blindgänger- und Treasure-Sequenzen, Ton

### Neu

- **Sequenz-Registry**: gewichtete Auswahl, No-Repeat-Fenster, Filter nach Stapelhöhe und
  Modus. Sequenzen sehen die Bühne nur durch schmale Interfaces (ADR-14).
- **4 Leer-Varianten** mit Temperatur-Reaktionen, **`dud_pfff`**, **3 Treasure-Sequenzen**.
  Der stumme eigene Trittstein teilt sich Pfad, IDs und Töne mit dem leeren Feld.
- **Ton**: 26 Cues und zwei Musik-Loops, zur Laufzeit synthetisiert — null Bundle-Bytes,
  und die Cues liegen exakt auf der Zeitachse (ADR-13).
- Dev-Vorschau für alle Sequenzen (`npm run preview:sequences`).

### Geändert

- Das Trink-Banner läuft parallel zur Sequenz; nach einem leeren Feld entfällt es ganz.
  Der häufigste Ausgang des Spiels ist damit auch der schnellste (ADR-15).

### Behoben

- Der Verteil-Screen entschied per Timer, ob ein Druck lang war — ein blockierter
  Haupt-Thread machte aus einem Tap einen Abzug. Jetzt entscheiden die Ereigniszeiten.

## [0.2.0] — 2026-09-05 — Das Feld als PixiJS-Bühne

### Neu

- Erdplatten, Diggers mit Bauhelm in Spielerfarbe, Wiese mit Zaun, Baum und Bänken.
- **DigDirector**: Kamera-Zoom, Anticipation („Jenga-Sekunde"), Aufdecken, Farbring der
  Leger ≤ 300 ms nach dem Explosions-Frame.
- Ein PIXI-Singleton; das Canvas wandert zwischen den Screens (ADR-6).
- Board-Chunk lädt lazy — Titel und Lobby starten ohne Renderer.

### Geändert

- Welt auf Hochformat 1000 × 1500, damit Platten über 56 px bleiben (ADR-12).
- Jeder Farbring trägt zusätzlich sein Symbol (Deuteranopie).

## [0.1.0] — 2026-09-04 — UI-Flow

### Neu

- Alle acht Screens, Router mit Wipe, FSM, Session-Persistenz, DE/EN, PWA, Haptik,
  Wake-Lock, Timer-Ring.

## [0.0.1] — 2026-09-04 — Board-Logik

### Neu

- Reine Spiellogik: `board` · `payout` · `modes` · `turn` · `fsm` · `session` · `simulate`.
- **Die Regel, die das Spiel trägt**: Eine aufgegrabene eigene Mine ist von einem leeren
  Feld nicht zu unterscheiden — in Daten, Bild und Ton (ADR-2).
- Kistenposition ausschließlich über `crypto.getRandomValues`.
