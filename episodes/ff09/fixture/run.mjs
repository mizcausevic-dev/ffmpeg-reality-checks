// Usage: node episodes/ff09/fixture/run.mjs [outdir]   (default: ./out/ff09)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff09');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, c] of Object.entries(ev.cases)) {
  console.log(`${k}: ${c.why}`);
  console.log(`   source ${c.source}, ${c.command.split('-vf ')[1]}`);
  console.log(`   scale gives ${c.scaleTo}; exit ${c.exit}; on disk: ${c.disk.exists ? `${c.disk.bytes} bytes, video ${JSON.stringify(c.disk.video)}` : 'no file'}`);
  if (c.encoderLine) console.log(`   encoder said: ${c.encoderLine}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
