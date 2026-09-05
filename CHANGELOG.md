# Changelog

Alle nennenswerten Änderungen an **Der Tresor**. Format nach
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach
[Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

### Hinzugefügt

- Vier weitere Ergebnis-Inszenierungen aus dem Backlog (jetzt 15 von angestrebten 20):
  `share_slow_clap` (langsamer Applaus, der in Beifall kippt und an der Kasse abreißt),
  `steal_solo_helicopter` (Ausschleusung am Seil — die einzige Flucht nach oben),
  `steal_multi_banana` (beide rutschen aus, niemand hat sie bestraft außer sie selbst),
  `steal_all_pie_fight` (jeder trifft seinen Nachbarn, jeder Treffer einzeln lesbar).
- Vier neue Requisiten: Hubschrauber, Rotor, Bananenschale, Sahnetorte.
- `ctx.play()` nimmt jetzt eine Verstimmung entgegen — derselbe Klang sechsmal
  hintereinander klingt nach Maschinengewehr, minimal verstimmt nach sechs Händen.
- `docs/screens/m4-outcomes.gif` — sechs Inszenierungen am Stück (offenes SOLL aus M4).
- **Vertrauens-Historie über mehrere Abende**: Wer wie oft geteilt hat, überlebt jetzt den
  Session-Reset. Schlüssel ist der Name (ADR-35), die Historie liegt unter eigenem
  `localStorage`-Eintrag, ist auf 24 Namen und 60 Spieltage gedeckelt und lässt sich in
  den Einstellungen löschen. Sichtbar ab dem zweiten Abend (ADR-36).
- **Kronzeugen-Modus** (fünfter Modus): Ab zwei Dieben darf nach der Aufdeckung einer
  auspacken. Er halbiert seinen Beuteanteil, der Verpfiffene trinkt ihn — die Summe der
  Runde bleibt gleich (ADR-33). Wer den Eid gebrochen hat, darf nicht handeln. Der Screen
  ist bewusst öffentlich: Das Handy bleibt in der Mitte, beide Taps sieht der Tisch
  (ADR-34). Neuer FSM-Zustand `WITNESS` zwischen Aufdeckung und Ergebnis.

## [1.0.0-rc.1] — 2026-09-05

Release-Kandidat. Vollständig spielbar; offen ist der Playtest mit einer echten Gruppe
(Audit A6) und das Balancing, das davon abhängt.

### Hinzugefügt

- PWA-Feinschliff: Angebot „Auf den Startbildschirm" nach der zweiten Runde, Update-Toast
  mit echtem Text statt Platzhalter.
- Gerätematrix in der E2E-Suite: iPad Mini und Desktop Chrome fahren zusätzlich den
  kompletten Spielfluss.
- `docs/PLAYTEST-01.md` — Protokollbogen für den Playtest-Abend.
- Dieses Changelog, Lizenz.

## [0.5.0] — 2026-09-05 — Polish, Modi-Feinschliff, Juice & Accessibility

### Hinzugefügt

- Title-Loop: Der Crook schleicht durchs Bild, der Spot erwischt ihn (reines DOM/CSS).
- Drei synthetisierte Musik-Loops an einem Lookahead-Scheduler; die Verhandlungsmusik
  zieht über die letzten zehn Sekunden an, die letzten fünf bekommen einen Tick.
- Eid-Siegel als Stempel, Ergebnis-Banner mit Overshoot-Einfahrt, Nachtschicht-Uhr,
  Tresor zittert ab zwei Dritteln.
- „Verräter des Abends" in der Statistik; Teilen-Text über die Web-Share-API.
- Zwei Onboarding-Sätze, je einmal pro Gerät.
- Haptik für Jackpot und Meineid.
- `npm run check:bundle`, E2E-Suiten für Accessibility und Fehler-Resilienz.

### Behoben

- Der Wackel-Knopf lief auch bei `prefers-reduced-motion: reduce` weiter.
- Vorladen der Bühne ohne `catch` erzeugte bei Netzabbruch eine unbehandelte Rejection.
- Die Sticker-Kontur des Titels kostete zwölf Lighthouse-A11y-Punkte (ADR-27).

## [0.4.0] — 2026-09-04 — Ergebnis-Inszenierungen

### Hinzugefügt

- Die elf Inszenierungen aus GDD §4.4 und beide Overlays (Meineid, Maulwurf).
- `hitStop()` als siebtes Animationsprinzip; Kassel-Kommentare als i18n-Arrays.
- Lügennase und MEINEID-Stempel am Crook-Rig.
- `npm run preview:outcomes` — jede Sequenz einzeln abspielbar.

### Behoben

- `props/sign_deal` lag im falschen Atlas; ein Test gleicht jetzt jeden Frame-Namen ab.
- Die Prügelwolke zeigte ihren eigenen Frame-Rand (ADR-24).

## [0.3.0] — 2026-09-04 — Die Show

### Hinzugefügt

- `RevealDirector`: eine pausierbare GSAP-Timeline aus dem Drehbuch, Tempo-Kurve,
  Fake-Stocken, Slow-Mo und Herzschlag bei der letzten Karte, Alarm beim ersten Dieb.
- 26 synthetisierte Sound-Cues (ADR-19).

## [0.2.0] — 2026-09-04 — Die Bühne

### Hinzugefügt

- PixiJS-Tresorraum: Crooks im Halbkreis, Karten, Tresor mit Tür, Kassel, Licht.
- Drei Atlanten entlang der Zeichenreihenfolge → 2 Draw-Calls (ADR-14).

## [0.1.0] — 2026-09-04 — Spielbarer Fluss

### Hinzugefügt

- Alle zehn Screens, Persistenz, Modi, Verteil-UI, Statistik, i18n (DE/EN), PWA.

## [0.0.1] — 2026-09-04 — Fundament

### Hinzugefügt

- Vite + TypeScript + PixiJS + GSAP, Regelkern mit Payout-Matrix, Test- und Build-Kette.
