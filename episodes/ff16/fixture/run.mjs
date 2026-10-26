// Usage: node episodes/ff16/fixture/run.mjs [outdir]   (default: ./out/ff16)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff16');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: 60 frames, 30 fps, 2.0 s | mp4 declared ${ev.source.mp4.declared.duration}s ${ev.source.mp4.declared.fps} fps`);
for (const [k, r] of Object.entries(ev.runs)) console.log(`${k.padEnd(12)} declared ${r.declared.duration}s ${r.declared.fps} fps | inside: ${r.inside.packets} packets, ${r.inside.framesDecoded} frames decoded, gap ${r.inside.packetGap}s\n   ${r.command}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
