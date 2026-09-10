# Playtest 01 — Protokoll

**Status:** ⬜ noch nicht durchgeführt · Datum: ________ · Ort: ________ · Protokoll: ________

Dieses Blatt ist zum Ausfüllen gebaut, nicht zum Lesen. Alles, was hier steht, ist während
des Spielens in zwei Sekunden abhakbar; die Auswertung kommt danach. Die Zielwerte stammen
aus `docs/05-AUDITS.md` (A6) — sie stehen dabei, damit man am Tisch nicht nachschlagen muss.

**Eine Bitte an den Protokollanten:** mitspielen, nicht danebensitzen. Ein Beobachter am
Tischende verändert genau das, was hier gemessen werden soll — ob geredet und gelogen wird.
Die Striche macht man zwischen den Runden, während das Handy weitergeht.

---

## 1. Setup

| | |
|---|---|
| Personen | ____ (Ziel: 4–6) |
| Gerät | ____________________ (Modell, Browser) |
| Runden | ____ (Ziel: ≥ 8) |
| Davon mit Fahne | ____ (Ziel: ≥ 2) |
| Davon mit Schwergewicht | ____ (Ziel: ≥ 2) |
| Todeszone erlebt | ⬜ ja ⬜ nein (Ziel: ≥ 1) |
| Version / Tag | ____________ |
| Installiert als PWA | ⬜ ja ⬜ nein |

**Vorher einmal ohne Zuschauer:** App öffnen, Spieler eintragen, Modi wählen, losspielen —
und dabei **die Uhr laufen lassen**. Wie lange dauert es vom ersten Tap bis zum ersten
Schritt?  **________ s** (Ziel ≤ 90 s)

Wenn es länger dauert: **wo** hat es gehakt? Das ist der wertvollste Satz des ganzen
Protokolls.

______________________________________________________________________________

---

## 2. Rundenbogen

Eine Zeile pro Runde. `K` = Kollision (mind. zwei auf einem Balken), `B` = Balkenzahl zu
Beginn der Runde (steht in der Lobby und im Result).

| # | B | Modi | K? | Blickkontakt: hörbare Reaktion? | Sturz: gelacht? | Absprache genutzt? | Versprechen gebrochen? | Notiz |
|---|---|---|---|---|---|---|---|---|
| 1 | | | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| 2 | | | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| 3 | | | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| 4 | | | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| 5 | | | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| 6 | | | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| 7 | | | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| 8 | | | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| 9 | | | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| 10 | | | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |

**„Absprache genutzt"** heißt: In den 20 Sekunden wurde über Balken geredet — nicht über
das Wetter und nicht gar nicht.

**„Blickkontakt"** ist der Moment kurz vor dem Bruch: zwei Hikers sehen sich in Slow-Mo an,
eine Sprechblase sagt „Oh." Gezählt wird jede hörbare Reaktion am Tisch — Lachen, Fluchen,
Luftholen. Stille zählt nicht.

### Welche Fall-Sequenz kam wie oft, und hat sie funktioniert?

| Sequenz | gesehen | gelacht | Notiz |
|---|---|---|---|
| Händchenhalten (`fall_hold_hands`) | | | |
| Coyote-Pause (`fall_coyote_delay`) | | | |
| Wippe (`fall_seesaw`) | | | |
| Seilschwung (`fall_rope_swing`) | | | |
| Domino (`fall_domino`, nur ab 3 auf einem Balken) | | | |
| Wandkicker (`fall_bounce_wall`) | | | |

Eine Sequenz, die zweimal gesehen und nie belacht wurde, ist ein Kandidat für ein
niedrigeres Gewicht in `config/sequences.ts` — kein Grund, sie zu löschen.

---

## 3. Auswertung gegen A6

| Beobachtung | Ziel | Gemessen | ✅/❌ |
|---|---|---|---|
| Zeit bis erster Schritt | ≤ 90 s | | |
| Absprache wird zum Reden/Versprechen genutzt | ≥ 6 von 8 | | |
| Hörbare Reaktion beim Blickkontakt | ≥ 6 von 8 | | |
| Lachen bei Fall-Sequenz | ≥ 5 von 8 | | |
| Gebrochenes Versprechen mit Reaktion | ≥ 1 | | |
| Kollisionsrunden außerhalb der Todeszone | 40–70 % | | |
| Todeszone erreicht | ≥ 1 in 8 Runden | | |
| „Nochmal spielen?" | ≥ 80 % Ja | | |
| „War es fair?" | ≥ 80 % Ja | | |
| Abstürze | 0 | | |
| Ruckler | ≤ 1 | | |
| Sound-Aussetzer | 0 | | |

