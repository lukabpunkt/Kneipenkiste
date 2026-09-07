# 05 – Meilensteinplan (M0 – M9)

Jeder Meilenstein hat: **Ziel**, **Tasks** (in Reihenfolge), **Definition of Done (DoD)**, **Audit** (aus `06_QA_AUDITS.md`) und einen **Nutzer-Test** (was Luka nach dem Meilenstein im Browser ausprobieren soll). Ein Meilenstein gilt erst als abgeschlossen, wenn DoD **und** Audit erfüllt sind und `PROGRESS.md` aktualisiert wurde.

Geschätzter Umfang pro Meilenstein: 1 Claude-Code-Session (ggf. 2 bei M3/M5/M6).

---

## M0 – Projekt-Setup & Tooling

**Ziel:** Leeres, aber vollständig eingerichtetes Repo, das lokal läuft, lintet, testet und in CI grün ist.

**Tasks**

1. `git init` (falls nötig), Remote `origin` = `https://github.com/lukabpunkt/Pferderennen.git`, Branch `main`.
2. `package.json` anlegen: `"type": "module"`, Scripts `dev` (`vite --host --port 5173` **oder** `node scripts/serve.js`), `test` (`vitest run`), `test:watch`, `audit:fairness` (`node tests/fairness/audit.js`), `lint` (`eslint . && prettier --check .`), `format` (`prettier --write .`), `e2e` (`playwright test`). Dev-Dependencies: `vitest`, `eslint`, `prettier`, `@playwright/test`, optional `vite`.
3. `.gitignore` (node_modules, dist, test-results, playwright-report, .DS_Store), `.prettierrc` (`{ "singleQuote": true, "semi": true, "printWidth": 100 }`), `eslint.config.js` (flat config, `eslint:recommended`, Browser+Node Globals, **zusätzliche Regel für `src/engine/**`:** `no-restricted-globals` für `window, document, Math (nur `Math.random` via `no-restricted-properties`), Date, performance`, `no-restricted-imports` für `../render/*`, `../ui/*`, `../state/*`).
4. Verzeichnisstruktur aus `02_ARCHITECTURE.md` §2 anlegen (leere Module mit JSDoc-Kopf, der den geplanten Zweck beschreibt).
5. `index.html` mit Meta-Viewport (`width=device-width, initial-scale=1, viewport-fit=cover`), `<meta name="theme-color">`, CSP-Meta, `<canvas id="race">`, `<div id="app">`, `<script type="module" src="./src/main.js">`. `main.js` rendert vorerst „Pferderennen – M0“ in `#app`.
6. `src/styles/tokens.css` mit **allen** Tokens aus `04_DESIGN_SYSTEM.md` §2/§3; `base.css` mit Reset und Typografie.
7. `src/config.js` mit den Startwerten aus `03_RACE_ENGINE.md` (SPEED_MODEL, EVENT_WINDOW, RACE_DURATIONS, TRACK_LENGTH, TIMESTEP) – auskommentiert dokumentiert.
8. `src/data/horses.js` mit den 6 Pferden (id, name, color/light/dark, look-Beschreibung, accessory, 6+ commentary-Zeilen aus dem GDD).
9. Ein erster Vitest-Test (`tests/engine/rng.test.js` mit `it.todo`) und Vitest-Config, sodass `npm test` grün ist.
10. `.github/workflows/ci.yml`: Node 20, `npm ci`, `npm run lint`, `npm test`, `npm run audit:fairness` (darf in M0 noch „skip“ ausgeben, wenn die Engine fehlt – Script existiert und gibt Exit 0 mit Hinweis).
11. `README.md` (Kurzbeschreibung, Screenshot-Platzhalter, Lokal starten, Regeln in 5 Zeilen, Link auf docs/).
12. `PROGRESS.md`: M0-Tasks abhaken, Audit-Ergebnis eintragen. Commit `chore: complete M0`, Push.

**DoD**

- `npm install && npm run dev` zeigt die Seite; `npm run lint` und `npm test` grün; CI grün auf GitHub.
- Alle Verzeichnisse und Platzhalter-Module vorhanden.

**Audit:** A0 (Setup-Audit)

**Nutzer-Test:** Repo klonen, `npm install`, `npm run dev`, Seite öffnet auf Handy im selben WLAN (`--host`).

---

## M1 – State, Router & UI-Screens (ohne Rennen)

**Ziel:** Der komplette Spielfluss ist im DOM klickbar: Start → Spieler → Wetten → (Platzhalter-Rennen mit „Rennen simulieren“-Button, Sieger zufällig via `crypto`) → Ergebnis → nächstes Rennen. Persistenz funktioniert.

**Tasks**

