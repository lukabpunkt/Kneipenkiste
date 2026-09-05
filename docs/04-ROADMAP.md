# SPRENGMEISTER — Roadmap: Meilensteine, Schritte, Audits

> Version 1.0 · Ein Meilenstein pro Claude-Code-Auftrag. Jeder endet mit Audit (`05-AUDITS.md`) und Git-Tag. Fortschritt in `docs/PROGRESS.md`.

**Prompt-Vorlage:** *"Lies CLAUDE.md und docs/. Setze Milestone M{n} aus docs/04-ROADMAP.md vollständig um. Halte dich an die Definition of Done. Führe danach Audit A{n} aus docs/05-AUDITS.md durch und schreibe den Report nach docs/PROGRESS.md."*

Wenn Drinkshot/Tresor bereits M2 hinter sich haben: In M0 die dort fertigen Module kopieren (Architektur §1).

---

## M0 — Setup & Board-Logik (reine Funktionen, komplett getestet)  (Tag `v0.0.1`)

**Ziel:** Konfiguriertes Projekt, PWA-installierbar, und die **gesamte Spiellogik** (Board, Dig, Payout, Modi, Turn) als getestete reine Funktionen — ohne UI.

1. Vite + TS strict, Dependencies, Ordnerstruktur nach Architektur §2.
2. `config/theme.ts`, `rules.ts` (Feldgröße je n, 2 Minen, Trinkwert 2/Mine, Tokens 4/6, Hinweis-Schwellen 1/2, Modi-Parameter, Timer), `choreo.ts` (Anticipation 250+3×120+200 ms, Banner 2.2 s, Replay-Welle 40 ms/Ring).
3. `core/store.ts`, `core/fsm.ts` (alle States aus Architektur §3 inkl. DISTRIBUTE-Iteration), Tests pro Übergang.
4. `core/rng.ts`, `core/board.ts` nach Architektur §5 (createBoard, placeMine/removeMine, placeTreasure mit `crypto`, hintFor, dig, publicView, replayView), `core/payout.ts`, `core/modes.ts`, `core/turn.ts`.
5. **Test-Matrix:** alle `kind`-Fälle (empty, eigene Mine stumm, crater 1×/2× Stapel, dud, treasure, greed, greed mit Stapel), Kettenreaktion, Zwei Kisten, Nachtgräber-Hints, Sprengmeister-Bonus (beide Fälle), Turn-Rotation, Timer-Fallback; **`publicView.test.ts`** (eigene Mine ≡ leer; nie ungeöffnete Minen; kein Screen referenziert `board.mines`); Property-Test 10 000 Runden.
6. `core/session.ts` (Scoreboard, verursacht/kassiert, Kisten, "Meistgesprengt", "Gefährlichster Leger", Persistenz), Tests.
7. i18n, tokens.css, Fonts, index.html (Portrait-Frame, CSP, Landscape-Overlay), PWA, CI/Deploy, README/PROGRESS/DECISIONS.

**DoD:** `npm test` grün, `core/` ≥ 95 % Branch-Coverage, Titel auf Handy, PWA installierbar, CI grün.

→ **Audit A0**

---

## M1 — Kompletter UI-Flow mit DOM-Platzhalter-Feld  (Tag `v0.1.0`)

**Ziel:** Von Lobby bis Result durchspielbar. Das Feld ist ein **DOM-Grid** aus Buttons (Place und Dig), Ergebnisse als Text-Toasts. **Ab hier auf einer Party spielbar.**

1. Router + Wipes, Komponenten (Button, Badge, Sheet, Toast, TurnBanner, DrinkBanner, TokenStack, TimerRing).
2. Title, Lobby (3–8, Feldgrößen-Anzeige, Modus-Chips mit 1-Satz-Erklärung, Timer-Chips, Validierung < 3), Settings/Rules-Sheets.
3. Pass, Place (DOM-Grid, Toggle bis Limit, Doppelagent-Werkzeug-Chip, "Vergraben" erst bei Limit, Bedenkzeit-Timer mit Zufalls-Fallback), Buried.
4. Dig (DOM-Grid mit Zuständen als CSS-Klassen: offen/Hinweis-Emoji/Krater mit Legerfarben-Punkten/Kiste; Turn-Banner; Drink-Banner; Kill-Feed-Toast; Zug-Timer; Board-Lock während Banner), Rundenende.
5. Distribute (Iteration über Token-Besitzer, Pass-Light, Flaschen-Tap-UI, "Auszahlen" bei 0 Rest, nicht an sich selbst), Result (Banner, Feld-Replay als DOM-Grid mit allen Minen, Trinker, Kill-Feed, Statistik-Sheet, Buttons).
6. Back-Dialog, Wake-Lock-Stub, Haptik-Stub.
7. E2E: 4 Spieler, 2 Runden (Runde 1: Explosion + Kiste; Runde 2: Preis der Gier), Doppelagent-Runde, Kettenreaktion-Runde; Mobile-Emulation. E2E darf die Kistenposition über einen Test-Seed steuern (`?seed=` nur im Dev-Build).

