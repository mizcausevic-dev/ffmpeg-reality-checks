// Usage: node episodes/ff61/fixture/run.mjs [outdir]   (default: ./out/ff61)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, CASES, ROUNDS, rkey} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff61');
fs.mkdirSync(dir, {recursive: true});
const ev = runExperiment();
console.log(ev.ffmpeg.split('\n')[0]);
console.log(`frames ${ev.w}x${ev.h}, picture luma 126, bars luma 16, the filter's limit ${ev.limit}\n`);
console.log('layout   picture (pixel scan)      ' + ROUNDS.map((r) => rkey(r).padStart(15)).join(''));
for (const c of CASES) {
  const r = ev.cases[c.id];
  console.log(`${c.id.padEnd(8)} ${`${r.scan.w}x${r.scan.h}@${r.scan.x},${r.scan.y}`.padEnd(26)}` + ROUNDS.map((k) => { const x = r.runs[rkey(k)]; return `${x.log.w}x${x.log.h}@${x.log.x},${x.log.y}`.padStart(15); }).join(''));
}
console.log('\nlost picture rows + columns, then black pixels kept in the cropped frame (reader 2, pixels of the cropped output):');
for (const c of CASES) { const r = ev.cases[c.id]; console.log(`${c.id.padEnd(8)}` + ROUNDS.map((k) => { const x = r.runs[rkey(k)]; return `${x.lostRows}+${x.lostCols}/${x.blackPixelsKept}`.padStart(15); }).join('')); }
let disagree = 0, total = 0;
for (const c of CASES) for (const k of ROUNDS) { const x = ev.cases[c.id].runs[rkey(k)]; total++; if (JSON.stringify(x.log) !== JSON.stringify(x.meta)) disagree++; }
console.log(`\nlog line and frame metadata disagree on ${disagree} of ${total} runs`);
console.log(`pixel format (top bar 3, bottom bar 1, round=2): ${JSON.stringify(ev.pixfmt)}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