1. `state/store.js`, `reducers.js` (Actions: `players/add|remove|rename|setAvatar`, `bets/place|reset`, `betting/next`, `settings/update`, `screen/go`, `race/setResult`, `session/record`), Tests für Reducer.
2. `state/persistence.js`: versioniertes Laden/Speichern, Migration-Hook, Try/Catch für Private Mode. Test mit gemocktem `localStorage`.
3. `ui/router.js`: rendert Screen anhand `state.screen`; Screen-Module exportieren `mount(container, store)` / `unmount()`. Übergangsanimation (Slide+Fade) per CSS-Klassen.
4. `ui/components/`: `button.js`, `stepper.js` (−/+, min/max, Hold-to-repeat), `toast.js`, `modal.js` (Bottom-Sheet auf Mobile, fokus-trap, Esc).
5. Screens: `start.js` (mit „Weiterspielen“, wenn Spieler gespeichert), `players.js` (Avatar-Emoji-Pool von 24, Validierung, Enter-Flow), `betting.js` (Turn-Logik, Pferdekarten mit Farbrahmen und Platzhalter-Portrait als farbiger Kreis mit Nummer, Stepper, Übersicht, „Rennen starten“), `results.js` (Gewinner-/Verlierer-Karten), `rules.js`, `settings.js` (alle Einstellungen aus GDD §6, wirken auf State), `stats.js` (Platzhalter mit Zählern).
6. `engine/payout.js` inkl. vollständiger Tests (Sieg/Platz/Letzter/Frei, Haus, Mehrfach-Gewinner). Ergebnis-Screen nutzt `settle()`.
7. Placeholder-Race-Screen: zeigt „Rennen läuft…“ und Button „Ergebnis (Platzhalter)“, der eine zufällige Reihenfolge erzeugt. (Wird in M3 ersetzt.)
8. `styles/components.css`, `screens.css`: Alle Screens sehen bereits **gut** aus (Tokens, Karten, Buttons mit Kante, Spacing, Mobile-first, Desktop-Layout ab 900 px).
9. `PROGRESS.md` aktualisieren, Commit `chore: complete M1`.

**DoD**

- Kompletter Durchlauf mit 3 Spielern auf Handy und Desktop ohne Fehler in der Konsole.
- Reload an jeder Stelle behält Spieler/Einstellungen.
- Reducer- und Payout-Tests grün (≥ 25 Tests).

**Audit:** A1 (UI/UX-Audit) + A6 (Code-Audit)

**Nutzer-Test:** Mit Freunden „trocken“ durchspielen: Namen eingeben, wetten, Platzhalter-Ergebnis, Schlücke-Verteilung nachvollziehen.

---

## M2 – Race Engine & Fairness-Audit (headless)

**Ziel:** Die vollständige, DOM-freie Simulation inkl. Event-Scheduling, mit bewiesener Fairness und Spannung. **Noch kein Rendering.**

**Tasks**

1. `engine/rng.js` (sfc32, fork, gaussian, weighted) + Tests aus `03_RACE_ENGINE.md` §3.
2. `engine/effects.js` – alle Effekt-Definitionen aus GDD §4 als Daten in `data/events.js` (id, weight, window, effect/sequence, anim, commentary, drinkRule) + `applyEffects()` + Tests.
3. `engine/speedModel.js` – Phasenprofil, OU-Noise, Sprints, Endspurt, Clamp. Pro Läufer eigener RNG-Fork.
4. `engine/eventScheduler.js` – Vorplanung (Fenster, Abstand, Max-pro-Läufer), Laufzeit-Trigger, `slipstream`-Check, `upcoming` für Render-Vorlauf, Log.
5. `engine/race.js` – `createRace()`, `step()`, Zieleinlauf mit interpolierter Crossing-Zeit, Führungswechsel-Zähler, Leader-Tracking bei 50 %/80 %, `finished`/`order`. **Keine Allokationen im Hot Path** (Arrays vorab, keine Closures pro Step).
6. `tests/engine/race.test.js`: Determinismus (50 Seeds), Scheduler-Constraints, Zieleinlauf-Tie-Break, Isolation (Grep-Test).
7. `tests/fairness/audit.js`: Implementierung gemäß `03_RACE_ENGINE.md` §7 mit Chi²-Test (Implementierung der Chi²-CDF für 5 FG selbst, keine Dependency), Tabellen-Ausgabe, JSON-Report, Exit-Code. CLI-Flags `--n`, `--chaos`, `--duration`, `--seed`.
8. **Tuning-Schleife:** Audit laufen lassen, Parameter in `config.js` anpassen, bis S1–S6 erfüllt sind. Jede Iteration kurz in `PROGRESS.md` protokollieren (Parameter → Kennzahlen). Finale Parameter im Kopf von `speedModel.js` dokumentieren.
9. Race-Screen-Platzhalter aus M1 durch **Text-Rennen** ersetzen: sechs Fortschrittsbalken (DOM, Pferdefarben), die die Engine live abspielen (fixed timestep via `render/loop.js`, der hier bereits entsteht). Event-Log als Textzeile. So ist das Rennen erstmals _erlebbar_, auch ohne Canvas.
10. Debug-Modus (`?debug=1`, `?seed=`) laut `03_RACE_ENGINE.md` §9 (Seed-Anzeige, Taste F/R/S).
11. CI: `audit:fairness` läuft jetzt echt (N = 100k, < 60 s). `PROGRESS.md`, Commit `chore: complete M2`.

