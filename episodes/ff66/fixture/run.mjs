// Usage: node episodes/ff66/fixture/run.mjs [outdir]   (default: ./out/ff66)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff66');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`sources: tone ${ev.sources.toneSamples} samples, clicks ${ev.sources.clickSamples} samples with ${ev.sources.clickPos.length} clicks\n`);
console.log('id          chain               factor  accepted  samples  expected   diff  probe    tone Hz  g1000  clicks (node/silencedetect)  first diff  same as source');
for (const r of Object.values(ev.runs)) {
  if (!r.accepted) { console.log(`${r.id.padEnd(11)} ${r.af.padEnd(19)} ${String(r.factor).padStart(6)}  REJECTED  ${r.message}`); continue; }
  const t = r.tone;
  console.log(`${r.id.padEnd(11)} ${r.af.padEnd(19)} ${String(r.factor).padStart(6)}  yes       ${String(r.samples).padStart(7)}  ${String(r.expected).padStart(7)}  ${(r.diff >= 0 ? '+' : '') + r.diff}`.padEnd(70) + ` ${String(r.samplesProbe).padStart(7)}  ${t ? String(t.zcHz).padStart(8) : '     n/a'}  ${t ? String(t.g1000).padStart(5) : '  n/a'}  ${r.clickEvents}/${r.clickEventsSd}  ${String(r.clickFirstDiff).padStart(8)}  ${r.identical}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
