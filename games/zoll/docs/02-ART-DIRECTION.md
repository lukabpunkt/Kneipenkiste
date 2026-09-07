# DER ZOLL — Art Direction & Design-System

> Version 1.0 · Baut auf der Drinkshot-Art-Direction auf. Alles, was hier nicht anders definiert ist, gilt **wie bei Drinkshot** (Stil-Statement, Typografie, Button-System, Motion-Tokens, Asset-Pipeline, UX-Copy-Ton, Animationsprinzipien). Hier nur Unterschiede und Zoll-spezifische Elemente.

---

## 1. Stil-Statement

**"Ein Flughafen-Zoll aus einem Cartoon der 60er — Förderband, Röntgenmonitor, ein übereifriger Beamter und Reisende, die zu breit lächeln."**

- Formensprache, Outlines, Chibi, Cel-Shading: identisch zu Drinkshot.
- **Stimmung:** Helle Halle, Linoleum, gelbe Linie am Boden, grauer Stahl mit Warnstreifen, ein einziger Farbklecks: der **Röntgenmonitor** in Blau-Grün mit Scanlines. Retro-Flughafen (Split-Flap-Tafel "ANKUNFT", Piktogramme).
- **Ton:** Bürokratie-Komödie. Stempel, Klemmbrett, Trillerpfeife. Schmuggelware ist immer absurd und hat ein Gesicht.

---

## 2. Farb-Tokens (Ergänzungen)

Spielerfarben: **identisch zu Drinkshot**.

| Token | Hex | Verwendung |
|---|---|---|
| `bg.deep` | `#0F0E1A` | App-Hintergrund (Menüs dunkel wie in der Familie) |
| `bg.panel` | `#1C1B2E` | Cards, Sheets |
| `paper` | `#FFF8E7` | Text auf dunkel |
| `ink` | `#1A1024` | Outlines |
| `customs` | `#FFB800` | Primary CTA, gelbe Linie, Warnstreifen |
| `customsShade` | `#D18E00` | CTA-Kante |
| `hall.floor` | `#D8D3C6` | Linoleum |
| `hall.floorLine` | `#C4BFB0` | Fliesenfugen |
| `hall.wall` | `#EEF0F4` | Wand hell |
| `steel` | `#8C93A8` | Band, Röntgengerät, Schranke |
| `steelDark` | `#4A506A` | Schatten, Rollen |
| `belt` | `#2E2B3F` | Förderband-Gummi |
| `xray.bg` | `#0B2233` | Monitor-Hintergrund |
| `xray.glow` | `#3DF5C6` | Silhouetten, Scanline |
| `xray.dim` | `#1A6B5C` | Monitor-Raster |
| `alarm` | `#FF2D55` | Alarm-Rotlicht, "ERWISCHT", Sirene |
| `ok` | `#2ED573` | Stempel "OK", "Durchgekommen" |
| `busted` | `#A55EEA` | Stempel "BELÄSTIGUNG" (auf dem Beamten) |
| `carpet` | `#C0392B` | Roter Teppich (Diplomat) |

Kontrastregeln wie Drinkshot. Die Halle ist die einzige **helle** Bühne der Spielefamilie — Texte auf der Bühne daher immer in `ink` mit `paper`-Stroke (invertierter Sticker-Look).

---

## 3. Typografie

Wie Drinkshot (*Luckiest Guy* / *Nunito*). Ergänzung: **Stempel-Schrift** für "OK", "ERWISCHT", "BELÄSTIGUNG", "DURCHGEKOMMEN" — Luckiest Guy, Uppercase, in einem Rechteck-Rahmen mit abgerundeten Ecken, leicht rotiert (−8°…+8°), mit "Stempelkissen-Unschärfe" (leichter Alpha-Noise-Overlay), slam-in mit `back.out` + Screen-Shake 6 px. Split-Flap-Tafel: Nunito 800 Uppercase in Klappen (wie Tresor-Counter).

---

## 4. UI-Komponenten (Ergänzungen)

### 4.1 Koffer
- Hartschalenkoffer, Rundungen, Griff oben, zwei Schnallen, **Gepäckanhänger** in Spielerfarbe mit Symbol + Name (Nunito 800, 3 Zeichen-Kürzel bei Platzmangel).
- Zustände: `closed` (Idle: alle 8–14 s minimal atmen), `hint_wobble/drip/heavy/click/feather/dog` (Animation + verbleibendes Icon), `bribed` (Vorhängeschloss + "Bezahlt"-Schild), `selected` (hebt sich, Glow in Beamtenfarbe), `scanning` (im Gerät), `open_caught` (aufgesprungen, Items), `open_clean` (aufgeklappt, Socken), `passed_ok`, `passed_smuggler` (offen, Items grüßen), `diplomat`.
- Koffer-Farbe = Spielerfarbe (getintet), Schnallen/Griff `ink`.

