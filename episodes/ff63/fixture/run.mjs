// Usage: node episodes/ff63/fixture/run.mjs [outdir]   (default: ./out/ff63)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff63');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const c = ev.clips;
console.log(`base: ${c.baseFrames} frames (${c.baseSeconds} s), luma 16+n, cb 96; overlay: ${c.overlayFrames} frames (${c.overlaySeconds} s), luma 186+m, cb 200`);
console.log(`rules hold: base ${c.baseRule}, overlay ${c.overlayRule}; distinct hashes: overlay ${c.distinctOverlay}, base ${c.distinctBase}, shared ${c.shared}\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  const s = r.s;
  console.log(`${k.padEnd(9)} ${r.command}`);
  console.log(`          ${r.framesRaw} frames (md5 ${r.framesMd5}, ffprobe ${r.framesProbe}) = ${r.seconds} s (ffprobe duration ${r.probeDuration}); overlay visible in ${s.nOv} frames, base only in ${s.nBaseOnly}, unknown ${s.unknown}`);
  console.log(`          runs: ${r.runs.map((x) => `${x.label} ${x.from}..${x.to}`).join(' | ')}`);
  console.log(`          overlay first at output ${s.firstOv}, last at ${s.lastOv}; last overlay counter shown: ${s.lastId} (on ${s.lastIdCount} frames); base-only from output ${s.firstBaseOnly}; base keeps playing: ${r.baseKeepsPlaying}; picture outside the rectangle always base frame i: ${r.outsideOk}`);
  console.log(`          readers agree on every frame: ${r.agree}`);
}
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'byHash' || k === 'byPlanes' || k === 'base' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
