# 06 – QA-Audits & Checklisten

Audits werden am Ende eines Meilensteins durchgeführt (Zuordnung siehe `05_MILESTONES.md`). Ergebnis wird in `PROGRESS.md` als Tabelle eingetragen: Audit-ID, Datum, bestanden/nicht bestanden, offene Punkte. **Ein nicht bestandenes Audit blockiert den Meilenstein.** Punkte, die bewusst verschoben werden, brauchen eine Begründung in `PROGRESS.md` unter „Entscheidungen“.

Vorgehen für Claude Code: Jede Checkbox **tatsächlich prüfen** (Code lesen, Tests laufen lassen, Browser-Test via Playwright oder Beschreibung für Nutzer-Test), nicht pauschal abhaken. Wo ein Punkt nur im echten Browser prüfbar ist, wird er als „Nutzer-Test erforderlich“ markiert und dem Nutzer in der Zusammenfassung mitgegeben.

---

## A0 – Setup-Audit (M0)

- [ ] `npm ci` auf frischem Klon läuft ohne Warnungen zu fehlenden Peer-Deps.
- [ ] `npm run dev`, `npm run lint`, `npm test`, `npm run audit:fairness` existieren und beenden mit Exit 0.
- [ ] CI-Workflow ist auf GitHub grün (Link in `PROGRESS.md`).
- [ ] `index.html` lädt ohne Konsolenfehler; CSP-Meta blockiert nichts Eigenes.
- [ ] Verzeichnisstruktur entspricht `02_ARCHITECTURE.md` §2.
- [ ] `.gitignore` deckt node_modules, Test-Artefakte, OS-Dateien ab.
- [ ] Prettier + ESLint: `npm run lint` meldet 0 Fehler; ESLint-Sonderregeln für `src/engine/**` greifen (Testweise `Math.random()` in `engine/rng.js` einfügen → Lint-Fehler → wieder entfernen).

## A1 – UI/UX-Audit (M1, M6, M7)

**Flow**

- [ ] Vom Start bis zum ersten Rennen in ≤ 6 Taps (bei 2 Spielern mit Default-Einsatz).
- [ ] Zu jedem Zeitpunkt ist klar, **wer** gerade dran ist und **was** zu tun ist (Header-Text + primärer Button).
- [ ] „Rennen starten“ ist erst aktiv, wenn alle gesetzt haben; disabled-Zustand erklärt warum.
- [ ] Zurück-Navigation überall möglich (Browser-Back zerstört nichts; Hash-Router oder `history`-Handling).
- [ ] Reload auf jedem Screen: Zustand bleibt (außer laufendes Rennen → definierte Abbruch-Meldung).
- [ ] Ergebnis-Screen: In < 3 s versteht jeder, wer trinkt und wer verteilt (Nutzer-Test).
- [ ] Haus-gewinnt-Fall ist klar kommuniziert.

**Design**

- [ ] Ausschließlich Tokens verwendet (grep nach Hex-Farben in `src/**/*.css` und `src/ui/**` außer `tokens.css` → 0 Treffer; Canvas-Farben kommen aus `data/horses.js`/`config.js`).
- [ ] Alle Buttons ≥ 48 px Höhe (Primär 56 px), volle Breite auf Mobile.
- [ ] Typografie-Skala eingehalten; keine Font-Größe < 14 px.
- [ ] Alle Zustände: hover, active, focus-visible, disabled – sichtbar unterschiedlich.
- [ ] Keine Layout-Sprünge beim Laden (Font-Swap ohne Höhenänderung, reservierte Größen).
- [ ] Mobile 360 × 640 und Desktop 1440 × 900 geprüft (Playwright-Screenshots in `test-results/`).
- [ ] Texte: Du-Form, locker, keine Rechtschreibfehler, keine Anglizismen, wo ein deutsches Wort natürlich ist.
- [ ] Emojis sparsam und konsistent (🍺 für Trinken, 🥇 für Gewinner, 🏁 für Start).

## A2 – Fairness- & Suspense-Audit (M2, M5, M7)

- [ ] `npm run audit:fairness` (N = 100k) Exit 0; Report-Tabelle in `PROGRESS.md` eingefügt.
- [ ] Einmalig pro Meilenstein `--n=1000000`: alle Anteile in `[0.1607, 0.1727]`, Chi² p > 0.001.
- [ ] Sieganteile pro Lane ebenfalls uniform.
- [ ] Sieganteile je Chaos-Level und je Renndauer uniform.
- [ ] Platz-2–6-Verteilungen uniform.
- [ ] Event-Verteilung pro Läufer uniform; nie > 2 Events pro Läufer; Fenster 8–95 % eingehalten.
- [ ] S1–S6 innerhalb der Zielbereiche (Werte notieren).
- [ ] Determinismus-Test grün (gleicher Seed → identisches JSON).
- [ ] Code-Review `src/engine/**`: kein Import aus `render/ui/state/data/horses.js`; kein `Math.random`, `Date`, `performance`, `window`, `document` (Grep + ESLint).
- [ ] `step()` nimmt kein dt entgegen; Loop nutzt fixen Timestep.
- [ ] Betting-Daten (Einsätze, Spieler) werden nirgends an `createRace()` übergeben (Grep nach `bets` in `src/engine/` und `src/ui/screens/race.js`).
- [ ] Lane-Shuffle pro Rennen aktiv und getestet.
- [ ] Kein Rang-basiertes Rubber-Banding im Code (Suche nach `rank`, `leader`, `position` in `speedModel.js` → darf nur für Metriken, nie für Geschwindigkeit genutzt werden).
- [ ] Manueller Sanity-Check: 20 Rennen mit `?debug=1` ansehen – kein „gefühltes“ Muster (Nutzer-Test).

