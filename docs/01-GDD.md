# DER ZOLL — Game Design Document (GDD)

> Version 1.0 · Stand: 2026-09-04 · Autor: Planung (Cowork) · Zielgruppe: Claude Code + Luka
> Dieses Dokument ist die **Wahrheit** für das Spielverhalten. Bei Widersprüchen zu Code gewinnt das GDD. Schwesterprojekte: **Drinkshot**, **Der Tresor**, **Sprengmeister** (gleicher Stack, gleiche Design-Sprache, gleiche Charaktere).

---

## 1. Elevator Pitch

**Der Zoll** ist ein Pass-the-Phone-Bluffspiel für 4–8 Personen. Alle sind Reisende mit einem Cartoon-Koffer — bis auf einen: den **Zollbeamten**. Beim Rumgeben packt jeder Reisende heimlich: saubere Ware oder Schmuggelware, 1 bis 6 Stück. Dann liegt das Handy in der Mitte, die Koffer rollen über das Band, und der Beamte bekommt kleine, **unzuverlässige** Hinweise — ein Koffer wackelt, aus einem tropft es, einer ist verdächtig schwer. Er verhört die Reisenden, dann öffnet er zwei Koffer im Röntgengerät. Wer erwischt wird, trinkt doppelt. Wer durchkommt, verteilt. Wer unschuldig belästigt wurde, lässt den Beamten trinken.

**Genre:** Party / Bluff / Trinkspiel · **Plattform:** Web (Mobile First, PWA) · **Rundendauer:** 90–150 s · **Spielerzahl:** 4–8 (Sweet Spot 5–6)

**Design-Pfeiler (Reihenfolge = Priorität):**
1. **Das Verhör ist das Spiel** — das Handy inszeniert, die Lügen passieren am Tisch.
2. **Falsche Sicherheit** — die Hinweise müssen gut genug sein, um ihnen zu glauben, und schlecht genug, um reinzufallen.
3. **Skalierbarer Bluff** — nicht ob, sondern wie viel; Gier hat einen Preis.
4. **Der Röntgen-Moment** — jedes Öffnen ist eine Lootbox.
5. **Cartoon-Flughafen-Look, flüssig auf jedem Handy.**

---

## 2. Core Loop

```
LOBBY → [BEAMTER wird bestimmt] → [GEHEIM: PASS → PACKEN (×(n-1))] → [ZOLLHALLE: Hinweise + Verhör]
      → [KONTROLLE: Beamter öffnet bis zu k Koffer] → [SCHRANKE: restliche Koffer passieren + Reveal]
      → [AUSZAHLUNG] → RESULT → nächste Runde (Beamter rotiert)
```

Eine **Runde** = ein Beamter, alle anderen reisen. Eine **Session** = beliebig viele Runden; Statistik ("über die Grenze gebracht", "erwischt", "Trefferquote als Beamter") läuft über die Session.

---

## 3. Spielregeln (verbindlich)

### 3.1 Spieler, Rollen, Farben

- 4–8 Spieler. Bei 3 startet das Spiel nicht ("Zwei Reisende und ein Beamter — das ist kein Zoll, das ist ein Münzwurf. Holt noch jemanden.").
- Farben, Symbole, Namensregeln **identisch zu Drinkshot**. Charaktere: die **Shotlings** als **Reisende** (Sonnenhut, Kamera, Hawaiihemd-Overlay, Koffer in Spielerfarbe) und als **Beamter** (Uniformmütze in Spielerfarbe, Klemmbrett, Schnurrbart-Option).
- **Der Beamte rotiert:** Runde r → Spieler `(r − 1) mod n`. Anzeige in der Lobby und zu Rundenbeginn ("Diese Runde kontrolliert: Rudi").
- Der Beamte packt nicht und wird in der geheimen Phase übersprungen.

### 3.2 Packen (geheime Phase, Handy rumgeben)

