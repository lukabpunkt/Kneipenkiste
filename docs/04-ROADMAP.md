# DER TRESOR — Roadmap: Meilensteine, Schritte, Audits

> Version 1.0 · Ein Meilenstein pro Claude-Code-Auftrag. Jeder endet mit Audit (`05-AUDITS.md`) und Git-Tag. Fortschritt in `docs/PROGRESS.md`.

**Prompt-Vorlage für Luka:**
*"Lies CLAUDE.md und docs/. Setze Milestone M{n} aus docs/04-ROADMAP.md vollständig um. Halte dich an die Definition of Done. Führe danach Audit A{n} aus docs/05-AUDITS.md durch und schreibe den Report nach docs/PROGRESS.md."*

Wenn Drinkshot bereits M1/M2 hinter sich hat: In M0 die dort fertigen Module kopieren (Architektur §1), nicht neu bauen.

---

## M0 — Projekt-Setup, Regelkern & Tests  (Tag `v0.0.1`)

**Ziel:** Konfiguriertes Projekt, PWA-installierbar, und die **komplette Spiellogik als getestete reine Funktionen** — noch ohne UI. Die Logik ist bei diesem Spiel klein genug, um sie komplett vor der UI fertigzustellen.

1. Vite + TS strict, Dependencies wie Drinkshot, Ordnerstruktur nach Architektur §2.
2. `config/theme.ts`, `rules.ts` (V_0/Wachstum/Deckel/Gebühr je Härte, Modi-Parameter, 3–8 Spieler), `choreo.ts` (Tempo-Kurve, Stalls, Presets, 40-s-Deckel).
3. `core/store.ts`, `core/fsm.ts` (alle States aus Architektur §3, Nachtschicht-Pfad, DISTRIBUTE-Abzweig), Tests für jeden Übergang.
4. `core/rng.ts` (secure + seeded), `core/vault.ts`, `core/modes.ts` (Maulwurf-Zuweisung mit `crypto`, Eid-Bookkeeping), `core/payout.ts` nach Architektur §5.
5. **Payout-Test-Matrix:** n 3–8 × k 0–n × Härte × Modi-Kombinationen, Invarianten-Tests, Property-Test mit 10 000 zufälligen Runden (nie negativ, Summe der Verteilung == vault, nextVault im Bereich).
6. `core/choreographer.ts` mit Tests: Teiler zuerst, Diebe zuletzt, Maulwurf letzter Dieb, Determinismus, 40-s-Deckel, Stalls-Regeln.
7. `core/session.ts`: Scoreboard, Vertrauens-Index, Verrats-Streak, "Meistbetrogen", Persistenz; Tests.
8. i18n de/en, tokens.css, self-hosted Fonts, index.html (Meta, CSP, Portrait-Frame, Landscape-Overlay), PWA, CI/Deploy-Workflows, README, PROGRESS, DECISIONS.

**DoD:** `npm test` grün mit ≥ 95 % Branch-Coverage in `core/`; `npm run dev --host` zeigt Titel auf Handy; PWA installierbar; CI grün.

→ **Audit A0**

---

## M1 — Kompletter UI-Flow mit Platzhalter-Reveal  (Tag `v0.1.0`)

**Ziel:** Das Spiel ist von Lobby bis Result durchspielbar; der Reveal ist ein DOM-Platzhalter, der die Karten als einfache Liste nacheinander (1 s Abstand) umdreht. **Ab hier kann man es auf einer Party spielen.**

1. Router + Wipes, Komponenten (Button, Badge, ChoiceCard, VaultWidget als Inline-SVG mit Flip-Counter, CountdownRing, BottomSheet, Toast).
2. Title (Logo-Idle, 18+-Hinweis, Audio-Unlock), Lobby (3–8, Modus-Chips kombinierbar mit 1-Satz-Erklärung, Härte, Dauern, Validierung < 3).
3. Negotiation: Tresor + Zähler, Countdown-Ring (letzte 10 s rot, letzte 5 s Tick), Auszahlungstabelle dieser Runde (live aus `payout` berechnet für k = 0/1/2+/n), Kassel-Sprechblasen (DOM), "Alle bereit". Eid-Modus: Schwören-Buttons pro Badge mit Siegel. Nachtschicht: 10-s-Stille-Screen.
4. Pass (wie Drinkshot), Choice (zwei Karten, Versiegel-Animation, Bedenkzeit-Timer, Maulwurf-Variante mit Ketten), Sealed.
5. Reveal-Platzhalter (DOM), Distribute (Münz-Tap-UI, Long-Press −1, "Auszahlen" erst bei 0 Rest), Result (Banner je Outcome, Trinker-Zeilen, Tresor-Vorschau mit Wachstums-/Reset-Animation, Statistik-Sheet, Buttons).
6. Settings/Rules-Sheets, Back-Button-Dialog, Wake-Lock-Stub, Haptik-Stub.
7. E2E: 4 Spieler, 3 Runden (allShare → soloSteal mit Verteilung → multiSteal), Eid-Runde mit Meineid, Maulwurf-Runde; Mobile-Emulation.

