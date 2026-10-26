// Usage: node episodes/ff02/fixture/run.mjs [outdir]   (default: ./out/ff02)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff02');
const ev = runExperiment(dir);
console.log(ev.ffmpeg);
console.log(`Source: ${ev.request.frames} PNG frames, ${ev.source.pngPixFmt}\n`);
console.log('variant                   profile                 pix_fmt   bytes    PSNR vs PNG');
for (const [k, v] of Object.entries(ev.variants)) console.log(`${k.padEnd(25)} ${String(v.profile).padEnd(23)} ${String(v.pixFmt).padEnd(9)} ${String(v.bytes).padEnd(8)} ${v.psnrVsOriginal ?? '-'}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
