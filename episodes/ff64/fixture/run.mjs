// Usage: node episodes/ff64/fixture/run.mjs [outdir]   (default: ./out/ff64)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff64');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`decoded samples of the wav sources: ${JSON.stringify(ev.sources.wavSamples)}; m4a: ${ev.sources.m4aSamples}\n`);
console.log('id                              frames  vSec   aSec   v - a    ptsEnd v/a     fmt');
for (const r of Object.values(ev.runs)) {
  console.log(`${r.id.padEnd(30)}  ${String(r.framesDecoded).padStart(4)}  ${r.vSec.toFixed(3).padStart(6)} ${r.aSec.toFixed(3).padStart(6)} ${(r.gap >= 0 ? '+' : '') + r.gap.toFixed(3)}  ${r.vEnd.toFixed(3)}/${r.aEnd.toFixed(3)} ${r.fmtDur.toFixed(3)}${r.ptsContiguous ? '' : '  (pts has gaps)'}  packets ${r.packetsV}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
