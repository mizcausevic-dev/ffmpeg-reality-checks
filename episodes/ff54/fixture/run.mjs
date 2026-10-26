// Usage: node episodes/ff54/fixture/run.mjs [outdir]   (default: ./out/ff54)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff54');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.frames} frames (${ev.source.seconds} s), every frame flat luma 200: ${ev.source.allFull && ev.source.flat}`);
console.log(`cut: source second ${ev.cut.seek} to ${ev.cut.seek + ev.cut.seconds} (${ev.cut.frames} frames), fade one second (${ev.cut.fadeFrames} frames), black is luma 16\n`);
const runText = (r) => r.runs.map((x) => `${x.kind} ${x.from}..${x.to}`).join(' | ');
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(11)} ${r.command}`);
  console.log(`            ${r.framesMd5} frames (raw ${r.frames}, signalstats ${r.framesStats}, packets ${r.packets}), first pts ${r.firstPtsProbe} s (md5 reader ${r.firstPtsMd5}), step ${r.stepMin}..${r.stepMax} s`);
  console.log(`            frames not at full luma: ${r.notFull} (ramp ${r.ramp}, black ${r.black}), luma ${r.minLuma} to ${r.maxLuma}, last ${r.lastLuma}, unique hashes ${r.uniqueMd5}`);
  console.log(`            runs: ${runText(r)}`);
}
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'md5' || k === 'luma' || k === 'lumaStats' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
