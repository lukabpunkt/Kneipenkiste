# Playtest 01 — Protokoll

**Datum:** \_\_\_\_\_\_\_\_\_\_ **Ort:** \_\_\_\_\_\_\_\_\_\_ **Build/Tag:** \_\_\_\_\_\_\_\_\_\_
**Gerät:** \_\_\_\_\_\_\_\_\_\_ (Modell, OS, Browser) **Protokoll führt:** \_\_\_\_\_\_\_\_\_\_

> Setup laut Audit A6: **4–6 Personen, 1 Handy, mindestens 8 Runden**, davon 2 im
> Doppelagent- und 2 im Kettenreaktions-Modus.

## Vorher: die zwei Regeln für den Protokollanten

1. **Nicht erklären, was auf dem Bildschirm steht.** Wer erklärt, misst sich selbst.
   Erklärt wird nur die Grundregel („legt eure Minen, dann sucht ihr die Kiste") — alles
   Weitere soll das Spiel sagen. Jede Nachfrage ist ein Fund.
2. **Nach jeder Runde 30 Sekunden nichts sagen.** Was am Tisch von selbst gesagt wird,
   ist die eigentliche Messung: „DU warst das?!", „da lag deine Mine!", „nochmal".

---

## Runden-Protokoll

Eine Zeile pro Runde. `J/N` genügt; bei „verwirrt" die Frage notieren, die gestellt wurde.

| # | Spieler | Modi | Zeit bis 1. Explosion | „DU warst das?!" | Lachen bei Hit | Replay löst Gespräch aus | Grabungen | Explosionen | Preis der Gier | Verwirrt? (was?) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 |  |  |  s |  |  |  |  |  |  |  |
| 2 |  |  |  s |  |  |  |  |  |  |  |
| 3 |  | Doppelagent |  s |  |  |  |  |  |  |  |
| 4 |  | Doppelagent |  s |  |  |  |  |  |  |  |
| 5 |  | Kettenreaktion |  s |  |  |  |  |  |  |  |
| 6 |  | Kettenreaktion |  s |  |  |  |  |  |  |  |
| 7 |  |  |  s |  |  |  |  |  |  |  |
| 8 |  |  |  s |  |  |  |  |  |  |  |

**Trittstein-Beobachtung** (Audit A6, mindestens einmal erwartet):
Hat jemand bewusst eine eigene Mine als sicheres Feld benutzt — und ist er dafür
„gelesen" worden? Runde \_\_\_\_, wer: \_\_\_\_\_\_\_\_\_\_, wie aufgefallen: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## Zielwerte aus Audit A6

| Beobachtung | Ziel | Gemessen | Erfüllt |
|---|---|---|---|
| Zeit bis erste Explosion | ≤ 90 s |  |  |
| „DU warst das?!"-Moment | ≥ 6 von 8 Runden |  |  |
| Lachen bei Hit-Sequenz | ≥ 5 von 8 |  |  |
| Replay löst Gespräch aus | ≥ 4 von 8 |  |  |
| Trittstein bewusst genutzt **und** gelesen | ≥ 1 |  |  |
| Grabungen pro Runde (Median) | 4–8 |  |  |
| Explosionen pro Runde | 1–3 |  |  |
| Preis-der-Gier-Rate | 5–15 % der Runden |  |  |
| „Nochmal spielen?" / „War es fair?" | ≥ 80 % Ja |  |  |
| Abstürze | 0 |  |  |
| Ruckler | ≤ 1 |  |  |
| Sound-Aussetzer | 0 |  |  |
| Fehl-Taps | ≤ 1 |  |  |

## Fragen an den Tisch (nach Runde 8)

Jede Antwort in Stichworten, wörtlich wo möglich.

1. **Was war verwirrend?** (Die wichtigste Frage — daraus werden die Top 5.)
2. Wann hat es am meisten Spaß gemacht?
3. Wann war Leerlauf?
4. Hat jemand die Temperatur-Hinweise falsch verstanden? Wie?
5. War klar, wer eine Mine gelegt hat, wenn sie hochging?
6. Hat jemand die Modi verstanden, ohne zu fragen?
7. Würdet ihr das nochmal spielen? Warum (nicht)?
8. Was hat gefehlt?

## Top-5-Findings

Nach dem Playtest ausfüllen und **in dieser Reihenfolge** beheben (Roadmap M6.1).
Jedes Finding bekommt einen Satz Ursache und eine Entscheidung — auch „bleibt so".

### Vorab-Befunde vom 5. September 2026 (Live-Build auf dem Handy, vor dem eigentlichen Playtest)

Vier Beobachtungen aus einem ersten Durchgang am Gerät — behoben, bevor der Tisch
zusammenkommt, damit der Playtest nicht an bekannten Fehlern hängen bleibt.

| # | Beobachtung | Ursache | Entscheidung |
|---|---|---|---|
| 1 | „Es wird nicht klar, wann man eine Bombe anklickt — es sollte etwas explodieren." | **Zwei echte Fehler.** Die Partikel wurden beim *Bauen* der Sequenz sichtbar, also fast eine Sekunde vor dem Knall: Neun Rauchwolken saßen bewegungslos auf der geschlossenen Platte, und beim Aufdecken *erschien* nichts mehr. Und der Kamera-Ruck wurde in Welteinheiten statt Bildschirmpixeln angewendet — aus 12 px wurden 4,7. | Behoben (ADR-23, ADR-24). Dazu größere Partikel in Welteinheiten, die dritte Rauchgröße aus dem Atlas, Restrauch und Trümmer im Krater, eigene Effekte für Kettenreaktions-Nachbarn (ADR-25). |
| 2 | „Es wird nicht ersichtlich, was Blindgänger sind." | Der Blindgänger nutzte dieselbe Bodentextur wie ein leeres Feld und dieselben Farbringe wie ein Krater; das Banner sagte nur „Pfff." plus „Rudi → Anna" — eine Zeile, die im Krater-Fall „hat ihn gesprengt" bedeutet. Das Wort „Blindgänger" kam nirgends vor. | Behoben (ADR-26): entschärfte Bombe im Loch, das Schild aus GDD §4.1 (lag seit M2 ungenutzt im Atlas), Überschrift „BLINDGÄNGER", Feed nennt nur den Leger, fünfte Regelkarte. |
| 3 | „Es gibt keine Konsequenzen, wenn man eine Bombe erwischt." | Die Konsequenz stand 2,2 s am **oberen** Bildrand, während der Blick unten am Krater klebte — und war danach spurlos weg. Während der ganzen Grabphase gab es keinen Schluck-Zähler. Erschwerend: keine Haptik auf iOS, kein Ton bei gestelltem Klingelschalter. | Behoben (ADR-27): Banner fährt unten im Feld ein, wo etwas passiert ist; neuer Schluck-Zähler in der Fußzeile hält die Zahl fest. Kein Bestätigen-Tap — GDD §3.5. |
| 4 | „Der Vergraben-Button ist zu weit unten, man muss scrollen." | 116 px Überlauf (bis 184 im Doppelagent-Modus): Das Feld trägt ein festes Seitenverhältnis, der Knopf war das letzte Kind einer scrollenden Spalte. `--safe-bottom` wurde zusätzlich doppelt gezahlt. | Behoben (ADR-28): scrollender Rumpf, fester Fuß — und ein Mindestmaß für das Feld, weil der erste Versuch (gedeckelte Höhe) die Platten auf 55,3 px drückte und damit die 56-px-Regel aus GDD §5 brach. Der neue Layout-Test fand zwei weitere Screens mit demselben Fehler: die **Lobby** („Feld verminen" rund 400 px unter der Falz) und den **Dig-Screen** (40 px, und unten stand der Schluck-Zähler). Ehrlich geblieben ist: Bei 5 × 5 **mit** Doppelagent passt das Feld auf 664 px Höhe nicht ganz über die Falz — der Knopf schon, das Feld scrollt. |

