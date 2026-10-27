// Usage: node episodes/ff81/fixture/run.mjs [outdir]   (default: ./out/ff81)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, THRESHOLDS} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff81');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [name, c] of Object.entries(ev.clips)) {
  console.log(`${name.padEnd(10)} ${c.frames} frames, peak score ${c.peak.toFixed(6)} at frame ${c.peakAt}, max |ffmpeg - model| ${c.maxDiff.toExponential(2)}`);
  const top = c.scores.map((s, k) => [k, s]).filter(([, s]) => s > 0.01).slice(0, 6).map(([k, s]) => `${k}:${s.toFixed(4)}`).join(' ');
  console.log(`           scores above 0.01: ${top || 'none'}`);
  console.log('           selected  ' + THRESHOLDS.map((T) => `T=${T}: [${c.selected[T].ffmpeg.join(',')}]`).join('  '));
}
console.log(`\nidiom select='eq(n,0)+gt(scene,0.4)' on the hard cut: frames [${ev.idiom}]`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, (k, v) => (k === 'model' || k === 'mafd' ? undefined : v), 2));
console.log(`Evidence written to ${path.join(dir, 'evidence.json')}`);