## A3 – Visual- & Animations-Audit (M3, M4, M5, M6)

**Pferd**

- [ ] Gallop-Zyklus ist bei jeder Geschwindigkeit flüssig (keine Sprünge in Beinwinkeln bei Tempowechsel; Zyklusphase wird kontinuierlich fortgeschrieben, nicht aus `t` neu berechnet).
- [ ] Mähne/Schweif zeigen Follow-Through; bei Stillstand hängen sie ruhig.
- [ ] Körper-Bounce und Schatten-Skalierung synchron zur Flugphase.
- [ ] Alle 6 Pferde unterscheiden sich in Fellfarbe, Accessoire **und** Signaturfarbe; Nummern auf Box und Satteldecke lesbar.
- [ ] Jeder Animations-State (Liste in `04_DESIGN_SYSTEM.md` §5.3) im `horse-lab` in Seiten- und Rückansicht geprüft; Übergänge geblendet.
- [ ] Sieger-`celebrate` ist eindeutig und dauert 2–3 s.

**Bahn & Kamera**

- [ ] Parallax-Layer bewegen sich mit unterschiedlicher Geschwindigkeit; keine sichtbaren Kachel-Nähte.
- [ ] Startboxen in korrekter Signaturfarbe des zugelosten Pferdes (Lane-Shuffle sichtbar korrekt).
- [ ] Kamera ruckelt nicht (Lerp), Feld ist immer vollständig sichtbar (oder Zoom greift).
- [ ] Ziellinie und Banner klar; Zieleinlauf ist erkennbar (Reihenfolge stimmt mit Engine-`order` überein – automatischer Test: Render-Positionen vs. Engine-Order am Ende).
- [ ] Portrait: eigenes Pferd innerhalb 1 s identifizierbar (Nutzer-Test mit 3 Personen).

**Events**

- [ ] Jedes Event hat Requisite + Pferde-Animation + Partikel + Kommentar + (falls definiert) Toast.
- [ ] Requisiten-Timing exakt: Effekt beginnt im selben Frame, in dem die Requisite trifft.
- [ ] Bleibende Dekor-Objekte werden gezeichnet und nach dem Rennen entfernt.
- [ ] Kein Event verdeckt das HUD oder wichtige Pferde-Info länger als 1 s.
- [ ] Reduced-Motion-Pfad: keine Shakes/Blitze, Events trotzdem verständlich.

**Polish**

- [ ] Countdown, Boxen-Öffnen, Fotofinish, Podium, Konfetti: jeweils mit Easing, kein lineares Tweening.
- [ ] Fotofinish tritt nur bei echtem Kopf-an-Kopf auf und löst sich sauber wieder auf (`timeScale` zurück auf 1).
- [ ] Screenshots Landscape + Portrait in `docs/screenshots/` aktualisiert.

## A4 – Barrierefreiheit-Audit (M4 Basis, M6, M8 vollständig)

- [ ] Alle interaktiven Elemente per Tastatur erreichbar und bedienbar; Reihenfolge logisch; `Enter` startet Rennen.
- [ ] `:focus-visible` überall sichtbar (Kontrast ≥ 3:1 zum Hintergrund).
- [ ] Textkontrast ≥ 4,5:1 (Tool: Playwright + axe-core oder manuelle Berechnung für alle Token-Kombinationen).
- [ ] Modals: Fokus-Trap, `Esc` schließt, Fokus kehrt zurück.
- [ ] `aria-live="polite"`-Region meldet: Countdown-Ende, Führungswechsel (gedrosselt, max. alle 3 s), Fotofinish, Sieger.
- [ ] Canvas hat `role="img"` + `aria-label` mit aktuellem Stand.
- [ ] Formularfelder haben Labels; Fehlermeldungen sind per `aria-describedby` verknüpft.
- [ ] `prefers-reduced-motion` respektiert; manuelle Überschreibung in Einstellungen.
- [ ] Pferde ohne Farbe unterscheidbar (Form/Nummer); Simulation von Deuteranopie (DevTools Rendering-Tab) geprüft.
- [ ] Touch-Ziele ≥ 48 × 48 px mit ≥ 8 px Abstand.
- [ ] Zoom 200 % im Browser: Menüs bleiben bedienbar, kein horizontales Scrollen.
- [ ] Lighthouse Accessibility ≥ 95 (M8).

