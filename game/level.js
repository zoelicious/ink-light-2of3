// level.js — one job: the static layout of the kelp forest.
// World is a fixed 1280x720 side view. The floor is dark; the only
// strong light is the guards' warm yellow vision cones.
export const WORLD = { w: 1280, h: 720, floorY: 596, waterTop: 0 };

// Kelp clusters. Standing inside a cluster hides the octopus
// (cover). Each cluster is a band of swaying blades.
export const KELP = [
  { x: 96,  w: 86, h: 250 },
  { x: 268, w: 78, h: 300 },
  { x: 452, w: 92, h: 270 },
  { x: 636, w: 70, h: 320 },
  { x: 806, w: 88, h: 260 },
  { x: 968, w: 76, h: 290 },
  { x: 1088, w: 60, h: 210 },
];

// Pearls to steal. The cave only opens once all three are carried.
export const PEARLS = [
  { id: 0, x: 330, y: 470, r: 13 },
  { id: 1, x: 640, y: 400, r: 13 },
  { id: 2, x: 940, y: 500, r: 13 },
];

// The anemone cave — the exit, far right, glowing pink.
export const CAVE = { x: 1162, y: 486, r: 92 };

// Patrol routes. Lumen the lanternfish sweeps the open middle water;
// Vesper the moray eel guards the approach to the cave.
export const PATROLS = {
  lumen:  { y: 296, x0: 250, x1: 780, speed: 52 },
  vesper: { y: 430, x0: 930, x1: 1130, speed: 38 },
};

export const PLAYER_SPAWN = { x: 88, y: 500 };

// True when a point is inside a kelp cluster (cover).
export function inKelp(x, y) {
  for (const k of KELP) {
    if (x >= k.x && x <= k.x + k.w && y >= WORLD.floorY - k.h && y <= WORLD.floorY + 8) return true;
  }
  return false;
}

// True when a point is inside an ink cloud (cover that moves with you).
export function inInk(x, y, clouds) {
  for (const c of clouds) {
    const dx = x - c.x, dy = y - c.y;
    if (dx * dx + dy * dy < c.r * c.r) return true;
  }
  return false;
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m).padStart(1, '0') + ':' + String(s).padStart(2, '0');
}
