// Usage: node episodes/ff96/fixture/run.mjs [outdir]   (default: ./out/ff96)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, sectionSpread} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff96');
fs.mkdirSync(dir, {recursive: true});
const ev = runExperiment();
console.log(ev.ffmpeg + '\n');
for (const [id, P] of Object.entries(ev.programs)) {
  console.log(`== program "${id}": eight sections of ${P.sec} s (${P.samples} samples)`);
  console.log(`loudnorm pass 1 reads I ${P.twoPass.linear.pass1.input_i}, LRA ${P.twoPass.linear.pass1.input_lra}; linear request: ${P.twoPass.linear.type}; with ${ev.targets.T16}: ${P.twoPass.fallback.type}`);
  for (const r of P.rows) console.log(`${r.id.padEnd(6)} ebur128 I ${String(r.ebur.I).padStart(6)} LRA ${String(r.ebur.LRA).padStart(5)} peak ${String(r.ebur.samplePeak).padStart(5)} true ${String(r.ebur.truePeak).padStart(5)} | node I ${r.node.I.toFixed(2).padStart(6)} LRA ${r.node.LRA.toFixed(2).padStart(5)} peak ${r.node.samplePeakDb.toFixed(2).padStart(5)} | sections ${r.node.sections.map((v) => v.toFixed(1)).join(' ')} spread ${sectionSpread(r).toFixed(1)}${r.rate ? ` | wav rate ${r.rate.header} (ffprobe ${r.rate.probe}, ${r.rate.samples} samples)` : ''}`);
}
console.log('\ncontrol (1000 Hz sine, 0.5 and 0.25):', JSON.stringify(ev.control));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
