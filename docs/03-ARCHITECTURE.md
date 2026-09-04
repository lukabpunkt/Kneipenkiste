# SPRENGMEISTER — Technische Architektur

> Version 1.0 · Verbindlich für Claude Code. Stack, Performance-Regeln, Layout, Dev-Tools, Deployment, Sicherheit sind **identisch zu Drinkshot** (dort `03-ARCHITECTURE.md` §1, §7–§12). Hier: Kurzfassung + alles, was anders oder neu ist. Abweichungen → 5-Zeilen-ADR in `docs/DECISIONS.md`.

---

## 1. Stack (Kurzfassung)

Vite 6 · TypeScript 5 strict · **PixiJS v8** (Feld, interaktiv) · **GSAP 3** · Vanilla TS + HTML/CSS für Menüs · eigener Store + FSM · howler.js · `crypto.getRandomValues` + seedbarer PRNG · vite-plugin-pwa · Vitest · Playwright · GitHub Pages (`base: '/Sprengmeister/'`).

Bundle-Ziel: ≤ 450 KB JS gzip, Assets ≤ 1 MB. Board-Chunk lazy während LOBBY.

**Code-Sharing:** Wie beim Tresor — wiederverwendbare Module aus Drinkshot/Tresor werden **kopiert** (Store, RNG, i18n, Router, Komponenten, Shotling-Rig, ParticlePool, SpeechBubble, AudioManager, Atlas-Scripts). Shared-Package erst nach v1.0 aller drei Spiele.

**Besonderheit gegenüber den Schwesterspielen:** Das PIXI-Feld ist **interaktiv** (Taps auf Platten) und wird in **drei** Screens gebraucht (Place, Dig, Result-Replay). Es ist daher eine wiederverwendbare `BoardView`-Komponente mit Modi, kein reiner Show-Stage.

---

## 2. Ordnerstruktur

```
Sprengmeister/
├─ CLAUDE.md · README.md · docs/ (01–05, DECISIONS, PROGRESS, screens/)
├─ index.html · vite.config.ts · tsconfig.json · package.json
├─ public/ (manifest, icons, fonts, atlas/, audio/)
├─ assets-src/svg/{diggers,plates,critters,mines,treasure,field,fx}/ · audio-src/
├─ scripts/ (build-atlas.mjs, build-audio-sprite.mjs)
├─ src/
│  ├─ main.ts
│  ├─ config/
│  │  ├─ theme.ts        # Tokens
│  │  ├─ rules.ts        # Feldgröße je n, Minen pro Spieler, Trinkwerte, Token-Werte, Hinweis-Schwellen, Modi-Parameter, Timer
│  │  └─ choreo.ts       # Timing der Grab-Anticipation, Banner-Dauern, Replay-Welle
│  ├─ core/
│  │  ├─ store.ts · fsm.ts · rng.ts · i18n.ts
│  │  ├─ board.ts        # REINE FUNKTIONEN: createBoard, placeMine, removeMine, finalizeMines, placeTreasure, dig, hintFor, publicView, replayView
│  │  ├─ payout.ts       # DigResult → Trinker + Tokens; Rundenabschluss; Modus-Boni
│  │  ├─ modes.ts        # Doppelagent (Mine/Blindgänger), Nachtgräber, Zwei Kisten, Kettenreaktion, Sprengmeister-Bonus
│  │  ├─ turn.ts         # Zugreihenfolge, Startspieler-Rotation, Timer-Fallback
│  │  └─ session.ts      # Scoreboard, Sprengungen verursacht/kassiert, Kisten, Persistenz
│  ├─ ui/
│  │  ├─ router.ts · components/ (button, badge, sheet, toast, turnBanner, drinkBanner, tokenStack, timerRing)
│  │  └─ screens/ (Title, Lobby, Pass, Place, Buried, Dig, Distribute, Result, SettingsSheet, RulesSheet)
│  ├─ game/
│  │  ├─ BoardApp.ts     # PIXI-Singleton, Resize, Ticker→GSAP
│  │  ├─ BoardView.ts    # Feld-Komponente mit Modi: 'place' | 'dig' | 'replay' | 'idle'; emittiert 'tileTap'
│  │  ├─ Tile.ts         # Platte mit Zuständen (Art Direction §4.1), open()/crater()/treasure()/reveal()/dud()
│  │  ├─ Field.ts        # Wiese, Zaun, Baum, Hügel, Schild, Digger-Bank-Positionen
│  │  ├─ Digger.ts       # Shotling + Helm/Weste/Schaufel/Ruß-Slots, walkTo(), dig(), soot(), reset()
│  │  ├─ Camera.ts       # Zoom auf Platte, Shake
│  │  ├─ DigDirector.ts  # spielt einen DigResult ab: Anticipation → Sequenz → Banner → Board-Update → Event 'digShown'
│  │  ├─ fx/ (ParticlePool, Smoke, DirtBurst, ColorRing, SpeechBubble, KillFeedToast)
│  │  └─ sequences/
│  │     ├─ Sequence.ts          # Interfaces + Registries (hit, dud, treasure, empty) + gewichtete Auswahl + No-Repeat
│  │     ├─ empty/Worm.ts, Beetle.ts, Bone.ts, Boot.ts
│  │     ├─ hit/ClassicLaunch.ts, SootFace.ts, HelmetRocket.ts, ShovelPretzel.ts, TreeLanding.ts, CraterHop.ts, ChainDance.ts, DudThenBoom.ts
│  │     ├─ dud/Pfff.ts
│  │     └─ treasure/Fanfare.ts, TooHeavy.ts, Greed.ts
│  ├─ audio/ · i18n/ · styles/
├─ tests/
│  ├─ unit/board.test.ts, payout.test.ts, modes.test.ts, turn.test.ts, fsm.test.ts, sequenceRegistry.test.ts, publicView.test.ts
│  └─ e2e/flow.spec.ts, perf.spec.ts
└─ .github/workflows/ci.yml, deploy.yml
```