- Reihenfolge: alle Reisenden in Spielerreihenfolge (Beamter ausgelassen), jeweils Privacy-Screen → **Pack-Screen**.
- Pack-Screen: offener Koffer, links Stapel "Saubere Ware" (Socken, Zahnbürste, Handtuch), rechts Stapel "Schmuggelware" (Cartoon-Items, siehe §4.3). Ein Stepper **0–6** für die Schmuggelmenge; 0 = sauber. Der Koffer füllt sich sichtbar mit der gewählten Anzahl Items, der Rest mit sauberer Ware (Koffer sieht immer voll aus). Button **"Koffer schließen"** → Klick-Animation, Koffer bekommt einen Gepäckanhänger in Spielerfarbe → nächster Privacy-Screen.
- Kein "Zurück". Optionaler Bedenkzeit-Timer (Setting 10 s): danach wird 0 (sauber) gewählt.
- **Menge und Risiko:** Die Zahl 1–6 ist frei. Ein Hinweistext unter dem Stepper ("Wenn du erwischt wirst: {2×} Schlücke") macht den Einsatz explizit.

### 3.3 Zollhalle (Hinweise + Verhör, Handy in der Mitte)

- Bühne: Zollhalle mit Förderband, die Koffer aller Reisenden rollen nacheinander ein und bleiben in einer Reihe stehen, jeder mit Gepäckanhänger (Farbe + Symbol + Name). Der Beamte steht am Röntgengerät, die Reisenden hinter der gelben Linie.
- **Hinweise:** Das Spiel erzeugt **h Hinweise** (h = ⌊(n−1)/2⌋, min 1, max 3), jeder als kurze Animation an einem Koffer. Jeder Hinweis ist mit **Wahrscheinlichkeit p_true = 0.6** ein "echter" Hinweis (zeigt auf einen Schmuggler-Koffer, sofern es einen gibt), sonst ein falscher (zeigt auf einen sauberen Koffer). Gibt es keine Schmuggler, sind alle Hinweise falsch. Hinweise sind untereinander verschieden (nie zweimal derselbe Koffer). **Hinweise sagen nichts über die Menge** — ein "schwerer" Koffer kann 1 oder 6 enthalten.
- Hinweis-Typen (zufällig, je 1 pro Hinweis): `wobble` (Koffer wackelt kurz), `drip` (Tropfen bildet sich unter dem Koffer), `heavy` (Koffer sinkt auf dem Band ein, Bandmotor ächzt), `click` (leises Ticken aus dem Koffer), `feather` (eine Feder quillt aus dem Reißverschluss), `dog` (Spürhund Waldi schnüffelt einmal, geht weiter).
- Hinweise laufen **einmal** in zufälliger Reihenfolge ab (Gesamt ~ 6–10 s), danach bleiben kleine Icons an den betroffenen Koffern ("wackelte", "tropft"). Ein Button "Nochmal ansehen" wiederholt sie (max 1×).
- **Verhör:** Countdown **45 s** (Setting 30 / 45 / 90 s). Der Beamte darf jedem Reisenden eine Frage stellen, die Reisenden müssen antworten (sozial durchgesetzt). Das Handy zeigt rotierende Fragevorschläge als Sprechblase des Beamten-Männchens: "Hast du etwas zu verzollen?", "Was ist das für ein Geräusch in deinem Koffer?", "Warum schwitzt du?", "Wer am Tisch schmuggelt bestimmt?" Button **"Verhör beenden"** (Beamter) beendet vorzeitig.
- **Keine In-App-Eingabe** im Verhör (außer Modus "Bestechung", §3.7).

### 3.4 Kontrolle (Beamter öffnet)

- Der Beamte darf bis zu **k Koffer** öffnen: k = 1 bei 4 Spielern, 2 bei 5–6, 3 bei 7–8. Er darf auch weniger oder **keinen** öffnen ("Alle durchwinken").
- Öffnen = Tap auf Koffer → Koffer fährt ins Röntgengerät → **Röntgen-Sequenz** (§4.1): Silhouetten erscheinen. Ergebnis sofort:
  - **Schmuggler mit Menge a:** Alarm, Koffer springt auf, Items fliegen raus, Reisender wird "erwischt". **Reisender trinkt 2·a**, **Beamter erhält a Verteil-Tokens.**
  - **Sauber:** Socken, Zahnbürste, ein peinliches Item (Teddy, Gummiente mit Schleife, "Weltbester Beamter"-Tasse). Der Reisende ist empört, der Beamte wird rot. **Beamter trinkt 2** ("Belästigung eines unschuldigen Reisenden").
