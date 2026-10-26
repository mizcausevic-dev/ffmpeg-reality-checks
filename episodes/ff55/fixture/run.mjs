// Usage: node episodes/ff55/fixture/run.mjs [outdir]   (default: ./out/ff55)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff55');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`grid: ${ev.grid.num}/${ev.grid.den} fps, one frame is ${ev.grid.frameMs} ms, 300 frames last ${ev.grid.exactDurationSec} s\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(8)} ${r.command}`);
  console.log(`         timescale ${r.timescale} (ffprobe time_base ${r.probe.timeBase}), ${r.samples} samples, first ticks ${r.firstTicks.join(' ')}, first deltas ${r.firstDeltas.join(' ')}`);
  console.log(`         frame durations in ticks: ${Object.entries(r.deltas).map(([d, c]) => `${d} x${c}`).join(', ')}   ffprobe r_frame_rate ${r.probe.rFrameRate}, avg_frame_rate ${r.probe.avgFrameRate}`);
  console.log(`         max error vs own grid ${r.maxErrMs} ms (range ${r.errMin} to ${r.errMax}), vs 30000/1001 grid ${r.maxErrNtscMs} ms, last frame ${r.lastErrNtscMs} ms`);
  console.log(`         duration ${r.mdhdDurationSec} s (exact ${r.exactDurationSec}, off by ${r.durationErrUs} us), ffprobe stream ${r.probe.streamDuration}; model mismatches ${r.modelMismatch} (max ${r.modelMaxOff} tick), ties ${r.ties}, ties rounded up ${r.tiesAllRoundedUp}`);
  console.log(`         readers: ffprobe packet pts equal stts ${r.probeEqualsBox}, decoded frame pts equal stts ${r.decodeEqualsBox}, framemd5 ${r.framesMd5} frames (its times are frame numbers: ${r.framemd5IsFrameNumber}), ctts ${r.hasCtts}, elst ${r.hasElst}`);
}
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'ticks' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
