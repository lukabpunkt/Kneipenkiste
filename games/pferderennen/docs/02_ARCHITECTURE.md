# 02 – Technische Architektur

## 1. Grundsatzentscheidungen

| Entscheidung      | Wahl                                                                                                   | Begründung                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sprache           | Vanilla JavaScript (ES2022, ES Modules)                                                                | Kein Build-Schritt, sofort auf GitHub Pages lauffähig, maximal transparent.                                                                              |
| Rendering         | HTML5 Canvas 2D für das Rennen; DOM/CSS für Menüs und Overlays                                         | Canvas für 60 FPS mit vielen Sprites und Partikeln; DOM für Formulare, Buttons, Barrierefreiheit.                                                        |
| Grafik-Assets     | **Prozedural gezeichnet** (Canvas-Pfade) + kleine Inline-SVGs für UI-Icons. Keine Bitmaps als Pflicht. | Keine Asset-Pipeline nötig, beliebig skalierbar, Farben zur Laufzeit austauschbar. Falls Sprite-Sheets später gewünscht: Adapter in `render/sprites.js`. |
| Zufall            | Eigener seedbarer PRNG (`mulberry32` oder `sfc32`), gespeist aus `crypto.getRandomValues`              | Deterministisch testbar, Seed für Replays/Debug, kryptografisch guter Startwert.                                                                         |
| Zeit              | Fixer Simulations-Timestep (60 Hz) mit Akkumulator, Rendering mit Interpolation                        | Ergebnis unabhängig von Framerate des Geräts (**Fairness!**).                                                                                            |
| State             | Ein zentrales, unveränderliches (immutable) `gameState`-Objekt + kleine Reducer-Funktionen             | Einfach zu debuggen, einfach in `localStorage` zu persistieren.                                                                                          |
| Tests             | Vitest (Engine, Unit), Playwright (Smoke E2E), eigenes Fairness-Audit-Script                           | Engine ist DOM-frei → schnelle Tests in Node.                                                                                                            |
| Dev-Server        | `vite` nur als Static Server (`vite --host`) **oder** `npx serve`. **Kein** Vite-Build nötig.          | Bequemes Live-Reload ohne Bundling-Zwang. Deployment kopiert `/` unverändert.                                                                            |
| Formatierung/Lint | Prettier + ESLint (flat config)                                                                        | Konsistenz für Claude Code.                                                                                                                              |

> **Wichtig:** Das fertige Spiel muss laufen, indem man `index.html` auf einem beliebigen Static-Host öffnet. Alle Importe relativ (`./src/...`), keine Bare-Module-Specifier.

## 2. Verzeichnisstruktur (Ziel-Zustand)