**Zur Kollisionsrate:** Die Simulation sagt, was zu erwarten ist (`npm run balance`, ADR-32).
Für eine Sitzung über acht Runden mit 20 % Wortbruch: n = 4 → 45 %, n = 5 → 54 %, n = 6 → 61 %.
Liegt die gemessene Rate weit darunter, wurde besser abgesprochen als erwartet — dann wird
die Brücke von allein enger, und das ist in Ordnung. Liegt sie weit darüber, ist der Abend
Chaos und der Hebel steht in ADR-32.

**Zur Todeszone bei sechs und mehr Leuten:** Die Simulation erreicht sie dort nur in 3–11 %
der Achterunden-Sitzungen, weil jede Kollision die Brücke voll repariert (GDD §3.7). Wenn
sie am Tisch fehlt und fehlt *und vermisst wird*, ist das der eine Wert, den der
Balancing-Pass bewusst nicht angefasst hat.

---

## 4. Die Fragen an die Runde (nach dem Spielen, in dieser Reihenfolge)

1. **„Nochmal?"** — bevor irgendetwas erklärt wird. Die erste Reaktion ist die ehrliche.
2. **„War das fair?"** — und bei „nein": woran lag es?
3. **„Was war verwirrend?"** — offen fragen, nicht vorsagen. Alles notieren, auch das,
   was falsch verstanden wurde: Ein Missverständnis, das drei Leute haben, ist ein
   Designfehler und kein Nutzerfehler.
4. **„Wann war es am besten?"** — der Satz, der sagt, was das Spiel eigentlich ist.
5. **„Hätte jemand gern gelogen und hat sich nicht getraut?"** — die Frage nach
   Design-Pfeiler 2.

### Antworten

______________________________________________________________________________
______________________________________________________________________________
______________________________________________________________________________
______________________________________________________________________________

---

## 5. Top-5-Findings

Nur fünf. Was nicht in die fünf passt, ist Backlog — und wird auch als Backlog notiert,
nicht als Aufgabe.

| # | Finding | Wie oft aufgetreten | Gewicht | Behoben in |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

**Backlog aus dem Playtest** (nicht Teil von 1.0):

- 
- 

---

## 6. Offene manuelle Checks aus M2–M5

Die Liste ist über die Meilensteine gewachsen; ein Playtest ist die Gelegenheit, sie in
einem Abend abzuräumen. Details stehen jeweils im Report in `docs/PROGRESS.md`.

- [ ] **Spannungs-Test (A3):** Beim Knarren unsicher, ob der eigene Balken hält? ≥ 2 von 3.
- [ ] **Lustig-Test (A4):** ≥ 2 von 3 grinsen bei den Stürzen.
- [ ] **Look-Check (A2):** goldene Stunde, Durchhang, Wind, Nebel, Gustav, Hüte in Spielerfarbe.
- [ ] **Frame-Rate (A2/A4):** `?dev=1`, sechs Spieler, drei auf einem Balken plus ein Paar.
      Ziel 60 fps, Minimum 30.
- [ ] **Ton (A3):** Erster Tap entsperrt? Musik wechselt? Kracht der Bruch im Takt?
      Und einmal stumm durchspielen.
- [ ] **Deuteranopie (A2):** `docs/screens/m2-deuteranopia-8.png` — sind acht Wanderer noch acht?
- [ ] **Titel-Loop (A5):** Erzählt er in neun Sekunden das Spiel? Zehn Minuten offen lassen.
- [ ] **Bewegung reduzieren (A5):** Einstellung an, eine Runde spielen — fehlt zu viel?
- [ ] **Tastatur (A5):** mit Bluetooth-Keyboard durch den Titel.
- [ ] **Teilen (A5):** Kommt das System-Blatt, liest sich der Satz gut?
- [ ] **Video (A4, SOLL):** `docs/screens/m4-falls.mp4` — alle sechs Stürze hintereinander.

---

## 7. Fazit

**Ergebnis:** ⬜ 1.0 kann raus ⬜ Top-5 zuerst beheben ⬜ Grundlegendes Problem

______________________________________________________________________________
______________________________________________________________________________
