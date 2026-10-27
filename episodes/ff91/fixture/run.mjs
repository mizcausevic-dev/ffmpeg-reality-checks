import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff91-'));
const t0 = Date.now();
const ev = runExperiment(dir);
console.log(ev.ffmpeg.split('\n')[0], `(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
for (const [n, c] of Object.entries(ev.clips)) console.log(`clip ${n}: ${c.pkts} packets, keyframes at`, c.keyFrames.join(','));
console.log('\ncell | segments: lengths (s) | first frame | start_time | list start | concat');
for (const [k, r] of Object.entries(ev.cells)) {
  if (r.status !== 0) { console.log(k, 'FAILED', r.err); continue; }
  console.log(k.padEnd(30), String(r.nseg), JSON.stringify(r.lengths), JSON.stringify(r.firsts), JSON.stringify(r.starts), JSON.stringify(r.listStarts), JSON.stringify(r.listEnds), 'dur', JSON.stringify(r.durs), r.concatOk ? 'ok' : `BAD ${r.total}`, r.allKeyStart ? '' : 'NOT ALL KEY', `| joined: ${r.join.pkts} pkts ${r.join.first}..${r.join.last} steps ${r.join.steps} backwards ${r.join.backwards} maxGap ${r.join.maxGap} idsOk ${r.join.idsOk}`, '| pkts', JSON.stringify(r.segs.map((x) => x.pkts)), 'firstPts', JSON.stringify(r.firstPts));
}
const out = path.join(import.meta.dirname, '..', '..', '..', 'out', 'ff91'); fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(ev, null, 1));
fs.rmSync(dir, {recursive: true, force: true});
