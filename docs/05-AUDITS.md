# SPRENGMEISTER — Audits

> Aufbau wie bei Drinkshot/Tresor: automatische Checks führt Claude Code selbst aus und schreibt den Report nach `docs/PROGRESS.md` (Vorlage unten); manuelle Checks als "⏳ manuell" markieren und Luka am Ende auflisten. Bestanden = alle **MUSS** grün; max. 3 offene **SOLL**.

## Standing Audit (jeder Commit, CI)

`typecheck` · `lint` (Warnings ≤ 5) · `test:unit` · keine `console.error` im E2E · kein hardcodierter UI-Text · Bundle-Delta ≤ +10 % ohne Begründung · **kein Screen referenziert `board.mines`** (Test).

---

## A0 — Setup- & Board-Logik-Audit

| Check | Typ |
|---|---|
| Struktur nach Architektur §2; `rules.ts` enthält GDD-Werte (5×5 ≤ 5 Spieler, 6×6 ab 6; 2 Minen; 2 Schlücke/Mine; Tokens 4/6; Hints 1/2; Modi-Parameter) | MUSS |
| `board.test.ts`: alle `kind`-Fälle inkl. Stapel, Greed, Greed+Stapel, eigene Mine stumm, Dud, Nachtgräber-Hint 'none' | MUSS |
| `publicView.test.ts`: eigene aufgegrabene Mine ≡ leeres Feld (strukturell identisch bis auf `critter`); nie ungeöffnete Minen/Kisten im View | MUSS |
| Kiste kann auf verminter Zelle liegen (Test erzwingt es per Seed) | MUSS |
| Kettenreaktion öffnet genau die 8 Nachbarn mit Minen, niemand trinkt, Leger sichtbar | MUSS |
| Payout: 2 × fremde Minen; Token je Leger; Finder 4/6; Zwei Kisten 2/3; Sprengmeister-Bonus beide Fälle | MUSS |
| Turn: Startspieler rotiert; Timer-Fallback wählt geschlossene Zelle mit `crypto` | MUSS |
| Property-Test 10 000 Runden: endet immer, keine negativen Schlücke, Token-Summe stimmt | MUSS |
| `Math.random` in `src/core/` → 0 Treffer; Kiste nur über `crypto` | MUSS |
| FSM-Branch-Coverage 100 %, `core/` ≥ 95 % | MUSS |
| Titel auf Handy; PWA installierbar; CI grün | MUSS (teils manuell) |

## A1 — UX-/Flow-Audit

| Check | Typ |
|---|---|
| E2E-Szenarien aus M1.7 grün (iPhone 12 + Pixel 5 Emulation) | MUSS |
| Place: Limit erzwungen, Toggle funktioniert, kein Ergebnis vorheriger Spieler sichtbar, Bedenkzeit-Fallback | MUSS |
| Dig: nur geschlossene Platten tippbar; Board gesperrt während Banner; Turn-Banner zeigt korrekten Spieler; Rundenende bei Kiste | MUSS |
| Eigene Mine sieht im Dig-Grid exakt wie leer aus (Screenshot-Vergleich im E2E) | MUSS |
| Distribute: Iteration über alle Token-Besitzer in korrekter Reihenfolge; nicht an sich selbst; Summe stimmt | MUSS |
| Replay zeigt alle Minen mit Legerfarbe, auch nicht ausgelöste | MUSS |
| Statistik nach 5 Testrunden korrekt (Test) | MUSS |
| Unbeteiligte Person versteht jeden Screen ohne Erklärung | MUSS (manuell) |
| Grid-Touch-Ziele ≥ 56 px, Abstand ≥ 6 px, kein Doppeltap-Zoom | MUSS |
| Safe-Areas, Reload-Persistenz, Back-Dialog | SOLL |

## A2 — Render-/Interaktions-/Performance-Audit + Look-Check

| Check | Typ |
|---|---|
| 6 × 6 + 8 Digger 60 s: p50 ≤ 16.7 ms, p95 ≤ 33 ms auf Referenzgerät | MUSS |
| Draw-Batches ≤ 3; Heap flach 30 s | MUSS |
| Tap-Zuverlässigkeit: 50 E2E-Taps auf zufällige Platten → 50 korrekte `tileTap`-Events (Touch-Emulation) | MUSS |
| Canvas-Umhängen Place → Dig → Result ohne Neuinitialisierung (kein zweites `PIXI.Application`) | MUSS |
| Look-Check gegen Art Direction §1/§4.1/§5/§6 (Screenshots `docs/screens/m2-*`): Platten-3D-Kante, Helm in Spielerfarbe, Wiese/Zaun/Baum, Temperatur-Icons auf hellem Kreis vs. Farbringe unterscheidbar | MUSS (manuell) |
| Alle 8 Farben als Ringe über Kratern unterscheidbar (Deuteranopie-Simulation, Symbole vorhanden) | MUSS |
| Anticipation ~ 900 ms: Laufen, 3 Stöße, Zittern — "Jenga-Sekunde" spürbar | MUSS (manuell) |
| ColorRing ≤ 300 ms nach Explosions-Frame (Timeline-Label-Test) | MUSS |
| Preload während LOBBY, Low-Effects bei Throttle 6× | SOLL |

