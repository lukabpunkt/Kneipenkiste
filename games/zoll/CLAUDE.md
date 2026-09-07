# CLAUDE.md — Arbeitsanweisungen für Claude Code

Du entwickelst **Der Zoll**, ein Mobile-First Pass-the-Phone-Bluffspiel (Koffer packen, Grenze passieren, nicht auffliegen) als Web-App: Vite + TypeScript + PixiJS v8 + GSAP. Schwesterprojekte: **Drinkshot**, **Der Tresor**, **Sprengmeister** (gleicher Stack, gleiche Design-Sprache, gleiche Charaktere). Die Planung liegt in `docs/`. **Lies vor jeder Aufgabe:**

1. `docs/01-GDD.md` — Rollen, Packen, Hinweis-Modell, Verhör, Kontrolle, Schranke, Auszahlung, Modi, 17 Sequenzen (Wahrheit für Verhalten)
2. `docs/02-ART-DIRECTION.md` — Retro-Flughafen-Look, Tokens, Koffer, Röntgenmonitor, Reisende/Beamter/Waldi (Wahrheit für Aussehen)
3. `docs/03-ARCHITECTURE.md` — Stack, Struktur, FSM, Datenmodell, Regelkern-Spezifikation, publicView, Directors (Wahrheit für Code)
4. `docs/04-ROADMAP.md` — Meilensteine M0–M6
5. `docs/05-AUDITS.md` — Audits
6. `docs/PROGRESS.md` — Stand (du pflegst diese Datei)

## Arbeitsregeln

- **Ein Meilenstein pro Auftrag.** Schritte der Reihe nach, DoD, Audit, Report nach `docs/PROGRESS.md`. Manuelle Checks als "⏳ manuell" markieren und Luka auflisten.
- **Design-Prioritäten:** 1. Das Verhör ist das Spiel, 2. Falsche Sicherheit (Hinweise glaubwürdig, aber unzuverlässig), 3. Skalierbarer Bluff, 4. Der Röntgen-Moment, 5. Look & Performance. Bei Zielkonflikten in dieser Reihenfolge.
- **Mobile First** (390 × 844), Desktop = Portrait-Frame. Hall/Inspect/Gate sind öffentliche Screens mit Handy in der Mitte — nur der Beamte tippt, seine Buttons tragen seine Farbe und sein Symbol. Koffer ≥ 56 px.
- **Logik ist rein.** `core/round.ts` (`inspect`, `generateHints`, `gateOrder`) entscheidet; Directors inszenieren nur. Hinweise, Diplomat, Item-Set nur mit `crypto.getRandomValues`. `Math.random` in `src/core/` verboten.
- **Informationssicherheit ist Gameplay:** Screens bekommen ausschließlich `publicView`. Mengen, `truthful` und die Diplomat-ID sind bis zum Reveal unsichtbar. Kein Screen referenziert `round.packs`, `diplomatId`, `hints[].truthful` (Lint-Test).
- **Scanline ist heilig:** Jede Röntgen-Sequenz baut das Bild zeilenweise auf, stockt bei 50 %, und das Ergebnis ist nie vor 100 % erkennbar (Label-Test `revealed ≥ scanComplete`). Reihenfolge: Gesicht des Reisenden → Alarm/Stempel → Banner.
- **Hinweise sind eindeutig, ihre Bedeutung nicht:** Nach der Animation sehen Koffer mit und ohne Hinweis bis auf das kleine Icon identisch aus.
- **Performance nicht verhandelbar:** ein PIXI-Singleton, Canvas zwischen Screens umhängen, Atlanten, Pools, keine Allokationen im Loop, Bloom/Scanline-Filter nur während des Scans, eine Uhr. Menüs und HUD sind DOM.
- **Alle Texte über i18n, alle Farben/Timings/Balancing über Tokens** (`config/theme.ts`, `styles/tokens.css`, `config/choreo.ts`, `config/rules.ts`).
- **Sequenzen** implementieren `Sequence`, bekommen Unit-Test + Dev-Preview, erfüllen die 7 Animationsprinzipien (Art Direction §7).
- **Assets:** SVG in `assets-src/svg/`, Atlas per `npm run build:atlas`, Shotling-Rig aus Drinkshot kopieren. Schmuggelware ist immer albern (Enten, Käse, Gartenzwerge) — nie reale Drogen-/Waffen-Anspielungen.
- **Kein Backend, keine Analytics, keine externen Requests.**
- **Abweichungen:** 5-Zeilen-ADR in `docs/DECISIONS.md`, Docs anpassen. Nicht blockieren — entscheiden, dokumentieren, weiter.
- **Commits:** Conventional Commits, klein und häufig; Tag pro Meilenstein.
- **Tests:** Vitest für `core/` (Hinweis-Statistik + publicView-Test sind Pflicht), Registry, Sequenzen; Playwright E2E (inkl. Touch-Zuverlässigkeit) + `perf.spec.ts`. CI grün.

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

- Repo: https://github.com/lukabpunkt/Zoll · Deploy: GitHub Pages (`base: '/Zoll/'`)
- Docs: Deutsch. Code, Bezeichner, Commits: Englisch.
