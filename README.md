# 💣 Sprengmeister

Ein Mobile-First Pass-the-Phone-Trinkspiel für 3–8 Personen: Schatzsuche auf einem Feld voller Minen, die deine Freunde heimlich gelegt haben. Jeder vergräbt zwei Minen, dann wird reihum gegraben. Wurm, Hinweis, Bierkiste — oder BUMM, und die Farbe des Minenlegers leuchtet über dem Krater. Die eigenen Minen sind harmlos: Du kennst zwei sichere Felder, die sonst niemand kennt.

Schwesterprojekt von [Drinkshot](https://github.com/lukabpunkt/Drinkshot) und [Der Tresor](https://github.com/lukabpunkt/Tresor) — gleicher Stack, gleiche Design-Sprache, gleiche Charaktere.

**Status:** M1 abgeschlossen (`v0.1.0`) — **ab hier auf einer Party spielbar.** Der komplette Flow von der Lobby bis zum Result läuft: Minen legen, graben, Explosionen mit Kill-Feed, Tokens verteilen, Feld-Replay, Session-Statistik. Das Feld ist noch ein DOM-Grid; PixiJS, Diggers und die Slapstick-Sequenzen kommen in M2–M4.

## Loslegen

```bash
npm install
npm run dev            # Vite --host, öffnet auf dem Handy im gleichen WLAN
```

## Befehle

| Befehl                                  | Was es tut                                     |
| --------------------------------------- | ---------------------------------------------- |
| `npm run dev`                           | Dev-Server mit `--host`                        |
| `npm run build` · `preview`             | Produktions-Build · lokal ansehen              |
| `npm run typecheck` · `lint` · `format` | TypeScript strict · ESLint · Prettier          |
| `npm test`                              | typecheck + lint + Unit-Tests                  |
| `npm run test:unit` · `test:coverage`   | Vitest · mit Coverage-Schwellen                |
| `npm run test:e2e` · `test:perf`        | Playwright (iPhone 12 + Pixel 5) · Performance |
| `npm run build:icons`                   | PWA-Icons aus `assets-src/svg/favicon.svg`     |
| `npm run build:atlas` · `build:audio`   | Sprite-Atlas · Audio-Sprite (ab M2/M3)         |
| `npm run preview:sequences`             | Sequenz-Preview (`?dev=1`), ab M3              |

## Aufbau

```
src/
├─ config/     Tokens, Regeln, Choreografie — alle Zahlen und Farben stehen hier
├─ core/       Reine Spiellogik: board · payout · modes · turn · fsm · session · simulate
├─ ui/         Router, Komponenten, Screens (ab M1)
├─ game/       PIXI-Feld, Diggers, DigDirector, Sequenzen (ab M2)
├─ i18n/       DE · EN
└─ styles/     Tokens als CSS-Variablen, Basis-Layout
```

### Die zwei Regeln, die das Projekt tragen

1. **Die Logik ist rein.** `core/board.ts#dig` entscheidet pro Tap genau einmal, ohne Seiteneffekte; der `DigDirector` (ab M2) inszeniert das Ergebnis nur noch. Die Kiste fällt ausschließlich über `crypto.getRandomValues` — `Math.random` ist in `src/core/` per ESLint verboten.
2. **Informationssicherheit ist Gameplay.** Eine aufgegrabene eigene Mine ist von einem leeren Feld nicht zu unterscheiden — in Daten, Bild und Ton. Screens erreichen das private Board gar nicht erst: Es gibt genau drei Ausgänge (`fsm.view()`, `placeViewFor()`, `replay()`), und `.board` ist außerhalb von `core/` per ESLint, Unit-Test und CI-Job verboten. Ebenso abgesichert: Der Test-Seed `?seed=`, mit dem die E2E-Tests die Kistenposition steuern, darf im Deploy-Build nicht existieren (ADR-11).

## Planung

| Dokument                                                                          | Inhalt                                                                                |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                                                          | Arbeitsanweisungen für Claude Code                                                    |
| [`docs/01-GDD.md`](docs/01-GDD.md)                                                | Game Design Document — Regeln, Feld, Grabphase, Hinweise, Auszahlung, Modi, Sequenzen |
| [`docs/02-ART-DIRECTION.md`](docs/02-ART-DIRECTION.md)                            | Art Direction — Wiesen-Slapstick, Tokens, Platten, Diggers, Feld                      |
| [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md)                              | Architektur — Stack, Struktur, FSM, Datenmodell, Board-Spezifikation, DigDirector     |
| [`docs/04-ROADMAP.md`](docs/04-ROADMAP.md)                                        | Meilensteine M0–M6                                                                    |
| [`docs/05-AUDITS.md`](docs/05-AUDITS.md)                                          | Audits A0–A6                                                                          |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md) | Fortschritt · ADR-Log                                                                 |

## Stack

Vite 6 · TypeScript 5 strict · PixiJS v8 · GSAP 3 · howler.js · vite-plugin-pwa · Vitest · Playwright

Kein Backend, keine Analytics, keine externen Requests.

## Deploy

GitHub Pages unter `/Sprengmeister/` (`.github/workflows/deploy.yml`). Ein Host, der aus dem Root serviert, baut mit `SPRENGMEISTER_BASE=/`.
