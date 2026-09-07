# DIE HÄNGEBRÜCKE — Roadmap: Meilensteine, Schritte, Audits

> Version 1.0 · Ein Meilenstein pro Claude-Code-Auftrag. Jeder endet mit Audit (`05-AUDITS.md`) und Git-Tag. Fortschritt in `docs/PROGRESS.md`.

**Prompt-Vorlage:** *"Lies CLAUDE.md und docs/. Setze Milestone M{n} aus docs/04-ROADMAP.md vollständig um. Halte dich an die Definition of Done. Führe danach Audit A{n} aus docs/05-AUDITS.md durch und schreibe den Report nach docs/PROGRESS.md."*

Wenn ein Schwesterprojekt bereits M2 hinter sich hat: In M0 die dort fertigen Module kopieren (Architektur §1). Der Tresor ist das architektonisch nächste Spiel (Wahl → geskriptete Show).

---

## M0 — Setup & Regelkern (reine Funktionen, komplett getestet)  (Tag `v0.0.1`)

**Ziel:** Konfiguriertes Projekt, PWA-installierbar, gesamte Spiellogik (Brücke, Auszahlung, Modi, Choreographer, Session) als getestete reine Funktionen — ohne UI.

1. Vite + TS strict, Dependencies, Ordnerstruktur nach Architektur §2.
2. `config/theme.ts`, `rules.ts` (3–8 Spieler, B_0 = n+2, B_min = n−1, Trinkwert m_b, Verteilen 1 / 2 Todeszone, Modi-Parameter, Timer), `choreo.ts` (Phasen je Preset, Slow-Mo 0.5, Bruch-Versatz 400 ms, 20-s-Deckel).
3. `core/store.ts`, `core/fsm.ts` (alle States inkl. Nebel-Pfad, DISTRIBUTE quick/iterate), Tests pro Übergang.
4. `core/rng.ts`, `core/bridge.ts`, `core/round.ts`, `core/payout.ts`, `core/modes.ts`, `core/session.ts` nach Architektur §5.
5. **Test-Matrix:** Beispiele aus GDD §3.5; alle Verteilungen für n = 3…5 erschöpfend (Partitionen von Spielern auf Balken), n = 6…8 stichprobenartig; Schrumpfen bis B_min und Reparatur; Todeszone-Pigeonhole; Fahne (Fahnenflucht sicher/gestürzt, Balkendieb); Morsch; Schwergewicht; Seil (1×, Gebühr, nicht mehr verfügbar); Nebel; Banner-Logik alle Fälle; Session-Statistik; `publicView.test.ts`; Property-Test 10 000 Runden.
6. `core/choreographer.ts` mit Tests: gleiche Ankunftszeit, Knarren für alle besetzten Balken, Blickkontakt vor Bruch, Domino nur ≥ 3, Determinismus, 20-s-Deckel.
7. i18n, tokens.css, Fonts, index.html (Portrait-Frame, CSP, Landscape-Overlay), PWA, CI/Deploy, README/PROGRESS/DECISIONS.

**DoD:** `npm test` grün, `core/` ≥ 95 % Branch-Coverage, Titel auf Handy, PWA installierbar, CI grün.

→ **Audit A0**

---

## M1 — Kompletter UI-Flow mit Platzhalter-Schritt  (Tag `v0.1.0`)

**Ziel:** Von Lobby bis Result durchspielbar. Der Schritt ist ein DOM-Platzhalter (Brücke-von-oben-SVG, Hiker-Köpfe erscheinen auf ihren Balken, Kollisionsbalken werden rot und "brechen" per CSS). **Ab hier auf einer Party spielbar.**

