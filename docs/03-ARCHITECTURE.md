# DER ZOLL — Technische Architektur

> Version 1.0 · Verbindlich für Claude Code. Stack, Performance-Regeln, Layout, Dev-Tools, Deployment, Sicherheit sind **identisch zu Drinkshot** (`03-ARCHITECTURE.md` dort, §1, §7–§12). Hier: Kurzfassung + alles, was anders oder neu ist. Abweichungen → 5-Zeilen-ADR in `docs/DECISIONS.md`.

---

## 1. Stack (Kurzfassung)

Vite 6 · TypeScript 5 strict · **PixiJS v8** (Zollhalle, interaktiv) · **GSAP 3** · Vanilla TS + HTML/CSS für Menüs · eigener Store + FSM · howler.js · `crypto.getRandomValues` + seedbarer PRNG · vite-plugin-pwa · Vitest · Playwright · GitHub Pages (`base: '/Zoll/'`).

Bundle-Ziel: ≤ 450 KB JS gzip, Assets ≤ 1 MB. Hall-Chunk lazy während LOBBY.

**Code-Sharing:** Wiederverwendbare Module aus Drinkshot/Tresor/Sprengmeister werden **kopiert** (Store, RNG, i18n, Router, Komponenten, Shotling-Rig, ParticlePool, SpeechBubble, AudioManager, Distribute-Screen, Atlas-Scripts). Shared-Package erst nach v1.0 aller Spiele.

**Besonderheit:** Die PIXI-Bühne (`HallView`) ist wie bei Sprengmeister **interaktiv** (Beamter tippt Koffer) und wird in **drei** Screens gebraucht (Hall, Inspect, Gate) — ein Canvas mit Modi, zwischen Screen-Hosts umgehängt.

---

## 2. Ordnerstruktur

```
Zoll/
├─ CLAUDE.md · README.md · docs/ (01–05, DECISIONS, PROGRESS, screens/)
├─ index.html · vite.config.ts · tsconfig.json · package.json
├─ public/ (manifest, icons, fonts, atlas/, audio/)
├─ assets-src/svg/{travelers,officer,dog,suitcases,items,hall,xray,stamps,fx}/ · audio-src/
├─ scripts/ (build-atlas.mjs, build-audio-sprite.mjs)
├─ src/
│  ├─ main.ts
│  ├─ config/
│  │  ├─ theme.ts        # Tokens
│  │  ├─ rules.ts        # min/max Spieler, Menge 0–6 (Hochsaison 0–10), k je n, h je n, p_true 0.6, Trinkwerte (2a / 2 / 3), Boni, Modi-Parameter, Timer
│  │  └─ choreo.ts       # Hinweis-Timing, Scan-Dauer + Stall, Banner-Dauern, Gate-Reihenfolge-Timing
│  ├─ core/
│  │  ├─ store.ts · fsm.ts · rng.ts · i18n.ts
│  │  ├─ round.ts        # REINE FUNKTIONEN: createRound (Beamter, Item-Set, Diplomat), pack, generateHints, inspect, bribe, gateOrder, finishRound
│  │  ├─ hints.ts        # Hinweis-Modell (h, p_true, Verschiedenheit, kein-Schmuggler-Fall, Spürhund-Hinweis)
│  │  ├─ payout.ts       # InspectResult/GateResult → Trinker + Tokens; Boni
│  │  ├─ modes.ts        # Bestechung, Spürhund (k−1), Diplomat, Hochsaison
│  │  └─ session.ts      # Beamten-Rotation, Statistik (über die Grenze, erwischt, Trefferquote, belästigt), Persistenz
│  ├─ ui/
│  │  ├─ router.ts · components/ (button, badge, sheet, toast, stepper, riskLine, countdownRing, officerButton, openingsChip, bribeChip, tokenStack)
│  │  └─ screens/ (Title, Lobby, OfficerIntro, Pass, Pack, Packed, Hall, Inspect, Gate, Distribute, Result, SettingsSheet, RulesSheet)
│  ├─ game/
│  │  ├─ HallApp.ts      # PIXI-Singleton, Resize, Ticker→GSAP, Canvas-Umhängen
│  │  ├─ HallView.ts     # Bühne mit Modi: 'hints' | 'interrogation' | 'inspect' | 'gate' | 'idle'; emittiert 'suitcaseTap'
│  │  ├─ Hall.ts         # Wand, Tafel, Band, Röntgengerät, gelbe Linie, Schranke
│  │  ├─ Suitcase.ts     # Koffer mit Zuständen (Art Direction §4.1), hint(type), select(), scan(), openCaught(items), openClean(items), passOk(), passSmuggler(items), diplomat(), bribed()
│  │  ├─ XrayMonitor.ts  # Scanline-Aufbau mit Stall, Silhouetten-Layout, Bloom-Filter temporär
│  │  ├─ Traveler.ts     # Shotling + Hut/Kamera/Hemd, Gesichter, sweat(level), walkThroughGate()
│  │  ├─ Officer.ts      # Shotling + Mütze/Jacke/Klemmbrett/Pfeife, Gesichter, clipboardMark(kind), whistle()
│  │  ├─ Waldi.ts        # Spürhund-NPC
│  │  ├─ Camera.ts
│  │  ├─ HintDirector.ts     # spielt Hint-Beats ab (Hall)
│  │  ├─ InspectDirector.ts  # Tap → Koffer ins Gerät → Scan → Sequenz → Banner → Board-Update
│  │  ├─ GateDirector.ts     # Reihenfolge sauber → Schmuggler, Stempel, Sequenzen
│  │  ├─ fx/ (ParticlePool, ItemFountain, Sweat, AlarmOverlay, Stamp, RedCarpet, Confetti, SpeechBubble)
│  │  └─ sequences/
│  │     ├─ Sequence.ts          # Interfaces + Registries (xrayCaught, xrayClean, gateClean, gateSmuggler, hint) + Auswahl + No-Repeat
│  │     ├─ xray/caught/AlarmBurst.ts, SweatFlood.ts, SlowZip.ts
│  │     ├─ xray/clean/Teddy.ts, Mug.ts, DuckBow.ts
│  │     ├─ xray/overlays/DiplomatPass.ts
│  │     ├─ gate/clean/Wave.ts, Relief.ts
│  │     ├─ gate/smuggler/Moonwalk.ts, Bow.ts
│  │     └─ hints/Wobble.ts, Drip.ts, Heavy.ts, Click.ts, Feather.ts, Dog.ts
│  ├─ audio/ · i18n/ · styles/
├─ tests/
│  ├─ unit/round.test.ts, hints.test.ts, payout.test.ts, modes.test.ts, fsm.test.ts, sequenceRegistry.test.ts, publicView.test.ts
│  └─ e2e/flow.spec.ts, perf.spec.ts
└─ .github/workflows/ci.yml, deploy.yml
```

