# SPRENGMEISTER — Game Design Document (GDD)

> Version 1.0 · Stand: 2026-09-04 · Autor: Planung (Cowork) · Zielgruppe: Claude Code + Luka
> Dieses Dokument ist die **Wahrheit** für das Spielverhalten. Bei Widersprüchen zu Code gewinnt das GDD. Schwesterprojekte: **Drinkshot**, **Der Tresor** (gleicher Stack, gleiche Design-Sprache, gleiche Charaktere).

---

## 1. Elevator Pitch

**Sprengmeister** ist ein Pass-the-Phone-Partyspiel für 3–8 Personen: eine Schatzsuche auf einem Feld voller Minen, die deine Freunde gelegt haben. Irgendwo unter 25 Erdplatten liegt die Bierkiste. Beim Rumgeben vergräbt jeder heimlich zwei Minen. Dann liegt das Handy in der Mitte und reihum gräbt jeder ein Feld auf: Wurm, Hinweis, Kiste — oder **BUMM**, und die Farbe dessen, der die Mine gelegt hat, leuchtet über dem Krater. Die eigenen Minen sind für einen selbst harmlos. Man kennt also zwei sichere Felder, die sonst niemand kennt — und jede Grabung verrät ein bisschen davon.

**Genre:** Party / Räumliche Taktik / Trinkspiel · **Plattform:** Web (Mobile First, PWA) · **Rundendauer:** 60–120 s · **Spielerzahl:** 3–8 (Sweet Spot 4–6)

**Design-Pfeiler (Reihenfolge = Priorität):**
1. **Jeder Tap ist ein Nervenmoment** — das Graben muss sich anfühlen wie das Ziehen einer Jenga-Klotz.
2. **Der Schuldige ist immer sichtbar** — jede Explosion hat einen Namen; das Spiel erzeugt Rache-Schleifen.
3. **Slapstick** — Explosionen sind Cartoon-Gags, nie hässlich.
4. **Lesbarkeit** — man muss das Feld auf einen Blick lesen können: was ist offen, was ist Krater, wer hat's gelegt, wo ist es heiß.
5. **Zero Friction** — Minen legen in 5 Sekunden, Regeln in einem Satz.

---

## 2. Core Loop

```
LOBBY → [GEHEIM: PASS → MINEN LEGEN (×n)] → [GRABEN reihum, bis Kiste gefunden] → [AUSZAHLUNG] → RESULT
                ▲                                                                              │
                └───────────────────────────── Nächste Runde (neues Feld) ◄────────────────────┘
```

Eine **Runde** = geheime Minenphase + Grabphase bis zum Kistenfund + Auszahlung.
Eine **Session** = beliebig viele Runden; Scoreboard, Minen-Statistik und "Meistgesprengt" laufen über die Session.

---

## 3. Spielregeln (verbindlich)

### 3.1 Spieler & Farben

- 3–8 Spieler. Bei 2 startet das Spiel nicht ("Zu zweit weißt du immer, wer die Mine gelegt hat. Holt noch jemanden.").
- Farben, Symbole, Namensregeln **identisch zu Drinkshot**. Die Charaktere sind die **Shotlings**, hier als **Diggers**: Bauhelm in Spielerfarbe, Schaufel, optional Warnweste.

### 3.2 Das Feld

| Spieler | Feldgröße | Minen pro Spieler | Minen gesamt | Freie Felder (ohne Kiste) |
|---------|-----------|-------------------|--------------|---------------------------|
| 3–5     | 5 × 5 = 25 | 2                | 6–10         | 14–18                      |
| 6–8     | 6 × 6 = 36 | 2                | 12–16        | 19–23                      |

- Jedes Feld ist eine **Erdplatte** (verdeckt). Darunter kann liegen: nichts, eine oder mehrere Minen, die Kiste, oder Mine(n) **und** Kiste.
- **Die Kiste** wird vom Spiel nach der Minenphase mit sicherem Zufall (`crypto`) auf ein beliebiges Feld gelegt — **auch auf ein vermintes**. Niemand kennt die Position.
- **Minen stapeln:** Legen zwei Spieler auf dasselbe Feld, liegen dort zwei Minen. Wer es aufgräbt, erwischt beide (siehe 3.5). Die Spieler wissen beim Legen nicht, ob ein Feld schon belegt ist.

### 3.3 Geheime Minenphase (Handy rumgeben)

