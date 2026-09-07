/**
 * The drawing routines for every event prop and every piece of leftover decor.
 *
 * Pure shapes: each takes a context and a position and draws. They know nothing about when an
 * event fires or how long it lasts — that is eventVisuals.js. Splitting them off keeps both
 * files readable, and this one is the place to look when a prop should be prettier.
 */

/** Show events belong to nobody and play out over this many seconds. */
export const SHOW_DURATION = 3;

export function drawBanana(ctx, r) {
  ctx.fillStyle = '#F7D65B';
  ctx.strokeStyle = '#C8A32E';
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0.35, Math.PI - 0.35);
  ctx.arc(0, r * 0.35, r * 0.85, Math.PI - 0.45, 0.45, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawPigeon(ctx, x, y, r, since) {
  const flap = Math.sin(since * 22) * 0.5;
  ctx.fillStyle = '#8FA3B8';
  ctx.strokeStyle = '#5F7085';
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.7, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.9, y - r * 0.5, r * 0.4, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.moveTo(x + r * 1.25, y - r * 0.5);
  ctx.lineTo(x + r * 1.7, y - r * 0.4);
  ctx.lineTo(x + r * 1.25, y - r * 0.3);
  ctx.fill();
  ctx.fillStyle = '#B7C6D6';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.2, y - r * 0.5, r * 0.75, r * 0.3, -0.6 + flap, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCarrot(ctx, x, y, r) {
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.5);
  ctx.lineTo(x + r * 0.5, y - r * 0.2);
  ctx.lineTo(x - r * 0.2, y + r * 1.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  for (const angle of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.4);
    ctx.lineTo(x + Math.sin(angle) * r * 0.8, y - r * 1.2);
    ctx.stroke();
  }
}

export function drawCup(ctx, x, y, r) {
  ctx.fillStyle = '#FFF8EE';
  ctx.strokeStyle = '#6B5B73';
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.roundRect(x - r, y - r, r * 1.7, r * 2, r * 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + r * 0.85, y, r * 0.5, -1.2, 1.2);
  ctx.stroke();
  ctx.fillStyle = '#4A2717';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.15, y - r * 0.85, r * 0.7, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHorseshoe(ctx, r) {
  ctx.strokeStyle = '#9AA3AF';
  ctx.lineWidth = r * 0.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0.5, Math.PI - 0.5, true);
  ctx.stroke();
}

export function drawFan(ctx, x, y, r, since) {
  // A spectator at the rail, phone held up, flashing.
  ctx.fillStyle = '#2B1D2E';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#EC4899';
  ctx.beginPath();
  ctx.roundRect(x - r * 0.4, y + r * 0.3, r * 0.8, r * 0.9, r * 0.2);
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.roundRect(x + r * 0.35, y - r * 0.5, r * 0.32, r * 0.5, r * 0.08);
  ctx.fill();
  if (Math.sin(since * 9) > 0.6) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x + r * 0.5, y - r * 0.25, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBubble(ctx, x, y, r, text) {
  ctx.fillStyle = 'rgba(255, 248, 238, 0.95)';
  ctx.strokeStyle = 'rgba(43, 29, 46, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - r, y - r * 0.55, r * 2, r * 1.1, r * 0.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2B1D2E';
  ctx.font = `600 ${r * 0.62}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function drawStreaker(ctx, frame, since, seed) {
  const t = Math.max(0, since) / SHOW_DURATION;
  const x = frame.width * (t * 1.25 - 0.1);
  const y = frame.height * (0.5 + seed * 0.3);
  const bob = Math.abs(Math.sin(since * 16)) * 6;

  const person = (px, colour, hat) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(px - 5, y - 26 - bob, 10, 18, 4);
    ctx.fill();
    ctx.fillStyle = hat ? '#1F2937' : '#F2C9A0';
    ctx.beginPath();
    ctx.arc(px, y - 32 - bob, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, y - 10 - bob);
    ctx.lineTo(px - 5 + Math.sin(since * 16) * 5, y - bob);
    ctx.moveTo(px, y - 10 - bob);
    ctx.lineTo(px + 5 - Math.sin(since * 16) * 5, y - bob);
    ctx.stroke();
  };

  person(x, '#F2C9A0', false);
  person(x - 46, '#1F2937', true);
}

export function drawTumbleweed(ctx, x, y, r, since) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(since * 3);
  ctx.strokeStyle = 'rgba(150, 120, 70, 0.85)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a + 2) * r * 0.7, Math.sin(a + 2) * r * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawUfo(ctx, frame, since, seed) {
  const t = Math.max(0, since) / SHOW_DURATION;
  const x = frame.width * (1.1 - t * 1.25);
  const y = frame.height * (0.12 + seed * 0.1);
  const r = Math.min(frame.width, frame.height) * 0.07;

  // Tractor beam.
  ctx.fillStyle = 'rgba(190, 240, 255, 0.22)';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y);
  ctx.lineTo(x + r * 0.5, y);
  ctx.lineTo(x + r * 1.6, frame.height * 0.75);
  ctx.lineTo(x - r * 1.6, frame.height * 0.75);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#9CA3AF';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#67E8F9';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.28, r * 0.5, r * 0.36, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#FDE68A';
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.arc(x + i * r * 0.35, y + r * 0.16, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFlashes(ctx, frame, since) {
  // Press bulbs popping along the far rail.
  for (let i = 0; i < 7; i += 1) {
    const phase = Math.sin(since * 11 + i * 2.3);
    if (phase < 0.75) continue;
    const x = frame.width * (0.08 + i * 0.14);
    const y = frame.height * 0.3;
    ctx.fillStyle = `rgba(255,255,255,${(phase - 0.75) * 3})`;
    ctx.beginPath();
    ctx.arc(x, y, frame.height * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPuddle(ctx, x, y, r, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.08, r, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSittingJockey(ctx, x, y, r) {
  ctx.fillStyle = '#6B5B73';
  ctx.beginPath();
  ctx.roundRect(x - r * 0.4, y - r * 0.75, r * 0.8, r * 0.6, r * 0.2);
  ctx.fill();
  ctx.fillStyle = '#F2C9A0';
  ctx.beginPath();
  ctx.arc(x, y - r * 0.95, r * 0.27, 0, Math.PI * 2);
  ctx.fill();
  // Waving.
  ctx.strokeStyle = '#6B5B73';
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.3, y - r * 0.6);
  ctx.lineTo(x + r * 0.65, y - r * 1.1);
  ctx.stroke();
}
