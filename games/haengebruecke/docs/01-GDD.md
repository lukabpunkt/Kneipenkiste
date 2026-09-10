# DIE HÄNGEBRÜCKE — Game Design Document (GDD)

> Version 1.0 · Stand: 2026-09-07 · Autor: Planung (Cowork) · Zielgruppe: Claude Code + Luka
> Dieses Dokument ist die **Wahrheit** für das Spielverhalten. Bei Widersprüchen zu Code gewinnt das GDD. Schwesterprojekte: **Drinkshot**, **Der Tresor**, **Sprengmeister**, **Der Zoll** (gleicher Stack, gleiche Design-Sprache, gleiche Charaktere).

---

## 1. Elevator Pitch

**Die Hängebrücke** ist ein Pass-the-Phone-Partyspiel für 3–8 Personen über Anti-Koordination. Eine morsche Hängebrücke über einer Schlucht hat mehr Balken als Spieler, aber jeder Balken trägt nur eine Person. 20 Sekunden Absprache, dann wählt jeder geheim seinen Balken — und alle treten gleichzeitig. Wer allein steht, ist sicher. Wer sich einen Balken teilt, fällt mit dem anderen in die Schlucht. Und jede Runde, in der alle sicher stehen, verliert die Brücke einen Balken.

**Genre:** Party / Anti-Koordination / Trinkspiel · **Plattform:** Web (Mobile First, PWA) · **Rundendauer:** 45–75 s · **Spielerzahl:** 3–8 (Sweet Spot 4–6)

**Design-Pfeiler (Reihenfolge = Priorität):**
1. **Der gleichzeitige Schritt** — ein Reveal, ein Moment, alle springen zusammen; das Bild von zwei Männchen auf einem Balken, die sich anschauen, ist das Spiel.
2. **Versprechen sind wertlos, aber verführerisch** — die Absprache ist der Inhalt, das Handy ist der Richter.
3. **Die Brücke schrumpft** — Frieden ist nie stabil.
4. **Zero Friction** — eine Eingabe pro Spieler, Regeln in zwei Sätzen.
5. **Cartoon-Abenteuer-Look, flüssig auf jedem Handy.**

---

## 2. Core Loop

```
LOBBY → [ABSPRACHE 20 s] → [GEHEIM: PASS → BALKEN WÄHLEN (×n)] → [DER SCHRITT: Reveal] → [AUSZAHLUNG] → RESULT
              ▲                                                                                     │
              └────────────── Nächste Runde (Brücke schrumpft oder wird repariert) ◄────────────────┘
```

Eine **Runde** = Absprache + geheime Wahl + Schritt + Auszahlung. Eine **Session** = beliebig viele Runden; Balkenzahl, Scoreboard und Statistik laufen über die Session.

---

## 3. Spielregeln (verbindlich)

### 3.1 Spieler & Farben

- 3–8 Spieler. Bei 2 startet das Spiel nicht ("Zu zweit gibt es genug Balken für alle. Holt noch jemanden.").
- Farben, Symbole, Namensregeln **identisch zu Drinkshot**. Charaktere: die **Shotlings** als **Hikers** — Wanderhut in Spielerfarbe, Rucksack, Wanderstock.

### 3.2 Die Brücke

- Balkenzahl `B` zu Beginn einer Session: `B = n + 2`. Balken sind von links nach rechts nummeriert (1…B).
- **Schrumpfen:** Stehen alle sicher (keine Kollision), wird ein Balken entfernt: `B_next = B − 1`. Welcher Balken verschwindet, entscheidet das Spiel mit sicherem Zufall und zeigt es am Rundenende ("Balken 4 ist abgefault").
- **Untergrenze:** `B_min = n − 1`. Mit weniger Balken als Spielern ist eine Kollision garantiert — das ist die **Todeszone**, die das Spiel groß ankündigt.
- **Reparatur:** Nach jeder Runde mit mindestens einer Kollision wird die Brücke auf `B = n + 2` repariert (Zimmermann-Animation).

### 3.3 Absprache

- 20 Sekunden (Setting 10 / 20 / 40 s), großer Countdown, die Brücke mit nummerierten Balken prominent auf dem Screen, darunter die Auszahlungsregel dieser Runde und der Hinweis "Versprechen sind nicht bindend."
- Button **"Alle bereit"** beendet vorzeitig.
- Keine In-App-Eingabe in dieser Phase (außer Modus "Fahne", §3.6).

