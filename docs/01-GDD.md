# DER TRESOR — Game Design Document (GDD)

> Version 1.0 · Stand: 2026-09-03 · Autor: Planung (Cowork) · Zielgruppe: Claude Code + Luka
> Dieses Dokument ist die **Wahrheit** für das Spielverhalten. Bei Widersprüchen zu Code gewinnt das GDD, bis es bewusst geändert wird. Schwesterprojekt: **Drinkshot** (gleicher Stack, gleiche Design-Sprache, gleiche Charaktere).

---

## 1. Elevator Pitch

**Der Tresor** ist ein Pass-the-Phone-Partyspiel für 3–8 Personen über Vertrauen und Verrat. In der Mitte des Tisches steht ein Cartoon-Tresor voller Schlücke. Erst wird 30 Sekunden verhandelt — alle schwören, zu teilen. Dann geht das Handy rum, und jeder entscheidet allein und geheim: **TEILEN** oder **STEHLEN**. Danach öffnet sich der Tresor, und die Entscheidungen werden Karte für Karte aufgedeckt. Teilen alle, trinkt niemand und der Tresor wächst. Stiehlt genau einer, verteilt er den ganzen Tresor. Stehlen mehrere, saufen die Diebe ihn unter sich aus.

**Genre:** Party / Social-Dilemma / Trinkspiel · **Plattform:** Web (Mobile First, PWA) · **Rundendauer:** 60–120 s · **Spielerzahl:** 3–8 (Sweet Spot 4–6)

**Design-Pfeiler (Reihenfolge = Priorität):**
1. **Der Verrat muss weh tun und lustig sein** — die Aufdeckung ist der Moment, für den das Spiel existiert.
2. **Die Verhandlung ist das Spiel** — das Handy ist Bühne und Richter, der Inhalt entsteht am Tisch.
3. **Eskalation** — jede Runde muss den Druck erhöhen; ewiger Frieden darf sich nicht lohnen.
4. **Zero Friction** — Regeln in einem Satz, erste Aufdeckung < 90 s nach Öffnen der Seite.
5. **Cartoon-Heist-Look, flüssig auf jedem Handy.**

---

## 2. Core Loop

```
LOBBY → [VERHANDLUNG 30 s] → [GEHEIM: PASS → WAHL (×n)] → [AUFDECKUNG] → [AUSZAHLUNG] → RESULT
                    ▲                                                                   │
                    └───────────────────── Nächste Runde (Tresor wächst / resettet) ◄───┘
```

Eine **Runde** = Verhandlung + geheime Wahl + Aufdeckung + Auszahlung.
Eine **Session** = beliebig viele Runden; der Tresorstand, das Scoreboard und die Vertrauens-Statistik laufen über die Session.

---

## 3. Spielregeln (verbindlich)

### 3.1 Spieler & Farben

- 3–8 Spieler. Bei 2 Spielern startet das Spiel nicht ("Zu zweit ist das kein Dilemma, das ist eine Beziehung. Holt noch jemanden.").
- Farben, Symbole und Namensregeln **identisch zu Drinkshot** (Rot `#FF4757`, Blau `#3B82F6`, Grün `#2ED573`, Gelb `#FFD32A`, Lila `#AF73EE`, Orange `#FF7F50`, Pink `#FF6B9D`, Türkis `#18DCFF`; Symbole Kreis, Dreieck, Quadrat, Stern, Raute, Herz, Blitz, Kreuz).
- Die Charaktere sind die **Shotlings** aus Drinkshot, hier mit Ganoven-Maske (Domino-Maske) in Spielerfarbe und optional Ringelshirt/Beanie. Interner Name der Variante: **Crooks**.

### 3.2 Der Tresor (Einsatz-Ökonomie)

- Tresor-Inhalt `V` in Schlücken. Start `V_0 = 4` (Setting "Sanft" 3 / "Normal" 4 / "Hart" 6).
- **Wachstum:** Teilen alle → `V_next = V + 2` (Hart: +3). **Deckel** `V_max = 16` (Sanft 12 / Hart 20).
- **Reset:** Nach jeder Runde mit mindestens einem Dieb → `V_next = V_0`.
- **Bankgebühr (Eskalation):** In jeder Runde, in der alle teilen, trinkt **jeder sofort 1 Schluck** ("Die Bank nimmt Gebühren"). Damit ist Frieden nie kostenlos, der Tresor wird jede Runde verlockender, und irgendwann bricht jemand.
- **Jackpot:** Erreicht der Tresor `V_max` und alle teilen erneut, **platzt** er: Jeder trinkt `V_max / n` (aufgerundet), Tresor resettet, Feuerwerk. Verhindert Endlosschleifen bei sehr friedlichen Gruppen.