---

## 3. Game-State-Machine

```
TITLE ─start─► LOBBY ─open(players≥4)─► OFFICER_INTRO ─tap─► PASS(i über Reisende) ─tap─► PACK(i) ─close─► … ─► PACKED
   ▲                                                                                                      │ tap → generateHints()
   │                                                                                       HALL(hints → interrogation)
   │                                                                                                      │ endInterrogation | timeout
   │                                                                                       INSPECT ◄──────┘
   │                                                                   suitcaseTap → inspect() → InspectResult → shown → (openings left ? INSPECT : GATE)
   │                                                                   waveAll → GATE
   │                                                                                       GATE ─allPassed─► anyTokens ? DISTRIBUTE : RESULT
   └────────────── changePlayers ────────────────────────────────────────────────────────── RESULT ◄──────┘
                                                                         nextRound → OFFICER_INTRO (Beamter rotiert)
```

- `generateHints()` läuft **genau einmal** bei PACKED→HALL mit `crypto`-RNG; die Hinweise werden im privaten Round-State gespeichert, HALL zeigt sie nur.
- `inspect(cell)` ist eine reine Funktion pro Tap; `InspectDirector` inszeniert nur. Board gesperrt während Sequenz.
- `gateOrder()` berechnet die Reihenfolge sauber → Schmuggler (seeded Permutation innerhalb der Gruppen) **einmal** bei INSPECT→GATE.
- Bestechung: In HALL (Modus) erzeugt `bribe(from, amount)` ein Angebot; `acceptBribe`/`declineBribe` durch den Beamten; angenommene Koffer sind in INSPECT nicht tippbar.
- Back-Button in PASS/PACK/HALL/INSPECT/GATE → "Runde abbrechen?".

---

## 4. Datenmodell

