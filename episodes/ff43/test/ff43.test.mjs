import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, opusHead, zeroCrossHz, fftPeakHz, bandDb, dropDb, nearestSupported, RATES, CONTAINERS, AR_OK, AR_BAD, TONE_HZ} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff43-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const allTones = () => CONTAINERS.flatMap((c) => RATES.map((r) => [c, r, ev.tone[c][r]]));
const SAME_AS_INPUT = new Set(AR_OK);

t('the reader helpers behave on a made-up signal: zero crossings and FFT find 1000 Hz at any rate, the band meter sees a sharp low-pass, the header parser rejects a file with no OpusHead, nearest rate picks as expected', () => {
  for (const rate of [8000, 44100, 96000]) {
    const x = new Float32Array(rate); for (let i = 0; i < x.length; i++) x[i] = Math.sin(2 * Math.PI * TONE_HZ * i / rate);
    near(zeroCrossHz(x, rate), 1000, 0.5); near(fftPeakHz(x, rate), 1000, 1);
  }
  // two tones, 2 kHz at amplitude 1 and 10 kHz at amplitude 0.001: 60 dB apart
  const y = new Float32Array(48000); for (let i = 0; i < y.length; i++) y[i] = Math.sin(2 * Math.PI * 2000 * i / 48000) + 0.001 * Math.sin(2 * Math.PI * 10000 * i / 48000);
  near(bandDb(y, 48000, 1900, 2100) - bandDb(y, 48000, 9900, 10100), 60, 3);
  assert.ok(dropDb(y, 48000, 4000) > 50);
  const tmp = path.join(dir, 'no-head.bin'); fs.writeFileSync(tmp, Buffer.from('not an opus file at all, just bytes'));
  assert.equal(opusHead(tmp), null);
  assert.deepEqual([8000, 11025, 22050, 32000, 44100, 96000].map(nearestSupported), [8000, 12000, 24000, 24000, 48000, 48000]);
});

t('ffmpeg -version is recorded, and all 30 libopus files (10 input rates, ogg opus, mka, webm) were written and are readable', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(allTones().length, 30);
  for (const [c, r, f] of allTones()) { assert.equal(f.probe.codec, 'opus', `${c} ${r}`); assert.equal(f.probe.channels, 1, `${c} ${r}`); }
});

t('yes at the stream level: ffprobe says sample_rate 48000 for every input rate and every container, 30 of 30', () => {
  for (const [c, r, f] of allTones()) assert.equal(f.probe.sampleRate, 48000, `${c} ${r}`);
});

t('the decoded audio agrees: 2 s at 48000 Hz is 96000 samples for every input rate and container (reader 2, no -ar on decode), and the ogg granule position counts 48000 per second too', () => {
  for (const [c, r, f] of allTones()) { near(f.samples, 96000, 960, `${c} ${r} samples`); near(f.seconds, 2, 0.02, `${c} ${r} seconds`); }
  for (const r of RATES) { const g = ev.tone.opus[r].granule; assert.ok(g >= 96000 && g <= 97500, `granule ${r}: ${g}`); }
});

t('the pitch survives every input rate: 1000 Hz by zero crossings (within 0.5 Hz) and by FFT peak (within 1 Hz), 30 of 30, so nothing is sped up or slowed down', () => {
  for (const [c, r, f] of allTones()) { near(f.zeroCrossHz, TONE_HZ, 0.5, `${c} ${r} zc`); near(f.fftHz, TONE_HZ, 1, `${c} ${r} fft`); }
});

t('both readers agree on duration: ffprobe format duration is within 0.05 s of decoded samples over the stream rate, in every file', () => {
  for (const [c, r, f] of allTones()) { assert.ok(f.probe.duration !== null, `${c} ${r}`); near(f.probe.duration, f.samples / f.probe.sampleRate, 0.05, `${c} ${r}`); }
});

t('known-positive control: pcm_s16le and flac in mka keep the input rate (ffprobe sample_rate equals the input rate and decoded samples are 2 x rate, 20 of 20) and the same pitch reader still reads 1000 Hz', () => {
  for (const name of ['pcm', 'flac']) for (const r of RATES) {
    const f = ev.control[name][r];
    assert.equal(f.probe.sampleRate, r, `${name} ${r}`); assert.equal(f.samples, 2 * r, `${name} ${r}`);
    near(f.zeroCrossHz, TONE_HZ, 0.5); near(f.fftHz, TONE_HZ, 1);
  }
});

t('the file remembers an input rate that ffprobe does not show: the OpusHead field is 8000, 12000, 16000, 24000 or 48000, identical in ogg, mka and webm, while ffprobe says 48000', () => {
  for (const r of RATES) {
    const heads = CONTAINERS.map((c) => ev.tone[c][r].head.inputRate);
    assert.deepEqual([...new Set(heads)].length, 1, `rate ${r}: ${heads}`);
    assert.ok(AR_OK.includes(heads[0]), `rate ${r}: ${heads[0]}`);
  }
  // the parser is not just echoing 48000: it reads 8000 and 24000 where they were encoded
  assert.equal(ev.tone.opus[8000].head.inputRate, 8000); assert.equal(ev.tone.opus[24000].head.inputRate, 24000);
  assert.equal(ev.tone.opus[8000].probe.sampleRate, 48000);
});

