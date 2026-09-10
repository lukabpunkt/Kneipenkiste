# DIE HÄNGEBRÜCKE — Technische Architektur

> Version 1.0 · Verbindlich für Claude Code. Stack, Performance-Regeln, Layout, Dev-Tools, Deployment, Sicherheit sind **identisch zu Drinkshot** (`03-ARCHITECTURE.md` dort, §1, §7–§12). Hier: Kurzfassung + alles, was anders oder neu ist. Abweichungen → 5-Zeilen-ADR in `docs/DECISIONS.md`.

---

## 1. Stack (Kurzfassung)

Vite 6 · TypeScript 5 strict · **PixiJS v8** (Schlucht-Bühne, nicht interaktiv) · **GSAP 3** · Vanilla TS + HTML/CSS für Menüs (inkl. Brücke-von-oben als Inline-SVG) · eigener Store + FSM · howler.js · `crypto.getRandomValues` + seedbarer PRNG · `simplex-noise` (Wind) · vite-plugin-pwa · Vitest · Playwright · GitHub Pages (`base: '/Haengebruecke/'` — Repo-Name ohne Umlaut).

Bundle-Ziel: ≤ 450 KB JS gzip, Assets ≤ 1 MB. Step-Chunk lazy während NEGOTIATION.

**Code-Sharing:** Wiederverwendbare Module aus den Schwesterspielen werden **kopiert** (Store, RNG, i18n, Router, Komponenten, Shotling-Rig, ParticlePool, SpeechBubble, AudioManager, Distribute-Screen aus Sprengmeister/Zoll, CountdownRing aus Tresor). Shared-Package erst nach v1.0 aller Spiele.

**Einordnung:** Architektonisch ist dieses Spiel der **Tresor-Typ** (Wahl → geskriptete Reveal-Show, Bühne nicht interaktiv) — nicht der Sprengmeister/Zoll-Typ mit interaktivem Canvas. Die Brücke-von-oben in Negotiation/Choose/Result ist **DOM/SVG**, nur der Schritt ist PIXI.

---

## 2. Ordnerstruktur