### 4.2 Pack-Screen
- Koffer offen (Vogelperspektive), links Stapel saubere Ware, rechts Stapel Schmuggelware mit Item-Set der Runde. Stepper 0–6 in Luckiest Guy `hero`, Items springen beim Erhöhen in den Koffer (Bogen, 250 ms, Squash beim Landen), beim Verringern hüpfen sie zurück. Bei 0: Koffer zeigt nur saubere Ware, Label "Sauber" in `ok`.
- Risiko-Zeile: "Erwischt = **{2a}** Schlücke · Durch = **{a}** verteilen".
- "Koffer schließen": Deckel klappt zu, zwei Schnallen klicken nacheinander, Anhänger wird drangeclipst.

### 4.3 Verhör-HUD (Hall)
- Countdown-Ring um das Beamten-Portrait (oben rechts), Fragevorschlag als Sprechblase des Beamten-Männchens (wechselt alle 8 s, Pop-In), "Verhör beenden" in Beamtenfarbe mit Symbol.
- Hinweis-Icons an den Koffern (kleine Kreise `paper` mit `ink`-Icon: Wellenlinie, Tropfen, Gewicht, Uhr, Feder, Pfote).

### 4.4 Röntgen-Monitor
- CRT-Look: Rundung an den Ecken (Maske), Scanline-Overlay (2 px, Alpha 0.15), leichtes Flackern (Alpha 0.97–1.0, Noise). Silhouetten in `xray.glow` mit Bloom (Filter nur während des Scans). Aufbau zeilenweise (Maske wächst von oben), **Stall bei 50 %** für 400 ms mit Flacker-Sound.
- Bestandteile sichtbar als Silhouetten: Socken (weich), Zahnbürste (Strich), Items (eindeutige Form + Gesicht als dunkle Aussparung).

### 4.5 Öffnungs-Zähler & Durchwinken
- Chip "Öffnungen: ● ● ○" in Beamtenfarbe; Button "Alle durchwinken" (secondary), nach jedem Öffnen "Weiter" (primary).

### 4.6 Bestechungs-UI (Modus)
- Pro Reisender ein kleiner Chip unter seinem Koffer "Bestechen: 1 · 2 · 3"; Tap setzt ein Angebot als Sprechblase über dem Koffer; Beamter bekommt zwei Buttons "Annehmen" / "Ablehnen" in seiner Farbe. Angenommen → Vorhängeschloss auf dem Koffer, Tokens fliegen zum Beamten.

### 4.7 Schranke (Gate)
- Drehkreuz + Ampel; Stempel-Slam pro Reisender; Split-Flap-Tafel oben zeigt "NÄCHSTER: {NAME}".

### 4.8 Koffer-Übersicht (Result)
- Alle Koffer in einer Reihe, offen, mit Mengen-Badge, Markierung "Geöffnet" (Röntgen-Icon) / "Durch" (Stempel), darunter Hinweis-Auflösung: Icon + "stimmte" (grün) / "log" (rot).

---

## 5. Die Charaktere

### 5.1 Reisende (Shotlings)
- Rig identisch zum Drinkshot-Shotling. Zusätzliche Slots/Assets: `sunhat.png`, `camera.png` (Hals-Slot), `shirt_hawaii.png` (Torso-Overlay), `suitcase_hand.png` (Koffer in der Hand, getintet).
- Gesichter zusätzlich: `too_wide_smile` (verdächtig breites Grinsen), `sweat_1/2/3` (steigender Schweiß), `whistle` (Pfeifen, Note-Sprechblase), `outraged` (empört, Hände in die Hüften), `smug_bow`.

### 5.2 Der Beamte (Shotling in Uniform)
- `cap_customs.png` (Schirmmütze in Spielerfarbe mit `ink`-Schirm), `jacket.png` (grau-blau, Epauletten), `clipboard.png` (Hand-Slot), `whistle.png` (Mund-Slot), optional `mustache.png` (50 %).
- Gesichter: `stern`, `suspicious` (Auge zusammengekniffen), `blush` (rot, bei sauberem Koffer), `triumph`, `facepalm`.

### 5.3 Waldi (NPC-Spürhund)
- Kleiner Cartoon-Dackel, `ink`-Outline, braun, Halsband in `customs`. Animationen: laufen, schnüffeln, bellen, Schwanz wedeln, sich hinlegen (Idle in der Ecke).