---

## 3. Game-State-Machine

```
TITLE ─start─► LOBBY ─mine(players≥3)─► PASS(i=0) ─tap─► PLACE(i) ─bury─► i<n-1 ? PASS(i+1) : BURIED
   ▲                                                                                        │ tap → placeTreasure()
   │                                                                                     DIG ◄──┐
   │                                                                   tileTap → dig() → DigResult │ digShown && !roundOver
   │                                                                                        │ roundOver
   │                                                          anyTokens ? DISTRIBUTE(owner j…) : RESULT
   │                                                                                        │
   └──────────── changePlayers ────────────────────────────────────────────────────── RESULT ┘
                                                                        nextRound → PASS(0) (Startspieler rotiert)
```

- `dig()` (aus `core/board.ts`) läuft pro Tap **genau einmal** und ist eine reine Funktion `(board, cell, playerId) → { board', result }`. Der `DigDirector` inszeniert nur das `result`.
- Während `DigDirector` spielt, ist das Board **gesperrt** (`BoardView.locked = true`); Taps werden ignoriert, nicht gepuffert.
- DISTRIBUTE iteriert über alle Token-Besitzer (Finder zuerst, dann Leger in Reihenfolge der Explosionen); jeder Schritt ist ein Pass-Light-Screen ("Handy an {Name}" — ohne Privacy, Verteilung ist öffentlich).
- Back-Button in PASS/PLACE/DIG → "Runde abbrechen?".

---

## 4. Datenmodell

