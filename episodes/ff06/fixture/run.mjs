// Usage: node episodes/ff06/fixture/run.mjs [outdir]   (default: ./out/ff06)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff06');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, j] of Object.entries(ev.joins)) {
  console.log(`${k}: ${j.clips}`);
  console.log(`   ${j.command}`);
  console.log(`   exit ${j.exit}, ${j.stderrLines.length} warning line(s), header says ${j.header}, ${j.frames} frames, ${j.duration}s`);
  console.log(`   frame sizes inside: ${JSON.stringify(j.frameSizes)}; decode problems: ${j.decode?.stderrLines}`);
  for (const l of j.stderrLines.slice(0, 3)) console.log(`   stderr: ${l}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
