# DIE HÄNGEBRÜCKE — Audits

> Aufbau wie bei den Schwesterspielen: automatische Checks führt Claude Code selbst aus und schreibt den Report nach `docs/PROGRESS.md` (Vorlage unten); manuelle Checks als "⏳ manuell" markieren und Luka am Ende auflisten. Bestanden = alle **MUSS** grün; max. 3 offene **SOLL**.

## Standing Audit (jeder Commit, CI)

`typecheck` · `lint` (Warnings ≤ 5) · `test:unit` · keine `console.error` im E2E · kein hardcodierter UI-Text · Bundle-Delta ≤ +10 % ohne Begründung · **kein Screen außer Result referenziert fremde `round.choices` oder `rottenPlank` vor STEP** (Test).

---

## A0 — Setup- & Regelkern-Audit

| Check | Typ |
|---|---|
| Struktur nach Architektur §2; `rules.ts` enthält GDD-Werte (3–8; B_0 = n+2; B_min = n−1; Trinkwert m_b; Verteilen 1 / 2; Modi) | MUSS |
| `payout.test.ts`: GDD-Beispiele (n=5, B=7) explizit; erschöpfende Partitionen n = 3…5; Stichproben n = 6…8 | MUSS |
| `bridge.test.ts`: Schrumpfen bis B_min und nicht darunter; Reparatur auf n+2; entfernter Balken via `crypto`; Todeszone-Pigeonhole (B < n ⇒ ≥ 1 Kollision) | MUSS |
| Modi: Fahnenflucht (sicher → 0 Guthaben; gestürzt → doppelt), Balkendieb (+2 trotz Sturz), Morsch (allein → 1), Schwergewicht (× Gewicht), Seil (1×, Gebühr 1, danach nicht verfügbar), Nebel-Pfad | MUSS |
| Banner-Logik alle 6 Fälle | MUSS |
| Choreographer: gleiche Ankunftszeit, Knarren für besetzte Balken, Blickkontakt < Bruch, Domino ≥ 3, deterministisch, ≤ 20 s | MUSS |
| `publicView.test.ts`: CHOOSE-View enthält keine fremden Wahlen und keinen morschen Balken | MUSS |
| Property-Test 10 000 Runden: Invarianten aus Architektur §5 | MUSS |
| `Math.random` in `src/core/` → 0 Treffer | MUSS |
| FSM-Branch-Coverage 100 %, `core/` ≥ 95 % | MUSS |
| Titel auf Handy; PWA installierbar; CI grün | MUSS (teils manuell) |

## A1 — UX-/Flow-Audit

| Check | Typ |
|---|---|
| E2E-Szenarien aus M1.6 grün (iPhone 12 + Pixel 5 Emulation) | MUSS |
| Choose: Balken-Buttons ≥ 56 px (≥ 48 bei 10 Balken), keine fremden Wahlen sichtbar, Seil nur wenn verfügbar, Versiegeln ohne Zurück, Bedenkzeit-Fallback | MUSS |
| Negotiation: Regelzeile zeigt korrekte Werte für diese Runde (Todeszone: verteilen 2); Fahnen öffentlich, stapelbar | MUSS |
| Distribute: quick bei allen == 1, iterate sonst; nicht an sich selbst; Summen stimmen | MUSS |
| Result: Brücken-Übersicht (Fahne vs. Wahl), Vorschau mit abgefault/repariert, Statistik nach 5 Testrunden korrekt (Test) | MUSS |
| Unbeteiligte Person versteht jeden Screen ohne Erklärung | MUSS (manuell) |
| Safe-Areas, Reload-Persistenz (inkl. Balkenzahl + Seil-Verbrauch), Back-Dialog | MUSS / SOLL |

## A2 — Render-/Performance-Audit + Look-Check

