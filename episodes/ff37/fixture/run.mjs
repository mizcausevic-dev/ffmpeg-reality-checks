// Usage: node episodes/ff37/fixture/run.mjs [outdir]   (default: ./out/ff37)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff37');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, c] of Object.entries(ev.cases)) {
  const b = c.bars;
  console.log(`${k.padEnd(15)} ${c.note}`);
  console.log(`                ${c.command}`);
  if (c.scaled) console.log(`                scaled ${c.scaled.width}x${c.scaled.height} (sar ${c.scaled.sar})${c.ask ? `  pad asks x=${c.ask.x} y=${c.ask.y}` : ''}`);
  console.log(`                output ${c.probed.width}x${c.probed.height} ${c.pix}: bars top ${b.top} bottom ${b.bottom} left ${b.left} right ${b.right}; picture ${b.contentCols}x${b.contentRows}; chroma starts row ${b.chromaTop} col ${b.chromaLeft}${c.match ? `; rows equal to the unpadded render: ${c.match.rows}, cols ${c.match.cols}` : ''}`);
}
if (ev.x264) for (const [k, r] of Object.entries(ev.x264)) console.log(`libx264 ${k.padEnd(7)} exit ${r.status}${r.which ? `  "${r.which} not divisible by 2 (${r.size.join('x')})"` : ''}${r.wrote ? `  wrote ${r.wrote.width}x${r.wrote.height} sar ${r.wrote.sar}` : ''}`);
else console.log('libx264 not available in this build');
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
