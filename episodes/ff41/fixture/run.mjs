// Usage: node episodes/ff41/fixture/run.mjs [outdir]   (default: ./out/ff41)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, Q_RANGE} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff41');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source ${ev.source.size} PNG ${ev.source.pngBytes} bytes, self PSNR ffmpeg ${ev.source.selfPsnrFfmpeg} node ${ev.source.selfPsnrNode}\n`);
const f = (n) => (Number.isFinite(n) ? n.toFixed(2) : String(n));
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(9)} size fs ${String(r.sizeFs).padStart(6)} probe ${String(r.sizeProbe).padStart(6)}   PSNR ffmpeg ${f(r.psnrFfmpeg)} node ${f(r.psnrNode)} dB   quant step ${r.dqt?.ac1}   pix ${r.pixMd5.slice(0, 8)} framemd5 ${String(r.frameMd5).slice(0, 8)}   ${r.command}`);
}
const R = ev.runs, ratio = (a, b) => (R[`q${a}`].sizeFs / R[`q${b}`].sizeFs).toFixed(2);
console.log(`\nsize ratios: q2/q5 ${ratio(2, 5)}  q5/q10 ${ratio(5, 10)}  q10/q31 ${ratio(10, 31)}  q2/q31 ${ratio(2, 31)}`);
console.log(`q1 file equals q2 file: ${R.q1.fileMd5 === R.q2.fileMd5}; qscale5 equals q5: ${R.qscale5.fileMd5 === R.q5.fileMd5}; q5 twice equal: ${R.q5again.fileMd5 === R.q5.fileMd5}`);
console.log(`sizes q1..q31: ${Q_RANGE.map((q) => R[`q${q}`].sizeFs).join(' ')}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
