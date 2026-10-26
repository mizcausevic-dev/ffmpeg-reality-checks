// Usage: node episodes/ff10/fixture/run.mjs [outdir]   (default: ./out/ff10)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff10');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.streams.map((s) => s.type + (s.channels ? ` ${s.channels}ch${s.isDefault ? ' default' : ''}` : '')).join(', ')}; audio pitches ${ev.source.pitches.join(' Hz, ')} Hz`);
console.log(`source 2: ${ev.source2.streams.map((s) => s.type + (s.channels ? ` ${s.channels}ch${s.isDefault ? ' default' : ''}` : '')).join(', ')}; audio pitches ${ev.source2.pitches.join(' Hz, ')} Hz`);
console.log(`source 3: ${ev.source3.streams.map((s) => s.type + (s.channels ? ` ${s.channels}ch${s.isDefault ? ' default' : ''}` : '')).join(', ')}; audio pitches ${ev.source3.pitches.join(' Hz, ')} Hz\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k}: ${r.command}`);
  console.log(`   streams: ${r.streams.map((s) => s.type).join(', ')}; audio tracks ${r.audioCount} channels ${JSON.stringify(r.channels)}; pitches ${JSON.stringify(r.pitches)} Hz`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
