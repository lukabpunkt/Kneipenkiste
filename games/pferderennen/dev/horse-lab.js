/**
 * Horse lab: the six horses side by side, at any speed and in any animation state.
 *
 * A development page, not part of the game. It exists so the gallop can be judged on its own —
 * a stride that only ever appears for thirty seconds in the middle of a race is impossible to
 * refine (docs/05_MILESTONES.md, M3 task 5).
 */

import { HORSES } from '../src/data/horses.js';
import { drawHorse } from '../src/render/horse.js';
import { horseColours } from '../src/render/palette.js';
import { drawHorseRear } from '../src/render/horseRear.js';
import {
  createPose,
  updatePose,
  ANIMATION_STATES,
  legAngles,
} from '../src/render/horseAnimations.js';
import { RENDER } from '../src/config.js';
import { EVENTS, SLIPSTREAM, EVENTS_BY_ID } from '../src/data/events.js';
import { effectAnimation, effectDuration } from '../src/engine/effects.js';
import { createParticles } from '../src/render/particles.js';
import { createEventVisuals } from '../src/render/eventVisuals.js';

const canvas = document.getElementById('lab');
const ctx = canvas.getContext('2d');
const speedInput = document.getElementById('speed');
const sizeInput = document.getElementById('size');
const animSelect = document.getElementById('anim');
const eventSelect = document.getElementById('event');
const viewSelect = document.getElementById('view');
const skeletonInput = document.getElementById('skeleton');
const singleInput = document.getElementById('single');
const readout = document.getElementById('readout');

for (const state of ANIMATION_STATES) {
  const option = document.createElement('option');
  option.value = state;
  option.textContent = state;
  animSelect.append(option);
}
animSelect.value = 'gallop';

// Every event, so each one can be played on demand — that is how the M5 checklist gets ticked.
const noEvent = document.createElement('option');
noEvent.value = '';
noEvent.textContent = '– keins –';
eventSelect.append(noEvent);
for (const event of [...EVENTS, SLIPSTREAM]) {
  const option = document.createElement('option');
  option.value = event.id;
  option.textContent = `${event.id} (${event.kind})`;
  eventSelect.append(option);
}

/** A miniature of the race plumbing, so the props behave exactly as they do in a race. */
const particles = createParticles(300);
const visuals = createEventVisuals({
  particles,
  shake: () => {},
  reducedMotion: () => false,
});

/** A stand-in race: one planned event on runner 0, replayed in a loop. */
let eventClock = 0;
let currentEvent = '';
const fakeRace = {
  plannedEvents: [],
  eventLog: [],
  state: { t: 0 },
};

/** Restarts the chosen event from the top. */
function restartEvent() {
  const id = eventSelect.value;
  currentEvent = id;
  eventClock = 0;
  visuals.reset();
  particles.clear();
  fakeRace.plannedEvents = [];
  fakeRace.eventLog = [];
  if (!id) return;
  const definition = EVENTS_BY_ID[id];
  const lead = definition.lead ?? 0;
  fakeRace.plannedEvents = [{ id, runner: 0, time: lead + 0.4, lead, fired: false }];
}
eventSelect.addEventListener('change', restartEvent);

const poses = HORSES.map((_, index) => createPose(index / HORSES.length));
const palettes = HORSES.map(horseColours);

let width = 0;
let height = 0;

/** Sizes the canvas for the device pixel ratio, capped so retina screens stay fast. */
function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio);
  width = canvas.clientWidth;
  height = Math.max(320, window.innerHeight - canvas.getBoundingClientRect().top - 16);
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