## A5 – Performance-Audit (M3 Desktop, M4/M5 Mobile, M8 vollständig)

- [ ] `?debug=1` FPS-Anzeige: Desktop 60 FPS stabil; Mobile ≥ 55 FPS über ein ganzes Rennen (Wert notieren, Gerät nennen).
- [ ] Frame-Time: Update ≤ 2 ms, Render ≤ 10 ms (Desktop), keine Frames > 33 ms außer bei Zeitlupen-Umschaltung.
- [ ] Chrome Performance-Aufnahme 30 s Rennen: keine Major-GC-Pausen > 5 ms; Heap wächst nicht kontinuierlich über 5 Rennen.
- [ ] Partikel-Pool: keine Allokation pro Partikel im Rennen (Code-Review).
- [ ] Hintergrund-Layer aus Offscreen-Canvas; pro Frame ≤ ~600 Pfad-Operationen (Zähler im Debug-Overlay).
- [ ] Engine-Hot-Path allokationsfrei (Code-Review; `audit:fairness` N=100k < 60 s ist der Beweis).
- [ ] Initial Load < 300 KB (Liste der Dateien mit Größen in `PROGRESS.md`), keine externen Requests (Network-Tab: nur `self`).
- [ ] `quality: 'auto'`-Fallback reduziert Partikel/Schatten bei < 50 FPS und wird protokolliert.
- [ ] Lighthouse Performance (Mobile) ≥ 90 (M8).

## A6 – Code-Audit (M1, M2, M7)

- [ ] Jedes Modul hat JSDoc-Kopf mit Zweck; öffentliche Funktionen haben JSDoc-Signaturen.
- [ ] Keine Datei > 400 Zeilen (außer `data/*`); Funktionen ≤ ~60 Zeilen.
- [ ] Keine Magic Numbers außerhalb `config.js`/`tokens.css` (Grep nach Zahlen-Literalen in `render/` und `engine/` mit Augenmaß).
- [ ] Keine Abhängigkeitszyklen zwischen `engine/`, `render/`, `state/`, `ui/` (manuell oder `madge` als Dev-Tool).
- [ ] Alle `addEventListener` haben passende `remove` in `unmount()`; keine Listener-Leaks bei Screen-Wechsel (5× hin und her → Listener-Zahl konstant, via DevTools `getEventListeners`).
- [ ] Kein `innerHTML` mit Nutzerdaten; `textContent` überall bei Namen.
- [ ] Try/Catch um `localStorage`, `AudioContext`, `navigator.vibrate`.
- [ ] Tests: Engine ≥ 90 % Zeilen-Coverage, Reducer/Payout 100 % Branches; alle Tests < 20 s lokal.
- [ ] `npm run lint` 0 Fehler, 0 Warnungen.
- [ ] Commits folgen Conventional Commits; `main` deploybar.
- [ ] Keine TODO/FIXME ohne zugehörigen Eintrag in `PROGRESS.md`.

## A7 – Release-Audit (M9)

- [ ] A1–A6 in dieser Version alle bestanden (Tabelle in `docs/audits/release-v1.0.md`).
- [ ] E2E-Tests grün auf Chromium + WebKit (Desktop + Mobile-Viewport).
- [ ] GitHub Pages-URL funktioniert auf iOS Safari, Android Chrome, Desktop Chrome/Firefox/Safari (Matrix in `release-v1.0.md`).
- [ ] Service Worker: Update-Mechanismus getestet (Version hochzählen → Toast erscheint → Reload lädt neue Version).
- [ ] Fairness-Report N = 1M in `docs/audits/fairness-v1.0.json`, Zusammenfassung im README.
- [ ] README: Screenshots aktuell, Regeln korrekt, Lizenz vorhanden, keine toten Links.
- [ ] `CHANGELOG.md` und Git-Tag `v1.0.0` vorhanden.
- [ ] Kein Debug-Modus ohne `?debug=1` erreichbar; `debugSkip` ist im Produktions-Flow unsichtbar.
- [ ] Verantwortungs-Hinweis im Regeln-Screen vorhanden; Alkoholfrei-Modus funktioniert vollständig.

---

## Playtest-Leitfaden (Nutzer-Tests)

Für jeden Nutzer-Test in `05_MILESTONES.md` gilt derselbe Ablauf:

1. Nicht erklären. Zuschauen, wo Menschen zögern.
2. Nach dem Rennen fragen: „Wer hat gewonnen? Wer trinkt wie viel?“ – muss ohne Blick aufs Ergebnis-Detail beantwortbar sein.
3. Nach 5 Rennen fragen: „Auf welches Pferd würdest du jetzt setzen und warum?“ – jede Antwort außer „egal / Bauchgefühl / Farbe“ ist ein Warnsignal für wahrgenommene Muster (dann Rennhistorie-Anzeige prüfen).
4. Notizen in `PROGRESS.md` unter „Playtest“; jeder Punkt wird zu einem Task oder einer bewussten Entscheidung.