**DoD**

- `npm run audit:fairness` grün mit N = 100k und lokal einmal mit N = 1M (Report-Auszug in `PROGRESS.md`).
- Alle Engine-Tests grün; Coverage `src/engine/` ≥ 90 % Zeilen.
- Text-Rennen zeigt sichtbare Führungswechsel und Aufholjagden.

**Audit:** A2 (Fairness- & Suspense-Audit) + A6

**Nutzer-Test:** 10 Text-Rennen anschauen. Frage: „Hätte ich den Sieger vorhersagen können?“ Muss „nein“ sein. Seed-Anzeige testen: `?seed=42` liefert zweimal dasselbe Ergebnis.

---

## M3 – Render-Core: Loop, Kamera, Bahn & das Pferd (Landscape)

**Ziel:** Das Rennen ist im Landscape-Modus als hübsche Canvas-Animation zu sehen: sechs prozedural gezeichnete Pferde galoppieren geschmeidig über eine schöne Bahn, Kamera folgt, Startboxen klappen auf, Zieleinlauf.

**Tasks**

1. `render/loop.js` finalisieren (Akkumulator, Interpolation `alpha`, Pause bei `visibilitychange`, `timeScale` für Zeitlupe).
2. Canvas-Setup im Race-Screen: DPR-Skalierung (max 2×), Resize-Handling, Layout-Modus-Erkennung (`aspect ≥ 1.2` → Landscape).
3. `render/camera.js`: Follow-Lerp, Zoom-Regel, `worldToScreen`, Shake-Trauma-Modell (vorerst ungenutzt).
4. `render/track.js` (Landscape): Himmelsverlauf, Hügel, Tribüne mit Publikum, Zaun, 6 Sandbahnen mit Linien, Rasen-Vordergrund, Streckenmarker, Ziellinie mit Banner, Startboxen in Signaturfarben mit Nummern. Hintergrund in Offscreen-Canvas cachen.
5. `render/horse.js` (Seitenansicht) gemäß `04_DESIGN_SYSTEM.md` §5.1–5.2: Schatten, Beine mit Gelenkwinkeln, Körper, Hals/Kopf, Mähne/Schweif mit Follow-Through, Sattel/Zaumzeug/Jockey in Signaturfarbe, Accessoires pro Pferd. **Zuerst** eine Test-Seite `dev/horse-lab.html` bauen, die ein einzelnes Pferd groß in allen Farben und mit Slider für Speed zeigt – so lässt sich die Animation isoliert perfektionieren.
6. `render/horseAnimations.js`: States `idle`, `gallop`, `gallop_fast`, `celebrate`, `trot_in` mit Blend-Übergängen. (Event-States folgen in M5.)
7. Race-Screen verdrahten: Countdown-Overlay (DOM) → Boxen öffnen → Engine startet → Pferde folgen `raceState` (interpoliert) → Zieleinlauf: Sieger `celebrate`, Rest `trot_in` → nach 2,5 s zum Ergebnis-Screen.
8. Staub-Partikel bei Hufaufsatz (`particles.js` Grundgerüst mit Pool, Typ `dust`).
9. Leaderboard (DOM, FLIP-Animation) und Fortschrittsbalken (DOM) aus `hud.js`.
10. Performance-Messung: `?debug=1` zeigt FPS und Frame-Time (Update/Render getrennt). Ziel-Budget einhalten.
11. `PROGRESS.md`, Commit `chore: complete M3`.

**DoD**

- Ein Rennen ist auf Desktop komplett anschaubar und sieht „nach Spiel“ aus (kein Platzhalter-Rechteck mehr).
- Gallop-Animation flüssig, keine Sprünge bei Tempowechseln; Mähne/Schweif reagieren auf Geschwindigkeit.
- 60 FPS auf Desktop, Frame-Time-Budget eingehalten.
- Pferde sind allein an Farbe (Sattel, Trikot, Box) und Form zuordenbar.

**Audit:** A3 (Visual- & Animations-Audit) + A5 (Performance-Audit, Desktop-Teil)

**Nutzer-Test:** 5 Rennen auf dem Laptop schauen. Ist es geschmeidig? Erkennt man sein Pferd sofort? Screenshot des Zieleinlaufs in `docs/screenshots/` ablegen.

---

## M4 – Portrait-Modus, Responsive & Mobile-Feinschliff

**Ziel:** Das Spiel ist auf dem Handy (Portrait) gleichwertig gut: vertikale Bahnen, Rückansicht der Pferde, Kamera vertikal, HUD angepasst.

**Tasks**

