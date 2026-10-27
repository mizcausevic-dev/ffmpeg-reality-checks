// Runs the ff90 experiment, prints the tables and writes out/ff90/evidence.json (relative to the working directory unless a directory is given).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runExperiment, SWEEP} from './experiment.mjs';

const outDir = path.resolve(process.argv[2] ?? 'out/ff90');
fs.mkdirSync(outDir, {recursive: true});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff90-'));
const t0 = Date.now();
const ev = runExperiment(tmp);
console.log(ev.ffmpeg, `(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
for (const [c, v] of Object.entries(ev.clip)) console.log(`clip ${c}: start ${v.fmtStart}/${v.streamStart} ${v.n} packets ${v.first}..${v.last}, ${v.ids} frames from ${v.firstId}, shown ${v.shownFirst}`);
console.log('\ncontainer | cut | flags | mode: format start | first pkt | first/last frame (n) | shown first | shift');
for (const [k, r] of Object.entries(ev.cells)) {
  if (r.status !== 0) { console.log(k, 'FAILED', r.err); continue; }
  console.log(`${k.padEnd(26)} start ${String(r.fmtStart).padEnd(5)} pkt ${String(r.pkts.first).padEnd(5)} (${String(r.pkts.n).padStart(3)}) | frames ${String(r.frames.first).padStart(3)}..${String(r.frames.last).padStart(3)} (${String(r.frames.n).padStart(3)}) | shown ${String(r.shownFirst).padEnd(5)} | shift ${r.shift}`);
}
console.log('\ninput seek sweep: first frame (frames) for -ss', SWEEP.join(', '));
for (const [k, v] of Object.entries(ev.sweep)) console.log(k.padEnd(10), v.map((x) => `${x.firstId}(${x.n})`).join('  '));
fs.writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(ev, (k, v) => (k === 'list' ? undefined : v), 2));
fs.rmSync(tmp, {recursive: true, force: true});
console.log(`\nEvidence written to ${path.join(outDir, 'evidence.json')}`);
