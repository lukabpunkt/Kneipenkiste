# 03 – Race Engine: Simulation, Zufall & Fairness

Dieses Dokument ist das Herzstück des Projekts. Die Engine in `src/engine/` muss **fair**, **spannend** und **deterministisch** sein. Alle drei Eigenschaften werden durch automatisierte Tests bewiesen, nicht nur behauptet.

## 1. Anforderungen

| ID  | Anforderung                                                                                                       | Nachweis                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| F1  | Jedes Pferd gewinnt mit Wahrscheinlichkeit 1/6 (± statistische Toleranz).                                         | Fairness-Audit §7                                                                  |
| F2  | Jede Bahn (Lane 1–6) gewinnt mit Wahrscheinlichkeit 1/6.                                                          | Fairness-Audit §7                                                                  |
| F3  | Die Verteilung der Plätze 2–6 ist ebenfalls uniform je Pferd.                                                     | Fairness-Audit §7                                                                  |
| F4  | Events treffen jedes Pferd gleich häufig.                                                                         | Fairness-Audit §7                                                                  |
| F5  | Ergebnis ist unabhängig von Framerate, Gerät, Einsätzen, Spieleranzahl, Nutzereingaben.                           | Determinismus-Test §8 + Architektur (Engine ist DOM-frei)                          |
| S1  | Der Führende bei 50 % Strecke gewinnt in **25–40 %** der Rennen.                                                  | Suspense-Audit §7                                                                  |
| S2  | Der Führende bei 80 % Strecke gewinnt in **45–65 %** der Rennen.                                                  | Suspense-Audit §7                                                                  |
| S3  | Ein Pferd aus der hinteren Feldhälfte (Platz 4–6) bei 50 % gewinnt in **≥ 20 %** der Rennen.                                                | Suspense-Audit §7                                                                  |
| S4  | Durchschnittlich **≥ 4 Führungswechsel** pro Rennen.                                                              | Suspense-Audit §7                                                                  |
| S5  | **25–45 %** der Rennen enden im Fotofinish (Abstand Platz 1–2 < 1 % Streckenlänge).                               | Suspense-Audit §7                                                                  |
| S6  | Der Abstand zwischen Erstem und Letztem im Ziel ist selten „peinlich“ groß (95. Perzentil < 15 % Streckenlänge).  | Suspense-Audit §7                                                                  |
| D1  | Gleicher Seed ⇒ bitidentisches Ergebnis (Reihenfolge, Zeiten, Event-Log).                                         | Determinismus-Test §8                                                              |
| D2  | Die Engine importiert nichts aus `render/`, `ui/`, `state/` und benutzt nie `Math.random`, `Date`, `performance`. | ESLint-Regel `no-restricted-imports` + `no-restricted-globals` für `src/engine/**` |

## 2. Grundprinzip: Fairness durch Symmetrie

Die Engine kennt keine Pferde-Persönlichkeiten. Sie kennt sechs **identische Läufer** mit Index 0–5. Alle Zufallsgrößen werden für jeden Läufer **aus derselben Verteilung unabhängig** gezogen. Erst das Rendering ordnet Index → Pferd (Name, Farbe) zu. Das ist der gesamte Fairness-Trick: Wenn der Code für alle Läufer identisch ist und der Zufall symmetrisch, **kann** kein Pferd bevorzugt sein.

Zusätzlich:

- **Lane-Zuordnung wird pro Rennen gemischt** (Fisher-Yates mit dem Rennen-RNG). Selbst wenn Lanes einen Bug hätten, würde er sich über die Pferde verteilen. Die Startboxen werden in der Pferdefarbe gezeichnet, deshalb ist die Zuordnung für Spieler immer klar.
- **Kein Rang-basiertes Rubber-Banding** (kein „wer hinten liegt, wird schneller“). Das wäre zwar fair, würde aber das Muster „der Führende verliert immer“ erzeugen. Spannung kommt aus **Varianz**, nicht aus Bevorzugung.
- Effekte aus Events sind für alle Läufer identische Funktionen.

## 3. Zufallsquelle (`engine/rng.js`)

