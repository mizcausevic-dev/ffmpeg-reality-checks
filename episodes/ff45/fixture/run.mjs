// Usage: node episodes/ff45/fixture/run.mjs [outdir]   (default: ./out/ff45)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff45');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.frames} frames, markers are indexes: ${ev.source.markersAreIndexes}, audio ${ev.source.audioSeconds} s, tone-clock reads ${ev.source.audioAt0} / ${ev.source.audioAt1} / ${ev.source.audioAt2} s at 0 / 1 / 2 s`);
console.log(`cut: source frames ${ev.cut.start * 25}..${ev.cut.end * 25 - 1}, audio ${ev.cut.start} s to ${ev.cut.end} s (${ev.cut.frames} frames)\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  const v = r.video, a = r.audio;
  console.log(`${k.padEnd(12)} ${r.command}`);
  console.log(`             video: ${v.framesMd5} frames (raw ${v.framesRaw}, packets ${v.packets}), repeats ${v.repeatsMd5} (raw ${v.repeatsRaw}), longest run ${v.longestRunMd5}, markers ${v.firstMarker}..${v.lastMarker}, first pts ${v.firstPtsProbe} (md5 reader ${v.firstPtsMd5}), ends ${v.endTime} s`);
  console.log(`             audio: ${a.samples} samples (${a.seconds} s), first sample is source ${a.firstSourceTime} s, packets ${a.firstPtsProbe} to ${a.endProbe} s   audio late by ${r.audioLate} s`);
}
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'md5' || k === 'markers' || k === 'srcMd5' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
