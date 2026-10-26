// Usage: node episodes/ff76/fixture/run.mjs [outdir]   (default: ./out/ff76)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, write, NAMES, SOURCES, METHODS} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff76');
fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(dir, {recursive: true});
const ev = runExperiment();
console.log(ev.ffmpeg + '\n');
const show = ['red', 'green', 'blue', 'yellow', 'white', 'black'];
for (const s of Object.keys(SOURCES)) {
  console.log(`source ${s}`);
  console.log('  method    native format    ' + show.map((n) => n.padEnd(14)).join('') + '(raw / seen)');
  for (const m of Object.keys(METHODS)) {
    const p = ev.patches[s][m];
    console.log(`  ${m.padEnd(8)}  ${(p.fmt + '/' + (p.range ?? '-')).padEnd(15)}  ` + show.map((n) => `${p.native[n][0]}/${p.shown[n][0]}`.padEnd(14)).join('') + (p.spread ? `  channel spread ${p.spread}` : ''));
  }
}
console.log('\nramp 0..255 (neutral gray in): raw range, levels seen, distinct, worst distance from identity');
for (const s of Object.keys(SOURCES)) for (const m of Object.keys(METHODS)) { const r = ev.ramp[s][m]; console.log(`  ${s.padEnd(4)} ${m.padEnd(8)} raw ${r.nativeMin}..${r.nativeMax}  seen ${r.shownMin}..${r.shownMax}  ${String(r.distinctShown).padStart(3)} distinct  dev ${r.shownDev}`); }
console.log('\nNode formula: ' + JSON.stringify(ev.model));
write(path.join(dir, 'evidence.json'), ev);
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
