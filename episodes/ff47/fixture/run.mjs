// Usage: node episodes/ff47/fixture/run.mjs [outdir]   (default: ./out/ff47)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff47');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const fmt = (r) => r.silentRuns.map((s) => `${s.start}+${s.len}`).join(' ') || 'none';
console.log(`source: ${ev.source.samples} samples (ffprobe ${ev.source.probeSamples}), silences ${ev.source.silences} [${fmt(ev.source)}], tones ${ev.source.tones}, tone samples ${ev.source.toneSamples}, silencedetect ${ev.source.detectSilences}\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(10)} ${r.command}`);
  console.log(`           ${r.samples} samples (ffprobe ${r.probeSamples}), removed ${ev.source.samples - r.samples}, silences ${r.silences} (silencedetect ${r.detectSilences}) [${fmt(r)}], tones ${r.tones}, tone samples ${r.toneSamples}, equals source tail ${r.equalsSourceTail}, head ${r.equalsSourceHead}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
