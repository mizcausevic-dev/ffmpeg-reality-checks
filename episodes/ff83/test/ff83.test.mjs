import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, parseSilence, sampleRuns, thresholdOf, toInt16, buildOf, gapsFound, GAPS, SR, LATE, CASES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff83-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (n) => ev.runs[n];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const ids = (n) => R(n).found.join('');
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m ?? ''} ${a} vs ${b}`);
const spans = (n) => R(n).silences.map((s) => [s.start, s.end]);

t('the helpers behave: parseSilence reads start, end, duration and channel; sampleRuns uses a strict threshold and a minimum length; the 16 bit threshold truncates and wraps; build detection', () => {
  const p = parseSilence('[silencedetect @ 0x1] silence_start: 1.5\r\n[silencedetect @ 0x1] silence_end: 3 | silence_duration: 1.5\r\n[silencedetect @ 0x1] channel: 1 | silence_start: 0\n');
  assert.deepEqual(p, [{start: 1.5, end: 3, duration: 1.5, channel: null}, {start: 0, end: null, duration: null, channel: 1}]);
  assert.deepEqual(sampleRuns(Int16Array.from([5, 1, -1, 0, 9, 1, 1]), 2, 3).map((r) => [r.startSample, r.endSample]), [[1, 4]]);
  assert.equal(sampleRuns(Int16Array.from([2, 2]), 2, 1).length, 0, 'strictly below');
  assert.equal(thresholdOf(0.001, 's16'), 32); assert.equal(thresholdOf(0.001, 'f32'), 0.001);
  assert.equal(toInt16(49150), -16386); assert.equal(thresholdOf(1.5, 's16'), -16386);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
  assert.deepEqual(gapsFound([{start: 1, end: 3.5}, {start: 4.5, end: 5}]), ['A', 'B']);
});

t('ffmpeg -version is recorded, and the main clip is what the fixture promises, read from the WAV bytes: 12 s at 48000 Hz, five gaps with peaks 0, 0, 115, 66 and 16, a tone of peak 16384 between them', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.sr, SR);
  assert.deepEqual(ev.gaps.map((g) => g.id + ':' + g.peak), ['A:0', 'B:0', 'C:115', 'D:66', 'E:16']);
  assert.equal(ev.tonePeak, 16384);
  assert.deepEqual(ev.gaps.map((g) => g.duration), [2.5, 0.5, 1, 1, 1]);
});

t('the noise gaps are placed so that peak and rms tell different stories: C has an rms below -50 dBFS but a peak above it, D has a peak between -60 and -50 dBFS, E has a peak below -60 dBFS', () => {
  const g = Object.fromEntries(ev.gaps.map((x) => [x.id, x]));
  assert.ok(g.C.rmsDb < -50 && g.C.peakDb > -50, `C rms ${g.C.rmsDb} peak ${g.C.peakDb}`);
  assert.ok(g.D.peakDb < -50 && g.D.peakDb > -60, `D peak ${g.D.peakDb}`);
  assert.ok(g.D.rmsDb < -50 && g.D.rmsDb > -60);
  assert.ok(g.E.peakDb < -60);
});

t('control: a clip with no gap at all gives no silence report from ffmpeg and none from the raw samples, and the digital zero gap A is found by both readers at every setting that finds anything (so both readers can see a gap)', () => {
  assert.equal(R('toneOnly').count, 0); assert.equal(R('toneOnly').model.length, 0); assert.equal(R('toneOnly').status, 0);
  for (const n of ['default', 'd1', 'd05', 'd03', 'n50', 'n40', 'f32n50']) { assert.ok(ids(n).startsWith('A'), n); assert.ok(R(n).model.some((m) => m.start === 1 && m.end === 3.5), n); }
});

t('known positive, the default: with no options only 1 of the 5 gaps is reported, gap A (2.5 s); the explicit n=-60dB:d=2 gives exactly the same report', () => {
  assert.equal(ids('default'), 'A'); assert.equal(R('default').count, 1);
  assert.deepEqual(R('explicit').silences, R('default').silences);
  assert.deepEqual(spans('default'), [[1, 3.5]]);
});

t('d is a minimum length: d=1 adds the 1 s gap E, d=0.5 adds the 0.5 s gap B (a gap exactly as long as d is reported), d=0.5001 drops B again, and the count never falls when d gets smaller', () => {
  const order = ['default', 'd1', 'd05', 'd03'].map((n) => R(n).count);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(ids('d1').includes('A') && ids('d1').includes('E'));
  assert.ok(ids('d05').includes('B'));
  assert.ok(ids('d03').includes('B'));
  if (isV6()) { assert.equal(ids('d1'), 'AE'); assert.equal(ids('d05'), 'ABE'); assert.equal(ids('d05plus'), 'AE'); assert.equal(ids('d03'), 'ABE'); }
  assert.ok(R('d05plus').count <= R('d05').count);
});

t('n is compared with each single sample, not with an average: at -60dB the gaps A, B, E are silent; at -50dB D joins (its peak -53.9 dBFS); C stays loud at -50dB although its rms is -53.9 dBFS, and only -40dB takes it', () => {
  assert.equal(ids('d03'), 'ABE'); assert.equal(ids('n50'), 'ABDE'); assert.equal(ids('n40'), 'ABCDE');
  assert.ok(!ids('n50').includes('C'));
  const c = ev.gaps.find((g) => g.id === 'C'); assert.ok(c.rmsDb < -50 && c.peakDb > -50);
});

t('spellings: n=0.001 is -60dB and n=0.00316228 is -50dB (the same report to the digit), noise= and duration= are the long names, 16 bit and float input agree at ordinary thresholds, and -50dB is not 0.001', () => {
  assert.deepEqual(R('amp001').silences, R('d03').silences);
  assert.deepEqual(R('amp00316').silences, R('n50').silences);
  assert.deepEqual(R('longnames').silences, R('n50').silences);
  assert.deepEqual(R('f32n50').silences, R('n50').silences);
  assert.deepEqual(R('f32n60').silences, R('d03').silences);
  assert.notDeepEqual(R('n50').silences, R('amp001').silences);
});

t('bad values are refused with a nonzero exit status and no silence lines: n=-50 (no dB) and d=-1 are out of range; on 6.1.1 the message says so', () => {
  if (isV6()) {
    for (const k of ['bareDb', 'badD']) { assert.notEqual(R(k).status, 0, k); assert.equal(R(k).count, 0); assert.match(R(k).message, /out of range/, k); }
    assert.match(R('bareDb').message, /\[0 - 1\.79769e\+308\]/);
    assert.match(R('bareDb').message, /parameter 'n'/); assert.match(R('badD').message, /parameter 'd'/);
  } else {
    for (const k of ['bareDb', 'badD']) assert.equal(typeof R(k).status, 'number', k); // other builds: recorded in the evidence, no claim
  }
});

t('n=0 reports nothing, not even the digital zero gap (the test is strictly below the threshold); n=1 on 16 bit reports the whole file as silent', () => {
  if (isV6()) { assert.equal(R('zero').count, 0); assert.deepEqual(spans('one'), [[0, 12]]); }
  assert.equal(R('toneOnly').count, 0);
  assert.deepEqual(R('zero').model, [], 'the raw samples agree: no sample is below 0');
});

t('a threshold above 1: on float input everything is silent; on 16 bit input it overflows (n=1.5 and n=20dB report nothing, even though the digital zero is there); the raw sample model with the wrapped 16 bit threshold predicts all of it', () => {
  assert.deepEqual(spans('f32over15'), [[0, 12]]); assert.deepEqual(spans('f32plus20'), [[0, 12]]);
  if (isV6()) {
    assert.equal(R('over15').count, 0); assert.equal(R('plus20').count, 0);
    assert.equal(R('plus50').count, 5, 'n=50dB wraps to 7147 and looks like a loud threshold');
    for (const k of ['over15', 'plus20', 'plus50', 'f32over15', 'f32plus20', 'one', 'zero']) assert.equal(R(k).agree, true, k);
  }
});

t('the exact threshold on 16 bit input: n=0.001 is 32.767 samples units, cut to 32, tested strictly: constants up to 31 (and down to -31) are silent, 32 and above are not; -50dB (103.6 cut to 103) takes all constants 28 to 36', () => {
  const b = ev.boundary.s16, hi = Math.max(...b.silent.map(Math.abs)), lo = Math.min(...b.notSilent.map(Math.abs));
  assert.ok(hi >= 31 && hi <= 32 && lo >= 32 && lo <= 33, `${hi} ${lo}`);
  assert.ok(b.silent.every((v) => b.silent.includes(-v)), 'symmetric around 0');
  if (isV6()) { assert.deepEqual(b.silent.filter((v) => v > 0), [28, 29, 30, 31]); assert.deepEqual(b.notSilent.filter((v) => v > 0), [32, 33, 34, 35, 36]); }
  assert.equal(ev.boundary.s16n50.notSilent.length, 0);
  assert.equal(ev.thresholds['-60dB'].trunc, 32); assert.equal(ev.thresholds['-50dB'].trunc, 103);
});

t('the exact threshold on float input: 0.000999 is silent, 0.001001 is not, and a sample of exactly 0.001 is not (strictly below)', () => {
  const b = ev.boundary.f32;
  assert.ok(b.silent.includes(0.000999) || b.silent.some((v) => Math.abs(v - 0.000999) < 1e-7));
  assert.ok(!b.silent.some((v) => v > 0.00100001));
  if (isV6()) assert.ok(!b.silent.some((v) => Math.abs(v - 0.001) < 1e-7));
});

t('the two readers agree: ffmpeg start and end times match the raw sample runs to within 0.5 ms in every ordinary case (all the cases with n at or below 1 on 16 bit, both clips)', () => {
  const plain = Object.keys(CASES).filter((k) => CASES[k].n !== null && CASES[k].n <= 1);
  for (const k of plain) { assert.equal(R(k).agree, true, k); assert.equal(R(k).count, R(k).model.length, k); }
  if (isV6()) for (const k of Object.keys(CASES).filter((k) => CASES[k].n !== null)) assert.equal(R(k).agree, true, k);
});

t('timing: the reported start and end are the true gap edges (1 to 3.5, 4.5 to 5, 8 to 9, 10 to 11) to the printed digits, and duration is end minus start', () => {
  for (const s of R('n50').silences) { const g = GAPS.find((x) => Math.abs(x.start - s.start) < 1e-3); assert.ok(g); near(s.start, g.start, 1e-5); near(s.end, g.end, 1e-5); near(s.duration, g.end - g.start, 1e-5); }
  const m = R('n50').model; near(m[0].start, 1, 0); assert.equal(m[0].startSample, 48000); assert.equal(m[0].endSample, 168000);
});

t('the printed time has 6 significant digits: a gap starting at 123.456771 s (sample 5925925) is printed as 123.457, which is off by more than one sample and less than one millisecond', () => {
  const s = R('late').silences[0]; assert.ok(s);
  const trueStart = LATE.startSample / SR;
  assert.ok(Math.abs(s.start - trueStart) < 1e-3);
  if (isV6()) { assert.equal(s.start, 123.457); assert.equal(s.end, 124.457); assert.ok(Math.abs(s.start - trueStart) > 1 / SR); }
  assert.equal(R('late').model[0].startSample, LATE.startSample);
  if (isV6()) assert.equal(ev.late.offSamples, 11);
});

t('silence at the start and the end of the file: a silence from 0 is reported with silence_start 0, and one that runs to the end of the file is closed at the end of the file (on 6.1.1: 0 to 2 and 3 to 6)', () => {
  const s = R('edge').silences; assert.equal(s[0].start, 0);
  if (isV6()) assert.deepEqual(spans('edge'), [[0, 2], [3, 6]]);
  assert.equal(R('edge').model.length, 2);
});

t('stereo: a channel that is silent while the other plays is not silence (nothing reported); with mono=1 each channel is judged alone and the silent right channel (channel 1, counting from 0) is reported from 0 to 4', () => {
  assert.equal(R('stereo').count, 0);
  const m = R('stereoMono');
  assert.ok(m.count >= 1);
  if (isV6()) { assert.equal(m.count, 1); assert.equal(m.silences[0].channel, 1); assert.deepEqual(spans('stereoMono'), [[0, 4]]); }
  assert.equal(R('stereoMono').agree, true);
});
