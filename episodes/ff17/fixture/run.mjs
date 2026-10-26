// Usage: node episodes/ff17/fixture/run.mjs [outdir]   (default: ./out/ff17)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff17');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, e] of Object.entries(ev.encodes)) {
  console.log(`${k.padEnd(12)} tag: matrix ${e.tag.colorSpace ?? 'none'}, range ${e.tag.range ?? 'none'}\n   ${e.command}`);
  for (const [r, d] of Object.entries(e.read)) console.log(`   read as ${r.padEnd(6)} worst channel error ${String(d.worstError).padStart(3)} | red ${d.patches.red} green ${d.patches.green} blue ${d.patches.blue} gray ${d.patches.gray}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
