# DER TRESOR — Audits

> Aufbau und Regeln wie bei Drinkshot: Claude Code führt die automatischen Checks selbst aus und schreibt den Report nach `docs/PROGRESS.md` (Vorlage unten); manuelle Checks markiert es als "⏳ manuell" und listet sie Luka am Ende auf. Bestanden = alle **MUSS** grün; max. 3 offene **SOLL** als Follow-ups.

## Standing Audit (jeder Commit, CI)

`typecheck` · `lint` (Warnings ≤ 5) · `test:unit` · keine `console.error` im E2E-Flow · kein hardcodierter UI-Text · Bundle-Delta ≤ +10 % ohne Begründung.

---

## A0 — Setup- & Regelkern-Audit

| Check | Typ |
|---|---|
| Struktur entspricht Architektur §2; `rules.ts`/`choreo.ts` enthalten GDD-Werte (V_0 3/4/6, Wachstum +2/+3, Deckel 12/16/20, Gebühr 1, Highroller-Parameter) | MUSS |
| `payout.ts`-Matrix: n 3–8 × k 0–n × Härte × Modi grün; Property-Test 10 000 Runden ohne Invarianten-Verletzung | MUSS |
| Beispiele aus GDD §3.5 als explizite Tests (n=4, V=8: k=1 → verteilt 8; k=2 → je 4; k=4 → je 2; k=0 → je 1 Gebühr, V→10) | MUSS |
| Eid: Alleindieb mit Meineid trinkt 2 und verteilt V−2; Mit-Dieb mit Meineid doppelt | MUSS |
| Maulwurf: immer in `thieves`, halbe Strafe, nie Meineidiger, Zuweisung nutzt `crypto` | MUSS |
| Jackpot: bei V == V_max und k == 0 → jeder ⌈V/n⌉, Reset | MUSS |
| Choreographer: Teiler zuerst, Diebe zuletzt, Maulwurf letzter Dieb, deterministisch, 40-s-Deckel, Stalls `[0.6]` / `[0.6, 0.85]` | MUSS |
| `Math.random` in `src/core/` → 0 Treffer | MUSS |
| FSM-Branch-Coverage 100 %, `core/` ≥ 95 % | MUSS |
| Handy zeigt Titel; PWA installierbar; CI grün | MUSS (teils manuell) |

## A1 — UX-/Flow-Audit

| Check | Typ |
|---|---|
| E2E-Szenarien aus M1.7 grün (Mobile-Emulation iPhone 12 + Pixel 5) | MUSS |
| Auszahlungstabelle im Negotiation-Screen stimmt mit `payout` für k = 0/1/2+/n überein (Test) | MUSS |
| Choice-Screen: Wahl nach Versiegeln nirgends sichtbar; kein Zurück; Bedenkzeit → auto TEILEN mit Hinweis | MUSS |
| Distribute: "Auszahlen" erst bei 0 Rest; Summe == V (bzw. V−2 bei Meineid); alles auf eine Person erlaubt | MUSS |
| Result-Banner je Outcome korrekt; Tresor-Vorschau zeigt `nextVault` | MUSS |
| Statistik: Vertrauens-Index, Streak, Meistbetrogen nach 5 Testrunden korrekt (Test) | MUSS |
| Eine unbeteiligte Person versteht jeden Screen ohne Erklärung | MUSS (manuell) |
| Touch-Ziele ≥ 48 px, Safe-Areas, Reload-Persistenz, Back-Dialog | MUSS / SOLL |
| Countdown letzte 10 s rot, letzte 5 s Tick (stumm: visuell) | SOLL |

## A2 — Render-/Performance-Audit + Look-Check

| Check | Typ |
|---|---|
| 8 Crooks + Raum + Laser 60 s: p50 ≤ 16.7 ms, p95 ≤ 33 ms auf Referenzgerät | MUSS |
| Draw-Batches ≤ 3; Heap flach über 30 s | MUSS |
| Look-Check gegen Art Direction §1/§5/§6 (Screenshots `docs/screens/m2-*`): Masken in Spielerfarbe, Samt/Stahl/Gold-Stimmung, Spotlight, Kassel erkennbar | MUSS (manuell) |
| Alle 8 Farben + Symbole auf dem dunklen Samt unterscheidbar (Deuteranopie-Simulation) | MUSS |
| Halbkreis-Layout bei 3 und bei 8 Spielern ohne Überlappung | MUSS |
| Tresor open/close/grow/drain/burst laufen sauber mit Sound-Hooks | MUSS |
| Preload während NEGOTIATION: kein Nachladen beim Betreten von REVEAL | MUSS |
| Low-Effects greift bei CPU-Throttle 6× | SOLL |