### 3.4 Geheime Wahl (Handy rumgeben)

- Reihenfolge Spieler 1 → n, jeweils Privacy-Screen → **Balken-Screen**: die Brücke von oben, jeder Balken ein großer Button mit Nummer. Tap wählt, Balken leuchtet kurz in Spielerfarbe, dann "Versiegelt" → nächster Privacy-Screen. Kein Zurück.
- Der Balken-Screen zeigt **nicht**, was andere gewählt haben.
- Optionaler Bedenkzeit-Timer (Setting 5 s): danach wird ein zufälliger Balken gewählt (mit Hinweis).
- Nach dem letzten Spieler: "Alle haben gewählt. Handy in die Mitte." → Tap startet den Schritt.

### 3.5 Auszahlung

Sei `m_b` die Zahl der Spieler auf Balken `b`.

| Fall | Was passiert | Brücke danach |
|---|---|---|
| Alle Balken haben `m_b ≤ 1` (**alle sicher**) | Niemand trinkt, niemand verteilt. | `B − 1` (bis `B_min`) |
| Balken mit `m_b ≥ 2` (**Kollision**) | Jeder Spieler auf einem solchen Balken trinkt `m_b`. Jeder sicher stehende Spieler verteilt 1. | Reparatur auf `n + 2` |
| **Todeszone** (`B < n`) | Wie Kollision, aber sicher Stehende verteilen 2. | Reparatur |

Beispiele (n = 5, B = 7): alle auf verschiedenen Balken → nichts, B wird 6. Anna und Marc beide auf 3, Rest verschieden → Anna und Marc trinken je 2, die drei anderen verteilen je 1. Drei Leute auf 5, zwei verschieden → die drei trinken je 3, die zwei verteilen je 1.

**Warum das ein echtes Dilemma ist:** Ein in der Absprache "vergebener" Balken ist scheinbar sicher — wenn alle sich dran halten. Genau deshalb ist er verlockend für den, der glaubt, dass der Besitzer selbst ausweicht. Und weil eine friedliche Runde nichts einbringt und die Brücke schrumpft, will jeder irgendwann, dass jemand fällt — nur nicht er selbst.

### 3.6 Modi (Session-Setting, kombinierbar)

| Modus | Änderung | Zweck |
|---|---|---|
| **Klassik** (Default) | Wie oben. | Einstieg. |
| **Fahne** | In der Absprache kann jeder **öffentlich** eine Fahne auf einen Balken setzen ("Ich nehme die 3") — Tap auf dem Handy, für alle sichtbar. Wer seine Fahne setzt und dann **einen anderen** Balken wählt, ist ein **Fahnenflüchtiger**: steht er sicher, verteilt er nichts; fällt er, trinkt er doppelt. Wer auf den Balken eines anderen mit Fahne tritt und ihn damit zu Fall bringt, verteilt 2 extra ("Balkendieb"). | Macht Versprechen sichtbar und ihren Bruch teuer — oder lukrativ. |
| **Morscher Balken** | Ein zufälliger Balken ist geheim morsch: Er bricht auch unter **einer** Person. Niemand weiß welcher. Wer allein darauf steht, trinkt 1 ("Pech"). Wird am Rundenende gezeigt. | Reiner Glücks-Spice; verhindert, dass ein "sicherer" Lieblingsbalken entsteht. |
| **Schwergewicht** | Beim Wählen gibt jeder zusätzlich ein **Gewicht 1–3** an. Sicher: verteilt sein Gewicht. Kollision: trinkt `m_b × Gewicht`. | Risiko skalierbar wie beim Zoll. |
| **Nebel** | Keine Absprache; 10 Sekunden Stille mit Windgeräusch, dann geheime Wahl. | Reines Prediction-Spiel; kurze Runden. |
| **Seil** | Jeder hat pro Session **ein** Seil: Statt eines Balkens kann er einmal "Seil" wählen — er hangelt sich unter der Brücke durch, ist garantiert sicher, trinkt aber 1 Gebühr und verteilt nichts. | Ausweg für die Todeszone; einmalig, damit er nicht zur Standardwahl wird. |

### 3.7 Result-Screen

