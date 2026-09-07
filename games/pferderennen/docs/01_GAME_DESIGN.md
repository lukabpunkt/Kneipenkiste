# 01 – Game Design Document (GDD)

## 1. Elevator Pitch

**Pferderennen** ist ein Trinkspiel für 2–12 Personen an einem Gerät. Sechs bunte Cartoon-Pferde mit Persönlichkeit rennen über eine Bahn, auf der ständig Blödsinn passiert: Bananenschalen fliegen ins Bild, ein Pferd kotzt, ein Jockey fällt runter. Jeder Spieler setzt Schlücke auf ein Pferd. Wer aufs Siegerpferd gesetzt hat, verteilt seine Schlücke an die anderen; alle anderen trinken, was sie selbst gesetzt haben. Der Sieger ist **absolut zufällig** und bleibt **bis zur Ziellinie** offen.

Design-Leitsätze:

1. **Fair wie ein Würfel.** Kein Pferd ist besser. Kein Muster, das man lernen kann.
2. **Spannend bis zum Schluss.** Führungswechsel sind die Regel, nicht die Ausnahme.
3. **Jedes Rennen ist eine Show.** Zuschauen muss auch dann Spaß machen, wenn man selbst nicht gewinnt.
4. **Null Reibung.** Vom Öffnen der Seite bis zum ersten Rennen in unter 60 Sekunden.

## 2. Die sechs Pferde

Alle Pferde sind **spielmechanisch identisch**. Unterschiede sind ausschließlich visuell und im „Charakter“ (Kommentator-Sprüche, Idle-Animationen). Jedes Pferd hat eine Signaturfarbe, die auf **Stall (Startbox), Sattel, Jockey-Trikot, Zaumzeug, Lane-Marker, Wett-Chips und Konfetti** angewendet wird. Fellfarbe und Silhouette unterscheiden sich zusätzlich, damit die Pferde auch ohne Farbe erkennbar sind (Barrierefreiheit).

| #   | Name                | Signaturfarbe        | Fell / Look                                                    | Charakter (nur Flavor)                        | Beispiel-Kommentar                                                                    |
| --- | ------------------- | -------------------- | -------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | **Sir Trabsalot**   | Royal-Lila `#8B5CF6` | Schwarz glänzend, weiße Blesse, kleiner Ritterhelm am Jockey   | Edel, hochnäsig, hält sich für Adel           | „Sir Trabsalot galoppiert, als hätte er einen Stock verschluckt – einen sehr teuren.“ |
| 2   | **Prosecco Rakete** | Pink `#EC4899`       | Weiß-rosa, Glitzer-Mähne, Sonnenbrille                         | Party-Pferd, laut, immer gut drauf            | „Prosecco Rakete zündet die zweite Stufe – oder war das nur ein Rülpser?“             |
| 3   | **Kater Morgana**   | Rot `#EF4444`        | Rotbraun, zerzaust, Augenringe, Kaffeebecher am Sattel         | Verkatert, unberechenbar, mal Turbo, mal Koma | „Kater Morgana hat gestern definitiv das Falsche gemischt.“                           |
| 4   | **Schnapsidee**     | Grün `#22C55E`       | Schecke grün-weiß, Kleeblatt am Zaumzeug                       | Chaotisch, macht Dinge, die niemand versteht  | „Schnapsidee nimmt eine Abkürzung, die es nicht gibt.“                                |
| 5   | **Hopfen Hengst**   | Bernstein `#F59E0B`  | Fuchs mit blonder Mähne, Bierbauch, Brezel am Sattel           | Gemütlich, bayrisch, kraftvoll aber träge     | „Hopfen Hengst rollt an – wie ein Fass, das den Berg runter will.“                    |
| 6   | **Wodka Wirbel**    | Eisblau `#06B6D4`    | Apfelschimmel weiß-grau, Frost-Effekt, Ushanka-Mütze am Jockey | Kalt, effizient, nervös zuckend               | „Wodka Wirbel läuft, als hätte jemand die Zeitlupe vergessen.“                        |

> Namen und Charaktere sind final. Bei Bedarf können in `src/data/horses.js` weitere Kommentator-Zeilen ergänzt werden.