| Check | Typ |
|---|---|
| 8 Hikers + Schlucht 60 s: p50 ≤ 16.7 ms, p95 ≤ 33 ms auf Referenzgerät | MUSS |
| Draw-Batches ≤ 3; Heap flach 30 s; Seile gecached | MUSS |
| Gleichzeitige Ankunft: alle `runTo` enden im selben Frame (Test) | MUSS |
| Look-Check gegen Art Direction §1/§5/§6 (Screenshots `docs/screens/m2-*`): goldene Stunde, Durchhang, Wind, Nebel, Gustav, Hüte in Spielerfarbe | MUSS (manuell) |
| Alle 8 Farben als Hüte auf der Brücke unterscheidbar (Deuteranopie-Simulation, Symbole auf dem Rucksack) | MUSS |
| Layout B = n−1 … n+2 für n = 3 und 8 ohne Überlappung; zwei Hikers passen nebeneinander auf einen Balken | MUSS |
| Preload während NEGOTIATION; Low-Effects (Nebel/Glitzer aus) bei Throttle 6× | SOLL |

## A3 — Spannungs-, Korrektheits- & Audio-Audit

| Check | Typ |
|---|---|
| 1 000 simulierte Runden: gezeigte Gruppen == `RoundResult.groups`; Bruch-Reihenfolge == Skript | MUSS |
| Knarren auf allen besetzten Balken (Amplituden 0.7 / 1.0 / morsch 0.4→1.0); Blickkontakt immer vor Bruch; Slow-Mo aktiv | MUSS |
| Safe-, Misc- und Overlay-Sequenzen registriert, Dev-Preview, Dauer-Limits | MUSS |
| Timing-Presets ± 1 s; Tap-to-Skip erst nach letztem Bruch | MUSS |
| Perf-Test grün; Sound-Sync ± 50 ms; stumm voll spielbar | MUSS |
| Spannungs-Test (manuell): 3 Personen sehen 5 Schritte mit unbekanntem Ergebnis; ≥ 2 sagen, sie waren beim Knarren unsicher, ob ihr Balken hält; ≥ 1 hörbare Reaktion beim Blickkontakt | MUSS (manuell) |
| Wake-Lock; Tab-Wechsel Pause/Resume | SOLL |

## A4 — Fall-Sequenzen-Qualitäts-Audit

Pro Sequenz (6) eine Zeile in PROGRESS.md:

| Kriterium | Typ |
|---|---|
| In 1 s lesbar: wer fällt, mit wem, wie viel | MUSS |
| Labels `eyeContact` < `snap` < `climbedBack`; endet trocken/idle nach Reset | MUSS |
| Anticipation, Squash & Stretch, Overshoot, Hit-Stop, Follow-Through, Sound-Sync | MUSS |
| Dauer ≤ 5 s (Test) | MUSS |
| ≤ 2 Long-Tasks | MUSS |
| "Lustig-Test": ≥ 2 von 3 grinsen | SOLL (manuell) |

Gesamt: `fall_domino` nur ≥ 3 (Test); No-Repeat 3 über 1 000 Runden; Overlays kombinieren korrekt; Video `docs/screens/m4-falls.mp4` (SOLL).

## A5 — Polish-, Accessibility- & Bundle-Audit

Lighthouse Mobile Perf/A11y/Best Practices ≥ 90, PWA installierbar · JS ≤ 450 KB gzip, Step-Chunk lazy · Kontrast ≥ 4.5:1 · Reduced-Motion (kein Shake, Slow-Mo bleibt) · Tastatur (SOLL) · EN vollständig · alle Modus-Kombinationen spielbar (Fahne + Schwergewicht, Morsch + Seil, Nebel + Todeszone) · Title-Loop 10 min ohne Leak · Share-Text · Fehlerfälle.

## A6 — Release-Audit (Playtest-Protokoll)

**Setup:** 4–6 Personen, 1 Handy, ≥ 8 Runden, davon 2 Fahne, 2 Schwergewicht; mindestens eine Todeszone erlebt.

| Beobachtung | Ziel |
|---|---|
| Zeit bis erster Schritt | ≤ 90 s |
| Absprache wird zum Reden/Versprechen genutzt | ≥ 6 von 8 |
| Hörbare Reaktion beim Blickkontakt | ≥ 6 von 8 |
| Lachen bei Fall-Sequenz | ≥ 5 von 8 |
| Gebrochenes Versprechen mit Reaktion | ≥ 1 |
| Balancing: Anteil Runden mit Kollision (außerhalb Todeszone) | 40–70 % (sonst B_0/B_min anpassen) |
| Todeszone erreicht | ≥ 1 in 8 Runden |
| "Nochmal spielen?" / "War es fair?" | ≥ 80 % Ja |
| "Was war verwirrend?" → Top-5 | erhoben |
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