1. Router + Wipes, Komponenten (Button, Badge, Sheet, Toast, **BridgeTop-SVG** mit allen Zuständen, CountdownRing, FlagRow, WeightStepper, QuickDistribute, TokenStack).
2. Title, Lobby (3–8, Balkenanzahl, Modus-Chips mit 1-Satz-Erklärung, Dauern, Validierung < 3), Settings/Rules.
3. Negotiation (Brücke, Countdown, Regelzeile, "Versprechen sind nicht bindend.", "Alle bereit"; Fahne-Modus: FlagRow öffentlich; Nebel: Stille-Screen), Pass, Choose (Balken-Buttons ≥ 56 px, Seil-Button einmalig, Gewicht-Stepper, Versiegeln, Bedenkzeit-Fallback), Sealed.
4. Step-Platzhalter (DOM), Distribute (quick bei allen == 1, iterate sonst), Result (Banner, Brücken-Übersicht mit Fahnen vs. Wahl, Trinker, Vorschau "Nächste Runde: {B} Balken" mit abgefault/repariert, Statistik-Sheet, Geier-Kommentar, Buttons).
5. Back-Dialog, Wake-Lock-Stub, Haptik-Stub.
6. E2E: 5 Spieler, 4 Runden (allSafe → Schrumpfen; collision → Reparatur; Fahne-Runde mit Fahnenflucht + Balkendieb; Todeszone erzwungen per Seed/Dev-Toggle); Seil-Verbrauch; Mobile-Emulation.

**DoD:** Party-tauglich; alle Fälle korrekt; Schrumpfen/Reparatur sichtbar; keine hardcodierten Strings; Balken-Touch-Ziele ≥ 56 px (min 48 bei 10 Balken).

→ **Audit A1**

---

## M2 — Schlucht, Brücke & Hikers (Rendering)  (Tag `v0.2.0`)

**Ziel:** Die Schlucht lebt. Brücke mit Durchhang, Wind in den Seilen, Nebel, Fluss-Glitzer, Geier auf dem Pfahl, Hikers stehen links. Balken knarren und brechen auf Kommando. Noch keine Show.

1. Assets: Shotling-Atlas übernehmen + Hiker-Ergänzungen (Hut, Rucksack ×3, Stock, Harness, 6 Gesichter, Fisch-Overlay), Gustav (6 Animationen), Balthasar, Balken (normal, morsch, gebrochen 2 Hälften, Splitter), Seile, Schilder (Nummern, Todeszone, abgefault, Hilfe), Canyon (Felsen, Plateaus, Nebel, Fluss), Fx.
2. `StageApp`, `Canyon` (Layer, Wind-Noise, Parallax), `Bridge` (Catenary-Layout, Plank[], remove/repair/rot), `Plank` (creak/snap/crumble), `Hiker` (runTo mit Ankunftszeit, wobble, lookAt, wetClimb, safeWave), `Vulture`, `Carpenter`, `Camera`.
3. Layout 3–8 Hikers, B von n−1 bis n+2; Balkenbreite ≥ 60 Einheiten.
4. `StepDirector` **Basis**: Intro → Anlauf (gleichzeitige Ankunft) → Hit-Stop → Knarren → direkte Bruch-Animation ohne Sequenz → Nachspiel-Platzhalter.
5. Preload während NEGOTIATION; Low-Effects; Dev-Panel (Seed, Verteilung, Balkenzahl, Todeszone, FPS).

**DoD:** 8 Hikers + Schlucht 60 s p50 ≤ 16.7 ms; ≤ 3 Draw-Batches; alle Hikers kommen im selben Frame an (Test + Sichtprüfung); Look-Check bestanden.

→ **Audit A2**

---

## M3 — Die Show: Knarren, Blickkontakt, Bruch-Timing & Audio  (Tag `v0.3.0`)

**Ziel:** Die Spannungsmaschine ohne die großen Fall-Gags: Fake-Knarren auf allen Balken, Slow-Mo-Blickkontakt mit "Oh."-Sprechblase, seeded Bruch-Reihenfolge, Safe-Sequenzen, `all_safe_rot`, `deathzone_sign`, `repair_carpenter`, Sound. Fall-Sequenzen sind noch `basic_fall`.

