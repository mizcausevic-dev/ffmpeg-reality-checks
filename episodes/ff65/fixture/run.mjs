// Usage: node episodes/ff65/fixture/run.mjs [outdir]   (default: ./out/ff65)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff65');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`decoded samples of the wav sources: ${JSON.stringify(ev.sources.wavSamples)}\n`);
console.log('id                        guard  frames  samples  vSec   aSec   fmt     ptsEnd v/a      stopped by');
for (const r of Object.values(ev.runs)) {
  console.log(`${r.id.padEnd(24)}  ${String(r.guard).padStart(4)}  ${String(r.framesDecoded).padStart(5)}  ${String(r.samplesDecoded).padStart(7)}  ${r.vSec.toFixed(3).padStart(6)} ${r.aSec.toFixed(3).padStart(6)}  ${r.fmtDur.toFixed(3).padStart(6)}  ${r.vEnd.toFixed(3)}/${r.aEnd.toFixed(3)}  ${r.hitGuard ? 'THE GUARD' : 'itself'}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