- Banner je Fall: **"Alle drüben"** (alle sicher, mit "Balken {x} ist abgefault"), **"Es kracht"** (1 Kollision), **"Massensturz"** (≥ 2 Kollisionen oder `m_b ≥ 3`), **"Todeszone"**, **"Fahnenflucht!"** (Fahne-Modus), **"Pech"** (Morscher Balken).
- **Brücken-Übersicht:** Die Brücke von oben mit allen Balken, jeder Hiker auf seinem Balken, Kollisionen markiert, Fahnen (Modus) neben der tatsächlichen Wahl — "Rudi: Fahne auf 3, stand auf 5."
- Trinker-Zeilen, Verteilungs-Detail, Brücken-Vorschau für die nächste Runde ("Nur noch 5 Balken für 5 Leute" / "Repariert: 7 Balken").
- Session-Statistik: getrunken gesamt, **Stürze**, **Kollisionspartner** (mit wem man am häufigsten gefallen ist), **Fahnenfluchten**, "Bergziege" (meiste sichere Runden), "Sturzflieger".
- Buttons: Nächste Runde · Spieler ändern · Modus ändern.

---

## 4. Der Schritt (das Herzstück)

Die Reveal-Show dauert 8–16 s und ist geskriptet aus dem bereits feststehenden Ergebnis (Ergebnis steht vor der Show fest, die Show inszeniert nur — wie in allen Schwesterspielen).

### 4.1 Bühne

Seitenansicht: links und rechts Felsplateaus, dazwischen die Hängebrücke über einer tiefen Schlucht (Nebel unten, ein Fluss, der glitzert). Die Hikers stehen auf dem linken Plateau in einer Reihe. Balken sind nummeriert (Schilder an den Seilen). Geier kreist oben. Wind bewegt die Seile leicht.

### 4.2 Timeline

| Phase | Zeit | Inszenierung |
|---|---|---|
| **Intro** | 0–1.5 s | Kamera fährt über die Schlucht (Tiefe zeigen), Geier kreischt, Wind. Bei Todeszone: Schild "NUR {B} BALKEN" schwingt ins Bild, Trommel. |
| **Anlauf** | 1.5–3.5 s | Alle Hikers laufen **gleichzeitig** los, jeder zu seinem Balken (unterschiedliche Distanzen, gleiche Ankunftszeit — Geschwindigkeit wird angepasst). Sie sehen sich dabei nicht an. |
| **Der Schritt** | 3.5 s | Alle treten gleichzeitig auf. **Hit-Stop 120 ms.** |
| **Knarren** | 3.5–5.5 s | **Jeder** Balken knarrt und biegt sich leicht durch (auch die sicheren — Fake). Hikers wackeln mit den Armen. Bei Kollisionsbalken: die Hikers bemerken einander, drehen langsam den Kopf, große Augen, 800 ms Blickkontakt (Slow-Mo 0.5×), einer sagt "Oh." (Sprechblase). |
| **Bruch** | 5.5 s + | Kollisionsbalken brechen — bei mehreren nacheinander (400 ms Versatz). Fall-Sequenz (§4.3). Sichere Balken hören auf zu knarren, Hikers atmen aus. |
| **Nachspiel** | +2–4 s | Sichere Hikers gehen ans rechte Plateau, winken hinunter. Gestürzte klettern rußig/nass am Seil hoch (kurzer Loop). Trinker-Zähler ploppen. Bei "alle sicher": Zimmermann-Gegenteil — ein Balken fault sichtbar ab und fällt (Vorschau auf nächste Runde). Bei Kollision: Zimmermann repariert (Hammer, Bretter fliegen an ihren Platz). |

Dauer-Presets (Setting Kurz / Normal / Lang) skalieren Anlauf und Knarren. **Kein Tap-to-Skip** vor dem Bruch; danach Tap → Result.

### 4.3 Fall-Sequenzen (Kollision) — mindestens 6 bis Release

- `fall_hold_hands`: Die beiden greifen sich reflexartig an den Händen, schauen sich an, Balken bricht, sie fallen händchenhaltend, drehen sich synchron wie Eiskunstläufer, Platsch im Fluss, tauchen mit Fischen auf dem Kopf auf.
- `fall_coyote_delay`: Balken ist weg, sie stehen noch 1 s in der Luft, schauen nach unten, halten ein Schild "HILFE" hoch, dann fallen sie — die Hüte bleiben oben und schweben langsam hinterher.
- `fall_seesaw`: Balken bricht in der Mitte wie eine Wippe, der eine kippt runter, katapultiert den anderen hoch, der landet auf dem Geier, der Geier trägt ihn kurz und lässt ihn dann fallen.
- `fall_rope_swing`: Die Hikers greifen die Seile, die Brücke schwingt wie eine Schaukel, sie klatschen gegen die Felswand (Squash), rutschen ab, fallen.
- `fall_domino` (bei `m_b ≥ 3`): Der Balken bricht, der erste fällt auf den zweiten, der auf den dritten, sie fallen als Stapel, Sprechblase "Warum ich?!" vom untersten.
- `fall_bounce_wall`: Ping-Pong zwischen den Schluchtwänden (3 Bounces mit Squash), Sternchen, Landung als Häufchen auf einem Felsvorsprung, dann rutscht der Felsvorsprung ab.

