# DER ZOLL — Roadmap: Meilensteine, Schritte, Audits

> Version 1.0 · Ein Meilenstein pro Claude-Code-Auftrag. Jeder endet mit Audit (`05-AUDITS.md`) und Git-Tag. Fortschritt in `docs/PROGRESS.md`.

**Prompt-Vorlage:** *"Lies CLAUDE.md und docs/. Setze Milestone M{n} aus docs/04-ROADMAP.md vollständig um. Halte dich an die Definition of Done. Führe danach Audit A{n} aus docs/05-AUDITS.md durch und schreibe den Report nach docs/PROGRESS.md."*

Wenn ein Schwesterprojekt bereits M2 hinter sich hat: In M0 die dort fertigen Module kopieren (Architektur §1).

---

## M0 — Setup & Regelkern (reine Funktionen, komplett getestet)  (Tag `v0.0.1`)

**Ziel:** Konfiguriertes Projekt, PWA-installierbar, und die **gesamte Spiellogik** (Round, Hints, Inspect, Gate, Payout, Modi, Rotation) als getestete reine Funktionen — ohne UI.

1. Vite + TS strict, Dependencies, Ordnerstruktur nach Architektur §2.
2. `config/theme.ts`, `rules.ts` (4–8 Spieler, Menge 0–6 / Hochsaison 0–10, k(n), h(n), p_true 0.6, Trinkwerte 2a / 2 / 3, Boni +2 / +1, Modi-Parameter, Timer), `choreo.ts` (Hinweis-Timing, Scan 1.2 s + Stall 400 ms, Banner 2.2 s, Gate-Stall 600 ms).
3. `core/store.ts`, `core/fsm.ts` (alle States aus Architektur §3 inkl. Beamten-Überspringen in PASS, INSPECT-Schleife, DISTRIBUTE-Iteration), Tests pro Übergang.
4. `core/rng.ts`, `core/round.ts`, `core/hints.ts`, `core/payout.ts`, `core/modes.ts`, `core/session.ts` nach Architektur §5.
5. **Test-Matrix:** Hinweis-Modell (Verschiedenheit, 0-Schmuggler-Fall, p_true-Statistik über 20 000 Runden ± 0.03, Typ-Vielfalt, Spürhund), k/h je n, inspect alle Fälle (caught, clean, diplomat, bereits offen, bribed, Limit), gateOrder (sauber zuerst), Boni beide Fälle, Banner-Logik alle 5, Bestechung (annehmen/ablehnen/Sperre), Hochsaison, Beamten-Rotation; `publicView.test.ts` (keine Mengen/truthful/diplomat in HALL/INSPECT; kein Screen referenziert `round.packs`); Property-Test 10 000 Runden.
6. i18n, tokens.css, Fonts, index.html (Portrait-Frame, CSP, Landscape-Overlay), PWA, CI/Deploy, README/PROGRESS/DECISIONS.

**DoD:** `npm test` grün, `core/` ≥ 95 % Branch-Coverage, Titel auf Handy, PWA installierbar, CI grün.

→ **Audit A0**

---

## M1 — Kompletter UI-Flow mit DOM-Platzhalter-Halle  (Tag `v0.1.0`)

**Ziel:** Von Lobby bis Result durchspielbar. Halle, Kontrolle und Schranke sind **DOM** (Kofferliste als Buttons, Hinweise als Icons, Röntgen als Text-Reveal). **Ab hier auf einer Party spielbar.**

1. Router + Wipes, Komponenten (Button, Badge, Sheet, Toast, Stepper, RiskLine, CountdownRing, OfficerButton, OpeningsChip, BribeChip, TokenStack).
2. Title, Lobby (4–8, Modus-Chips mit 1-Satz-Erklärung, Dauern, Validierung < 4, Beamten-Anzeige), Settings/Rules.
3. OfficerIntro, Pass (Beamter übersprungen), Pack (Koffer-Illustration als Inline-SVG, Stepper 0–6, Items springen rein, Risiko-Zeile, Diplomat-Hinweis, Bedenkzeit-Fallback), Packed.
4. Hall (DOM: Kofferliste mit Hinweis-Icons, Countdown, Fragevorschläge, "Nochmal ansehen" zeigt Icons erneut, "Verhör beenden"; Bestechungs-UI), Inspect (DOM: Koffer-Buttons, Text-Reveal "Röntgen: 4 Gummienten", Banner, Öffnungs-Chip, Durchwinken), Gate (DOM: Reihenfolge, Stempel-Text).
5. Distribute, Result (Banner, Koffer-Übersicht, Hinweis-Auflösung, Trinker, Statistik-Sheet, Buttons).
6. Back-Dialog, Wake-Lock-Stub, Haptik-Stub.
7. E2E: 5 Spieler, 3 Runden (Runde 1: 1 caught + 1 clean + Gate-Schmuggler; Runde 2: Durchwinken bei ehrlicher Runde → goodInstinct; Runde 3: Bestechung angenommen + Diplomat geöffnet); Beamten-Rotation geprüft; Mobile-Emulation; Seed-Steuerung im Dev-Build.

