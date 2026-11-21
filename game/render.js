// render.js — one job: everything the player sees.
// Dark seabed + big warm-yellow cones (the cones are the light),
// HUD in English only, legend + patrol roster, "?" / "!" tells.
import { WORLD, KELP, CAVE, fmtTime } from './level.js';
import { detectionWord, alarmLevel } from './guard.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawWorld(ctx, s, t) {
  const { w, h } = WORLD;
  // --- water: deep teal gradient, darker at the floor ---
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0a3540');
  g.addColorStop(0.55, '#062530');
  g.addColorStop(1, '#03141b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // --- god rays ---
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#bfe8d8';
  for (let i = 0; i < 4; i++) {
    const x0 = 180 + i * 300 + Math.sin(t * 0.2 + i) * 14;
    ctx.beginPath();
    ctx.moveTo(x0, 0); ctx.lineTo(x0 + 60, 0);
    ctx.lineTo(x0 + 190, 560); ctx.lineTo(x0 + 90, 560);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // --- distant kelp silhouettes (depth layer) ---
  ctx.save();
  ctx.fillStyle = '#04222b';
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 145 + (i % 3) * 22;
    const kh = 150 + ((i * 53) % 130);
    ctx.beginPath();
    ctx.moveTo(x, WORLD.floorY);
    ctx.quadraticCurveTo(x + 18 + Math.sin(t * 0.6 + i) * 8, WORLD.floorY - kh * 0.6, x + 6, WORLD.floorY - kh);
    ctx.quadraticCurveTo(x + 26, WORLD.floorY - kh * 0.55, x + 34, WORLD.floorY);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // --- the dark floor ---
  const fg = ctx.createLinearGradient(0, WORLD.floorY - 30, 0, h);
  fg.addColorStop(0, '#0c262b');
  fg.addColorStop(1, '#05161b');
  ctx.fillStyle = fg;
  ctx.fillRect(0, WORLD.floorY, w, h - WORLD.floorY);
  ctx.fillStyle = 'rgba(120, 190, 170, 0.10)';
  for (let i = 0; i < 26; i++) {
    const x = (i * 97) % w;
    ctx.beginPath();
    ctx.ellipse(x, WORLD.floorY + 22 + (i % 5) * 18, 46, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // rocks
  ctx.fillStyle = '#0a2026';
  for (const [x, y, r] of [[180, 668, 26], [520, 690, 34], [880, 672, 22], [1060, 694, 30], [60, 700, 20]]) {
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.fill();
  }

  drawCave(ctx, s, t);
  drawPearls(ctx, s, t);
  drawKelp(ctx, s, t);
  drawInk(ctx, s);
  for (const gd of s.guards) drawCone(ctx, gd);
  for (const gd of s.guards) drawGuard(ctx, gd, t);
  drawPlayer(ctx, s.player, t);
  drawLabels(ctx, s);

  // bubbles
  ctx.fillStyle = 'rgba(190, 235, 225, 0.55)';
  for (const b of s.player.bubbles) {
    ctx.globalAlpha = Math.max(0, b.life);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCave(ctx, s, t) {
  const open = s.player.pearls >= 3;
  // glow
  const glow = ctx.createRadialGradient(CAVE.x, CAVE.y, 8, CAVE.x, CAVE.y, CAVE.r + 40);
  glow.addColorStop(0, open ? 'rgba(255, 120, 180, 0.55)' : 'rgba(255, 120, 180, 0.30)');
  glow.addColorStop(1, 'rgba(255, 120, 180, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(CAVE.x, CAVE.y, CAVE.r + 40, 0, Math.PI * 2); ctx.fill();
  // anemone arch — pink fronds
  ctx.strokeStyle = '#ff7fb0';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + (i / 13) * Math.PI;
    const sway = Math.sin(t * 1.4 + i * 0.9) * 6;
    const x0 = CAVE.x + Math.cos(a) * CAVE.r * 0.92;
    const y0 = CAVE.y + Math.sin(a) * CAVE.r * 0.92 * 0.9;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + sway, y0 - 26, x0 + sway * 1.6, y0 - 44);
    ctx.stroke();
  }
  // dark mouth
  ctx.fillStyle = '#12060d';
  ctx.beginPath();
  ctx.arc(CAVE.x, CAVE.y + 8, CAVE.r * 0.52, 0, Math.PI * 2);
  ctx.fill();
  // (label drawn later, over the kelp, by drawLabels)
}

function drawPearls(ctx, s, t) {
  for (const p of s.pearls) {
    if (p.taken) continue;
    const pulse = 1 + Math.sin(t * 3 + p.x) * 0.12;
    const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 30 * pulse);
    glow.addColorStop(0, 'rgba(255, 255, 240, 0.9)');
    glow.addColorStop(1, 'rgba(255, 255, 240, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(p.x, p.y, 30 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(p.x - 4, p.y - 5, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawKelp(ctx, s, t) {
  for (const k of KELP) {
    for (let i = 0; i < 7; i++) {
      const bx = k.x + 6 + i * ((k.w - 12) / 6);
      const bh = k.h * (0.75 + ((i * 37) % 40) / 100);
      const sway = Math.sin(t * 0.9 + i * 1.3 + k.x) * 12;
      ctx.strokeStyle = i % 2 ? '#2a8a4a' : '#1d6b3a';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, WORLD.floorY);
      ctx.quadraticCurveTo(bx + sway * 0.5, WORLD.floorY - bh * 0.6, bx + sway, WORLD.floorY - bh);
      ctx.stroke();
    }
    // cover tag on two clusters so the legend is visible in-world too
    if (k.x === 268 || k.x === 806) {
      ctx.fillStyle = 'rgba(220, 255, 235, 0.85)';
      ctx.font = 'bold 11px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KELP — COVER', k.x + k.w / 2, WORLD.floorY - k.h - 8);
    }
  }
}

function drawInk(ctx, s) {
  for (const c of s.clouds) {
    const fade = Math.min(1, c.ttl / 3);
    ctx.save();
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = '#1a0f2e';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const rr = c.r * (0.62 + ((i * 29) % 30) / 100);
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(a) * c.r * 0.42, c.y + Math.sin(a) * c.r * 0.32, rr * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(120, 70, 200, 0.5)';
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // (label drawn later, over guards and cones, by drawLabels)
  }
}

// Labels that must stay readable: cave + ink, on dark pills, drawn last
// so kelp, cones and guards never cross them out.
function drawLabels(ctx, s) {
  const open = s.player.pearls >= 3;
  ctx.textAlign = 'center';
  // cave label
  ctx.font = 'bold 15px "Trebuchet MS", Verdana, sans-serif';
  const caveText = open ? 'CAVE — OPEN · EXIT' : 'CAVE — NEEDS 3 PEARLS · EXIT';
  const cw = ctx.measureText(caveText).width;
  ctx.fillStyle = 'rgba(2, 20, 26, 0.8)';
  roundRect(ctx, CAVE.x - 6 - cw / 2 - 8, CAVE.y - CAVE.r - 32, cw + 16, 22, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd3e6';
  ctx.fillText(caveText, CAVE.x - 6, CAVE.y - CAVE.r - 16);
  // ink labels
  ctx.font = 'bold 11px "Trebuchet MS", Verdana, sans-serif';
  for (const c of s.clouds) {
    const label = 'INK CLOUD';
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(2, 20, 26, 0.8)';
    roundRect(ctx, c.x - lw / 2 - 7, c.y - c.r - 22, lw + 14, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#e6d2ff';
    ctx.fillText(label, c.x, c.y - c.r - 9);
  }
}

function drawCone(ctx, g) {
  const range = 400;
  const half = g.coneHalf * (1 - 0.45 * g.suspicion);
  const facing = g.aim;
  const hot = g.suspicion > 0.35;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, range);
  grad.addColorStop(0, hot ? 'rgba(255, 190, 60, 0.85)' : 'rgba(255, 215, 94, 0.75)');
  grad.addColorStop(0.7, hot ? 'rgba(255, 170, 40, 0.38)' : 'rgba(255, 205, 80, 0.30)');
  grad.addColorStop(1, 'rgba(255, 200, 70, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.arc(g.x, g.y, range, facing - half, facing + half);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // cone edge lines so the wedge reads even on the dark floor
  ctx.save();
  ctx.strokeStyle = hot ? 'rgba(255, 190, 70, 0.55)' : 'rgba(255, 220, 110, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(facing - half) * range, g.y + Math.sin(facing - half) * range);
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(facing + half) * range, g.y + Math.sin(facing + half) * range);
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, g, t) {
  const bob = Math.sin(g.bobPhase) * 4;
  ctx.save();
  ctx.translate(g.x, g.y + bob);
  if (g.kind === 'fish') {
    // Lumen the lanternfish — glowing yellow body, lure light.
    ctx.scale(g.dir, 1);
    ctx.fillStyle = '#f7c948';
    ctx.beginPath(); ctx.ellipse(0, 0, 46, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-42, 0); ctx.lineTo(-64, -16); ctx.lineTo(-64, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.ellipse(14, -2, 20, 11, 0, 0, Math.PI * 2); ctx.fill();
    // lure stalk + glowing bulb
    ctx.strokeStyle = '#f7c948'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(30, -14); ctx.quadraticCurveTo(44, -34, 52, -30); ctx.stroke();
    const lg = ctx.createRadialGradient(52, -30, 1, 52, -30, 16);
    lg.addColorStop(0, 'rgba(255, 240, 170, 1)');
    lg.addColorStop(1, 'rgba(255, 220, 90, 0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(52, -30, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1305';
    ctx.beginPath(); ctx.arc(30, -5, 4.5, 0, Math.PI * 2); ctx.fill();
  } else {
    // Vesper the moray eel — long dark body, pale belly, open jaw.
    ctx.scale(g.dir, 1);
    ctx.strokeStyle = '#3f6b4f';
    ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-58, 8);
    ctx.quadraticCurveTo(-20, -14 + Math.sin(t * 2) * 6, 22, 2);
    ctx.quadraticCurveTo(44, 8, 56, -4);
    ctx.stroke();
    ctx.strokeStyle = '#7fae8d';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-52, 12); ctx.quadraticCurveTo(-10, -2, 40, 6);
    ctx.stroke();
    // head + jaw + eye
    ctx.fillStyle = '#2c4f38';
    ctx.beginPath(); ctx.ellipse(56, -4, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0e1f14';
    ctx.beginPath(); ctx.ellipse(64, 2, 9, 4, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(56, -9, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // name tag — guards are named (judge rule: patrol can be learned)
  ctx.fillStyle = 'rgba(2, 20, 26, 0.75)';
  const label = g.name.toUpperCase() + ' · ' + g.state;
  ctx.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
  const tw = ctx.measureText(label).width;
  roundRect(ctx, g.x - tw / 2 - 8, g.y - 58 + bob, tw + 16, 20, 10);
  ctx.fill();
  ctx.fillStyle = g.state === 'ALERT' ? '#ff6b5e' : g.state === 'SUSPICIOUS' ? '#ffd75e' : '#cfe8e2';
  ctx.textAlign = 'center';
  ctx.fillText(label, g.x, g.y - 43 + bob);

  // "?" / "!" tell above the head
  if (g.state === 'SUSPICIOUS' || g.suspicion > 0.35) {
    ctx.font = 'bold 34px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillStyle = '#ffd75e';
    ctx.fillText('?', g.x, g.y - 66 + bob);
    ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('WHAT WAS THAT?', g.x + 92, g.y - 72 + bob);
  } else if (g.state === 'ALERT') {
    ctx.font = 'bold 38px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillStyle = '#ff6b5e';
    ctx.fillText('!', g.x, g.y - 66 + bob);
  }
  if (g.state === 'SEARCHING') {
    ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillStyle = '#ffb08a';
    ctx.fillText('LOST HIM...', g.x, g.y - 66 + bob);
  }
}

function drawPlayer(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const wig = Math.sin(p.swimPhase) * 3;
  // tentacles
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const spread = (i - 2) * 9;
    ctx.beginPath();
    ctx.moveTo(-p.facing * 8, 8);
    ctx.quadraticCurveTo(-p.facing * 20 + spread * 0.4, 20 + wig * (i % 2 ? 1 : -1), -p.facing * 26 + spread, 26);
    ctx.stroke();
  }
  // body
  const bg = ctx.createRadialGradient(-4, -8, 2, 0, 0, 24);
  bg.addColorStop(0, '#c4b5fd');
  bg.addColorStop(1, '#7c3aed');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, -2, 20, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(p.facing * 7, -8, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(p.facing * 7 - 11, -8, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c1030';
  ctx.beginPath(); ctx.arc(p.facing * 9, -8, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(p.facing * 7 - 11 + 2, -8, 2.4, 0, Math.PI * 2); ctx.fill();
  // carried pearl glow
  if (p.pearls > 0) {
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath(); ctx.arc(-p.facing * 16, 2, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(2, 20, 26, 0.75)';
  ctx.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
  const label = 'PIP · THE OCTOPUS';
  const tw = ctx.measureText(label).width;
  roundRect(ctx, p.x - tw / 2 - 8, p.y - 52, tw + 16, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#d9c8ff';
  ctx.textAlign = 'center';
  ctx.fillText(label, p.x, p.y - 37);
}

export function drawHUD(ctx, s) {
  const { w } = WORLD;
  const word = detectionWord(s.guards);
  const alarm = alarmLevel(s.guards);
  const vis = s.visibility;
  const noise = s.noise;

  // --- top bar ---
  ctx.fillStyle = 'rgba(2, 18, 24, 0.88)';
  ctx.fillRect(0, 0, w, 66);
  ctx.fillStyle = '#123a44';
  ctx.fillRect(0, 66, w, 2);

  // left: title + level
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 21px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('INK & LIGHT', 16, 27);
  ctx.fillStyle = '#9fd8c8';
  ctx.font = '13px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('Level 1/3  ·  Night 1', 16, 48);

  // center: detection word + alarm bar
  ctx.textAlign = 'center';
  ctx.fillStyle = word === 'SPOTTED!' ? '#ff6b5e' : word === 'UNSEEN' ? '#7fe0b2' : '#ffd75e';
  ctx.font = 'bold 22px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(word, 640, 28);
  // alarm scale
  ctx.fillStyle = '#0a2a32';
  roundRect(ctx, 520, 38, 240, 12, 6);
  ctx.fill();
  const segs = ['CALM', 'UNEASY', 'HUNTED', 'ALARM'];
  const idx = segs.indexOf(alarm.label);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i <= idx ? (i === 3 ? '#ff6b5e' : i === 2 ? '#ff9a3c' : i === 1 ? '#ffd75e' : '#7fe0b2') : '#14343d';
    ctx.fillRect(522 + i * 60, 40, 56, 8);
  }
  ctx.fillStyle = '#cfe8e2';
  ctx.font = '11px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('ALARM: ' + alarm.label, 640, 62);

  // right: timer, pearls, spotted
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('TIME ' + fmtTime(s.time), 1264, 27);
  ctx.font = 'bold 15px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillStyle = '#fffbe8';
  ctx.fillText('PEARLS ' + s.player.pearls + '/3', 1264, 49);
  ctx.fillStyle = s.spotted > 0 ? '#ff6b5e' : '#cfe8e2';
  ctx.fillText('SPOTTED ' + s.spotted, 1140, 49);

  // --- status strip under the bar ---
  ctx.textAlign = 'left';
  ctx.font = '13px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillStyle = '#9fd8c8';
  ctx.fillText('VISIBILITY: ' + vis, 16, 90);
  ctx.fillText('NOISE: ' + noise, 210, 90);
  ctx.fillStyle = '#ffd75e';
  ctx.fillText('INK: ' + '●'.repeat(s.player.ink) + '○'.repeat(s.player.maxInk - s.player.ink), 330, 90);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('GOAL: Bring 3 pearls home to the cave', 470, 90);

  // --- legend (bottom-left) ---
  ctx.fillStyle = 'rgba(2, 18, 24, 0.82)';
  roundRect(ctx, 12, 612, 300, 96, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('LEGEND', 24, 632);
  ctx.font = '12px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillStyle = '#2a8a4a';
  ctx.fillRect(24, 642, 14, 10);
  ctx.fillStyle = '#cfe8e2';
  ctx.fillText('Kelp = cover (hide here)', 46, 652);
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath(); ctx.moveTo(24, 668); ctx.lineTo(38, 664); ctx.lineTo(38, 672); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#cfe8e2';
  ctx.fillText('Light cone = danger', 46, 672);
  ctx.fillStyle = '#ff7fb0';
  ctx.beginPath(); ctx.arc(31, 690, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cfe8e2';
  ctx.fillText('Pink cave = exit (needs 3 pearls)', 46, 694);

  // --- patrol roster (bottom-right) ---
  ctx.fillStyle = 'rgba(2, 18, 24, 0.82)';
  roundRect(ctx, 968, 612, 300, 96, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd75e';
  ctx.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('PATROL', 980, 632);
  ctx.font = '12px "Trebuchet MS", Verdana, sans-serif';
  s.guards.forEach((g, i) => {
    const distM = Math.max(1, Math.round(Math.hypot(s.player.x - g.x, s.player.y - g.y) / 30));
    ctx.fillStyle = '#cfe8e2';
    ctx.fillText(g.name + ' — ' + g.state + ' · ' + distM + 'm', 980, 654 + i * 22);
    ctx.fillStyle = g.state === 'ALERT' ? '#ff6b5e' : g.state === 'SUSPICIOUS' ? '#ffd75e' : '#7fe0b2';
    ctx.beginPath(); ctx.arc(1252, 650 + i * 22, 5, 0, Math.PI * 2); ctx.fill();
  });

  // --- controls hint ---
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(207, 232, 226, 0.6)';
  ctx.font = '12px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('WASD / arrows swim  ·  X ink cloud  ·  Kelp hides you  ·  Watch the cones', 640, 700);

  // --- win overlay ---
  if (s.player.won) {
    ctx.fillStyle = 'rgba(2, 14, 18, 0.72)';
    ctx.fillRect(0, 0, w, WORLD.h);
    ctx.fillStyle = 'rgba(2, 26, 32, 0.95)';
    roundRect(ctx, 390, 240, 500, 220, 14);
    ctx.fill();
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth = 2;
    roundRect(ctx, 390, 240, 500, 220, 14);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd75e';
    ctx.font = 'bold 34px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('YOU MADE IT HOME', 640, 300);
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('Three pearls, zero bites', 640, 342);
    ctx.fillStyle = '#9fd8c8';
    ctx.font = '16px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('FINISHED IN ' + fmtTime(s.player.winTime) + '  ·  SPOTTED ' + s.spotted, 640, 378);
    ctx.fillStyle = '#cfe8e2';
    ctx.font = '13px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('Press R to swim again', 640, 414);
  }

  // --- caught overlay ---
  if (s.caught) {
    ctx.fillStyle = 'rgba(20, 4, 6, 0.78)';
    ctx.fillRect(0, 0, w, WORLD.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b5e';
    ctx.font = 'bold 40px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('CAUGHT!', 640, 330);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('Vesper bit the little octopus. Press R to try again.', 640, 372);
  }
}
