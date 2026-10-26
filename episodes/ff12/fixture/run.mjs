// Usage: node episodes/ff12/fixture/run.mjs [outdir]   (default: ./out/ff12)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff12');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const row = (r) => Object.entries(r.seen).map(([k, v]) => `${k} ${v.ffprobe ? 'Y' : '-'}${v.bytes ? 'Y' : '-'}`).join('  ');
console.log(`source       ${row(ev.source)}`);
for (const [k, r] of Object.entries(ev.runs)) console.log(`${k.padEnd(12)} ${row(r)}   encoder tag: ${r.encoderTag}\n   ${r.command}`);
console.log('\n(each flag: first = ffprobe shows it, second = the bytes are in the file; Y yes, - no)');
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`Evidence written to ${path.join(dir, 'evidence.json')}`);
