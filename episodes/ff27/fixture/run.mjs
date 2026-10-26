// Usage: node episodes/ff27/fixture/run.mjs [outdir]   (default: ./out/ff27)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff27');
const ev = runExperiment(dir);
const f = (v) => (v === -Infinity ? '-inf' : v.toFixed(2)).padStart(7);
console.log(ev.ffmpeg + '\n');
for (const [way, r] of Object.entries(ev.runs)) {
  console.log(`${way}  (${r.command})`);
  for (const [tone, s] of Object.entries(r.levels)) console.log(`  ${tone.padEnd(4)} L r1 ${f(s.L.r1)} r2 ${f(s.L.r2)} | R r1 ${f(s.R.r1)} r2 ${f(s.R.r2)}`);
}
console.log('\nstereo control byte identical:', ev.stereoControl.byteIdentical);
console.log('clip probe:', JSON.stringify(ev.clip));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, (k, v) => (v === -Infinity ? '-inf' : v), 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
