// Usage: node episodes/fs05/fixture/run.mjs [outdir]   (default: ./out/fs05)
// Runs the fl05 evidence and writes it as the evidence for this short.
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/fs05');
const ev = await runExperiment(dir);
console.log(`${ev.ffmpeg}   [build: ${ev.build}]`);
for (const [k, c] of Object.entries(ev.composite.cases)) console.log(`${k.padEnd(12)} exit ${c.exit} ${c.wrote ? `${c.probe.profile} ${c.probe.pixFmt} ${c.probe.width}x${c.probe.height} ${c.probe.tag} ${c.order.join(',')}` : 'nothing written'}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`Evidence written to ${path.join(dir, 'evidence.json')}`);