**DoD:** Party-tauglich; alle Ergebnisarten korrekt angezeigt; Verteilung korrekt; Replay zeigt alle Minen; keine hardcodierten Strings; Touch-Ziele ≥ 56 px im Grid.

→ **Audit A1**

---

## M2 — PIXI-Feld, Tiles & Diggers (Rendering + Interaktion)  (Tag `v0.2.0`)

**Ziel:** Das DOM-Grid wird durch die `BoardView` ersetzt. Platten sehen aus wie in der Art Direction, Digger sitzen auf der Bank, Taps funktionieren, Zustände wechseln — noch **ohne** Sequenzen (Ergebnis erscheint direkt nach der Anticipation).

1. Assets: Shotling-Atlas übernehmen + Digger-Ergänzungen (Helm, Weste, Schaufel ×2, Ruß-Overlay, Haar-Fächer, 6 Gesichter, weiße Fahne), Platten (4 Deko-Varianten, Zustände), Tiere ×4, Bombe/Lunte, Blindgänger-Schild, Kiste ×3 Zustände, Feld (Wiese, Zaun, Baum, Hügel, Schild, Bank), Temperatur-Icons, "Phew"-Schild, Fx-Sprites (Rauch ×3, Erdklumpen, Sternchen, Ring).
2. `BoardApp` (Singleton, Canvas-Umhängen zwischen Screen-Hosts), `Field`, `Tile` (alle Zustände + Übergänge), `BoardView` (Modi place/dig/replay/idle, Hit-Areas, Lock, `tileTap`), `Digger` (walkTo/dig/soot/reset, Idle), `Camera`.
3. Layout 5 × 5 / 6 × 6, Bank unten bzw. unten+oben, logische Welt 1000 × 1000.
4. `DigDirector` **Basis**: Anticipation (Laufen, 3 Stöße, Zittern), dann direkter Tile-Zustandswechsel, ColorRing ≤ 300 ms, Banner, Unlock. Platzhalter-Sequenzen `basic_*` je Kind.
5. Replay-Welle im Result; Place-Modus mit Bombe-Reinschieben-Animation.
6. Preload während LOBBY; Low-Effects-Auto-Detect; Dev-Panel (Seed, Reveal mines, FPS, Spieleranzahl).

**DoD:** 6 × 6 + 8 Digger 60 s p50 ≤ 16.7 ms; ≤ 3 Draw-Batches; Taps treffen zuverlässig (E2E mit Touch-Emulation); Look-Check bestanden; Anticipation fühlt sich nach "Jenga-Sekunde" an (Luka-Urteil).

→ **Audit A2**

---

## M3 — Sequenzen Teil 1: Leer, Hinweise, Blindgänger, Treasure  (Tag `v0.3.0`)

**Ziel:** Alles außer den Hit-Sequenzen ist final: die vier Leer-Varianten mit Tieren und Temperatur-Reaktionen, der Blindgänger, die drei Treasure-Sequenzen inklusive "Preis der Gier" (mit Platzhalter-Explosion), Kettenreaktions-Darstellung, Audio.

1. `Sequence.ts` Interfaces, Registries, gewichtete Auswahl, No-Repeat 3, Filter (`minStack`, `excludeInModes`); Unit-Tests der Registry.
2. `empty/Worm, Beetle, Bone, Boot` + Digger-Temperatur-Reaktionen (sweat/brow/shiver); `dig_own_mine_silent` = derselbe Pfad (Test: gleiche Sequenz-IDs, gleiche Sounds).
3. `dud/Pfff`.
4. `treasure/Fanfare, TooHeavy, Greed` (Greed nutzt vorerst `basic_hit`-Explosion).
5. Kettenreaktion: Nachbar-Krater-Welle mit Ringen, ohne Banner.
6. AudioManager + Sprite mit allen Sounds; Musik-Loops; Herzschlag nicht nötig — stattdessen Tick pro Zug.
7. Wake-Lock, Haptik.
8. `perf.spec.ts`.