**DoD:** Party-tauglich mit Platzhalter; alle Outcomes im Result korrekt; Statistik stimmt; E2E grün; keine hardcodierten Strings; Touch-Ziele ≥ 48 px.

→ **Audit A1**

---

## M2 — Bühne, Crooks & Tresor (Rendering)  (Tag `v0.2.0`)

**Ziel:** Der Tresorraum lebt. Crooks stehen hinter ihren Karten, blinzeln, schauen herum; Laser wandern; Herr Kassel redet; der Tresor öffnet und schließt sich. Noch keine Reveal-Show.

1. Assets: Shotling-Atlas aus Drinkshot übernehmen/generieren + Crook-Ergänzungen (Maske, Ringelshirt, Beanie, Sack, Schild, 4 neue Gesichter), Kassel, Tresor (Tür, Rad, Griff, Münzstapel 5 Stufen), Raum (Wand, Tisch, Spotlight, Laser-Segment), Karten (Vorder-/Rückseiten, Siegel, Helm), Props (Fluchtauto, Amboss, Wasserpistole, Gitter, Popcorn, Trichter, Kelle, Staubsauger).
2. `StageApp` (Singleton, Ticker→GSAP), `VaultRoom` (Layer, Laser-Wanderung mit Noise, Alarm-Modus), `Vault` (open/close/grow/drain/burst mit Sound-Hooks), `Crook` (Slots, Blickregie `lookAt()`, Gesichter, Idle-Atmen/Blinzeln), `Kassel` (Sprechblasen-Queue via BitmapText), `DecisionCard` (lift/flip mit Stalls/seal/helmet), `Camera`.
3. Halbkreis-Layout für 3–8 Spieler (Karten-Scale 0.8 bei 7–8).
4. Preload während NEGOTIATION; Low-Effects-Auto-Detect.
5. Dev-Panel: Spieleranzahl, "Open/Close Vault", "Flip card i", "Alarm", FPS.

**DoD:** 8 Crooks + Raum 60 s ohne Frame-Drops auf Referenzgerät (p50 ≤ 16.7 ms), ≤ 3 Draw-Batches, Look entspricht Art Direction (Screenshots in `docs/screens/m2-*`).

→ **Audit A2**

---

## M3 — Die Reveal-Show  (Tag `v0.3.0`)

**Ziel:** Die Spannungsmaschine. Intro → Karten mit Tempo-Kurve und Stalls → Alarm beim ersten Dieb → letzte Karte in Slow-Mo → Übergabe an eine Platzhalter-Outcome-Sequenz (`basic_outcome`: Trinker-Zähler erscheinen).

1. `RevealDirector`: RevealScript → GSAP-Timeline; Beats → DecisionCard/Crook/Kassel/Camera/Audio; Tap-to-Skip-Regel; visibilitychange-Pause.
2. Intro-Sequenz (Licht aus, Spot an, Rad dreht, Tür auf, Münzglanz, Kassel: "Die Karten, bitte.").
3. Karten-Beat: Kamera-Zoom, Trommelwirbel-Tempo, Lift, Flip mit Stalls, Ergebnis-Flash (grün/rot), Crook-Reaktionen (Besitzer `innocent`/`smug`, andere schauen), Publikums-Sound.
4. Alarm-Beat, Letzte-Karte-Beat (Spot enger, Herzschlag, 2 Stalls, Slow-Mo).
5. Eid-Siegel auf Karten, Maulwurf-Helm-Overlay als `OverlaySequence` (Platzhalter-Effekte).
6. `OutcomeSequence`-Interface + Registry + gewichtete Auswahl + No-Repeat; `basic_outcome`.
7. AudioManager + Sprite mit allen Reveal-Sounds, Musik-Ducking, Herzschlag-Tempo.
8. Wake-Lock aktiv, Haptik bei letzter Karte.
9. `perf.spec.ts`.

**DoD:** Show-Timing entspricht Presets (± 1 s), 1 000 simulierte Runden: gezeigte Karten == `choices` zu 100 %, Perf-Test grün, Spannungs-Test (Audit) bestanden.

→ **Audit A3**

---

## M4 — Ergebnis-Inszenierungen (das Herzstück)  (Tag `v0.4.0`)