**Morscher Balken (Overlay):** `rotten_crack`: Ein einzelner Hiker steht, der Balken zerbröselt unter ihm wie Keks, er sinkt langsam durch, "Ernsthaft?"-Sprechblase.

**Fahnenflucht (Overlay):** `deserter_stamp`: Die Fahne des Spielers fliegt zu ihm, fällt um, Stempel "FAHNENFLUCHT" in Rot. Bei "Balkendieb": Der Dieb tippt dem Gestürzten von hinten auf die Schulter, während dieser fällt, und winkt.

### 4.4 Sicher-Sequenzen — mindestens 3

- `safe_wobble_hold`: Balken biegt sich stark durch, Hiker rudert mit den Armen, ein Brett-Splitter fällt, Balken hält. Erleichterung.
- `safe_confident_stroll`: Hiker geht ohne Zögern über seinen Balken, pfeift, dreht sich zu den Fallenden um, zuckt mit den Schultern.
- `safe_tiptoe`: Hiker auf Zehenspitzen, hält die Luft an (Backen aufgeblasen), Schweiß, kommt drüben an und lässt die Luft in einem Ballon-Geräusch raus.

**Alle sicher — `all_safe_rot`:** Alle stehen, atmen auf, jubeln — dann knackt es, ein Balken fault sichtbar ab und fällt in die Schlucht, alle schauen hinterher, Geier lacht. Anzeige "Nächste Runde: {B−1} Balken".

**Todeszone-Intro — `deathzone_sign`:** Schild schwingt rein, Trommel, Geier setzt sich auf das Schild.

**Reparatur — `repair_carpenter`:** Ein Cartoon-Zimmermann (NPC "Balthasar") kommt mit Leiter, Bretter fliegen an ihre Plätze, Hammer-Rhythmus, Brücke ist wieder komplett.

### 4.5 Effekt-Bausteine

Balken-Knarren (Skew + Sound) · Slow-Mo-Blickkontakt · Hut-Nachschweben · Wasser-Platsch (Partikel + Ringe) · Splitter · Felswand-Squash · Sprechblasen · Stempel · Zimmermann-Bretter · Geier-Reaktionen · Trinker-Zähler.

---

## 5. Screens / UX-Flow

| # | Screen | Inhalt |
|---|---|---|
| 0 | **Title** | Logo (Brücke als Schriftzug), ein Hiker geht im Loop über die Brücke, ein Balken bricht, er fällt, kommt nass wieder hoch. Spielen / Regeln / Settings. |
| 1 | **Lobby** | Spieler 3–8, Balkenanzahl-Anzeige (n + 2), Modus-Chips, Dauer-Chips. CTA "Auf die Brücke". |
| 2 | **Negotiation** | Brücke von oben mit nummerierten Balken, Countdown-Ring, Auszahlungsregel, "Versprechen sind nicht bindend.", "Alle bereit". Fahne-Modus: Fahnen-Buttons pro Spieler (öffentlich). Nebel-Modus: 10-s-Stille-Screen. |
| 3 | **Pass** | Wie Drinkshot. |
| 4 | **Choose** | Brücke von oben, Balken als Buttons (≥ 56 px), Seil-Button (Modus, einmalig), Gewicht-Stepper (Modus), Versiegel-Animation, Bedenkzeit. |
| 5 | **Sealed** | "Alle haben gewählt. Handy in die Mitte." Tap → Step. |
| 6 | **Step** | PIXI-Bühne, Show (§4). Tap-to-Skip erst nach dem Bruch. |
| 7 | **Distribute** | Nacheinander für jeden mit Verteil-Guthaben (sichere Spieler je 1 / 2). Bei vielen sicheren Spielern: Option "Alle verteilen an dieselbe Person" als Schnellweg. |
| 8 | **Result** | Banner, Brücken-Übersicht, Trinker, Vorschau, Statistik, Buttons. |
| 9 | **Settings/Rules** | Regeln als 3 Cards: "Balken wählen", "Allein = sicher, zu zweit = Sturz", "Brücke schrumpft". |

