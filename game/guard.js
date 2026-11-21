// guard.js — one job: the patrol guards and their vision.
// Lumen the lanternfish and Vesper the moray eel walk a route, sweep a
// warm yellow cone, and grow suspicious in stages:
//   PATROL -> SUSPICIOUS ("?") -> ALERT ("!", chase) -> LOSE TRACK -> PATROL
// A guard only sees the octopus inside its cone, out of kelp and ink.
// Suspicion rises while seen and falls while unseen — detection always
// gives the player a way back (judge rule 2).
import { inKelp, inInk } from './level.js';

export function createGuard(name, kind, patrol) {
  return {
    name, kind,
    x: patrol.x0, y: patrol.y,
    x0: patrol.x0, x1: patrol.x1, speed: patrol.speed,
    dir: 1, patrolY: patrol.y,
    aim: 0,                 // cone angle; tilts toward the player when suspicious
    suspicion: 0,            // 0..1
    state: 'PATROL',         // PATROL | SUSPICIOUS | ALERT | SEARCHING
    stateTime: 0,
    chaseT: 0,
    bobPhase: Math.random() * 6,
    coneHalf: 0.48,          // radians; narrows as suspicion grows
  };
}

// Cone test: is the player inside this guard's vision wedge?
export function seesPlayer(g, p, clouds) {
  if (inKelp(p.x, p.y) || inInk(p.x, p.y, clouds)) return false;
  const dx = p.x - g.x, dy = p.y - g.y;
  const dist = Math.hypot(dx, dy);
  const range = 400;
  if (dist > range || dist < 8) return dist < 8;
  const ang = Math.atan2(dy, dx);
  const facing = g.aim;
  let diff = ang - facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  // The cone narrows and focuses as the guard grows suspicious.
  const half = g.coneHalf * (1 - 0.45 * g.suspicion);
  if (Math.abs(diff) > half) return false;
  // Closer reads are stronger; far edge of the cone is easier to slip.
  return dist < range * (0.55 + 0.45 * (1 - Math.abs(diff) / half));
}

export function updateGuard(g, p, clouds, dt, onSpotted) {
  g.bobPhase += dt * 2.2;

  // The octopus is home: guards just keep patrolling, nothing to spot.
  if (p.won) {
    g.x += g.dir * g.speed * dt;
    if (g.x >= g.x1) { g.x = g.x1; g.dir = -1; }
    if (g.x <= g.x0) { g.x = g.x0; g.dir = 1; }
    g.y = g.patrolY + Math.sin(g.bobPhase) * 10;
    g.aim = g.dir >= 0 ? 0 : Math.PI;
    g.suspicion = 0;
    g.state = 'PATROL';
    return g;
  }

  if (g.state === 'ALERT') {
    // Short chase toward the player, then give up and search.
    g.chaseT -= dt;
    const dx = p.x - g.x, dy = p.y - g.y;
    const d = Math.hypot(dx, dy) || 1;
    g.x += (dx / d) * 118 * dt;
    g.y += (dy / d) * 60 * dt;
    g.dir = dx >= 0 ? 1 : -1;
    if (g.chaseT <= 0) {
      g.state = 'SEARCHING';
      g.stateTime = 0;
      g.suspicion = 0.55;
    }
    return g;
  }

  if (g.state === 'SEARCHING') {
    g.stateTime += dt;
    g.suspicion = Math.max(0, g.suspicion - dt * 0.16);
    // Drift back to the patrol route.
    const tx = (g.x0 + g.x1) / 2;
    g.x += Math.sign(tx - g.x) * 40 * dt;
    if (g.stateTime > 2.6 || g.suspicion <= 0.05) {
      g.state = 'PATROL';
      g.suspicion = 0;
    }
    return g;
  }

  // PATROL / SUSPICIOUS: walk the route, ping-pong.
  g.x += g.dir * g.speed * dt;
  if (g.x >= g.x1) { g.x = g.x1; g.dir = -1; }
  if (g.x <= g.x0) { g.x = g.x0; g.dir = 1; }
  g.y = g.patrolY + Math.sin(g.bobPhase) * 10;

  // Aim the cone: level while calm, tilting toward the octopus once
  // suspicious — the cone visibly narrows onto the player.
  const base = g.dir >= 0 ? 0 : Math.PI;
  let target = base;
  if (g.suspicion > 0.3) {
    const ta = Math.atan2(p.y - g.y, p.x - g.x);
    let d = ta - base;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    target = base + Math.max(-1.05, Math.min(1.05, d));
  }
  let ad = target - g.aim;
  while (ad > Math.PI) ad -= 2 * Math.PI;
  while (ad < -Math.PI) ad += 2 * Math.PI;
  g.aim += ad * Math.min(1, dt * 2.5);

  const seen = seesPlayer(g, p, clouds);
  if (seen) {
    g.suspicion = Math.min(1, g.suspicion + dt * 0.30);
  } else {
    g.suspicion = Math.max(0, g.suspicion - dt * 0.30);
  }
  if (g.suspicion >= 1) {
    g.state = 'ALERT';
    g.chaseT = 2.4;
    g.suspicion = 1;
    onSpotted(g);
  } else if (g.suspicion > 0.35) {
    g.state = 'SUSPICIOUS';
  } else {
    g.state = 'PATROL';
  }
  return g;
}

// Word the HUD shows for the most suspicious guard.
export function detectionWord(guards) {
  const top = Math.max(0, ...guards.map((g) => g.suspicion));
  const anyAlert = guards.some((g) => g.state === 'ALERT');
  if (anyAlert || top >= 1) return 'SPOTTED!';
  if (top >= 0.7) return 'SUSPICIOUS';
  if (top >= 0.35) return 'GLIMPSED';
  return 'UNSEEN';
}

// Alarm scale: CALM -> UNEASY -> HUNTED -> ALARM.
export function alarmLevel(guards) {
  const top = Math.max(0, ...guards.map((g) => g.suspicion));
  const anyAlert = guards.some((g) => g.state === 'ALERT');
  if (anyAlert) return { label: 'ALARM', frac: 1 };
  if (top >= 0.7) return { label: 'HUNTED', frac: top };
  if (top >= 0.35) return { label: 'UNEASY', frac: top };
  return { label: 'CALM', frac: top };
}