1. `track.js` Portrait-Variante: 6 vertikale Bahnen, Startboxen unten, Ziellinie oben, Tribünen links/rechts, Parallax vertikal.
2. `horse.js` Rückansicht gemäß `04_DESIGN_SYSTEM.md` §5.4; in `horse-lab.html` Umschalter Seiten-/Rückansicht.
3. Kamera vertikal; Feld-Zentrierung; Zoom-Regel für schmale Screens.
4. HUD Portrait: Leaderboard als horizontale Punktreihe oben, Fortschritt als dünne Leiste, Kommentar-Panel unten mit Safe-Area-Insets (`env(safe-area-inset-bottom)`).
5. Live-Umschaltung bei Rotation ohne Neustart des Rennens.
6. Touch-Ergonomie: Buttons ≥ 48 px, keine Hover-only-Zustände, `touch-action: manipulation`, kein Doppeltipp-Zoom; Wetten-Screen mit Daumen erreichbar (Stepper unten).
7. Desktop-Breakpoints (≥ 900 px, ≥ 1400 px/TV): größere Typo, Karten-Grid 3×2, Rennen mit größerer Sichtbreite.
8. Performance auf Mittelklasse-Handy messen (Chrome DevTools Remote oder Safari Web Inspector); ggf. Partikel-Budget und Schatten reduzieren (`quality: 'auto'` in `config.js`, das bei < 50 FPS über 2 s herunterschaltet).
9. `PROGRESS.md`, Commit `chore: complete M4`.

**DoD**

- Auf iPhone/Android Portrait: kompletter Durchlauf, Rennen gut lesbar, eigenes Pferd sofort erkennbar.
- Rotation während des Rennens funktioniert.
- ≥ 55 FPS auf Mittelklasse-Handy.

**Audit:** A3 (Portrait-Teil) + A5 (Mobile-Teil) + A4 (Barrierefreiheit, Basis)

**Nutzer-Test:** Handy herumreichen, jeder setzt, Rennen im Portrait anschauen; einmal drehen während des Rennens.

---

## M5 – Events: Requisiten, Animationen, Partikel

**Ziel:** Alle Events aus GDD §4 sind sichtbar, lustig und lesbar. Das Rennen ist eine Show.

**Tasks**

1. Animations-States für alle Events in `horseAnimations.js`: `stumble`, `limp`, `vomit`, `pee`, `sleep`, `wake`, `hiccup`, `confused`, `slip`, `pose`, `graze`, `fly`; in `horse-lab.html` per Dropdown abspielbar (Seiten- und Rückansicht!).
2. `render/eventVisuals.js`: Requisiten mit Vorlauf (`upcoming`): Banane fliegt vom Bildrand mit Rotation und landet exakt bei `t_e`; Taube fliegt ein; Möhre am Stock erscheint von oben; Fan mit Handy; Regenbogen-Trail; Windlinien; Jockey purzelt und bleibt am Rand sitzen; Hufeisen segelt; Flitzer mit Security; Steppenläufer; UFO mit Traktorstrahl; Kamera-Blitze.
3. Bleibende Dekor-Objekte (Schale, Pfützen, Hufeisen, Jockey) in `track.js` als Layer über der Bahn.
4. Partikel-Typen komplett: `confetti`, `star`, `sparkle`, `rainbow`, `splash`, `zzz`, `heart`, `question`, `speedline`.
5. Kamera-Shake bei `stumble`, `banana`, `streaker`; Publikum-Reaktion (Wippen) bei jedem Event.
6. Event-Toasts (Trinkregeln) in `hud.js` mit 🍺 und betroffenen Spielernamen (aus Bets), 3 s, gestapelt max. 2.
7. `data/events.js`: Kommentator-Zeile je Event (mind. 2 Varianten), Gewichte final.
8. Reduced-Motion-Pfad: Shake/Blitz aus, Partikel −70 %, Requisiten bleiben (sind Inhalt).
9. Fairness-Audit erneut laufen lassen (Effekte unverändert? Wenn Parameter angefasst wurden: Tuning-Schleife wiederholen).
10. `PROGRESS.md`, Commit `chore: complete M5`.

**DoD**

- Jedes Event einmal im `horse-lab` und einmal im echten Rennen gesehen (Checkliste in `PROGRESS.md`).
- Requisiten treffen zeitlich exakt den Effekt (Banane landet → Rutsch beginnt im selben Frame).
- Kein Event ist unlesbar (man versteht auch ohne Kommentar, was passiert).
- Fairness-Audit grün.

**Audit:** A3 (Event-Teil) + A2 (Re-Run) + A5

**Nutzer-Test:** Chaos-Level „Vollgas“, 5 Rennen: Welche Events sind am lustigsten, welche unklar? Notizen in `PROGRESS.md` unter „Playtest“.

---

## M6 – Design-Polish: Countdown, Fotofinish, Podium, Micro-Interactions

**Ziel:** Das Spiel fühlt sich fertig an. Jeder Übergang hat Easing, jeder Moment hat Wumms.

