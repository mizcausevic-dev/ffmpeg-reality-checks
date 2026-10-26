// Usage: node episodes/ff13/fixture/run.mjs [outdir]   (default: ./out/ff13)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff13');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const row = (r) => `stored ${r.stored.size} tag ${r.stored.rotation ?? 'none'} | shown ${r.shown.size} -> ${r.shown.orientation ?? 'unknown'}`;
console.log(`control (no tag) ${row(ev.controls.unrotated)}`);
console.log(`source           ${row(ev.source)}`);
for (const [k, r] of Object.entries(ev.runs)) console.log(`${k.padEnd(16)} ${row(r)}\n   ${r.command}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