**DoD:** Party-tauglich; alle Fälle korrekt; Rotation korrekt; Statistik stimmt; keine hardcodierten Strings; Touch-Ziele ≥ 56 px für Koffer.

→ **Audit A1**

---

## M2 — PIXI-Halle, Koffer, Reisende, Beamter (Rendering + Interaktion)  (Tag `v0.2.0`)

**Ziel:** Das DOM-Platzhalter-Trio Hall/Inspect/Gate wird durch die `HallView` ersetzt. Koffer rollen ein, Reisende stehen hinter der Linie, der Beamte am Gerät, Waldi in der Ecke. Taps funktionieren, Zustände wechseln — noch **ohne** Sequenzen (Ergebnis erscheint direkt nach einem einfachen Scan).

1. Assets: Shotling-Atlas übernehmen + Reisenden-Ergänzungen (Sonnenhut, Kamera, Hawaiihemd, Koffer in der Hand, 6 Gesichter), Beamter (Mütze, Jacke, Klemmbrett, Pfeife, Schnurrbart, 5 Gesichter), Waldi (5 Animationen), Koffer (Zustände, Anhänger, Schloss), 8 Item-Sets (Sprite + Silhouette), saubere + peinliche Ware, Halle (Wand, Tafel, Band, Gerät, Monitor, Linie, Schranke, Ampel), Stempel ×4, Fx-Sprites.
2. `HallApp` (Singleton, Canvas-Umhängen), `Hall`, `Suitcase` (alle Zustände), `XrayMonitor` (Scanline-Aufbau mit Stall, Silhouetten-Layout, Bloom temporär), `Traveler`, `Officer`, `Waldi`, `Camera`, `HallView` (Modi, Hit-Areas, Lock, `suitcaseTap`).
3. Layout 3–7 Koffer, Reisende 1–2 Reihen, Beamter rechts; logische Welt 1000 × 1000.
4. `HintDirector` Basis (Icons ohne Animation), `InspectDirector` Basis (Fahrt ins Gerät, Scan, direkter Zustandswechsel, Banner), `GateDirector` Basis (Stempel, Reihenfolge).
5. DOM-HUD über Canvas (Countdown, Buttons, Chips) mit korrektem `pointer-events`.
6. Preload während LOBBY; Low-Effects; Dev-Panel (Seed, Reveal packs, FPS, Spieleranzahl).

**DoD:** 8 Spieler, 60 s in HALL: p50 ≤ 16.7 ms; ≤ 3 Draw-Batches; Taps zuverlässig (E2E Touch-Emulation, 50/50); Scan-Ergebnis erst ab 100 % (Test); Look-Check bestanden.

→ **Audit A2**

---

## M3 — Hinweise, Schranke & Audio  (Tag `v0.3.0`)

**Ziel:** Die 6 Hinweis-Animationen, Spürhund-Bark, die 4 Schranken-Sequenzen und der komplette Sound sind final. Röntgen-Sequenzen sind noch Platzhalter (`basic_caught` / `basic_clean`).

1. `Sequence.ts` Interfaces, Registries, Auswahl, No-Repeat; Registry-Tests.
2. `hints/Wobble, Drip, Heavy, Click, Feather, Dog` + Icons; "Nochmal ansehen" (max 1×); Spürhund-Bark-Beat.
3. `gate/clean/Wave, Relief`, `gate/smuggler/Moonwalk, Bow`; Schmuggler-Stall 600 ms mit gelber Ampel; Skip-Regel.
4. Bestechungs-Inszenierung (Angebots-Sprechblase, Schloss, Tokens fliegen).
5. AudioManager + Sprite mit allen Sounds; Musik-Loops; Uhr-Tick im Verhör.
6. Wake-Lock, Haptik.
7. `perf.spec.ts`.

