// Usage: node episodes/ff80/fixture/run.mjs [outdir]   (default: ./out/ff80)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff80');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const cs = (a) => a.join(' ');
for (const [name, g] of Object.entries(ev.gifs)) {
  console.log(`${name}: delays in file ${cs(g.delaysInFile)} (sum ${g.sumInFile})`);
  const a = g.asGif;
  console.log(`  gif       r ${a.rFrameRate} avg ${a.avgFrameRate} packets ${a.packets} duration ${a.duration} shown ${a.shown} on screen ${cs(a.onScreen)}`);
  for (const [c, o] of Object.entries(g.out)) {
    if (o.failed) { console.log(`  ${c.padEnd(10)} FAILED ${o.stderr}`); continue; }
    console.log(`  ${c.padEnd(10)} r ${o.rFrameRate} avg ${o.avgFrameRate} packets ${o.packets} duration ${o.duration} missing [${o.missing}] on screen ${cs(o.onScreen)}`);
  }
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
