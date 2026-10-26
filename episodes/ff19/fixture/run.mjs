// Usage: node episodes/ff19/fixture/run.mjs [outdir]   (default: ./out/ff19)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff19');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(14)} astats: peak ${String(r.astats.peakDb).padStart(7)} dB rms ${String(r.astats.rmsDb).padStart(7)} dB | samples: peak ${String(r.samples.peakDb).padStart(7)} dB rms ${String(r.samples.rmsDb).padStart(7)} dB`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