- Nach jedem Öffnen: Banner, dann "Noch 1 Öffnung" / "Durchwinken"-Button. Nach k Öffnungen automatisch weiter.

### 3.5 Schranke (Reveal der Nicht-Geöffneten)

- Alle nicht geöffneten Koffer passieren nacheinander die Schranke (Reihenfolge: **saubere zuerst, Schmuggler zuletzt** — wie beim Tresor: Spannung bis zum letzten Koffer). Für jeden:
  - Sauber: Stempel "OK", Reisender geht durch, winkt.
  - Schmuggler mit Menge a: Reisender geht durch, dreht sich um, öffnet grinsend den Koffer, zeigt die Items ("Durchgekommen: 4"). **Erhält a Verteil-Tokens.** Der Beamte schlägt sich an die Stirn.
- Damit ist am Ende **alles öffentlich**: jeder weiß, wer gelogen hat und wie dreist.

### 3.6 Auszahlung

- Trinken passiert **sofort** bei der Kontrolle (Banner). Tokens werden gesammelt und am Rundenende verteilt (Distribute-Screen wie bei den Schwesterspielen: Reihenfolge Beamter zuerst, dann Schmuggler in Schranken-Reihenfolge; Tap +1, Long-Press −1; nicht an sich selbst; alles auf eine Person erlaubt).
- **Beamten-Bonus:** Erwischt der Beamte **alle** Schmuggler der Runde (und mindestens einen), erhält er +2 Tokens ("Beamter des Monats"). Winkt er alle durch und es gab keinen Schmuggler, erhält er +1 ("Menschenkenntnis").

### 3.7 Modi (Session-Setting, kombinierbar)

| Modus | Änderung | Zweck |
|---|---|---|
| **Klassik** (Default) | Wie oben. | Einstieg. |
| **Bestechung** | Im Verhör darf jeder Reisende dem Beamten **öffentlich** ein Bestechungsangebot machen: 1–3 Tokens ("Ich gebe dir 2 zu verteilen, wenn du mich nicht öffnest"). Der Beamte nimmt an oder lehnt ab (Tap auf dem Handy, sichtbar). Angenommen → Koffer ist **gesperrt** (nicht öffnenbar), Beamte bekommt die Tokens sofort. Auch **saubere** Reisende dürfen bestechen. | Zweite Bluff-Ebene: Wer besticht, wirkt schuldig — oder tut nur so. Der Beamte muss entscheiden, ob 2 sichere Tokens besser sind als ein möglicher Fang. |
| **Spürhund** | Der Beamte bekommt zusätzlich **einen verlässlichen** Hinweis: Waldi schnüffelt einen Koffer an und bellt, wenn Schmuggelware drin ist (zeigt nicht die Menge). Dafür darf der Beamte nur **k − 1** Koffer öffnen (min 1). | Information gegen Handlungsspielraum. |
| **Diplomat** | Ein zufälliger Reisender hat geheim **diplomatische Immunität** (sieht es auf seinem Pack-Screen). Wird sein Koffer geöffnet: Röntgen zeigt einen Diplomatenpass, Alarm bricht ab, **Beamter trinkt 3**, der Diplomat kommt mit seiner Ware durch. | Erzeugt Angst vor "dem einen Koffer", belohnt den Diplomaten für dreistes Packen. |
| **Hochsaison** | Schmuggelmenge 1–10, Beamter darf k + 1 öffnen. | Für Gruppen, die es wollen. |

### 3.8 Result-Screen

