// Usage: node episodes/ff88/fixture/run.mjs [outdir]   (default: ./out/ff88)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runExperiment, SIMS, BLENDS, key, PROBES, KEYS, FILTERS} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const outDir = path.resolve(process.argv[2] ?? 'out/ff88');
fs.mkdirSync(outDir, {recursive: true});
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff88-'));
const ev = runExperiment(work);
console.log(ev.ffmpeg.split('\n')[0]);
console.log(`runs ${ev.agree.runs} (4 filters x ${BLENDS.length} blends x ${SIMS.length} similarities), raw alpha and PNG alpha differ in ${ev.agree.mismatches}`);
console.log(`key colour 0x14B43C: pixel U,V after the converter ${ev.keyYuv.u},${ev.keyYuv.v}; the key as the filter sees it (full range conversion) ${ev.keyFull.join(',')}\n`);
console.log('exact key test (a flat card of exactly the key colour): alpha at sim 0.00001 blend 1 (= 255 x distance)');
for (const k of ev.keys) console.log(`${k.id.padEnd(8)} ${k.hex} pixel UV ${k.pixelUV.join(',').padEnd(8)} key UV ${k.keyFullUV.join(',').padEnd(8)} colorkey ${k.colorTiny} chromakey ${k.chromaTiny} (model ${k.modelAlpha}) chromakey yuv=1 ${k.yuvTiny} | chromakey at sim 0.01/0.03/0.05/0.1 blend 0: ${k.chromaAt.join('/')}`);
console.log('\nflat key card, blend 0: alpha at each similarity');
for (const f of Object.keys(FILTERS)) console.log(f.padEnd(10), SIMS.map((s) => ev.runs[key(f, s, 0)].flat.at).join(' '));
for (const f of Object.keys(FILTERS)) {
  console.log(`\n${f}, blend 0: soft edge card (1628 edge pixels): kept, fringe, levels | noisy card: specks left, lime lost, orange lost`);
  for (const s of SIMS) { const r = ev.runs[key(f, s, 0)]; console.log(`  sim ${String(s).padEnd(6)} edge kept ${String(r.soft.edgeKept).padStart(4)} fringe ${String(r.soft.fringe).padStart(4)} levels ${String(r.soft.levels).padStart(3)} | specks ${String(r.noisy.bgOpaque).padStart(4)} lime lost ${String(r.noisy.limeLost).padStart(3)} orange lost ${String(r.noisy.orangeLost).padStart(3)}`); }
}
const { cards, yuv, lab, ...evidence } = ev;
fs.writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2));
fs.rmSync(work, {recursive: true, force: true});
console.log(`\nEvidence written to ${path.join(outDir, 'evidence.json')}`);
