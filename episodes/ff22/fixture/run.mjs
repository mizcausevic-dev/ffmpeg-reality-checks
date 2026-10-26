// Usage: node episodes/ff22/fixture/run.mjs [outdir]   (default: ./out/ff22)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff22');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, r] of Object.entries(ev.runs)) {
  const row = Object.entries(r.rgb).map(([d, v]) => `${d > 0 ? '+' : ''}${d}:${v.join(',')}`).join('  ');
  console.log(`${k.padEnd(14)} ${r.pixFmt.padEnd(8)} rgb ${row} | line chroma U ${r.chroma.u} V ${r.chroma.v}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