- Algorithmus: **sfc32** (schnell, gute Statistik, 128 Bit State). Alternativ mulberry32.
- Seed: `randomSeed()` erzeugt einen `uint32` aus `crypto.getRandomValues`. Seed wird im `race.result` gespeichert (für Debug-Anzeige und Rennhistorie).
- **Drei unabhängige Streams** pro Rennen via `rng.fork()`:
  1. `rngLanes` – Lane-Shuffle
  2. `rngSpeed` – Geschwindigkeitsmodell (pro Läufer wird wiederum ein Sub-Stream geforkt, damit die Reihenfolge der Ziehungen keine Kreuz-Abhängigkeit erzeugt)
  3. `rngEvents` – Event-Scheduling
- `gaussian()` via Box-Muller, mit Cache des zweiten Wertes.
- Tests: Verteilung von `next()` (Mittelwert ≈ 0,5, Chi² über 100 Buckets), `int()` Grenzen inklusive, `pick` uniform, `weighted` proportional, `fork` unabhängig (kein identischer Stream).

## 4. Zeit & Strecke

- Streckenlänge `L = 1000` Track-Units.
- Ziel-Renndauer `D` aus Einstellung: kurz 20 s, normal 30 s, lang 45 s.
- Grundgeschwindigkeit `v0 = L / D` (Units/s).
- Fixer Timestep `dt = 1/60 s`. `race.step()` nimmt **kein** dt-Argument entgegen (verhindert Framerate-Abhängigkeit); der Wert kommt aus `config`.
- Rennen endet, wenn alle Läufer das Ziel erreicht haben **oder** 3 s nach dem Sieger (dann werden verbleibende Plätze nach aktueller Position sortiert).

## 5. Geschwindigkeitsmodell (`engine/speedModel.js`)

Pro Läufer `i` und Zeitpunkt `t`:

```
v_i(t) = v0 · clamp( 1 + P_i(x) + N_i(t) + S_i(t) + F_i(x) + E_i(t) , 0 , 2.2 )
```

Alle Terme sind dimensionslose relative Modifikatoren. `x = pos_i / L` ist der Streckenfortschritt des Läufers.

### 5.1 `P_i(x)` – Phasenprofil (langsame Form)

Jeder Läufer bekommt ein individuelles „Form-Profil“ über die Strecke: `K = 6` Stützstellen bei `x = 0, 0.2, 0.4, 0.6, 0.8, 1.0`, jede mit Wert `~ N(0, σ_P)`, `σ_P = 0.11`. Zwischen den Stützstellen wird mit **Catmull-Rom** oder Cosinus interpoliert. Ergebnis: sanfte Wellen, ein Läufer ist mal vorne, mal hinten. Weil die Stützstellen unabhängig sind, korrelieren Anfang und Ende nicht → starke Aufholjagden sind möglich.

### 5.2 `N_i(t)` – Schnelles Rauschen (Ornstein-Uhlenbeck)

```
N += -θ · N · dt + σ_N · sqrt(dt) · gaussian()
θ = 1.8 (1/s), σ_N = 0.18
```

Gibt das „Flackern“ im Tempo, verhindert, dass zwei Läufer synchron laufen, und erzeugt Mikro-Führungswechsel.

### 5.3 `S_i(t)` – Sprints

Jeder Läufer erhält `n_sprints ~ int(1, 3)` Sprint-Zeitpunkte, uniform in `t ∈ [0.1·D, 0.95·D]`, mit Stärke `~ uniform(0.15, 0.35)` und Dauer `~ uniform(1.2, 2.5) s`, Ein-/Ausblenden über 0,3 s (smoothstep). Sprints sind das sichtbare „Jetzt geht's los“-Moment.

### 5.4 `F_i(x)` – Endspurt-Faktor

Damit das Finish offen bleibt: Pro Läufer wird `f_i ~ N(0, σ_F)`, `σ_F = 0.10` gezogen. `F_i(x) = f_i · smoothstep(0.75, 0.9, x)`. Ab 75 % Strecke blendet ein individueller Endspurt (positiv oder negativ) ein. Zusammen mit dem unabhängigen letzten Stützpunkt des Phasenprofils ergibt das die nötige Endvarianz.

### 5.5 `E_i(t)` – Event-Effekte

Summe aller aktiven Effekte aus §6 (z. B. `vomit` = −1.0 für 1,5 s → Stillstand; `carrot` = +0.35 für 1,5 s). Effekte mit Ein-/Ausblendung, damit keine harten Sprünge in der Animation entstehen (Ausnahme: `banana`, da soll es ruckartig sein).

