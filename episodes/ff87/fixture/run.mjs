// Usage: node episodes/ff87/fixture/run.mjs [outdir]   (default: ./out/ff87)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff87');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, e] of Object.entries(ev.err)) console.log(`${k.padEnd(8)} ${e.say}: status ${e.status} (null run ${e.status2}), "${e.line}", output file ${e.outputExists ? 'exists' : 'missing'}`);
console.log('');
for (const [k, g] of Object.entries(ev.geo)) {
  if (!g.probe) { console.log(`${k.padEnd(12)} ${g.say}: status ${g.status} ${g.stderr.slice(0, 2).join(' | ')}`); continue; }
  console.log(`${k.padEnd(12)} ${g.say}: ${g.probe.w}x${g.probe.h}, ${g.probe.frames} frames, boxes ${g.boxes.map((b) => `${b.w}x${b.h}@${b.x},${b.y}`).join(' ')}, black ${g.black}, cropdetect ${g.crop ? `${g.crop.w}x${g.crop.h}@${g.crop.x},${g.crop.y}` : 'none'}`);
}
console.log('');
for (const [k, g] of Object.entries(ev.len)) {
  if (!g.probe) { console.log(`${k.padEnd(11)} ${g.say}: status ${g.status} ${g.stderr.slice(0, 2).join(' | ')}`); continue; }
  console.log(`${k.padEnd(11)} ${g.say}: ${g.probe.w}x${g.probe.h}, ${g.probe.frames} frames (Node ${g.nodeFrames}, framemd5 ${g.md5Ffmpeg.length}), duration ${g.probe.duration}, A luma ${g.lumaA[0]}..${g.lumaA[g.lumaA.length - 1]} (frame 49: ${g.lumaA[49]}, 50: ${g.lumaA[50]}), B luma ${g.lumaB[0]}..${g.lumaB[g.lumaB.length - 1]}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
