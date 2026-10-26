// Usage: node episodes/ff43/fixture/run.mjs [outdir]   (default: ./out/ff43)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, RATES, CONTAINERS, AR_OK, AR_BAD, nearestSupported} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff43');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log('1000 Hz sine, 2 s, libopus 64k. Columns: ffprobe sample_rate | OpusHead input rate | decoded samples | seconds | zero-crossing Hz | FFT Hz | ogg granule');
for (const c of CONTAINERS) {
  console.log(`-- ${c}`);
  for (const r of RATES) { const t = ev.tone[c][r]; console.log(`in ${String(r).padStart(5)} (nearest ${nearestSupported(r)})  probe ${t.probe.sampleRate} dur ${t.probe.duration}  head ${t.head.inputRate} preskip ${t.head.preSkip}  samples ${t.samples}  ${t.seconds} s  zc ${t.zeroCrossHz}  fft ${t.fftHz}  granule ${t.granule}`); }
}
for (const [name, rows] of Object.entries(ev.control)) {
  console.log(`-- control ${name} (mka)`);
  for (const r of RATES) { const t = rows[r]; console.log(`in ${String(r).padStart(5)}  probe ${t.probe.sampleRate}  samples ${t.samples}  ${t.seconds} s  zc ${t.zeroCrossHz}  fft ${t.fftHz}`); }
}
console.log('\n48000 Hz white noise, libopus 128k, with -ar on the output. dropDb = level below the encoder band edge minus level above 1.25 times it');
const show = (k, n) => console.log(`${k.padEnd(6)} probe ${n.probe.sampleRate}  head ${n.head.inputRate}  samples ${n.samples}  granule ${n.granule}  low ${n.lowDb} dB  high(5-20k) ${n.highDb} dB  edge drop ${n.edgeDrop} dB`);
show('none', ev.noiseNone);
for (const r of AR_OK) show(String(r), ev.ar[r]);
for (const S of Object.keys(ev.loss)) for (const [k, n] of Object.entries(ev.loss[S])) console.log(`noise at ${S} Hz, ${k}: probe ${n.probe.sampleRate} head ${n.head.inputRate} samples ${n.samples}  ref(0.3-9k) ${n.refDb} dB  band(13-15.5k) ${n.bandDb} dB  loss ${n.lossDb} dB`);
console.log('\n-ar with a rate libopus does not support (44100 sine in):');
for (const r of AR_BAD) console.log(`-ar ${r}: exit ${ev.arBad[r].status}, output probeable ${ev.arBad[r].probeable}, ${ev.arBad[r].stderr}`);
console.log('\nsame input rates without -ar:', JSON.stringify(ev.arBadInputWithoutAr));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