```ts
type ItemSet = 'ducks'|'cheese'|'gnomes'|'flamingos'|'pineapples'|'sombreros'|'cuckoo'|'cacti';
type HintType = 'wobble'|'drip'|'heavy'|'click'|'feather'|'dog';

interface Pack { playerId: string; amount: number }          // 0 = sauber; privat bis Reveal

interface Hint { type: HintType; suitcaseOf: string; truthful: boolean }   // truthful privat bis Result

interface Bribe { from: string; amount: 1|2|3; accepted: boolean | null }

interface Round {
  index: number; officerId: string; travelerIds: string[]; itemSet: ItemSet; seed: number;
  packs: Record<string, Pack>;            // privat
  diplomatId?: string;                    // privat
  hints: Hint[];                          // Typ+Koffer öffentlich ab HALL, truthful privat bis RESULT
  dogHintOf?: string;                     // Spürhund (öffentlich, verlässlich)
  bribes: Bribe[];
  openings: { suitcaseOf: string; result: InspectResult }[];
  maxOpenings: number;                    // k (Modi berücksichtigt)
  gateOrder?: string[];
}

interface InspectResult {
  suitcaseOf: string;
  kind: 'caught' | 'clean' | 'diplomat';
  amount: number;                         // 0 bei clean
  drinkers: { playerId: string; sips: number; reason: 'caught'|'harassment'|'diplomat' }[];
  tokensTo?: { playerId: string; tokens: number };
  sequenceId: string; overlayId?: string;
}

interface GateResult { suitcaseOf: string; kind: 'ok'|'smuggler'; amount: number; tokensTo?: {...}; sequenceId: string }

interface RoundResult extends Round {
  gate: GateResult[];
  bonuses: { playerId: string; tokens: number; reason: 'allCaught'|'goodInstinct' }[];
  tokens: Record<string, number>;
  distribution: { from: string; to: string; sips: number }[];
  banner: 'officerOfTheMonth'|'gotThrough'|'smugglerParadise'|'harassment'|'honestRound';
}

interface Settings {
  modes: { bribery: boolean; sniffer: boolean; diplomat: boolean; highSeason: boolean };
  interrogationSec: 30|45|90; packTimerSec: 0|10;
  sound: boolean; music: number; haptics: boolean; lowEffects: boolean; locale: 'de'|'en';
}
```

**`publicView(round, phase)`** liefert, was Screens sehen dürfen: in HALL/INSPECT nur Hinweis-Typ + Koffer (nie `truthful`), Bestechungen, bisherige `openings`; niemals `packs`, `diplomatId`, `hints[].truthful`. Im Pack-Screen nur das eigene Pack (und ggf. eigene Immunität). In RESULT alles. Test: Serialisierung in HALL enthält keine Mengen und kein `truthful`; kein Screen referenziert `round.packs` (Lint-Test).

---

## 5. Regelkern (`core/`) — Spezifikation für Tests

```
k(n): 4 → 1; 5–6 → 2; 7–8 → 3.   Spürhund: max(1, k−1).   Hochsaison: k+1.
h(n): floor((n−1)/2), min 1, max 3.
generateHints(round, rng):
  smugglers = Reisende mit amount > 0; cleans = Rest
  für i in 1..h: truthful = rng() < 0.6 && smugglers ohne bereits verwendete nicht leer
     target = truthful ? pick(smugglers \ used) : pick(cleans \ used)  (falls cleans \ used leer → pick(smugglers \ used), truthful = true)
     type = pick(HintType), nicht zweimal derselbe Typ pro Runde, wenn vermeidbar
  Spürhund: dogHintOf = pick(smugglers) falls vorhanden, sonst pick(cleans) mit "kein Bellen"
inspect(round, suitcaseOf, by = officer):
  Koffer bereits geöffnet oder bribed → Fehler; openings.length >= maxOpenings → Fehler
  diplomat? → kind 'diplomat', officer trinkt 3, Koffer gilt als passiert mit Ware (Tokens amount an Reisenden)
  amount > 0 → 'caught': Reisender trinkt 2·amount, officer +amount Tokens
  amount == 0 → 'clean': officer trinkt 2
gateOrder(round): nicht geöffnete, nicht-diplomat Koffer: cleans (perm) ++ smugglers (perm)
finishRound: Tokens für Gate-Schmuggler (+amount); Bestechungs-Tokens an Beamten; Boni:
  allCaught: openings.caught == |smugglers| && |smugglers| >= 1 → officer +2
  goodInstinct: openings.length == 0 && |smugglers| == 0 → officer +1
  banner: allCaught ? officerOfTheMonth : |smugglers|==0 ? honestRound : (openings alle clean && openings.length>0) ? harassment : (openings.caught==0 && |smugglers|>=2) ? smugglerParadise : gotThrough
```