### 3.3 Verhandlungsphase

- Dauer 30 s (Setting 15 / 30 / 60 s), großer Countdown, Tresor mit aktuellem Inhalt prominent, darunter die Auszahlungs-Tabelle für **genau diese Runde** (siehe 3.5), damit jeder weiß, worum es geht.
- Ein Button **"Alle bereit"** (Host-Tap) beendet die Phase vorzeitig.
- Gesprächsanstöße als rotierende Sprechblase vom Tresor-Wächter (NPC "Herr Kassel", ein Cartoon-Bankier): "Wer hat letzte Runde gestohlen?", "Rudi wirkt heute sehr ehrlich.", "Der Tresor hat noch nie so gut ausgesehen." Nur Dekoration, max. 1 pro 10 s.
- **Keine** In-App-Eingaben in dieser Phase (außer Modus "Eid", siehe 3.7). Das ist Absicht: Die Verhandlung passiert am Tisch, nicht am Bildschirm.

### 3.4 Geheime Wahl (Handy rumgeben)

- Reihenfolge: Spieler 1 → n, jeweils **Privacy-Screen** ("Handy an **{Name}**. Tippe, wenn nur du aufs Display schaust.") → **Wahl-Screen**.
- Wahl-Screen: Zwei große Karten nebeneinander, **TEILEN** (grün, zwei Hände, die sich schütteln) und **STEHLEN** (rot, Hand greift in den Sack). Tap wählt und zeigt eine 400-ms-Bestätigungsanimation (Karte dreht sich auf die Rückseite, "Versiegelt"), dann sofort der nächste Privacy-Screen. Kein "Zurück".
- **Bedenkzeit-Timer** optional (Setting): 5 s pro Spieler, danach wird automatisch TEILEN gewählt (mit Hinweis). Verhindert, dass jemand 30 s grübelt und die Gruppe daraus Schlüsse zieht.
- Nach dem letzten Spieler: kurzer Screen "Alle Karten versiegelt. Legt das Handy in die Mitte." mit Tap zum Start der Aufdeckung.

### 3.5 Auszahlung (allgemein für n Spieler, Tresor V, k Diebe)

| Fall            | Was passiert                                                                                                   | Tresor danach     |
|-----------------|----------------------------------------------------------------------------------------------------------------|-------------------|
| **k = 0**       | Niemand trinkt aus dem Tresor. Bankgebühr: jeder 1. Bei `V = V_max` → Jackpot (jeder ⌈V/n⌉).                    | `V + 2` (bzw. Reset nach Jackpot) |
| **k = 1**       | Der Dieb trinkt nichts und **verteilt V** an die Teiler (freie Verteilung über die Verteil-UI, siehe 3.6).       | Reset auf `V_0`   |
| **k ≥ 2**       | Jeder Dieb trinkt `⌈V / k⌉`. Die Teiler trinken nichts.                                                           | Reset auf `V_0`   |
| **k = n**       | Sonderfall von k ≥ 2: alle trinken `⌈V / n⌉`. Wird als "Schlägerei" inszeniert.                                  | Reset auf `V_0`   |

Beispiele (n = 4, V = 8): ein Dieb → er verteilt 8 auf die drei Teiler. Zwei Diebe → beide trinken 4. Vier Diebe → alle trinken 2. Alle teilen → alle 1 (Gebühr), Tresor auf 10.

**Warum das ein echtes Dilemma ist:** Stehlen ist nur gut, wenn du der Einzige bist. Teilen ist nur gut, wenn niemand stiehlt. Es gibt keine sichere Wahl, und je größer der Tresor, desto verlockender der Alleingang — und desto brutaler, wenn zwei dieselbe Idee hatten.

### 3.6 Verteil-UI (nur bei k = 1)

- Der Dieb bekommt das Handy. Screen: sein Männchen mit Geldsack, darunter die Badges aller Teiler. Er tippt Badges an, um Schlücke zuzuteilen (jeder Tap = +1, Long-Press = −1), eine Leiste zeigt "Noch 3 zu verteilen". Erst wenn alle Schlücke vergeben sind, wird **"Auszahlen"** aktiv.
- Regel: Er darf alles einer Person geben. Das ist Absicht — Rache ist Teil des Spiels.
- Danach: Result-Screen mit "Rudi verteilt: Anna 5, Marc 3".