Portrait, Desktop-Portrait-Frame, PWA, Wake-Lock während Negotiation + Step, Haptik beim Bruch — wie Drinkshot.

**Distribute-Vereinfachung:** Weil oft 4–6 Spieler je 1 Schluck verteilen, gibt es neben der Einzel-Iteration einen Schnellmodus: Result zeigt "Sichere verteilen je 1" mit einem Badge-Grid; jeder tippt nacheinander sein Ziel, ohne Pass-Screen (öffentlich, geht schnell). Einzel-Iteration nur bei Verteil-Guthaben ≥ 2 (Todeszone, Schwergewicht).

---

## 6. Audio

Sprite: `ui_tap`, `ui_confirm`, `pass_whoosh`, `plank_select`, `seal`, `wind_loop`, `vulture_screech`, `vulture_laugh`, `footsteps_run`, `step_thud`, `creak` (4 Varianten), `rope_strain`, `plank_snap`, `plank_crumble`, `whistle_fall`, `splash`, `rock_squash`, `hat_flutter`, `relief_exhale`, `balloon_deflate`, `hammer_rhythm`, `wood_rot`, `stamp`, `drum_deathzone`, `crowd_gasp`, `crowd_laugh`, `music_lobby` (Banjo-Wander-Loop), `music_negotiation` (Wind + Tick, steigend), `music_step` (Spannungs-Drone bis zum Bruch).
Stumm voll spielbar.

---

## 7. Ergänzungen, die der Pitch nicht hatte

| Ergänzung | Warum |
|---|---|
| Untergrenze `n − 1` + Todeszone | Ohne Untergrenze schrumpft die Brücke ins Absurde; die Todeszone macht den garantierten Crash zum Event. |
| Reparatur nach Kollision | Sonst bleibt die Brücke nach einem Crash klein und jede Runde ist Chaos. |
| Verteilen 2 in der Todeszone | Wer im garantierten Crash sicher steht, hat etwas geleistet. |
| Fake-Knarren auf allen Balken + Blickkontakt-Slow-Mo | Das ist die Spannungs-Dramaturgie: Bis zum Bruch weiß niemand sicher, ob er's war — auch wenn er's ahnt. |
| Fahne-Modus | Macht die Absprache zum Spiel mit Konsequenzen (analog Eid beim Tresor). |
| Seil, Morscher Balken, Schwergewicht, Nebel | Informations- und Risiko-Varianten. |
| Distribute-Schnellmodus | Bei 5 sicheren Spielern je 1 Schluck wäre die Einzel-Iteration langsamer als die Show. |
| Kollisionspartner-Statistik | Die Geschichte des Abends ist, wer mit wem immer wieder auf demselben Balken landet. |
| Zimmermann Balthasar | Ein NPC macht Schrumpfen/Reparatur lesbar, ohne Text-Wände. |

## 8. Nicht-Ziele (v1)

Kein Multi-Device, kein Backend, keine Accounts, keine Ads, kein 3D, keine realistische Absturz-Darstellung (Wasser, Wippen, Geier — alles Cartoon; jeder klettert wieder hoch).

## 9. Erfolgskriterien (Definition of Done v1.0)

1. Regeln nach einer Runde ohne Erklärung verstanden.
2. Step-Show mit 8 Hikers ≥ 55 fps auf iPhone 11 / Pixel 4a; Low-Effects ≥ 30 fps.
3. Lighthouse Mobile Perf ≥ 90, PWA installierbar, First Load ≤ 1.5 MB gzip.
4. Regelkern zu 100 % unit-getestet: Auszahlung für n 3–8 und alle Verteilungen von Spielern auf Balken, Schrumpfen/Untergrenze/Reparatur, alle Modi.
5. Mindestens 6 Fall-Sequenzen + 3 Sicher-Sequenzen + `all_safe_rot` + `deathzone_sign` + `repair_carpenter` + 2 Overlays (Morsch, Fahnenflucht) = 14 Inszenierungen.
6. Playtest 4–6 Personen: in ≥ 6 von 8 Runden hörbare Reaktion beim Blickkontakt; mindestens ein gebrochenes Versprechen mit Reaktion.
