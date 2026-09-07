# Playtest 01 — Protokoll

> **Zum Ausfüllen während des Abends.** Die Beobachtungsbögen stehen leer da, weil sie
> niemand am Schreibtisch ausfüllen kann: Audit A6 fragt nach Reaktionen echter Menschen.
> Was hier schon steht, ist der Aufbau und die Frage — der Rest kommt vom Tisch.

**Datum:** ____________  **Ort:** ____________  **Build:** ____________ / Commit ________

> Der Bogen wird mit dem Spiel mitgepflegt: Stand sind **20 Inszenierungen und 5 Modi**
> (zuletzt ergänzt am 2026-09-05). Vor dem Abend kurz gegen `docs/PROGRESS.md` prüfen —
> ein Bogen, der die Hälfte nicht kennt, verschenkt den Abend.

## Setup (A6)

- [ ] 4–6 Personen, **ein** Handy
- [ ] mindestens 8 Runden
- [ ] davon ≥ 2 im **Eid**-Modus, ≥ 2 im **Maulwurf**-Modus, ≥ 2 im **Kronzeugen**-Modus
- [ ] Der Kronzeuge greift erst **ab zwei Dieben**. Läuft die Gruppe brav, den Modus mit
      Maulwurf kombinieren — der garantiert einen Dieb, und der zweite findet sich meist.
- [ ] Härte: Normal (Abweichung notieren: ________)
- [ ] Gerät: ____________  Browser: ____________

**Vorher einmal machen:** App über „Auf den Startbildschirm" installieren und den
Flugmodus einschalten — ein Trinkspiel darf nicht am WLAN der Wohnung hängen.

## Die zehn Zeilen aus A6

| # | Beobachtung | Ziel | Gemessen | Erfüllt |
|---|---|---|---|---|
| 1 | Zeit bis zum ersten Reveal | ≤ 90 s | ______ s | ☐ |
| 2 | Runden, in denen die Verhandlung zum **Reden** genutzt wurde (nicht Schweigen aufs Handy) | ≥ 6 von 8 | ____ / ____ | ☐ |
| 3 | Runden mit hörbarer Reaktion bei der **letzten Karte** | ≥ 6 von 8 | ____ / ____ | ☐ |
| 4 | Runden mit **Lachen** bei der Inszenierung | ≥ 5 von 8 | ____ / ____ | ☐ |
| 5 | Mindestens ein gebrochener „Ich schwöre"-Moment — und was passierte | ≥ 1 | ____ | ☐ |
| 6 | Anteil Runden mit **k = 0** (alle teilen) | 20–50 % | ____ % | ☐ |
| 7 | „Nochmal spielen?" / „War es fair?" | ≥ 80 % Ja | ____ % / ____ % | ☐ |
| 8 | „Was war verwirrend?" → Top-5 | erhoben | siehe unten | ☐ |
| 9 | Abstürze / Ruckler / Sound-Aussetzer | 0 / ≤ 1 / 0 | ____ / ____ / ____ | ☐ |
| 10 | Gerätematrix, PWA, Live-URL, README, CHANGELOG, Tag | grün | siehe A6-Report | ☐ |

## Rundenblatt

Eine Zeile pro Runde. `k` = Zahl der Diebe.

| # | Modi | V | k | Ausgang | Inszenierung | Reaktion (0–3) | Notiz |
|---|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |

*Reaktion:* 0 = nichts, 1 = Grinsen, 2 = Lachen/Aufschrei, 3 = alle reden durcheinander.

## Die zwanzig Inszenierungen

Welche kam vor, und wie hat sie getragen? Die Gewichte stehen in
`src/game/outcomes/registry.ts` und sind **alle 1** — hier entscheidet sich, welche
häufiger kommen soll und welche raus kann.

Erwarte nicht, alle zwanzig an einem Abend zu sehen: Bei acht Runden kommen etwa acht
davon vor, und das No-Repeat-Fenster sorgt nur dafür, dass sich innerhalb eines Falls
nichts sofort wiederholt. Was leer bleibt, bleibt eben leer — lieber ehrlich als geraten.