### 3.7 Modi (Session-Setting)

| Modus            | Änderung                                                                                                                                    | Zweck |
|------------------|---------------------------------------------------------------------------------------------------------------------------------------------|-------|
| **Klassik** (Default) | Regeln wie oben.                                                                                                                      | Einstieg. |
| **Eid**          | In der Verhandlungsphase kann jeder öffentlich auf dem Handy **"Ich schwöre zu teilen"** tippen (sein Badge bekommt ein Siegel). Wer schwört und stiehlt, begeht **Meineid**: Als Alleindieb muss er 2 der V Schlücke selbst trinken, als Mit-Dieb trinkt er das Doppelte. Wer nicht schwört, ist verdächtig — aber frei. | Macht Versprechen kostbar; der Meineid-Reveal ist der beste Moment des Spiels. |
| **Maulwurf**     | Zu Rundenbeginn wird geheim ein Spieler zum Maulwurf bestimmt und **muss stehlen** (sein Wahl-Screen zeigt nur STEHLEN, mit "Du bist der Maulwurf. Tu unschuldig."). Der Maulwurf trinkt bei k ≥ 2 nur die Hälfte. Er wird bei der Aufdeckung als Maulwurf enthüllt. | Gibt jedem eine glaubhafte Ausrede ("Ich war der Maulwurf!") und garantiert jede Runde mindestens einen Dieb → nie langweilig. Für Gruppen, die zu brav sind. |
| **Nachtschicht** | Keine Verhandlungsphase. 10 s Stille mit tickender Uhr, dann geheime Wahl.                                                                   | Reines Prediction-Game, kurze Runden, für später am Abend. |
| **Highroller**   | `V_0 = 6`, Wachstum +4, kein Deckel, Jackpot bei 24.                                                                                          | Für Gruppen, die es wollen. |

Modi sind kombinierbar: Eid + Maulwurf ist der Chaos-Modus (der Maulwurf darf schwören und muss trotzdem stehlen — Meineid-Strafe entfällt für ihn, was die Enthüllung noch süßer macht).

### 3.8 Result-Screen

- Großes Ergebnis-Banner je Fall: **"Ehre unter Dieben"** (alle teilen), **"Der Alleingang"** (ein Dieb, mit Name), **"Zu viele Köche"** (mehrere Diebe), **"Schlägerei"** (alle stehlen), **"JACKPOT"**, **"MEINEID!"** (Eid-Modus).
- Zeile "**{Name} trinkt {N}**" pro Betroffenem, Verteilungs-Detail bei Alleingang.
- Tresor-Vorschau für die nächste Runde ("Der Tresor wächst auf 10" / "Der Tresor wurde geleert").
- Session-Statistik aufklappbar: Scoreboard (getrunken gesamt), **Vertrauens-Index** pro Spieler (Anteil TEILEN in %), **Verrats-Streak**, "Meistbetrogen".
- Buttons: **Nächste Runde** · Spieler ändern · Modus ändern.

---

## 4. Die Aufdeckung (das Herzstück)

Die Aufdeckung ist eine **choreografierte Show** von 15–35 s (abhängig von n), geskriptet aus dem bereits feststehenden Ergebnis. Wie bei Drinkshot gilt: **Das Ergebnis steht fest, bevor die Show beginnt.** Die Show inszeniert nur.

### 4.1 Bühne

Ein Tresorraum: schwerer runder Tresor in der Mitte (Stahl, Zahlenrad, Griffrad), davor ein Samttisch. Die Crooks stehen im Halbkreis um den Tisch, jeder hinter seiner **Entscheidungskarte** (verdeckt, Rückseite mit Spielerfarbe + Symbol). Spotlight von oben, Laserstrahlen im Hintergrund, die dekorativ pulsieren. Herr Kassel (Bankier) steht neben dem Tresor und moderiert mit Sprechblasen.

### 4.2 Reveal-Reihenfolge (verbindlich, Anti-Vorhersagbarkeit)