## 3. Spielablauf (Core Loop)

```
[Start-Screen] → [Spieler anlegen] → [Wetten platzieren] → [Rennen] → [Ergebnis & Schlücke] → (nächste Runde) → [Wetten platzieren] …
```

### 3.1 Start-Screen

- Titel mit animierten Pferden im Hintergrund (Idle-Loop).
- Buttons: **„Los geht's“**, **„Regeln“**, **„Einstellungen“** (Sound, Event-Häufigkeit, Renndauer).
- Wenn eine vorherige Session in `localStorage` liegt: **„Weiterspielen (4 Spieler)“**.

### 3.2 Spieler anlegen

- Namen eingeben (2–12 Spieler). Jeder Spieler bekommt automatisch ein Emoji-Avatar (zufällig, änderbar).
- Namen werden in `localStorage` gespeichert, damit man beim nächsten Abend nicht neu tippen muss.
- Validierung: Name 1–14 Zeichen, keine Duplikate.

### 3.3 Wetten platzieren

- Alle sechs Pferde werden als Karten angezeigt (Farbe, Name, Portrait, kurzer Charakter-Satz).
- Der Reihe nach wählt jeder Spieler **ein Pferd** und einen **Einsatz in Schlücken (1–10, Default 3)** über einen großen +/- Stepper. Mehrere Spieler dürfen auf dasselbe Pferd setzen.
- Anzeige „Wer setzt gerade?“ groß und klar, damit das Handy weitergereicht werden kann.
- Übersicht am Ende: Tabelle Spieler → Pferd → Einsatz. Button **„Rennen starten“** erst aktiv, wenn alle gesetzt haben.
- **Wetten übernehmen:** Ab dem zweiten Rennen öffnet der Wett-Screen mit einer Karte „Beim letzten Rennen habt ihr so gesetzt“ und den Wetten des Vorrennens. **„Wetten übernehmen“** stellt sie wieder her und führt direkt in die Übersicht; **„Alle neu setzen“** startet die Runde wie gehabt reihum. Damit kostet ein Wiederholungsrennen drei Taps, unabhängig davon, wie viele mitspielen.
- **Einsatz in der Zeile:** Jede Zeile der Übersicht trägt ⊖ und ⊕ neben der Schluckzahl. Einen Schluck rauf oder runter kostet einen Tap, ohne den Screen zu wechseln — das ist der häufigste Fall am Tisch: Das Pferd bleibt, der Einsatz steigt.
- **Einzeln ändern:** Für ein anderes Pferd (oder eine andere Wettart) ist die linke Hälfte der Zeile antippbar und führt in die Pferdeauswahl für genau diesen Spieler. Wer nach dem letzten Rennen dazugekommen ist, steht als **„noch offen“** in der Liste — dieselbe Zeile, derselbe Weg. „Rennen starten“ bleibt gesperrt, solange eine Wette offen oder eine Änderung nicht bestätigt ist.
- Die übernommenen Wetten überleben einen Reload und verlieren die Wetten von Spielern, die inzwischen gegangen sind.
- Noch offen (Einstellung): **Quick-Bet** – ein Tap auf die Pferdekarte übernimmt den letzten Einsatz. Kleiner als das Obige: es geht um den Einsatz je Karte, nicht um die ganze Runde.

### 3.4 Rennen

- **Vollbild auf dem Handy:** Mit „Rennen starten“ nimmt sich das Spiel den ganzen Bildschirm und gibt ihn zurück, sobald der Renn-Screen verlassen wird. Ein Handy liegt beim Rennen in der Tischmitte und sechs Leute schauen zu — die Adressleiste kostet dort ein Drittel der Fläche. Nur auf Touchgeräten: auf dem Desktop ist das Fenster ohnehin groß und ein ungefragter Vollbildwechsel erschreckt eher.
  - **Auf dem iPhone gibt es das nicht.** Safari auf dem iPhone kennt die Fullscreen-API nicht (nur für `<video>`); das iPad kann es. Dort hilft nur „Zum Home-Bildschirm hinzufügen“ — als installierte PWA läuft das Spiel ohnehin ohne Browser-Leiste.
