// Usage: node episodes/ff95/fixture/run.mjs [outdir]   (default: ./out/ff95)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, db} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff95');
fs.mkdirSync(dir, {recursive: true});
const ev = runExperiment();
console.log(ev.ffmpeg + '\n\nfade-in over 48000 samples of a constant 0.5; gain at 0, 25, 50, 75, 100 percent (sample 47999)');
for (const c of ev.curves) console.log(`${c.name.padEnd(6)} ${c.gains.map((g) => g.toFixed(4).padStart(7)).join(' ')}  mid ${db(c.gains[2]).toFixed(1).padStart(6)} dB  monotone ${c.monotone}  last ${c.last.toFixed(4)} after ${c.after.toFixed(4)}  formula max ${c.formulaMax === undefined ? 'none' : c.formulaMax.toExponential(1)}  astats vs Node ${Math.max(...c.rmsAstats.map((v, i) => Math.abs(v - db(c.rmsNode[i])))).toFixed(4)} dB`);
console.log('\ncontrol', ev.control, '\ntime arguments', ev.timeArgs, '\ncommand', ev.cmd);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