- Karten werden **einzeln** aufgedeckt. Reihenfolge: **alle TEILEN-Karten zuerst (zufällig permutiert), dann alle STEHLEN-Karten (zufällig permutiert).**
- Konsequenz: Bis zur **letzten** Karte weiß niemand, ob es eine Runde ohne Dieb war — jede nächste Karte könnte der Verräter sein. Bei mehreren Dieben wird der erste Dieb aufgedeckt und feiert kurz, bevor der zweite ihm die Party verdirbt (siehe 4.4). Die Spieler wissen, dass Diebe am Ende kommen — das erzeugt genau die richtige Erwartung: "Noch drei Karten. Noch zwei. Noch eine…"
- Bei Maulwurf-Modus wird die Maulwurf-Karte als **letzte** Diebeskarte mit eigenem Effekt (Maulwurf-Helm ploppt auf den Kopf) aufgedeckt.
- Bei Eid-Modus: Karten von Schwörenden haben ein Wachssiegel. Beim Aufdecken eines Meineids bricht das Siegel mit Extra-Effekt (siehe 4.4).

### 4.3 Show-Timeline (Beispiel n = 5, k = 1)

| Phase          | Zeit         | Inszenierung                                                                                                                                  |
|----------------|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Intro**      | 0.0 – 2.0 s  | Licht geht aus, Spotlight an, Tresor-Zahlenrad dreht sich 3× mit Klick-Sound, Griffrad dreht, Tür schwingt auf, Goldglanz + Rauch, Münzen-Klimpern. Herr Kassel: "Die Karten, bitte." |
| **Karte 1–4**  | je 2.5–3.5 s | Kamera fährt auf die Karte, Trommelwirbel, Karte hebt sich, dreht sich **langsam** (Fake-Out: bei 60 % Drehung kurzes Stocken, 200 ms), zeigt TEILEN → grünes Aufleuchten, Crook atmet auf, Publikum-"Aah". Zwischen den Karten wird die Verweildauer leicht kürzer (Tempo zieht an). |
| **Letzte Karte** | +4 s       | Trommelwirbel länger, Spotlight enger, Herzschlag, Karte dreht sich in Slow-Mo, stockt bei 60 %, stockt bei 85 % … STEHLEN. Rotes Blitzlicht, Alarm-Sirene kurz, Laser werden rot. |
| **Auszahlung** | +4–6 s       | Ergebnis-Inszenierung je Fall (4.4).                                                                                                          |
| **Outro**      | +1.5 s       | Tresortür knallt zu (oder bleibt bei "alle teilen" offen und füllt sich weiter), Wipe zum Result.                                              |

Dauer-Presets (Setting): Kurz / Normal / Lang skalieren die Karten-Verweildauer (1.8 / 2.8 / 3.8 s). Bei 8 Spielern und "Lang" darf die Show max. 40 s dauern; darüber wird automatisch gerafft (erste Karten schneller).

**Tap-to-Skip:** Ab der zweiten Karte kann ein Tap die aktuelle Karte sofort umdrehen (für ungeduldige Gruppen), aber nie die letzte Karte oder die Auszahlungs-Inszenierung.

### 4.4 Ergebnis-Inszenierungen (mind. 2 Varianten pro Fall bis Release)

**Alle teilen — "Ehre unter Dieben"**
- `share_group_hug`: Alle Crooks laufen zur Mitte, Gruppenumarmung, Herzchen, Herr Kassel wischt eine Träne weg — dann kassiert er mit einem Kassenklingeln von jedem 1 Schluck ("Gebühr!"), alle gucken sauer. Tresor füllt sich sichtbar (Münzen regnen rein), Zähler zählt hoch.
- `share_toast`: Crooks heben Gläser, stoßen an (Klirren), einer bekommt Schluckauf. Gebühr wie oben.

**Ein Dieb — "Der Alleingang"**
- `steal_solo_getaway`: Der Dieb greift sich den Sack, rennt zur Kamera, springt ins Fluchtauto (fährt von rechts ein), Reifenqualm, Teiler bleiben mit umgedrehten leeren Taschen stehen, einer hält ein Schild "WIR HATTEN EINEN DEAL". Dann Übergang zur Verteil-UI.
- `steal_solo_moonwalk`: Dieb zieht den Sack langsam und mit Moonwalk aus dem Bild, winkt, Teiler gucken erst verwirrt, dann schockiert (Kinnlade fällt zu Boden).
- `steal_solo_magician`: Dieb zaubert den Tresorinhalt mit Tuch weg, verbeugt sich, Teiler klatschen automatisch, merken es dann, hören auf.

