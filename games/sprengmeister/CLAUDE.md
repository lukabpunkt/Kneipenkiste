# CLAUDE.md — Arbeitsanweisungen für Claude Code

Du entwickelst **Sprengmeister**, ein Mobile-First Pass-the-Phone-Trinkspiel (Schatzsuche auf einem Feld voller Minen, die die Mitspieler heimlich gelegt haben) als Web-App: Vite + TypeScript + PixiJS v8 + GSAP. Schwesterprojekte: **Drinkshot**, **Der Tresor** (gleicher Stack, gleiche Design-Sprache, gleiche Charaktere). Die Planung liegt in `docs/`. **Lies vor jeder Aufgabe:**

1. `docs/01-GDD.md` — Regeln, Feld, Grabphase, Hinweise, Auszahlung, Modi, 16 Sequenzen (Wahrheit für Verhalten)
2. `docs/02-ART-DIRECTION.md` — Wiesen-Slapstick-Look, Tokens, Platten, Diggers, Feld (Wahrheit für Aussehen)
3. `docs/03-ARCHITECTURE.md` — Stack, Struktur, FSM, Datenmodell, Board-Spezifikation, publicView, DigDirector (Wahrheit für Code)
4. `docs/04-ROADMAP.md` — Meilensteine M0–M6
5. `docs/05-AUDITS.md` — Audits
6. `docs/PROGRESS.md` — Stand (du pflegst diese Datei)

## Arbeitsregeln

- **Ein Meilenstein pro Auftrag.** Schritte der Reihe nach, DoD, Audit, Report nach `docs/PROGRESS.md`. Manuelle Checks als "⏳ manuell" markieren und Luka auflisten.
- **Design-Prioritäten:** 1. Jeder Tap ist ein Nervenmoment, 2. Der Schuldige ist immer sichtbar, 3. Slapstick, 4. Lesbarkeit des Feldes, 5. Zero Friction. Bei Zielkonflikten in dieser Reihenfolge.
- **Mobile First** (390 × 844), Desktop = Portrait-Frame. Das Feld muss mit einer Hand tippbar sein, während das Handy auf dem Tisch liegt (Platten ≥ 56 px).
- **Logik ist rein.** `core/board.ts` (`dig`) entscheidet pro Tap genau einmal; `DigDirector` inszeniert nur. Kiste nur mit `crypto.getRandomValues`. `Math.random` in `src/core/` verboten.
- **Informationssicherheit ist Gameplay:** Screens bekommen ausschließlich `publicView`. Eine aufgegrabene eigene Mine muss von einem leeren Feld in Daten, Bild und Ton **ununterscheidbar** sein. Kein Screen referenziert `board.mines` (Lint-Test).
- **Der Schuldige zuerst:** Bei jeder Explosion erscheint der Farbring der Leger ≤ 300 ms nach dem Explosions-Frame — vor jedem Gag.
- **Performance nicht verhandelbar:** ein PIXI-Singleton, Canvas wird zwischen Screens umgehängt (nie neu erzeugt), Atlanten, Pools, keine Allokationen im Loop, Filter nur temporär, eine Uhr. Menüs sind DOM.
- **Alle Texte über i18n, alle Farben/Timings/Balancing über Tokens** (`config/theme.ts`, `styles/tokens.css`, `config/choreo.ts`, `config/rules.ts`).
- **Sequenzen** implementieren `DigSequence`, bekommen Unit-Test + Dev-Preview, erfüllen die 7 Animationsprinzipien (Art Direction §7) und respektieren Registry-Filter (`minStack`, `excludeInModes`).
- **Assets:** SVG in `assets-src/svg/`, Atlas per `npm run build:atlas`, Shotling-Rig aus Drinkshot kopieren. Cartoon-Bomben, Rauchpilze, Sternchen — nichts, das an echte Landminen erinnert.
- **Kein Backend, keine Analytics, keine externen Requests.**
- **Abweichungen:** 5-Zeilen-ADR in `docs/DECISIONS.md`, Docs anpassen. Nicht blockieren — entscheiden, dokumentieren, weiter.
- **Commits:** Conventional Commits, klein und häufig; Tag pro Meilenstein.
- **Tests:** Vitest für `core/` (Board-Matrix + publicView-Test sind Pflicht), Registry, Sequenzen; Playwright E2E (inkl. Touch-Zuverlässigkeit) + `perf.spec.ts`. CI grün.

## Befehle (nach M0)

```
npm run dev            # Vite --host
npm run build · preview · typecheck · lint
npm run test:unit · test:e2e · test:perf
npm run build:atlas · build:audio
npm run preview:sequences   # App in der Sequenz-Preview (?dev=1)
```

## Referenzgeräte

iPhone 11/12 (Safari), Pixel 4a/5 (Chrome): 60 fps Ziel, 30 fps Minimum (Low-Effects). Sekundär iPad, Desktop Chrome/Firefox/Safari.

## Projekt-Infos

- Repo: https://github.com/lukabpunkt/Sprengmeister · Deploy: GitHub Pages (`base: '/Sprengmeister/'`)
- Docs: Deutsch. Code, Bezeichner, Commits: Englisch.

## Kneipenkiste

Dieses Spiel lebt seit September 2026 im Monorepo [Kneipenkiste](https://github.com/lukabpunkt/Kneipenkiste) unter `games/sprengmeister/`. `npm install` läuft im Root; Befehle von hier aus mit `npm run <script> -w games/sprengmeister`. Deploy und CI kommen aus dem Root (`scripts/build-site.mjs`, `.github/workflows/`), der Base-Pfad wird beim Plattform-Build per Umgebungsvariable gesetzt — die Defaults in diesem Ordner bleiben für lokale Tests bestehen.
