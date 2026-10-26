// Usage: node episodes/ff62/fixture/run.mjs [outdir]   (default: ./out/ff62)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, METHODS, SPEEDS, runId, N} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff62');
fs.mkdirSync(dir, {recursive: true});
const ev = runExperiment();
console.log(ev.ffmpeg.split('\n')[0]);
console.log(`card ${ev.w}x${ev.h}, ${N} frames per run, luma levels ${JSON.stringify(ev.levels)}, zoompan ran in ${JSON.stringify(ev.formats)}\n`);
console.log('error of the marker path against the ideal zoom, 3 markers x 119 steps, reader 1 (centroid) | reader 2 (edges)');
console.log('speed    way'.padEnd(34) + 'step rms'.padStart(10) + 'step max'.padStart(10) + 'stutter'.padStart(9) + 'stray max'.padStart(11) + '   | step rms  stutter | readers differ');
for (const s of SPEEDS) for (const m of METHODS) {
  const r = ev.runs[runId(m.id, s)];
  console.log(`${String(s).padEnd(8)} ${m.label.padEnd(25)}${String(r.r1.stepRms).padStart(10)}${String(r.r1.stepMax).padStart(10)}${(r.r1.stutter + '/' + r.r1.steps).padStart(9)}${String(r.r1.strayMax).padStart(11)}   | ${String(r.r2.stepRms).padStart(8)}  ${String(r.r2.stutter).padStart(7)} | ${r.agreeMax} px`);
}
console.log('\nthe integer lens model against the measured positions (px): rms / max, and with the other alignment (wrong on purpose)');
for (const s of SPEEDS) console.log(`${String(s).padEnd(8)} ` + METHODS.map((m) => { const r = ev.runs[runId(m.id, s)]; return `${m.id} ${r.model.rms}/${r.model.max} (${r.model.otherSnapRms})`; }).join('   '));
console.log('\ncontrols:');
for (const [k, c] of Object.entries(ev.controls)) console.log(`  ${k.padEnd(7)} frames ${c.frames}  reader 1 ${JSON.stringify(c.r1)}  reader 2 ${JSON.stringify(c.r2)}${c.maxErr1 !== undefined ? `  max error ${c.maxErr1} / ${c.maxErr2}` : ''}`);
console.log('\nthe lens, first 12 frames at the recipe speed (model): n, zoom, ideal origin, real origin, ideal width, real width');
for (const l of ev.lens) console.log(`  ${l.n}  ${l.z.toFixed(4)}  ${l.xIdeal.toFixed(2)}  ${l.X}  ${l.wIdeal.toFixed(2)}  ${l.w}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
