// Usage: node episodes/ff39/fixture/run.mjs [outdir]   (default: ./out/ff39)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, FLAGS, BG, LINE, NLINES} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff39');
const ev = runExperiment(dir);
const pad = (s, n) => String(s).padEnd(n);
console.log(ev.ffmpeg + '\n');
console.log(`Thin lines: 312x24 card, background ${BG}, ${NLINES} lines of luma ${LINE}, 1 px wide, scale=104:8:flags=X (3x down). Phase = source column mod 3.`);
console.log(`${pad('flags', 10)}${pad('vanished', 10)}${pad('peak ph0', 10)}${pad('peak ph1', 10)}${pad('peak ph2', 10)}${pad('lowest', 8)}${pad('mean', 9)} psnr vs box mean`);
for (const fl of FLAGS) {
  const l = ev.lines[fl];
  console.log(`${pad(fl, 10)}${pad(l.vanished + ' of ' + NLINES, 10)}${pad(l.byPhase[0].peaks[0], 10)}${pad(l.byPhase[1].peaks[0], 10)}${pad(l.byPhase[2].peaks[0], 10)}${pad(l.minOfAll, 8)}${pad(l.mean.toFixed(3), 9)} ${ev.psnrVsBox[fl] === Infinity ? 'inf' : ev.psnrVsBox[fl].toFixed(2) + ' dB'}`);
}
console.log(`input mean ${ev.inputMean.toFixed(3)}; default scale equals flags=bicubic (same bytes): ${ev.defaults.lines.sameBytes}`);
console.log('\nOne output row across a line (phase 0, 1, 2):');
for (const fl of FLAGS) console.log(`${pad(fl, 10)}${[0, 1, 2].map((p) => ev.lines[fl].byPhase[p].row.join(' ').padEnd(22)).join('')}`);
console.log('\nReader 2, signalstats on a cropped window (YMIN YMAX YAVG) vs Node on the same window:');
for (const fl of FLAGS) console.log(`${pad(fl, 10)}${ev.readers[fl].map((r) => `${r.signalstats.ymin}/${r.signalstats.ymax}/${r.signalstats.yavg}  vs ${r.node.min}/${r.node.peak}/${r.node.mean}`.padEnd(46)).join('')}`);
console.log('\nStripes 0/255 at 2x down (phase 0, then shifted one column): min..max of the output');
for (const fl of FLAGS) console.log(`${pad(fl, 10)}${[0, 1].map((p) => { const s = ev.stripes[p][fl]; return `${s.min}..${s.max} (mean ${s.mean.toFixed(1)})`.padEnd(26); }).join('')}`);
console.log('\nStep edge 60 to 200, 3x down: undershoot / overshoot in levels');
for (const fl of FLAGS) console.log(`${pad(fl, 10)}${ev.step[fl].undershoot} / ${ev.step[fl].overshoot}`);
console.log('\nDiagonal x - y = d, 3x down: peak and summed excess over background (input excess ' + ev.diag[0].inputExcess.toFixed(1) + ')');
for (const fl of FLAGS) console.log(`${pad(fl, 10)}${[0, 1, 2].map((d) => `${ev.diag[d][fl].peak} / ${ev.diag[d][fl].excess}`.padEnd(14)).join('')}`);
console.log('\nControl, flags=area on a pseudo-random card vs exact block means from Node:');
for (const [f, c] of Object.entries(ev.control.factors)) console.log(`  ${f}x: max difference ${c.maxdiff} levels, identical ${c.identical}, psnr ${c.psnr === Infinity ? 'inf' : c.psnr.toFixed(2) + ' dB'}, YAVG ${c.signalstatsYavg} vs ${c.refYavg.toFixed(3)}`);
console.log(`  line card, area vs box mean: max difference ${ev.areaBoxMaxDiff}, identical ${ev.areaIsBox}`);
console.log('  3x, other flags on the same card: ' + FLAGS.map((fl) => `${fl} ${ev.control.others[fl].maxdiff}`).join(', '));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, (k, v) => (v === Infinity ? 'inf' : v), 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
