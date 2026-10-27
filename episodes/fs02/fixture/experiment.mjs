// fs02 is the vertical short cut of fl02. It measures nothing new: it imports fl02's experiment and evidence.
// loadEvidence() returns fl02's evidence from out/fl02/evidence.json when it was written by the current ffmpeg build, otherwise it re-runs fl02 in a temp folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ffmpegVersion} from '../../../tools/ff.mjs';
import {runExperiment} from '../../fl02/fixture/experiment.mjs';
export * from '../../fl02/fixture/experiment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export function loadEvidence() {
  const f = path.join(root, 'out', 'fl02', 'evidence.json');
  try {
    const ev = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (ev.ffmpeg === ffmpegVersion() && ev.recipe && ev.facts) return ev;
  } catch { /* fall through and measure */ }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fs02-'));
  try { return runExperiment(dir); } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}