```
Pferderennen/
├── index.html                 # Einzige HTML-Seite, lädt src/main.js als Module
├── manifest.webmanifest       # PWA-Manifest (Icon, Name, Portrait-Orientation-Hinweis)
├── sw.js                      # Service Worker: Cache-First für Offline (ab M8)
├── assets/
│   ├── icons/                 # favicon.svg, app-icon-192.png, app-icon-512.png
│   ├── audio/                 # optionale kleine OGG/MP3 (falls nicht synthetisiert)
│   └── fonts/                 # ggf. self-hosted Display-Font (woff2)
├── src/
│   ├── main.js                # Bootstrap: State laden, Router starten, Loop starten
│   ├── config.js              # ALLE Tuning-Konstanten (Renndauer, Event-Gewichte, Farben)
│   ├── data/
│   │   ├── horses.js          # 6 Pferde: id, name, color, palette, look, commentary[]
│   │   ├── events.js          # Event-Definitionen (id, weight, window, effect, duration…)
│   │   └── commentary.js      # Allgemeine Kommentator-Zeilen (start, leadChange, finish…)
│   ├── engine/                # >>> DOM-frei, deterministisch, 100 % getestet <<<
│   │   ├── rng.js             # createRng(seed) → { next(), int(a,b), pick(arr), weighted(arr) }
│   │   ├── race.js            # createRace({seed, config}) → { step(dt), state, finished }
│   │   ├── speedModel.js      # Geschwindigkeitsmodell (Phasen, Noise, Sprints)
│   │   ├── eventScheduler.js  # Wann/welches Event, welches Pferd; enforce Fairness-Regeln
│   │   ├── effects.js         # Wie ein Event die Geschwindigkeit modifiziert (pure functions)
│   │   └── payout.js          # Wetten auswerten → wer trinkt/verteilt wie viel
│   ├── state/
│   │   ├── store.js           # createStore(initialState) → { getState, dispatch, subscribe }
│   │   ├── reducers.js        # players, bets, settings, session stats
│   │   └── persistence.js     # localStorage laden/speichern (versioniert)
│   ├── render/
│   │   ├── loop.js            # requestAnimationFrame-Loop, Fixed Timestep, Interpolation
│   │   ├── camera.js          # Kamera (folgt Feld, Zoom bei Fotofinish, Shake)
│   │   ├── track.js           # Bahn, Rasen, Startboxen (in Pferdefarbe), Ziellinie, Publikum
│   │   ├── horse.js           # Prozedurales Pferd: Körper, Beine (Gallop-Zyklus), Jockey, Sattel
│   │   ├── horseAnimations.js # Zustände: idle, gallop, stumble, vomit, sleep, celebrate…
│   │   ├── particles.js       # Staub, Konfetti, Sternchen, Regenbogen, Spritzer
│   │   ├── eventVisuals.js    # Pro Event: Requisiten (Banane, Taube, Möhre…) zeichnen
│   │   ├── hud.js             # Leaderboard, Fortschrittsbalken, Kommentator-Zeile, Toasts
│   │   └── sprites.js         # (optional) Sprite-Sheet-Adapter
│   ├── ui/
│   │   ├── router.js          # Screen-Wechsel (hash-basiert oder state-basiert)
│   │   ├── screens/
│   │   │   ├── start.js
│   │   │   ├── players.js
│   │   │   ├── betting.js
│   │   │   ├── race.js        # Hostet das Canvas, verbindet Engine ↔ Render ↔ HUD
│   │   │   ├── results.js
│   │   │   ├── stats.js
│   │   │   ├── rules.js
│   │   │   └── settings.js
│   │   └── components/        # Kleine DOM-Helfer: button.js, stepper.js, toast.js, modal.js
│   ├── audio/
│   │   ├── audio.js           # Web Audio Context, Mute, Unlock bei erster Interaktion
│   │   └── sfx.js             # Synthetisierte Sounds (Huf, Glocke, Furz, Fanfare…)
│   └── styles/
│       ├── tokens.css         # Design-Tokens (Farben, Spacing, Radii, Schatten, Fonts)
│       ├── base.css           # Reset, Typografie, Layout-Grundgerüst
│       ├── components.css     # Buttons, Karten, Stepper, Toasts, Modals
│       └── screens.css        # Screen-spezifische Layouts, Responsive Rules
├── tests/
│   ├── engine/                # Vitest Unit-Tests: rng, speedModel, eventScheduler, payout, race
│   ├── e2e/                   # Playwright: smoke.spec.js (kompletter Durchlauf)
│   └── fairness/
│       └── audit.js           # Headless-Simulation, Statistik, Exit-Code ≠ 0 bei Verstoß
├── scripts/
│   └── serve.js               # (optional) minimaler Static Server ohne Deps
├── docs/                      # Dieser Projektplan
├── PROGRESS.md
├── CLAUDE.md
├── README.md
├── package.json
├── eslint.config.js
├── .prettierrc
├── .gitignore
└── .github/workflows/
    ├── ci.yml                 # Lint + Tests + Fairness-Audit bei jedem Push/PR
    └── deploy.yml             # GitHub Pages Deploy von main
```

## 3. Game State Machine

```
        ┌──────────┐
        │  START   │◄────────────────────────────────┐
        └────┬─────┘                                 │
             │ „Los geht's“ / „Weiterspielen“        │ „Spieler ändern“
        ┌────▼─────┐                                 │
        │ PLAYERS  │                                 │
        └────┬─────┘                                 │
             │ ≥ 2 Spieler bestätigt                 │
        ┌────▼─────┐      „Nächstes Rennen“     ┌────┴─────┐
   ┌───►│ BETTING  │◄───────────────────────────┤ RESULTS  │
   │    └────┬─────┘                            └────▲─────┘
   │         │ alle haben gesetzt                    │
   │    ┌────▼─────┐   COUNTDOWN → RUNNING →        │
   │    │   RACE   │   PHOTO_FINISH? → FINISHED ─────┘
   │    └──────────┘
   │
   └── SETTINGS / RULES / STATS sind Overlays (Modal), kein eigener Hauptzustand
```

Der Screen-Zustand liegt in `state.screen`. Der Race-Substate (`countdown | running | photoFinish | finished`) liegt in `state.race.phase`.