**Tasks**

1. Countdown-Overlay mit Bounce-Scale, „LOS!“ mit Screen-Flash; Startboxen mit Bounce-Open; Startglocke-Cue (Sound folgt M7).
2. Fotofinish: Erkennung in Engine-State (Abstand Top-2 < 1 % in den letzten 3 %), Zeitlupe via `timeScale`, Zoom auf Ziellinie, Vignette, Blitze, „FOTOFINISH!“-Banner.
3. Zieleinlauf-Sequenz: Sieger `celebrate` (Aufbäumen, Jockey jubelt), Konfetti-Kanonen in Siegerfarbe, Publikum La-Ola, Vorhang-Transition zum Ergebnis.
4. Ergebnis-Screen: Podium mit Stagger-Einsprung der Pferde (prozedural, Mini-Canvas oder Inline-SVG-Portraits), Gewinner-/Verlierer-Karten mit Einflug, Haus-gewinnt-Sonderkarte.
5. Start-Screen Attract-Mode: Idle-Pferde auf der Bahn (Canvas im Hintergrund), Titel-Wackeln, Parallax bei Mausbewegung/Gyro (optional, reduced-motion-aware).
6. Wetten-Screen: Prozedurale Pferde-Portraits (Kopf mit Accessoire) statt Farbkreis; Karten-Auswahl-Animation; Stepper-Ziffernrolle; Übersicht mit Chips.
7. Screen-Transitions, Button-States, Fokus-Ringe, Toast-Animationen finalisieren.
8. Haptik (`navigator.vibrate`) an Tap/Event/Sieg.
9. Leerzustände & Fehlerzustände: „Rennen wurde abgebrochen“ nach Reload, „Pausiert“ bei Tab-Wechsel, Private-Mode-Hinweis.
10. `PROGRESS.md`, Commit `chore: complete M6`.

**DoD**

- Kein „poppendes“ Element mehr (alles hat Transition), keine Layout-Sprünge (CLS ≈ 0).
- Fotofinish tritt in 25–45 % der Rennen auf und ist ein Moment, den man feiert.
- Screens sehen auf Handy und Desktop aus wie aus einem Guss.

**Audit:** A1 (Re-Run) + A3 (Polish-Teil) + A4

**Nutzer-Test:** Drei Personen, die das Spiel nicht kennen, spielen ohne Erklärung. Wo stocken sie? Wo lachen sie? Notizen in `PROGRESS.md`.

---

## M7 – Sound, Kommentator, Wettarten, Statistik, Einstellungen

**Ziel:** Audio-Ebene, Live-Kommentar, alle Spieloptionen aus dem GDD.

**Tasks**

1. `audio/audio.js`: Context-Unlock bei erster Interaktion, Master-Gain, Mute-Toggle mit Fade, Persistenz der Einstellung.
2. `audio/sfx.js`: alle Cues aus `04_DESIGN_SYSTEM.md` §10 synthetisiert (Web Audio). Hufgetrappel-Loop mit Tempo-Kopplung, Menge mit Finish-Crescendo, Lowpass beim Fotofinish.
3. `data/commentary.js` + `render/hud.js`: Kommentator-Engine: Zeilen-Pool (Start, Führungswechsel mit Pferdename, Event, Endspurt, Fotofinish, Sieg, Haus-Sieg), keine Wiederholung innerhalb eines Rennens, Wechsel alle 2–4 s, Priorität Event > Führungswechsel > Filler. Mind. 80 Zeilen insgesamt.
4. Wettarten Sieg/Platz/Letzter/Frei im Betting-Screen und in `payout.js` (Tests existieren seit M1 – erweitern).
5. Führungswechsel-Regel (Einstellung) → Toast + Ergebnis-Rückblick.
6. Session-Statistik-Screen: pro Spieler getrunken/verteilt/Siege/Pechsträhne, Sortierung, „Session zurücksetzen“; Rennhistorie als Farbpunkte (letzte 20) im Start-Screen.
7. Alkoholfrei-Modus: Wording „Punkte“ überall (zentrale `t()`-Funktion für Strings in `ui/strings.js`).
8. Einstellungen vollständig verdrahten (Renndauer, Chaos, Regeln, Sound, Vibration, Reduced Motion, Debug-Optionen).
9. Regeln-Screen mit Verantwortungs-Hinweis (GDD §8).
10. `PROGRESS.md`, Commit `chore: complete M7`.

**DoD**

- Sound auf iOS Safari und Android Chrome funktioniert nach erstem Tap; Mute wirkt sofort.
- Kommentator liefert in 10 Rennen keine doppelte Zeile innerhalb eines Rennens.
- Alle Einstellungen wirken und überleben Reload.
- Payout-Tests decken alle Wettarten × Haus-Sieg × Mehrfach-Gewinner ab.

**Audit:** A1 + A6 + A2 (Re-Run, Sicherheit: Wettarten dürfen Engine nicht berühren)

