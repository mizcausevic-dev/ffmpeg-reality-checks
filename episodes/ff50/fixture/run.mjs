// Usage: node episodes/ff50/fixture/run.mjs [outdir]   (default: ./out/ff50)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, SWEEP, DIAL} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff50');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.src.probe.sampleRate} Hz, ${ev.src.probe.duration} s, tone amplitude ${ev.amp} (expected ${ev.src.expectedDb} dB RMS); new rate ${ev.outRate} Hz, new Nyquist ${ev.nyquistOut} Hz`);
const line = (name, m) => console.log(`${name.padEnd(22)} ${String(m.inHz).padStart(5)} Hz in, read at ${String(m.readHz).padStart(5)} Hz: node ${String(m.dbc.node).padStart(7)} dBc, ffmpeg ${String(m.dbc.ffmpeg).padStart(7)} dBc   (levels ${m.level.node} / ${m.level.ffmpeg} dB, strongest peak ${m.peakHz} Hz at ${m.peakDb} dB, ${m.probe.sampleRate} Hz, ${m.samples} samples)`);
line('control, in band', ev.ctl);
for (const hz of SWEEP) line(`aresample=24000`, ev.sweep[hz]);
line('naive decimation', ev.naive);
for (const n of DIAL) line(`filter_size=${n}`, ev.dial[n]);
console.log(`\nroutes md5: aresample ${ev.routes.aresample}\n            -ar        ${ev.routes.ar}\n            aformat    ${ev.routes.aformat}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
