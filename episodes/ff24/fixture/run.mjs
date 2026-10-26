// Usage: node episodes/ff24/fixture/run.mjs [outdir]   (default: ./out/ff24)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff24');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `\nsource: ${ev.source.probe.length} chapters ${JSON.stringify(ev.source.probe.map((c) => c.title))}\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(16)} ffprobe: ${r.probe.length} chapters ${JSON.stringify(r.probe.map((c) => c.title))} | ffmetadata: ${r.exported.count} ${JSON.stringify(r.exported.titles)} global ${JSON.stringify(r.exported.globalTitle)} | bytes: ${JSON.stringify(r.scan)}\n   ${r.command}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
