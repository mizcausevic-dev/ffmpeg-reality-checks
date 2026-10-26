// Usage: node episodes/ff23/fixture/run.mjs [outdir]   (default: ./out/ff23)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff23');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `\nsource: ${ev.source.frames} frames, ${ev.source.uniqueFrames} unique\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(14)} declared ${r.declared.frames} frames, ${r.declared.seconds}s | holds source ${r.content.firstSeconds}s to ${r.content.endSeconds}s (frames ${r.content.first} to ${r.content.last}, contiguous ${r.content.contiguous})\n   ${r.command}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