### Top-5-Findings aus dem Playtest

| # | Beobachtung | Wie oft | Vermutete Ursache | Entscheidung |
|---|---|---|---|---|
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |
| 4 |  |  |  |  |
| 5 |  |  |  |  |

## Was die Simulation vorher sagt

Damit beim Auswerten klar ist, was erwartet war: `npm run balance` misst dieselben drei
Kennzahlen über je 2 000 simulierte Runden. Der Lauf vom 5. September 2026 liegt als
[`docs/balance-2026-09-05.txt`](balance-2026-09-05.txt) bei. Die Simulation kennt zwei Spielweisen, und
die Wahrheit am Tisch liegt dazwischen:

- **Hinweise lesend** — ein Tisch, der die Temperatur konsequent auswertet und die Ringe
  schneidet. Median **4 Grabungen** im Standardmodus. Das ist die optimistische Grenze.
- **Blind** — niemand liest die Hinweise. Median **13 (5 × 5)** bis **18–19 (6 × 6)**.
  Das ist die pessimistische Grenze.

Liegt der gemessene Median näher an 4, lesen die Leute die Hinweise besser als erwartet
(und die Runde ist kurz); liegt er näher an 13, sind die Hinweise unverständlich — dann
ist das ein Finding, kein Balancing-Problem.

**Zwei Zahlen, bei denen die Simulation bewusst außerhalb liegt:**

- **Explosionen pro Runde 0,53–1,29** statt 1–3. Direkte Folge kurzer Runden: Wer die
  Kiste in vier Zügen findet, tritt selten auf eine Mine. Am Tisch dürfte der Wert höher
  liegen, weil real langsamer gesucht wird.
- **Preis der Gier 15–32 %** statt 5–15 %. Das ist **keine** Frage der Rundenlänge,
  sondern reine Arithmetik: Die Wahrscheinlichkeit, dass die Kiste auf einer fremden
  Mine liegt, entspricht der Minendichte. Bei 2 Minen pro Spieler sind das bei 4 Spielern
  rund 22 %, bei 8 Spielern rund 30 %. Der Zielwert 5–15 % ist mit dieser Dichte nicht
  erreichbar — entweder er wandert, oder die Minenzahl sinkt (siehe **ADR-21**).
