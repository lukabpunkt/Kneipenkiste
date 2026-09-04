# 🔓 Der Tresor

Ein Mobile-First Pass-the-Phone-Trinkspiel über Vertrauen und Verrat für 3–8 Personen. Ein Tresor voller Schlücke, 30 Sekunden Verhandlung, dann entscheidet jeder geheim: **Teilen oder Stehlen**. Teilen alle, trinkt niemand und der Tresor wächst. Stiehlt einer, verteilt er alles. Stehlen mehrere, saufen die Diebe den Tresor unter sich aus.

Schwesterprojekt von [Drinkshot](https://github.com/lukabpunkt/Drinkshot) — gleicher Stack, gleiche Design-Sprache, gleiche Charaktere.

**Status:** Planung abgeschlossen → Entwicklung mit Claude Code startet bei Milestone M0.

## Planung

| Dokument | Inhalt |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Arbeitsanweisungen für Claude Code |
| [`docs/01-GDD.md`](docs/01-GDD.md) | Game Design Document — Regeln, Tresor-Ökonomie, Auszahlung, Modi, Reveal-Dramaturgie, Inszenierungen |
| [`docs/02-ART-DIRECTION.md`](docs/02-ART-DIRECTION.md) | Art Direction — Heist-Look, Tokens, Crooks, Karten, Bühne |
| [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md) | Architektur — Stack, Struktur, FSM, Datenmodell, Payout-Spezifikation |
| [`docs/04-ROADMAP.md`](docs/04-ROADMAP.md) | Meilensteine M0–M6 |
| [`docs/05-AUDITS.md`](docs/05-AUDITS.md) | Audits A0–A6 |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md) | Fortschritt · ADR-Log |

## Stack

Vite 6 · TypeScript · PixiJS v8 · GSAP 3 · howler.js · vite-plugin-pwa · Vitest · Playwright

## Loslegen

```
cd /Users/lukabloemendal/Documents/Tresor
claude
> Lies CLAUDE.md und docs/. Setze Milestone M0 aus docs/04-ROADMAP.md vollständig um, führe danach Audit A0 aus docs/05-AUDITS.md durch und schreibe den Report nach docs/PROGRESS.md.
```
