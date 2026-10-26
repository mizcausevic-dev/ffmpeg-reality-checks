// Usage: node episodes/ff33/fixture/run.mjs [outdir]   (default: ./out/ff33)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff33');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `   (build ${ev.build})\n`);
console.log(`source: ${ev.source.frames} frames (${ev.source.unique} unique), ${ev.source.seconds} s picture at ${ev.source.fps} fps; audio ramp lengths ${JSON.stringify(ev.source.audioSeconds)} s\n`);
const show = (k, r) => {
  console.log(`${k.padEnd(18)} ${r.command ?? ''}`);
  console.log(`  picture ${r.video.framesDecoded} frames, ends ${r.video.endPackets} s (decoded ${r.video.endDecoded} s), plays start at code ${JSON.stringify(r.video.missingAtStart)}, time gaps ${JSON.stringify(r.video.gaps)}`);
  if (r.audio) console.log(`  audio ${r.audio.samples} samples = ${r.audio.endDecoded} s, packet timeline ends ${r.audio.endPackets} s, ${r.audio.runsCount} ramp runs, packet gaps ${JSON.stringify(r.audio.gaps)}, container ${r.container} s`);
  if (r.sync && r.audio.runsCount < 20) console.log(`  sound minus picture at each play start (ms): ${JSON.stringify(r.sync.offsetMs)}   [codes agree: ${JSON.stringify(r.byMd5) === JSON.stringify(r.byCode)}]`);
};
for (const [k, r] of Object.entries(ev.reads)) show('source ' + k, r);
for (const [k, r] of Object.entries(ev.runs)) show(k, r);
for (const [k, r] of Object.entries(ev.controls)) show('control ' + k, r);
const {srcMd5, ...slim} = ev;
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
