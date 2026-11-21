// main.js — one job: wire the game together.
// Game loop, keyboard input, the timer, and the ?shot= staging used
// for the four screenshots (cover / patrol / alarm / win). Staging only
// sets the game state — every screenshot is a real render of this code.
import { WORLD, PEARLS, PATROLS } from './level.js';
import { createPlayer, updatePlayer, dropInk, playerVisibility, playerNoise } from './player.js';
import { createGuard, updateGuard } from './guard.js';
import { drawWorld, drawHUD } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const keys = { left: false, right: false, up: false, down: false };
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
};
addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.code === 'KeyX' || e.code === 'Space') { dropInk(state.player, state.clouds); e.preventDefault(); }
  if (e.code === 'KeyR') resetGame();
});
addEventListener('keyup', (e) => {
  if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false;
});

function freshState() {
  return {
    time: 0,
    player: createPlayer(),
    guards: [
      createGuard('Lumen', 'fish', PATROLS.lumen),
      createGuard('Vesper', 'eel', PATROLS.vesper),
    ],
    pearls: PEARLS.map((p) => ({ ...p, taken: false })),
    clouds: [],
    spotted: 0,
    caught: false,
    visibility: 'EXPOSED',
    noise: 'SILENT',
  };
}

let state = freshState();

function resetGame() {
  state = freshState();
  applyShot(new URLSearchParams(location.search).get('shot'));
}

function onSpotted() {
  state.spotted += 1;
  if (state.spotted >= 3) state.caught = true;
}

function onWin() {
  state.player.winTime = state.time;
}

// --- screenshot staging -------------------------------------------------
// Each shot is a real game state: the loop keeps running (timer ticks,
// guards patrol, cones sway), only the starting position differs.
function applyShot(shot) {
  if (!shot) return;
  const p = state.player;
  const [lumen, vesper] = state.guards;
  if (shot === 'cover') {
    // Near-miss: GLIMPSED "?" + narrowed cone on the octopus + ink used
    // + 1 pearl already taken, timer ~1:00, cave visible at right.
    state.time = 60;
    state.pearls[0].taken = true;
    p.pearls = 1; p.ink = 2;
    p.x = 560; p.y = 468;
    lumen.x = 700; lumen.y = 296; lumen.dir = -1; lumen.aim = 2.25; lumen.suspicion = 0.42; lumen.state = 'SUSPICIOUS';
    vesper.x = 1000; vesper.y = 430; vesper.dir = -1;
    // Ink cloud beside the octopus — used, visible, but not covering
    // it, so Lumen's narrowed cone can still hold the glimpse.
    state.clouds.push({ x: 648, y: 492, r: 74, ttl: 9, maxTtl: 9 });
  } else if (shot === 'patrol') {
    // Hidden in the kelp while Lumen sweeps past, timer running.
    state.time = 42;
    p.x = 300; p.y = 520;
    lumen.x = 520; lumen.y = 296; lumen.dir = 1;
    vesper.x = 980; vesper.y = 430; vesper.dir = 1;
  } else if (shot === 'alarm') {
    // Full alarm + recovery: Vesper "!" + HUNTED, ink behind the
    // octopus as it slips into the kelp, 2 pearls carried.
    state.time = 83;
    state.pearls[0].taken = true; state.pearls[1].taken = true;
    p.pearls = 2; p.ink = 1;
    p.x = 880; p.y = 500;
    state.spotted = 1;
    vesper.x = 1010; vesper.y = 430; vesper.dir = -1; vesper.aim = 2.64; vesper.suspicion = 0.92; vesper.state = 'SUSPICIOUS';
    lumen.x = 420; lumen.y = 296; lumen.dir = 1; lumen.suspicion = 0.2;
    state.clouds.push({ x: 920, y: 500, r: 74, ttl: 9, maxTtl: 9 });
  } else if (shot === 'win') {
    // Home in the cave: three pearls, zero bites.
    state.time = 107;
    state.pearls.forEach((pearl) => { pearl.taken = true; });
    p.pearls = 3; p.ink = 1;
    p.x = 1162; p.y = 486; p.won = true; p.winTime = 107;
    lumen.x = 500; lumen.y = 296; lumen.dir = 1;
    vesper.x = 980; vesper.y = 430; vesper.dir = 1;
  }
}

applyShot(new URLSearchParams(location.search).get('shot'));

// --- loop ---------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (!state.caught) state.time += dt;
  if (!state.player.won && !state.caught) {
    updatePlayer(state.player, keys, dt, state.pearls, state.clouds, onWin);
    for (const g of state.guards) updateGuard(g, state.player, state.clouds, dt, onSpotted);
    for (const c of state.clouds) c.ttl -= dt;
    state.clouds = state.clouds.filter((c) => c.ttl > 0);
  } else if (state.player.won) {
    // Victory scene stays alive behind the overlay: guards keep
    // patrolling, the timer keeps running.
    for (const g of state.guards) updateGuard(g, state.player, state.clouds, dt, () => {});
  }
  state.visibility = playerVisibility(state.player, state.clouds);
  state.noise = playerNoise(state.player);
  ctx.clearRect(0, 0, WORLD.w, WORLD.h);
  drawWorld(ctx, state, t);
  drawHUD(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