- Countdown „3 – 2 – 1 – LOS!“ mit Startboxen, die aufklappen.
- Die sechs Pferde laufen auf sechs Bahnen von links nach rechts (Desktop) bzw. die Kamera folgt dem Feld (Mobile Portrait: Bahn vertikal von unten nach oben, siehe Design System).
- Dauer: **25–40 Sekunden** (konfigurierbar: kurz 20 s / normal 30 s / lang 45 s).
- Während des Rennens: Live-Kommentator (Textzeile unten, wechselt alle 2–4 s), Positionsanzeige (Mini-Leaderboard rechts oben), Events (siehe §4).
- **Fotofinish:** Wenn zwei oder mehr Pferde innerhalb der letzten 3 % der Strecke nah beieinander sind, wechselt das Spiel für 1,5 s in Zeitlupe mit Kamerablitz-Effekt.
- Zieleinlauf: Konfetti in der Siegerfarbe, Siegerpferd macht Jubel-Animation, die anderen trotten ein.
- **Kein Skip-Button während des Rennens** (bewusst – die Spannung ist der Punkt). Ausnahme: Einstellung „Rennen überspringbar“ für Tests.

### 3.5 Ergebnis & Schlücke

- Podium 1–2–3 mit Pferden und Farben.
- **Verteilung:**
  - Gewinner (alle Spieler, die auf das Siegerpferd gesetzt haben): „**Du verteilst X Schlücke**“ – große Karte mit Namen.
  - Verlierer: „**Du trinkst X Schlücke**“ (jeweils ihr eigener Einsatz).
  - Wenn niemand aufs Siegerpferd gesetzt hat: **„Das Haus gewinnt – alle trinken ihren Einsatz!“**
- Buttons: **„Nächstes Rennen“** (Spieler bleiben, Wetten neu), **„Spieler ändern“**, **„Session-Statistik“**.
- Session-Statistik: pro Spieler Schlücke getrunken / verteilt, Siege, längste Pechsträhne. Rein informativ, wird in `localStorage` gehalten.

## 4. Event-Katalog (Dinge, die während des Rennens passieren)

Events sind das Salz des Spiels. Sie sind **rein visuell-dramaturgisch und fair**: Jedes Event trifft ein zufälliges Pferd mit identischer Wahrscheinlichkeit, und der Effekt auf die Geschwindigkeit ist Teil der Simulation, die insgesamt zu 1/6 pro Pferd führt (siehe `03_RACE_ENGINE.md`). Pro Rennen passieren **3–6 Events** (Einstellung „Chaos-Level“: ruhig 1–3 / normal 3–6 / Vollgas 6–10).

Jedes Event hat: Trigger-Fenster (wann im Rennen es passieren darf), Effekt (Geschwindigkeit/Verzögerung), Animation, Sound-Cue, Kommentator-Zeile, ggf. Trinkregel (optional aktivierbar).

### 4.1 Negativ-Events (Pferd wird gebremst)