**DoD:** Jede Sequenz mit Unit-Test (Dauer ≤ 3.5 s, Treasure ≤ 5 s, Reset-Invariante) und Dev-Preview; Perf grün; Sound-Sync ± 50 ms.

→ **Audit A3**

---

## M4 — Sequenzen Teil 2: Die 8 Hit-Sequenzen (das Herzstück)  (Tag `v0.4.0`)

In 2 Sessions (4a: ClassicLaunch, SootFace, HelmetRocket, ShovelPretzel · 4b: TreeLanding, CraterHop, ChainDance, DudThenBoom + Greed-Explosion final).

1. Pro Sequenz: Datei, `build()`-Timeline mit Sound-Cues, ColorRing-Label ≤ 300 ms nach Explosions-Frame (Test), Unit-Test, Dev-Preview.
2. Ruß-Zustand des Diggers bleibt bis Rundenende; `reset()` am Rundenstart.
3. `hit_chain_dance` nur bei Stapel ≥ 2; `hit_dud_then_boom` nicht im Doppelagent-Modus (Registry-Filter-Tests).
4. Gemeinsame Fx extrahieren (Rauchpilz, Erdklumpen, Helm-Physik, Sternchen).
5. `sequenceRegistry.test.ts`: alle IDs, Gewichte, No-Repeat über 1 000 Runden, Filter.

**DoD:** 8 Hits, jeder in 1 s lesbar (wer, wie viel, wer war's), alle 7 Animationsprinzipien, Perf grün während jeder Sequenz.

→ **Audit A4**

---

## M5 — Polish, Modi-Feinschliff, Juice & Accessibility  (Tag `v0.5.0`)

1. Title-Loop (Digger gräbt und fliegt), Musik, Lobby-Juice, Platten-Idle-Wackeln.
2. Modi final im UI erklärt; Sprengmeister-Bonus-Banner ("SPRENGMEISTER!" / "Feigling…"); Zwei-Kisten-Anzeige; Nachtgräber-Look (dunkleres Feld, Laternen).
3. Result-Juice: Replay-Welle mit Sound, Count-Ups, Statistik-Balken, "Gefährlichster Leger"-Badge, Share-Text (Web Share API: "Rudi hat Anna dreimal in die Luft gejagt 💣").
4. Haptik-Muster, Reduced-Motion, A11y (Fokus, aria-live für Banner, Kontrast), EN komplett, Onboarding-Tooltips.
5. Bundle-Analyse, Board-Chunk lazy, Fehler-Resilienz.

**DoD:** Lighthouse Perf ≥ 90, A11y ≥ 90; Bundle-Budget; alle Modi + Kombinationen spielbar; EN vollständig.

→ **Audit A5**

---

## M6 — Playtest & Release 1.0  (Tag `v1.0.0`)

1. Playtest-Protokoll (A6), `docs/PLAYTEST-01.md`, Top-5-Findings beheben.
2. Balancing-Pass: Minen pro Spieler, Trinkwert, Token-Wert, Hinweis-Schwellen (nur in `rules.ts`, mit ADR). Simulations-Panel als Grundlage (Rundenlänge-Verteilung).
3. Geräte-Matrix, PWA-Feinschliff, README mit GIF, CHANGELOG, Lizenz, Deploy, Tag.

**Stand 2026-09-05:** Punkt 2 und 3 sind erledigt (`v1.0.0-rc.1`) — das Balancing ist gemessen (`npm run balance`, Ergebnis in `docs/balance-2026-09-05.txt`) und endet mit einer begründeten Nicht-Änderung (ADR-21); Geräte-Matrix, README, CHANGELOG und Lizenz liegen vor. Offen ist Punkt 1: der Playtest selbst. `v1.0.0` folgt danach (ADR-22).

→ **Audit A6**

---

## Backlog nach 1.0

- Weitere Hits (Ziel 14): `hit_pogo_bounce`, `hit_mole_swap` (Maulwurf tauscht Digger gegen sich), `hit_umbrella_float`, `hit_fence_crash`.
- Modus "Späher": Jeder darf pro Runde einmal geheim ein Feld "abklopfen" (erfährt, ob dort eine fremde Mine liegt).
- Modus "Minenhändler": Tokens können vor der nächsten Runde in eine dritte Mine investiert werden.
- Feldthemen (Strand, Schnee, Mondoberfläche).
- Shared-Package mit Drinkshot/Tresor, Party-Hub.