**DoD:** Jede Sequenz mit Unit-Test + Dev-Preview; Hinweis-Animationen visuell eindeutig, Koffer danach optisch gleich (nur Icon); Perf grün; Sound-Sync ± 50 ms.

→ **Audit A3**

---

## M4 — Röntgen-Sequenzen (das Herzstück)  (Tag `v0.4.0`)

In 2 Sessions (4a: `caught_alarm_burst`, `caught_sweat_flood`, `caught_slow_zip` · 4b: `clean_teddy`, `clean_mug`, `clean_duck_bow`, `diplomat_pass`).

1. Pro Sequenz: Datei, `build()`-Timeline mit Sound-Cues, Label-Test (`revealed` ≥ `scanComplete`), Unit-Test (≤ 5 s, Reset), Dev-Preview.
2. Reaktions-Reihenfolge: Gesicht des Reisenden (200 ms) → Alarm/Stempel → Banner (Test über Labels).
3. Silhouetten-Layout pro Item-Set (Socken oben), Bloom nur während Scan.
4. Gemeinsame Fx extrahieren (Item-Fontäne, Schweiß, Stempel-Slam, Alarm-Overlay).
5. Beamten-Reaktionen (Klemmbrett-Haken/Kreuz/zerknüllen, Pfeife, Blush).
6. `sequenceRegistry.test.ts`: alle IDs, Gewichte, No-Repeat über 1 000 Runden, Diplomat-Overlay ersetzt korrekt.

**DoD:** 6 Röntgen-Sequenzen + Diplomat, jede in 1 s lesbar (erwischt/sauber, wer trinkt), alle 7 Animationsprinzipien, Perf grün.

→ **Audit A4**

---

## M5 — Polish, Modi-Feinschliff, Juice & Accessibility  (Tag `v0.5.0`)

1. Title-Loop (Koffer rollt durchs Röntgen, wechselnde Silhouetten), Musik, Lobby-Juice, Split-Flap-Tafel.
2. Modi final im UI erklärt; Hochsaison; Spürhund-Regel (k−1) sichtbar im Öffnungs-Chip.
3. Result-Juice: Koffer-Übersicht mit Aufklapp-Welle, Hinweis-Auflösung mit "stimmte/log"-Stempeln, Statistik-Balken, "Dreistester Schmuggler"/"Bester Riecher"-Badges, Share-Text (Web Share API: "Rudi hat 14 Gartenzwerge über die Grenze gebracht 🛃").
4. Haptik-Muster, Reduced-Motion, A11y (Fokus, aria-live für Banner, Kontrast auf heller Bühne), EN komplett, Onboarding-Tooltips.
5. Bundle-Analyse, Hall-Chunk lazy, Fehler-Resilienz.

**DoD:** Lighthouse Perf ≥ 90, A11y ≥ 90; Bundle-Budget; alle Modus-Kombinationen spielbar; EN vollständig.

→ **Audit A5**

---

## M6 — Playtest & Release 1.0  (Tag `v1.0.0`)

1. Playtest-Protokoll (A6), `docs/PLAYTEST-01.md`, Top-5-Findings beheben.
2. Balancing-Pass: p_true, k, Trinkwerte, Boni (nur `rules.ts`, mit ADR), Simulations-Panel als Grundlage.
3. Geräte-Matrix, PWA-Feinschliff, README mit GIF, CHANGELOG, Lizenz, Deploy, Tag.

→ **Audit A6**

---

## Backlog nach 1.0

- Weitere Röntgen-Sequenzen (Ziel 12): `caught_xray_dance` (Silhouetten tanzen), `caught_confess` (Reisender gesteht vor dem Scan), `clean_grandma_photo`, `clean_officer_twin`.
- Modus "Zweiter Beamter" (bei 7–8: zwei Beamte, je k/2, dürfen sich beraten).
- Modus "Rückreise": Der Beamte der letzten Runde reist mit doppelter Menge.
- Item-Set-Editor (eigene Namen für Schmuggelware).
- Shared-Package mit den Schwesterspielen, Party-Hub.
