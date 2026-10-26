// Usage: node episodes/ff05/fixture/run.mjs [outdir]   (default: ./out/ff05)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff05');
const ev = runExperiment(dir);
const s = ev.source;
console.log(ev.ffmpeg);
console.log(`\nSource: ${s.frames} frames over ${s.duration}s, r_frame_rate ${s.rFrameRate}, avg_frame_rate ${s.avgFrameRate} (${s.avgFps} fps), ${s.distinctGapsMs.length} distinct gaps (ms): ${s.distinctGapsMs.join(' ')}`);
console.log('\nvariant      frames  dur     r_frame_rate  avg fps  gaps  unique  dup(counter)  dup(md5)  drop');
for (const [k, v] of Object.entries(ev.variants)) console.log(`${k.padEnd(12)} ${String(v.frames).padEnd(7)} ${String(v.duration).padEnd(7)} ${v.rFrameRate.padEnd(13)} ${String(v.avgFps).padEnd(8)} ${String(v.distinctGapsMs.length).padEnd(5)} ${String(v.uniqueFrames).padEnd(7)} ${String(v.duplicatesByCounter).padEnd(13)} ${String(v.duplicatesByMd5).padEnd(9)} ${v.dropsByCounter}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
