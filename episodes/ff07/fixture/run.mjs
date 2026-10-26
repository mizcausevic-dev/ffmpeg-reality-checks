// Usage: node episodes/ff07/fixture/run.mjs [outdir]   (default: ./out/ff07)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff07');
const ev = runExperiment(dir);
console.log(`${ev.ffmpeg}   target ${ev.target.I} LUFS, true peak ${ev.target.TP} dBTP, LRA ${ev.target.LRA} LU\n`);
const row = (n, m, extra = '') => console.log(`${n.padEnd(10)} I ${String(m.I).padEnd(7)} LUFS   LRA ${String(m.LRA).padEnd(5)} LU   peak ${String(m.peak).padEnd(6)} dBFS ${extra}`);
row('source', ev.source);
row('one pass', ev.onePass.measured, `(loudnorm said output ${ev.onePass.loudnormReportsOutputI} LUFS, LRA ${ev.onePass.loudnormReportsOutputLRA}; pass 1 type: ${ev.onePass.type})`);
row('two pass', ev.twoPass.measured, `(second run type: ${ev.twoPass.type})`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
