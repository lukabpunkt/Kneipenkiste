# 🔓 Der Tresor

Ein Mobile-First Pass-the-Phone-Trinkspiel über Vertrauen und Verrat für 3–8 Personen. Ein Tresor voller Schlücke, 30 Sekunden Verhandlung, dann entscheidet jeder geheim: **Teilen oder Stehlen**. Teilen alle, trinkt niemand und der Tresor wächst. Stiehlt einer, verteilt er alles. Stehlen mehrere, saufen die Diebe den Tresor unter sich aus.

Schwesterprojekt von [Drinkshot](https://github.com/lukabpunkt/Drinkshot) — gleicher Stack, gleiche Design-Sprache, gleiche Charaktere.

**Status:** M1 fertig (`v0.1.0`) — **ab hier ist es spielbar.** Der komplette Flow von der Lobby bis zum Result läuft; die Aufdeckung ist noch ein DOM-Platzhalter, die PixiJS-Bühne kommt in M2/M3. Aktueller Stand in [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Entwickeln

```bash
npm install
npm run dev            # Vite mit --host, auch vom Handy im WLAN erreichbar
```

| Befehl                                                | Was er tut                                               |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `npm run dev` · `build` · `preview`                   | Entwicklung, Produktions-Build, lokale Vorschau          |
| `npm run typecheck` · `lint` · `format`               | TypeScript strict, ESLint, Prettier                      |
| `npm test`                                            | typecheck + lint + Unit-Tests                            |
| `npm run test:unit` · `test:coverage`                 | Vitest (Schwellen: `core/` ≥ 95 %, `fsm.ts` = 100 %)     |
| `npm run test:e2e` · `test:perf`                      | Playwright auf iPhone 12 (WebKit) und Pixel 5 (Chromium) |
| `npm run build:atlas` · `build:audio` · `build:icons` | Assets aus `assets-src/` bzw. `audio-src/`               |
| `npm run preview:outcomes`                            | Dev-Panel mit den Ergebnis-Inszenierungen (ab M4)        |

## Aufbau

Die Spiellogik ist eine reine Funktion und lebt vollständig in `src/core/`:

| Modul                                           | Verantwortung                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`payout.ts`](src/core/payout.ts)               | `resolveRound()` — entscheidet die Runde. Genau einmal, beim Übergang SEALED → REVEAL. |
| [`vault.ts`](src/core/vault.ts)                 | Tresor-Ökonomie: Wachstum, Deckel, Bankgebühr, Jackpot                                 |
| [`modes.ts`](src/core/modes.ts)                 | Maulwurf (`crypto`), Eid, Nachtschicht                                                 |
| [`choreographer.ts`](src/core/choreographer.ts) | Reveal-Reihenfolge und Timing der Show — Teiler zuerst, Diebe zuletzt                  |
| [`fsm.ts`](src/core/fsm.ts)                     | Zustandsmaschine des Spiels                                                            |
| [`session.ts`](src/core/session.ts)             | Scoreboard, Vertrauens-Index, Verrats-Streak, Persistenz                               |

Die Show (`src/game/`) liest dieses Ergebnis und inszeniert es — sie würfelt nichts.

Darüber liegt die UI: ein Router mit zehn Screens (`src/ui/screens/`) und die Komponenten
(`src/ui/components/`) — Tresor-Widget mit Split-Flap-Zähler, Countdown-Ring,
Entscheidungskarten, Badges mit Eid-Siegel. Menüs sind DOM, nur die Aufdeckung wird
ab M3 eine PixiJS-Bühne.

## Planung

| Dokument                                                                          | Inhalt                                                                                               |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                                                          | Arbeitsanweisungen für Claude Code                                                                   |
| [`docs/01-GDD.md`](docs/01-GDD.md)                                                | Game Design Document — Regeln, Tresor-Ökonomie, Auszahlung, Modi, Reveal-Dramaturgie, Inszenierungen |
| [`docs/02-ART-DIRECTION.md`](docs/02-ART-DIRECTION.md)                            | Art Direction — Heist-Look, Tokens, Crooks, Karten, Bühne                                            |
| [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md)                              | Architektur — Stack, Struktur, FSM, Datenmodell, Payout-Spezifikation                                |
| [`docs/04-ROADMAP.md`](docs/04-ROADMAP.md)                                        | Meilensteine M0–M6                                                                                   |
| [`docs/05-AUDITS.md`](docs/05-AUDITS.md)                                          | Audits A0–A6                                                                                         |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md) | Fortschritt · ADR-Log                                                                                |

## Stack

Vite 6 · TypeScript 5 strict · PixiJS v8 · GSAP 3 · howler.js · vite-plugin-pwa · Vitest · Playwright · GitHub Pages (`base: '/Tresor/'`)

Kein Backend, keine Analytics, keine externen Requests zur Laufzeit.