## A3 — Sequenzen-Teil-1- & Korrektheits-Audit

| Check | Typ |
|---|---|
| Registry: alle Empty/Dud/Treasure-IDs registriert, Dev-Preview zeigt sie | MUSS |
| `dig_own_mine_silent` nutzt exakt dieselben Sequenz-IDs, Sounds und Timings wie leer (Test) | MUSS |
| Temperatur-Reaktionen des Diggers korrekt je Hint | MUSS |
| Kettenreaktions-Welle: Reihenfolge, Ringe, kein Banner | MUSS |
| Treasure-Sequenzen ≤ 5 s, Greed zeigt Explosion + angesengte Kiste, beide Konsequenzen im Banner | MUSS |
| 1 000 simulierte Runden: angezeigte Zustände == `publicView` | MUSS |
| Perf-Test grün; Filter nur temporär | MUSS |
| Stumm voll spielbar; Sound-Sync ± 50 ms | MUSS |
| Wake-Lock aktiv; Tab-Wechsel Pause/Resume | SOLL |

## A4 — Hit-Sequenzen-Qualitäts-Audit

Pro Hit-Sequenz (8) eine Zeile in PROGRESS.md:

| Kriterium | Typ |
|---|---|
| In 1 s lesbar: wer trinkt, wie viel, wer war's | MUSS |
| Anticipation, Squash & Stretch, Overshoot, Hit-Stop, Follow-Through, Sound-Sync | MUSS |
| ColorRing ≤ 300 ms nach Explosion; Drink-Banner parallel | MUSS |
| Dauer ≤ 3.5 s (Test); Digger endet rußig auf der Bank; Reset-Invariante | MUSS |
| ≤ 2 Long-Tasks | MUSS |
| "Lustig-Test": ≥ 2 von 3 grinsen | SOLL (manuell) |

Gesamt: `hit_chain_dance` nur bei Stapel ≥ 2, `hit_dud_then_boom` nie im Doppelagent-Modus (Tests); No-Repeat 3 über 1 000 Runden; Video `docs/screens/m4-hits.mp4` (SOLL).

## A5 — Polish-, Accessibility- & Bundle-Audit

Lighthouse Mobile Perf/A11y/Best Practices ≥ 90, PWA installierbar · JS ≤ 450 KB gzip, Board-Chunk lazy · Kontrast ≥ 4.5:1 · Reduced-Motion (kein Shake, Welle → Fade) · Tastatur (SOLL) · EN vollständig · alle Modus-Kombinationen spielbar (Doppelagent + Kettenreaktion, Nachtgräber + Zwei Kisten) · Title-Loop 10 min ohne Leak · Share-Text · Fehlerfälle.

## A6 — Release-Audit (Playtest-Protokoll)

**Setup:** 4–6 Personen, 1 Handy, ≥ 8 Runden, davon 2 Doppelagent, 2 Kettenreaktion.

| Beobachtung | Ziel |
|---|---|
| Zeit bis erste Explosion | ≤ 90 s |
| "DU warst das?!"-Moment (Schuldiger wird angesprochen) | ≥ 6 von 8 Runden |
| Lachen bei Hit-Sequenz | ≥ 5 von 8 |
| Replay am Rundenende löst Gespräch aus ("da lag deine Mine!") | ≥ 4 von 8 |
| Jemand nutzt bewusst eigene Minen als Trittsteine und wird dafür "gelesen" | ≥ 1 |
| Balancing: Grabungen pro Runde | 4–8 im Median; Explosionen pro Runde 1–3 |
| Preis-der-Gier-Rate | 5–15 % der Runden |
| "Nochmal spielen?" / "War es fair?" | ≥ 80 % Ja |
| "Was war verwirrend?" → Top-5 | erhoben |
| Abstürze / Ruckler / Sound-Aussetzer / Fehl-Taps | 0 / ≤ 1 / 0 / ≤ 1 |
| Gerätematrix, PWA, Live-URL, README, CHANGELOG, Tag | grün |

## Audit-Report-Vorlage

```md
## Audit A{n} — {Datum}
**Ergebnis:** BESTANDEN / NICHT BESTANDEN
| Check | Status | Notiz |
|---|---|---|
| … | ✅ / ❌ / ⏳ manuell | … |
**Offene SOLL-Follow-ups:** (max. 3)
**Manuelle Checks für Luka vor M{n+1}:**
- [ ] …
```