- Banner: **"Beamter des Monats"** (alle erwischt) / **"{Name} ist durchgekommen"** (größter Schmuggel) / **"Schmugglerparadies"** (kein Fang bei ≥ 2 Schmugglern) / **"Belästigung!"** (nur Unschuldige geöffnet) / **"Ehrliche Runde"** (niemand schmuggelte).
- Trinker-Zeilen, Token-Verteilung, **Koffer-Übersicht** (alle Koffer offen mit Menge, geöffnet/durchgekommen-Markierung, Hinweise und ob sie stimmten — "Der tropfende Koffer war sauber. Reingefallen.").
- Session-Statistik: **über die Grenze gebracht** (Summe durchgekommener Schmuggelware), **erwischt** (Summe), **Trefferquote als Beamter**, **unschuldig belästigt**, "Dreistester Schmuggler" (höchste Einzelmenge durchgekommen), "Bester Riecher".
- Buttons: Nächste Runde (Beamter rotiert) · Spieler ändern · Modus ändern.

---

## 4. Inszenierungen (das Herzstück)

Alles Cartoon-Slapstick im Flughafen-Setting: Röntgen-Silhouetten, aufspringende Koffer, fliegende Gummienten, rot werdende Beamte, Moonwalk durch die Schranke.

### 4.1 Röntgen-Sequenzen (Kontrolle) — Kern-Moment, 3 Varianten je Ergebnis

Koffer fährt ins Gerät (Band-Sound), Monitor flackert an, blau-grünes Röntgenbild baut sich **zeilenweise von oben** auf (Scanline, 1.2 s) — die Silhouetten werden erst nach und nach erkennbar. **Das ist der Lootbox-Moment: Stocken der Scanline bei 50 %**, Beamter beugt sich vor.

**Erwischt (Schmuggler):**
- `caught_alarm_burst`: Silhouetten zeigen Gummienten → rotes Blinklicht, Sirene, Koffer springt auf, Items fliegen in einer Fontäne raus, Reisender versucht sie in der Luft zu fangen, wird von einer Ente am Kopf getroffen, X-Augen. Beamter pfeift Trillerpfeife.
- `caught_sweat_flood`: Beim Scan schwitzt der Reisende immer stärker (Tropfen-Partikel), eine Pfütze bildet sich, er rutscht darauf aus, Koffer fällt auf, Items kullern raus. Beamter hält Klemmbrett hoch: "ERWISCHT".
- `caught_slow_zip`: Beamter öffnet den Reißverschluss quälend langsam (Zipper-Sound, Slow-Mo), Reisender pfeift unschuldig, immer schneller; Reißverschluss offen → Items quellen wie ein Springteufel raus.

**Sauber:**
- `clean_teddy`: Silhouette zeigt einen Teddy. Koffer auf: Teddy, Socken, Zahnbürste. Reisender hält Teddy an die Brust, Beamter wird rot, Publikum "Aww", Stempel "BELÄSTIGUNG" landet auf dem Beamten.
- `clean_mug`: Im Koffer eine Tasse "Weltbester Zollbeamter". Beamter starrt, zittert, trinkt.
- `clean_duck_bow`: Eine einzige Gummiente mit Schleife — legal, weil nur eine ("Das ist Rudi. Er reist mit mir."). Beamter drückt sich die Ente an die Stirn.

**Diplomat (Overlay):**
- `diplomat_pass`: Röntgen zeigt einen Pass mit Stern, Sirene setzt an und **bricht ab** (Plattenspieler-Stopp-Sound), roter Teppich rollt aus, Reisender geht mit Ware unterm Arm durch, Beamter salutiert unfreiwillig.

### 4.2 Schranken-Sequenzen (Nicht-Geöffnete) — 2 je Fall

- `pass_clean_wave`: Stempel "OK", Reisender geht durch, winkt kurz. 1.2 s.
- `pass_clean_relief`: Reisender atmet aus, Knie werden weich, hält sich an der Schranke fest, geht durch.
- `pass_smuggler_moonwalk`: Reisender moonwalkt durch, dreht sich, öffnet Koffer, Items grüßen ("Durchgekommen: 4"), Beamter schlägt sich an die Stirn.
- `pass_smuggler_bow`: Reisender verbeugt sich, Koffer klappt auf wie ein Zauberkasten, Items springen in Formation, Konfetti, Beamter zerknüllt Klemmbrett-Blatt.