**Nutzer-Test:** Rennen mit Ton, Modus „Letzter“ und Führungswechsel-Regel testen.

---

## M8 – PWA, Offline, Performance & Barrierefreiheit

**Ziel:** Installierbar auf dem Homescreen, offline lauffähig, schnell, zugänglich.

**Tasks**

1. `manifest.webmanifest` (Name, Icons 192/512 aus prozedural gerendertem Pferdekopf, `display: standalone`, `orientation: any`, Theme-Color), Apple-Meta-Tags.
2. `sw.js`: Cache-First für alle eigenen Assets mit Versionsstring; Update-Hinweis-Toast („Neue Version – neu laden“).
3. Performance-Pass: Profiling auf Mobile, Offscreen-Caches prüfen, Partikel-Pool, keine GC-Spikes im Rennen (Chrome Performance Panel: kein Frame > 16 ms in 30 s Rennen außer Fotofinish-Umschaltung).
4. Ladezeit: Gesamtgröße messen (< 300 KB), Fonts `font-display: swap`, kein Render-Blocking.
5. Barrierefreiheit: `aria-live`-Region für Führungswechsel/Ergebnis, Fokus-Reihenfolge, Tastatursteuerung des gesamten Flows, Kontrast-Check, Reduced-Motion-Pfad vollständig.
6. Randfälle aus `02_ARCHITECTURE.md` §9 durchtesten (Tab-Wechsel, Rotation, Reload, Private Mode, kein WebAudio).
7. `PROGRESS.md`, Commit `chore: complete M8`.

**DoD**

- Lighthouse (Mobile): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, PWA installierbar.
- Flugmodus nach erstem Laden: Spiel vollständig spielbar.

**Audit:** A4 (vollständig) + A5 (vollständig)

**Nutzer-Test:** Auf dem Handy „Zum Home-Bildschirm“ hinzufügen, Flugmodus an, spielen.

---

## M9 – Release: E2E-Tests, Final-Audits, Deployment, Playtest

**Ziel:** Version 1.0 live auf GitHub Pages, mit dokumentiertem Nachweis der Qualität.

**Tasks**

1. `tests/e2e/smoke.spec.js` (Playwright, Chromium + WebKit, Mobile-Viewport): Start → 3 Spieler → Wetten → Rennen mit `?seed=42&debugSkip=1` (vorspulen) → Ergebnis prüft Gewinner-Text → nächstes Rennen. Zweiter Test: Einstellungen ändern und Reload.
2. `.github/workflows/deploy.yml`: bei Push auf `main` nach grüner CI → GitHub Pages (Actions-Deploy aus Repo-Root; `.nojekyll`). Pfade prüfen (Repo-Subpfad `/Pferderennen/`): alle Assets relativ, Service-Worker-Scope korrekt.
3. Fairness-Audit mit `--n=1000000` lokal, Report in `docs/audits/fairness-v1.0.json` + Kurzfassung in `README.md` („Bewiesen fair: …“).
4. Vollständiger Audit-Durchlauf A1–A6, Ergebnis in `docs/audits/release-v1.0.md`.
5. README finalisieren: Screenshots/GIF (Landscape + Portrait), Regeln, Einstellungen, „Wie fair ist das?“-Abschnitt mit Link auf Engine-Doku, Entwicklung lokal, Lizenz (MIT).
6. `CHANGELOG.md` v1.0.0, Git-Tag `v1.0.0`, GitHub-Release.
7. Playtest-Protokoll-Vorlage `docs/PLAYTEST_TEMPLATE.md` (Datum, Spielerzahl, Renndauer, Chaos-Level, was lief gut, was nervte, Bugs) – für den nächsten Spieleabend.
8. `PROGRESS.md`: Backlog-Ideen (GDD §5 Prio B) als offene Punkte für v1.1 auflisten. Commit `chore: complete M9 – release v1.0.0`.

**DoD**

- `https://lukabpunkt.github.io/Pferderennen/` läuft auf Handy und Desktop.
- CI + Deploy grün, E2E grün, alle Audits dokumentiert bestanden.

**Audit:** A7 (Release-Audit)

**Nutzer-Test:** Der echte Spieleabend. Playtest-Protokoll ausfüllen.

---

## M10 – Die Show: Startpistole, Zielband, Renn-Effekte, Siegerehrung

**Ziel:** Das Rennen bekommt Anfang, Höhepunkt und Schluss. Nichts davon berührt die Simulation.

**Tasks**