```ts
type Cell = number;                               // 0..size*size-1
type Hint = 'hot' | 'warm' | 'cold' | 'none';     // 'none' bei Nachtgräber

interface MineStack { cell: Cell; owners: string[]; duds: string[] }   // duds: Blindgänger-Leger (Doppelagent)

interface Board {
  size: 5 | 6;
  mines: Record<Cell, MineStack>;                 // privat! nie an UI außer Place (eigene) und Replay
  treasure: Cell[];                               // 1 oder 2 (Zwei Kisten)
  opened: Record<Cell, OpenedCell>;               // öffentlich
}

interface OpenedCell {
  by: string;
  kind: 'empty' | 'crater' | 'treasure' | 'greed' | 'dud';
  hint: Hint;
  blamed: string[];                                // Legerfarben, die gezeigt werden (fremde Minen bzw. Blindgänger-Leger)
  critter?: 'worm' | 'beetle' | 'bone' | 'boot';
}

interface DigResult {
  cell: Cell; by: string;
  kind: OpenedCell['kind'];
  hint: Hint;
  foreignMines: string[];       // Leger fremder Minen (Duplikate möglich? nein: je Spieler max 1 Mine pro Feld)
  ownMineConsumed: boolean;     // intern, nie angezeigt
  dudOwners: string[];
  treasureFound: boolean;
  chainReveals?: { cell: Cell; owners: string[] }[];   // Kettenreaktion
  roundOver: boolean;
  sequenceId: string;           // gewählte Inszenierung
}

interface RoundResult {
  index: number; size: 5|6; seed: number;
  digs: DigResult[];
  drinkers: { playerId: string; sips: number; reason: 'mine'|'coward' }[];
  tokens: Record<string, number>;
  distribution: { from: string; to: string; sips: number }[];
  finderIds: string[];
  replay: ReplayCell[];         // alle Zellen inkl. nicht ausgelöster Minen
}

interface Settings {
  modes: { doubleAgent: boolean; nightDigger: boolean; twoChests: boolean; chainReaction: boolean; masterBonus: boolean };
  placeTimerSec: 0|10; digTimerSec: 0|10;
  sound: boolean; music: number; haptics: boolean; lowEffects: boolean; locale: 'de'|'en';
}
```

**`publicView(board, viewerId?)`** liefert das, was die UI zeigen darf: im Dig/Result-Modus **nur** `opened`, `size`, Anzahl verbleibender Minen gesamt; im Place-Modus zusätzlich die eigenen Minen des `viewerId`. **Nie** fremde Minen, nie die Kiste. Ein Unit-Test serialisiert `publicView` für ein Board mit einer aufgegrabenen eigenen Mine und einem echten leeren Feld und prüft, dass beide `OpenedCell`s **strukturell identisch** sind (bis auf `critter`, der aus dem Seed kommt).

---

## 5. Board-Logik (`core/board.ts`) — Spezifikation für Tests

```
createBoard(n): size = n <= 5 ? 5 : 6
placeMine(board, cell, playerId, kind: 'mine'|'dud'): max 2 (Klassik) bzw. 1+1 (Doppelagent) pro Spieler; gleiche Zelle zweimal vom selben Spieler → Fehler
placeTreasure(board, secureRng): 1 (oder 2) uniform über ALLE Zellen, auch verminte; bei 2 Kisten verschiedene Zellen
hintFor(board, cell): chebyshev(cell, nächste Kiste) → 1:'hot', 2:'warm', >=3:'cold'; Nachtgräber → 'none'; Zelle mit Kiste selbst → nicht relevant (wird 'treasure')
dig(board, cell, by):
  offen? → Fehler
  foreign = mines[cell].owners ohne by; duds = mines[cell].duds ohne by (eigener Dud ebenfalls stumm)
  treasure = cell in board.treasure
  kind =
    treasure && foreign.length → 'greed'
    treasure                    → 'treasure'
    foreign.length              → 'crater'
    duds.length                 → 'dud'
    sonst                       → 'empty'           (auch bei eigener Mine — ownMineConsumed = true)
  Kettenreaktion: kind ∈ {crater, greed} → alle Nachbarn (8) mit Minen: als 'crater' öffnen, blamed = owners, niemand trinkt, Hinweise sichtbar
  roundOver = alle Kisten gefunden
payout(result):
  crater/greed: by trinkt 2 * foreign.length; jeder in foreign +1 Token
  treasure/greed: by +4 Tokens (size 6: +6; Zwei Kisten: 2 / 3)
  Sprengmeister-Bonus: Leger mit >= 2 verschiedenen Opfern in der Runde +1 Token; Spieler, dessen beide eigenen Minen von ihm selbst geöffnet wurden → trinkt 1 ('coward')
turn: Startspieler = (roundIndex - 1) mod n; nächster = (aktuell + 1) mod n; Timer-Fallback: zufällige geschlossene Zelle (secure)
```