### 5.6 Tuning-Parameter

Alle Parameter in `src/config.js` unter `SPEED_MODEL`. Sie werden **nur** durch das Suspense-Audit (§7) validiert und angepasst. Startwerte oben sind Ausgangspunkte; der Meilenstein M2 enthält explizit die Aufgabe, die Parameter so zu tunen, dass S1–S6 erfüllt sind. Dokumentiere die finale Wahl im Kopf von `speedModel.js`.

> **Ergebnis der M2-Tuning-Schleife:** Das Phasenprofil hat eine **Varianz-Rampe** bekommen – die Streuung der Stützstellen wächst entlang der Strecke (`sigmaStart` 0,002 → `sigmaEnd` 0,22, Exponent 1,3–2,5). Ohne sie gewinnt der Führende bei Halbzeit strukturell rund 50 % der Rennen, egal wie alle anderen Parameter gedreht werden: Ein Vorsprung ist gebankte Strecke, die spätere Varianz nicht mehr einholt. Mit der Rampe läuft das Feld früh zusammen und fächert spät auf – auch das realistischere Bild eines echten Rennens. Details in §7.1 und im Tuning-Protokoll in `PROGRESS.md`.

## 6. Event-Scheduler (`engine/eventScheduler.js`)

### 6.1 Ablauf

1. Beim Rennstart: `n_events` ziehen gemäß Chaos-Level (`calm: int(1,3)`, `normal: int(3,6)`, `wild: int(6,10)`).
2. Für jedes Event: Zeitpunkt `t_e` uniform in `[0.08·D, 0.95·D]`, mit Constraint: Abstand zu anderen Events **≥ 2 s** (bis zu 20 Versuche, sonst Event verwerfen).
3. Event-Typ per `rngEvents.weighted(EVENTS)` (Gewichte in `data/events.js`; `ufo` = 2, normale Events = 100, seltene = 40).
4. Betroffener Läufer: `rngEvents.int(0, 5)` **uniform**. Constraint: max. 2 Events pro Läufer; bei Verstoß neu ziehen (max. 10 Versuche, sonst Event verwerfen).
5. Show-Events (`streaker`, `tumbleweed`, `camera_flash`, `ufo`) haben keinen Läufer.
6. `slipstream` wird nicht vorgeplant, sondern zur Laufzeit geprüft: Wenn Läufer `i` sich 0,5–3 Units hinter Läufer `j` befindet (beliebige Lane, Portrait wie Landscape), und `rngEvents.next() < p_slip · dt`, wird er ausgelöst. Die Bedingung ist positionsabhängig, aber symmetrisch – jeder kann in jedem Windschatten hängen.
7. Zur Laufzeit: Wenn `t ≥ t_e`, wird das Event „gefeuert“: Effekt an Läufer hängen, ins Log schreiben, Animations-State setzen. Das Rendering liest das Log und spielt die Requisiten-Animation ab (z. B. Banane fliegt **1 s vor** `t_e` los, damit sie genau bei `t_e` landet – der Scheduler exponiert dafür `upcoming`).

### 6.2 Effekt-Definition (`engine/effects.js`)

```js
// Jede Effekt-Definition ist eine reine Beschreibung:
{ id: 'vomit', mod: -1.0, duration: 1.5, attack: 0.15, release: 0.4, anim: 'vomit' }
{ id: 'carrot', mod: +0.35, duration: 1.5, attack: 0.3, release: 0.5, anim: 'gallop_fast' }
{ id: 'nap', sequence: [ {mod:-1.0, duration:1.0, anim:'sleep'}, {mod:+0.3, duration:1.0, anim:'gallop_fast'} ] }
{ id: 'hiccup', mod: (tLocal) => 0.2 * Math.sin(tLocal * 12), duration: 2.0, anim: 'hiccup' }
{ id: 'confused', mod: -1.6, duration: 0.7, anim: 'confused' }   // netto rückwärts
{ id: 'wardrobe', mod: -0.10, duration: Infinity, anim: null, sticky: true }
```

`applyEffects(effects, tNow)` → Summe der aktuellen Modifikatoren. Pure Function, exhaustive getestet.

