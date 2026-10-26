// Usage: node episodes/ff35/fixture/run.mjs [outdir]   (default: ./out/ff35)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff35');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.frames} frames, ${ev.source.seconds} s at ${ev.source.fps} fps, GOP ${ev.source.gopFrames} frames, keyframes at ${ev.source.keyframes.join(', ')} s\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(9)} ${r.command}`);
  console.log(`          asked ${r.asked} s, got ${r.segments} segments   playlist EXTINF ${r.extinf.join(' ')}   TARGETDURATION ${r.target}`);
  console.log(`          ffprobe packets ${r.packetDur.join(' ')}   decoded ${r.decodedDur.join(' ')}   cuts at ${r.cuts.join(' ')}`);
  console.log(`          frames ${r.packetsTotal} packets / ${r.decodedTotal} decoded of ${ev.source.frames}   start on keyframe: ${r.keyStart.filter(Boolean).length} of ${r.segments}   predicted cuts ${r.predicted ? r.predicted.join(' ') : 'n/a'}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
