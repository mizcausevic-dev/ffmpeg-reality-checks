// Usage: node episodes/ff84/fixture/run.mjs [outdir]   (default: ./out/ff84)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, FREQS} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff84');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`control (no codec): cutoff ${ev.control.c1.cutoff} Hz (Node), ${ev.control.c2.cutoff} Hz (ffmpeg)\n`);
for (const r of Object.values(ev.runs)) {
  console.log(`${r.name.padEnd(10)} ${r.command}`);
  console.log(`           ${r.kbps.toFixed(1)} kbit/s actual; cutoff ${r.c1.cutoff} Hz (Node) ${r.c2.cutoff} Hz (ffmpeg); first failing tone ${r.c1.firstFail} Hz at ${r.c1.dropAtFail?.toFixed(1)} dB, next ${r.c1.nextDrop?.toFixed(1)} dB; worst level 1 kHz above: ${r.c1.worstAbove?.toFixed(1)} dB; tones above passing: ${r.c1.highestAny !== r.c1.cutoff}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
