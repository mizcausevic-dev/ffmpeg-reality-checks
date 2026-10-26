// Usage: node episodes/ff18/fixture/run.mjs [outdir]   (default: ./out/ff18)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff18');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.peakDb} dB peak, ${ev.source.atFullScale} samples at full scale\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(14)} astats: peak ${r.astats.peakDb} dB flat ${r.astats.flat} | samples: ${r.samples.atFullScale} at full scale (${(r.samples.share * 100).toFixed(1)}%), max error vs source ${r.samples.maxErrVsSource}\n   ${r.command}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
