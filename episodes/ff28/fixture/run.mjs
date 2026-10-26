// Usage: node episodes/ff28/fixture/run.mjs [outdir]   (default: ./out/ff28)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff28');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const fmt = (a) => a.map((v) => (v === null ? '-inf' : v.toFixed(2))).join(' ');
for (const [k, s] of Object.entries(ev.sources)) console.log(`source ${k} ${s.freq} Hz, ${s.seconds} s: goertzel ${fmt(s.goertzelDb.slice(0, 3))} ... | bandpass ${fmt(s.bandpassDb.slice(1, 3))} | peak ${s.peakDb} dB`);
console.log('\n0.5 s windows, dBFS of each tone (reader 2 Goertzel / reader 1 bandpass+astats):');
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`\n${k.padEnd(13)} ${r.seconds} s, peak ${r.peakDbReader2} dB (astats ${r.astatsPeakDb})   ${r.command}`);
  for (const f of [440, 660, 880]) {
    if (r.windows[f].goertzel.every((v) => v === null || v < -60)) continue;
    console.log(`  ${f} Hz  G ${fmt(r.windows[f].goertzel)}\n          B ${fmt(r.windows[f].bandpass)}`);
  }
  console.log(`  440 Hz back at -6.00 dB (0.1 s windows): Goertzel from ${r.fine.arrivalGoertzel} s, bandpass from ${r.fine.arrivalBandpass} s`);
}
console.log('\nhot pair (440 Hz and 660 Hz, each -3 dBFS):');
for (const [k, h] of Object.entries(ev.hot)) console.log(`${k.padEnd(16)} ${JSON.stringify(h)}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
