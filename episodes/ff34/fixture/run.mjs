// Usage: node episodes/ff34/fixture/run.mjs [outdir]   (default: ./out/ff34)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff34');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.pngs} PNGs, ${ev.source.frames} frames read, ${ev.source.unique} unique\n`);
const show = (k, r) => {
  const ids = r.byMd5.slice(0, 12).join(',') + (r.byMd5.length > 12 ? ',...' : '');
  console.log(`${k.padEnd(8)} ${r.command}`);
  console.log(`         ffprobe: ${r.ffprobe.packets} packets, ends ${r.ffprobe.end} s, container ${r.ffprobe.container} s, r_frame_rate ${r.ffprobe.rFrameRate}, avg ${r.ffprobe.avgFrameRate}   decode: ${r.decode.frames} frames, ends ${r.decode.end} s`);
  console.log(`         distinct source frames ${r.kept}, duplicates ${r.dups}   ids: ${ids}   [codes agree: ${JSON.stringify(r.byMd5) === JSON.stringify(r.byCode)}]`);
};
for (const [k, r] of Object.entries(ev.runs)) show(k, r);
console.log(`lateDef  ${ev.lateDefault.command}\n         exit code ${ev.lateDefault.exitCode}, output file written: ${ev.lateDefault.wroteFile}`);
show('lateSet', ev.lateSet);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
