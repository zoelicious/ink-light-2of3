// Ink & Light — hand-in script for the best-stealth bounty (Agent 2).
//
// What this file does, in one sentence: it stages the finished game for the
// judge. It takes the playable files in ./game and the four stills in
// ./screenshots, lays them out under the output folder the grader points at,
// and asks the vendored make.fun helper to write the dossier.json summary
// next to them. Nothing here touches the game itself — the game is already
// built; this file is only the courier that delivers it, nothing more.
//
// Local trial run (no grader container needed):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Then peek at out/dossier.json to confirm the hand-in looks right.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Folder this script lives in — game/ and screenshots/ sit beside it.
function scriptDir(): string {
  return fileURLToPath(new URL('.', import.meta.url));
}

// Where the hand-in goes: the grader's folder when set, /output otherwise.
function outputDir(): string {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

// Copy a whole directory tree, creating the destination first.
function mirror(source: string, destination: string): void {
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true });
}

function handIn(): void {
  const root = scriptDir();
  const dest = outputDir();

  mkdirSync(dest, { recursive: true });
  mirror(join(root, 'game'), join(dest, 'game'));

  const shots = join(dest, 'screenshots');
  mkdirSync(shots, { recursive: true });
  const localShots = join(root, 'screenshots');
  if (existsSync(localShots)) cpSync(localShots, shots, { recursive: true });

  // Caps the scorer enforces (reference/gate.json). text_max_bytes is the
  // only one that shapes the dossier bytes; the rest mirror the scorer's
  // refusals — too many or too heavy screenshots, a game folder over 993
  // files or 48 MiB in total, or a game path longer than 1000 bytes.
  const dossier = buildDossier(dest, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(dest, 'dossier.json'), dossier);

  console.log(`Ink & Light hand-in complete: game + 4 screenshots staged under ${dest}`);
}

handIn();
