// Usage: node episodes/fl07/fixture/run.mjs [outdir]   (default: ./out/fl07)
// Measures libsvtav1 vs libaom-av1: -crf, -crf 0, -b:v 0 / -b:v, presets, keyframes, seeking. Prints a summary and writes evidence.json.
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/fl07');
const t0 = Date.now();
const ev = runExperiment(dir);
ev.seconds = Math.round((Date.now() - t0) / 100) / 10;
console.log(`${ev.ffmpeg}   (${ev.build}, ${ev.platform})\nlibsvtav1 ${ev.libs.svtav1}, libaom ${ev.libs.aom}\n`);
const f = (x, d = 3) => (x === null || x === undefined ? 'inf' : x.toFixed(d));
for (const [k, r] of Object.entries(ev.cases)) {
  if (r.failed) { console.log(`${k.padEnd(26)} FAILED exit ${r.exit}  ${r.error}`); continue; }
  console.log(`${k.padEnd(26)} ${String(r.fileBytes).padStart(8)} B  ssim ${f(r.ffmpegSsimAll, 4)}  psnr ${f(r.ffmpegPsnrAvg, 2)} (ffmpeg) ${f(r.nodePsnrAvg, 2)} (node)  det ${r.deterministic} ${r.seconds}s  lossless ${r.lossless}${r.svt ? `  svt says ${r.svt.brcMode}/${r.svt.rateFactor}` : ''}`);
}
console.log('\nkeyframes and seeking (400 frames, 25 fps):');
for (const [k, r] of Object.entries(ev.long)) console.log(`${k.padEnd(18)} ${String(r.fileBytes).padStart(7)} B  ${r.seconds}s  keyframes ${r.keyframes.length} at ${r.keyframes.slice(0, 5).join(',')}${r.keyframes.length > 5 ? ',...' : ''} (${r.keyframeSeconds.slice(0, 3).join(', ')} s)  seek to frame ${r.seek.target}: lands ${r.seek.landProbe}, decode ${r.seek.framesToDecodeProbe} frames, correct frame ${r.seek.seekMd5Match}`);
console.log(`\nfixture time ${ev.seconds} s`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`Evidence written to ${path.join(dir, 'evidence.json')}`);
