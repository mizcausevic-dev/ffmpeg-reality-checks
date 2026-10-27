// Usage: node episodes/ff86/fixture/run.mjs [outdir]   (default: ./out/ff86)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, SETUPS} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff86');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const f = (n) => (Number.isNaN(n) ? 'n/a' : n.toFixed(2));
for (const s of Object.keys(SETUPS)) {
  console.log(`== ${s}: overlay${SETUPS[s].fmt ? ' format=' + SETUPS[s].fmt : ''}, output ${SETUPS[s].out}; ${ev.classes[s].length} distinct frames from 16 offsets`);
  for (const r of Object.values(ev.setups[s])) {
    console.log(`  x=${r.x} y=${r.y}: Y box (${r.Y.x0},${r.Y.y0}) ${r.Y.w}x${r.Y.h} | U box (${r.U.x0},${r.U.y0}) ${r.U.w}x${r.U.h} | centroid Y ${f(r.cY.x)},${f(r.cY.y)} U ${f(r.cU.x)},${f(r.cU.y)} | blended U ${r.blendedU} | ffmpeg Y (${r.ffmpeg.Y.x0},${r.ffmpeg.Y.y0}) ${r.ffmpeg.Y.w}x${r.ffmpeg.Y.h} U (${r.ffmpeg.U.x0},${r.ffmpeg.U.y0}) ${r.ffmpeg.U.w}x${r.ffmpeg.U.h}`);
  }
}
console.log('\nclasses (Node md5):', JSON.stringify(ev.classes));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
