// Usage: node episodes/ff70/fixture/run.mjs [outdir]   (default: ./out/ff70)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff70');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const c = ev.controls;
console.log(`control identity: ${c.identity.out.join('x')} nonfill ${c.identity.nonfill} area(ffmpeg) ${c.identity.ff.area} markers ${JSON.stringify(c.identity.markers)}`);
console.log(`known positive pad: nonfill ${c.pad.nonfill} of ${c.pad.out[0] * c.pad.out[1]} (black ${c.padBlack}), area(ffmpeg) ${c.pad.ff.area}; crop: markers ${JSON.stringify(c.crop.markers)}\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  if (r.mode === 'b' && r.size === 'big') continue;
  console.log(`${k.padEnd(14)} ${r.vf.padEnd(70)} out ${r.out.join('x').padEnd(8)} formula ${r.formula.w}x${r.formula.h} nonfill ${String(r.nonfill).padEnd(6)} lost ${String(r.lost).padEnd(6)} bbox ${r.bbox.w}x${r.bbox.h} touches ${Object.entries(r.touches).filter(([, v]) => v).map(([k2]) => k2).join(',') || '-'} markers ${JSON.stringify(r.markers)}${r.ff ? ` ffArea ${r.ff.area}` : ''}`);
}
console.log('\nsweep 45 (nearest):'); for (const s of ev.sweep45) console.log(`  ${s.n}x${s.n} nonfill ${s.nonfill} lost ${s.lost} markers ${JSON.stringify(s.markers)}`);
console.log('\nfill:', JSON.stringify(ev.fill));
console.log('\nencode odd:', JSON.stringify(ev.encode.odd)); console.log('encode even:', JSON.stringify({...ev.encode.even, measure: undefined}), JSON.stringify(ev.encode.even.measure.markers));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