```
Haengebruecke/
├─ CLAUDE.md · README.md · docs/ (01–05, DECISIONS, PROGRESS, screens/)
├─ index.html · vite.config.ts · tsconfig.json · package.json
├─ public/ (manifest, icons, fonts, atlas/, audio/)
├─ assets-src/svg/{hikers,vulture,carpenter,bridge,canyon,signs,fx}/ · audio-src/
├─ scripts/ (build-atlas.mjs, build-audio-sprite.mjs)
├─ src/
│  ├─ main.ts
│  ├─ config/
│  │  ├─ theme.ts        # Tokens
│  │  ├─ rules.ts        # 3–8 Spieler, B_0 = n+2, B_min = n−1, Trinkwerte (m_b), Verteilen 1/2, Modi-Parameter (Fahne, Morsch, Gewicht 1–3, Seil 1×, Nebel), Timer
│  │  └─ choreo.ts       # Intro/Anlauf/Knarren-Dauern je Preset, Slow-Mo-Faktor, Bruch-Versatz, Nachspiel
│  ├─ core/
│  │  ├─ store.ts · fsm.ts · rng.ts · i18n.ts
│  │  ├─ bridge.ts       # REINE FUNKTIONEN: createBridge, shrink (welcher Balken, secure), repair, isDeathZone
│  │  ├─ round.ts        # createRound (Seed, morscher Balken), choose, resolveRound → RoundResult
│  │  ├─ payout.ts       # Gruppierung nach Balken, Trinker, Verteil-Guthaben, Modi-Effekte, Banner
│  │  ├─ modes.ts        # Fahne (Fahnenflucht/Balkendieb), Morsch, Schwergewicht, Nebel, Seil (1× pro Session)
│  │  ├─ choreographer.ts# buildStepScript(): Anlauf-Geschwindigkeiten, Knarren, Blickkontakt-Paare, Bruch-Reihenfolge, Sequenz-Auswahl
│  │  └─ session.ts      # Balkenzahl, Seil-Verbrauch, Statistik (Stürze, Kollisionspartner, Fahnenfluchten, Bergziege), Persistenz
│  ├─ ui/
│  │  ├─ router.ts · components/ (button, badge, sheet, toast, bridgeTop (SVG), countdownRing, flagRow, weightStepper, quickDistribute, tokenStack)
│  │  └─ screens/ (Title, Lobby, Negotiation, Pass, Choose, Sealed, Step, Distribute, Result, SettingsSheet, RulesSheet)
│  ├─ game/
│  │  ├─ StageApp.ts     # PIXI-Singleton, Ticker→GSAP
│  │  ├─ Canyon.ts       # Himmel, Felsen, Nebel-Parallax, Fluss-Glitzer, Wind-Noise
│  │  ├─ Bridge.ts       # Seile (Catenary), Balken (Plank[]), Schilder, remove()/repair()/rot(plankIndex)
│  │  ├─ Plank.ts        # creak(amplitude), snap(), crumble(), remove(), highlight()
│  │  ├─ Hiker.ts        # Shotling + Hut/Rucksack/Stock, runTo(plank, arriveAt), wobble(), lookAt(hiker), fall*, wetClimb(), safeWave()
│  │  ├─ Vulture.ts      # Gustav: circle(), screech(), laugh(), watchClock(), carry(hiker), landOnSign()
│  │  ├─ Carpenter.ts    # Balthasar: repair()
│  │  ├─ Camera.ts       # Intro-Fahrt, Zoom, Shake, Fall-Pan
│  │  ├─ StepDirector.ts # spielt StepScript: Intro → Anlauf → Schritt (Hit-Stop) → Knarren (+Blickkontakt) → Bruch (Sequenzen) → Nachspiel → Event
│  │  ├─ fx/ (ParticlePool, Splinters, Splash, Sparkle, SpeechBubble, Stamp, Sign)
│  │  └─ sequences/
│  │     ├─ Sequence.ts        # Interfaces + Registries (fall, safe, allSafe, deathzone, repair, overlay) + Auswahl + No-Repeat
│  │     ├─ fall/HoldHands.ts, CoyoteDelay.ts, Seesaw.ts, RopeSwing.ts, Domino.ts, BounceWall.ts
│  │     ├─ safe/WobbleHold.ts, ConfidentStroll.ts, Tiptoe.ts
│  │     ├─ misc/AllSafeRot.ts, DeathzoneSign.ts, RepairCarpenter.ts
│  │     └─ overlays/RottenCrack.ts, DeserterStamp.ts
│  ├─ audio/ · i18n/ · styles/
├─ tests/
│  ├─ unit/bridge.test.ts, payout.test.ts, modes.test.ts, choreographer.test.ts, fsm.test.ts, session.test.ts, sequenceRegistry.test.ts, publicView.test.ts
│  └─ e2e/flow.spec.ts, perf.spec.ts
└─ .github/workflows/ci.yml, deploy.yml
```

---

## 3. Game-State-Machine

```
TITLE ─start─► LOBBY ─go(players≥3)─► NEGOTIATION ─timeout|allReady─► PASS(i=0) ─tap─► CHOOSE(i) ─seal─► … ─► SEALED
   ▲                (Nebel: SILENCE 10 s)                                                                   │ tap → resolveRound()
   │                                                                                                      STEP
   │                                                                                                        │ showFinished
   │                                                          anyGiving ? DISTRIBUTE (quick | iterate) : RESULT
   └────────────── changePlayers ────────────────────────────────────────────────────────────────── RESULT ┘
                                                                        nextRound → NEGOTIATION (Brücke geschrumpft/repariert)
```

- `resolveRound()` (aus `core/round.ts` + `payout.ts`) läuft **genau einmal** bei SEALED→STEP: reine Funktion `(players, choices, bridge, settings, seed) → RoundResult`. STEP liest nur.
- Morscher Balken wird bei NEGOTIATION-Eintritt mit `crypto` bestimmt und privat gespeichert; Schrumpf-Balken bei RESULT-Eintritt.
- DISTRIBUTE: `quick`-Modus, wenn alle Verteil-Guthaben == 1; `iterate`-Modus (Pass-Light pro Verteiler) sonst.
- Back-Button in NEGOTIATION/PASS/CHOOSE/STEP → "Runde abbrechen?".

