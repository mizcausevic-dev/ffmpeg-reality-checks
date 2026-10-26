// Usage: node episodes/ff14/fixture/run.mjs [outdir]   (default: ./out/ff14)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff14');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [s, d] of Object.entries(ev.sources)) {
  console.log(`${s}: source uses ${d.sourceColors} colors; control psnr (source vs itself) ${d.control.psnr}`);
  for (const [v, r] of Object.entries(d.variants)) console.log(`  ${v.padEnd(9)} ${String(r.bytes).padStart(7)} B  psnr ${r.psnr.toFixed(2)}  ssim ${r.ssim.toFixed(4)}  colors ${r.colors}\n     ${r.command}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