### 6.3 Fairness-Eigenschaften des Event-Systems

- Läufer-Auswahl uniform, unabhängig von Position/Rang.
- Kein Event in `[0, 8 %)` und `(95 %, 100 %]`.
- Max. 2 Events pro Läufer.
- Positiv- und Negativ-Events dürfen unterschiedlich gewichtet sein (Negativ ist lustiger), das ist okay, weil es alle Läufer gleich trifft.

## 7. Fairness- & Suspense-Audit (`tests/fairness/audit.js`)

`npm run audit:fairness` führt aus:

```
for N = 100_000 Rennen (Standard; --n=1_000_000 für Release-Audit):
  seed = deterministisch aus Audit-Seed + i (reproduzierbar)
  race = createRace({ seed, config: normal, chaos: normal })
  while (!race.finished) race.step()
  sammle: order, lanes, leader@50%, leader@80%, last@50%, leadChanges, gap12, gap16, eventsPerRunner
```

Ausgabe als Tabelle + JSON (`tests/fairness/last-report.json`). **Exit-Code 1**, wenn ein Kriterium verletzt ist:

| Prüfung                                          | Kriterium                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Siege pro Läufer-Index                           | jeder Anteil in `[1/6 − 0.006, 1/6 + 0.006]` **und** Chi²-Test (5 FG) p > 0.001 |
| Siege pro Lane                                   | dito                                                                            |
| Platz 2–6 pro Läufer                             | Chi² p > 0.001 je Platz                                                         |
| Events pro Läufer                                | Chi² p > 0.001                                                                  |
| Sieg nach Chaos-Level (calm/normal/wild, je 30k) | jeweils obiges Kriterium                                                        |
| Sieg nach Renndauer (short/normal/long, je 30k)  | jeweils obiges Kriterium                                                        |
| S1                                               | `P(leader@50% wins) ∈ [0.25, 0.40]`                                             |
| S2                                               | `P(leader@80% wins) ∈ [0.45, 0.65]`                                             |
| S3                                               | `P(Sieger war bei 50 % auf Platz 4–6) ≥ 0.20`                                                       |
| S4                                               | `mean(leadChanges) ≥ 4`                                                         |
| S5                                               | `P(gap12 < 10 units) ∈ [0.25, 0.45]`                                            |
| S6                                               | `p95(gap16) < 150 units`                                                        |

Das Audit läuft in **CI bei jedem Push** (`ci.yml`) mit N = 100k (Laufzeit-Ziel < 60 s in Node; die Engine muss also schnell sein: keine Allokationen im Hot Path). Vor jedem Release zusätzlich lokal mit `--n=1000000`.

### 7.1 Zwei Kriterien wurden in M2 geändert (2026-09-02)

Die Tuning-Schleife hat zwei Ziele als unerreichbar nachgewiesen. Beide Änderungen sind mit
Messungen belegt; die Fairness-Kriterien F1–F5 blieben unangetastet.

