# CLAUDE.md — Arbeitsanweisungen für Claude Code

Du entwickelst **Der Tresor**, ein Mobile-First Pass-the-Phone-Trinkspiel über Vertrauen und Verrat (Teilen oder Stehlen) als Web-App: Vite + TypeScript + PixiJS v8 + GSAP. Schwesterprojekt: **Drinkshot** (gleicher Stack, gleiche Design-Sprache, gleiche Charaktere). Die vollständige Planung liegt in `docs/`. **Lies vor jeder Aufgabe:**

1. `docs/01-GDD.md` — Regeln, Tresor-Ökonomie, Auszahlung, Modi, Reveal-Dramaturgie, 13 Inszenierungen (Wahrheit für Verhalten)
2. `docs/02-ART-DIRECTION.md` — Heist-Look, Tokens, Crooks, Karten, Bühne (Wahrheit für Aussehen)
3. `docs/03-ARCHITECTURE.md` — Stack, Ordnerstruktur, FSM, Datenmodell, Payout-Spezifikation, Interfaces (Wahrheit für Code)
4. `docs/04-ROADMAP.md` — Meilensteine M0–M6 mit Schritten und Definition of Done
5. `docs/05-AUDITS.md` — Audit-Checklisten
6. `docs/PROGRESS.md` — aktueller Stand (du pflegst diese Datei)

## Arbeitsregeln

- **Ein Meilenstein pro Auftrag.** Schritte der Reihe nach, DoD einhalten, Audit ausführen, Report nach `docs/PROGRESS.md` (Vorlage in `05-AUDITS.md`). Manuelle Checks als "⏳ manuell" markieren und Luka am Ende auflisten.
- **Design-Prioritäten:** 1. Der Verrat muss weh tun und lustig sein, 2. Die Verhandlung ist das Spiel, 3. Eskalation, 4. Zero Friction, 5. Look & Performance. Bei Zielkonflikten in dieser Reihenfolge.
- **Mobile First** (390 × 844 zuerst), Desktop = Portrait-Frame.
- **Logik ist eine reine Funktion.** `core/payout.ts` (`resolveRound`) entscheidet alles, genau einmal beim Übergang SEALED→REVEAL. Die Show (`choreographer.ts`, `RevealDirector`) inszeniert nur. Maulwurf-Zuweisung nur mit `crypto.getRandomValues`. `Math.random` ist in `src/core/` verboten.
- **Reveal-Reihenfolge ist Gesetz:** Teiler zuerst, Diebe zuletzt, Maulwurf als letzter Dieb. Letzte Karte 160 % Verweildauer, 2 Stalls, Slow-Mo. Tap-to-Skip nie bei letzter Karte oder Outcome.
- **Performance nicht verhandelbar:** PIXI-Singleton nur für REVEAL, Atlanten, Pools, keine Allokationen im Loop, Filter nur temporär, eine Uhr (PIXI-Ticker treibt GSAP). Menüs sind DOM.
- **Alle Texte über i18n**, **alle Farben/Timings über Tokens** (`config/theme.ts`, `styles/tokens.css`, `config/choreo.ts`, `config/rules.ts`). Balancing-Werte nur in `rules.ts`.
- **Inszenierungen** implementieren `OutcomeSequence`/`OverlaySequence`, bekommen Unit-Test + Dev-Preview, erfüllen alle 7 Animationsprinzipien (Art Direction §7) und enden mit dem Trinker-Zähler-Moment.
- **Assets:** SVG in `assets-src/svg/`, Atlas per `npm run build:atlas`. Shotling-Rig aus Drinkshot wiederverwenden (kopieren). Dicke Outlines, Chibi, Cel-Shading, Heist-Stimmung.
- **Kein Backend, keine Analytics, keine externen Requests** zur Laufzeit.
- **Abweichungen** vom Plan: 5-Zeilen-ADR in `docs/DECISIONS.md`, Docs anpassen. Fragen nicht blockieren lassen — entscheiden, dokumentieren, weitermachen.
- **Commits:** Conventional Commits, klein und häufig; Tag pro Meilenstein.
- **Tests:** Vitest für `core/` (Payout-Matrix ist Pflicht), Choreographer, Outcomes; Playwright E2E + `perf.spec.ts`. CI grün.

## Befehle (nach M0)

```
npm run dev            # Vite --host
npm run build · preview · typecheck · lint
npm run test:unit · test:e2e · test:perf
npm run build:atlas · build:audio
npm run preview:outcomes   # App in der Outcome-Preview (?dev=1)
```

## Referenzgeräte

iPhone 11/12 (Safari), Pixel 4a/5 (Chrome): 60 fps Ziel, 30 fps Minimum (Low-Effects). Sekundär iPad, Desktop Chrome/Firefox/Safari.

## Projekt-Infos

- Repo: https://github.com/lukabpunkt/Tresor · Deploy: GitHub Pages (`base: '/Tresor/'`)
- Docs: Deutsch. Code, Bezeichner, Commits: Englisch.

## Kneipenkiste

Dieses Spiel lebt seit September 2026 im Monorepo [Kneipenkiste](https://github.com/lukabpunkt/Kneipenkiste) unter `games/tresor/`. `npm install` läuft im Root; Befehle von hier aus mit `npm run <script> -w games/tresor`. Deploy und CI kommen aus dem Root (`scripts/build-site.mjs`, `.github/workflows/`), der Base-Pfad wird beim Plattform-Build per Umgebungsvariable gesetzt — die Defaults in diesem Ordner bleiben für lokale Tests bestehen.