### 4.3 Schmuggelware (Cartoon-Items)

Zufälliges Set pro Runde (alle Reisenden derselben Runde schmuggeln dieselbe Warengattung — das macht Röntgenbilder lesbar): Gummienten, Käselaibe, Gartenzwerge, Flamingos (aufblasbar), Ananas, Sombreros, Kuckucksuhren, Kaktusse. Silhouetten sind eindeutig, Items haben Gesichter.

Saubere Ware: Socken, Zahnbürste, Handtuch, Buch, Sonnencreme — plus 1 "peinliches" Item aus der Clean-Sequenz.

### 4.4 Hinweis-Animationen (Zollhalle)

Je Typ eine 1.5-s-Animation mit Sound: `wobble` (Koffer wackelt, Anhänger schwingt nach), `drip` (Tropfen wächst, fällt, Pfütze), `heavy` (Band ächzt, Koffer sinkt ein, Beamter hebt Augenbraue), `click` (Koffer vibriert kurz, Tick-Sound), `feather` (Feder quillt raus, schwebt), `dog` (Waldi läuft ins Bild, schnüffelt, geht — im Spürhund-Modus bellt er zusätzlich am verlässlichen Koffer).

### 4.5 Effekt-Bausteine

Scanline-Shader (Röntgen) · Alarm-Rotlicht · Item-Fontäne (Partikel aus Item-Sprites) · Schweiß-Partikel · Stempel-Slam · Roter Teppich · Konfetti · Sprechblasen · Trillerpfeife · Klemmbrett-Reaktionen des Beamten (Haken, Kreuz, zerknüllen).

---

## 5. Screens / UX-Flow

| # | Screen | Inhalt |
|---|---|---|
| 0 | **Title** | Logo (Stempel-Look), ein Koffer rollt im Loop durchs Röntgen und zeigt wechselnde Silhouetten. Spielen / Regeln / Settings. |
| 1 | **Lobby** | Spieler 4–8, Modus-Chips, Verhör-Dauer, Timer-Chips, Anzeige "Beamter Runde 1: {Name}". CTA "Grenze öffnen". |
| 2 | **Officer-Intro** | Vollbild in Beamten-Farbe: "{Name} ist Zollbeamter. Alle anderen packen." Tap. |
| 3 | **Pass** | Wie Drinkshot (Beamter wird übersprungen). |
| 4 | **Pack** | Koffer, Stepper 0–6, Risiko-Hinweis, "Koffer schließen". Diplomat-Modus: ggf. Immunitäts-Hinweis. |
| 5 | **Packed** | "Alle Koffer geschlossen. Handy in die Mitte." Tap → Hall. |
| 6 | **Hall** | PIXI-Bühne: Koffer rollen ein, Hinweise laufen, Icons bleiben; Verhör-Countdown; Fragevorschläge; "Nochmal ansehen"; "Verhör beenden". Bestechung: Angebots-UI pro Reisender + Annehmen/Ablehnen. |
| 7 | **Inspect** | Beamter tippt Koffer (max k), Röntgen-Sequenz, Banner, "Durchwinken". |
| 8 | **Gate** | Schranken-Reveal aller übrigen Koffer (sauber zuerst, Schmuggler zuletzt). |
| 9 | **Distribute** | Token-Besitzer nacheinander. |
| 10 | **Result** | Banner, Koffer-Übersicht, Hinweis-Auflösung, Trinker, Statistik, Buttons. |
| 11 | **Settings/Rules** | Regeln als 4 Cards: "Packen", "Hinweise lügen manchmal", "Verhör & Kontrolle", "Auszahlung". |

Portrait, Desktop-Portrait-Frame, PWA, Wake-Lock während Hall/Inspect/Gate, Haptik bei Alarm — wie Drinkshot.

