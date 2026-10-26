// Usage: node episodes/ff04/fixture/run.mjs [outdir]   (default: ./out/ff04)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff04');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `   (CRF ${ev.crf})`);
for (const [name, c] of Object.entries(ev.clips)) {
  console.log(`\n${c.label}: reference ${c.refFrames} frames, SSIM of the reference against itself ${c.ssimSelf}`);
  console.log('preset      bytes      SSIM      ms     x264 core');
  for (const r of c.rows) console.log(`${r.preset.padEnd(11)} ${String(r.bytes).padEnd(10)} ${r.ssim.toFixed(4)}   ${String(r.ms).padEnd(6)} ${r.x264core}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
