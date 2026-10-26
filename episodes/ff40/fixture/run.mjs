// Usage: node episodes/ff40/fixture/run.mjs [outdir]   (default: ./out/ff40)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff40');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, c] of Object.entries(ev.cases)) {
  console.log(`${k.padEnd(10)} ${c.pix.padEnd(8)} ${c.vf.padEnd(26)} ${c.note}`);
  console.log(`           ffprobe ${c.probed.width}x${c.probed.height} ${c.probed.pix_fmt}; luma starts col ${c.startX} row ${c.startY}; chroma starts col ${c.chromaStartCol} row ${c.chromaStartRow}; chroma shift ${c.chromaShiftX},${c.chromaShiftY} luma px; counts ${c.lumaCounts}/${c.chromaCounts}; md5 ${c.md5.slice(0, 8)}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