## 4. Datenmodell

```js
// state (persistiert in localStorage unter Key "pferderennen:v1")
{
  version: 1,
  screen: 'start' | 'players' | 'betting' | 'race' | 'results',
  settings: {
    raceLength: 'short' | 'normal' | 'long',
    chaos: 'calm' | 'normal' | 'wild',
    eventDrinkRules: true,
    leadChangeRule: false,
    betType: 'win' | 'place' | 'last' | 'free',
    sound: true, vibration: true, sober: false,
    reducedMotion: 'auto' | 'on' | 'off',
    debugSkip: false,
  },
  players: [ { id: 'p1', name: 'Luka', avatar: '🦄' }, … ],   // 2–12
  bets: [ { playerId: 'p1', horseId: 'trabsalot', sips: 3, type: 'win' }, … ],
  lastBets: [ … ],                      // Wetten des zuletzt gelaufenen Rennens, für „übernehmen"
  bettingTurn: 0,                       // Index des Spielers, der gerade setzt
  race: {
    seed: 123456789,                    // uint32; wird bei Race-Start neu gezogen
    phase: 'countdown' | 'running' | 'photoFinish' | 'finished',
    result: null | { order: ['morgana', 'trabsalot', …], times: {…}, events: [...] },
  },
  session: {
    racesPlayed: 0,
    perPlayer: { p1: { drank: 0, dealt: 0, wins: 0, loseStreak: 0, maxLoseStreak: 0 } },
    history: [ { seed, winnerId, timestamp } ],  // max 50
  },
}
```

Die **laufende Simulation** (Positionen, Geschwindigkeiten, aktive Effekte) lebt **nicht** im persistierten State, sondern im `RaceInstance`-Objekt aus `engine/race.js`, das nur während `screen === 'race'` existiert.

## 5. Modul-Verträge (Interfaces)

### 5.1 `engine/rng.js`

```js
export function createRng(seed /* uint32 */) {
  return {
    next(): number,                  // [0, 1)
    int(minIncl, maxIncl): number,
    pick(array): any,
    weighted(items /* [{value, weight}] */): any,
    gaussian(mean = 0, sd = 1): number,   // Box-Muller
    fork(): Rng,                      // unabhängiger Sub-Stream (für Events vs. Speed)
    state(): uint32,                  // für Debug/Replay
  };
}
export function randomSeed(): number  // aus crypto.getRandomValues
```

### 5.2 `engine/race.js`

```js
export function createRace({ seed, config, horses /* ids */ }) {
  return {
    step(dtSeconds),                  // führt genau einen fixen Simulationsschritt aus
    get state(): {
      t, phase, progress /* 0..1 */,
      horses: [{ id, lane, x /* 0..trackLength */, v, effects: [...], anim: 'gallop'|… }],
      events: [ { id, horseId, t, done } ],    // Log
      leader: horseId, leadChanges: number,
      finished: boolean, order: [ids...] | null,
    },
    snapshot(),                       // tiefe Kopie für Interpolation/Tests
  };
}
```

Die Engine kennt **keine** Pixel. Positionen sind in abstrakten Track-Units (Länge 1000). Rendering skaliert.

### 5.3 `engine/payout.js`

```js
export function settle({ bets, order, settings }) → {
  winners: [{ playerId, sipsToDeal }],
  losers:  [{ playerId, sipsToDrink }],
  houseWins: boolean,
  eventRules: [{ text, playerIds, sips, direction: 'drink'|'deal' }]  // aus Event-Log
}
```

Pure Funktion, vollständig getestet mit allen Wettarten.

### 5.4 `render/loop.js`

```js
export function createLoop({ update /* (dt) */, render /* (alpha) */, hz = 60 })
  → { start(), stop(), isRunning() }
```

Akkumulator-Pattern: `while (acc >= step) { update(step); acc -= step; }` `render(acc / step)`. Bei Tab-Wechsel (`visibilitychange`) wird die Simulation **pausiert** (nicht nachgeholt), damit das Rennen nicht in einem Frame durchläuft.

### 5.5 `state/store.js`

Minimaler Store nach Redux-Muster ohne Library. `dispatch({type, payload})` → Reducer → neue State-Referenz → Subscriber. `persistence.js` subscribed und schreibt debounced (200 ms) in `localStorage`.

## 6. Render-Pipeline (pro Frame)