/** Draws the joint positions on top, to check the gallop cycle. */
function drawSkeleton(pose, x, y, size) {
  const joints = [
    { at: { x: -0.29, y: -0.6 }, offset: 0, front: false },
    { at: { x: 0.27, y: -0.63 }, offset: 0.46, front: true },
    { at: { x: -0.29, y: -0.6 }, offset: 0.13, front: false },
    { at: { x: 0.27, y: -0.63 }, offset: 0.58, front: true },
  ];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.lineWidth = 0.012;
  for (const leg of joints) {
    const { thigh, shank } = legAngles(pose.phase, leg.offset, pose.swing, leg.front);
    const kneeX = leg.at.x + Math.sin(thigh) * 0.3;
    const kneeY = leg.at.y + Math.cos(thigh) * 0.3;
    const hoofX = kneeX + Math.sin(shank) * 0.31;
    const hoofY = kneeY + Math.cos(shank) * 0.31;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(leg.at.x, leg.at.y);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(hoofX, hoofY);
    ctx.stroke();
    ctx.fillStyle = '#FF6B35';
    for (const [px, py] of [
      [leg.at.x, leg.at.y],
      [kneeX, kneeY],
      [hoofX, hoofY],
    ]) {
      ctx.beginPath();
      ctx.arc(px, py, 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

let last = performance.now();
let frames = 0;
let fpsTimer = 0;
let fps = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  frames += 1;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    fps = Math.round(frames / fpsTimer);
    frames = 0;
    fpsTimer = 0;
  }

  const speed = Number(speedInput.value);
  const size = Number(sizeInput.value);
  const anim = animSelect.value;
  const single = singleInput.checked;

  ctx.clearRect(0, 0, width, height);

  // A ground line, so the hooves have something to stand on.
  ctx.fillStyle = 'rgba(232, 200, 138, 0.55)';
  ctx.fillRect(0, height * 0.62, width, height);

  // Drive the stand-in race, so the prop timing matches a real one exactly.
  if (eventSelect.value !== currentEvent) restartEvent();
  if (currentEvent) {
    eventClock += dt;
    fakeRace.state.t = eventClock;
    const planned = fakeRace.plannedEvents[0];
    if (planned && !planned.fired && eventClock >= planned.time) {
      planned.fired = true;
      fakeRace.eventLog.push({ id: planned.id, runner: 0, t: planned.time });
    }
    const definition = EVENTS_BY_ID[currentEvent];
    const total =
      (definition.effect ? effectDuration(definition.effect) : 3) + (definition.lead ?? 0) + 2.2;
    if (eventClock > total + 0.8) restartEvent();
  }

  const shown = single ? [0] : HORSES.map((_, i) => i);
  const columns = single ? 1 : 3;
  const rows = Math.ceil(shown.length / columns);
  const cellWidth = width / columns;
  const cellHeight = (height - 40) / rows;

  for (const index of shown) {
    const pose = poses[index];
    updatePose(pose, dt, { anim, speed });

    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = cellWidth * (column + 0.5);
    // The rear view is much taller than it is wide, so it needs to sit lower in its cell.
    const y = 40 + cellHeight * (row + (viewSelect.value === 'rear' ? 0.95 : 0.85));

    // While an event is selected it drives the animation of the first horse.
    let state = anim;
    if (currentEvent && index === 0) {
      const definition = EVENTS_BY_ID[currentEvent];
      const local = eventClock - (fakeRace.plannedEvents[0]?.time ?? 0);
      state = (definition.effect && effectAnimation(definition.effect, local)) || anim;
    }
    updatePose(pose, 0, { anim: state, speed });

    if (index === 0 && currentEvent) {
      const locate = () => ({ x, y, size, units: 0 });
      const frame = { locate, width, height };
      visuals.sync(fakeRace, fakeRace.state.t);
      visuals.update(fakeRace.state.t, locate);
      visuals.drawDecor(ctx, () => ({ x, y, size }));
      visuals.draw(ctx, 'behind', fakeRace.state.t, frame);
    }

    const draw = viewSelect.value === 'rear' ? drawHorseRear : drawHorse;
    draw(ctx, { horse: HORSES[index], colours: palettes[index], pose, x, y, size });

    if (index === 0 && currentEvent) {
      const locate = () => ({ x, y, size, units: 0 });
      visuals.draw(ctx, 'front', fakeRace.state.t, { locate, width, height });
    }
    if (skeletonInput.checked && viewSelect.value === 'side') drawSkeleton(pose, x, y, size);

    ctx.fillStyle = '#2B1D2E';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(HORSES[index].name, x, y + 22);
  }

  particles.update(dt);
  particles.draw(ctx);

  readout.textContent =
    `${fps} fps · Phase ${poses[0].phase.toFixed(2)} · Tempo ${speed.toFixed(2)}` +
    (currentEvent ? ` · ${currentEvent} bei ${eventClock.toFixed(1)} s` : '');
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
