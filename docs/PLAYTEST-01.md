# Playtest 01 — Protokoll

> Auszufüllen von Luka. Alles unter „Vorbefund" steht schon fest: Es kommt aus der
> Simulation (`npm run balance`), nicht aus einem Spiel. Alles unter „Beobachtung" muss
> ein Tisch liefern.

## Setup (A6)

- **5–6 Personen, ein Handy, mindestens 8 Runden**, sodass jeder einmal Beamter ist.
- Davon **2 Runden Bestechung** und **2 Runden Diplomat**.
- Gespielt wird die Live-Version, nicht der Dev-Build. Kein `?dev=1` am Tisch: Das Panel
  verrät Mengen und Hinweise, und wer sie einmal gesehen hat, spielt anders.
- Getränke nach Geschmack; die Schluckzahlen sind Zahlen im Spiel, keine Vorschrift.

**Datum:** _______  **Ort:** _______  **Personen:** _______

---

## Vorbefund aus der Simulation

20 000 simulierte Runden je Zeile, 6 Spieler, Beamter folgt den Hinweisen
(`npm run balance`). Die Simulation kennt keinen Spaß — sie sagt nur, was die Zahlen tun.

### Der Fang-Anteil liegt über dem Ziel

| Wie oft geschmuggelt wird | Runden mit Fang | Ziel A6 |
|---|---|---|
| 30 % | 65,7 % | ✅ 40–70 % |
| 40 % | 76,0 % | ❌ |
| 55 % | 85,4 % | ❌ |
| 80 % | 96,2 % | ❌ |

Bei jeder plausiblen Schmuggelrate über 30 % wird in mehr als 70 % der Runden jemand
erwischt. Das Ziel aus A6 ist mit k = 2 nur zu halten, wenn selten geschmuggelt wird.

**Was der Tisch beantworten muss:** Wie oft packt jemand wirklich mehr als 0?

### Die Hinweise verlieren ihren Wert, je mehr geschmuggelt wird

| Wie oft geschmuggelt wird | Quote beim Raten | Quote mit Hinweis | Vorsprung |
|---|---|---|---|
| 30 % | 30 % | 44 % | **+13,8** Punkte |
| 40 % | 40 % | 52 % | +11,5 |
| 50 % | 50 % | 58 % | +7,5 |
| 55 % | 55 % | 61 % | +5,7 |
| 65 % | 65 % | 66 % | +0,9 |
| 80 % | 80 % | 76 % | **−3,6** |

Der Grund ist Arithmetik: Ein Hinweis stimmt mit p_true = 0,6. Blindes Raten trifft mit
der Wahrscheinlichkeit, dass ein beliebiger Koffer Ware enthält. **Sobald mehr als 60 %
der Reisenden schmuggeln, ist ein Hinweis schlechter als Raten.**

