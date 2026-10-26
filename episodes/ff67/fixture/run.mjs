// Usage: node episodes/ff67/fixture/run.mjs [outdir]   (default: ./out/ff67)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff67');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, s] of Object.entries(ev.sources)) console.log(`source ${k}: ${s.frames} frames, mean frame-to-frame luma change ${s.mad}, flat patch ${s.patchSpread.min}..${s.patchSpread.max} (${s.patchSpread.distinct} distinct), patch change 50 to 51: ${s.patchMad}`);
console.log('\nid         bytes    packets   I   P   B  x264 B   psnr y (filter / node)   psnr avg   vs n_def23');
const base = ev.runs.n_def23.bytes;
for (const r of Object.values(ev.runs)) {
  console.log(`${r.id.padEnd(10)} ${String(r.bytes).padStart(8)} ${String(r.packetBytes).padStart(8)}  ${String(r.types.I).padStart(2)} ${String(r.types.P).padStart(3)} ${String(r.types.B).padStart(3)}  ${String(r.x264.B).padStart(5)}   ${r.psnr.filterY.toFixed(3)} / ${r.psnr.nodeY.toFixed(3)}   ${r.psnr.filterAvg.toFixed(3)}   ${(r.bytes / base).toFixed(3)}x`);
}
console.log('\ncrf  zl bytes  def bytes  same-crf ratio  zl y     def y    def bytes at zl psnr  same-psnr ratio');
for (const e of ev.equal) console.log(`${String(e.crf).padStart(3)}  ${String(e.zlBytes).padStart(8)}  ${String(e.defBytes).padStart(9)}  ${String(e.sameCrfRatio).padStart(14)}  ${e.zlY.toFixed(3)}  ${e.defY.toFixed(3)}  ${String(e.defBytesAtZlPsnr).padStart(20)}  ${e.samePsnrRatio}`);
console.log('\nrepeat encodes:', JSON.stringify(ev.repeat));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
