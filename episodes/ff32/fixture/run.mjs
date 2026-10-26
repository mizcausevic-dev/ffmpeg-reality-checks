// Usage: node episodes/ff32/fixture/run.mjs [outdir]   (default: ./out/ff32)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff32');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const s = ev.source;
console.log(`source: ${s.frames} frames (${s.unique} unique), ${s.seconds} s, ${s.fps} fps. keyframes: ffv1 ${s.keyframes.ffv1}, g100 at frames ${s.keyframes.g100.join(',')}, g10 ${s.keyframes.g10.length} of them. lossless md5 same as ffv1: ${JSON.stringify(s.md5Same)}`);
console.log(`av.mkv: container ${s.av.container} s, picture ${s.av.picture} s, audio ${s.av.audio} s\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(13)} ${r.command}`);
  console.log(`              ${r.frames} frames, source frames ${r.first}..${r.last}${r.contiguous ? '' : ' (gaps)'}   picture ${r.packetSeconds} s (decoded ${r.decodedSeconds} s)   audio ${r.audioSeconds} s   container ${r.container} s   [codes agree: ${JSON.stringify(r.byMd5) === JSON.stringify(r.byCode)}]`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