Das ist ein Risiko für Design-Pfeiler 2 („falsche Sicherheit"): Schmuggeln wird belohnt,
also werden Gruppen mit der Zeit mehr schmuggeln — und genau dann werden die Hinweise
wertlos. Es kann auch eine elegante Rückkopplung sein: Wer zu oft schmuggelt, wird zu oft
erwischt und packt wieder weniger. Welches von beidem passiert, sagt nur ein Tisch.

**Was der Tisch beantworten muss:** Steigt die Schmuggelrate über die acht Runden? Sagt
irgendwann jemand, die Hinweise seien nutzlos?

### Hochsaison bringt nicht mehr durch die Grenze

| | durchgekommen | erwischt | Schlücke Reisende |
|---|---|---|---|
| Klassik | 4,08 | 3,05 | 6,2 |
| Hochsaison | 4,11 | 6,67 | 13,4 |

Die zusätzliche Öffnung frisst die zusätzliche Gier exakt auf. Hochsaison ist kein
Schmuggler-Modus, sondern ein Trink-Modus — der UI-Text sagt aber „Bis zu 10 Stück
schmuggeln, eine Öffnung mehr", was nach mehr Beute klingt.

**Was der Tisch beantworten muss:** Fühlt sich Hochsaison wie mehr Beute an oder wie mehr
Strafe? Wenn Letzteres: Text ändern oder die Extra-Öffnung streichen.

### Der Spürhund landet als Einziger im Zielkorridor

| Modus | Fang-Anteil | Belästigung |
|---|---|---|
| Klassik | 85,9 % | 14,1 % |
| Spürhund (k−1) | **60,3 %** ✅ | 39,7 % ❌ |

Weniger Öffnungen bringen den Fang-Anteil ins Ziel, treiben aber die Belästigung über
30 %. Das ist derselbe Hebel von zwei Seiten.

---

## Beobachtung (auszufüllen)

| Beobachtung | Ziel | Ergebnis | Notiz |
|---|---|---|---|
| Zeit bis zum ersten Röntgen | ≤ 120 s | | |
| Verhör wird zum Reden genutzt; der Beamte stellt Fragen | ≥ 6 von 8 | | |
| Lachen beim Röntgen | ≥ 6 von 8 | | |
| Beamter fällt auf einen falschen Hinweis rein | ≥ 2 von 8 | | |
| Jemand schmuggelt ≥ 5 und kommt durch | ≥ 1 | | |
| Anteil Runden mit ≥ 1 Fang | 40–70 % | | |
| Anteil „Belästigung"-Runden | ≤ 30 % | | |
| „Nochmal spielen?" / „War es fair?" | ≥ 80 % Ja | | |
| Abstürze | 0 | | |
| Ruckler | ≤ 1 | | |
| Sound-Aussetzer | 0 | | |
| Fehl-Taps | ≤ 1 | | |

### Regeln nach einer Runde verstanden?

Ohne Erklärung, nur durch Spielen (GDD §9, Erfolgskriterium 1):

- [ ] Dass man 0 packen darf und das eine echte Wahl ist
- [ ] Dass die Hinweise nicht immer stimmen
- [ ] Dass die Hinweise nichts über die Menge sagen
- [ ] Dass der Beamte trinkt, wenn er danebengreift
- [ ] Dass nur der Beamte tippen darf

### Wie oft wurde geschmuggelt?

Strichliste je Runde (0 = sauber). Daraus ergibt sich die Zahl, die der ganzen Simulation
oben fehlt.

| Runde | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Reisende gesamt | | | | | | | | |
| davon geschmuggelt | | | | | | | | |

### „Was war verwirrend?" — Top 5

1.
2.
3.
4.
5.

### Zitate

> 

---

## Balancing-Entscheidungen nach dem Playtest

Änderungen nur in `config/rules.ts` und nur mit ADR (CLAUDE.md). Kandidaten, nach
Erwartungswert sortiert:

| Stellschraube | Heute | Wenn der Tisch sagt … | dann |
|---|---|---|---|
| `HINT_TRUTH_PROBABILITY` | 0,6 | „Die Hinweise bringen nichts" | auf 0,7 — dann bleiben sie bis zu einer Schmuggelrate von 70 % besser als Raten |
| `baseOpenings` (k) | 1/2/3 | „Es wird zu oft jemand erwischt" | k um eins senken; die Simulation zeigt, dass das den Fang-Anteil in den Zielkorridor bringt |
| `HARASSMENT_SIPS` | 2 | „Der Beamte öffnet einfach alles" | erhöhen — heute kostet ein Fehlgriff 2 Schlücke, ein Fang bringt bis zu 12 |
| `HIGH_SEASON_OPENING_BONUS` | +1 | „Hochsaison fühlt sich nur nach Strafe an" | streichen, dann kommt wirklich mehr durch |
| `CAUGHT_SIPS_PER_ITEM` | 2 | „Zu viel Trinken" / „Zu wenig" | anpassen; ändert nichts an der Strategie, nur am Abend |

**Nicht ändern, ohne den Playtest abzuwarten.** Die Simulation sagt, was die Zahlen tun —
nicht, ob es Spaß macht. Wenn der Tisch bei 85 % Fang-Anteil lacht, ist der Zielkorridor
aus A6 falsch und nicht das Spiel.
