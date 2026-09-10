# CLAUDE.md — Arbeitsanweisungen für Claude Code

Du entwickelst **Die Hängebrücke**, ein Mobile-First Pass-the-Phone-Trinkspiel über Anti-Koordination (jeder wählt geheim einen Balken; wer allein steht, ist sicher; wer sich einen Balken teilt, fällt) als Web-App: Vite + TypeScript + PixiJS v8 + GSAP. Schwesterprojekte: **Drinkshot**, **Der Tresor**, **Sprengmeister**, **Der Zoll** (gleicher Stack, gleiche Design-Sprache, gleiche Charaktere). Die Planung liegt in `docs/`. **Lies vor jeder Aufgabe:**

1. `docs/01-GDD.md` — Brücke, Absprache, Wahl, Auszahlung, Schrumpfen/Reparatur/Todeszone, Modi, 14 Inszenierungen (Wahrheit für Verhalten)
2. `docs/02-ART-DIRECTION.md` — Canyon-Abenteuer-Look, Tokens, Brücke-von-oben-SVG, Hikers, Gustav, Balthasar (Wahrheit für Aussehen)
3. `docs/03-ARCHITECTURE.md` — Stack, Struktur, FSM, Datenmodell, Regelkern, Choreographer, StepDirector (Wahrheit für Code)
4. `docs/04-ROADMAP.md` — Meilensteine M0–M6
5. `docs/05-AUDITS.md` — Audits
6. `docs/PROGRESS.md` — Stand (du pflegst diese Datei)

## Arbeitsregeln

- **Ein Meilenstein pro Auftrag.** Schritte der Reihe nach, DoD, Audit, Report nach `docs/PROGRESS.md`. Manuelle Checks als "⏳ manuell" markieren und Luka auflisten.
- **Design-Prioritäten:** 1. Der gleichzeitige Schritt, 2. Versprechen sind wertlos, aber verführerisch, 3. Die Brücke schrumpft, 4. Zero Friction, 5. Look & Performance. Bei Zielkonflikten in dieser Reihenfolge.
- **Mobile First** (390 × 844), Desktop = Portrait-Frame. Balken-Buttons ≥ 56 px (≥ 48 bei 10 Balken).
- **Logik ist rein.** `resolveRound()` (`core/round.ts` + `core/payout.ts`) entscheidet genau einmal bei SEALED→STEP; `choreographer.ts` und `StepDirector` inszenieren nur. Morscher Balken und Schrumpf-Balken nur mit `crypto.getRandomValues`. `Math.random` in `src/core/` verboten.
- **Privatsphäre:** Screens bekommen `publicView`; fremde Wahlen und der morsche Balken sind bis zum Schritt unsichtbar (Lint-Test).
- **Signatur der Show — nicht verhandelbar:** Alle Hikers kommen im selben Frame an (gemeinsamer Hit-Stop). Jeder besetzte Balken knarrt (sichere mit 70 % Amplitude). Kollisions-Hikers haben immer Blickkontakt in Slow-Mo mit "Oh."-Sprechblase, bevor der Balken bricht. Jeder Gestürzte klettert wieder hoch.
- **Performance nicht verhandelbar:** ein PIXI-Singleton nur für STEP, Menüs + Brücke-von-oben sind DOM/SVG, Atlanten, Pools, keine Allokationen im Loop, Seile gecached, eine Uhr.
- **Alle Texte über i18n, alle Farben/Timings/Balancing über Tokens** (`config/theme.ts`, `styles/tokens.css`, `config/choreo.ts`, `config/rules.ts`).
- **Sequenzen** implementieren `Sequence`, bekommen Unit-Test + Dev-Preview, erfüllen die 7 Animationsprinzipien (Art Direction §7); Fall-Sequenzen tragen die Labels `eyeContact` < `snap` < `climbedBack`.
- **Assets:** SVG in `assets-src/svg/`, Atlas per `npm run build:atlas`, Shotling-Rig aus Drinkshot kopieren. Cartoon-Abenteuer: Wasser, Wippe, Geier — nie realistische Abstürze.
- **Kein Backend, keine Analytics, keine externen Requests.**
- **Abweichungen:** 5-Zeilen-ADR in `docs/DECISIONS.md`, Docs anpassen. Nicht blockieren — entscheiden, dokumentieren, weiter.
- **Commits:** Conventional Commits, klein und häufig; Tag pro Meilenstein.
- **Tests:** Vitest für `core/` (Partitionen-Matrix + Pigeonhole + publicView sind Pflicht), Choreographer, Registry, Sequenzen; Playwright E2E + `perf.spec.ts`. CI grün.

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

- Repo: https://github.com/lukabpunkt/Haengebruecke (Name ohne Umlaut, damit URL und `base` sauber sind) · Deploy: GitHub Pages (`base: '/Haengebruecke/'`)
- Lokaler Ordner: /Users/lukabloemendal/Documents/Hängebrücke
- Docs: Deutsch. Code, Bezeichner, Commits: Englisch.
