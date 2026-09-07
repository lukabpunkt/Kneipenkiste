# DER ZOLL — Audits

> Aufbau wie bei den Schwesterspielen: automatische Checks führt Claude Code selbst aus und schreibt den Report nach `docs/PROGRESS.md` (Vorlage unten); manuelle Checks als "⏳ manuell" markieren und Luka am Ende auflisten. Bestanden = alle **MUSS** grün; max. 3 offene **SOLL**.

## Standing Audit (jeder Commit, CI)

`typecheck` · `lint` (Warnings ≤ 5) · `test:unit` · keine `console.error` im E2E · kein hardcodierter UI-Text · Bundle-Delta ≤ +10 % ohne Begründung · **kein Screen referenziert `round.packs`, `diplomatId` oder `hints[].truthful`** (Test).

---

## A0 — Setup- & Regelkern-Audit

| Check | Typ |
|---|---|
| Struktur nach Architektur §2; `rules.ts` enthält GDD-Werte (4–8 Spieler; Menge 0–6; k = 1/2/3; h = ⌊(n−1)/2⌋ in [1,3]; p_true 0.6; 2a / 2 / 3; Boni +2 / +1; Modi) | MUSS |
| `hints.test.ts`: Verschiedenheit; 0-Schmuggler → alle falsch; p_true über 20 000 Runden 0.6 ± 0.03; Typ-Vielfalt; Spürhund verlässlich | MUSS |
| `round.test.ts`: inspect alle Fälle (caught, clean, diplomat, bereits offen → Fehler, bribed → Fehler, Limit → Fehler); gateOrder sauber zuerst; Beamten-Rotation; Beamter wird in PASS übersprungen | MUSS |
| `payout.test.ts`: Trinkwerte, Tokens, Gate-Tokens, Bestechungs-Tokens, Boni beide Fälle, Banner-Logik alle 5 | MUSS |
| `publicView.test.ts`: HALL/INSPECT-View enthält keine Mengen, kein `truthful`, keine Diplomat-ID; Pack-View nur eigenes Pack | MUSS |
| Property-Test 10 000 Runden: Invarianten aus Architektur §5 | MUSS |
| `Math.random` in `src/core/` → 0 Treffer; Hinweise, Diplomat, Item-Set nur über `crypto` | MUSS |
| FSM-Branch-Coverage 100 %, `core/` ≥ 95 % | MUSS |
| Titel auf Handy; PWA installierbar; CI grün | MUSS (teils manuell) |

## A1 — UX-/Flow-Audit

| Check | Typ |
|---|---|
| E2E-Szenarien aus M1.7 grün (iPhone 12 + Pixel 5 Emulation) | MUSS |
| Pack: Stepper 0–6, Risiko-Zeile korrekt (2a / a), kein Ergebnis anderer sichtbar, Bedenkzeit → 0 mit Hinweis | MUSS |
| Hall: Hinweis-Icons an korrekten Koffern, ohne Menge/Truthful; Countdown; "Nochmal ansehen" max 1×; Bestechung annehmen/ablehnen sperrt Koffer | MUSS |
| Inspect: max k Öffnungen; gesperrte/offene Koffer nicht tippbar; "Durchwinken" jederzeit; Banner korrekt | MUSS |
| Gate: Reihenfolge sauber → Schmuggler; Mengen erst hier sichtbar | MUSS |
| Distribute: Reihenfolge Beamter zuerst; nicht an sich selbst; Summe stimmt | MUSS |
| Result: Banner, Koffer-Übersicht, Hinweis-Auflösung ("stimmte/log") korrekt; Statistik nach 5 Testrunden korrekt (Test) | MUSS |
| Unbeteiligte Person versteht jeden Screen ohne Erklärung; erkennt, dass nur der Beamte tippen darf (Farbe/Symbol auf Buttons) | MUSS (manuell) |
| Koffer-Touch-Ziele ≥ 56 px; Safe-Areas; Reload-Persistenz; Back-Dialog | MUSS / SOLL |

## A2 — Render-/Interaktions-/Performance-Audit + Look-Check