1. `camera.update(raceState, alpha)` – Zielposition = Mittelpunkt des Feldes (oder Führender +25 % Vorschau), sanftes Lerp; bei Fotofinish Zoom auf Ziellinie.
2. `track.draw(ctx, camera)` – Hintergrund-Layer (Himmel, Tribüne mit Publikum-Parallax), Rasen, Bahnen, Startboxen (je in Pferdefarbe), Ziellinie, Dekor (Pfützen, Bananenschalen, die liegen bleiben).
3. `eventVisuals.drawBehind(ctx, …)` – Requisiten hinter den Pferden.
4. Pferde nach `y`-Reihenfolge (für Portrait: Lane-Reihenfolge) mit `horse.draw(ctx, horseState, anim, alpha)`; Schatten zuerst.
5. `particles.draw(ctx)`.
6. `eventVisuals.drawFront(ctx, …)` – Requisiten vor den Pferden (Banane im Flug, Taube).
7. `hud.draw(ctx | DOM)` – Leaderboard, Fortschrittsbalken (Mini-Pferde-Icons auf einer Linie), Kommentar. HUD-Textelemente sind **DOM** (Overlay `<div>`), nicht Canvas – für Barrierefreiheit und scharfen Text.

Canvas-Auflösung: `devicePixelRatio`-korrekt (max 2×), `ctx.imageSmoothingEnabled = true`. Bei `resize` neu skalieren.

## 7. Layout-Modi

| Modus                                  | Bedingung      | Bahnen                                                                                                                                                                                 |
| -------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Landscape** (Desktop/TV/Tablet quer) | `aspect ≥ 1.2` | 6 horizontale Bahnen, Rennen von links nach rechts, Kamera scrollt horizontal.                                                                                                         |
| **Portrait** (Handy)                   | `aspect < 1.2` | 6 **vertikale** Bahnen nebeneinander, Rennen von unten nach oben, Kamera scrollt vertikal. Pferde werden von schräg hinten gezeichnet (Rücken, Sattel gut sichtbar → Farbe erkennbar). |

Beide Modi nutzen dieselbe Engine (Track-Units) und dieselben Animations-States; nur `track.js` und die Pferde-Perspektive in `horse.js` unterscheiden sich. Portrait-Mode ist **Pflicht**, nicht optional (Handy ist der häufigste Anwendungsfall).

## 8. Performance-Budget

| Metrik                                  | Ziel                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Initial Load (alle Dateien)             | < 300 KB unkomprimiert, < 1 s auf 4G                                     |
| FPS während des Rennens                 | 60 FPS Desktop, ≥ 55 FPS Mittelklasse-Handy (z. B. Pixel 6a / iPhone 12) |
| Frame-Time-Budget                       | Update ≤ 2 ms, Render ≤ 10 ms                                            |
| Partikel gleichzeitig                   | ≤ 400 (Object Pool, kein GC-Druck)                                       |
| Draw Calls (Pfad-Operationen) pro Frame | ≤ ~600; Hintergrund als Offscreen-Canvas gecacht                         |
| Speicher                                | keine wachsenden Arrays über Rennen hinweg; Event-Log max. 50 Einträge   |

## 9. Fehler- und Randfälle

- **Tab im Hintergrund:** Rennen pausiert, Overlay „Pausiert – tippe zum Fortsetzen“.
- **Bildschirm rotiert während des Rennens:** Layout-Modus wechselt live; Engine läuft weiter.
- **Reload während des Rennens:** Rennen ist verloren; State springt zurück zu `betting` mit erhaltenen Wetten und Hinweis „Rennen wurde abgebrochen – nochmal starten“. (Kein Replay-Zwang, das ist einfacher und ehrlich.)
- **`localStorage` nicht verfügbar** (Private Mode): Spiel läuft ohne Persistenz, kein Fehler.
- **Kein WebAudio:** Sound stillschweigend deaktiviert.
- **`prefers-reduced-motion`:** Kamerashake, Blitze, Parallax und Partikel reduziert; Pferde laufen weiterhin (sonst gibt es kein Spiel), aber ohne Screen-Shake.

## 10. Sicherheit & Datenschutz

- Keine externen Requests, keine Analytics, keine Cookies. Nur `localStorage` mit Spielernamen (lokal).
- Spielernamen werden beim Rendern in DOM immer über `textContent` gesetzt, nie `innerHTML`.
- Content-Security-Policy-Meta-Tag in `index.html`: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'` (Inline-Styles für Canvas-Größen nötig; wenn vermeidbar, weglassen).