| ID | Fall | gesehen | Reaktion (0–3) | häufiger / seltener / raus |
|---|---|---|---|---|
| `share_group_hug` | alle teilen |  |  |  |
| `share_toast` | alle teilen |  |  |  |
| `share_slow_clap` | alle teilen |  |  |  |
| `share_bank_photo` | alle teilen |  |  |  |
| `steal_solo_getaway` | Alleingang |  |  |  |
| `steal_solo_moonwalk` | Alleingang |  |  |  |
| `steal_solo_magician` | Alleingang |  |  |  |
| `steal_solo_helicopter` | Alleingang |  |  |  |
| `steal_solo_trapdoor` | Alleingang |  |  |  |
| `steal_multi_tugofwar` | mehrere Diebe |  |  |  |
| `steal_multi_anvil` | mehrere Diebe |  |  |  |
| `steal_multi_standoff` | mehrere Diebe |  |  |  |
| `steal_multi_banana` | mehrere Diebe |  |  |  |
| `steal_multi_handcuffs` | mehrere Diebe |  |  |  |
| `steal_all_brawl` | alle stehlen |  |  |  |
| `steal_all_alarm` | alle stehlen |  |  |  |
| `steal_all_pie_fight` | alle stehlen |  |  |  |
| `steal_all_dominoes` | alle stehlen |  |  |  |
| `jackpot_burst` | Jackpot |  |  |  |
| `jackpot_dive` | Jackpot |  |  |  |

**Wer nichts sieht, kann nachhelfen:** `npm run preview:outcomes` spielt jede Sequenz
einzeln ab. Das ersetzt keine echte Runde — die Spannung fehlt —, taugt aber danach, um
zu klären, welche man überhaupt nie zu Gesicht bekommen hat.

## Balancing

Alle Stellschrauben liegen in `src/config/rules.ts`. Wer hier etwas ändert, schreibt
einen ADR (CLAUDE.md).

| Größe | Aktuell (Normal) | Beobachtung | Vorschlag |
|---|---|---|---|
| `V_0` (Start) | 4 |  |  |
| Wachstum | +2 |  |  |
| Deckel / Jackpot | 16 |  |  |
| Bank-Gebühr | 1 Schluck |  |  |
| Meineid solo | 2 Schlücke |  |  |
| Meineid mehrfach | ×2 |  |  |
| Maulwurf-Rabatt | ÷2 |  |  |
| Kronzeugen-Rabatt | ÷2 |  |  |
| Verhandlungsdauer | 30 s |  |  |
| Reveal-Tempo | Normal |  |  |

**Faustregel aus A6:** Liegt der Anteil der Friedensrunden unter 20 %, ist Stehlen zu
billig — Gebühr hoch oder Wachstum runter. Liegt er über 50 %, ist der Tresor zu zahm —
Wachstum hoch oder Deckel runter.

## Was war verwirrend? (Top-5)

Wörtlich mitschreiben, nicht zusammenfassen. Die Formulierung ist der Befund.

1. ____________________________________________
2. ____________________________________________
3. ____________________________________________
4. ____________________________________________
5. ____________________________________________

## Sonstiges

- Ton: trägt die Musik über den Abend? Nervt etwas nach zwei Runden? ____________
- Haptik: spürbar bei der letzten Karte? ____________
- Lesbarkeit auf Armlänge (das Handy liegt in der Tischmitte): ____________
- Akku nach 8 Runden: ____________
- Kronzeuge: Hat jemand ausgepackt? Wie war die Reaktion des Verpfiffenen? ____________
- Vertrauens-Historie: Ab dem zweiten Abend steht sie in der Statistik. Interessiert sie
  jemanden — oder scrollt man daran vorbei? ____________
- Teilen-Knopf am Ergebnis: benutzt ihn jemand von selbst? ____________