| ID         | Name                 | Effekt                                                                                      | Animation                                                                                              | Kommentar                        | Trinkregel (optional)                               |
| ---------- | -------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------- |
| `banana`   | **Bananenschale**    | Rutscht 0,8 s, dreht sich 360°, verliert Tempo                                              | Schale fliegt vom oberen/unteren Bildrand in eine Bahn, landet mit Wobble, Pferd rutscht mit Sternchen | „Wer wirft hier Bananen?!“       | Wer auf dieses Pferd gesetzt hat: 1 Schluck         |
| `stumble`  | **Umknicken**        | Stolpert, 0,6 s fast Stillstand, dann Humpel-Animation für 2 s mit −15 % Tempo              | Vorderbein knickt, Kopf nickt nach vorne, Staubwolke                                                   | „Autsch! Das war der Knöchel.“   | –                                                   |
| `vomit`    | **Kotzen**           | Bleibt 1,5 s stehen, danach Normaltempo                                                     | Pferd stoppt, Kopf runter, grüne Pixelfontäne, Pfütze bleibt auf der Bahn (Deko)                       | „Zu viel Hafer-Schnaps gestern!“ | Alle, die auf dieses Pferd gesetzt haben: 1 Schluck |
| `pee`      | **Pinkelpause**      | Bleibt 1,2 s stehen                                                                         | Pferd stellt sich quer, kleine Pfütze, erleichtertes Gesicht                                           | „Wenn's drückt, dann drückt's.“  | –                                                   |
| `nap`      | **Nickerchen**       | Verlangsamt über 0,5 s auf 0, schläft 1,0 s, wacht erschrocken auf und sprintet 1 s (+30 %) | ZZZ-Partikel, Augen zu, dann Schreck-Ausrufezeichen                                                    | „Ist das… Schnarchen?“           | –                                                   |
| `pigeon`   | **Tauben-Attacke**   | −25 % für 1,5 s, Pferd läuft Zickzack                                                       | Taube landet auf Kopf, flattert, Pferd schüttelt sich                                                  | „Eine Taube! Mitten im Rennen!“  | –                                                   |
| `hiccup`   | **Schluckauf**       | Läuft 2 s ruckelig (Tempo pulsiert ±20 %)                                                   | Pferd hüpft bei jedem „Hicks“, Sprechblase „hicks“                                                     | „Hicks!“                         | Alle trinken 1 Schluck (Schluckauf ist ansteckend)  |
| `mud`      | **Schlammloch**      | −30 % für 1 s                                                                               | Braune Spritzer, Pferd wird kurz dreckig (bleibt bis Ziel)                                             | „Direkt in die Pfütze!“          | –                                                   |
| `selfie`   | **Foto-Pause**       | Stoppt 1,0 s                                                                                | Fan am Bildrand hält Handy hoch, Pferd posiert, Blitz                                                  | „Erst mal ein Selfie!“           | –                                                   |
| `grass`    | **Grasen**           | −40 % für 1,5 s                                                                             | Pferd senkt Kopf, kaut, Grashalme fliegen                                                              | „Mittagspause?“                  | –                                                   |
| `confused` | **Orientierungslos** | Läuft 0,7 s rückwärts, dann weiter                                                          | Fragezeichen über dem Kopf, Pferd dreht sich                                                           | „Falsche Richtung, Kumpel!“      | –                                                   |
| `wardrobe` | **Hufeisen weg**     | −10 % bis Ziel, Hufeisen fliegt weg                                                         | Hufeisen segelt in Zeitlupe davon, Funken                                                              | „Da fliegt das Glück davon!“     | –                                                   |

### 4.2 Positiv-Events (Pferd wird beschleunigt)

| ID             | Name                    | Effekt                                                  | Animation                                                                  | Kommentar                              | Trinkregel (optional)                                 |
| -------------- | ----------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| `carrot`       | **Möhre am Stock**      | +35 % für 1,5 s                                         | Möhre baumelt vor der Nase, Augen werden groß, Speedlines                  | „Möhre gesichtet! Turbo!“              | –                                                     |
| `rainbow_fart` | **Regenbogen-Furz**     | +50 % für 1 s                                           | Regenbogen-Trail hinter dem Pferd, Sternchen, Pferd guckt peinlich berührt | „Der Antrieb der Zukunft.“             | Alle lachen und trinken 1 Schluck                     |
| `jockey_off`   | **Jockey fällt runter** | +20 % für 2 s (ohne Gewicht!)                           | Jockey purzelt ab, kullert, Pferd läuft mit fröhlichem Gesicht weiter      | „Ohne Ballast läuft's besser!“         | Wer auf dieses Pferd gesetzt hat: 1 Schluck verteilen |
| `espresso`     | **Espresso-Kick**       | +30 % für 2 s, Pferd zittert                            | Kaffeetasse-Icon, Augen weit offen, Vibrations-Animation                   | „Doppelter Espresso, doppeltes Tempo!“ | –                                                     |
| `tailwind`     | **Rückenwind**          | +20 % für 2 s                                           | Windlinien, Mähne fliegt, Blätter wehen                                    | „Der Wind hat Favoriten!“              | –                                                     |
| `slipstream`   | **Windschatten**        | Wenn direkt hinter einem anderen Pferd: +15 % für 1,5 s | Luftwirbel-Partikel                                                        | „Windschatten – clever!“               | –                                                     |
| `rocket_boots` | **Feder-Hufe**          | 2 große Sprünge (+40 % für 1 s), Pferd fliegt kurz      | Sprungfeder-Effekt, Schatten löst sich                                     | „Boing! Boing!“                        | –                                                     |

