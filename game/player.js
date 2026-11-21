// player.js — one job: the little purple octopus.
// Swim with WASD/arrows, pick up pearls by touch, spend ink (X/Space)
// to drop a cloud that breaks line of sight. Bubbles trail behind
// while swimming fast — that is the "footsteps" the guards can hear.
import { WORLD, inKelp, inInk, CAVE } from './level.js';

export function createPlayer() {
  return {
    x: 88, y: 500, vx: 0, vy: 0, r: 20,
    pearls: 0, ink: 3, maxInk: 3,
    facing: 1, swimPhase: 0, moving: false, fast: false,
    bubbles: [], won: false, winTime: 0,
  };
}

export function updatePlayer(p, keys, dt, pearls, clouds, onWin) {
  const accel = 620, maxSpeed = 165, drag = 4.2;
  let ax = 0, ay = 0;
  if (keys.left) ax -= 1;
  if (keys.right) ax += 1;
  if (keys.up) ay -= 1;
  if (keys.down) ay += 1;
  const len = Math.hypot(ax, ay);
  if (len > 0) { ax /= len; ay /= len; }
  p.vx += ax * accel * dt;
  p.vy += ay * accel * dt;
  p.vx -= p.vx * drag * dt;
  p.vy -= p.vy * drag * dt;
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > maxSpeed) { p.vx *= maxSpeed / sp; p.vy *= maxSpeed / sp; }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(28, Math.min(WORLD.w - 28, p.x));
  p.y = Math.max(96, Math.min(WORLD.floorY - 14, p.y));
  p.moving = sp > 24;
  p.fast = sp > 110;
  if (p.vx > 12) p.facing = 1;
  if (p.vx < -12) p.facing = -1;
  if (p.moving) p.swimPhase += dt * (p.fast ? 11 : 7);

  // Bubble trail while swimming — visible "footsteps" in the water.
  if (p.moving && Math.random() < dt * (p.fast ? 14 : 6)) {
    p.bubbles.push({ x: p.x - p.facing * 14, y: p.y - 8, r: 2 + Math.random() * 3, vy: -26 - Math.random() * 20, life: 1.6 });
  }
  for (const b of p.bubbles) { b.y += b.vy * dt; b.life -= dt; }
  p.bubbles = p.bubbles.filter((b) => b.life > 0);

  // Pick up pearls by touch.
  for (const pearl of pearls) {
    if (!pearl.taken && Math.hypot(p.x - pearl.x, p.y - pearl.y) < p.r + pearl.r + 4) {
      pearl.taken = true;
      p.pearls += 1;
    }
  }

  // Reach the cave with all three pearls to win.
  if (!p.won && p.pearls >= 3 && Math.hypot(p.x - CAVE.x, p.y - CAVE.y) < CAVE.r - 6) {
    p.won = true;
    p.winTime = p.winTime || 0;
    onWin();
  }
  return p;
}

// Drop an ink cloud at the octopus. Returns true when one was spent.
export function dropInk(p, clouds) {
  if (p.ink <= 0) return false;
  p.ink -= 1;
  clouds.push({ x: p.x, y: p.y, r: 74, ttl: 9, maxTtl: 9 });
  return true;
}

export function playerVisibility(p, clouds) {
  if (inInk(p.x, p.y, clouds)) return 'IN INK';
  if (inKelp(p.x, p.y)) return 'HIDDEN';
  return 'EXPOSED';
}

export function playerNoise(p) {
  if (!p.moving) return 'SILENT';
  return p.fast ? 'RIPPLE' : 'SOFT';
}