1. `Sequence.ts` Interfaces, Registries, Auswahl, No-Repeat; Registry-Tests.
2. Knarren-Beat (Amplituden 0.7/1.0/0.4→1.0), Blickkontakt-Beat (Slow-Mo 0.5×, `oh`-Gesicht, Sprechblase), Bruch-Versatz, Kamera-Fall-Pan.
3. `safe/WobbleHold, ConfidentStroll, Tiptoe`; `misc/AllSafeRot, DeathzoneSign, RepairCarpenter`.
4. Overlays `RottenCrack`, `DeserterStamp` (mit Balkendieb-Schulterklopfer).
5. AudioManager + Sprite mit allen Sounds; Musik-Loops; Wind.
6. Wake-Lock, Haptik beim Bruch; Tap-to-Skip nach letztem Bruch.
7. `perf.spec.ts`.

**DoD:** 1 000 simulierte Runden: gezeigte Balken/Gruppen == `RoundResult`; Blickkontakt immer vor Bruch; Timing-Presets ± 1 s; Perf grün; Spannungs-Test (Audit) bestanden.

→ **Audit A3**

---

## M4 — Die 6 Fall-Sequenzen (das Herzstück)  (Tag `v0.4.0`)

In 2 Sessions (4a: HoldHands, CoyoteDelay, Seesaw · 4b: RopeSwing, Domino, BounceWall).

1. Pro Sequenz: Datei, `build()`-Timeline mit Sound-Cues, Labels `eyeContact` < `snap` < `climbedBack` (Test), Unit-Test (≤ 5 s, Reset, alle wieder trocken/idle), Dev-Preview.
2. `fall_domino` nur bei Gruppen ≥ 3; `fall_seesaw` nutzt Gustav.
3. Gemeinsame Fx extrahieren (Splitter, Splash, Hut-Nachschweben, Felswand-Squash).
4. `sequenceRegistry.test.ts`: alle IDs, Gewichte, No-Repeat über 1 000 Runden, minGroup-Filter.

**DoD:** 6 Fälle, jeder in 1 s lesbar (wer fällt, mit wem), alle 7 Animationsprinzipien + Blickkontakt-Signatur, Perf grün während jeder Sequenz.

→ **Audit A4**

---

## M5 — Polish, Modi-Feinschliff, Juice & Accessibility  (Tag `v0.5.0`)

1. Title-Loop, Musik, Lobby-Juice, Seil-Schwingen im SVG.
2. Modi final im UI erklärt; Fahnen-Stapel-Konflikt visualisiert; Schwergewicht-Rucksäcke auf der Bühne; Seil-Hangeln-Animation.
3. Result-Juice: Brücken-Übersicht mit Aufklapp-Welle, Kollisionspartner-Grafik, "Bergziege"/"Sturzflieger"-Badges, Geier-Kommentare, Share-Text (Web Share API: "Anna und Marc sind zum dritten Mal zusammen abgestürzt 🌉").
4. Haptik-Muster, Reduced-Motion, A11y (Fokus, aria-live, Kontrast), EN komplett, Onboarding-Tooltips.
5. Bundle-Analyse, Step-Chunk lazy, Fehler-Resilienz.

**DoD:** Lighthouse Perf ≥ 90, A11y ≥ 90; Bundle-Budget; alle Modus-Kombinationen spielbar; EN vollständig.

→ **Audit A5**

---

## M6 — Playtest & Release 1.0  (Tag `v1.0.0`)

1. Playtest-Protokoll (A6), `docs/PLAYTEST-01.md`, Top-5-Findings beheben.
2. Balancing-Pass: B_0, B_min, Verteilwerte, Todeszone-Bonus (nur `rules.ts`, mit ADR), Simulations-Panel als Grundlage.
3. Geräte-Matrix, PWA-Feinschliff, README mit GIF, CHANGELOG, Lizenz, Deploy, Tag.

→ **Audit A6**

---

## Backlog nach 1.0

- Weitere Fall-Sequenzen (Ziel 10): `fall_parachute_fail`, `fall_vulture_taxi`, `fall_trampoline_rock`, `fall_freeze_frame_photo`.
- Modus "Brückenwächter": Ein Spieler pro Runde wählt nicht, sondern darf nach dem Reveal einen sicheren Balken "absägen".
- Modus "Zwei Brücken": Zwei Brücken nebeneinander, erst Brücke wählen, dann Balken.
- Canyon-Themen (Dschungel, Eis, Lava).
- Shared-Package mit den Schwesterspielen, Party-Hub.