### 4.3 Neutrale / Show-Events (betreffen alle oder keinen)

| ID              | Name                   | Effekt                                       | Animation                                                                                | Kommentar                                 |
| --------------- | ---------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| `streaker`      | **Flitzer**            | Kein Tempo-Effekt; kurz Kamerashake          | Nackte Pixelfigur rennt quer über alle Bahnen, Sicherheitsleute hinterher                | „Ein Flitzer! Sicherheit! SICHERHEIT!“    |
| `tumbleweed`    | **Steppenläufer**      | Kein Effekt                                  | Steppenläufer rollt langsam von links nach rechts durchs Bild                            | „…“ (Kommentator schweigt bedeutungsvoll) |
| `camera_flash`  | **Blitzlichtgewitter** | Kein Effekt                                  | Weiße Blitze am Rand, kurzes Flackern                                                    | „Die Presse ist außer Rand und Band!“     |
| `ufo`           | **UFO**                | Kein Effekt (rein visuell, sehr selten, 2 %) | UFO zieht über die Bahn, Traktorstrahl leuchtet kurz auf ein Pferd, passiert aber nichts | „Hab ich das gerade wirklich gesehen?“    |
| `slowmo_finish` | **Fotofinish**         | Systemevent (siehe §3.4)                     | Zeitlupe, Blitze                                                                         | „FOTOFINISH!“                             |

### 4.4 Event-Regeln

- Events sind **fair**: Das betroffene Pferd wird uniform aus allen sechs gezogen; Bahn und aktuelle Position haben keinen Einfluss (Ausnahme: `slipstream` und `streaker`, deren Bedingungen positionsabhängig, aber symmetrisch sind – siehe Engine-Doku).
- **Kein Event in den ersten 8 % und den letzten 5 % der Strecke** (Start soll sauber sein, das Finish soll durch Tempo entschieden werden, nicht durch einen Last-Second-Sturz).
- Pro Pferd **maximal 2 Events pro Rennen**, damit kein Pferd „gemobbt“ wirkt.
- Zwischen zwei Events **mindestens 2 s** Abstand, damit die Zuschauer jedes Event mitbekommen.
- Die Trinkregeln zu Events sind **optional** (Einstellung „Event-Trinkregeln“, default **an**). Wenn aktiv, erscheint beim Event ein Toast unten: „🍺 Team Kater Morgana: 1 Schluck!“

## 5. Bonus-Ideen (Backlog, nach Priorität)

Diese Ideen sind **nicht** Teil des MVP. Sie sind in `05_MILESTONES.md` den späteren Meilensteinen zugeordnet oder liegen im Backlog.

### Priorität A – im Plan (M7/M8)

1. **Live-Kommentator** mit ~80 Zeilen (allgemein, pro Pferd, pro Event, Führungswechsel, Fotofinish, Sieg). Ist im Event-System bereits vorgesehen.
2. **Session-Statistik** (siehe §3.5).
3. **Sound-Design:** Hufgetrappel (Tempo-abhängig), Menge, Startglocke, Event-Sounds (Rutsch, Kotz-Blubb, Furz-Tröte, Taube), Fanfare. Alles als kleine synthetisierte Sounds (Web Audio API) oder kurze OGG/MP3-Files < 50 KB. Mute-Toggle prominent.
4. **Wettarten:**
   - _Sieg_ (Standard): Pferd wird Erster → Gewinner verteilt Einsatz.
   - _Platz:_ Pferd wird 1.–3. → Gewinner verteilt halben Einsatz (aufgerundet), Verlierer trinken vollen Einsatz. Risikoärmer.
   - _Letzter:_ Pferd wird Letzter → Gewinner verteilt doppelten Einsatz. Hoher Reiz.
5. **Führungswechsel-Regel** (Einstellung): Bei jedem Führungswechsel im letzten Streckendrittel trinken alle 1 Schluck. Sorgt für Mitfiebern.

