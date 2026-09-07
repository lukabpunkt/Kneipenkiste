# CLAUDE.md – Einstiegspunkt für Claude Code

Du bist der Entwickler des Webgames **„Pferderennen“** – ein Trinkspiel-Pferderennen für den Browser.
Dieser Ordner enthält den **kompletten Projektplan**. Lies ihn in der unten angegebenen Reihenfolge, bevor du Code schreibst.

## Projekt auf einen Blick

|                |                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------- |
| **Was**        | Browser-Trinkspiel: 6 Pferde rennen, Spieler setzen Schlücke, Gewinner verteilt, Verlierer trinken. |
| **Stack**      | Vanilla JavaScript (ES Modules), HTML5 Canvas 2D, CSS. **Kein Framework, kein Bundler.**            |
| **Spielmodus** | Ein Gerät (Handy/Laptop/TV), alle schauen gemeinsam zu. Kein Backend.                               |
| **Hosting**    | GitHub Pages aus dem Repo `https://github.com/lukabpunkt/Pferderennen`                              |
| **Sprache**    | UI-Texte: Deutsch (Du-Form, locker). Code, Kommentare, Commits: Englisch.                           |
| **Zielgeräte** | Mobile Portrait (Handy wird herumgereicht) **und** Desktop/TV-Landscape.                            |

## Lesereihenfolge

1. `docs/01_GAME_DESIGN.md` – Spielregeln, Pferde, Ablauf, Event-Katalog, Bonus-Ideen
2. `docs/02_ARCHITECTURE.md` – Dateistruktur, Module, State Machine, Datenmodell
3. `docs/03_RACE_ENGINE.md` – Rennsimulation, Zufall & Fairness (**das Herzstück**)
4. `docs/04_DESIGN_SYSTEM.md` – Farben, Typografie, Animation, Screens, Effekte
5. `docs/05_MILESTONES.md` – Der Arbeitsplan: Meilensteine M0–M9 mit Tasks & Definition of Done
6. `docs/06_QA_AUDITS.md` – Audit-Checklisten, die am Ende jedes Meilensteins abgearbeitet werden
7. `docs/07_DEPLOYMENT.md` – Git-Workflow, GitHub Pages, CI
8. `PROGRESS.md` – **Dein Fortschritts-Tracker.** Hier hakst du ab, was erledigt ist.

## So arbeitest du

1. **Öffne `PROGRESS.md`** und finde den ersten nicht abgehakten Meilenstein.
2. **Lies den Meilenstein in `docs/05_MILESTONES.md`** vollständig (Ziel, Tasks, Definition of Done, Audit).
3. **Setze die Tasks in der angegebenen Reihenfolge um.** Ein Task = ein oder mehrere kleine Commits.
4. **Führe am Ende des Meilensteins das zugehörige Audit aus `docs/06_QA_AUDITS.md` durch.** Notiere das Ergebnis in `PROGRESS.md`. Ein Meilenstein ist erst fertig, wenn das Audit bestanden ist.
5. **Hake den Meilenstein in `PROGRESS.md` ab**, committe mit `chore: complete M<n>` und pushe.
6. Beginne den nächsten Meilenstein. Wenn du unterbrochen wirst, sorgt `PROGRESS.md` dafür, dass du nahtlos weitermachen kannst.

Arbeite **einen Meilenstein pro Session** ab, außer der Nutzer sagt ausdrücklich „weiter“. Nach jedem Meilenstein: kurze Zusammenfassung, was gebaut wurde, was der Nutzer im Browser testen soll, und was als Nächstes kommt.

## Unverhandelbare Regeln

### Fairness (höchste Priorität)

