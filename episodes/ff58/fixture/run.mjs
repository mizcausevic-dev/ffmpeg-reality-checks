// Usage: node episodes/ff58/fixture/run.mjs [outdir]   (default: ./out/ff58)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff58');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const s = ev.source;
console.log(`source: ${s.frames} frames (${s.frames / 25} s), ${s.distinct} distinct, keyframes at ${s.keyframes.join(', ')} s, ${s.bFrames} B-frames, luma rule (frame N = 16 + 2 N): ${s.lumaRule}\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(16)} ${r.command}`);
  console.log(`    asked from frame ${r.requestedFrom}; cut has ${r.frames} frames (source ${r.firstSrc} to ${r.lastSrc}), ${r.packets} packets stored; first frame at ${r.firstFrame} s`);
  console.log(`    leading frames not asked for: ${r.leading}; asked frames missing: ${r.missing}; readers agree on every frame: ${JSON.stringify(r.bySrcHash) === JSON.stringify(r.bySrcRaw)}`);
  console.log(`    ${r.mp4 ? `mp4 edit list: ${JSON.stringify(r.mp4.edits)} (skips ${r.mp4.skipSeconds} s, empty lead ${r.mp4.leadSeconds} s)` : `mkv first block at ${r.mkvFirst} s`}; repeats of the first frame when decoded at constant rate: ${r.frozenOnCfr}`);
}
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'bySrcHash' || k === 'bySrcRaw' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