Invarianten (Property-Test 10 000 Runden): Hinweise zeigen nie zweimal auf denselben Koffer; bei 0 Schmugglern sind alle `truthful == false`; Anteil `truthful` über viele Runden mit ≥ 1 Schmuggler und ≥ 1 Sauberem ≈ 0.6 ± 0.03; `openings.length ≤ maxOpenings`; nie negative Schlücke; Token-Summe stimmt; Diplomat-Koffer nie 'caught'.

---

## 6. Directors & Sequenzen

```ts
interface SequenceContext { round: publicRound; suitcase: Suitcase; traveler?: Traveler; officer: Officer; hall: Hall; xray: XrayMonitor; camera: Camera; fx: FxKit; audio: AudioManager; rng: SeededRng; items: ItemSet; amount: number }

interface Sequence {
  id: string;
  kind: 'xrayCaught' | 'xrayClean' | 'xrayOverlay' | 'gateClean' | 'gateSmuggler' | 'hint';
  weight: number;
  build(ctx: SequenceContext): gsap.core.Timeline;
}
```

- **HintDirector** (HALL): spielt `hints[]` in seeded Reihenfolge als Hint-Sequenzen, hinterlässt Icons; "Nochmal ansehen" spielt dieselbe Timeline erneut (max 1×). Spürhund-Bark als Zusatz-Beat.
- **InspectDirector**: Tap → lock → Koffer fährt ins Gerät (600 ms) → `XrayMonitor.scan()` (1.2 s + Stall 400 ms bei 50 %, Silhouetten aus `amount`/Item-Set; Socken oben) → Sequenz (caught/clean; Diplomat-Overlay ersetzt) → Banner + Haptik → Board-Update → unlock/Event.
- **GateDirector**: iteriert `gateOrder`, pro Koffer Stempel + Sequenz; Schmuggler-Koffer bekommen vor dem Öffnen einen 600-ms-Stall (Ampel bleibt gelb).
- Tap-to-Skip: nur im Gate ab dem zweiten Koffer, nie beim letzten. Röntgen-Sequenzen sind nicht überspringbar (≤ 5 s).

Tests pro Sequenz: Dauer (Xray ≤ 5 s, Gate ≤ 3 s, Hint ≤ 1.8 s), Reset-Invariante, Scan-Ergebnis erst ab 100 % (Timeline-Label `revealed` ≥ Label `scanComplete`).

---

## 7. HallView-Modi

| Modus | Eingabe | Sichtbar |
|---|---|---|
| `hints` | keine (Buttons im DOM-HUD) | Koffer, Hinweis-Animationen, Icons |
| `interrogation` | Bestechungs-Chips (DOM) | Koffer mit Icons, Beamter, Reisende, Countdown (DOM) |
| `inspect` | Tap auf nicht geöffneten, nicht gesperrten Koffer → `suitcaseTap` | + Röntgen-Monitor aktiv |
| `gate` | keine (Skip-Tap) | Kamera an der Schranke |
| `idle` | keine | Title-Loop |

HUD-Elemente (Countdown, Buttons, Chips) sind **DOM** über dem Canvas mit `pointer-events` nur auf den Buttons, damit Koffer-Taps durchgehen.

---

## 8. Performance, Layout, Dev-Tools, Sicherheit, Deployment

Identisch zu Drinkshot §7–§12. Ergänzungen:
- Bloom/Scanline-Filter nur auf dem `XrayMonitor`-Container und nur während `scan()`; danach `filters = null`.
- Item-Silhouetten sind Sprites aus dem Atlas (kein Graphics zur Laufzeit).
- Dev-Panel (`?dev=1`): Sequenz-Preview (alle Kinds), "Reveal packs" (Debug), Seed, "Simulate 10 000 rounds" (Trefferquote bei Zufallsöffnung, Anteil truthful, Banner-Verteilung), FPS.
- Perf-Test: 8 Spieler, INSPECT mit `caught_alarm_burst` (Item-Fontäne) + Bloom, CPU 4×: p50 ≤ 20 ms, p95 ≤ 40 ms, ≤ 2 Long-Tasks.
- **Informationssicherheit:** `packs`, `diplomatId`, `hints[].truthful` liegen nur im Store; Screens bekommen `publicView`. Lint-Test wie bei Sprengmeister.