### Priorität B – Backlog

6. **Jackpot-Runde:** Jede 5. Runde ist „Doppelt oder nichts“ – alle Einsätze zählen doppelt. Ankündigung mit Sirenen-Overlay.
7. **Pechvogel-Bonus:** Wer 3× in Folge verloren hat, darf beim nächsten Rennen kostenlos 2 Schlücke zusätzlich setzen (nur verteilen, nicht trinken). Rein spielerisch, verändert nicht die Pferde.
8. **Sudden-Death-Modus:** Am Ende der Session wird ein finales Rennen mit allen verbleibenden Schlücken × 2 gespielt.
9. **Wetter-Varianten:** Regen (Pfützen-Events häufiger, Wischeffekt), Nacht (Flutlicht, Glühwürmchen), Schnee (Schneebälle als Event). Rein visuell, Event-Gewichte pro Wetter identisch für alle Pferde.
10. **Strecken-Varianten:** Rasen, Sand, Strand, Mond (niedrige Gravitation: höhere Sprünge, gleiche Fairness).
11. **Share-Card:** Nach dem Rennen ein PNG (Canvas → Blob) mit Podium und Statistik zum Teilen in die Gruppe.
12. **Tippspiel-Modus ohne Alkohol:** „Schlücke“ werden zu „Punkten“; Text-Umschalter in den Einstellungen (nützlich, wenn Fahrer mitspielen).
13. **Zuschauer-Reaktionen:** Tippen auf den Bildschirm während des Rennens lässt Emojis aufsteigen (👏🔥😱). **Kein** Einfluss auf das Rennen – rein Feedback.
14. **Rennhistorie:** Letzte 20 Rennen mit Siegerfarben als kleine Punkte im Startscreen. Zeigt visuell, dass jedes Pferd mal gewinnt (Vertrauensbildung). Achtung: keine „Hot Streak“-Anzeige, die Spielern Muster suggeriert.
15. **Wett-Quoten-Fake-Anzeige:** Bewusst **nicht** umsetzen. Quoten suggerieren unterschiedliche Chancen und widersprechen dem Fairness-Leitsatz.

## 6. Einstellungen (Settings-Screen)

| Einstellung                          | Optionen                                                         | Default |
| ------------------------------------ | ---------------------------------------------------------------- | ------- |
| Renndauer                            | Kurz (≈20 s) / Normal (≈30 s) / Lang (≈45 s)                     | Normal  |
| Chaos-Level (Events)                 | Ruhig / Normal / Vollgas                                         | Normal  |
| Event-Trinkregeln                    | An / Aus                                                         | An      |
| Führungswechsel-Regel                | An / Aus                                                         | Aus     |
| Wettart                              | Sieg / Platz / Letzter / Frei wählbar pro Spieler                | Sieg    |
| Sound                                | An / Aus                                                         | An      |
| Vibration (Mobile)                   | An / Aus                                                         | An      |
| Alkoholfrei-Modus (Wording „Punkte“) | An / Aus                                                         | Aus     |
| Reduzierte Bewegung                  | Automatisch aus `prefers-reduced-motion`, manuell überschreibbar | Auto    |
| Rennen überspringbar (Debug)         | An / Aus                                                         | Aus     |
| Seed anzeigen (Debug)                | An / Aus                                                         | Aus     |

## 7. Nicht-Ziele (Scope-Grenzen)

- Kein Multiplayer über mehrere Geräte, kein Backend, keine Accounts.
- Kein Echtgeld, keine In-App-Käufe, keine Werbung.
- Keine 3D-Grafik.
- Keine Kampagne / Progression / Freischaltungen. Das Spiel ist nach 60 s vollständig verstanden.

## 8. Verantwortungsvoller Umgang

- Im Regeln-Screen ein dezenter Hinweis: „Trinkt verantwortungsvoll. Wasser ist auch ein Getränk. Fahrer setzen Punkte statt Schlücke.“
- Der Alkoholfrei-Modus muss gleichwertig Spaß machen (gleiche Animationen, gleiche Events).
- Maximaler Einsatz pro Rennen ist 10 Schlücke; keine Funktion, die Einsätze exponentiell wachsen lässt.