- Reihenfolge: Spieler 1 → n, jeweils Privacy-Screen → **Minen-Screen**: das leere Feld, "Lege 2 Minen." Tap auf eine Platte setzt eine Mine (Platte hebt sich, Mine wird reingeschoben, Platte klappt zu, Erde rieselt), zweiter Tap auf dieselbe Platte entfernt sie wieder. Bei 2 gesetzten Minen wird **"Vergraben"** aktiv → 400 ms Bestätigung (Platten stampfen sich fest), dann nächster Privacy-Screen.
- Der Minen-Screen zeigt **kein** Ergebnis vorheriger Spieler. Das Feld sieht für jeden gleich leer aus.
- Optionaler Bedenkzeit-Timer (Setting, 10 s): danach werden die fehlenden Minen zufällig gesetzt (mit Hinweis).
- Nach dem letzten Spieler: Screen "Alle Minen vergraben. Handy in die Mitte." → Tap startet die Grabphase. Hier legt das Spiel die Kiste.

### 3.4 Grabphase (Handy in der Mitte)

- Reihum in Spielerreihenfolge; die **Startspieler-Position rotiert** jede Runde um eins (sonst hat Spieler 1 immer den ersten, sichersten Zug).
- Das Feld zeigt oben groß, wer dran ist (Badge + "Rudi gräbt"). Nur der aktive Spieler darf tippen — sozial durchgesetzt, das Handy liegt in der Mitte; technisch ist jeder Tap gültig.
- **Ein Tap = eine Platte aufgraben.** Bereits offene Platten sind nicht tippbar. Optionaler Zug-Timer (Setting, 10 s): danach wird zufällig gegraben.
- **Was passieren kann (Ergebnis wird sofort inszeniert):**

| Ergebnis | Bedingung | Inszenierung (kurz) | Konsequenz |
|---|---|---|---|
| **Leer + Hinweis** | Keine Mine, keine Kiste | Schaufel, Wurm/Käfer/Knochen winkt, Platte wird zum offenen Loch mit **Temperatur-Symbol** | Nichts. Hinweis bleibt sichtbar. |
| **Eigene Mine** | Nur eigene Mine(n) | **Stumm.** Platte öffnet sich wie ein leeres Feld, Hinweis erscheint. Die Mine ist verbraucht. | Nichts. Niemand erfährt, dass hier eine Mine lag — die eigenen Minen sind die sicheren Trittsteine. |
| **Fremde Mine(n)** | ≥ 1 fremde Mine (eigene zusätzlich egal) | **BUMM.** Krater, Digger fliegt, Hit-Sequenz (§4), **Farben der Leger** über dem Krater | Gräber trinkt **2 pro fremder Mine**. Jeder Leger erhält **1 Verteil-Token**. |
| **Kiste** | Kiste, keine fremde Mine | Fanfare, Kiste springt aus dem Loch, Treasure-Sequenz (§4) | Finder erhält **4 Verteil-Tokens** (6 × 6: 6). Runde endet. |
| **Kiste + fremde Mine** | "Der Preis der Gier" | Explosion, dann kommt die Kiste angesengt aus dem Rauch | Beides: Gräber trinkt 2 pro fremder Mine **und** erhält die Kisten-Tokens. Runde endet. |

- **Temperatur-Hinweis** (auf jedem offenen leeren Feld, auch auf Kratern): Chebyshev-Abstand zur Kiste (Königszüge): **HEISS** (Abstand 1) 🔥, **WARM** (Abstand 2) ☀️, **KALT** (Abstand ≥ 3) ❄️. Bewusst unscharf, damit die Kiste nicht in zwei Zügen gefunden wird; typische Runde 4–8 Grabungen.
- **Rundenende:** Kiste gefunden. (Theoretischer Fall "alle Felder offen, keine Kiste" ist unmöglich, da die Kiste immer auf einem Feld liegt.)
- **Kein Spieler scheidet aus**; wer gesprengt wurde, gräbt in der nächsten Runde der Reihe normal weiter (er ist ja nur "rußig").

### 3.5 Auszahlung

