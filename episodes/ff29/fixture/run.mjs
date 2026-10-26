// Usage: node episodes/ff29/fixture/run.mjs [outdir]   (default: ./out/ff29)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff29');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.frames} frames (${ev.source.unique} unique), ${ev.source.seconds} s, ${ev.source.fps} fps, ${ev.source.sineHz} Hz sine\n`);
const show = (k, r) => {
  const kept = r.byMd5.slice(0, 12).join(',') + (r.byMd5.length > 12 ? ',...' : '');
  console.log(`${k.padEnd(8)} ${r.command ?? 'control source'}`);
  console.log(`         video ${r.video.endPackets} s (decoded ${r.video.endDecoded} s), ${r.video.framesDecoded} frames   audio ${r.audio.endPackets} s (decoded ${r.audio.endDecoded} s)   container ${r.container} s`);
  console.log(`         pitch goertzel ${r.pitch.goertzel} Hz, zero crossings ${r.pitch.zeroCross} Hz   frames kept: ${kept}   [codes agree: ${JSON.stringify(r.byMd5) === JSON.stringify(r.byCode)}]`);
};
show('source', ev.source.read);
for (const [k, r] of Object.entries(ev.runs)) show(k, r);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