- **Jedes Pferd hat exakt die gleiche Gewinnwahrscheinlichkeit (1/6).** Es gibt **keine** pferdespezifischen Stats (kein „Speed“, „Stamina“, „Glück“ pro Pferd). Name, Farbe und Aussehen sind rein kosmetisch.
- Die Bahn (Lane 1–6) darf **keinen** Einfluss auf das Ergebnis haben.
- Events (Bananenschale etc.) treffen jedes Pferd mit identischer Wahrscheinlichkeit.
- Nichts, was der Spieler tut (tippen, wischen, Einsatzhöhe, Anzahl Wetten), darf das Ergebnis beeinflussen.
- Die Fairness wird **statistisch bewiesen**: `npm run audit:fairness` simuliert ≥ 100.000 Rennen headless und prüft die Verteilung (siehe `docs/03_RACE_ENGINE.md`, Abschnitt „Fairness-Audit“). Dieser Test muss bei jedem Meilenstein ab M2 grün sein.

### Spannung

- Der Sieger darf **nicht früh erkennbar** sein. Der Rennverlauf muss Führungswechsel erzeugen; ein Pferd, das lange hinten liegt, muss realistisch noch gewinnen können (Zielwert: der Führende bei 50 % Strecke gewinnt in höchstens ~35 % der Fälle; siehe Engine-Doku).

### Qualität

- **Design ist kein Nice-to-have.** Ruckelige Animationen, hässliche Farben oder unklare UI sind Bugs.
- 60 FPS auf einem drei Jahre alten Mittelklasse-Handy. `requestAnimationFrame` mit fixem Simulations-Timestep, Rendering interpoliert.
- Keine Abhängigkeiten zur Laufzeit (kein CDN im Spiel). Dev-Dependencies (Vitest, Playwright, ESLint, Prettier) sind erlaubt.
- Alles funktioniert **offline nach dem ersten Laden** (kein Fetch zur Laufzeit außer eigener Assets).
- Keine `alert()`/`confirm()`/`prompt()`.

### Code-Konventionen

- ES Modules (`type="module"`), `const`/`let`, keine Klassen-Hierarchien tiefer als 1 Ebene, lieber kleine Funktionen und Plain Objects.
- Jedes Modul hat einen JSDoc-Kopf, der seinen Zweck in 1–3 Sätzen erklärt.
- Simulation (`src/engine/`) ist **vollständig deterministisch bei gegebenem Seed** und hat **keine** Abhängigkeit zu DOM, Canvas oder `Math.random`. Nur so ist sie testbar.
- Rendering (`src/render/`) liest den Simulationszustand, verändert ihn nie.
- Magic Numbers gehören in `src/config.js` mit Kommentar.
- Formatierung: Prettier (Default-Config). Lint: ESLint (`eslint:recommended`). Beides vor jedem Commit ausführen.

### Git

- Branch `main` ist immer deploybar. Feature-Branches `feat/m<n>-<kurzbeschreibung>` sind erlaubt, aber für Solo-Entwicklung ist direktes Committen auf `main` nach bestandenem Audit okay.
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `style:`.
- Commit-Nachrichten auf Englisch. Klein und häufig.

## Was du NICHT tun sollst

- Kein Framework einführen (kein React, Vue, Phaser, PixiJS). Wenn du glaubst, dass etwas nicht ohne geht: erst fragen.
- Keine Features erfinden, die nicht im GDD stehen, **außer** sie stehen im Abschnitt „Bonus-Ideen“ und der aktuelle Meilenstein sieht sie vor.
- Keine Meilensteine überspringen oder zusammenlegen.
- Fairness-Regeln „für mehr Drama“ aufweichen. Drama entsteht durch Varianz, nicht durch Bevorzugung.
- Große Refactorings ohne Anlass.

## Schnellbefehle (ab M0 verfügbar)

```bash
npm install          # Dev-Tools installieren
npm run dev          # Lokaler Server (http://localhost:5173) – kein Bundling, nur Static Serve
npm test             # Unit-Tests (Vitest) für die Engine
npm run audit:fairness   # 100k Headless-Rennen, statistische Prüfung
npm run lint         # ESLint + Prettier Check
npm run format       # Prettier Write
npm run e2e          # Playwright Smoke-Tests (ab M9)
```

## Wenn etwas unklar ist

Entscheide im Zweifel so, wie es dem Ziel „macht am Küchentisch mit sechs angetrunkenen Freunden am meisten Spaß und ist absolut fair“ am besten dient, und notiere die Entscheidung kurz in `PROGRESS.md` unter „Entscheidungen“.
