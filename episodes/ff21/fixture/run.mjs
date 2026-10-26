// Usage: node episodes/ff21/fixture/run.mjs [outdir]   (default: ./out/ff21)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff21');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `\nsource: ${ev.source.frames} frames, hard cuts at ${ev.source.cuts.join(' s and ')} s\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(14)} keyframes (packets): ${r.keyframes.join(', ')} | I frames (decoded): ${r.iFrames.join(', ')}\n   ${r.command}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
