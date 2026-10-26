// Usage: node episodes/ff25/fixture/run.mjs [outdir]   (default: ./out/ff25)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff25');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, r] of Object.entries(ev.runs)) {
  const first = r.byMd5.slice(0, 10).join(',');
  console.log(`${k.padEnd(11)} source frames kept (md5): ${first}${r.byMd5.length > 10 ? ',...' : ''}   first at ${(r.byMd5[0] / r.fps).toFixed(3)} s   [luma agrees: ${JSON.stringify(r.byMd5) === JSON.stringify(r.byLuma)}]\n   ${r.command}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