t('the field is only the original rate for the five rates libopus accepts: 11025, 22050, 32000, 44100 and 96000 are not recorded, the 32000 Hz source says 24000 and the 44100 and 96000 sources say 48000', () => {
  for (const r of RATES) { const h = ev.tone.opus[r].head.inputRate; if (SAME_AS_INPUT.has(r)) assert.equal(h, r, `${r}`); else assert.notEqual(h, r, `${r}`); }
  assert.equal(ev.tone.opus[32000].head.inputRate, 24000);
  assert.equal(ev.tone.opus[44100].head.inputRate, 48000); assert.equal(ev.tone.opus[96000].head.inputRate, 48000);
});

t('ffmpeg picks the nearest of the five supported rates when the source is not one of them: 11025 to 12000, 22050 to 24000, 32000 to 24000, 44100 and 96000 to 48000', () => {
  for (const r of RATES) assert.equal(ev.tone.opus[r].head.inputRate, nearestSupported(r), `${r}`);
});

t('a 32000 Hz source loses its top: white noise through the default path has the 13 to 15.5 kHz band at least 60 dB below the 0.3 to 9 kHz band, while the same band survives from a 44100 Hz source (loss under 3 dB)', () => {
  const a = ev.loss[32000].none, b = ev.loss[44100].none;
  assert.equal(a.head.inputRate, 24000); assert.equal(a.probe.sampleRate, 48000); near(a.samples, 96000, 960);
  assert.ok(a.lossDb >= 60, `32000 loss ${a.lossDb}`);
  assert.equal(b.head.inputRate, 48000); assert.ok(Math.abs(b.lossDb) < 3, `44100 loss ${b.lossDb}`);
});

t('the fix: -ar 48000 on the 32000 Hz source keeps the band (loss under 3 dB, header 48000), and -ar 24000 reproduces the default (same header, band within 1 dB)', () => {
  const d = ev.loss[32000];
  assert.equal(d.ar48000.head.inputRate, 48000); assert.ok(Math.abs(d.ar48000.lossDb) < 3, `${d.ar48000.lossDb}`);
  assert.equal(d.ar24000.head.inputRate, 24000); near(d.ar24000.lossDb, d.none.lossDb, 1);
  // and -ar 24000 on a 44100 Hz source throws the same band away on purpose
  assert.ok(ev.loss[44100].ar24000.lossDb >= 60);
});

t('-ar with a supported rate changes the audio but not the label: ffprobe still says 48000, decoded samples still 96000, ogg granule unchanged, header holds the -ar value (8000, 12000, 16000, 24000, 48000)', () => {
  for (const r of AR_OK) {
    const n = ev.ar[r];
    assert.equal(n.probe.sampleRate, 48000, `${r}`); near(n.samples, 96000, 960, `${r}`);
    assert.equal(n.head.inputRate, r, `${r}`); assert.ok(n.granule >= 96000 && n.granule <= 97500, `${r} ${n.granule}`);
  }
  assert.equal(ev.noiseNone.probe.sampleRate, 48000); assert.equal(ev.noiseNone.head.inputRate, 48000);
});

t('-ar 8000, 12000, 16000 and 24000 band-limit the decoded 48000 Hz stream: the level above 1.25 x the encoder band edge is at least 60 dB under the level below 0.75 x it, and the high band (5 to 20 kHz) rises in order 8000 < 12000 < 16000 < 24000 < 48000', () => {
  for (const r of [8000, 12000, 16000, 24000]) assert.ok(ev.ar[r].edgeDrop >= 60, `${r}: ${ev.ar[r].edgeDrop}`);
  const hi = AR_OK.map((r) => ev.ar[r].highDb);
  for (let i = 1; i < hi.length; i++) assert.ok(hi[i] > hi[i - 1], `high band not rising: ${hi}`);
  // no -ar and -ar 48000 are the same flat noise: low and high band within 1 dB
  for (const n of [ev.noiseNone, ev.ar[48000]]) near(n.highDb, n.lowDb, 1);
  near(ev.ar[48000].highDb, ev.noiseNone.highDb, 0.5);
});

t('-ar with a rate libopus does not support (22050, 32000, 44100, 96000) fails: non-zero exit, no readable output file, even though the same 32000, 44100 and 96000 inputs encode fine without -ar', () => {
  for (const r of AR_BAD) { assert.notEqual(ev.arBad[r].status, 0, `-ar ${r}`); assert.equal(ev.arBad[r].probeable, false, `-ar ${r}`); }
  for (const r of [32000, 44100, 96000]) assert.equal(ev.arBadInputWithoutAr[r].sampleRate, 48000);
});

t('reader agreement: for every libopus file ffprobe and the Node reader both say 48000 per second (stream rate, decoded seconds, ogg granule), and the Node-only OpusHead field is the one place the encoder rate shows', () => {
  for (const [c, r, f] of allTones()) {
    near(f.samples / f.probe.sampleRate, 2, 0.02, `${c} ${r}`);
    if (f.granule !== null) near(f.granule / 48000, f.samples / 48000, 0.02, `${c} ${r} granule`);
  }
  const distinct = new Set(RATES.map((r) => ev.tone.opus[r].head.inputRate));
  assert.deepEqual([...distinct].sort((a, b) => a - b), [8000, 12000, 16000, 24000, 48000]);
  assert.equal(new Set(RATES.map((r) => ev.tone.opus[r].probe.sampleRate)).size, 1);
});