**Mehrere Diebe — "Zu viele Köche"**
- `steal_multi_tugofwar`: Erster Dieb wird aufgedeckt, jubelt, hebt den Sack — zweite Karte dreht sich, zweiter Dieb reißt am Sack, Tauziehen, Sack platzt, Münzen (Schlücke) fliegen den Dieben in den Mund (Zähler pro Dieb). Teiler stehen mit Popcorn daneben.
- `steal_multi_anvil`: Erster Dieb feiert mit Konfetti; ein Amboss mit dem Symbol des zweiten Diebs fällt auf ihn; der zweite Dieb feiert; ein Amboss mit dem Symbol des ersten fällt auf ihn. Beide liegen plattgedrückt, Herr Kassel verteilt die Schlücke aus dem Tresor per Trichter.
- `steal_multi_standoff`: Alle Diebe ziehen gleichzeitig Wasserpistolen, Mexican Standoff, Kameraschwenk, alle spritzen gleichzeitig, alle nass, Sack fällt in eine Pfütze.

**Alle stehlen — "Schlägerei"**
- `steal_all_brawl`: Cartoon-Kampfwolke mit herausragenden Armen, Beinen, Sternchen, gelegentlich fliegt ein Schuh raus. Wolke verzieht sich, alle sitzen mit Beulen und X-Augen im Kreis, Herr Kassel verteilt gleichmäßig per Kelle.
- `steal_all_alarm`: Alle greifen gleichzeitig in den Tresor, Alarm, Gitter fällt runter, alle Crooks hinter Gittern, Schlücke werden durch die Gitterstäbe gereicht.

**Jackpot**
- `jackpot_burst`: Tresor bläht sich auf wie ein Ballon, Nieten fliegen, Explosion in Goldkonfetti, Münzregen, Crooks tanzen, alle trinken die Beute gleichmäßig. Chor-Sound.

**Meineid (Eid-Modus, überlagert die Dieb-Inszenierung)**
- `perjury_seal_break`: Beim Aufdecken der Karte bricht das Wachssiegel mit Blitz, ein Blitzschlag trifft den Crook, seine Nase wächst (Pinocchio, 1 s), Herr Kassel stempelt "MEINEID" in Rot über ihn.

**Maulwurf (überlagert)**
- `mole_reveal`: Karte STEHLEN, dann fällt ein Bergbau-Helm mit Lampe auf den Kopf des Crooks, er zuckt mit den Schultern ("Befehl ist Befehl"-Sprechblase), Hälfte-Regel-Anzeige.

### 4.5 Effekt-Bausteine (wiederverwendbar)

Trommelwirbel-Loop mit Tempo-Anstieg · Spotlight-Verengung (Maske) · Karten-Flip mit Stocken · Rotes Alarm-Blitzen + Laser-Farbwechsel · Münzregen (Partikel) · Sprechblasen · Hit-Stop 80 ms · Screen-Shake · Kinnlade-fällt-Gag · Popcorn-Publikum · Kassel-Stempel.

---

## 5. Screens / UX-Flow

| # | Screen             | Inhalt & UX-Regeln                                                                                                                      |
|---|--------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| 0 | **Title**          | Tresor-Logo (Zahlenrad dreht sich im Idle), ein Crook schleicht im Loop vorbei und wird vom Spotlight erwischt. Spielen / Regeln / Settings, Sound-Toggle. |
| 1 | **Lobby**          | Spieler 3–8, Modus-Chips (kombinierbar), Härte-Chip (Sanft/Normal/Hart), Dauer-Chips (Verhandlung, Show). Persistenz. CTA "Tresor öffnen". |
| 2 | **Negotiation**    | Tresor groß mit V, Countdown-Ring, Auszahlungstabelle dieser Runde, Kassel-Sprechblasen, "Alle bereit". Eid-Modus: Badge-Reihe mit "Schwören"-Buttons (öffentlich). |
| 3 | **Pass**           | Wie Drinkshot (Vollfläche in Spielerfarbe, 800 ms Tap-Sperre).                                                                          |
| 4 | **Choice**         | Zwei Karten TEILEN / STEHLEN, Versiegelungs-Animation, optional Bedenkzeit-Timer. Maulwurf: nur STEHLEN.                                 |
| 5 | **Sealed**         | "Alle Karten versiegelt. Handy in die Mitte." Tap → Reveal.                                                                             |
| 6 | **Reveal**         | PIXI-Bühne, Show (4.3). Tap-to-Skip-Regel.                                                                                                |
| 7 | **Distribute**     | Nur bei k = 1: Verteil-UI für den Dieb (Handy geht zu ihm). Privacy nicht nötig — Verteilung ist öffentlich.                             |
| 8 | **Result**         | Banner, Trinker-Zeilen, Tresor-Vorschau, Statistik, Buttons.                                                                              |
| 9 | **Settings/Rules** | Wie Drinkshot; Regeln als 4 Cards: "Tresor", "Verhandeln", "Geheim wählen", "Auszahlung".                                                |