**Ziel:** Alle 11 Outcome-Sequenzen + 2 Overlays aus GDD §4.4 — in 2–3 Sessions (4a: share + soloSteal, 4b: multiSteal + allSteal, 4c: jackpot + Overlays + Polish).

1. Pro Sequenz: Datei in `outcomes/<typ>/`, `build()` als GSAP-Timeline mit Sound-Cues, Unit-Test (Dauer 2–8 s, Reset-Invariante), Dev-Preview.
2. Reihenfolge: `share_group_hug`, `share_toast`, `steal_solo_getaway`, `steal_solo_moonwalk`, `steal_solo_magician`, `steal_multi_tugofwar`, `steal_multi_anvil`, `steal_multi_standoff`, `steal_all_brawl`, `steal_all_alarm`, `jackpot_burst`; Overlays `perjury_seal_break`, `mole_reveal`.
3. Jede Sequenz endet mit dem Trinker-Zähler-Moment (Zahlen ploppen über den Köpfen), bei soloSteal mit Übergabe an DISTRIBUTE ("Handy an {Dieb}").
4. Fx extrahieren, sobald zweimal gebraucht (Kinnlade-Gag, Popcorn-Publikum, Kassel-Stempel, Münzregen).
5. Kassel-Kommentare pro Outcome (i18n-Arrays, zufällig).
6. `outcomeRegistry.test.ts`: alle IDs registriert, No-Repeat-Fenster 3 pro Typ, Gewichte, Overlays kombinierbar.

**DoD:** 11 Sequenzen + 2 Overlays, jede auf dem Handy in 1 s lesbar, alle 7 Animationsprinzipien erfüllt, Perf während jeder Sequenz grün.

→ **Audit A4**

---

## M5 — Polish, Modi-Feinschliff, Juice & Accessibility  (Tag `v0.5.0`)

1. Title-Loop (Crook schleicht, Spotlight erwischt ihn), Musik-Loops, Lobby-Juice.
2. Negotiation-Juice: Kassel-Sprechblasen mit Timing, Tresor wackelt bei hohem V, Countdown-Puls, Eid-Siegel-Stempel-Animation.
3. Result-Juice: Banner-Einfahrt, Count-Ups, Vertrauens-Index-Balken, "Verräter des Abends"-Badge, Share-Text (Web Share API: "Marc hat bei 12 Schlücken im Tresor gestohlen. Allein. 🔓").
4. Highroller-Modus final, Modus-Kombinationen im UI erklärt, Nachtschicht-Screen mit Uhr-Animation.
5. Haptik-Muster, Reduced-Motion, A11y (Fokus, aria-live, Kontrast), EN komplett, Onboarding-Tooltips (Negotiation: "Redet. Schwört. Lügt.", Choice: "Niemand sieht das. Wirklich.").
6. Bundle-Analyse, Reveal-Chunk lazy, Fehler-Resilienz.

**DoD:** Lighthouse Perf ≥ 90, A11y ≥ 90; Bundle-Budget; alle Modi + Kombinationen spielbar; EN vollständig.

→ **Audit A5**

---

## M6 — Playtest & Release 1.0  (Tag `v1.0.0`)

1. Playtest-Protokoll (A6) mit echter Gruppe, `docs/PLAYTEST-01.md`, Top-5-Findings beheben.
2. Balancing-Pass nach Playtest: V_0/Wachstum/Gebühr ggf. anpassen (nur in `rules.ts`, mit ADR).
3. Geräte-Matrix, PWA-Feinschliff (Install-Banner nach 2. Runde, Offline, Update-Toast).
4. README mit GIF, CHANGELOG, Lizenz, Deploy, Tag.

→ **Audit A6**

---

## Backlog nach 1.0

- Weitere Outcome-Sequenzen (Ziel 20): `steal_solo_helicopter`, `steal_multi_banana`, `share_slow_clap`, `steal_all_pie_fight`.
- "Kronzeuge"-Modus: Ein Dieb darf nach dem Reveal einen anderen Dieb "verpfeifen" und halbiert seine Strafe.
- ~~Gemeinsames `@party/core`-Package mit Drinkshot; Party-Hub-Launcher.~~ **Gestrichen (ADR-37).** Der Umbau bräuchte das Schwesterprojekt, und dieses Repo ist das einzige, das wir anfassen. Das Problem dahinter — auseinanderlaufende Kopien — löst `tests/unit/boundaries.test.ts` innerhalb dieses Repos: Die Spielerfarben werden über alle drei Quellen abgeglichen, und die Infrastruktur darf nichts aus dem Regelkern importieren. Wer später doch trennen will, hebt die dort gelistete Dateimenge heraus.
- Statistik über mehrere Abende ("Vertrauens-Historie").
