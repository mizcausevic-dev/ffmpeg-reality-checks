// Usage: node episodes/ff38/fixture/run.mjs [outdir]   (default: ./out/ff38)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff38');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, r] of Object.entries(ev.runs)) {
  const p = r.probe;
  console.log(`${k.padEnd(9)} ${r.command}`);
  console.log(`          ffprobe ${p.width}x${p.height} SAR ${p.sarText} DAR ${p.darText}   pasp ${r.pasp.present ? r.pasp.n + ':' + r.pasp.d : 'absent (1:1)'}   shape in pixels ${r.pixels.w}x${r.pixels.h} (w/h ${r.shapeRatioPixels})`);
  console.log(`          if SAR is honored: picture ${r.shown.width}x${r.shown.height} (${r.shown.dar}:1), shape ${r.shown.shapeW}x${r.pixels.h} (w/h ${r.shown.shapeRatio})   pixel md5 ${r.pixels.md5.slice(0, 8)}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