Orientation Portrait, Desktop-Portrait-Frame, PWA, Wake-Lock während Negotiation + Reveal, Haptik beim Karten-Flip der letzten Karte — alles wie Drinkshot.

---

## 6. Audio

Sprite-Sheet (howler): `ui_tap`, `ui_confirm`, `pass_whoosh`, `card_seal`, `vault_dial` (Klicks), `vault_open`, `coin_shimmer`, `drumroll_loop`, `card_lift`, `card_flip`, `card_stall`, `reveal_share` (Glöckchen), `reveal_steal` (Alarm-Stab), `siren_short`, `heartbeat_loop`, `crowd_aah`, `crowd_gasp`, `crowd_laugh`, `tire_screech`, `anvil`, `brawl_loop`, `cash_register`, `jackpot_choir`, `thunder`, `stamp`, `music_lobby` (Heist-Jazz-Loop, gedämpft), `music_negotiation` (tickende Uhr + Bass, Tempo steigt in den letzten 10 s), `music_reveal` (Spannungs-Drone).
Stumm muss alles funktionieren; Countdown und Karten sind rein visuell lesbar.

---

## 7. Ergänzungen, die der Pitch nicht hatte

| Ergänzung                     | Warum                                                                                             |
|-------------------------------|---------------------------------------------------------------------------------------------------|
| Bankgebühr + Deckel + Jackpot | Verhindert Endlos-Frieden; Eskalation ist ein Design-Pfeiler.                                     |
| Allgemeine Auszahlungsformel  | Der Pitch hatte nur ein 4-Spieler-Beispiel; jetzt für 3–8 definiert und testbar.                   |
| Freie Verteil-UI für den Dieb | Rache als Feature; erzeugt den zweiten Comedy-Moment.                                              |
| Reveal-Reihenfolge Teiler→Diebe | Garantiert Spannung bis zur letzten Karte, macht Doppel-Dieb-Twist inszenierbar.                 |
| Eid-Modus                     | Verwandelt die Verhandlung in ein Spiel mit Konsequenzen.                                           |
| Maulwurf-Modus                | Rettet zu brave Gruppen, gibt Ausreden, garantiert Action.                                          |
| Bedenkzeit-Timer              | Verhindert Tells durch lange Grübelzeit.                                                            |
| Vertrauens-Index / Statistik  | Das Spiel produziert Charakterprofile der Freunde — das ist der Grund, es nochmal zu spielen.       |
| NPC Herr Kassel               | Ein Moderator macht die Show lesbar und gibt dem Spiel eine Stimme ohne Text-Wände.                 |
| 3 Spieler Minimum             | Bei 2 ist die Reveal-Reihenfolge trivial und das Dilemma flach.                                     |

## 8. Nicht-Ziele (v1)

Kein Multi-Device, kein Backend, keine Accounts, keine Ads, kein 3D, keine Echtgeld-Metapher (Münzen sind eindeutig Cartoon-Schlücke, kein Casino-Look).

## 9. Erfolgskriterien (Definition of Done v1.0)

1. Regeln nach einer Runde ohne Erklärung verstanden.
2. Reveal-Show läuft mit ≥ 55 fps auf iPhone 11 / Pixel 4a; Low-Effects ≥ 30 fps.
3. Lighthouse Mobile Perf ≥ 90, PWA installierbar, First Load ≤ 1.5 MB gzip.
4. Auszahlungslogik zu 100 % unit-getestet für n = 3…8, k = 0…n, alle Modi, Deckel/Jackpot.
5. Alle 13 Inszenierungen aus §4.4: 11 Outcome-Sequenzen (2 × Alle teilen, 3 × Alleingang, 3 × Mehrere Diebe, 2 × Schlägerei, 1 × Jackpot) + 2 Overlays (Meineid, Maulwurf).
6. Playtest mit einer echten 4–6er-Gruppe: in ≥ 6 von 8 Runden hörbare Reaktion bei der letzten Karte.
