// Usage: node episodes/ff85/fixture/run.mjs [outdir]   (default: ./out/ff85)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, MODES} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff85');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`control 10 bit to 10 bit: ${ev.control.distinct} distinct levels, ${ev.control.mismatches} mismatches\n`);
for (const [m, r] of Object.entries(ev.modes)) {
  console.log(`${m.padEnd(9)} ${MODES[m].say.padEnd(24)} distinct ${r.distinct}, mean run ${r.meanRun.toFixed(2)} px, max run ${r.maxRun}, bias ${r.bias.toFixed(3)}, max err ${r.maxErr.toFixed(2)}, rms ${r.rms.toFixed(3)}, 2x2 block err ${r.blockMaxErr.toFixed(3)} (Node) ${r.blockMaxErrFfmpeg.toFixed(3)} (ffmpeg), md5 ${r.md5.slice(0, 8)}`);
}
console.log('\nyuv420p output classes (Node md5):', JSON.stringify(ev.classes));
console.log('yuv420p output classes (ffmpeg framemd5):', JSON.stringify(ev.classesFfmpeg));
console.log('\nfull ramp (1024 input levels):', JSON.stringify(ev.full));
console.log('\nrgb8 classes (Node):', JSON.stringify(ev.rgb8Classes), '\nrgb8 classes (ffmpeg):', JSON.stringify(ev.rgb8ClassesFfmpeg));
console.log('\ntiles:', JSON.stringify(ev.tiles));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
