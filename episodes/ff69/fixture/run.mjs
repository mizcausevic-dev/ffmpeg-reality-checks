// Usage: node episodes/ff69/fixture/run.mjs [outdir]   (default: ./out/ff69)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff69');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(11)} ${r.command}`);
  console.log(`            expected onset ${JSON.stringify(r.expect)} | node onset ${JSON.stringify(r.node.onset)} tail ${JSON.stringify(r.node.tail)} frames ${r.frames} (${r.durationProbe.toFixed(3)} s) | ffmpeg onset ${JSON.stringify(r.ff.onset)} tail ${JSON.stringify(r.ff.tail)} | exact copy L,R ${r.copy}`);
}
const kp = ev.knownPositive;
console.log(`\nknown positive (${kp.note}): expected ${JSON.stringify(kp.expect)} | node ${JSON.stringify(kp.node.onset)} | ffmpeg ${JSON.stringify(kp.ff.onset)}`);
console.log('\naround d1000:', JSON.stringify(ev.runs.d1000.around));
console.log('around d333_777:', JSON.stringify(ev.runs.d333_777.around));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