Invarianten (Property-Test 10 000 Runden mit Zufallszügen): Runde endet immer; Summe Tokens == 4/6 (+ Explosionen + Boni); niemand trinkt negativ; `publicView` enthält nie eine nicht geöffnete Mine; eigene Mine → `kind === 'empty'` und `blamed === []`.

---

## 6. DigDirector & Sequenzen

```ts
interface SequenceContext { result: DigResult; tile: Tile; digger: Digger; others: Digger[]; field: Field; camera: Camera; fx: FxKit; audio: AudioManager; rng: SeededRng; blamedColors: ColorId[] }

interface DigSequence {
  id: string;
  kind: 'empty' | 'hit' | 'dud' | 'treasure' | 'greed';
  weight: number;
  minStack?: number;                 // hit_chain_dance: 2
  excludeInModes?: (keyof Settings['modes'])[];   // hit_dud_then_boom: ['doubleAgent']
  build(ctx: SequenceContext): gsap.core.Timeline;
}
```

Ablauf `DigDirector.play(result)`:
1. `BoardView.locked = true`, Kamera-Zoom auf Platte, Digger `walkTo(tile)` (250 ms), 3 Schaufelstöße, 200 ms Zittern (Anticipation gesamt ~ 900 ms, aus `choreo.ts`).
2. Sequenz aus Registry (gewichtet, No-Repeat 3 pro Kind, Filter `minStack`/`excludeInModes`), `build()` → Timeline.
3. Bei `crater`/`greed`: **ColorRing der Leger ≤ 300 ms nach Explosions-Frame** (Pflicht, Test über Timeline-Labels), Drink-Banner + Kill-Feed-Toast parallel, Haptik.
4. Kettenreaktion: Nachbarkrater nacheinander (80 ms Versatz), Leger-Ringe, kein Banner.
5. Board-Update (`Tile` in Endzustand), Digger zurück zur Bank (rußig bleibt), `locked = false`, Event `digShown`.
6. `treasure`/`greed`: nach Sequenz kein Unlock, Event `roundOver`.

Tap-to-Skip: nicht vorgesehen — Sequenzen sind ≤ 3.5 s (Treasure ≤ 5 s). Ein Tap während einer Sequenz wird ignoriert.

---

## 7. BoardView-Modi

| Modus | Eingabe | Sichtbar |
|---|---|---|
| `place` | Tap toggelt eigene Mine (bis Limit), Werkzeug-Chip bei Doppelagent | Leeres Feld + eigene Minen |
| `dig` | Tap auf geschlossene Platte → `tileTap` | `publicView` |
| `replay` | keine | Alles (Minen mit Legerfarbe, Kisten, "Phew"-Schilder) |
| `idle` | keine | Title-Loop |

Die `BoardView` wird zwischen Screens **nicht zerstört**, sondern per `setMode()` umgeschaltet; das PIXI-Canvas wird im DOM zwischen Screen-Hosts umgehängt (`appendChild`), damit Place → Dig → Result keine Neuinitialisierung braucht.

---

## 8. Performance, Layout, Dev-Tools, Sicherheit, Deployment

Identisch zu Drinkshot §7–§12. Ergänzungen:
- Tiles sind Sprites aus dem Atlas (kein `Graphics` pro Platte); Zustände über Textur-Tausch + Overlays.
- Hit-Testing über PIXI `eventMode: 'static'` pro Tile mit `hitArea` Rectangle; keine DOM-Overlays über dem Canvas.
- Dev-Panel (`?dev=1`): Sequenz-Preview (alle IDs), "Reveal mines" (Debug-Ansicht des privaten Boards, **nur** im Dev-Modus), Seed-Eingabe, "Simulate 10 000 rounds" (Verteilung von Rundenlänge, Explosionen pro Runde, Preis-der-Gier-Rate), FPS.
- Perf-Test: 6 × 6, 8 Digger, `hit_chain_dance` + Kettenreaktion, CPU 4×: p50 ≤ 20 ms, p95 ≤ 40 ms, ≤ 2 Long-Tasks.
- **Sicherheit der Information:** Das private `Board` liegt nur im Store; Screens erhalten ausschließlich `publicView`. Ein Lint-Test (`publicView.test.ts`) prüft, dass keine Screen-Datei `board.mines` referenziert.
