// Usage: node episodes/ff11/fixture/run.mjs [outdir]   (default: ./out/ff11)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff11');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, v] of Object.entries(ev.variants)) {
  console.log(`${k}: ${v.command}`);
  console.log(`   stored as ${v.pixFmt}${v.profile ? ` (${v.profile})` : ''}, ${v.bytes} bytes`);
  console.log(`   back in RGB: ${v.identicalRgbFrames}/${ev.frames} frames identical, psnr ${v.psnrRgb}; identical in its own format (${v.pixFmt}): ${v.identicalInEncodedFormat}/${ev.frames}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