| Check | Typ |
|---|---|
| 8 Spieler, HALL 60 s: p50 ≤ 16.7 ms, p95 ≤ 33 ms auf Referenzgerät | MUSS |
| Draw-Batches ≤ 3; Heap flach 30 s; Bloom nur während Scan (`filters === null` sonst) | MUSS |
| Tap-Zuverlässigkeit: 50 E2E-Taps → 50 korrekte `suitcaseTap`; DOM-HUD blockiert keine Koffer-Taps | MUSS |
| Canvas-Umhängen Hall → Inspect → Gate ohne Neuinitialisierung | MUSS |
| Scan-Ergebnis erst ab 100 % (Label-Test); Stall bei 50 % vorhanden | MUSS |
| Look-Check gegen Art Direction §1/§4/§5/§6 (Screenshots `docs/screens/m2-*`): helle Halle, Röntgenmonitor-Look, Koffer in Spielerfarbe mit Anhänger, Beamter erkennbar, Waldi | MUSS (manuell) |
| Alle 8 Farben als Koffer + Anhänger unterscheidbar (Deuteranopie-Simulation, Symbole) | MUSS |
| Layout 3–7 Koffer, 1–2 Reihen Reisende ohne Überlappung | MUSS |
| Preload während LOBBY; Low-Effects bei Throttle 6× | SOLL |

## A3 — Hinweise-, Schranke- & Audio-Audit

| Check | Typ |
|---|---|
| 6 Hinweis-Sequenzen + Bark registriert, Dev-Preview, ≤ 1.8 s | MUSS |
| Nach der Hinweis-Animation sehen Koffer mit/ohne Hinweis bis auf das Icon identisch aus (Screenshot-Diff) | MUSS |
| 4 Schranken-Sequenzen ≤ 3 s; Schmuggler-Stall 600 ms; Skip ab Koffer 2, nie beim letzten | MUSS |
| Bestechungs-Inszenierung korrekt (Schloss, Tokens) | MUSS |
| 1 000 simulierte Runden: angezeigte Zustände == `publicView` je Phase | MUSS |
| Perf-Test grün; Sound-Sync ± 50 ms; stumm voll spielbar | MUSS |
| Hinweis-Test (manuell): 3 Personen sehen 5 Hall-Phasen; ≥ 2 sagen, sie hätten den Hinweisen "eher geglaubt" | SOLL (manuell) |
| Wake-Lock; Tab-Wechsel Pause/Resume | SOLL |

## A4 — Röntgen-Sequenzen-Qualitäts-Audit

Pro Sequenz (6 + Diplomat) eine Zeile in PROGRESS.md:

| Kriterium | Typ |
|---|---|
| In 1 s lesbar: erwischt/sauber, wer trinkt, wie viel | MUSS |
| Scanline-Aufbau + Stall; `revealed` ≥ `scanComplete`; Gesicht → Alarm/Stempel → Banner in dieser Reihenfolge (Labels) | MUSS |
| Anticipation, Squash & Stretch, Overshoot, Hit-Stop, Follow-Through, Sound-Sync | MUSS |
| Dauer ≤ 5 s (Test); Reset-Invariante | MUSS |
| ≤ 2 Long-Tasks | MUSS |
| "Lustig-Test": ≥ 2 von 3 grinsen | SOLL (manuell) |

Gesamt: Diplomat-Overlay ersetzt caught/clean korrekt; No-Repeat 3 über 1 000 Runden; Silhouetten-Layouts aller 8 Item-Sets vorhanden; Filmstreifen `docs/screens/m6-scanline.png` (SOLL; als Video geplant, aber Playwright nimmt den PIXI-Canvas nicht auf).

## A5 — Polish-, Accessibility- & Bundle-Audit

Lighthouse Mobile Perf/A11y/Best Practices ≥ 90, PWA installierbar · JS ≤ 450 KB gzip, Hall-Chunk lazy · Kontrast ≥ 4.5:1 (besonders `ink`-Text auf heller Halle) · Reduced-Motion · Tastatur (SOLL) · EN vollständig · alle Modus-Kombinationen spielbar (Bestechung + Diplomat, Spürhund + Hochsaison) · Title-Loop 10 min ohne Leak · Share-Text · Fehlerfälle.

## A6 — Release-Audit (Playtest-Protokoll)

**Setup:** 5–6 Personen, 1 Handy, ≥ 8 Runden (jeder mindestens einmal Beamter), davon 2 Bestechung, 2 Diplomat.

| Beobachtung | Ziel |
|---|---|
| Zeit bis erstes Röntgen | ≤ 120 s |
| Verhör wird zum Reden genutzt; Beamter stellt Fragen | ≥ 6 von 8 |
| Lachen beim Röntgen | ≥ 6 von 8 |
| Beamter fällt auf einen falschen Hinweis rein (öffnet sauberen Koffer mit Hinweis) | ≥ 2 von 8 |
| Jemand schmuggelt ≥ 5 und kommt durch | ≥ 1 |
| Balancing: Anteil Runden mit ≥ 1 Fang | 40–70 % (sonst p_true / k anpassen) |
| Anteil "Belästigung"-Runden | ≤ 30 % |
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