## A3 — Spannungs-, Korrektheits- & Performance-Audit

| Check | Typ |
|---|---|
| 1 000 simulierte Runden: aufgedeckte Karten == `choices`, Reihenfolge == `revealOrder`, Outcome == `result.outcome` | MUSS |
| Timing-Presets ± 1 s; 8 Spieler "Lang" ≤ 40 s | MUSS |
| Tap-to-Skip funktioniert ab Karte 2, nie bei letzter Karte/Outcome | MUSS |
| Alarm nach erstem STEHLEN; Laser rot; letzte Karte mit 2 Stalls + Slow-Mo + Herzschlag | MUSS |
| Perf-Test grün | MUSS |
| Filter nur temporär aktiv | MUSS |
| Spannungs-Test: 3 Personen sehen 5 Reveals mit unbekanntem Ergebnis; ≥ 2 sagen, sie waren bei der letzten Karte angespannt; ≥ 1 hörbare Reaktion bei einem Doppel-Dieb-Twist | MUSS (manuell) |
| Stumm voll spielbar; Sound-Sync Karten-Flip ± 50 ms | MUSS |
| Tab-Wechsel → Pause/Resume ohne Sprung; Wake-Lock aktiv | SOLL |

## A4 — Inszenierungs-Qualitäts-Audit

Pro Sequenz (11 Outcomes + 2 Overlays) eine Zeile in PROGRESS.md:

| Kriterium | Typ |
|---|---|
| In 1 s auf 5,8" lesbar, wer trinkt und warum | MUSS |
| Anticipation, Squash & Stretch, Overshoot, Hit-Stop, Follow-Through, Sound-Sync vorhanden | MUSS |
| Dauer 2–8 s (Test); endet mit Trinker-Zähler-Moment; Reset-Invariante | MUSS |
| Kein Frame-Drop (≤ 2 Long-Tasks) | MUSS |
| "Lustig-Test": ≥ 2 von 3 grinsen | SOLL (manuell) |

Gesamt: alle IDs registriert und in Dev-Preview; No-Repeat 3 pro Typ (Test über 1 000 Runden); Overlays kombinieren korrekt mit jeder Dieb-Sequenz; soloSteal übergibt sauber an DISTRIBUTE; Kassel-Kommentare pro Outcome vorhanden; Video `docs/screens/m4-outcomes.mp4` (SOLL).

## A5 — Polish-, Accessibility- & Bundle-Audit

Lighthouse Mobile Perf/A11y/Best Practices ≥ 90, PWA installierbar · JS ≤ 450 KB gzip, Reveal-Chunk lazy · Kontrast ≥ 4.5:1 · Reduced-Motion · Tastatur-Navigation (SOLL) · EN vollständig · alle Modus-Kombinationen spielbar (Eid+Maulwurf, Nachtschicht+Highroller) · Title-Loop 10 min ohne Leak · Share-Text korrekt · Fehlerfälle (Offline, Atlas-Fehler).

## A6 — Release-Audit (Playtest-Protokoll)

**Setup:** 4–6 Personen, 1 Handy, ≥ 8 Runden, mind. 2 im Eid-Modus, 2 im Maulwurf-Modus.

| Beobachtung | Ziel |
|---|---|
| Zeit bis erster Reveal | ≤ 90 s |
| Verhandlungsphase wird tatsächlich zum Reden genutzt (nicht Schweigen aufs Handy) | ≥ 6 von 8 Runden |
| Hörbare Reaktion bei der letzten Karte | ≥ 6 von 8 |
| Lachen bei Inszenierung | ≥ 5 von 8 |
| Mindestens ein "Ich schwöre"-Moment, der gebrochen wurde, und die Reaktion darauf | ≥ 1 |
| Balancing: Anteil Runden mit k = 0 | 20–50 % (sonst Gebühr/Wachstum anpassen) |
| "Nochmal spielen?" / "War es fair?" | ≥ 80 % Ja |
| "Was war verwirrend?" → Top-5 Issues | erhoben |
| Abstürze / Ruckler / Sound-Aussetzer | 0 / ≤ 1 / 0 |
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
