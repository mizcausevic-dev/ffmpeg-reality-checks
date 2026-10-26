// Usage: node episodes/ff20/fixture/run.mjs [outdir]   (default: ./out/ff20)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff20');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(20)} declared ${String(r.declared.bitRate).padStart(6)} bps | measured ${String(r.measured.bitRate).padStart(6)} bps   ${r.command}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