---

## 4. Datenmodell

```ts
type PlankId = number;                       // 1..B
type Choice = { plank: PlankId } | { rope: true };

interface Bridge { count: number; planks: PlankId[]; removed: PlankId[]; rottenPlank?: PlankId /* privat */ }

interface Round {
  index: number; seed: number;
  bridge: Bridge;
  choices: Record<string, Choice>;           // privat bis Reveal
  weights?: Record<string, 1|2|3>;           // Schwergewicht
  flags?: Record<string, PlankId>;           // Fahne (öffentlich)
}

interface PlankGroup { plank: PlankId; players: string[]; collision: boolean; rotten: boolean }

interface RoundResult extends Round {
  groups: PlankGroup[];
  ropeUsers: string[];
  deathZone: boolean;
  outcome: 'allSafe' | 'collision' | 'massCollision' | 'deathZone';
  drinkers: { playerId: string; sips: number; reason: 'collision'|'rotten'|'ropeFee'|'deserterDouble' }[];
  giving: Record<string, number>;            // Verteil-Guthaben
  deserters: string[]; plankThieves: { thief: string; victim: string }[];
  distribution: { from: string; to: string; sips: number }[];
  nextBridge: Bridge;                        // geschrumpft (mit removed) oder repariert
  removedPlank?: PlankId;
  sequenceIds: { fall: Record<PlankId, string>; safe: Record<string, string>; misc: string[]; overlays: string[] };
}

interface Settings {
  modes: { flags: boolean; rotten: boolean; weights: boolean; fog: boolean; rope: boolean };
  negotiationSec: 10|20|40; thinkTimerSec: 0|5; pace: 'short'|'normal'|'long';
  sound: boolean; music: number; haptics: boolean; lowEffects: boolean; locale: 'de'|'en';
}
```

**`publicView(round, phase)`**: CHOOSE zeigt nur Brücke + Fahnen (öffentlich) + eigene Wahl; nie fremde `choices`, nie `rottenPlank` vor RESULT. Test: Serialisierung in CHOOSE enthält keine fremden Wahlen; kein Screen referenziert `round.choices` außer Result/Step-Director über `RoundResult` (Lint-Test).

---

## 5. Regelkern — Spezifikation für Tests

```
createBridge(n): count = n + 2, planks = [1..n+2]
shrink(bridge, secureRng): wenn count > n − 1: entferne zufälligen Balken (Nummern bleiben, Lücke sichtbar); sonst unverändert
repair(n): createBridge(n)
isDeathZone(bridge, n): bridge.count < n

resolveRound:
  groups = gruppiere choices nach plank (rope-User ausgenommen)
  collision(g) = |g.players| >= 2
  rotten(g) = rotten-Modus && g.plank == rottenPlank && |g.players| == 1
  deathZone = isDeathZone
  Trinker:
    collision: jeder in g trinkt |g.players| (× weight bei Schwergewicht) (× 2 bei Fahnenflucht)
    rotten:    der eine trinkt 1
    ropeFee:   rope-User trinkt 1
  Verteil-Guthaben:
    sicher (allein, nicht rotten, kein rope): deathZone ? 2 : 1 (bei Schwergewicht: weight bzw. 2×weight in Todeszone)
    Fahnenflüchtiger (flag != plank) sicher → 0
    Balkendieb: Spieler ohne Fahne auf diesem Balken (oder mit anderer Fahne) auf einem Kollisionsbalken, auf dem ein Spieler MIT Fahne für genau diesen Balken steht → +2 Guthaben (obwohl er selbst fällt)
  outcome: keine collision & kein rotten → 'allSafe' (bei deathZone unmöglich); ≥2 Kollisionsgruppen oder eine mit ≥3 → 'massCollision'; deathZone → 'deathZone'; sonst 'collision'
  nextBridge: allSafe ? shrink : repair
  Seil: pro Spieler 1× pro Session; Wahl 'rope' nur wenn noch verfügbar (Choose blendet den Button sonst aus)
```