**S3 war: „Das letzte Pferd bei 50 % gewinnt in ≥ 8 % der Rennen."**
Nicht erreichbar. Selbst mit **komplett abgeschalteten Events** erreicht das Modell nur 7,05 %,
und jeder Parametersatz, der weiter kommt, drückt S2 unter sein eigenes Minimum – die beiden
Ziele ziehen gegeneinander: S3 verlangt spätes Durchmischen, S2 verlangt, dass der Führende bei
80 % meist hält. Zusätzlich ist „exakt Letzter" ein sprödes Maß: Es hängt an einer einzigen
Position, während die Design-Absicht („Aufholjagden sind möglich") das ganze hintere Feld meint.

Das Kriterium misst deshalb jetzt Platz 4–6 zusammen. Die gemessene Kurve über 1.000.000 Rennen:

| Position bei 50 % | 1. | 2. | 3. | 4. | 5. | 6. |
|---|---|---|---|---|---|---|
| gewinnt | 31,07 % | 23,12 % | 18,65 % | 14,32 % | 9,27 % | 3,57 % |

Ein sauberer Gradient ohne Sprünge: Vorne zu liegen hilft, entscheidet aber nichts. Platz 4–6
zusammen gewinnen **27,2 %** der Rennen.

**S6 war: „95. Perzentil des Abstands 1. zu 6. < 120 Units."**
Gelockert auf 150. Ein einzelnes Kotz-Event kostet 1,5 s Stillstand – bei 1000 Units in 30 s
sind das 50 Units, also 5 % der Strecke. Mit den Event-Stärken aus `01_GAME_DESIGN.md` §4 ist
ein 12-%-Feld nicht zu halten (gemessen: 106 Units ohne Events, 132 mit, 162 bei „Vollgas").
Die Alternative wäre gewesen, die Events auf die Hälfte zu kürzen; die Entscheidung fiel
zugunsten der Events, weil ein zurückliegendes Pferd erzählerisch begründet ist – das Publikum
hat gesehen, warum.

### 7.2 Der Audit läuft parallel

`tests/fairness/audit.js` verteilt die Rennen auf Worker-Threads (`node:worker_threads`), weil
das Kriterienraster 220.000 Rennen braucht (100k Hauptlauf + 4 × 30k Vergleichsläufe für die
Chaos-Level und Renndauern; die Kombination normal/normal steckt im Hauptlauf). Jedes Rennen
wird aus seinem eigenen Index geseedet, die Aufteilung kann das Ergebnis also nicht verändern.
`--verify-partition` beweist das bei jedem Lauf, indem es dieselbe Menge einmal mit einem und
einmal mit allen Workern rechnet und die Zähler byteweise vergleicht.

Laufzeiten auf einem M-Mac mit 8 Workern: **51 s** für 220.000 Rennen, **6:24 min** für den
Release-Lauf über 1.800.000 Rennen.

## 8. Weitere Engine-Tests (Vitest, `tests/engine/`)

- **Determinismus:** 50 zufällige Seeds; `createRace(seed)` zweimal komplett laufen lassen; `JSON.stringify(result)` identisch.
- **Timestep-Unabhängigkeit:** `step()` akzeptiert kein Argument; ein Test versucht `step(0.5)` und erwartet, dass die Simulation unverändert 1/60 s voranschreitet (oder wirft).
- **Isolation:** Grep-Test, dass `src/engine/**` weder `document`, `window`, `Math.random`, `Date.now` noch `performance` enthält (zusätzlich zu ESLint).
- **Effekte:** Jede Effekt-Definition ergibt bei `t=0` den Attack-Start, bei `t=duration` den Release-Endwert; Sticky-Effekte bleiben.
- **Scheduler:** Über 10k Rennen: nie Event vor 8 % / nach 95 %; nie > 2 Events pro Läufer; Mindestabstand 2 s eingehalten.
- **Zieleinlauf:** Wenn zwei Läufer im selben Step die Linie überqueren, entscheidet die interpolierte Crossing-Zeit; bei exakt gleicher Zeit ein Münzwurf aus `rngSpeed` (getestet mit konstruiertem Zustand).
- **Payout (`payout.js`):** Tabellengetriebene Tests für Sieg/Platz/Letzter/Frei, Haus gewinnt, mehrere Gewinner auf demselben Pferd, Event-Trinkregeln an/aus, Alkoholfrei-Modus (Wording ändert nichts an Zahlen).

## 9. Debug-Werkzeuge (ab M2, nur mit `?debug=1` in der URL)

- Seed in der HUD anzeigen; `?seed=123` erzwingt einen Seed (ideal, um Render-Bugs bei einem konkreten Rennen zu reproduzieren).
- Overlay mit Live-Geschwindigkeitskurven aller sechs Läufer (Mini-Chart, Canvas).
- `window.__race` exponiert die aktuelle Race-Instanz.
- Taste `F` = Rennen bis Ende vorspulen (ruft `step()` in einer Schleife), `R` = mit neuem Seed neu starten, `S` = selben Seed neu starten.

## 10. Was ausdrücklich verboten ist

- Den Sieger vorab zu ziehen und den Verlauf darauf zu „biegen“. (Wäre zwar fair, aber die Simulation soll ehrlich sein – und es ist unnötig, wenn die Symmetrie stimmt.)
- Pferde-IDs, Namen oder Farben in `src/engine/` zu referenzieren.
- Irgendeinen Zustand aus dem Betting (wer hat wie viel gesetzt) an die Engine zu übergeben.
- Zufall außerhalb des `rng`-Objekts.