**Besonderheit:** Hall und Inspect sind **öffentliche** Screens mit Handy in der Mitte, bei denen nur der Beamte tippt. Die Buttons tragen daher seine Farbe und sein Symbol, damit klar ist, wer drücken darf.

---

## 6. Audio

Sprite: `ui_tap`, `ui_confirm`, `pass_whoosh`, `zipper_close`, `tag_clip`, `belt_loop`, `belt_stop`, `hint_wobble`, `hint_drip`, `hint_heavy_creak`, `hint_click`, `hint_feather`, `dog_sniff`, `dog_bark`, `timer_tick`, `xray_powerup`, `scanline_loop`, `scan_stall`, `alarm_burst`, `siren_short`, `whistle`, `items_fountain`, `duck_squeak`, `stamp_ok`, `stamp_busted`, `crowd_aww`, `crowd_laugh`, `crowd_gasp`, `record_scratch` (Diplomat), `red_carpet`, `moonwalk_sting`, `confetti`, `music_lobby` (Bossa-Nova-Loop), `music_hall` (Flughafen-Ambience + Uhr-Tick), `music_xray` (Spannungs-Drone).
Stumm voll spielbar.

---

## 7. Ergänzungen, die der Pitch nicht hatte

| Ergänzung | Warum |
|---|---|
| 4 Spieler Minimum, k skaliert mit n | Bei 3 Spielern (2 Reisende, 1 Öffnung) ist es ein Münzwurf. |
| Hinweis-Modell mit p_true = 0.6, h Hinweise, nie Menge | Der Pitch sagt "60 %" — das ist jetzt ein testbares Modell. Menge bleibt verborgen, sonst wäre 1 Schluck schmuggeln sinnlos. |
| Alle Reisenden schmuggeln dieselbe Warengattung pro Runde | Röntgenbilder bleiben lesbar; Set-Variation hält es frisch. |
| Schranken-Reveal sauber → Schmuggler zuletzt | Zweiter Spannungsbogen nach der Kontrolle. |
| "Durchwinken" erlaubt + Menschenkenntnis-Bonus | Ohne das muss der Beamte immer öffnen und zahlt bei ehrlichen Runden zwangsläufig. |
| Beamten-Bonus | Gibt dem Beamten ein positives Ziel, nicht nur Vermeidung. |
| Tokens statt Sofort-Verteilen | Fluss wie bei Sprengmeister. |
| Bestechung, Spürhund, Diplomat | Modi, die die Informationsstruktur verändern, nicht nur Zahlen. |
| Hinweis-Auflösung im Result | "Der tropfende Koffer war sauber" ist der Lacher, der den Beamten fürs nächste Mal vorsichtiger macht. |

## 8. Nicht-Ziele (v1)

Kein Multi-Device, kein Backend, keine Accounts, keine Ads, kein 3D, keine realen Drogen-/Waffen-Anspielungen (Schmuggelware ist immer albern: Enten, Käse, Gartenzwerge).

## 9. Erfolgskriterien (Definition of Done v1.0)

1. Regeln nach einer Runde ohne Erklärung verstanden.
2. Hall/Inspect mit 8 Spielern ≥ 55 fps auf iPhone 11 / Pixel 4a; Low-Effects ≥ 30 fps.
3. Lighthouse Mobile Perf ≥ 90, PWA installierbar, First Load ≤ 1.5 MB gzip.
4. Regelkern zu 100 % unit-getestet: Hinweis-Modell (p_true statistisch, Verschiedenheit, kein-Schmuggler-Fall), k je n, Auszahlung aller Fälle, Boni, alle Modi.
5. Mindestens 6 Röntgen-Sequenzen + 1 Diplomat-Overlay + 4 Schranken-Sequenzen + 6 Hinweis-Animationen.
6. Playtest 5–6 Personen: in ≥ 6 von 8 Runden lacht der Tisch beim Röntgen; Beamte fallen in ≥ 2 von 8 Runden auf einen falschen Hinweis rein.
