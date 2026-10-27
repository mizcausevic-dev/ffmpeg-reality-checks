import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, cellOf, wavData, alignment, phaseUs, upCrossings, tone, pcm, buildOf, DIRECTIONS, F0, AMP} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff94-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const C = (rin, ro, n, m) => cellOf(ev, rin, ro, n, m);
const engines = () => (ev.soxr ? ['aresample', 'ar', 'soxr'] : ['aresample', 'ar']);
const resamplers = () => ev.cells.filter((c) => c.method !== 'asetrate');

t('the readers behave on signals we make ourselves: the alignment check sees a one sample shift (about 450 LSB at 200 Hz and 44100), the tone offset reads a hand delay of 5 samples as 113.4 microseconds, the zero crossing count of a 200 Hz tone is 200, and a hand written wav gives its data size', () => {
  const y = pcm(tone(44100, 44100));
  assert.equal(y.length, 44100); assert.ok(alignment(y, 44100).interiorMax <= 1); assert.ok(alignment(y, 44100, 1).interiorMax > 400);
  const delayed = pcm(tone(44100, 44100 + 5)).slice(0, 44100).map((_, j) => Math.round(AMP * Math.sin(2 * Math.PI * F0 * (j - 5) / 44100)));
  near(phaseUs(delayed, 44100, 100), 5 / 44100 * 1e6, 1); near(phaseUs(y, 44100, 100), 0, 0.5);
  assert.equal(upCrossings(y), 200);
  const d = Buffer.alloc(6, 1), h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + 6, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(44100, 24); h.writeUInt32LE(88200, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(6, 40);
  const f = path.join(dir, 'hand.wav'); fs.writeFileSync(f, Buffer.concat([h, d]));
  const w = wavData(f); assert.equal(w.samples, 3); assert.equal(w.rate, 44100);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded and the matrix is complete: 3 directions, 5 input lengths, aresample, -ar and asetrate (plus soxr when the build has libsoxr)', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  const per = ev.soxr ? 4 : 3;
  assert.equal(ev.cells.length, DIRECTIONS.length * 5 * per);
});

t('two readers agree on every count: the raw bytes ffmpeg pipes out, the data chunk of the same command written to a wav, and ffprobe duration_ts (an empty output has no duration_ts), and the wav carries the target rate', () => {
  for (const c of ev.cells) {
    assert.equal(c.wavSamples, c.rawSamples, `${c.method} ${c.rin} to ${c.ro} n=${c.n}`);
    if (c.rawSamples > 0) assert.equal(c.probeTs, c.rawSamples, `${c.method} ${c.rin} to ${c.ro} n=${c.n}`); else assert.equal(c.probeTs, null);
    assert.equal(c.wavRate, c.ro); assert.equal(c.probeRate, c.ro);
  }
});

t('control, exactly one second in: 48000 to 44100, 44100 to 48000 and 96000 to 44100 give exactly the ideal count (44100, 48000, 44100), which is exactly 1.000000 s, for aresample, -ar and soxr', () => {
  for (const [rin, ro] of DIRECTIONS) for (const m of engines()) { const c = C(rin, ro, rin, m); assert.equal(c.rawSamples, ro, `${m} ${rin}`); assert.equal(c.seconds, 1); }
});

t('the tone is where it should be: against the ideal sine at the output instants the interior error is 2 LSB or less (a one sample shift would give more than 400), the tone offset at both ends is within 10 microseconds, the first sample can be off by up to 100 LSB; aresample, -ar and soxr all do this', () => {
  for (const [rin, ro] of DIRECTIONS) for (const m of engines()) {
    const c = C(rin, ro, rin, m);
    assert.ok(c.align.interiorMax <= 2, `${m} ${rin} interior ${c.align.interiorMax}`); assert.ok(c.shifted.interiorMax > 400);
    near(c.phaseStartUs, 0, 10); near(c.phaseEndUs, 0, 10); near(c.freq, F0, 0.01); assert.ok(c.align.edgeMax < 100, `edge ${c.align.edgeMax}`);
  }
});

t('-ar on the output and aresample in the filter chain are the same thing: the same md5 of the samples in every one of the cells, not only the same count', () => {
  for (const c of ev.cells.filter((x) => x.method === 'aresample')) assert.equal(C(c.rin, c.ro, c.n, 'ar').md5, c.md5, `${c.rin} to ${c.ro} n=${c.n}`);
});

t('odd lengths: the output count is never the ideal count when the ideal is not a whole number, but it stays within one sample of it, for aresample and soxr (the direction of the rounding depends on length and engine)', () => {
  for (const c of resamplers().filter((x) => x.n >= 1000 && x.label !== 'second')) { assert.ok(Math.abs(c.diff) < 1, `${c.method} ${c.rin} to ${c.ro} n=${c.n} diff ${c.diff}`); assert.ok(c.diff !== 0); }
  const dirs = new Set(C(48000, 44100, 1000, 'aresample').diff > 0 ? ['up'] : ['down']);
  const signs = new Set(resamplers().filter((x) => x.method === 'aresample' && x.n >= 1000 && x.label !== 'second').map((x) => Math.sign(x.diff)));
  if (isV6()) { assert.deepEqual([...signs].sort(), [-1, 1], 'aresample rounds up for some lengths and down for others'); assert.ok(dirs.has('up')); }
});

t('measured on 6.1.1, exact counts: 1000 samples 48000 to 44100 give 919 (ideal 918.75), 1001 give 920, 2048 give 1881 (ideal 1881.6, rounded down); 44100 to 48000: 1089, 1090, 2230; 96000 to 44100: 460, 460, 941', () => {
  if (!isV6()) return;
  const want = {'48000,44100': [919, 920, 1881], '44100,48000': [1089, 1090, 2230], '96000,44100': [460, 460, 941]};
  for (const [k, v] of Object.entries(want)) { const [rin, ro] = k.split(',').map(Number); assert.deepEqual([1000, 1001, 2048].map((n) => C(rin, ro, n, 'aresample').rawSamples), v, k); }
  if (ev.soxr) assert.deepEqual([1000, 1001, 2048].map((n) => C(48000, 44100, n, 'soxr').rawSamples), [919, 920, 1882]);
});

t('20 samples in: the default engine can output nothing (0 samples on 6.1.1 in all three directions, with exit code 0 and an empty wav), while soxr outputs the rounded ideal; on any build the output never exceeds the ideal plus one', () => {
  for (const [rin, ro] of DIRECTIONS) {
    const a = C(rin, ro, 20, 'aresample'); assert.ok(a.rawSamples <= a.ideal + 1);
    if (isV6()) { assert.equal(a.rawSamples, 0); assert.equal(C(rin, ro, 20, 'ar').rawSamples, 0); }
    if (ev.soxr) { const s = C(rin, ro, 20, 'soxr'); near(s.rawSamples, s.ideal, 1); assert.ok(s.rawSamples > 0); }
  }
});

t('asetrate is not resampling: the sample count stays equal to the input count, the duration becomes n over the new rate (1.0884 s for one second at 48000 read at 44100), and the tone moves by the rate ratio (200 Hz becomes 183.75, 217.69 and 91.875 Hz)', () => {
  for (const c of ev.cells.filter((x) => x.method === 'asetrate')) { assert.equal(c.rawSamples, c.n); near(c.seconds, c.n / c.ro, 1e-9); }
  const hz = {'48000,44100': 183.75, '44100,48000': 217.6871, '96000,44100': 91.875};
  for (const [k, f] of Object.entries(hz)) { const [rin, ro] = k.split(',').map(Number); const c = C(rin, ro, rin, 'asetrate'); near(c.freq, f, 0.01, k); near(c.freq, F0 * ro / rin, 0.01); assert.ok(c.align.interiorMax > 10000, 'far from the ideal tone at the target rate'); }
  near(C(48000, 44100, 48000, 'asetrate').seconds, 48000 / 44100, 1e-9);
});

t('100 pieces of 1000 samples, 48000 to 44100: every piece gets the same rounded count, so the joined length is 100 times that and not the ideal 91875; the readers agree (Node sum of wav data, the concat joined file in ffprobe), the tone at the end is late by the drift (within 20 microseconds), and resampling the whole signal at once is on time', () => {
  for (const k of Object.keys(ev.pieces).filter((x) => x !== 'swr4800')) {
    const p = ev.pieces[k];
    assert.equal(p.joinedSamples, p.pieces * p.perPiece); assert.equal(p.joinedWav, p.joinedSamples); assert.equal(p.joinedProbeTs, p.joinedSamples);
    assert.ok(Math.abs(p.wholeSamples - p.ideal) < 1);
    assert.ok(p.drift > 0, `${k} drift ${p.drift}`); near(p.phaseEndUs, p.drift / 44100 * 1e6, 20, k); near(p.phaseStartUs, 0, 10); near(p.wholePhaseEndUs, 0, 10);
  }
  if (isV6()) { assert.equal(ev.pieces.swr1000.perPiece, 919); assert.equal(ev.pieces.swr1000.joinedSamples, 91900); assert.equal(ev.pieces.swr1000.wholeSamples, 91875); assert.equal(ev.pieces.swr1000.drift, 25); assert.equal(ev.pieces.swr1001.perPiece, 920); assert.equal(ev.pieces.swr1001.drift, 33); }
  if (ev.soxr && isV6()) assert.equal(ev.pieces.soxr1000.drift, 25);
});

t('control for the join: pieces of 4800 samples (an exact 4410 each) join to exactly the same length as the whole signal and the same tone position, so the drift comes from rounding the partial sample and nothing else', () => {
  const p = ev.pieces.swr4800;
  assert.equal(p.joinedSamples, p.pieces * p.perPiece); assert.equal(p.joinedProbeTs, p.joinedSamples); near(p.phaseEndUs, 0, 10);
  if (isV6()) { assert.equal(p.perPiece, 4410); assert.equal(p.drift, 0); assert.equal(p.joinedSamples, 441000); }
});