1. Zielband über der Ziellinie, das der Sieger an seiner Bahn zerreißt; die Hälften bleiben an den Pfosten, werden nach vorn mitgerissen und fallen flatternd. Zustand außerhalb des Tracks, weil ein Orientierungswechsel den Track neu baut.
2. Startpistole: Starter an der vorderen Bande, Arm über die drei gezählten Schritte nach hinten hoch, bei „LOS!“ Blitz, Rauch und Knall. Der Countdown meldet jeden Schritt, statt nur sein Ende.
3. Renn-Effekte: Dreckfetzen, Speedlines, Blitzlichtgewitter in der Tribüne, Kamera-Push im Schlussdrittel – alles an der Qualitätsstufe.
4. Siegerehrung als Canvas-Szene auf dem Ergebnis-Screen (§4.5 des Design-Systems einlösen): Sockel 3/2/1, Einmarsch mit 250 ms Stagger, Jockeys steigen ab und stellen sich aufs Treppchen, Konfetti. Auf Abruf geladen; die Namen bleiben echter Text darunter.
5. `docs/04_DESIGN_SYSTEM.md` nachziehen, `PROGRESS.md`, Commit `chore: complete M10`.

**DoD**

- Fairness-Audit liefert **identische** Zahlen wie vorher – der Beweis, dass alles rein kosmetisch ist.
- Kein verworfener Frame im Rennen; Lighthouse Mobile weiter ≥ 90 / ≥ 95 / ≥ 95, CLS 0, Initial Load < 300 KB.
- Jeder neue Effekt hat einen Reduced-Motion-Pfad und funktioniert in beiden Orientierungen.

**Audit:** A3 (vollständig) + A5 + A4 (die Ehrung ersetzt echten Text) + A2 (Re-Run als Beweis)

**Nutzer-Test:** Ein Rennen mit Ton von vorn bis hinten ansehen. Fühlt sich der Start wie ein Start an?

---

## M11 – Wetten übernehmen

**Ziel:** Ein Wiederholungsrennen kostet drei Taps statt zwei pro Spieler. Wer sein Pferd behalten will, tut nichts; wer wechseln will, tippt seine Zeile an.

**Tasks**

1. `lastBets` im State: Schnappschuss der gelaufenen Wetten in `race/setResult`, gefiltert auf noch existierende Spieler wiederhergestellt, überlebt den Reload.
2. Neue Action `bets/repeat`, die `bettingTurn` ans Ende setzt, damit statt der Reihum-Auswahl direkt die Übersicht erscheint.
3. Übersicht listet **alle** Spieler statt nur die mit Wette; jede Zeile ist ein Bedienelement, das genau diesen Spieler in die Pferdeauswahl führt. Dazugekommene Spieler stehen als „noch offen" drin.
4. Übernehmen-Karte auf dem Wett-Screen: „Wetten übernehmen" oder „Alle neu setzen", einmal pro Besuch.
5. E2E auf den neuen Ablauf umschreiben, Doku, `chore: complete M11`.

**DoD**

- Fairness-Audit liefert **identische** Zahlen – Wetten erreichen die Simulation nie.
- `reducers.js` bleibt bei 100 % Branch Coverage.
- „Rennen starten" bleibt gesperrt, solange eine Wette offen oder eine Änderung unbestätigt ist.
- Jede Zeile ist per Tastatur erreichbar, Tap-Ziel ≥ 48 px, sprechender Name.

**Audit:** A1 + A6 + A4 (die Übersicht wird von Text zu Bedienelementen) + A2 (Re-Run als Beweis)

**Nutzer-Test:** Zweimal hintereinander dasselbe Rennen starten und dabei genau einen Spieler das Pferd wechseln lassen. Geht das schneller als vorher?

---

## M12 – Schlücke direkt in der Zeile

**Ziel:** Den Einsatz eines Spielers ändern, ohne den Screen zu wechseln. Das Pferd zu wechseln ging seit M11; den Einsatz auch, aber nur über die Pferdeauswahl — und deren Panel liegt auf dem Handy unter der Falz, hinter 516–621 px Pferde-Raster.

**Tasks**

1. `betRow()` umbauen: Die Zeile hört auf, selbst ein Knopf zu sein (Knopf im Knopf ist ungültig), und trägt zwei Bedienelemente — links der Pick-Knopf in die Pferdeauswahl, rechts ⊖ ⊕ für den Einsatz.
2. `onStake` im Wett-Screen: `bets/place` mit unveränderter Wette und `sips ± 1`. Keine neue Action — der Reducer ersetzt und klemmt schon.
3. Fokus-Rückgabe über `data-stake`, mit Übergabe an den Partnerknopf, wenn der gedrückte an der Grenze deaktiviert wird.
4. Umbruch auf zwei Ebenen unter 560 px; Tap-Ziele bleiben 48 × 48 px.
5. Tests, Doku, `chore: complete M12`.

**DoD**

- Fairness-Audit liefert **identische** Zahlen.
- Ein Einsatz-Tipp setzt kein `editing`: „Rennen starten" bleibt freigeschaltet.
- Die Karte „Beim letzten Rennen habt ihr so gesetzt" bleibt rein lesbar.
- Alle Texte über `sipWord()` / `sips()`, damit der Alkoholfrei-Modus mitkommt.

**Audit:** A1 + A4 (die Zeile bekommt zwei zusätzliche Ziele) + A6 + A2 (Re-Run als Beweis)