### 5.4 Schmuggelware-Sets (je 1 Sprite + 1 Röntgen-Silhouette)
Gummiente, Käselaib, Gartenzwerg, Flamingo, Ananas, Sombrero, Kuckucksuhr, Kaktus. Jedes Item mit Gesicht, 2-Frame-Idle. Saubere Ware: Socken, Zahnbürste, Handtuch, Buch, Sonnencreme; peinliche Items: Teddy, Tasse, Ente mit Schleife.

---

## 6. Die Bühne (Zollhalle)

- Logische Welt 1000 × 1000. Hintergrund: Wand mit Split-Flap-Tafel und Piktogrammen, Uhr. Mitte: Förderband von links nach rechts, endet im Röntgengerät (rechts, Monitor darüber, zur Kamera gedreht). Vorn: gelbe Linie, Reisende dahinter in einer Reihe (bei 7–8 zwei Reihen), Beamter rechts neben dem Gerät. Waldi liegt links unten.
- Koffer stehen auf dem Band in einer Reihe (max 7), Abstand so, dass jeder ≥ 56 px Tippfläche hat; bei 7 Koffern Scale 0.85.
- Kamera: Schwenk zum Röntgengerät beim Öffnen (Zoom 1.2× auf Monitor), zurück danach; Shake bei Alarm.
- Gate-Screen: dieselbe Halle, Kamera schwenkt nach rechts zur Schranke.

---

## 7. Animationsprinzipien

Die 7 Regeln aus Drinkshot gelten. Zusätzlich:
- **Scanline ist heilig:** Jede Röntgen-Sequenz beginnt mit dem zeilenweisen Aufbau + Stall bei 50 %. Das Ergebnis darf **nie** vor 100 % erkennbar sein (Silhouetten oben können harmlos aussehen — Socken liegen im Set-Design immer oben).
- **Reaktion vor Konsequenz:** Erst das Gesicht des Reisenden (200 ms), dann Alarm/Stempel, dann Banner.
- **Hinweise sind eindeutig, ihre Bedeutung nicht:** Jede Hinweis-Animation ist visuell klar (man sieht das Wackeln), aber Koffer mit Hinweis sehen danach **nicht** anders aus als ohne (nur das kleine Icon) — kein zusätzlicher Verdachts-Look.

---

## 8. Partikel-Budget

| Effekt | Max | Technik |
|---|---|---|
| Item-Fontäne | 12 Item-Sprites | Pool, Gravity, Rotation |
| Schweißtropfen | 10 | Pool |
| Konfetti | 100 | ParticleContainer |
| Federn | 6 | Pool |
| Alarm-Rotlicht | 1 Overlay | Sprite Alpha-Puls |
| Scanline/Bloom | 1 Filter | nur während Scan |

Gesamt ≤ 200 aktive Sprites.

---

## 9. UX-Copy (DE, Ergänzungen)

- CTA Lobby: "Grenze öffnen". Officer-Intro: "{Name} ist Zollbeamter." / "Alle anderen packen." Pack: "Was packst du ein?" / "Koffer schließen". Packed: "Alle Koffer geschlossen. Handy in die Mitte." Hall: "Verhör läuft." / "Verhör beenden". Inspect: "Öffnungen: 2" / "Alle durchwinken". Banner: "{NAME} ERWISCHT · trinkt {2a}", "BELÄSTIGUNG · {Beamter} trinkt 2", "{NAME} DURCHGEKOMMEN · verteilt {a}", "DIPLOMAT · {Beamter} trinkt 3".
- Fragevorschläge (i18n-Array): "Hast du etwas zu verzollen?", "Was tickt da in deinem Koffer?", "Warum schwitzt du?", "Wer am Tisch schmuggelt bestimmt?", "Beschreib mir den Inhalt. Langsam.", "Wohin reist du und warum lügst du?"
- Result-Banner: "Beamter des Monats", "{Name} ist durchgekommen", "Schmugglerparadies", "Belästigung!", "Ehrliche Runde".
- Hinweis-Auflösung: "Der tropfende Koffer war sauber. Reingefallen." / "Der schwere Koffer: 5 Gartenzwerge. Guter Riecher."
- Fehlertext Lobby (< 4): "Zwei Reisende und ein Beamter — das ist kein Zoll, das ist ein Münzwurf. Holt noch jemanden."
- Onboarding-Tooltips: Pack: "0 = sauber und sicher. Mehr = mehr Risiko, mehr Beute." Hall: "Hinweise stimmen nur meistens."