Invarianten (Property-Test 10 000 Runden): Summe der Spieler in groups + ropeUsers == n; nie negative Werte; `nextBridge.count ∈ [n−1, n+2]`; in der Todeszone gibt es immer ≥ 1 Kollision (Pigeonhole — Test); allSafe ⇒ giving leer und drinkers ⊆ ropeFee.

---

## 6. Choreographer & StepDirector

**Input:** `RoundResult`, `pace`, `seed` → **Output:** `StepScript`

```ts
interface StepScript {
  totalMs: number;
  intro: { deathZone: boolean };
  run: { hikerId: string; plank: PlankId | 'rope'; arriveAt: number }[];   // alle gleiche arriveAt
  creak: { plank: PlankId; amplitude: number }[];                            // sicher 0.7, Kollision 1.0, morsch 0.4 dann 1.0
  eyeContact: { plank: PlankId; hikerIds: string[]; at: number }[];
  breaks: { plank: PlankId; at: number; sequenceId: string }[];              // 400 ms Versatz
  safe: { hikerId: string; sequenceId: string }[];
  overlays: { id: string; target: string }[];
  aftermath: 'allSafeRot' | 'repair' | 'none';
  removedPlank?: PlankId;
}
```

Regeln: alle Hikers kommen im selben Frame an (Test); jeder Balken mit ≥ 1 Person knarrt; Blickkontakt nur bei Kollisionsgruppen, immer vor dem Bruch (Test über Zeiten); Bruch-Reihenfolge seeded; Sequenzen gewichtet mit No-Repeat 3, `fall_domino` nur bei ≥ 3, deterministisch bei Seed. Gesamtdauer ≤ 20 s (Raffung bei vielen Kollisionen).

`StepDirector` spielt das Skript als eine GSAP-Timeline: Intro → Run → Step (Hit-Stop 120 ms) → Creak (Slow-Mo 0.5× ab erstem Blickkontakt bis Bruch) → Breaks (Sequenzen) → Safe-Sequenzen parallel ab Bruch → Aftermath → `showFinished`. Tap-to-Skip erst nach dem letzten Bruch (`timeline.seek('aftermath')`).

---

## 7. Sequence-Interface

```ts
interface SequenceContext { result: RoundResult; hikers: Map<string, Hiker>; group?: PlankGroup; plank?: Plank; bridge: Bridge; canyon: Canyon; vulture: Vulture; carpenter: Carpenter; camera: Camera; fx: FxKit; audio: AudioManager; rng: SeededRng }
interface Sequence { id: string; kind: 'fall'|'safe'|'allSafe'|'deathzone'|'repair'|'overlay'; weight: number; minGroup?: number; build(ctx): gsap.core.Timeline }
```

Tests pro Sequenz: Dauer (fall ≤ 5 s, safe ≤ 3 s, misc ≤ 4 s), Reset-Invariante (alle Hikers nach `reset()` wieder `idle` und trocken), Fall-Sequenzen enthalten Label `eyeContact` vor `snap` und enden mit Label `climbedBack`.

---

## 8. Performance, Layout, Dev-Tools, Sicherheit, Deployment

Identisch zu Drinkshot §7–§12. Ergänzungen:
- Balken sind Sprites (Textur-Tausch für normal/morsch/gebrochen), Seile als zwei `Graphics` einmalig gezeichnet + `cacheAsTexture`; Durchhang-Kurve nur beim Setup berechnet.
- Nebel-Parallax und Fluss-Glitzer als Idle-Effekte im Low-Mode aus.
- Dev-Panel (`?dev=1`): Sequenz-Preview, "Play Step" mit Seed + Spieleranzahl + gewünschter Verteilung (z. B. "2 auf 3, 3 auf 5"), Balkenzahl-Slider, Todeszone-Toggle, FPS, "Simulate 10 000 rounds" (Kollisionsrate bei Zufallswahl je n/B).
- Perf-Test: 8 Hikers, Massensturz mit `fall_domino` + `fall_seesaw`, CPU 4×: p50 ≤ 20 ms, p95 ≤ 40 ms, ≤ 2 Long-Tasks.
- Privatsphäre: fremde `choices` und `rottenPlank` liegen nur im Store bis STEP; Lint-Test wie bei den Schwesterspielen.
