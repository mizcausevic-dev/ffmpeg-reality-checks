// Usage: node episodes/ff71/fixture/run.mjs [outdir]   (default: ./out/ff71)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff71');
const ev = runExperiment(dir);
const pick = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !['map', 'out', 'tv', 'pc', 'statsTv', 'statsPc'].includes(k))));
console.log(ev.ffmpeg + '\n');
console.log('range tags', JSON.stringify(ev.tags), 'control identity', JSON.stringify(ev.control));
console.log('\nbrightness grid (limited tagged levels file, Node reader):');
for (const [b, r] of Object.entries(ev.bright)) console.log(`  ${String(b).padEnd(6)} at0 ${String(r.at0).padEnd(4)} at16 ${String(r.at16).padEnd(4)} shift@100 ${String(r.shift100).padEnd(5)} first255 ${String(r.first255).padEnd(4)} merged ${r.mergedHigh}`);
console.log('\nstaircase (shift at level 100):', ev.stair.map((s) => `${s.b}:${s.shift100}${s.agree ? '' : '!'}`).join(' '));
console.log('\nheadline', ev.head.vf, 'tv==pc', ev.head.sameTvPc, 'agree', ev.head.agreeTv, ev.head.agreePc, pick(ev.head));
console.log('limited', JSON.stringify(ev.limited), 'chroma after', JSON.stringify(ev.chromaAfter));
console.log('known positive', pick(ev.positive));
for (const [k, r] of Object.entries(ev.other)) console.log(k, pick(r));
console.log('fix', pick(ev.fix));
console.log('ramp', JSON.stringify({...ev.ramp, out: undefined}));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
