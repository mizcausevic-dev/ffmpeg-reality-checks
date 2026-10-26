// Usage: node episodes/ff03/fixture/run.mjs [outdir]   (default: ./out/ff03)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff03');
const ev = await runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const [k, f] of Object.entries(ev.files)) console.log(`${k.padEnd(10)} ${f.order.join(', ').padEnd(24)} moov at byte ${f.moovOffset} (${f.moovSize} B) of ${f.bytes}; ${f.frames} frames, ${f.duration}s`);
console.log('\nffprobe reading the file over loopback HTTP');
for (const [k, h] of Object.entries(ev.http)) for (const [mode, r] of Object.entries(h)) console.log(`${k.padEnd(10)} ${mode.padEnd(10)} exit ${r.exit}  duration ${r.duration}  server sent ${r.bytesServed} of ${r.fileBytes} bytes in ${r.requests} request(s)`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
