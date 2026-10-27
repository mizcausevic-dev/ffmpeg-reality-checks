// Usage: node episodes/ff82/fixture/run.mjs [outdir]   (default: ./out/ff82)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, lumaTh} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff82');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const fmt = (a) => (a.length ? a.map((i) => `${i.start}..${i.end} (${i.duration})`).join('  ') : 'none');
for (const [name, c] of Object.entries(ev.clips)) {
  console.log(`${name}: ${c.frames} frames, max |luma read back - luma written| ${c.lumaDiff.toExponential(2)}`);
  for (const r of c.runs) console.log(`  ${r.opts.defaults ? "defaults" : `pix_th ${r.opts.pix_th} (luma <= ${lumaTh(r.opts.pix_th)})  pic_th ${r.opts.pic_th}  d ${r.opts.d}`}   ffmpeg: ${fmt(r.ffmpeg)}   node: ${fmt(r.node)}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
