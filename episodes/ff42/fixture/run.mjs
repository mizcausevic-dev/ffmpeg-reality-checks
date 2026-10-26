// Usage: node episodes/ff42/fixture/run.mjs [outdir]   (default: ./out/ff42)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff42');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, f] of Object.entries(ev.flags)) console.log(`flags ${k.padEnd(9)} field_order=${f.fieldOrder} frame interlaced_frame=${f.frameFlag ? [...new Set(f.frameFlag)].join('/') : 'n/a'}`);
console.log(`mislabel pixels equal fine: ${ev.mislabelSamePixels}\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(15)} ${r.command}`);
  console.log(`                frames ${r.frames} (md5 ${r.framesMd5})  changed: luma ${r.changedLuma} md5 ${r.changedMd5}  mean changed pixels ${r.diffPx}  pts first ${r.pts.first} step ${r.pts.step}`);
  const g = r.regions;
  console.log(`                row energy stripes ${g.stripes.rowEnergy} move ${g.move.rowEnergy} lines ${g.lines.rowEnergy}  psnr min stripes ${g.stripes.psnrMin} move ${g.move.psnrMin} lines ${g.lines.psnrMin} whole ${g.whole.psnrMin}`);
  console.log(`                two-apart stripes ${g.stripes.twoApart}  comb ratio box ${g.box.comb} stripes ${g.stripes.comb}   idet multi tff ${r.idet.multi.tff} bff ${r.idet.multi.bff} prog ${r.idet.multi.progressive} undet ${r.idet.multi.undetermined}`);
}
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'md5s' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
