// Usage: node episodes/ff59/fixture/run.mjs [outdir]   (default: ./out/ff59)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff59');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`clip A: ${ev.clips.frames} frames, I-frames at ${ev.clips.A.iFrames.join(', ')}; clip B: I-frames at ${ev.clips.B.iFrames.join(', ')}; ${ev.clips.A.distinct} and ${ev.clips.B.distinct} distinct frames\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(13)} ${r.command}`);
  console.log(`              ${r.frames} ${r.out === 'png' ? 'files' : 'frames'} (framemd5: ${r.framesMd5}), ${r.distinct} different, ${r.dupFrames} duplicates; ffmpeg dup=${r.statsDup} drop=${r.statsDrop}; only keyframes: ${r.onlyKeyframes}${r.durationS ? `; duration ${r.durationS} s` : ''}`);
  console.log(`              runs of the same frame: ${r.runs.length > 8 ? `${r.runs.length} runs` : r.runs.map((x) => `${x.src}x${x.count}`).join(' ')}; readers agree on every frame: ${JSON.stringify(r.bySrcFiles) === JSON.stringify(r.bySrcMd5)}`);
}
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'bySrcFiles' || k === 'bySrcMd5' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