**Nutzer-Test:** Zwischen zwei Rennen bei einem Spieler den Einsatz hochdrehen. Reicht ein Tap, oder sucht man doch wieder die Pferdeauswahl?

---

## M13 – Das Fundament: Schrift, Farbsystem, Tiefe, Icons

**Ziel:** Die UI-Hülle bekommt das Niveau des Canvas-Artworks. Nichts davon ist für sich ein Feature; zusammen ist es der Unterschied zwischen „jemand hat Farben ausgesucht" und „jemand hat ein System gebaut".

**Tasks**

1. Fredoka ausliefern: Variable-woff2, Latin-Subset, Preload mit `crossorigin`, Fallback mit Metrik-Überschreibung gegen den Font-Swap-Sprung.
2. `tokens.css` dreistufig: Primitive (OKLCH-Skalen) → Semantik → Komponente. Skalen so verankert, dass die Marke bitgleich erhalten bleibt.
3. Fluide Typo-Skala per `clamp()` zwischen 360 px und 1440 px, plus TV-Anhebung ab 1400 px. Abstandsskala ohne zwei Nachbarn näher als 25 %.
4. Vierstufiges Elevation-System, drei gestapelte Schatten je Stufe, warme Schattenfarbe; die 4-px-Unterkante gilt ab jetzt für alles Drückbare.
5. Verschachtelte Radien nach der Regel Innen = Außen − Abstand.
6. Icon-Set als Inline-SVG, Emoji-als-Icon verschwindet (Avatare bleiben).
7. Aufräumen: 25 tote Tokens, `.btn--danger:active`, `.input:focus`.

**DoD**

- Fairness-Audit liefert **identische** Zahlen.
- **CLS bleibt 0** trotz Webfont, Lighthouse-Barrierefreiheit bleibt 100.
- Kontrast-Sweep über jeden Screen mit Alpha-Komposition: 0 Verstöße.
- Außerhalb von `tokens.css` steht kein einziger Hex-Wert und kein rohes Primitiv.

**Audit:** A1 + A4 + A5 + A6 + A2 (Re-Run als Beweis)

**Nutzer-Test:** Das Menü auf dem Handy anschauen. Sieht das nach einem Produkt aus?

---

## M14 – Die Screens

**Ziel:** Jeder Screen wird komponiert statt gestapelt. Leitgedanke aus der Party-Game-Praxis: eine Entscheidung pro Screen, eine unübersehbare Hauptaktion, aus zwei Metern lesbar — das Publikum ist angetrunken.

**Tasks**

1. Menü als Titelbild: Inhalt vertikal ausbalanciert statt oben angeklebt, Marke groß, Utilities ruhig, „Spieler ändern" unter der Hauptaktion. Der Attract-Track blendet sich in den Himmel ein statt auf einer harten Linie anzufangen.
2. Spieler-Screen wird ein Panel statt eines Formulars; Zeilen sind Zeilen, nicht Karten; Zählung in den Header.
3. Statistik: drei Kennzahl-Kacheln über der Tabelle, Tabelle mit Führenden-Zeile, Avatar mit Abstand.
4. Ergebnis: Beschriftung benennt die Canvas-Szene, statt ein zweites Podest darunter zu bauen; Auszahlungskarten tragen ihr Signal einmal statt dreimal und stapeln auf dem Handy.
5. Scroll-Andeutung: Modal-Körper mit Scroll-Schatten, Screen-Fuß greift über den Körper, damit Inhalt ausblendet statt abgeschnitten zu werden.
6. Renn-Chrome: Anzeigetafel und Kommentar als echtes Milchglas (Füllung + Blur + Haarlinie + `prefers-reduced-transparency`), Event-Toast auf 18 px.
7. Großer Bildschirm: Ränder, Overscan-Reserve, zweispaltige Auszahlungen.

**DoD**

- Fairness-Audit liefert **identische** Zahlen.
- Kontrast-Sweep über **alle** Ansichten inklusive Renn-Screen (dort gegen echte Canvas-Pixel gemessen): 0 Verstöße, alle Tap-Ziele ≥ 48 px, kein horizontales Scrollen.
- CLS bleibt 0, Lighthouse-Barrierefreiheit 100.

**Audit:** A1 + A3 + A4 + A5 + A2 (Re-Run als Beweis)

**Nutzer-Test:** Das Spiel einem Menschen zeigen, der es nicht kennt. Sieht es aus wie etwas, das man kaufen würde?

---

## Nach v1.0 – Backlog (v1.1+)

Siehe GDD §5 Priorität B: Jackpot-Runde, Pechvogel-Bonus, Sudden Death, Wetter-/Strecken-Varianten, Share-Card, Zuschauer-Emojis, Sprite-Sheet-Option. Jedes Feature bekommt einen eigenen Mini-Meilenstein mit denselben Regeln (DoD + Audit + Fairness-Re-Run).
