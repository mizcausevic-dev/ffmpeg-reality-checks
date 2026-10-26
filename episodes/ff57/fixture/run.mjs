// Usage: node episodes/ff57/fixture/run.mjs [outdir]   (default: ./out/ff57)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff57');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const c = ev.clips;
console.log(`clip A: ${c.frames} frames (${c.seconds} s), luma ${c.aLuma[0]} to ${c.aLuma[1]}, cb ${c.aCb}; clip B: ${c.framesB} frames, luma ${c.bLuma[0]} to ${c.bLuma[1]}, cb ${c.bCb}`);
console.log(`every frame flat: ${c.allFlat}; luma rule holds (A 16+n, B 235-n): ${c.lumaRule}; distinct hashes A ${c.distinctA}, B ${c.distinctB}, shared ${c.overlap}\n`);
const runText = (r) => r.runs.map((x) => `${x.clip} ${x.from}..${x.to}`).join(' | ');
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(7)} ${r.command}`);
  console.log(`        ${r.framesMd5} frames (raw ${r.framesRaw}) = ${r.seconds} s; pure A ${r.nA}, blended ${r.nMix}, pure B ${r.nB}; clip A frames never shown: ${r.aLost} (${r.aLost / 25} s)`);
  console.log(`        runs (hash reader): ${runText(r)}`);
  console.log(`        readers agree on every frame (clip and frame number): ${JSON.stringify(r.byHash) === JSON.stringify(r.byPlanes)}`);
  if (r.nMix) console.log(`        blend weight of B ${r.blend[0]} to ${r.blend[r.blend.length - 1]}, rises: ${r.blendRises}; luma off the model by at most ${r.modelDevY}, weight by at most ${r.modelDevP}`);
  if (r.nB) console.log(`        first pure B frame: output ${r.firstB} (${r.firstB / 25} s) is clip B frame ${r.firstBn}; last frame is clip ${r.lastClip} frame ${r.lastN}`);
}
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'byHash' || k === 'byPlanes' || k === 'blend' || k === 'mixY' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
