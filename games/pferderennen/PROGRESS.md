# PROGRESS – Fortschritts-Tracker

> **Für Claude Code:** Diese Datei ist deine To-do-Liste und dein Gedächtnis. Beginne jede Session damit, sie zu lesen. Hake Tasks ab, trage Audit-Ergebnisse ein, notiere Entscheidungen. Details zu jedem Task stehen in `docs/05_MILESTONES.md`.

**Aktueller Stand:** **M5 abgeschlossen** (Events; Audits A2, A3 und A5 bestanden). Nächster Schritt: **M6 – Design-Polish**.

**Live-URL:** _(wird in M9 eingetragen)_

---

## Meilensteine

### M0 – Projekt-Setup & Tooling

- [x] 1. Git/Remote eingerichtet (`main`, origin = lukabpunkt/Pferderennen)
- [x] 2. package.json mit Scripts & Dev-Deps (alle sieben Pflicht-Scripts, `type: module`)
- [x] 3. .gitignore, .prettierrc, .prettierignore, eslint.config.js (inkl. Engine-Sonderregeln)
- [x] 4. Verzeichnisstruktur + 35 Platzhalter-Module mit JSDoc-Kopf
- [x] 5. index.html (Viewport, theme-color, CSP, Canvas, #app, aria-live) + main.js
- [x] 6. tokens.css (alle Tokens aus 04 §2/§3) + base.css
- [x] 7. config.js mit Startwerten aus 03_RACE_ENGINE.md
- [x] 8. data/horses.js (6 Pferde, je 6 Kommentator-Zeilen)
- [x] 9. Vitest-Grundgerüst grün (9 Tests + 7 `it.todo`)
- [x] 10. CI-Workflow angelegt
- [x] 11. README.md (Befehlstabelle, Doku-Index, Screenshot-Platzhalter)
- [x] 12. PROGRESS aktualisiert, `chore: complete M0`
- [x] **Audit A0 bestanden**

### M1 – State, Router & UI-Screens

- [x] 1. store.js + reducers.js + Tests (alle geforderten Actions, 100 % Branch-Coverage)
- [x] 2. persistence.js + Test (versioniert, Migrations-Hook, Private-Mode-fest)
- [x] 3. router.js + Transitions (Hash-Navigation, Guards, Slide+Fade)
- [x] 4. components (button, stepper, toast, modal) + dom.js, layout.js
- [x] 5. Screens start/players/betting/race/results/rules/settings/stats
- [x] 6. engine/payout.js + Tests (Sieg/Platz/Letzter/Frei, Haus, Event-Regeln)
- [x] 7. Placeholder-Race-Screen (Sieger via `crypto`, Fisher-Yates ohne Modulo-Bias)
- [x] 8. components.css + screens.css
- [x] 9. `chore: complete M1`
- [x] **Audit A1 bestanden**
- [x] **Audit A6 bestanden**

### M2 – Race Engine & Fairness-Audit

- [x] 1. rng.js (sfc32, fork, gaussian, weighted) + 25 Tests
- [x] 2. effects.js + data/events.js (alle 22 Events aus GDD §4) + 29 Tests
- [x] 3. speedModel.js mit Varianz-Rampe im Phasenprofil
- [x] 4. eventScheduler.js (Fenster, Abstand, Max-pro-Läufer, Slipstream)
- [x] 5. race.js (fixer Timestep, interpolierter Zieleinlauf, allokationsfreier Hot Path)
- [x] 6. race.test.js (50 Seeds Determinismus, 10.000 Rennen Scheduler-Constraints, Isolation)
- [x] 7. tests/fairness/audit.js (eigener Chi²-Test, Worker-Threads, JSON-Report, Exit-Code)
- [x] 8. Tuning-Schleife abgeschlossen (Protokoll unten)
- [x] 9. Text-Rennen im Race-Screen + loop.js
- [x] 10. Debug-Modus (`?debug=1`, `?seed=`, Tasten F/R/S)
- [x] 11. CI mit echtem Fairness-Audit, `chore: complete M2`
- [x] **Audit A2 bestanden** (220k in CI, 1,8 Mio. lokal)
- [x] **Audit A6 bestanden**

### M3 – Render-Core (Landscape)

- [x] 1. loop.js final (Akkumulator, Interpolation, Pause bei `visibilitychange`, `timeScale`)
- [x] 2. Canvas-Setup mit DPR-Deckel, Resize-Handling
- [x] 3. camera.js (Follow-Lerp, Zoom-Regel, Shake-Trauma, Start- und Ziel-Klammer)
- [x] 4. track.js Landscape mit Offscreen-Cache für Hügel und Tribüne
- [x] 5. horse.js Seitenansicht + `dev/horse-lab.html`
- [x] 6. horseAnimations.js: idle, gallop, gallop_fast, trot_in, celebrate mit Blend
- [x] 7. Race-Screen verdrahtet (Countdown → Boxen → Rennen → Jubel → Ergebnis)
- [x] 8. Staub-Partikel mit festem Pool
- [x] 9. Leaderboard (FLIP) + Fortschrittsleiste + Kommentar-Zeile
- [x] 10. FPS, Frame-Time, Partikel und Pfad-Operationen im Debug-Overlay
- [x] 11. `chore: complete M3`
- [x] **Audit A3 bestanden** (Pferd, Bahn, Kamera)
- [x] **Audit A5 bestanden** (Desktop)

### M4 – Portrait-Modus & Responsive

- [x] 1. `trackPortrait.js`: sechs vertikale Bahnen, Boxen unten, Ziel oben, Tribünen seitlich
- [x] 2. `horseRear.js`: Rückansicht mit großer Farbfläche; Umschalter im horse-lab
- [x] 3. Kamera achsen-agnostisch (dieselbe Kamera bedient beide Orientierungen)
- [x] 4. HUD Portrait: Punktreihe oben, Kommentar unten mit Safe-Area
- [x] 5. Live-Rotation ohne Neustart des Rennens
- [x] 6. Touch-Ergonomie geprüft (alle Ziele ≥ 48 px, `touch-action`, kein Hover-only)
- [x] 7. Desktop- und TV-Breakpoints (≥ 900 px, ≥ 1400 px)
- [x] 8. `quality: 'auto'` senkt bei < 50 FPS über 2 s die Qualität
- [x] 9. `chore: complete M4`
- [x] **Audit A3 bestanden** (Portrait)
- [x] **Audit A5 bestanden** (Desktop-Messung; Gerätemessung als Nutzer-Test offen)
- [x] **Audit A4 bestanden** (Basis)

### M5 – Events

- [x] 1. Alle 12 Event-Animations-States, im Lab per Dropdown abspielbar
- [x] 2. `eventVisuals.js` mit Vorlauf; aufgeteilt in Registry, Requisiten und Emitter
- [x] 3. Bleibende Dekor-Objekte: Bananenschale, Kotz- und Pinkelpfütze, Hufeisen, Jockey
- [x] 4. Alle zehn Partikel-Typen
- [x] 5. Kamera-Shake bei Sturz, Banane und Flitzer; Publikum hüpft bei jedem Event
- [x] 6. Event-Toasts mit Spielernamen, gestapelt max. 2, 3 s
- [x] 7. Zwei Kommentar-Varianten je Event, im Wechsel
- [x] 8. Reduced-Motion-Pfad: kein Shake, keine Blitze, Partikel −70 %, Requisiten bleiben
- [x] 9. Fairness-Audit erneut grün
- [x] 10. `chore: complete M5`
- [x] **Audit A3 bestanden** (Events)
- [x] **Audit A2 bestanden** (Re-Run)
- [x] **Audit A5 bestanden**

Event-Checkliste (im horse-lab **und** im echten Rennen gesehen). Das Lab hat dafür in M5 einen
Event-Wähler bekommen, der die Requisite mit demselben Vorlauf abspielt wie ein echtes Rennen –
ohne ihn wäre die Liste nur zu erraten gewesen.

| Event        | Requisite / Partikel                       | Lab | Rennen |
| ------------ | ------------------------------------------ | --- | ------ |
| banana       | Banane fliegt ein, landet, bleibt als Schale liegen | ✅ | ✅ |
| stumble      | Sturzhaltung, Staubwolke, Kamera-Shake     | ✅  | ✅     |
| vomit        | Kopf am Boden, grüne Fontäne, Pfütze bleibt | ✅ | ✅     |
| pee          | Schweif hoch, Pfütze bleibt                | ✅  | ✅     |
| nap          | ZZZ steigen auf, dann Schreck-Sprint       | ✅  | ✅     |
| pigeon       | Taube fliegt ein, Pferd schüttelt sich     | ✅  | ✅     |
| hiccup       | „hicks"-Sprechblase, Konfetti-Zucken       | ✅  | ✅     |
| mud          | braune Spritzer, humpelnder Gang           | ✅  | ✅     |
| selfie       | Fan am Rand mit Handy und Blitz            | ✅  | ✅     |
| grass        | Kopf im Gras, Halme fliegen                | ✅  | ✅     |
| confused     | Fragezeichen, Pferd dreht sich um          | ✅  | ✅     |
| wardrobe     | Hufeisen segelt weg und bleibt liegen      | ✅  | ✅     |
| carrot       | Möhre am Stock von oben, Funkeln           | ✅  | ✅     |
| rainbow_fart | Regenbogen-Trail hinter dem Pferd          | ✅  | ✅     |
| jockey_off   | Jockey verschwindet vom Pferd und sitzt am Rand | ✅ | ✅ |
| espresso     | Kaffeetasse vor der Nase, Herzchen         | ✅  | ✅     |
| tailwind     | Windlinien                                 | ✅  | ✅     |
| slipstream   | Windlinien                                 | ✅  | ✅     |
| rocket_boots | Funkeln, weite Sprünge                     | ✅  | ✅     |
| streaker     | zwei Figuren queren das Bild, Shake        | ✅  | ✅     |
| tumbleweed   | Steppenläufer rollt durch                  | ✅  | ✅     |
| camera_flash | Blitze am Rand (bei Reduced Motion aus)    | ✅  | ✅     |
| ufo          | UFO mit Traktorstrahl                      | ✅  | ✅     |

### M6 – Design-Polish

- [x] 1. Countdown + Boxen-Öffnen
- [x] 2. Fotofinish
- [x] 3. Zieleinlauf-Sequenz + Konfetti + Vorhang
- [x] 4. Ergebnis-Podium
- [x] 5. Start-Screen Attract-Mode
- [x] 6. Wetten-Screen Portraits + Animationen
- [x] 7. Transitions/States/Fokus finalisiert
- [x] 8. Haptik
- [x] 9. Leer-/Fehlerzustände
- [x] 10. `chore: complete M6`
- [x] **Audit A1 bestanden** (Re-Run)
- [x] **Audit A3 bestanden** (Polish)
- [x] **Audit A4 bestanden**

### M7 – Sound, Kommentator, Wettarten, Statistik

- [x] 1. audio.js
- [x] 2. sfx.js (alle Cues)
- [x] 3. Kommentator-Engine (≥ 80 Zeilen)
- [x] 4. Wettarten komplett
- [x] 5. Führungswechsel-Regel
- [x] 6. Statistik-Screen + Rennhistorie
- [x] 7. Alkoholfrei-Modus / strings.js
- [x] 8. Einstellungen vollständig
- [x] 9. Regeln-Screen + Hinweis
- [x] 10. `chore: complete M7`
- [x] **Audit A1 bestanden**
- [x] **Audit A6 bestanden**
- [x] **Audit A2 bestanden** (Re-Run)

### M8 – PWA, Offline, Performance, Barrierefreiheit

- [x] 1. Manifest + Icons
- [x] 2. Service Worker + Update-Toast
- [x] 3. Performance-Pass
- [x] 4. Ladezeit < 300 KB
- [x] 5. A11y vollständig
- [x] 6. Randfälle getestet
- [x] 7. `chore: complete M8`
- [x] **Audit A4 bestanden** (vollständig)
- [x] **Audit A5 bestanden** (vollständig)

### M10 – Die Show

- [x] 1. Zielband
- [x] 2. Startpistole
- [x] 3. Renn-Effekte
- [x] 4. Siegerehrung
- [x] 5. Doku + `chore: complete M10`
- [x] **Audit A3 bestanden**
- [x] **Audit A5 bestanden**
- [x] **Audit A4 bestanden**
- [x] **Audit A2 bestanden** (Re-Run als Beweis)

### M9 – Release v1.0.0

- [x] 1. E2E-Tests
- [x] 2. deploy.yml + Pages-Konfiguration
- [x] 3. Fairness-Report N=1M
- [x] 4. Release-Audit-Dokument
- [x] 5. README final
- [x] 6. CHANGELOG + Tag + Release
- [x] 7. Playtest-Template
- [x] 8. Backlog v1.1 notiert, `chore: complete M9 – release v1.0.0`
- [x] **Audit A7 bestanden**

### M11 – Wetten übernehmen

- [x] 1. `lastBets` im State, Persistenz, Reducer-Tests
- [x] 2. Action `bets/repeat`
- [x] 3. Übersicht: alle Spieler, Zeilen als Bedienelemente, Einzelnes-Ändern
- [x] 4. Übernehmen-Karte auf dem Wett-Screen
- [x] 5. E2E, Doku, `chore: complete M11`
- [x] **Audit A1 bestanden**
- [x] **Audit A6 bestanden**
- [x] **Audit A4 bestanden**
- [x] **Audit A2 bestanden** (Re-Run als Beweis)

### M12 – Schlücke direkt in der Zeile

- [x] 1. Zeile trägt zwei Bedienelemente statt einem
- [x] 2. `onStake` über `bets/place`
- [x] 3. Fokus-Rückgabe über `data-stake`
- [x] 4. Umbruch auf zwei Ebenen unter 560 px
- [x] 5. Tests, Doku, `chore: complete M12`
- [x] **Audit A1 bestanden**
- [x] **Audit A4 bestanden**
- [x] **Audit A6 bestanden**
- [x] **Audit A2 bestanden** (Re-Run als Beweis)

### M13 – Das Fundament

- [x] 1. Fredoka ausgeliefert (29 KB, Preload, Metrik-Fallback)
- [x] 2. Drei Token-Ebenen, OKLCH-Skalen
- [x] 3. Fluide Typo- und Abstandsskala, TV-Anhebung
- [x] 4. Elevation-System und die Unterkante überall
- [x] 5. Verschachtelte Radien
- [x] 6. Icon-Set statt Emoji
- [x] 7. Aufräumen, Audits, `chore: complete M13`
- [x] **Audit A1 bestanden**
- [x] **Audit A4 bestanden**
- [x] **Audit A5 bestanden**
- [x] **Audit A6 bestanden**
- [x] **Audit A2 bestanden** (Re-Run als Beweis)

### M14 – Die Screens

- [x] 1. Menü als Titelbild, Attract-Track blendet ein
- [x] 2. Spieler-Screen als Panel
- [x] 3. Statistik mit Kennzahlen
- [x] 4. Ergebnis: Beschriftung statt zweitem Podest
- [x] 5. Scroll-Andeutung in Modalen und Screens
- [x] 6. Renn-Chrome als Milchglas
- [x] 7. Großer Bildschirm
- [x] **Audit A1 bestanden**
- [x] **Audit A3 bestanden**
- [x] **Audit A4 bestanden**
- [x] **Audit A5 bestanden**
- [x] **Audit A2 bestanden** (Re-Run als Beweis)

---

## Audit-Protokoll

| Audit | Meilenstein | Datum      | Ergebnis      | Offene Punkte / Link                             |
| ----- | ----------- | ---------- | ------------- | ------------------------------------------------ |
| A0    | M0          | 2026-09-02 | **bestanden** | CI grün: [Run 33649824727](https://github.com/lukabpunkt/Pferderennen/actions/runs/33649824727) |
| A1    | M1          | 2026-09-02 | **bestanden** | 3 Befunde gefunden und behoben; CI grün: [Run 33653292246](https://github.com/lukabpunkt/Pferderennen/actions/runs/33653292246) |
| A6    | M1          | 2026-09-02 | **bestanden** | Ausnahme: zwei CSS-Dateien > 400 Zeilen, begründet    |
| A2    | M2          | 2026-09-02 | **bestanden** | 2 Spannungs-Kriterien nach Messung geändert (S3, S6); CI grün: [Run 33659923149](https://github.com/lukabpunkt/Pferderennen/actions/runs/33659923149) |
| A6    | M2          | 2026-09-02 | **bestanden** | Engine-Coverage 98 % Zeilen, Isolation per Test belegt |
| A3    | M3          | 2026-09-02 | **bestanden** | 2 Befunde gefunden und behoben; Portrait-Teil folgt in M4. CI grün: [Run 33663483553](https://github.com/lukabpunkt/Pferderennen/actions/runs/33663483553) |
| A5    | M3          | 2026-09-02 | **bestanden** | Desktop-Teil; Mobile folgt in M4                       |
| A3    | M4          | 2026-09-02 | **bestanden** | Portrait-Teil; 2 Befunde gefunden und behoben. CI grün: [Run 33666325625](https://github.com/lukabpunkt/Pferderennen/actions/runs/33666325625) |
| A4    | M4          | 2026-09-02 | **bestanden** | Basis; vollständig in M8                               |
| A5    | M4          | 2026-09-02 | **bestanden** | mit einer offenen Messung auf echtem Gerät             |
| A3    | M5          | 2026-09-02 | **bestanden** | Event-Teil; alle 23 Events geprüft. CI grün: [Run 33668940879](https://github.com/lukabpunkt/Pferderennen/actions/runs/33668940879) |
| A2    | M5          | 2026-09-02 | **bestanden** | Re-Run: Fairness von der Render-Schicht unberührt      |
| A5    | M5          | 2026-09-02 | **bestanden** | Ladebudget gerissen und durch Lazy-Loading gelöst      |
| A1    | M6          | 2026-09-02 | **bestanden** | Re-Run, Design-Teil; 1 Befund (Attract-Layout) behoben |
| A3    | M6          | 2026-09-02 | **bestanden** | Polish-Teil; Screenshots in `docs/screenshots/` erneuert |
| A4    | M6          | 2026-09-02 | **bestanden** | 4 echte Befunde gefunden und behoben, davon 3 Kontrast. CI grün: [Run 33672416432](https://github.com/lukabpunkt/Pferderennen/actions/runs/33672416432) |
| A2    | M7          | 2026-09-02 | **bestanden** | Re-Run: Zahlen identisch zu M6 – genau das war der Zweck |
| A6    | M7          | 2026-09-02 | **bestanden** | 2 Befunde behoben; eine begründete Ausnahme (`race.js`, 438 Zeilen) |
| A1    | M7          | 2026-09-02 | **bestanden** | Wettarten, Statistik, Alkoholfrei-Modus im Browser durchgespielt. CI grün: [Run 33676165873](https://github.com/lukabpunkt/Pferderennen/actions/runs/33676165873) |
| A4    | M8          | 2026-09-02 | **bestanden** | vollständig; 3 echte Befunde behoben, Lighthouse A11y 100 |
| A5    | M8          | 2026-09-02 | **bestanden** | vollständig; Lighthouse Mobile 92/100/100/100, TBT 1590 → 0 ms. CI grün: [Run 33679400617](https://github.com/lukabpunkt/Pferderennen/actions/runs/33679400617) |
| A2    | M10         | 2026-09-03 | **bestanden** | Re-Run: Zahlen Ziffer für Ziffer identisch – der Beweis, dass M10 kosmetisch ist |
| A3    | M10         | 2026-09-03 | **bestanden** | Startpistole, Zielband, Ehrung in beiden Orientierungen geprüft |
| A4    | M10         | 2026-09-03 | **bestanden** | Ehrung ersetzt echten Text: Namen bleiben DOM, Canvas mit `role="img"` |
| A5    | M10         | 2026-09-03 | **bestanden** | Lighthouse 91/100/100, CLS 0, Initial Load 184 KB; 2 Altlasten gefunden. CI grün: [Run 33689072183](https://github.com/lukabpunkt/Pferderennen/actions/runs/33689072183) |
| A1    | M11         | 2026-09-03 | **bestanden** | Kein Framework, keine Laufzeit-Abhängigkeit, Farben aus Tokens; 1 Befund behoben (`button()` überschrieb seinen eigenen Namen) |
| A6    | M11         | 2026-09-03 | **bestanden** | `reducers.js` 100 % Branches; `ui/screens/race.js` 580 → 498 Zeilen (`raceCeremony.js` herausgezogen), bleibt eine begründete Ausnahme |
| A4    | M11         | 2026-09-03 | **bestanden** | Zeilen als Bedienelemente: 48 px, Fokusring, sprechende Namen; 0 Kontrastverstöße |
| A2    | M11         | 2026-09-03 | **bestanden** | Re-Run: S1 31,24 %, S5 39,60 %, S6 132 – identisch zum Lauf vor M11. CI grün: [Run 33757159274](https://github.com/lukabpunkt/Pferderennen/actions/runs/33757159274) |
| A1    | M12         | 2026-09-03 | **bestanden** | Farben aus Tokens, keine neue Abhängigkeit; das Bedienelement ist der vorhandene Stepper-Knopf |
| A4    | M12         | 2026-09-03 | **bestanden** | Beide neuen Ziele 48 × 48 px, Kontrast 12,64:1, Tab-Reihenfolge Pick → ⊖ → ⊕ |
| A6    | M12         | 2026-09-03 | **bestanden** | 1 Befund behoben (`betting.js` über 400 Zeilen → `bettingChoice.js`); `reducers.js` weiter 100 % Branches |
| A2    | M12         | 2026-09-03 | **bestanden** | Re-Run: S1 31,24 %, S5 39,60 %, S6 132 – identisch. CI grün: [Run 33780477576](https://github.com/lukabpunkt/Pferderennen/actions/runs/33780477576) |
| A1    | M13         | 2026-09-04 | **bestanden** | Kein Hex außerhalb `tokens.css`, kein Primitiv außerhalb davon, keine Laufzeit-Abhängigkeit |
| A4    | M13         | 2026-09-04 | **bestanden** | Sweep über alle sechs Screens: 0 Verstöße nach 3 Befunden; Lighthouse-A11y **100** |
| A5    | M13         | 2026-09-04 | **bestanden** | **CLS 0** (vorher 0,002), TBT 0 ms, Performance 88–90; Kontrollmessung: die Schrift kostet keine Punkte |
| A6    | M13         | 2026-09-04 | **bestanden** | `tokens.css` 306 Zeilen, `icon.js` 96; keine JS-Datei neu über 400 |
| A2    | M13         | 2026-09-04 | **bestanden** | Re-Run: S1 31,24 %, S5 39,60 %, S6 132 – identisch. CI grün: [Run 33811090693](https://github.com/lukabpunkt/Pferderennen/actions/runs/33811090693) |
| A1    | M14         | 2026-09-04 | **bestanden** | Keine neue Abhängigkeit, kein Hex außerhalb `tokens.css`; ein toter Farbeintrag entfernt |
| A3    | M14         | 2026-09-04 | **bestanden** | Attract-Track blendet in den Himmel ein; Podest und Canvas-Szene widersprechen sich nicht mehr |
| A4    | M14         | 2026-09-04 | **bestanden** | Sweep über **alle 9 Ansichten** inkl. Renn-Screen gegen echte Canvas-Pixel: 0 Verstöße; 1 Altlast behoben |
| A5    | M14         | 2026-09-04 | **bestanden** | CLS **0**, TBT **0 ms**, A11y **100**, Performance 88–89 – unverändert zu M13 |
| A2    | M14         | 2026-09-04 | **bestanden** | Re-Run: S1 31,24 %, S5 39,60 %, S6 132 – identisch. CI grün: [Run 33814664625](https://github.com/lukabpunkt/Pferderennen/actions/runs/33814664625) |
| A7    | M9          | 2026-09-02 | **bestanden** | Release-Audit: [`docs/audits/release-v1.0.md`](docs/audits/release-v1.0.md); 3 Befunde behoben. CI grün inkl. E2E: [Run 33681803057](https://github.com/lukabpunkt/Pferderennen/actions/runs/33681803057) |

### A0 – Setup-Audit im Detail (2026-09-02)

| Prüfpunkt                                            | Ergebnis                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm ci` ohne Peer-Dep-Warnungen                     | ✅ 139 Pakete, 0 Warnungen, **0 Vulnerabilities**                                                                          |
| `dev` / `lint` / `test` / `audit:fairness` Exit 0    | ✅ alle 0; `dev` startet auf :5173 (Vite) bzw. :5174 (`serve`)                                                              |
| CI-Workflow grün                                     | ✅ [Run 33649824727](https://github.com/lukabpunkt/Pferderennen/actions/runs/33649824727) in 13 s, ohne Warnungen           |
| `index.html` ohne Konsolenfehler, CSP blockiert nichts | ✅ im Browser geprüft – 0 Seitenfehler, 0 CSP-Verstöße (einzige Meldung stammt von einer Chrome-Erweiterung)             |
| Verzeichnisstruktur = `02_ARCHITECTURE.md` §2        | ✅ automatisch abgeglichen, 0 fehlende Dateien/Ordner (offen nur, was planmäßig in M1/M3/M8/M9 entsteht)                    |
| `.gitignore` deckt node_modules, Artefakte, OS-Dateien | ✅ node_modules, dist, coverage, test-results, playwright-report, .DS_Store                                               |
| ESLint/Prettier 0 Fehler                             | ✅                                                                                                                          |
| Engine-Sonderregeln greifen                          | ✅ Probe-Datei in `src/engine/` löste **alle 9** Regeln aus (Math.random, Date, window, document, performance, crypto, 3 Imports); identische Probe in `src/render/` blieb sauber → Regeln korrekt auf die Engine begrenzt |

### A1 – UI/UX-Audit (2026-09-02, M1)

Geprüft im Browser bei 360 × 720, 420 × 860 und 1440 × 900.

| Prüfpunkt                                          | Ergebnis                                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Start bis erstes Rennen ≤ 6 Taps (2 Spieler)       | ✅ **genau 6** auf dem Wiederkehrer-Pfad: Weiterspielen → Pferd → Setzen → Pferd → Setzen → Rennen starten. Beim allerersten Start kommen zwangsläufig die Namenseingaben dazu (11). |
| Immer klar, wer dran ist und was zu tun ist        | ✅ Header nennt Avatar + Name („🦊 Nina ist dran"), Fortschritts-Pille zeigt 2/3, Primär-Button nennt den nächsten Schritt |
| „Rennen starten" erst aktiv, wenn alle gesetzt haben | ✅ Button ist durchgehend sichtbar und im disabled-Zustand mit sichtbarem Text begründet („Es fehlen noch 2 Wetten.") |
| Zurück-Navigation zerstört nichts                  | ✅ Hash-Router; Guards leiten ein unerreichbares Ziel auf den nächstbesten Screen um (getestet)                  |
| Reload auf jedem Screen                            | ✅ Spieler, Wetten, Einsatzhöhe, Reihenfolge und Einstellungen überstehen den Reload                             |
| Reload im Rennen                                   | ✅ zurück zu den Wetten, Wetten erhalten, Toast „Rennen wurde abgebrochen"                                       |
| Haus-gewinnt-Fall klar kommuniziert                | ✅ eigene dunkle Karte mit 🏠 über den Trink-Karten                                                             |
| Nur Tokens, keine Hex-Farben                       | ✅ 0 Treffer in `src/styles/*.css` (außer tokens.css) und 0 in `src/ui/**`                                       |
| Buttons ≥ 48 px, primär 56 px                      | ✅ `--tap-min` / `--btn-primary-height`, auf Mobile volle Breite                                                 |
| Keine Schrift < 14 px                              | ✅ kleinster Wert ist `--text-xs` = 14 px                                                                        |
| hover / active / focus-visible / disabled          | ✅ jeweils sichtbar unterschiedlich (Kante, Versatz, Fokusring, Graustufe)                                       |
| Ergebnis in < 3 s verständlich                     | ⏳ **Nutzer-Test erforderlich**                                                                                  |

**Im Audit gefunden und behoben:**

1. Der Screen wuchs über die Viewport-Höhe hinaus, statt dass der Body intern scrollt – dadurch scrollte der Footer mit dem Primär-Button aus dem Bild. (`height: 100dvh` + `min-height: 0` auf dem Flex-Kind.)
2. Ein offenes Modal überlebte einen Screen-Wechsel samt seinem `document`-Keydown-Listener. Der Router schließt jetzt alle Overlays, bevor er den Screen tauscht.
3. Nach einem Reload im Rennen holte der `#/race`-Hash das verlorene Rennen zurück. Jetzt wird die URL überschrieben, bevor der Router startet, und der Spieler landet bei den Wetten.

Kleinere Korrekturen: „+ Spieler" brach auf zwei Zeilen um, der Wetten-Header ignorierte den Alkoholfrei-Modus, die Scroll-Position blieb beim Spielerwechsel stehen, der Primär-Button spannte sich über die volle Desktop-Breite, die Podium-Stufen waren kaum unterscheidbar, und ein Toast lag über dem Primär-Button.

### A6 – Code-Audit (2026-09-02, M1)

| Prüfpunkt                                     | Ergebnis                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| JSDoc-Kopf in jedem Modul                     | ✅                                                                                                 |
| Keine JS-Datei > 400 Zeilen                   | ✅ größte ist `state/reducers.js` mit 280                                                          |
| Keine CSS-Datei > 400 Zeilen                  | ⚠️ **Ausnahme**: `screens.css` (652) und `components.css` (457) – Begründung unter „Entscheidungen" |
| Keine Abhängigkeitszyklen                     | ✅ `engine/` importiert nichts, `state/` nichts aus `ui/`; einzige Kante ist `ui → engine/payout`   |
| Keine Listener-Leaks bei Screen-Wechsel       | ✅ jeder `addEventListener` liegt entweder auf einem Element, das mit dem Screen verschwindet, oder wird in `unmount()`/`close()` entfernt |
| Kein `innerHTML` mit Nutzerdaten              | ✅ ausschließlich `textContent`; `dom.js` bietet gar keinen HTML-Pfad an                            |
| Try/Catch um `localStorage`                   | ✅ vier Blöcke, plus Schreib-Probe für den Safari-Private-Mode                                      |
| Coverage Reducer/Payout 100 % Branches        | ✅ **100 %** Statements, Branches und Funktionen für `src/engine/**` und `src/state/**`             |
| Alle Tests < 20 s                             | ✅ 128 Tests in 0,35 s                                                                             |
| `npm run lint` 0 Fehler, 0 Warnungen          | ✅                                                                                                 |
| Keine TODO/FIXME ohne PROGRESS-Eintrag        | ✅ keine im Code                                                                                    |

Initial Load (unkomprimiert, HTML + JS + CSS): **125 KB** – Budget ist 300 KB.

## Fairness-Tuning-Protokoll (M2)

**Die Fairness war von der ersten Messung an grün** und blieb es durch jede Iteration – genau
das sagt das Symmetrie-Argument voraus: Wenn der Code für alle Läufer identisch ist und der
Zufall symmetrisch, *kann* kein Pferd bevorzugt sein. Getunt wurde ausschließlich die Spannung.

Alle Läufe mit 8.000 Rennen (Feinabstimmung) bzw. 100.000 (Verifikation).
Ziele: S1 25–40 % · S2 45–65 % · S3 ≥ 8 % (alt) · S4 ≥ 4 · S5 25–45 % · S6 < 120 (alt).

| # | Was verändert wurde | S1 | S2 | S3 | S4 | S5 | S6 | offen |
|---|---|---|---|---|---|---|---|---|
| 1 | Startwerte aus der Doku (σ_P 0,11 · σ_F 0,10) | 45,3 | 66,2 | 1,7 | 6,3 | 21,6 | 228 | S1 S2 S3 S5 S6 |
| 2 | σ_P 0,06 · σ_F 0,13 | 40,5 | 57,2 | 2,6 | 8,3 | 26,6 | 174 | S1 S3 S6 |
| 3 | σ_P 0,03 · σ_F 0,15 · σ_N 0,08 · Sprints schwächer | 34,0 | 45,5 | 3,4 | 9,0 | 33,4 | 136 | S3 S6 |
| 4 | Endspurt-Fenster nach vorn (0,45–0,72) | 25,6 | 80,2 | 8,0 | 8,1 | 16,7 | 238 | S2 S3 S5 S6 |
| 5 | Mehr Stützstellen (K bis 18) bei höherem σ_P | 40,3 | 57,4 | 2,3 | 7,2 | 28,3 | 168 | S1 S3 S6 |
| 6 | **Varianz-Rampe im Phasenprofil** (K 12 · σ 0,01→0,17 · Exp 1,3) | 34,1 | 56,1 | 3,7 | 10,6 | 35,0 | 150 | S3 S6 |
| 7 | Sprints erst ab 35 % · σ_N 0,05 · σ_F 0,02 | 32,2 | 54,0 | 3,7 | 11,2 | 35,6 | 144 | S3 S6 |
| 8 | K 16 · σ 0,002→0,22 · Exp 2,5 **(final)** | 31,2 | 49,2 | 3,5 | 11,9 | 39,6 | 132 | S3 S6 |

### Was die Schleife gelernt hat

**Iteration 1–5 haben das eigentliche Problem nicht gefunden.** Sie drehten an σ, an der
Wellenlänge und am Endspurt-Fenster – S1 blieb hoch, S3 blieb niedrig. Ein Spielzeugmodell
(sechs Läufer, Strecke in M Abschnitte, je Abschnitt ein unabhängiger Tempo-Offset) hat dann
gezeigt, warum: **Bei zeitlich gleichmäßiger Varianz liegt S1 strukturell bei ~50 % und S3 bei
~1,5 %, egal wie M und σ gewählt werden.** Ein Vorsprung ist gebankte Strecke; spätere Varianz
holt ihn nicht mehr ein.

Das führte zur **Varianz-Rampe** (Iteration 6): Die Streuung der Stützstellen wächst entlang der
Strecke. Das Feld läuft früh zusammen und fächert spät auf – auch das realistischere Bild eines
echten Rennens. Damit sprangen S1, S2, S4 und S5 sofort in ihre Zielbereiche.

### Zwei Kriterien mussten geändert werden

Zwei Ziele erwiesen sich als unerreichbar. Die Entscheidung darüber lag beim Nutzer; die
Begründung steht in `docs/03_RACE_ENGINE.md` §7.1.

**S3** („Letzter bei 50 % gewinnt ≥ 8 %"): Selbst mit **komplett abgeschalteten Events** kommt
das Modell nur auf 7,05 %; jeder Parametersatz, der weiter geht, drückt S2 unter sein Minimum.
Gemessene Trade-off-Kurve über die Event-Stärke:

| Event-Stärke | S3 | S6 |
|---|---|---|
| 100 % (GDD) | 3,5 % | 144 |
| 70 % | 4,8 % | 128 |
| 50 % | 5,5 % | 120 |
| 35 % | 6,5 % | 116 |
| 0 % | 7,0 % | 106 |

Neues Kriterium: **Platz 4–6 bei Halbzeit gewinnt ≥ 20 %** (gemessen 27,2 %). Das misst
Aufholjagden robuster als eine einzelne Position. Die volle Kurve über 1.000.000 Rennen:

| Position bei 50 % | 1. | 2. | 3. | 4. | 5. | 6. |
|---|---|---|---|---|---|---|
| gewinnt | 31,07 % | 23,12 % | 18,65 % | 14,32 % | 9,27 % | 3,57 % |

**S6** (95. Perzentil Abstand 1. zu 6. < 120 Units): gelockert auf 150. Ein Kotz-Event kostet
1,5 s Stillstand = 50 Units = 5 % der Strecke; mit den Event-Stärken aus dem GDD ist ein
12-%-Feld nicht zu halten. Die Events behalten ihre volle Wucht.

### Release-Lauf: 1.800.000 Rennen

`npm run audit:fairness -- --n=1000000 --sub=200000` · 6:24 min · Bericht in
`docs/audits/fairness-m2.json`.

| Prüfung | Ergebnis |
|---|---|
| Siege je Pferd | 0,16641 · 0,16625 · 0,16677 · 0,16687 · 0,16729 · 0,16641 — **größte Abweichung von 1/6: 0,00062** (erlaubt 0,0060), χ² p = 0,48 |
| Siege je Bahn | 0,16649 · 0,16661 · 0,16702 · 0,16709 · 0,16628 · 0,16651 — χ² p = 0,69 |
| Plätze 2–6 je Pferd | alle χ² p > 0,03 |
| Events je Läufer | χ² p = 0,42 · nie mehr als 2 pro Läufer · 0 Verstöße gegen das 8–95-%-Fenster |
| Je Chaos-Level und Renndauer | alle gleichverteilt, größte Abweichung 0,0016 |
| S1 / S2 / S3 / S4 / S5 / S6 | 31,07 % · 49,00 % · 27,16 % · 11,93 · 39,65 % · 132 Units — **alle im Ziel** |

### Laufzeit-Optimierung

Der erste lauffähige Stand brauchte 124 s für 100.000 Rennen – das CI-Budget sind 60 s.
Auf 58 s gebracht durch: exakte statt Euler-Diskretisierung des OU-Rauschens (erlaubt ein
Drittel der Gauß-Ziehungen bei identischer stationärer Verteilung), vorberechnete
Catmull-Rom-Koeffizienten, Konstanten aus dem Hot Path gehoben, Nebenschleifen in die
Hauptschleife verschmolzen, Slipstream-Prüfung von 60 auf 10 Hz, keine Closure-Allokation
je Schritt. Das vollständige Kriterienraster (220.000 Rennen) läuft mit Worker-Threads
in **51 s**.

Ein CPU-Profil war dabei entscheidend: Die erste Vermutung (die Nebenschleifen) war falsch,
66 % der Zeit steckten im inlinen Modell-Kern selbst.

In der CI dauert das Audit **96 s** – die GitHub-Runner haben vier statt acht Kerne. Das liegt
über dem Richtwert von 60 s aus `03_RACE_ENGINE.md` §7, der sich allerdings auf den reinen
100k-Hauptlauf bezieht (der macht davon rund 44 s aus); die restliche Zeit geht in die vier
Vergleichsläufe und den Partitions-Beweis. Der gesamte CI-Job braucht 2:01 min. Wenn das
irgendwann stört, ist `--sub` der Hebel.

## Entscheidungen

_(Datum – Entscheidung – Begründung)_

- **2026-09-04 – Vollbild wird im Klick-Handler betreten, nicht beim Mount des Renn-Screens.**
  `requestFullscreen()` ist nur innerhalb einer Nutzergeste erlaubt; wenn der Screen montiert, ist
  die Geste vorbei und der Browser lehnt ab. Verlassen wird dagegen an `unmount()` gehängt statt
  ans Rennende — so geben Überspringen, Zurücknavigieren und eine von Hand getippte URL den
  Bildschirm genauso zurück wie ein gewonnenes Rennen.
- **2026-09-04 – Vollbild nur auf Touchgeräten** (`(hover: none) and (pointer: coarse)`). Auf dem
  Desktop ist das Fenster ohnehin groß, und es ungefragt zu übernehmen erschreckt mehr, als es
  hilft.
- **2026-09-04 – Auf dem iPhone gibt es kein Vollbild, und das ist nicht zu umgehen.** Empirisch
  geprüft, nicht aus dem Gedächtnis: In WebKit auf einem iPhone-13-Profil ist
  `document.fullscreenEnabled` **false** und `requestFullscreen` existiert nicht — Safari
  exponiert die API dort nur für `<video>`. Der Code fällt still durch, das Rennen läuft im
  Fenster. Wer die Browser-Leiste loswerden will, installiert das Spiel als PWA; im
  Standalone-Modus ist sie ohnehin weg.

- **2026-09-04 (M14) – Das Menü ist ein Titelbild und benutzt deshalb nicht das Seitenlayout des
  Rests.** Sein Körper zentriert seinen Inhalt in der verbleibenden Höhe (`justify-content: safe
  center`), statt von oben zu stapeln. Vorher standen Marke und Karte oben, der Knopf unten und
  295 px Verlauf dazwischen. `safe` statt `center`, weil ein einfaches Zentrieren den oberen Teil
  unerreichbar abschneidet, sobald der Inhalt höher wird als der Bereich.
- **2026-09-04 (M14) – Die Podest-Beschriftung baut kein zweites Podest.** Ein erster Versuch gab
  ihr echte Stufen — und da die Canvas-Szene darüber bereits Sockel mit Nummern baut, stand
  dasselbe Podest zweimal untereinander. Die Beschriftung ist jetzt, was ihr Name sagt: die
  Bildunterschrift, die nebenbei die drei Namen als echten Text trägt (A4).
- **2026-09-04 (M14) – Der Fuß greift über den Körper.** Der Screen-Körper endete exakt dort, wo
  der Fuß begann, und der Verlauf des Fußes fing genau an dieser Kante transparent an — Inhalt
  wurde also mitten im Wort abgeschnitten. Ein negativer oberer Rand zieht den Fuß darüber, sein
  eigener Verlauf blendet den Inhalt aus.
- **2026-09-04 (M14) – Milchglas gibt es genau einmal, über dem Canvas.** Dort ist der Untergrund
  unser eigener und die Lesbarkeit garantierbar. Über dem Seitenverlauf bliebe nur der Effekt
  übrig, und der sieht billig aus.
- **2026-09-04 (M14) – Der Attract-Track blendet sich im Canvas ein, nicht per CSS-Maske.** Eine
  Maske über dem fertigen Bild trifft die Kante nur zufällig; die Szene weiß selbst, wo ihr
  Horizont liegt. Die Bande ist dabei ganz entfallen: Auf der Rennbahn liest sie sich als Bande,
  weil ringsum Tiefe ist — auf einem flachen Hintergrund ist sie ein heller Strich quer über die
  Seite.

- **2026-09-04 (M13) – Die Skalen sind auf die vorhandene Marke verankert, nicht neu erfunden.**
  `--sand-50`, `--sand-600` und `--sand-900` sind bitgleich mit dem alten Creme, Ink-Soft und Ink;
  `--accent-500` ist `#FF6B35`, `--accent-700` das alte `--accent-dark`. Eine Farbskala soll ein
  vorhandenes Gesicht ausbauen, nicht austauschen — der Wiedererkennungswert war nie das Problem.
- **2026-09-04 (M13) – Das Neutral dreht seinen Farbton über die Leiter** (H 77 oben, H 320 unten).
  Der Hintergrund läuft von Pfirsich nach Flieder; ein Grau mit festem Ton liegt darauf wie ein
  Aufkleber. Warme Lichter, kühle Schatten gehören zum Bild.
- **2026-09-04 (M13) – Body bleibt die Systemschrift.** Zwei Familien sind das Maximum, und
  `system-ui` im Fließtext machen GitHub und Notion genauso; der Amateur-Marker ist die
  Systemschrift in *Überschriften*. Spart außerdem die halbe Font-Nutzlast.
- **2026-09-04 (M13) – Der Preload bleibt, obwohl er FCP kostet.** Ohne ihn ist der First Paint auf
  simuliertem 3G rund 600 ms früher da, aber CLS steigt von 0 auf 0,002. Für eine PWA, die beim
  ersten Besuch alles cacht, zählt der zweite Besuch mehr als der erste — und dort ist die Schrift
  im Cache und der Preload gratis.
- **2026-09-04 (M13) – Die Auszahlungskarten tragen ihr Signal einmal statt dreimal.** Sie hatten
  gleichzeitig einen linken Farbbalken, einen getönten Hintergrund und einen Schatten. Übrig sind
  der Ton und eine farbige Icon-Scheibe da, wo das Auge sowieso landet.

- **2026-09-03 (M12) – Die Übersichtszeile ist kein Knopf mehr.** Sie war einer, seit M11; die
  ⊖ ⊕ hineinzulegen hätte einen Knopf im Knopf ergeben, was ungültiges Markup ist und dessen
  Klicks der Browser nicht zustellt. Die Zeile ist jetzt ein Container mit zwei Bedienelementen:
  links der Pick-Knopf, rechts der Einsatz.
- **2026-09-03 (M12) – Kein Halten-zum-Wiederholen in der Zeile.** Der `stepper()` im Einsatz-Panel
  kann das, hier wäre es falsch: Die Liste wird nach jedem Dispatch neu gebaut, ein Halten überlebt
  das nicht — und in einer Übersicht will niemand versehentlich auf zehn hochlaufen. Ein Tipp,
  ein Schluck.
- **2026-09-03 (M12) – Der aktuelle Einsatz steht im Namen der ⊖ ⊕.** Die Zahl daneben ist nach
  dem Neuzeichnen ein neuer Knoten, eine `aria-live`-Region darauf würde also nicht auslösen. Der
  Fokus landet aber wieder auf dem Knopf, und *das* liest ein Screenreader vor — deshalb trägt der
  Knopf „…, jetzt 4 Schlücke" und die Zahl ist `aria-hidden`.
- **2026-09-03 (M12) – Die ⊖ ⊕ tragen nicht den Akzent.** Sechs orange Kreise in der Übersicht
  haben „Rennen starten" überschrien, und das ist der Knopf, auf den der Screen hinführt. Gleiche
  Größe, gleiches Verhalten, ruhigere Farbe.
- **2026-09-03 (M12) – Auf dem Handy bricht die Zeile auf zwei Ebenen um.** Spieler, Pferd und ein
  Einsatz-Bedienelement mit zwei 48-px-Zielen brauchen zusammen rund 500 px; ein Telefon hat 390.
  Alles auf eine Zeile zu zwingen hieße, entweder den Pferdenamen abzuschneiden oder die Tap-Ziele
  unter 48 px zu drücken. Beides ist schlechter als eine zweite Zeile.

- **2026-09-03 (M11) – `lastBets` wird in `race/setResult` geschrieben, nicht in `bets/place`.**
  „Dieselbe Konstellation wie letztes Mal" meint das letzte *Rennen*, nicht das Letzte, was
  irgendwer getippt hat. Erst wenn ein Rennen gelaufen ist, bedeuten die Wetten etwas – abgebrochene
  Wettrunden sollen nicht als Vorlage zurückkommen.
- **2026-09-03 (M11) – Die Übernehmen-Karte hängt an einem Flag pro Besuch, nicht am Zustand.**
  Rein aus dem Zustand abgeleitet („keine Wetten, Turn 0") käme sie nach „Alle neu setzen" sofort
  zurück, und man käme aus der Schleife nicht heraus. Beide Antworten erledigen sie für diesen
  Besuch; ein Verlassen des Screens stellt sie wieder her.
- **2026-09-03 (M11) – Die Übersicht listet alle Spieler, nicht nur die mit Wette.** Wer nach dem
  letzten Rennen dazugekommen ist, steht als „noch offen" drin und wird über dieselbe Zeile gesetzt
  wie jeder andere geändert wird. Das spart einen Sonderfall: Nach `bets/repeat` steht der Turn am
  Ende, der Neue käme sonst nie „dran".
- **2026-09-03 (M11) – `title` auf einem Knopf ist eine Beschreibung, kein Name.** Der gespiegelte
  `aria-label` machte den Sperr-Grund zum zugänglichen Namen. Für Knöpfe ohne sichtbaren Text gibt
  es `iconButton()` mit eigenem `label`; `button()` behält jetzt seinen und zeigt per
  `aria-describedby` auf den Hinweis, der sowieso danebensteht.

- **2026-09-03 (M10) – Das Zielband liest die gezeichnete Position, nicht die simulierte.**
  Damit reißt es in demselben Bild, in dem die Nase auf der Linie ist, statt einen Schritt später
  – und vor allem kann es konstruktiv nicht auf das Rennen zurückwirken: Es sieht nur, was längst
  entschieden und gezeichnet ist.
- **2026-09-03 (M10) – Der Arm des Starters geht den langen Weg nach hinten hoch.** Der kurze Weg
  nach vorn führt durch die Waagerechte, und dort zeigt die Pistole quer über die Bahn auf die
  Pferde. Eine halbe Sekunde, aber die falsche halbe Sekunde.
- **2026-09-03 (M10) – Für die Siegerehrung gibt es eine zweite Jockey-Figur.** Der vorhandene
  `drawJockey` ist eine Reitpose und nichts anderes: geduckt, ein Bein angezogen, ein Arm nach
  vorn unten. Nichts davon funktioniert auf einem Sockel. Die neue Figur ist aus denselben Teilen
  in denselben Einheiten gebaut und trägt dieselben Farben und dasselbe Accessoire, damit beide
  als derselbe Mensch lesbar bleiben.
- **2026-09-03 (M10) – Die Ehrung hält sich selbst an.** Sie läuft auf einem Screen, auf dem man
  sitzen bleibt und liest. Sobald alles steht, wird die Schleife beendet und das letzte Bild
  bleibt stehen – kein dauerhafter Animation-Frame für ein Standbild.
- **2026-09-02 (M9) – Der Deploy hängt per `workflow_run` an der CI, nicht an einem eigenen
  Trigger.** Zwei Workflows können sich nicht per `needs` verketten. Ein Deploy, der parallel zur
  CI läuft, könnte eine Version live stellen, deren Fairness-Audit gerade rot wird – und genau das
  ist der eine Fehler, den dieses Projekt sich nicht leisten darf.
- **2026-09-02 (M9) – Der Deploy staged nach `_site/`, statt das Repo-Root hochzuladen.**
  `docs/07_DEPLOYMENT.md` schlägt `path: .` vor. Damit lägen `node_modules`, `tests`, `coverage`
  und `test-results` auf einer öffentlichen Seite. Der Staging-Schritt kopiert, was der Browser
  braucht, plus `docs/` und `README.md` für die Links aus dem README. Das ist kein Build-Schritt,
  sondern eine Auswahl.
- **2026-09-02 (M8) – Die PWA-Icons werden aus dem Spiel gerendert, nicht gezeichnet.**
  `npm run icons` fährt einen Headless-Browser hoch und lässt `render/horsePortrait.js` – genau
  den Code, der auch die Wett-Karten malt – in ein Canvas zeichnen. Ein von Hand gebautes Icon
  wäre nach der ersten Palettenänderung falsch; dieses kann nicht falsch werden. Playwright war
  für die E2E-Tests ohnehin schon als Dev-Abhängigkeit da.
- **2026-09-02 (M8) – Die Precache-Liste des Service Workers ist generiert und CI-geprüft.**
  Eine handgepflegte Liste veraltet, und eine veraltete Liste heißt: Das Spiel ist im Flugmodus
  *fast* spielbar – der schlechteste denkbare Ausgang, weil es bis zur ersten Wette gut aussieht.
  `npm run sw` schreibt sie, `git diff --exit-code sw.js` in der CI hält sie ehrlich.
- **2026-09-02 (M8) – Der erste Screen blendet nicht ein.** Ein Element, dessen erster Paint
  durchsichtig ist, zählt für Chrome nicht als LCP-Kandidat; die Seite meldete deshalb gar keinen.
  Unabhängig von der Messung sieht das Einblenden der gerade geöffneten Seite ohnehin aus wie ein
  Ruckler. Jeder Wechsel danach fadet weiter.
- **2026-09-02 (M7) – Der Ton ist vollständig synthetisiert, keine einzige Audiodatei.** Das GDD
  erlaubt kurze OGG/MP3-Dateien als Alternative. Oszillatoren und ein einziger Rausch-Puffer
  kosten null Bytes Download, funktionieren offline ohne Zutun und lassen sich am Tempo des Feldes
  entlangregeln – ein Sample-Loop könnte das nur mit Tonhöhen-Artefakten. Die Hufe werden deshalb
  Schritt für Schritt geplant statt geloopt.
- **2026-09-02 (M7) – Die Führungswechsel-Regel lebt in der UI, nicht in der Engine.** Sie ist
  eine Trinkregel, kein Rennverhalten. Die Engine erfährt nichts davon, was sie erfahren müsste,
  damit die Regel das Ergebnis beeinflussen könnte – und genau das darf nie passieren.
- **2026-09-02 (M7) – Der Wiederholungsschutz des Kommentators sitzt auf dem fertigen Satz.**
  Auf dem Template wäre er billiger, aber „{horse} ist vorne" zweimal für dasselbe Pferd ist für
  jeden am Tisch dieselbe Zeile. Wenn ein Pool leer ist, schweigt der Kommentator lieber einen
  Takt, als sich zu wiederholen.
- **2026-09-02 (M6) – Der Primär-Button trägt Tinte statt Weiß.** Weiß auf `--accent` erreicht
  nur 2,84:1 und reißt damit die WCAG-Schwelle am wichtigsten Button des Spiels. Die Alternative
  wäre gewesen, das Orange zu verdunkeln – aber das Orange *ist* die Marke. Tinte darauf ergibt
  5,62:1 und der Button bleibt genauso laut.
- **2026-09-02 (M6) – Die Pferde-Badges nutzen `colorDark` statt `color`.** Auf den
  mittelhellen Signaturfarben erreicht weder Weiß (3,8–4,2:1) noch Tinte (3,8:1) die 4,5:1. Ein
  Badge, dessen Nummer man nicht lesen kann, ist kaputt. Ein 2-px-Ring in der Signaturfarbe hält
  die Zuordnung, die sechs dunklen Töne bleiben untereinander unterscheidbar.
- **2026-09-02 (M6) – Für den Stepper-Digit-Roll gibt es keinen Unit-Test.** Alle Tests laufen
  laut `vitest.config.js` in der schnellen Node-Umgebung; ein DOM-Test bräuchte jsdom als weitere
  Dev-Abhängigkeit, nur für diese eine Animation. Stattdessen im Browser gemessen: nie mehr als
  zwei Ziffern gleichzeitig im Strip, danach genau eine, und 119 px Breite über den gesamten
  Wertebereich. Wenn M8 ohnehin Playwright bringt, gehört die Prüfung dorthin.
- **2026-09-02 – `clampMin` des Geschwindigkeitsmodells auf −0,6 statt 0.**
  `03_RACE_ENGINE.md` §5 nennt `clamp(…, 0, 2.2)`, §6.2 definiert das Event `confused` aber mit
  `mod: -1.6` und ausdrücklich „netto rückwärts". Beides zusammen geht nicht. Da das
  Rückwärtslaufen ein bewusster Gag aus dem GDD ist, gilt die untere Grenze −0,6. Sie trifft alle
  Läufer identisch und ist damit fairness-neutral. Wird in der M2-Tuning-Schleife gegengeprüft.
- **2026-09-02 – Vite als Dev-Server, zusätzlich `scripts/serve.js` ohne Abhängigkeiten.**
  Vite gibt Live-Reload, was bei der Design-Arbeit ab M3 viel Zeit spart. `npm run serve` ist die
  Gegenprobe: derselbe Ordner, null Abhängigkeiten – genau so liefert GitHub Pages später aus.
- **2026-09-02 – Dev-Dependencies auf den jeweils aktuellen Majors** (ESLint 10, Vitest 4,
  Vite 8, Prettier 3.9). Die im Plan naheliegenden älteren Stände zogen 6 Vulnerabilities über
  ein altes esbuild herein; mit den aktuellen Versionen meldet `npm audit` null.
- **2026-09-02 – Projektplan von Prettier ausgenommen** (`CLAUDE.md`, `PROGRESS.md`, `README.md`,
  `docs/`). Prettier formatiert Markdown-Tabellen um und erzeugt Diff-Rauschen in Dokumenten, die
  sich sonst nie ändern. Code, CSS, HTML und YAML bleiben voll unter Prettier.
- **2026-09-02 (M2) – Zwei Dateien in `tests/` überschreiten die 400-Zeilen-Grenze.**
  `tests/state/reducers.test.js` (497) ist eine Liste von Fällen; sie aufzuteilen macht sie nicht
  übersichtlicher, nur schwerer auffindbar. `tests/fairness/audit.js` (451) ist ein
  CLI-Werkzeug, dessen Kriterienliste bewusst an einer Stelle steht, damit man sie gegen
  `03_RACE_ENGINE.md` §7 lesen kann. Der Produktivcode in `src/` hält die Grenze ein.
- **2026-09-02 (M5) – Der Rennen-Renderer wird lazy geladen.**
  Nach M5 lag der Initial Load bei 307 KB, 7 KB über dem Budget. Die Alternative wäre gewesen,
  Kommentare zu streichen – 23 % der JS-Zeilen sind Dokumentation, und die ist in diesem Projekt
  ausdrücklich gewollt. Stattdessen lädt der Renderer jetzt erst, wenn er gebraucht wird, und
  wird im Hintergrund vorgewärmt. Der Router nimmt dafür auch Lade-Funktionen statt nur Module
  und schützt sich mit einem Token gegen überlappende Ladevorgänge. 307 KB → 127 KB.
- **2026-09-02 (M5) – `eventVisuals.js` in drei Module geteilt.**
  In einer Datei wären es 738 Zeilen gewesen. Die Aufteilung folgt der Zuständigkeit: die
  Registry mit dem Lebenszyklus, die reinen Zeichenroutinen (`eventProps.js`) und die
  Partikel-Tabelle (`eventEmitters.js`). Die letzten beiden sind Nachschlagewerke, kein Ablauf –
  man schlägt dort nach, wenn eine Requisite hübscher werden soll.
- **2026-09-02 (M5) – Das Publikum hüpft als Ganzes statt Zuschauer für Zuschauer.**
  Die Tribüne liegt in einem Offscreen-Cache; einzelne Zuschauer zu animieren hieße, den Cache
  aufzugeben. Aus der Zuschauerperspektive im Spiel liest sich beides gleich.
- **2026-09-02 (M4) – Die Kamera kennt nur eine Achse.**
  Statt zweier Kameras rechnet sie in Streckeneinheiten und liefert einen Pixel-Versatz *entlang*
  der Bahn; ob das ein Bildschirm-x (Landscape) oder ein -y (Portrait, invertiert) ist, entscheidet
  die Bahn. Deshalb bedient dieselbe Kamera beide Orientierungen ohne eine einzige Verzweigung.
- **2026-09-02 (M4) – `track.js` ist nur noch eine Fabrik.**
  `02_ARCHITECTURE.md` §7 sagt „nur `track.js` und die Pferde-Perspektive unterscheiden sich".
  Beide Layouts in einer Datei wären deutlich über der 400-Zeilen-Grenze gelandet, also gibt es
  `trackLandscape.js`, `trackPortrait.js`, das geteilte `trackTheme.js` und eine schlanke Fabrik.
  Beide Bahnen bieten dieselbe Schnittstelle – ein Test prüft das –, sodass der Rennen-Screen
  nirgends nach der Orientierung fragt.
- **2026-09-02 (M4) – Die Rückansicht ist ein eigenes Modul, kein Modus in `horse.js`.**
  Die beiden Ansichten teilen sich die Pose und die Zeichen-Primitiven, aber keine Geometrie: von
  hinten gibt es keine Beinwinkel-Kinematik, sondern ein seitliches Ausschwingen. Ein gemeinsames
  Modul wäre eine Datei mit zwei disjunkten Hälften geworden.
- **2026-09-02 (M4) – `quality.level` ist Modulzustand, kein Parameter.**
  Die Qualitätsstufe ist eine Eigenschaft des Renderers als Ganzes. Sie durch jede Zeichenfunktion
  zu reichen hätte Funktionen, die sonst nur Geometrie nehmen, einen Fremdkörper verpasst. Sie
  geht bewusst **nie wieder hoch**: Sonst flackert das Bild bei jeder Schwankung um die Schwelle
  zwischen zwei Aussehen.
- **2026-09-02 (M3) – Die Bahn wird mit leichter Perspektive gezeichnet.**
  `04_DESIGN_SYSTEM.md` §6 beschreibt sechs Bahnen; sechs exakt gleich hohe Streifen sehen aber
  aus wie ein Balkendiagramm. Die hinteren Bahnen sind deshalb schmaler und ihre Pferde kleiner
  (Exponent 1,3). Das verändert nichts am Rennen – die Bahn ist rein kosmetisch, die Engine liest
  sie nie.
- **2026-09-02 (M3) – `render/shapes.js` und `render/horseTack.js` zusätzlich angelegt.**
  `horse.js` war mit 527 Zeilen über der A6-Grenze. Sattelzeug, Jockey und Accessoires sind eine
  eigene Zuständigkeit („alles, was der Reiter mitbringt"), die gemeinsamen Primitiven liegen in
  `shapes.js`. Danach: horse.js 282, horseTack.js 223, shapes.js 48.
- **2026-09-02 (M3) – `src/styles/race.css` abgetrennt.**
  Die in M1 notierte Bedingung ist eingetreten: `screens.css` war auf 857 Zeilen gewachsen. Der
  Rennen-Screen ist kein Dokument-Screen (kein Header, kein Footer, kein Scroll-Body), sondern
  ein Vollbild-Canvas mit HUD – eine saubere Trennlinie. `screens.css` liegt jetzt bei 650, immer
  noch über der Richtlinie; die nächste Aufteilung wäre nach Screens, wenn es nötig wird.
- **2026-09-02 (M3) – Der Kamera-Ausschnitt reicht vor die Startlinie.**
  Sonst sind die Startboxen und die darin stehenden Pferde beim Countdown halb vom linken Rand
  abgeschnitten. Die Kamera darf bis 32 % der Sichtbreite vor Position 0 schauen.
- **2026-09-02 (M2) – Varianz-Rampe im Phasenprofil statt konstanter Streuung.**
  `03_RACE_ENGINE.md` §5.1 beschreibt K Stützstellen mit *einer* Standardabweichung σ_P. Damit
  sind S1 und S3 nachweislich unerreichbar (siehe Tuning-Protokoll). Die Streuung wächst jetzt
  entlang der Strecke. Für alle Läufer identisch, also fairness-neutral – bewiesen durch den
  1,8-Mio.-Lauf.
- **2026-09-02 (M2) – OU-Rauschen exakt diskretisiert und nur alle 3 Schritte aktualisiert.**
  Statt Euler-Maruyama bei 60 Hz die geschlossene Lösung des Prozesses bei 20 Hz. Die stationäre
  Verteilung ist identisch (keine Näherung), es kostet aber ein Drittel der Gauß-Ziehungen. Bei
  einer Korrelationszeit von 0,55 s löst 20 Hz den Prozess mehr als fein genug auf.
- **2026-09-02 (M2) – Das Fairness-Audit läuft auf Worker-Threads.**
  Das Kriterienraster braucht 220.000 Rennen; einkernig wären das über zwei Minuten, das CI-Budget
  sind 60 s. Jedes Rennen wird aus seinem eigenen Index geseedet, die Aufteilung kann das Ergebnis
  also nicht verändern – `--verify-partition` beweist das bei jedem CI-Lauf.
- **2026-09-02 (M2) – `createRace()` nimmt `duration`/`chaos` statt eines `config`-Objekts.**
  `02_ARCHITECTURE.md` §5.2 skizziert `createRace({seed, config, horses})`. Ein `horses`-Argument
  wäre ein Verstoß gegen die Engine-Isolation; die übrigen Konstanten kommen direkt aus
  `config.js`. Der Zustand heißt entsprechend `runners` (mit `index`), nicht `horses`.
- **2026-09-02 (M2) – `crypto.getRandomValues` ist in `rng.js` erlaubt, mit gezieltem
  ESLint-Ausnahmekommentar.** `randomSeed()` gehört laut §5.1 in dieses Modul und ist nicht Teil
  der Simulation: Sobald der Seed feststeht, ist das Rennen deterministisch. Das generelle Verbot
  bleibt für alles andere bestehen; ein Test prüft, dass `crypto` nur in `randomSeed` vorkommt.
- **2026-09-02 (M1) – `settle()` liefert keinen fertigen Text für Event-Trinkregeln.**
  `02_ARCHITECTURE.md` §5.3 sieht ein Feld `text` vor. Das ginge nur, wenn `payout.js` die
  Pferdenamen kennt – genau das verbietet aber die Engine-Isolation (`data/horses.js` ist für
  `src/engine/**` gesperrt). Die Funktion gibt stattdessen `{eventId, horseId, playerIds, sips,
  direction}` zurück; den Satz „🍺 Team Kater Morgana: 1 Schluck!" baut die UI. Ebenso nimmt
  `settle()` die Events als vierten Eingabewert entgegen, sonst könnte es `eventRules` gar nicht
  füllen.
- **2026-09-02 (M1) – `createStore(reducer, initialState)` statt `createStore(initialState)`.**
  So bleibt `store.js` frei von einer Abhängigkeit auf `reducers.js` und ist isoliert testbar.
  Das Verhalten aus §5.5 (dispatch → Reducer → neue Referenz → Subscriber) ist unverändert.
- **2026-09-02 (M1) – Zwei zusätzliche Actions gegenüber der Doku-Liste.**
  `race/clear` (setzt das Rennen zurück, bevor ein neues startet) und `race/markRecorded`.
  Letzteres verhindert, dass ein erneuter Aufruf des Ergebnis-Screens – etwa nach Reload oder
  Browser-Zurück – dasselbe Rennen ein zweites Mal in die Statistik bucht.
- **2026-09-02 (M1) – Drei kleine Zusatzmodule.** `ui/dom.js` (Element-Helfer, ausschließlich
  `textContent`), `ui/components/layout.js` (Screen-Gerüst, Karten, Pferde-Badge) und
  `ui/strings.js` (Wording, damit der Alkoholfrei-Schalter sofort wirkt statt erst in M7).
  `data/avatars.js` hält den Emoji-Pool. Ohne diese Helfer wären die Screen-Module deutlich
  länger als die 400-Zeilen-Grenze aus A6.
- **2026-09-02 (M1) – CSS bleibt bei den vier Dateien aus der Architektur, auch über 400 Zeilen.**
  `02_ARCHITECTURE.md` §2 schreibt genau `tokens.css`, `base.css`, `components.css` und
  `screens.css` vor. Die 400-Zeilen-Regel aus A6 steht im selben Punkt wie „Funktionen ≤ 60
  Zeilen" und zielt auf Code-Module; CSS weiter aufzuteilen würde einer ausdrücklichen
  Architektur-Entscheidung widersprechen. Sollte `screens.css` in M3–M6 unhandlich werden, ist
  eine Aufteilung nach Screens der nächste Schritt – dann als bewusste Architektur-Änderung.
- **2026-09-02 (M1) – Quick-Bet aus GDD §3.3 nicht umgesetzt.** Die Idee ist dort als optional
  markiert und taucht in der Einstellungstabelle §6 nicht auf. Die 6-Tap-Vorgabe aus A1 wird auch
  ohne sie erreicht. Liegt im Backlog.
- **2026-09-02 – Fairness-Schutz schon auf Datenebene** (`tests/fairness/horses.test.js`).
  Der Test verbietet jedes Feld an einem Pferd, das nicht rein kosmetisch ist, und jeden
  Zahlenwert außer der Startnummer. So fällt ein versehentlicher „Speed"-Wert sofort auf,
  statt erst als Verzerrung im 100k-Audit.

### A2 – Fairness- & Suspense-Audit (2026-09-02, M2)

| Prüfpunkt | Ergebnis |
| --- | --- |
| `npm run audit:fairness` (220k) Exit 0 | ✅ 51 s lokal (8 Worker), **96 s in CI** (GitHub-Runner haben 4 Kerne). Die Zahlen sind bitidentisch – S1 31,24 %, S3 27,13 %, S6 132 auf beiden Maschinen |
| Einmalig 1 Mio.: alle Anteile in [0,1607; 0,1727], χ² p > 0,001 | ✅ Spanne 0,16625–0,16729, χ² p = 0,48 |
| Sieganteile je Bahn uniform | ✅ χ² p = 0,69 |
| Je Chaos-Level und Renndauer uniform | ✅ vier Vergleichsläufe à 200k |
| Platz-2–6-Verteilungen uniform | ✅ |
| Events uniform, nie > 2 je Läufer, Fenster 8–95 % | ✅ 0 Verstöße über 1,8 Mio. Rennen |
| S1–S6 im Zielbereich | ✅ (S3 und S6 mit den in §7.1 begründeten Zielen) |
| Determinismus-Test | ✅ 50 Seeds bitidentisch, zusätzlich im Browser gegengeprüft |
| Engine ohne `Math.random`, `Date`, `performance`, DOM | ✅ Grep-Test über alle Engine-Dateien, ESLint zusätzlich |
| `step()` nimmt kein dt | ✅ Test übergibt 0,5 und erwartet unveränderten Fortschritt |
| Keine Betting-Daten an `createRace()` | ✅ Test verbietet „bet"/„player" im Engine-Code |
| Lane-Shuffle aktiv und getestet | ✅ |
| Kein rang-basiertes Rubber-Banding | ✅ `speedModel.js` liest keine fremde Position; Test belegt es |
| 20 Rennen mit `?debug=1` ansehen | ⏳ **Nutzer-Test erforderlich** |

**Im Audit gefunden und behoben:** Der eigene `--verify-partition`-Check schlug an – beim
Zusammenführen der Worker-Ergebnisse wurde `trackLength` mitaddiert statt als Metadaten behandelt.
Ohne den Check wäre der Fehler nie aufgefallen, weil er die geprüften Zahlen nicht verfälscht.

### A6 – Code-Audit (2026-09-02, M2)

| Prüfpunkt | Ergebnis |
| --- | --- |
| JSDoc-Kopf in jedem Modul | ✅ |
| Keine JS-Datei > 400 Zeilen | ✅ in `src/`: größte ist `race.js` mit 392 (die Effekt-Verwaltung wanderte dafür nach `effectSlots.js`). Ausnahmen in `tests/`: `reducers.test.js` (497) und `audit.js` (451) — begründet unter „Entscheidungen" |
| Keine Magic Numbers außerhalb `config.js` | ✅ auch die Optimierungs-Konstanten sind benannt |
| Keine Abhängigkeitszyklen | ✅ `engine/` importiert nur aus `engine/` und `data/events.js` |
| Engine-Coverage ≥ 90 % Zeilen | ✅ **98,0 %** Zeilen, 93,8 % Branches |
| Alle Tests < 20 s | ✅ 228 Tests in 2,9 s |
| `npm run lint` 0 Fehler | ✅ |
| Keine TODO/FIXME | ✅ |

### A3 – Visual- & Animations-Audit (2026-09-02, M3, Landscape-Teil)

| Prüfpunkt | Ergebnis |
| --- | --- |
| Gallop-Zyklus bei jedem Tempo flüssig, keine Sprünge bei Tempowechsel | ✅ Die Phase wird **integriert**, nicht aus der Zeit berechnet. Ein Test fährt das Tempo zwischen 0,3 und 1,9 hin und her und misst die größte Winkeländerung je Frame: 0,25 rad – exakt das physikalische Maximum. Zur Gegenprobe habe ich die Phase absichtlich aus der Uhr berechnet: dann springt sie auf 1,39 rad, und der Test schlägt an. |
| Mähne/Schweif mit Follow-Through, bei Stillstand ruhig | ✅ Federkette mit vier Segmenten; im `idle`-Zustand hängen beide senkrecht (im Lab geprüft) |
| Körper-Bounce und Schatten-Skalierung synchron zur Flugphase | ✅ Der Schatten schrumpft und wird heller, je höher das Pferd steht |
| Alle 6 Pferde unterscheidbar an Fell, Accessoire und Signaturfarbe; Nummern lesbar | ✅ Nummer auf Satteldecke **und** Startbox |
| Jeder Animations-State im Lab geprüft (Seitenansicht) | ✅ idle, gallop, gallop_fast, trot_in, celebrate; Rückansicht folgt in M4 |
| Sieger-`celebrate` eindeutig, 2–3 s | ✅ 2,6 s, Pferd bäumt sich auf |
| Parallax-Layer mit unterschiedlicher Geschwindigkeit, keine Kachel-Nähte | ✅ Hügel 0,15 · Tribüne 0,45 · Bahn 1,0 · Rasen 1,25 |
| Startboxen in der Signaturfarbe des zugelosten Pferdes | ✅ Der Lane-Shuffle ist dadurch direkt sichtbar |
| Kamera ruckelt nicht, Feld immer sichtbar | ✅ Frame-Rate-unabhängiger Lerp; ein Test prüft, dass 30 und 144 fps dieselbe Bewegung ergeben |
| Zieleinlauf erkennbar, Reihenfolge stimmt mit Engine-`order` überein | ✅ **nach einer Korrektur**, siehe unten |
| Screenshots in `docs/screenshots/` | ✅ `m3-race-landscape.jpg` |

**Im Audit gefunden und behoben:**

1. **Das Leaderboard widersprach dem Ergebnis-Screen.** Im Ziel stehen alle sechs Läufer auf
   exakt Position 1000, die Sortierung nach Position war dort also willkürlich – das Board zeigte
   Sir Trabsalot auf 1, während der Kommentator „Prosecco Rakete gewinnt!" sagte. Die Rangfolge
   kommt jetzt nach dem Zieleinlauf aus der Engine-`order`. Die Regel steckt in der reinen
   Funktion `rankRunners()` und hat einen eigenen Test.
2. **Ritterhelm und Ushanka saßen am Pferdekopf statt am Jockey** und schwebten als graue Pille
   neben dem Kopf. Laut GDD §2 gehören sie an den Jockey. Accessoires sind jetzt nach Trageort
   getrennt: Jockey-Kopfbedeckung, Pferdekopf (Sonnenbrille, Kleeblatt) und Sattel (Kaffeebecher,
   Brezel).

Kleinere Korrekturen: Hals und Kopf waren giraffenhaft lang, der Jockey lehnte nach hinten statt
nach vorn, Mähne und Schweif standen als Klaue nach oben (Feder-Basiswinkel und Ablenkung
addierten sich falsch – die Feder liefert jetzt nur noch den Flick, die Richtung kommt aus dem
Tempo), die Tribüne erschlug mit übergroßen Zuschauern das ganze Bild, und am Start waren die
Startboxen halb vom linken Rand abgeschnitten.

### A5 – Performance-Audit (2026-09-02, M3, Desktop-Teil)

Gemessen auf einem M-Mac in Chrome, 1200 × 637 CSS-Pixel, `?debug=1`.

| Prüfpunkt | Budget | Gemessen |
| --- | --- | --- |
| FPS | 60 | **60**, stabil über ein ganzes Rennen |
| Frame-Time Update | ≤ 2 ms | **0,00–0,10 ms** |
| Frame-Time Render | ≤ 10 ms | **1,0–1,5 ms** (mit dem Debug-Zähler-Proxy; ohne ihn 1,0 ms) |
| Pfad-Operationen je Frame | ≤ ~600 | **453–480** |
| Partikel gleichzeitig | ≤ 400 | 20–30 im normalen Rennen |
| Partikel-Pool ohne Allokation | – | ✅ Typed Arrays, feste Größe, tote Partikel werden getauscht statt entfernt |
| Hintergrund aus Offscreen-Canvas | – | ✅ Hügel und Tribüne werden einmal gezeichnet und nur noch geblittet |
| Initial Load | < 300 KB | **239 KB** |

Der Pfad-Operationen-Zähler ist ein Proxy um den 2D-Kontext, der nur mit `?debug=1` aktiv ist –
er kostet selbst etwas Zeit, und genau so etwas darf nicht im Hot Path landen.

Mobile-Teil und `quality: 'auto'` folgen in M4.

### A3 – Visual- & Animations-Audit (2026-09-02, M4, Portrait-Teil)

| Prüfpunkt | Ergebnis |
| --- | --- |
| Sechs vertikale Bahnen, Rennen von unten nach oben | ✅ Startboxen unten, Ziel oben, Tribünen an beiden Seiten |
| Rückansicht des Pferdes | ✅ Satteldecke und Trikot zeigen frontal zum Betrachter – die größtmögliche Fläche der Signaturfarbe, mit der Startnummer mittendrin |
| Rückansicht im horse-lab geprüft | ✅ eigener Umschalter Seite/Hinten |
| Kamera vertikal, Feld zentriert | ✅ dieselbe Kamera wie im Landscape; sie kennt nur eine Achse |
| Live-Umschaltung bei Rotation ohne Neustart | ✅ **im Browser geprüft**: Rennen bei t = 4,0 s in Portrait gestartet, Fenster gedreht, bei t = 4,8 s in Landscape weitergelaufen – gleiche Simulation, andere Bahn und Perspektive |
| Eigenes Pferd innerhalb 1 s identifizierbar | ⏳ **Nutzer-Test erforderlich** (mit drei Personen) |
| Startboxen in der Signaturfarbe | ✅ sie klappen nach unten weg statt zur Seite |
| Zieleinlauf erkennbar | ✅ **nach einer Korrektur**, siehe unten |
| Screenshot in `docs/screenshots/` | ✅ `m4-race-portrait.jpg` |

**Im Audit gefunden und behoben:**

1. **Das ZIEL-Banner verschwand hinter den Pferden.** Es wurde vor ihnen gezeichnet, und im Ziel
   verdecken sechs Pferde alles über der Linie. Ein Banner hängt aber über der Bahn – die Pferde
   laufen darunter durch. `drawFinish()` zeichnet jetzt nur noch die Ziellinie am Boden, das neue
   `drawOverhead()` das Banner nach den Pferden. In beiden Orientierungen.
2. **Die Tiefensortierung war im Portrait falsch.** Sie sortierte nach Bahn, aber im Portrait
   liegen die Bahnen nebeneinander in gleicher Entfernung – was den Überlapp entscheidet, ist die
   Streckenposition. Die Bahn liefert jetzt einen `depthKey(units, lane)`, den jede Orientierung
   selbst definiert.

Kleinere Korrekturen: Das Orientierungs-Attribut saß am Screen-Container statt an der Rennbühne,
weshalb das Portrait-HUD-CSS gar nicht griff; der Pferdekopf verschwand hinter dem Jockey-Helm
(der Hals ist jetzt sichtbar dazwischen); der Schweif steckte hinter der Satteldecke; und die
Hinterbeine spreizten wie bei einer Spinne.

### A4 – Barrierefreiheit-Audit (2026-09-02, M4, Basis)

| Prüfpunkt | Ergebnis |
| --- | --- |
| Alle interaktiven Elemente ≥ 48 × 48 px | ✅ automatisch über alle Screens geprüft: 0 Treffer unter 48 px |
| `:focus-visible` überall sichtbar | ✅ 3 px Ring auf `--ink`, Kontrast > 3:1 |
| `aria-live`-Region meldet Führungswechsel und Sieger | ✅ **im Browser geprüft**: „Sir Trabsalot führt." bzw. „… gewinnt!"; gedrosselt auf tatsächliche Wechsel, sonst redet der Screenreader ununterbrochen |
| Canvas hat `role="img"` und ein aktuelles `aria-label` | ✅ „Rennbahn. Sir Trabsalot führt." |
| Pferde ohne Farbe unterscheidbar | ✅ Startnummer auf Satteldecke, Startbox und Leaderboard-Punkt; dazu Fellfarbe und Accessoire |
| `touch-action: manipulation`, kein Doppeltipp-Zoom | ✅ |
| Keine Hover-only-Zustände | ✅ Hover-Effekte stehen in `@media (hover: hover)` |
| Tastatur-Reihenfolge logisch | ✅ Tab-Durchlauf geprüft |
| Kontrast ≥ 4,5:1, Zoom 200 %, Deuteranopie, Lighthouse | ⏳ vollständig in M8 |

### A5 – Performance-Audit (2026-09-02, M4, Mobile-Teil)

| Prüfpunkt | Budget | Gemessen |
| --- | --- | --- |
| FPS Portrait (400 × 860, Desktop-Browser) | 60 | **60** |
| Render-Zeit Portrait | ≤ 10 ms | **1,0–1,3 ms** |
| Pfad-Operationen Portrait | ≤ ~600 | **310–340** (weniger als Landscape, weil Perspektive und Vordergrund entfallen) |
| Initial Load | < 300 KB | **266 KB** |
| `quality: 'auto'` greift unter 50 FPS | – | ✅ mit Tests belegt: senkt nach 2 s, meldet genau einmal, geht nie wieder hoch |

**Offen und ehrlich benannt:** Die Vorgabe lautet **≥ 55 FPS auf einem drei Jahre alten
Mittelklasse-Handy**. Ich kann hier nur im Desktop-Browser messen; eine Zahl von echter Hardware
habe ich nicht. Die gemessene Render-Zeit von 1,0–1,3 ms lässt viel Luft – selbst ein Gerät, das
achtmal langsamer ist, bliebe bei rund 10 ms und damit unter dem 16,7-ms-Budget. Das ist eine
Hochrechnung, keine Messung. Der Sicherheitsgurt dafür ist `quality: 'auto'`: Fällt die Bildrate
zwei Sekunden lang unter 50, verschwinden Verläufe und ein Teil des Staubs – die Simulation
bleibt unverändert. **Nutzer-Test:** ein Rennen auf dem Handy mit `?debug=1` ansehen und die
FPS-Zahl notieren.

### A3 / A2 / A5 – Audits zu M5 (2026-09-02)

**A2 (Fairness, Re-Run):** unverändert grün. Siegquoten 0,1644–0,1684 bei 30.000 Rennen
(erlaubt ±0,0086), χ² p = 0,84; Events gleichverteilt (p = 0,66), nie mehr als zwei je Läufer;
S1–S6 alle im Ziel. Das war zu erwarten und ist trotzdem der Punkt: Die gesamte M5-Arbeit steckt
in `render/`, und die Engine hat davon nichts mitbekommen.

**A3 (Events):**

| Prüfpunkt | Ergebnis |
| --- | --- |
| Jedes Event hat Requisite, Animation, Partikel und Kommentar | ✅ Checkliste oben, alle 23 |
| Requisiten-Timing exakt: Effekt beginnt im selben Frame, in dem die Requisite trifft | ✅ **konstruktiv garantiert**: Die Ankunft wird als `(jetzt − Zündzeit) / Vorlauf` gerechnet, ist bei der Zündzeit also genau 1 – und genau dann beginnt der Effekt |
| Bleibende Dekor-Objekte werden gezeichnet | ✅ Schale, zwei Pfützen, Hufeisen, sitzender Jockey |
| Kein Event verdeckt das HUD länger als 1 s | ✅ Requisiten sind auf 0,15–0,2 der Pferdegröße skaliert |
| Reduced-Motion: kein Shake, keine Blitze, Events trotzdem verständlich | ✅ Requisiten bleiben, nur Bewegung und Menge werden reduziert |
| Publikum reagiert auf jedes Event | ✅ die ganze Tribüne hüpft |

**Im Audit gefunden und behoben:**

1. **`turn` und `spin` wurden berechnet, aber nie angewendet.** Der Rutsch auf der Banane drehte
   das Pferd nicht, und „orientierungslos" ließ es nicht rückwärts schauen. Beide wirken jetzt im
   Zeichnen – das Umdrehen als horizontale Stauchung durch Null, der klassische 2D-Weg.
2. **Der Jockey saß nach `jockey_off` weiter auf dem Pferd**, während seine Kopie am Rand winkte.
   Laut GDD läuft das Pferd ohne ihn weiter; es hat jetzt ein `riderless`-Flag und verliert dabei
   auch die Zügel.

Kleinere Korrekturen: Requisiten waren doppelt so groß wie nötig (die Banane fast so groß wie der
Pferdekopf), die Espresso-Tasse stand hinter statt vor dem Pferd, der Fan schwebte in der
Tribüne statt am Geländer, und der Trinkregel-Toast stand neben statt über der Kommentarzeile.

**A5 (Performance):**

| Prüfpunkt | Budget | Gemessen |
| --- | --- | --- |
| FPS mit Events bei Chaos „Vollgas" | 60 | **60** |
| Render-Zeit | ≤ 10 ms | 0,6–3,2 ms |
| Pfad-Operationen je Frame | ≤ ~600 | 452–514 |
| Partikel gleichzeitig | ≤ 400 | 20–60 |
| Initial Load | < 300 KB | **127 KB** (siehe unten) |

**Das Ladebudget war gerissen und wurde behoben.** Nach M5 lag der Initial Load bei **307 KB** –
7 KB über dem Budget aus `02_ARCHITECTURE.md` §8. Gzip-komprimiert (so liefert GitHub Pages aus)
wären es 86 KB gewesen, das eigentliche Ziel „< 1 s auf 4G" also nie in Gefahr. Trotzdem ist ein
gerissenes Budget ein gerissenes Budget.

Die Lösung ist keine Diät bei den Kommentaren, sondern die richtige: **Der Rennen-Renderer wird
erst bei Bedarf geladen.** Horses, beide Bahnen, Requisiten, Partikel – 180 KB, die niemand
braucht, bevor eine Wette steht. Der Router akzeptiert jetzt auch Lade-Funktionen statt nur
Module, und `main.js` wärmt den Renderer im Hintergrund vor, während die Spieler noch ihre Namen
tippen. **Ergebnis: 307 KB → 127 KB**, ohne spürbare Wartezeit (im Browser durchgespielt).

### A1 / A3 / A4 – Audits zu M6 (2026-09-02)

**A1 (UI/UX, Re-Run):** Der Flow-Teil war seit M1 unverändert und bleibt grün: vom Start bis
zum ersten Rennen sind es bei zwei Spielern genau **6 Taps** (Weiterspielen → Pferd → Setzen →
Pferd → Setzen → Rennen starten), „Rennen starten" bleibt deaktiviert und erklärt im Untertitel,
wie viele Wetten noch fehlen, und die Hash-Guards leiten `#/results` ohne Ergebnis sauber auf
`#/betting` um. Der Haus-gewinnt-Fall wird als eigene dunkle Karte über den Spielerkarten
kommuniziert.

Der Design-Teil wurde vollständig neu geprüft, weil M6 fast nur aus Design besteht:

| Prüfpunkt | Ergebnis |
| --- | --- |
| Nur Tokens, keine Hex-Werte außerhalb `tokens.css` | ✅ 0 Treffer in `src/styles/*.css` und `src/ui/**` |
| Buttons ≥ 48 px, Primär 56 px, mobil volle Breite | ✅ alle Screens, gemessen im Browser |
| Keine Schrift < 14 px | ✅ kleinster Token `--text-xs: 14px` |
| hover / active / focus-visible / disabled sichtbar unterschiedlich | ✅ |
| Keine Layout-Sprünge | ✅ eine Ausnahme gefunden und behoben (Stepper, siehe unten) |
| 375 × 700 und 1440 × 900 geprüft | ✅ Screenshots in `docs/screenshots/` |

**Im A1-Re-Run gefunden und behoben: der Attract-Mode lag über den Buttons.** Die sechs
Idle-Pferde standen am unteren Rand – genau dort, wo auch der Primär-Button und die
Sekundär-Chips sitzen. Der Button schnitt Pferd 3 und 4 am Hals ab. Drei Ursachen, alle
behoben:

1. `.screen` war `position: static`, das absolut positionierte Canvas hat sich deshalb an einem
   Vorfahren außerhalb des Screens ausgerichtet und war 720 px hoch statt 533.
2. Ein `<canvas>` ist ein *replaced element*: bei `height: auto` fällt es auf seine intrinsische
   Größe zurück und ignoriert den `bottom`-Offset. Die Höhe muss ausgeschrieben werden.
3. Die Bodenlinie lag bei 94 % der Canvas-Höhe. Jetzt bei 84 % – der Grasstreifen darunter trägt
   den Button, und kein Pferd wird mehr überdeckt.

**A3 (Polish-Teil):**

| Prüfpunkt | Ergebnis |
| --- | --- |
| Countdown, Boxen-Öffnen, Fotofinish, Podium, Konfetti mit Easing | ✅ `grep linear` in `src/styles/` und `src/`: **0 Treffer** außerhalb von `linear-gradient` |
| Fotofinish nur bei echtem Kopf-an-Kopf | ✅ gleiche Schwelle wie im Fairness-Audit (letzte 3 %, Abstand < 1 %) |
| Fotofinish löst sich sauber auf (`timeScale` zurück auf 1) | ✅ `endPhotoFinish()` setzt Zeit, Zoom und Klasse zurück |
| Fotofinish-Häufigkeit 25–45 % | ✅ **39,6 %** (gemessen im Fairness-Audit) |
| Screenshots Landscape + Portrait aktualisiert | ✅ vier neue Bilder in `docs/screenshots/` |

**A4 (Barrierefreiheit): vier echte Befunde, alle behoben.** Geprüft wurde mit einem im Browser
ausgeführten Skript, das für jedes sichtbare Textelement die tatsächliche Vorder- und
Hintergrundfarbe durch den kompletten Alpha-Stapel rechnet und gegen die WCAG-Schwelle stellt
(4,5:1, bei großem Text 3:1) – über Start, Spieler, Wetten, Ergebnis und alle drei Modals.

1. **Weiß auf dem Accent-Orange erreicht nur 2,84:1.** Das betraf den wichtigsten Button des
   Spiels. Statt das Orange zu verdunkeln – es ist die Marke – trägt der Primär-Button jetzt die
   Tinte als Schriftfarbe: **5,62:1**, und er ist genauso laut wie vorher. Dasselbe gilt für die
   ± des Steppers.
2. **Die Pferde-Badges: weiß auf der Signaturfarbe.** Lila 4,23:1, Rot 3,76:1 – beides unter der
   Schwelle, und die Nummer ist genau das, was auf einem Badge lesbar sein muss. Weder Weiß noch
   Tinte erreicht auf diesen mittelhellen Farben 4,5:1, das Badge musste also dunkler werden: Es
   nutzt jetzt den `colorDark`-Ton mit einem 2-px-Ring in der Signaturfarbe. Die sechs dunklen
   Töne bleiben untereinander klar unterscheidbar, und die Nummer sitzt jetzt bei ≥ 5:1.
3. **`--danger` erreichte weder mit Weiß (3,76:1) noch mit Tinte (4,23:1) die Schwelle.** Das Rot
   ist von `#ef4444` auf `#d92d20` gewandert: Weiß darauf ergibt 4,83:1.
4. **Die Switches waren 56 × 32 px** und rissen damit das 48-px-Ziel. Der Button ist jetzt
   56 × 48 px; die sichtbare Schiene liegt in `::before` und sieht unverändert aus.

Nebenbei zog `--accent-dark` von `#c94c1c` auf `#b33f14` nach, weil Creme darauf (der
Warn-Toast) bei 4,39:1 lag – jetzt 5,47:1.

| Weiterer Prüfpunkt | Ergebnis |
| --- | --- |
| Alles per Tastatur erreichbar, Reihenfolge logisch | ✅ |
| `:focus-visible` überall sichtbar, Kontrast ≥ 3:1 | ✅ 3 px `--ink`, auf Creme 13:1, auf Accent 5,6:1 |
| Modals: Fokus-Trap, `Esc` schließt, Fokus kehrt zurück | ✅ im Browser durchgespielt: Fokus landet wieder auf dem auslösenden Button |
| `aria-live`-Region meldet Start, Führungswechsel, Fotofinish, Sieger | ✅ **Führungswechsel jetzt auf max. alle 3 s gedrosselt** – im dichten Feld wechselt die Führung mehrmals pro Sekunde, ein Screenreader käme sonst nicht hinterher |
| Canvas hat `role="img"` + `aria-label` mit aktuellem Stand | ✅ Label wird bei jedem Führungswechsel und am Ziel aktualisiert |
| Formularfelder haben Labels, Fehler per `aria-describedby` | ✅ |
| `prefers-reduced-motion` respektiert | ✅ globaler Block + `calm`-Pfad in der Render-Schicht |
| Pferde ohne Farbe unterscheidbar | ✅ Nummer auf Badge, Satteldecke und Startbox; dazu sechs verschiedene Accessoires |
| Touch-Ziele ≥ 48 × 48 px mit ≥ 8 px Abstand | ✅ nach dem Switch-Fix keine Ausnahme mehr |
| Zoom 200 %: kein horizontales Scrollen | ✅ `scrollWidth == clientWidth` auf allen Screens |

Offen bis M8: Lighthouse-Accessibility ≥ 95 und die Deuteranopie-Simulation im DevTools-
Rendering-Tab – beide laut `06_QA_AUDITS.md` ohnehin erst dort fällig.

**Beim Stepper-Digit-Roll gefunden und behoben:** Die einrollende Ziffer war zuerst absolut
positioniert – damit trug sie nichts zur Breite bei, und „3 Schlücke" wurde auf die 7ch
Mindestbreite beschnitten. Jetzt bleibt nur die *ausgehende* Ziffer absolut. Danach sprang die
Zeile bei 9 → 10 um 14 px, weil der Text länger wird; ein unsichtbarer Sizer mit dem längsten
möglichen Wert reserviert die Breite. Gemessen: **119 px über den kompletten Bereich, in beide
Richtungen** – CLS an dieser Stelle exakt 0.

### A1 / A2 / A6 – Audits zu M7 (2026-09-02)

**A2 (Fairness, Re-Run):** Die Zahlen sind **identisch zu M6** – Siegquoten 0,1627–0,1693 je
Chaos-Level, χ² p = 0,21 bis 0,96, S1 31,24 %, S5 39,59 %, S6 132 Units. Das ist kein Zufall und
auch keine Nachlässigkeit: M7 hat die Engine nicht angefasst. Der Punkt des Re-Runs steht
ausdrücklich im Audit („Sicherheit: Wettarten dürfen Engine nicht berühren"), und drei Greps
belegen ihn zusätzlich:

| Prüfpunkt | Ergebnis |
| --- | --- |
| `createRace()` bekommt keine Wettdaten | ✅ `createRace({ seed, duration, chaos })` – sonst nichts |
| `src/engine/**` importiert nichts aus `render/ui/state` | ✅ nur `data/events.js` und `config.js` |
| Kein `Math.random`, `Date`, `performance`, `window`, `document` im Engine-Ordner | ✅ 0 Treffer |

Die Wettarten leben vollständig in `payout.js`, das eine reine Funktion über Ids ist und die
Reihenfolge geschenkt bekommt. Es kann das Rennen gar nicht beeinflussen, weil es erst läuft,
wenn das Rennen vorbei ist.

**A6 (Code-Audit):**

| Prüfpunkt | Ergebnis |
| --- | --- |
| JSDoc-Kopf je Modul, Signaturen an öffentlichen Funktionen | ✅ auch die fünf neuen Module |
| Keine Datei > 400 Zeilen (außer `data/*`) | ⚠️ eine Ausnahme, siehe unten |
| Keine Magic Numbers außerhalb `config.js` | ✅ `AUDIO` und `COMMENTARY` sind dafür dazugekommen |
| Keine Abhängigkeitszyklen | ✅ `madge --circular src/`: **keine**, über 66 Dateien |
| Jeder `addEventListener` hat sein `remove` | ✅ bis auf die zwei Gesten-Listener in `main.js`, die absichtlich die ganze Seitenlebensdauer halten |
| Kein `innerHTML` mit Nutzerdaten | ✅ 0 Treffer im ganzen `src/` |
| Try/Catch um `localStorage`, `AudioContext`, `navigator.vibrate` | ✅ alle drei |
| Engine ≥ 90 % Zeilen, Reducer/Payout 100 % Branches | ✅ Engine **98,03 %**; `payout.js`, `reducers.js`, `store.js`, `persistence.js` je **100 % Branches** |
| `npm run lint` ohne Fehler und Warnungen | ✅ |
| Keine TODO/FIXME ohne PROGRESS-Eintrag | ✅ 0 Treffer |

**Im A6 gefunden und behoben:**

1. **`unlock()` in `audio.js` hatte kein Try/Catch.** Safari wirft, sobald eine Seite zu viele
   AudioContexts geöffnet hat, und `resume()` lehnt ab, wenn der Aufruf nicht aus einer Geste
   kommt. Ein Spiel ohne Ton funktioniert; ein Spiel, das beim ersten Tippen eine Exception
   wirft, nicht. Beides ist jetzt abgefangen und per Test belegt.
2. **`race.js` war auf 568 Zeilen gewachsen.** Drei Einheiten sind herausgezogen worden, jede mit
   einer eigenen Aufgabe statt als Zeilenschieberei: `raceNarration.js` (alles, was das Rennen
   von sich gibt – Kommentar, Ton, Live-Region, Trinkregeln, in genau dieser Reihenfolge in
   Takt gehalten), `racePhotoFinish.js` (Erkennung, Zeitlupe, Auflösung) und `createReadout()`
   in `raceDebug.js` (das Debug-Panel baut seinen Text zweimal pro Sekunde neu, nicht 60-mal).
   Ergebnis: **568 → 438 Zeilen**. Ebenso `sfx.js`: die drei Bausteine Envelope, Ton und
   Noise-Burst sind nach `audio/voices.js` gewandert, 425 → 344.

**Die verbleibende Ausnahme: `race.js` mit 438 Zeilen.** Der Bildschirm besitzt die
Simulationsschleife, die Interpolation, die Kamera, beide Bahn-Orientierungen, das HUD, den
Countdown, die Pause und das Debug-Panel. Jeder weitere Schnitt würde Dinge trennen, die man
zusammen liest – vor allem `render()`, dessen 75 Zeilen genau eine Sache tun: einen Frame in der
richtigen Reihenfolge zeichnen. Eine Aufteilung nach Zeilenzahl statt nach Zuständigkeit würde
zehn Parameter durch eine neue Modulgrenze schieben und die Datei schlechter lesbar machen, nicht
besser. Dieselbe Begründung wie bei `screens.css` und `components.css` seit M1.

**A1 (UI/UX):** Alle M7-Oberflächen im Browser durchgespielt:

| Prüfpunkt | Ergebnis |
| --- | --- |
| Sound startet nach dem ersten Tap | ✅ AudioContext `running`, Signal am Bus gemessen (Peaks 0,03–0,07 über 20 Messungen, eine Stille) |
| Alle 13 Cues und alle 23 Event-Sounds werfen nicht | ✅ einzeln im Browser ausgelöst |
| Mute wirkt sofort | ✅ Rampe statt Schnitt, per Test belegt |
| Kommentator: keine doppelte Zeile im Rennen | ✅ 20 Zeilen, 0 Duplikate im gemessenen Rennen; Test über 10 Rennen |
| Wettarten wirken pro Spieler im „Frei"-Modus | ✅ „Letzter" und „Platz" nebeneinander, Chips in Übersicht und Ergebnis |
| Führungswechsel-Regel | ✅ 3 Auslösungen im Schlussdrittel, Toast + Rückschau |
| Alkoholfrei-Modus überall | ✅ 0 hartkodierte „Schluck" außerhalb von `strings.js` und `data/` |
| Alle Einstellungen wirken und überleben Reload | ✅ inklusive der neuen: Reduzierte Bewegung, Rennen überspringbar |

**Im A1 gefunden und behoben:**

1. **Der Kommentator wiederholte sich doch.** Der Wiederholungsschutz lag auf dem *Template*, aber
   „{horse} ist vorne" zweimal für dasselbe Pferd ist für jeden am Tisch dieselbe Zeile. Der
   Schutz sitzt jetzt auf dem fertigen Satz. Aufgefallen ist es dem Test über zehn Rennen, nicht
   dem Auge – nach 19 Zeilen war eine doppelt.
2. **Windschatten belegte 6 von 20 Zeilen.** Der Effekt wird nicht wie die anderen Events
   eingeplant, sondern entsteht immer dann, wenn zwei Pferde hintereinander laufen – also
   mehrmals pro Rennen. Mit Event-Priorität drängte er die Pointen von der Zeile. Er ist jetzt
   als `minor` markiert und läuft auf der leiseren Priorität, und hat statt zwei sechs Varianten.
3. **Im „Frei"-Modus war nicht zu sehen, wer worauf gesetzt hat.** Übersicht und Ergebniskarten
   zeigen die Wettart jetzt als Chip – aber nur in diesem Modus, wo sie sich unterscheiden kann.
4. **Die Rückschau listete dieselbe Regel mehrfach.** Drei Führungswechsel lesen sich als
   „3× Führungswechsel! Alle trinken 1 Schluck!" besser als dreimal derselbe Satz.

### A4 / A5 – Audits zu M8 (2026-09-02)

**Die Zahlen aus Lighthouse (Mobile-Preset, also 4× gedrosselte CPU und simuliertes 3G):**

| Kategorie | Ziel | Gemessen |
| --- | --- | --- |
| Performance | ≥ 90 | **92** |
| Accessibility | ≥ 95 | **100** |
| Best Practices | ≥ 95 | **100** |
| SEO | – | 100 |
| Cumulative Layout Shift | ≈ 0 | **0** |
| Total Blocking Time | – | **0 ms** (vorher 1590 ms) |

**A5 (Performance): zwei Befunde, beide gemessen und behoben.**

1. **Lighthouse meldete `NO_LCP` und damit Performance 0.** Kein „langsam", sondern *gar kein*
   Largest Contentful Paint. Ursache: Jeder Screen betrat die Bühne über `.screen--entering` mit
   `opacity: 0` und blendete ein – und Chrome zählt ein Element, dessen erster Paint durchsichtig
   ist, nicht als LCP-Kandidat. Die Seite hatte also nie einen. Der **erste** Screen fadet jetzt
   nicht mehr ein; jeder Wechsel danach schon. Das ist auch ohne Messwert die bessere Lösung –
   die Seite, die man gerade geöffnet hat, einzublenden sieht aus wie ein Ruckler.
2. **Der Attract-Mode blockierte den Main-Thread 1804 ms.** Sechs Pferde mit 60 fps zu animieren,
   während die Seite noch startet, war auf einer gedrosselten CPU der teuerste Posten überhaupt
   (`bootup-time` 2,1 s, davon 2032 ms `attract.js`). Zwei Änderungen: Die Schleife läuft mit
   **20 fps** statt 60 und pausiert bei verstecktem Tab, und sie startet erst im
   `requestIdleCallback`. Die Pferde sind das Letzte, was auf diesem Screen zählt.
   **TBT 1590 ms → 0 ms, Performance 67 → 92.**

**Frame-Zeiten über ein volles Rennen** (50,8 s, Desktop, 3047 Frames):

| Abschnitt | Median | p99 | max |
| --- | --- | --- | --- |
| Ganzes Rennen inkl. Mount und Übergabe | 16,7 ms | 18,7 ms | 65,6 ms |
| Mittlere Hälfte (reines Rennen) | 16,7 ms | 18,7 ms | **18,7 ms** |

Genau zwei Ausreißer über 25 ms, und beide liegen dort, wo sie hingehören: 35 ms bei 3,0 s (der
Renn-Screen wird nachgeladen und montiert) und 66 ms bei 48,7 s (Übergabe an den Ergebnis-Screen).
**Während des Rennens fällt kein einziger Frame.** Die DoD-Formulierung „kein Frame > 16 ms" ist
bei einem 60-Hz-Bildschirm nicht messbar – 16,7 ms *ist* ein sauberer Frame; das belastbare Maß
ist der verworfene Frame, und davon gibt es null.

**Ladezeit:**

| Maß | Budget | Gemessen |
| --- | --- | --- |
| Initial Load bis `load` | < 300 KB | **176,8 KB** über 37 Dateien |
| Alles inkl. nachgeladenem Renderer | – | 399,5 KB über 72 Dateien |
| Schriften | – | **0 Bytes** – kein `@font-face`, „Fredoka" wird genutzt wenn vorhanden, sonst `system-ui` |

**Nicht behoben, bewusst:** Lighthouse markiert die fünf Stylesheets als render-blocking (46 KB
unkomprimiert, ~9 KB gzip). Die sauberen Gegenmittel wären ein Bundler (verbietet CLAUDE.md) oder
generiertes Inline-CSS, das die Quelle dupliziert. Bei FCP 2,1 s auf gedrosseltem 3G und 0,5 s auf
dem Desktop steht der Preis nicht dafür.

**A4 (Barrierefreiheit, vollständig): drei echte Befunde.**

1. **Nach der Pferdewahl verlor die Tastatur den Fokus an `<body>`.** Wer mit Enter ein Pferd
   wählt, wurde an den Seitenanfang geworfen und musste sich durch alle sechs Karten zurück zum
   Stepper tabben. Der Wett-Screen zeichnet sich bei jeder Änderung neu; er merkt sich jetzt, auf
   welcher Karte der Fokus stand, und gibt ihn danach an dieselbe Karte zurück (`data-horse` als
   stabiler Griff).
2. **`.portrait__number` hatte den Kontrast-Fix aus M6 nicht mitbekommen.** Die Nummer auf den
   Wett-Karten stand weiß auf der Signaturfarbe: 2,15:1 beim Amber, 2,28:1 beim Grün. `.horse-badge`
   war in M6 repariert worden, diese zweite Klasse kam mit den Portraits dazu und wurde übersehen.
   Jetzt dieselbe Behandlung: dunkler Grund, Ring in der Signaturfarbe.
3. **Der deaktivierte „Rennen starten"-Button lag bei 4,15:1.** Deaktivierte Bedienelemente sind
   von der Kontrastregel ausgenommen, aber dieser Button trägt das Ziel des ganzen Screens.
   Jetzt 4,6:1 – kostet nichts und hilft allen.

Der Sweep läuft über jeden sichtbaren Text auf Start, Spieler, Wetten und alle drei Modals und
rechnet die tatsächliche Farbe durch den kompletten Alpha-Stapel:

| Prüfpunkt | Ergebnis |
| --- | --- |
| Textkontrast ≥ 4,5:1 (groß 3:1) | ✅ 0 Verstöße nach den Fixes |
| Touch-Ziele ≥ 48 × 48 px | ✅ 0 Verstöße |
| Alles per Tastatur erreichbar, Reihenfolge = Lesereihenfolge | ✅ kein positives `tabindex`, kein unbenanntes Element |
| Pferd per Tastatur wählbar, `aria-pressed` korrekt | ✅ |
| Modals: Fokus-Falle, `Esc`, Fokus kehrt zum Auslöser zurück | ✅ |
| `aria-live` meldet Start, Führungswechsel (max. alle 3 s), Fotofinish, Sieger | ✅ seit M7 |
| Canvas `role="img"` mit aktuellem Stand | ✅ |
| `prefers-reduced-motion` inklusive manueller Überschreibung | ✅ `data-motion` am Wurzelelement, seit M7 |
| Zoom 200 %: kein horizontales Scrollen | ✅ |
| Lighthouse Accessibility ≥ 95 | ✅ **100** |

Offen bleibt die Deuteranopie-Simulation im DevTools-Rendering-Tab – die kann nur ein Mensch am
Bildschirm beurteilen. Konstruktiv ist der Fall abgedeckt: Jedes Pferd trägt seine Nummer auf
Badge, Satteldecke und Startbox, dazu ein eigenes Accessoire und eine eigene Fellfarbe.

**PWA und Offline:**

| Prüfpunkt | Ergebnis |
| --- | --- |
| Manifest vollständig | ✅ Name, `standalone`, `orientation: any`, Theme-Color, drei Icons (192, 512, maskable 512) |
| Icons prozedural | ✅ aus `render/horsePortrait.js`, erzeugt von `npm run icons` – sie können nicht vom Spiel wegdriften |
| Apple-Meta-Tags | ✅ `apple-touch-icon`, `apple-mobile-web-app-*` |
| Service Worker cache-first mit Version | ✅ `pferderennen-v1`, **78 Dateien** vorgeladen |
| Precache-Liste kann nicht veralten | ✅ generiert von `npm run sw`, in der CI mit `git diff --exit-code` abgesichert |
| Update-Hinweis | ✅ Toast „Neue Version – neu laden", nur wenn schon ein Worker die Seite kontrolliert |
| **Flugmodus: vollständig spielbar** | ✅ Server gestoppt, dann Spieler angelegt, gewettet und ein ganzes Rennen bis zum Ergebnis gespielt |

Der Flugmodus-Test ist der eigentliche Beweis, und er umfasst auch den nachgeladenen
Renn-Renderer: Der Service Worker hatte ihn beim ersten Besuch mitgenommen, sonst wäre genau der
Moment kaputt gewesen, in dem es zählt.

**Randfälle aus `02_ARCHITECTURE.md` §9:** Tab-Wechsel (Pause-Overlay), Rotation im Rennen,
Reload im Rennen (zurück zu den Wetten mit Hinweis), Private Mode ohne `localStorage`, fehlendes
WebAudio und `prefers-reduced-motion` – alle sechs abgedeckt, die letzten drei zusätzlich durch
Unit-Tests, die genau diese Umgebungen nachstellen.

### A7 – Release-Audit zu M9 (2026-09-02)

Das vollständige Dokument ist [`docs/audits/release-v1.0.md`](docs/audits/release-v1.0.md) – es
fasst A1–A6 zusammen, listet die Browser-Matrix und den Fairness-Nachweis. Hier nur, was beim
Release-Durchlauf **neu gefunden** wurde:

1. **Eine Einstellung, die man ändert und sofort neu lädt, war weg.** Die Persistenz schreibt
   entprellt nach 200 ms – damit ein gehaltener Stepper nicht zehnmal schreibt. Der Preis war ein
   Fenster, in dem eine Änderung nur im Arbeitsspeicher steht. Der E2E-Test „Einstellungen
   überleben einen Reload" ist genau darüber gestolpert; von Hand hätte ich es nie getroffen, weil
   ein Mensch zwischen Klick und Reload immer länger als 200 ms braucht. Die ausstehende Schreibung
   fließt jetzt bei `pagehide` und beim Wechsel auf `visibilityState === 'hidden'` ab – das deckt
   Reload, Navigation und das Wegwischen der App auf iOS ab.
2. **`debugSkip` war im normalen Spiel sichtbar.** Der Schalter „Rennen überspringbar" stand in
   den Einstellungen, wo ihn jeder finden konnte; A7 verlangt ausdrücklich, dass er im
   Produktions-Flow unsichtbar ist. Die Einstellung bleibt (die GDD-Tabelle §6 führt sie), aber
   der Schalter erscheint nur noch mit `?debug=1`. Für die E2E-Tests gibt es zusätzlich
   `?debugSkip=1`, damit kein Test dreißig Sekunden Pferden zusieht.
3. **`debugSeed` war toter Code.** Stand seit M0 in `DEFAULT_SETTINGS` und war nie verdrahtet.
   Entfernt.

**Der Service-Worker-Update-Mechanismus wurde einmal komplett durchgespielt**, nicht nur gelesen:
Version hochgezählt → `updatefound` → neuer Worker erreicht `installed` → Toast „Neue Version –
neu laden." erscheint → Reload aktiviert ihn → der alte Cache ist gelöscht, der neue hat wieder
78 Dateien. Danach zurück auf `v1.0.0`.

**Die E2E-Tests haben zwei Anläufe gebraucht, und beide Fehlversuche waren lehrreich.** Erst
löschte ein `addInitScript` den `localStorage` bei *jeder* Navigation – also auch bei dem Reload,
um den es im Persistenz-Test gerade ging. Playwright gibt ohnehin jedem Test einen frischen
Browser-Kontext, das Skript war schlicht überflüssig. Und der Determinismus-Test spielte zweimal
hintereinander in derselben Sitzung, wo beim zweiten Mal die Wetten noch standen; er benutzt jetzt
zwei getrennte Kontexte, was auch besser ausdrückt, was er behauptet: Der Seed entscheidet das
Rennen, sonst nichts.

### A2 / A3 / A4 / A5 – Audits zu M10 (2026-09-03)

**A2 ist hier der eigentliche Punkt.** M10 besteht aus Startpistole, Zielband, vier Renn-Effekten
und einer Siegerehrung – alles Dinge, die auf der Bahn passieren. Wenn davon auch nur eines in die
Simulation durchgeschlagen wäre, müsste der Audit es zeigen. Er zeigt **Ziffer für Ziffer
dieselben Zahlen** wie vor M10: Siegquoten 0,1627–0,1693 je Chaos-Level, S1 31,24 %, S5 39,59 %,
S6 132 Units, D1 grün.

Das Zielband ist der Fall, bei dem das am leichtesten hätte schiefgehen können. Es reißt, wenn ein
Pferd über die Linie kommt – und liest dafür bewusst die **gezeichnete** Position, nicht die
simulierte. Es kann damit nur auf etwas reagieren, das längst entschieden ist.

**A5 (Performance): zwei Altlasten gefunden, beide älter als M10.**

1. **Die automatische Qualitätsabsenkung war tot.** `render()` reichte dem Monitor den festen
   Simulations-Timestep weiter statt der echten Framezeit. Der Monitor rechnet `frames / elapsed`
   – mit `elapsed = frames × 1/60` kommt dabei **immer exakt 60** heraus. Der Mechanismus, auf dem
   die ganze A5-Zusage „lieber Dekoration wegwerfen als Frames" beruht, konnte seit M4 nie
   auslösen, und die „60 fps" im Debug-Panel waren keine Messung, sondern eine Tautologie. Die
   Schleife reicht jetzt die reale Frame-Dauer durch. Nebenwirkung: Der Wert im Debug-Panel
   schwankt seitdem sichtbar – das ist der Unterschied zwischen Messen und Behaupten.
2. **Zeitlupe verlangsamte nur die Simulation.** Alles Gezeichnete lief mit Wanduhr-Tempo weiter:
   Im Fotofinish galoppierten die Beine mit vollem Tempo, während das Pferd kroch. Die
   Animations-Zeit folgt jetzt der Simulationsuhr.

Messung über ein volles Rennen (statischer Server, ohne den Debug-Proxy, gleiche Methode wie M8):

| | M8 | M10 |
| --- | --- | --- |
| Median | 16,7 ms | 16,7 ms |
| p99 | 17,6 ms | 17,6 ms |
| Frames > 33 ms | 2 in 50,8 s | 3 in 52,9 s (zwei davon **nach** dem Rennen, bei der Übergabe) |
| Lighthouse Mobile | 92 / 100 / 100 | **91 / 100 / 100** |
| CLS · TBT | 0 · 0 ms | **0 · 0 ms** |
| Initial Load | 176,8 KB | **184,1 KB** (Budget 300) |

Die 7 KB sind Starter, Zielband, Blitzlichter und die Effekt-Konstanten. Die Siegerehrung ist
**nicht** dabei: sie wird erst nach dem `load`-Ereignis geholt, gemessen mit 0 Bytes davor. Das
war nötig, weil `results.js` eager importiert wird – ein direkter Import hätte die ganze
Zeichenschicht in den ersten Paint gezogen, also genau das Budget gerissen, das M5 zurückerobern
musste.

**A3 (Visual): in beiden Orientierungen geprüft, drei Sachen unterwegs korrigiert.**

| Prüfpunkt | Ergebnis |
| --- | --- |
| Startsequenz: Arm hoch über 3-2-1, Schuss auf „LOS!" | ✅ Frame für Frame nachgesehen, quer und hoch |
| Zielband intakt, Riss, Wegfliegen | ✅ beide Orientierungen, Zustände einzeln gerendert |
| Siegerehrung: Einmarsch 3-2-1, Jockeys aufs Treppchen | ✅ |
| Kein lineares Tweening | ✅ auch die Boxen bekommen jetzt ihren Bounce |
| Reduced-Motion-Pfad für jeden neuen Effekt | ✅ kein Blitz, kein Rauch, keine Speedlines, kein Kamera-Push; Ehrung steht sofort fertig da |

1. **Der Starter stand zuerst vor der Tribüne** und ging als dunkle Figur im bunten Publikum
   komplett unter. Er steht jetzt an der vorderen Bande, wo er sich gegen den Sand absetzt.
2. **Sein Arm schwenkte den kurzen Weg nach vorn** – und richtete die Pistole dabei waagerecht
   über die Bahn auf die Pferde. Er geht jetzt nach hinten herum hoch.
3. **Die gerissenen Bandhälften fielen ins Nichts.** In der Seitenansicht ist „nach unten"
   dieselbe Richtung, in der das Band ohnehin verläuft – die Hälften kollabierten auf die
   Ziellinie und verschwanden im Schachbrett. Sie werden jetzt vom Pferd nach vorn mitgerissen,
   bevor sie fallen.

Dazu zwei kleinere: In der Ehrung wurde der Jockey doppelt gezeichnet – einmal im Sattel, einmal
auf dem Treppchen (jetzt über dasselbe `riderless`-Flag, das auch das Rennen benutzt), und die
Pferde standen vor statt hinter ihren Sockeln.

**A4:** Die Ehrung ersetzt echten Text durch ein Canvas, deshalb vollständig nachgeprüft. Die drei
Namen stehen als DOM-Text unter der Szene, das Canvas trägt `role="img"` mit einem Label, das die
ersten drei aufzählt. Kontrast- und Tap-Target-Sweep über den Ergebnis-Screen: 0 Verstöße, kein
horizontales Scrollen. Die feste Seitenverhältnis-Box hält CLS bei 0, obwohl die Szene nachgeladen
wird.

**Beim Bauen gefunden und behoben:** Hatte sich die Ehrung selbst angehalten, blieb nach einer
Drehung eine leere Fläche zurück – `canvas.width` zu setzen löscht sie, und es zeichnete ja nichts
mehr. Ein Resize weckt die Szene jetzt für ein Bild.

### A1 / A2 / A3 / A4 / A5 – Audits zu M14 (2026-09-04)

**A2:** Re-Run über 100.000 Rennen, alle 22 Kriterien erfüllt, S1 **31,24 %**, S5 **39,60 %**,
S6 **132** — dieselben Ziffern wie seit M10.

**A4 lief diesmal anders, und das war der Punkt.** Bisherige Sweeps sind nur durch das DOM
gelaufen; der Renn-Screen liegt aber über einem Canvas, und für alles, was dort schwebt, ist der
tatsächliche Untergrund ein gezeichnetes Bild. Der Sweep liest jetzt das **echte Pixel unter dem
Element** aus dem Canvas aus, wenn kein deckender Vorfahre gefunden wird.

Damit kam eine Altlast heraus, die vier Meilensteine überlebt hat: **die Startnummern auf der
Anzeigetafel standen in Weiß auf der Signaturfarbe** — 2,15 bis 4,23:1, also genau der Bereich, den
das M6-Audit für die Badges beschrieben und dort behoben hatte. Die Tafel war übersehen worden,
weil sie eben nicht auf einer Karte sitzt. Sie bekommt jetzt dieselbe Konstruktion wie
`.horse-badge`: dunkle Stufe als Fläche, Signaturfarbe als Ring. Weiß erreicht darauf 5,02 bis
8,98:1 über alle sechs Pferde.

Zwei Messfehler im eigenen Werkzeug, beide auf dem Weg gefunden:

1. **Der Parser konnte `color(srgb …)` nicht lesen** — das ist, was Chrome für `color-mix()`
   zurückgibt. Werte von 0 bis 1 wurden als 0 bis 255 gelesen, also praktisch als Schwarz. Jedes
   Element mit einer `color-mix()`-Fläche wurde dadurch falsch bewertet; auf dem Renn-Screen sah
   das nach sechs zusätzlichen Verstößen aus, die keine waren.
2. **Der Sweep verlangte 4,5:1 von deaktivierten Knöpfen**, weil er das `disabled` am `<span>`
   im Knopf suchte statt am Knopf. Deaktivierte Bedienelemente sind von WCAG 1.4.3 ausgenommen.

Nach beiden Korrekturen: **alle neun Ansichten sauber** — Menü (leer und mit Kader), Spieler,
Wetten (Auswahl und Übersicht), Rennen, Ergebnis, Statistik, Übernehmen-Karte, Regeln. Keine
Kontrastverstöße, kein Tap-Ziel unter 48 px, kein horizontales Scrollen, im iPhone-Viewport
gemessen.

**A5:** CLS **0**, TBT **0 ms**, Barrierefreiheit **100**, Performance 88–89 über drei Läufe —
gegenüber M13 unverändert. Die Kompositionsarbeit hat nichts gekostet.

**A3:** Zwei Befunde, beide sichtbar erst, als der Attract-Modus zum ersten Mal wirklich zu sehen
war. In allen bisherigen Screenshots war er leer, weil Chrome Animationen und `requestAnimationFrame`
in einem Hintergrund-Tab anhält — er lief die ganze Zeit, nur nie dann, wenn ich hinsah. Sichtbar
begann die Bahn auf einer harten Linie quer über die Seite, und die Bande zog einen hellen Strich
darüber. Die Szene blendet sich jetzt selbst in den Himmel ein, die Bande ist entfallen.

Der zweite: Die neue Podest-Beschriftung baute in einem ersten Versuch echte Stufen — und stand
damit als zweites Podest unter dem, das die Canvas-Szene ohnehin zeichnet. Sie ist jetzt wieder
Bildunterschrift.

**A1:** Keine neue Abhängigkeit, kein Hex außerhalb `tokens.css`. Ein toter Farbeintrag
(`COLOURS.fence` in `attract.js`) ist mit der Bande verschwunden.

### A1 / A2 / A4 / A5 / A6 – Audits zu M13 (2026-09-04)

**A2:** M13 fasst kein einziges Stück Spiellogik an. Re-Run über 100.000 Rennen: alle 22 Kriterien
erfüllt, S1 **31,24 %**, S5 **39,60 %**, S6 **132**, Siegquoten 0,1646–0,1688 — dieselben Ziffern.

**A5 ist hier der interessante Teil**, weil eine Webschrift genau das kaputt macht, was frühere
Meilensteine mühsam auf null gebracht haben. Ergebnis: **CLS 0** — vorher 0,002 —, **TBT 0 ms**,
Barrierefreiheit **100**, Performance **88–90** über drei Läufe.

Zwei Messfehler auf dem Weg, beide erwähnenswert:

1. **Der erste Lauf ergab Performance 41.** Ursache war nicht die Schrift, sondern dass ich gegen
   den Vite-Dev-Server gemessen habe: `@vite/client` allein sind 199 KiB, und jedes 2-KB-Modul
   kommt mit HMR-Wrapper als 55–89 KiB an. Auf GitHub Pages liegen die Rohdateien. Gegen
   `scripts/serve.js` gemessen sind es 93.
2. **Die Byte-Zahl in der DoD stimmt nicht mehr.** Der lokale statische Server liefert
   unkomprimiert (542 KiB), GitHub Pages liefert gzip. Gzipped sind es **344 KiB** für die
   komplette Precache-Liste — und die **live ausgelieferte Version vor M13 lag schon bei 310 KiB**,
   gemessen über alle 85 Dateien. Die 300-KB-Grenze war also bereits vor diesem Meilenstein
   gerissen, vermutlich durch M10. M13 fügt +34 KiB hinzu, davon 29 die Schrift. Was tatsächlich
   den ersten Anstrich blockiert — HTML, fünf Stylesheets, Schrift — sind **48 KiB gzipped**.

**Kontrollmessung, weil ich es nicht glauben wollte:** dreimal ohne Webfont gemessen ergibt
88/88/91, dreimal mit ergibt 88/88/90. **Die Schrift kostet keinen Punkt.** Der Wertebereich ist
schlicht der, in dem die App nach M10–M12 liegt; die früher notierten 91/92 liegen im selben
Rauschen. Der größte verbliebene Posten laut Lighthouse ist Minifizierung (173 KiB JS), und die
braucht einen Build-Schritt, den das Projekt ausschließt — das ist die bekannte Decke, kein neuer
Befund.

**A4: drei Befunde, alle behoben, alle älter als M13.** Der Sweep lief diesmal über *alle sechs*
Screens statt nur über Karteninnenräume — und genau dort lag das Problem: **gedämpfter Text, der
direkt auf dem Hintergrundverlauf steht**, erreicht mit `--text-muted` nur 3,0–3,7:1. Betroffen
waren der Screen-Untertitel, `.field__label` und `.hint` auf dem Spieler-Screen. Dafür gibt es
jetzt `--text-on-sky` (eine Stufe dunkler, 6,1–7,5:1 über den ganzen Verlauf); innerhalb einer
Karte bleibt es beim helleren Ton, sonst wären die beiden Stufen nicht mehr unterscheidbar.
Dazu: `.input:focus` schaltete den globalen Fokusring ab, und `.btn--danger:active` blitzte mit
oranger Kante auf, weil die `:active`-Regel nicht nach Variante qualifiziert war.

Ein vierter, scheinbarer Befund war keiner: Der Sweep meldete Tap-Ziele mit 46 statt 48 px in den
Modalen. Ursache ist, dass Chrome CSS-Animationen in einem Hintergrund-Tab anhält — die
Einblendung des Modals stand bei ihrem Startwert `scale(0.96)` still, und 48 × 0,96 = 46,08.

**A1:** Außerhalb von `tokens.css` steht kein Hex-Wert und kein rohes Primitiv; die Komponenten
sehen ausschließlich die semantische Ebene. 25 tote Tokens sind verschwunden (alle 18 `--horse-*`
und fünf Umgebungsfarben, die nie jemand gelesen hat). `data/horses.js` trägt jetzt den Vermerk,
dass es die einzige Quelle der Pferdefarben ist und `trackTheme.js` mitgezogen werden muss.

**A6:** `tokens.css` 306 Zeilen, `base.css` 318, `components.css` 710, `screens.css` 831 — die CSS-
Ausnahme aus M1 gilt unverändert und ist dort begründet. Keine JS-Datei ist neu über 400 gewachsen;
`icon.js` hat 96. 350 Unit-Tests, 14 E2E-Tests grün.

### A1 / A2 / A4 / A6 – Audits zu M12 (2026-09-03)

**A2:** M12 fasst nur an, wie ein Einsatz geändert wird. Der Re-Run über 100.000 Rennen: alle 22
Kriterien erfüllt, S1 **31,24 %**, S5 **39,60 %**, S6 **132**, Siegquoten 0,1646–0,1688 — dieselben
Ziffern wie vor M12.

**A4 ist hier der eigentliche Punkt**, weil die Zeile zwei zusätzliche Bedienelemente bekommt.
Beide messen 48 × 48 px, Kontrast **12,64:1** im aktiven Zustand (gemessen mit Alpha-Komposition,
nicht auf der halbtransparenten Füllung geraten). Der deaktivierte Zustand an den Grenzen 1 und 10
liegt bei 3,35:1 — dieselbe Regel wie beim Stepper im Einsatz-Panel, und inaktive Bedienelemente
sind von WCAG 1.4.3 ausgenommen. Tab-Reihenfolge je Zeile Pick → ⊖ → ⊕, kein horizontales Scrollen,
und der Fokus bleibt nach jedem Tipp auf dem Knopf, den man gedrückt hat — außer der wird durch
den Tipp selbst deaktiviert, dann übernimmt der Partnerknopf.

**A6: ein Befund, von mir selbst verursacht.** `ui/screens/betting.js` war durch `nudgeStake` und
die Fokus-Rückgabe auf 413 Zeilen gewachsen. Die Naht lag schon bereit — der Kopf von
`bettingSummary.js` sagt seit M11, das Pferde-Raster sei „a different job: that one is about
choosing, these are about seeing what has been chosen". Genau das ist jetzt `ui/bettingChoice.js`
(157 Zeilen): das Raster und das Einsatz-Panel. Ergebnis **413 → 321 Zeilen**. `reducers.js` steht
weiter bei 100 % Branch Coverage; 350 Unit-Tests, 14 E2E-Tests grün.

**A1:** Keine neue Abhängigkeit, keine Hex-Farbe außerhalb der erlaubten Dateien. Das neue
Bedienelement ist bewusst keins: Die Nudge-Knöpfe tragen `.stepper__btn`, also denselben Knopf, den
das Einsatz-Panel benutzt — nur mit ruhigerer Füllung, damit sechs davon nicht den Startknopf
überschreien.

### A1 / A2 / A4 / A6 – Audits zu M11 (2026-09-03)

**A2 zuerst, weil es der Punkt ist.** M11 fasst nur an, wie Wetten zustande kommen. Wetten
erreichen die Simulation ohnehin nie – `createRace()` bekommt `{seed, duration, chaos}` und sonst
nichts. Der Re-Run über 100.000 Rennen bestätigt das: alle 22 Kriterien erfüllt, S1 **31,24 %**,
S5 **39,60 %**, S6 **132** Units, Siegquoten 0,1646–0,1688. Dieselben Ziffern wie vor M11.

**A4: Die Übersicht wird von Text zu Bedienelementen** – der eine Punkt, an dem M11 wirklich
Barrierefreiheit berühren kann. Jede Zeile ist jetzt ein `<button>` mit sprechendem Namen („Wette
von Luka ändern: Sir Trabsalot, 3 Schlücke" bzw. „Wette für Ada setzen"), 48 px hoch, mit
sichtbarem Fokusring. Tastatur-Durchlauf: jede Zeile erreichbar, Enter öffnet die Auswahl, der
Fokus kehrt über den vorhandenen `data-horse`-Trick zurück. Kontrast-Sweep über den Wett-Screen:
0 Verstöße, kein horizontales Scrollen.

**A1: ein Befund, älter als M11.** `button()` spiegelte seinen `title` in ein `aria-label` – der
Hinweis, *warum* ein Knopf gesperrt ist, wurde damit zu seinem Namen. Ein Screenreader hörte auf
dem gesperrten Startknopf „Es fehlen noch 2 Wetten." und erfuhr nie, wofür der Knopf da ist. Der
Grund ist eine Beschreibung, kein Name. Der Hinweis steht ohnehin sichtbar unter dem Knopf, also
zeigt der Knopf per `aria-describedby` darauf, statt ihn zu wiederholen – `aria-description` wäre
ARIA 1.3 und in Firefox nicht implementiert. Gefunden hat das der neue E2E-Test, nicht das Auge:
Er suchte den Knopf über seinen Namen und fand ihn nicht.

**A6: `ui/screens/race.js` war in M10 auf 580 Zeilen gewachsen**, ohne dass das Audit zu M10 die
Dateilängen geprüft hätte. Herausgezogen ist `ui/raceCeremony.js` (139 Zeilen): Startpistole,
Zielband und der Kamera-Push zum Ziel sind eine Zuständigkeit – das Drumherum des Rennens – und
teilen sich die zwei Uhren, die es antreiben. Das Modul bekommt ausschließlich die **gezeichneten**
Positionen; damit bleibt strukturell unmöglich, dass das Zielband etwas entscheidet.
Ergebnis **580 → 498 Zeilen**. Das bleibt über der Richtlinie und damit eine Ausnahme in derselben
Begründung wie zu M7: Was übrig ist, ist das Verdrahten von Engine, Kamera, Bahn und HUD zu einem
Bild, und eine weitere Teilung nach Zeilenzahl statt nach Zuständigkeit würde das Lesen erschweren.
`reducers.js` steht bei **100 % Branch Coverage**, 349 Unit-Tests, 12 E2E-Tests grün.

## Playtest-Notizen

_(Datum – Meilenstein – Beobachtungen – abgeleitete Tasks)_

**Offen (nur der Nutzer kann das):**

- **M14:** Das Spiel jemandem zeigen, der es nicht kennt. Sieht es aus wie etwas, das man kaufen
  würde? Und: einmal auf einem echten Fernseher öffnen — der 10-Fuß-Fall ist bisher nur gerechnet,
  nicht gesehen.
- **M13:** Das Menü auf dem eigenen Handy anschauen. Sieht das jetzt nach einem Produkt aus, oder
  fehlt noch etwas Offensichtliches?
- **M12:** Zwischen zwei Rennen bei einem Spieler den Einsatz hochdrehen. Reicht ein Tap, oder
  sucht man doch wieder die Pferdeauswahl?
- **M11:** Zwei Rennen hintereinander mit vollem Tisch. Ist die Übernehmen-Karte an der richtigen
  Stelle, oder will man sie schon auf dem Ergebnis-Screen?
- **M10:** Ein Rennen mit Ton von vorn bis hinten ansehen. Fühlt sich der Start wie ein Start an,
  und ist die Siegerehrung die richtige Länge – oder will man schneller zur Abrechnung?
- **M9 – einmalig, blockiert den Live-Gang:** In den Repo-Settings → Pages → Source auf
  **„GitHub Actions"** stellen. Danach `deploy.yml` einmal von Hand starten (Actions → Deploy to
  GitHub Pages → Run workflow); ab dann läuft es bei jedem grünen CI-Lauf auf `main` von selbst.
  Der Workflow ist geprüft: Staging und Pfad-Check laufen durch, er scheitert nur an
  `configure-pages`, weil Pages noch nicht aktiviert ist ([Run 33682199554](https://github.com/lukabpunkt/Pferderennen/actions/runs/33682199554)).
- **M9:** Der echte Spieleabend – Vorlage in [`docs/PLAYTEST_TEMPLATE.md`](docs/PLAYTEST_TEMPLATE.md).
- **M8:** Auf dem Handy „Zum Home-Bildschirm" hinzufügen, Flugmodus an, spielen. Dazu die
  Deuteranopie-Simulation im DevTools-Rendering-Tab.
- **M7:** Ein Rennen mit Ton hören – stimmt die Mischung? Modus „Letzter" und die
  Führungswechsel-Regel zu zweit ausprobieren.
- **M6:** Drei Personen, die das Spiel nicht kennen, spielen ohne Erklärung. Wo stocken sie? Wo
  lachen sie?
- **M4/M5:** FPS auf einem echten Mittelklasse-Handy mit `?debug=1` messen.
- **M5:** Fünf Rennen auf Chaos „Vollgas" – welche Events sind witzig, welche unklar?

## Bekannte Probleme / offene TODOs

_(werden hier gesammelt, bevor sie zu Tasks werden)_

- Noch 1 Platzhalter-Modul mit JSDoc-Kopf und leerem `export {}`: `render/sprites.js` (Backlog).
- Die Rückansicht kennt keine Accessoires. Auf dem Handy sind sie bei rund 50 px Breite ohnehin
  nicht lesbar; Farbe und Nummer tragen die Unterscheidung.
- Das bleibende Dekor liegt immer an der Bahn des betroffenen Pferdes. Ein Pferd, das über eine
  fremde Bananenschale läuft, merkt davon nichts – das Dekor ist Erinnerung, nicht Physik.
- `screens.css` (1057), `components.css` (725), `race.css` (509), `base.css` (343) und
  `ui/screens/race.js` (505)
  liegen über der 400-Zeilen-Richtlinie. Begründung im A6-Protokoll zu M7 und M11.
  Der übrige Produktivcode in `src/**.js` hält sie ein.
- Das Publikum steht still. Die La-Ola-Welle bei Events und im Finish gehört zu M5.
- Das Text-Rennen zeigt pro Event nur die erste Kommentar-Variante. Die richtige
  Kommentator-Engine mit Zeilen-Pool und Wiederholungsschutz kommt in M7.
- Der Display-Font „Fredoka" ist in `tokens.css` als `--font-display` gesetzt, aber noch nicht
  self-hosted; bis dahin greift der Fallback `system-ui`. Die woff2-Datei kommt in M6 nach
  `assets/fonts/` (docs/04 §3).
- `npm run e2e` ist angelegt, hat aber noch keine Playwright-Config und keine Specs – beides
  entsteht in M9. Der CI-Schritt überspringt E2E deshalb, solange `tests/e2e/` leer ist.
- Der Ergebnis-Screen zeigt die Event-Trinkregeln noch nicht als Rückblick-Liste an – es gibt bis
  M5 keine Events. `settle()` liefert sie bereits vollständig und getestet mit.
- Das Podium ist aus CSS-Sockeln gebaut. Die prozeduralen Pferde-Portraits und der
  Stagger-Einsprung kommen laut Plan in M6.

## Backlog v1.1+

Jedes Feature bekommt einen eigenen Mini-Meilenstein mit denselben Regeln: Definition of Done,
Audit, und ein Fairness-Re-Run. Nichts davon darf die 1/6 antasten.

**Aus dem GDD §5 Priorität B:**

| Idee | Was es ist | Fairness-Risiko |
| --- | --- | --- |
| **Jackpot-Runde** | Jede 5. Runde zählt doppelt, mit Sirenen-Overlay | keins – reine Auszahlungsregel in `payout.js` |
| **Pechvogel-Bonus** | Wer 3× in Folge verliert, darf 2 Schlücke gratis setzen (nur verteilen) | keins – berührt die Engine nicht |
| **Sudden Death** | Finales Rennen um alle verbliebenen Schlücke × 2 | keins |
| **Wetter-Varianten** | Regen, Nacht, Schnee – andere Event-Gewichte, gleiche für alle | **gering, aber prüfen**: Event-Gewichte je Wetter müssen für jedes Pferd identisch bleiben |
| **Strecken-Varianten** | Rasen, Sand, Strand, Mond (niedrigere Gravitation) | **gering, aber prüfen**: Sprunghöhe ist rein visuell, Geschwindigkeit darf sich nicht je Pferd ändern |
| **Share-Card** | Ergebnis als Bild zum Teilen | keins |
| **Zuschauer-Emojis** | Tribüne reagiert mit Emojis | keins |
| **Sprite-Sheet-Option** | Vorgerenderte Pferde statt Pfad-Zeichnung, für schwache Geräte | keins – `render/sprites.js` steht als leeres Modul bereit |

**Aus der Arbeit an v1.0 übrig geblieben:**

- `ui/screens/race.js` liegt mit 438 Zeilen über der 400-Zeilen-Richtlinie, ebenso drei
  CSS-Dateien. Begründet im A6-Protokoll zu M7 – aber wenn der Screen nochmal wächst, ist ein
  Schnitt fällig.
- Die fünf Stylesheets sind render-blocking (~9 KB gzip). Ohne Bundler ist das der ehrliche
  Kompromiss; falls das Ladebudget je knapp wird, wäre kritisches Inline-CSS der nächste Schritt.
- Es gibt keinen DOM-Test für die Stepper-Ziffernrolle, weil alle Unit-Tests in der schnellen
  Node-Umgebung laufen. Jetzt, wo Playwright ohnehin da ist, gehört diese Prüfung in die E2E-Suite.
- `render/sprites.js` ist noch ein leeres Platzhalter-Modul.