- **Sofort während der Grabphase:** Trinken passiert direkt bei der Explosion ("Anna trinkt 2" als Banner, Handy bleibt liegen, weiter geht's).
- **Verteil-Tokens** werden gesammelt und **am Rundenende** verteilt: Auf dem Distribute-Screen bekommt jeder Spieler mit Tokens nacheinander das Handy (Reihenfolge: Finder zuerst, dann Leger in Legereihenfolge) und tippt Badges an (+1 pro Tap, Long-Press −1), bis alle Tokens vergeben sind. Man darf **nicht** an sich selbst verteilen. Alles auf eine Person ist erlaubt.
- Result-Screen fasst zusammen: wer wie viel getrunken hat, wer wen gesprengt hat, wer die Kiste fand.

### 3.6 Modi (Session-Setting, kombinierbar)

| Modus | Änderung | Zweck |
|---|---|---|
| **Klassik** (Default) | Wie oben. | Einstieg. |
| **Doppelagent** | Jeder legt 1 echte Mine + 1 **Blindgänger**. Der Blindgänger macht beim Aufgraben "Pfff", Rauchwölkchen, Digger erschrickt — aber nichts passiert, und die Farbe des Legers wird trotzdem gezeigt. | Bluff: Man sieht, wer dort gelegt hat, weiß aber vorher nicht, ob's knallt. Leger sammeln Informationen darüber, wie die anderen graben. |
| **Nachtgräber** | Keine Temperatur-Hinweise. Offene leere Felder zeigen nur den Wurm. | Längere Runden, reiner Zufall + Minenlesen. Für große Gruppen mit 6 × 6. |
| **Zwei Kisten** | Zwei Kisten (je halbe Tokens: 2 / 3). Runde endet beim zweiten Fund. | Mehr Grabungen, mehr Explosionen pro Runde. |
| **Kettenreaktion** | Explodiert eine Mine, explodieren alle Minen auf den 8 Nachbarfeldern mit (Krater, Hinweise sichtbar, Leger gezeigt) — ohne dass jemand trinkt. | Chaos-Modus: räumt das Feld, verrät Minenleger, gibt "Puh, Glück gehabt"-Momente. |
| **Sprengmeister-Bonus** | Wer in einer Runde **zwei** Spieler mit seinen Minen erwischt, bekommt 1 Extra-Token; wer **beide** eigenen Minen "silent" aufgräbt (die eigenen als Trittsteine benutzt), trinkt 1 ("Feigling"). | Belohnt gute Platzierung, bestraft übervorsichtiges Spiel. |

### 3.7 Result-Screen

- Banner: **"{Finder} hat die Kiste!"** (oder "Der Preis der Gier" / "Doppelfund").
- **Feld-Replay:** Das fertige Feld, alle Platten aufgedeckt (auch nicht gegrabene — jetzt sieht man alle Minen mit Legerfarbe!). Das ist der zweite große Moment: "DA lag deine Mine? Direkt neben meinem Zug!"
- Trinker-Zeilen, Token-Verteilung, Kill-Feed ("Rudi → Anna", "Marc → Rudi").
- Session-Statistik aufklappbar: getrunken gesamt, **Sprengungen verursacht**, **Sprengungen kassiert**, **Kisten gefunden**, "Meistgesprengt", "Gefährlichster Leger".
- Buttons: Nächste Runde · Spieler ändern · Modus ändern.

---

## 4. Inszenierungen (das Herzstück)

Alle Sequenzen sind **Cartoon-Slapstick**: Ruß, Sternchen, fliegende Helme, Rauchringe, verbogene Schaufeln. Kein Blut, keine Verletzung. Der Digger steht danach immer wieder auf (rußig, mit zerzaustem Haar), weil er ja weitergräbt.

### 4.1 Hit-Sequenzen (fremde Mine) — mindestens 8 bis Release

Der Digger des aktiven Spielers steht neben der Platte und gräbt (Schaufel-Anticipation, 3 Stöße). Dann:

- `hit_classic_launch`: Rauchpilz, Digger fliegt kerzengerade nach oben aus dem Bild, 1 s Stille, kommt rußgeschwärzt kopfüber wieder runter und steckt mit dem Kopf im Krater, Beine strampeln, Helm landet 300 ms später oben drauf.
- `hit_soot_face`: Kleine Explosion direkt ins Gesicht: Digger bleibt stehen, Gesicht komplett schwarz, Augen blinzeln weiß, Haare stehen als Fächer hoch, hustet ein Rauchringchen, kippt steif nach hinten.
- `hit_helmet_rocket`: Der Helm schießt wie eine Rakete davon (Rauchspur, kreist), Digger schaut hinterher, Helm kommt zurück und trifft ihn am Kopf, Sternchen.
- `hit_shovel_pretzel`: Explosion verbiegt die Schaufel zur Brezel, Digger hält sie verwirrt hoch, dann fällt ihm mit Verzögerung die Erde auf den Kopf (Follow-Through-Gag), er sitzt im Sandhaufen.
- `hit_tree_landing`: Digger fliegt in einem Bogen und bleibt in einem Cartoon-Baum am Feldrand hängen (Baum wackelt, Blätter rieseln), rutscht Ast für Ast runter.
- `hit_crater_hop`: Explosion, Digger landet in einem tiefen Krater, nur der Helm guckt raus, eine Hand mit weißer Fahne kommt hoch.
- `hit_chain_dance`: Bei 2+ gestapelten Minen: Digger wird von der ersten Explosion hochgeworfen, von der zweiten in der Luft nochmal getroffen (Ping-Pong), landet als Häufchen, zwei Legerfarben blinken abwechselnd.
- `hit_dud_then_boom`: Mine macht erst "klick", Digger atmet auf, wischt sich die Stirn, dreht sich weg — BUMM in den Rücken. (Nur, wenn nicht Doppelagent-Modus, sonst Verwechslung mit Blindgänger.)

**Blindgänger (Doppelagent):** `dud_pfff`: Platte hebt sich, "Pfff", Rauchwölkchen, Digger springt zurück, Herz klopft sichtbar, Legerfarbe erscheint mit "Blindgänger"-Schild, alle lachen (Crowd-Sound).

### 4.2 Treasure-Sequenzen — mindestens 3

- `treasure_fanfare`: Loch leuchtet golden, Kiste springt mit Bounce raus, klappt auf, Flaschen glänzen, Konfetti, Digger tanzt mit Kiste über dem Kopf, andere Digger gucken neidisch.
- `treasure_too_heavy`: Digger zieht die Kiste raus, sie ist zu schwer, er fällt nach hinten, Kiste landet auf ihm, Flaschen klimpern, er hebt den Daumen aus dem Kistenberg.
- `treasure_greed`: (Preis der Gier) Explosion, Rauch, aus dem Rauch kommt angesengt die Kiste, Digger rußgeschwärzt mit Kiste im Arm, Grinsen mit einem fehlenden Zahn, Konfetti ist grau.

### 4.3 Kleine Sequenzen (jede Grabung)

- `dig_empty_worm` / `dig_empty_beetle` / `dig_empty_bone` / `dig_empty_boot`: Platte kippt weg, kleines Ding im Loch winkt/hüpft, Temperatur-Symbol ploppt mit Overshoot rein. 800 ms.
- Temperatur-Reaktion des Diggers: HEISS → Digger schwitzt, fächelt sich zu; WARM → hebt die Augenbraue; KALT → zittert, Atemwolke.
- `dig_own_mine_silent`: Optisch **identisch** zu `dig_empty_*` (Pflicht — sonst Information-Leak), inklusive Temperatur-Symbol.

### 4.4 Feld-Replay (Result)

Alle verbleibenden Platten klappen in einer Welle auf (von der Kiste nach außen), Minen erscheinen mit Legerfarbe und Symbol, Kratern bleibt der Ruß; nicht ausgelöste Minen bekommen ein kleines "Phew"-Schild. Dauer ≤ 2 s.

### 4.5 Effekt-Bausteine

Rauchpilz (3 Größen) · Erdklumpen-Partikel · Ruß-Overlay fürs Gesicht · Sternchen · Helm-Physik (Bogen + Bounce) · Schaufel-Stöße mit Squash · Temperatur-Pops · Legerfarben-Blitz über dem Krater (Ring, der sich ausbreitet, in Legerfarbe) · Konfetti · Kill-Feed-Toast ("Rudi → Anna").

---

## 5. Screens / UX-Flow

| # | Screen | Inhalt |
|---|---|---|
| 0 | **Title** | Logo (Dynamitstange als "i"-Punkt, Lunte glimmt), ein Digger gräbt im Loop und fliegt regelmäßig aus dem Bild. Spielen / Regeln / Settings. |
| 1 | **Lobby** | Spieler 3–8, Feldgröße-Anzeige (automatisch), Modus-Chips, Timer-Chips. CTA "Feld verminen". |
| 2 | **Pass** | Wie Drinkshot. |
| 3 | **Place** | Leeres Feld, "Lege 2 Minen.", Zähler "1 / 2", Vergraben-Button. Maulwurf… nein: Doppelagent zeigt "1 Mine, 1 Blindgänger" mit zwei Werkzeug-Chips zum Umschalten. |
| 4 | **Buried** | "Alle Minen vergraben. Handy in die Mitte." Tap → Dig. |
| 5 | **Dig** | PIXI-Feld, Turn-Banner oben, Trink-Banner bei Explosion, Kill-Feed-Toast, Zug-Timer-Ring optional. |
| 6 | **Distribute** | Nacheinander für jeden Token-Besitzer: Badges, Tap +1, "Auszahlen". |
| 7 | **Result** | Banner, Feld-Replay, Trinker, Kill-Feed, Statistik, Buttons. |
| 8 | **Settings/Rules** | Wie Drinkshot; Regeln als 4 Cards: "Minen legen", "Graben", "Hinweise", "Auszahlung". |

Portrait, Desktop-Portrait-Frame, PWA, Wake-Lock während Place + Dig, Haptik bei Explosion — wie Drinkshot.

**Besonderheit Dig-Screen:** Das Feld muss mit einer Hand tippbar sein, während das Handy auf dem Tisch liegt. Platten ≥ 56 px, Abstand 6 px, Tap-Feedback sofort (Platte wackelt), Ergebnis nach 200 ms Anticipation. Kein Doppeltap-Zoom (`touch-action: manipulation`).

---

## 6. Audio

Sprite: `ui_tap`, `ui_confirm`, `pass_whoosh`, `mine_place` (Erde rieselt), `plate_stomp`, `shovel_dig` (3), `plate_flip`, `worm_squeak`, `temp_hot` (Zischen), `temp_warm`, `temp_cold` (Klirren), `fuse_click`, `explosion` (3 Größen), `helmet_bonk`, `whistle_fall`, `tree_rustle`, `dud_pfff`, `treasure_fanfare`, `bottle_clink`, `crowd_ooh`, `crowd_laugh`, `crowd_gasp`, `confetti`, `music_lobby` (Banjo-Loop), `music_dig` (leiser Spannungs-Loop mit Tick pro Zug).
Stumm voll spielbar.

---

## 7. Ergänzungen, die der Pitch nicht hatte

| Ergänzung | Warum |
|---|---|
| Feldgröße skaliert mit Spielerzahl | 8 Spieler × 2 Minen auf 5 × 5 = 16 von 25 Feldern vermint — unspielbar. |
| Kiste auch auf verminten Feldern ("Preis der Gier") | Erzeugt den besten Doppelmoment und macht die letzte Grabung nie sicher. |
| Minen stapeln | Einfache Regel, seltene Doppel-Explosion als Highlight. |
| Eigene Mine wird stumm aufgedeckt | Ohne diese Regel wären eigene Minen keine sicheren Trittsteine — der Kern des Pitches. |
| Temperatur statt Zahlen | Zahlen machen die Kiste in 2 Zügen findbar; drei Stufen halten die Runde bei 4–8 Grabungen. |
| Startspieler rotiert | Erster Zug ist statistisch der sicherste. |
| Tokens statt Sofort-Verteilen | Hält die Grabphase im Fluss; Verteilen ist ein eigener Moment am Ende. |
| Feld-Replay am Ende | Zeigt alle Minen — der Aha-Moment, der Rache für die nächste Runde motiviert. |
| Kill-Feed + Statistik | Das Spiel produziert Feindschaften; die Statistik gibt ihnen Namen. |
| Blindgänger, Kettenreaktion, Zwei Kisten | Modi, die die Info-Struktur variieren statt nur Zahlen. |

## 8. Nicht-Ziele (v1)

Kein Multi-Device, kein Backend, keine Accounts, keine Ads, kein 3D, keine Kriegs-Ästhetik (Minen sind runde Cartoon-Bomben mit Lunte, Feld ist eine Wiese mit Maulwurfshügeln).

## 9. Erfolgskriterien (Definition of Done v1.0)

1. Regeln nach einer Runde ohne Erklärung verstanden.
2. Dig-Phase mit 6 × 6 und 8 Diggern ≥ 55 fps auf iPhone 11 / Pixel 4a; Low-Effects ≥ 30 fps.
3. Lighthouse Mobile Perf ≥ 90, PWA installierbar, First Load ≤ 1.5 MB gzip.
4. Board-Logik zu 100 % unit-getestet (alle Ergebnisarten, Stapel, Preis der Gier, Modi, Hinweise); eigene Mine ist von leerem Feld **im Datenmodell nach außen** ununterscheidbar (Test auf das öffentliche Board-View-Objekt).
5. Mindestens 8 Hit-Sequenzen + 1 Blindgänger + 3 Treasure-Sequenzen + 4 Leer-Varianten.
6. Playtest mit 4–6 Personen: in ≥ 6 von 8 Runden ein "DU warst das?!"-Moment.
