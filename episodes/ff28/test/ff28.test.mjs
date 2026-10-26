import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff28-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (tol ${tol})`);
// window i of 0.5 s covers [i/2, i/2 + 0.5) s; window 0 is skipped for the bandpass reader (its filter is still settling)
const both = (k, f, i) => [R(k).windows[f].goertzel[i], R(k).windows[f].bandpass[i]];
const bothNear = (k, f, i, target, tol = 0.15) => { for (const v of both(k, f, i)) near(v, target, tol, `${k} ${f} Hz window ${i}`); };

t('control: both readers see every source tone at -6.00 dBFS in every window (known positive), and the source file peak is -6 dB', () => {
  for (const s of Object.values(ev.sources)) {
    s.goertzelDb.forEach((v) => near(v, -6.0, 0.01));
    s.bandpassDb.slice(1).forEach((v) => near(v, -6.0, 0.01));
    assert.equal(s.peakDb, -6);
  }
  assert.deepEqual([ev.sources.a.seconds, ev.sources.b.seconds, ev.sources.c.seconds], [6, 3, 6]);
});

t('control: one input through amix=inputs=1 is unchanged (-6.00 dB in every window, zero sample error)', () => {
  const r = R('single');
  r.windows[440].goertzel.forEach((v) => near(v, -6.0, 0.01));
  assert.equal(r.maxErrVsA, 0);
  assert.equal(r.peakDbReader2, -6);
});

t('known sum: the same tone twice. Default amix gives back exactly one input (error 0). normalize=0 gives double the amplitude (+6.02 dB, 0.02 dBFS)', () => {
  assert.equal(R('sum_default').maxErrVsA, 0);
  R('sum_default').windows[440].goertzel.forEach((v) => near(v, -6.0, 0.01));
  R('sum_norm0').windows[440].goertzel.forEach((v) => near(v, -6.0 + 6.02, 0.01));
  near(R('sum_norm0').maxErrVsA, 0.5011872, 1e-6);   // |out - src| = src when out = 2 * src
  assert.equal(R('sum_norm0').astatsPeakDb, 0.02);
});

t('default amix: two -6 dBFS tones come out at -12.02 dBFS each while both play (6.02 dB lower), and the mix peaks at -6.42 dB', () => {
  for (let i = 1; i <= 5; i++) { bothNear('default', 440, i, -12.02); bothNear('default', 660, i, -12.02); }
  near(R('default').windows[440].goertzel[0], -12.02, 0.01);
  assert.equal(R('default').astatsPeakDb, -6);   // the tail, where only the 440 Hz tone is left, peaks at -6
  assert.equal(R('dur_shortest').astatsPeakDb, -6.42); assert.equal(R('dur_shortest').peakDbReader2, -6.42);   // the two-tone part alone
});

t('default amix with three inputs: each tone at -15.54 dBFS (9.54 dB lower)', () => {
  for (let i = 1; i <= 5; i++) for (const f of [440, 660, 880]) bothNear('three', f, i, -15.54);
});

t('default amix: when the 3 s input ends, the remaining tone rises 6.02 dB (-12.02 to -6.00) over the 2 s dropout_transition, back at -6.00 from 5.0 s', () => {
  const g = R('default').windows[440].goertzel;
  near(g[5], -12.02, 0.01); near(g[10], -6.0, 0.01); near(g[11], -6.0, 0.01);
  for (let i = 6; i <= 10; i++) assert.ok(g[i] > g[i - 1], `rising at window ${i}`);
  assert.equal(R('default').fine.arrivalGoertzel, 5); assert.equal(R('default').fine.arrivalBandpass, 5);
  // the shorter tone is gone after it ends
  assert.ok(R('default').windows[660].goertzel.slice(6).every((v) => v < -60));
  assert.ok(R('default').windows[660].bandpass.slice(6).every((v) => v < -25));
});

t('dropout_transition sets the length of the rise: 0 jumps at 3.0 s, 1 is back at 4.0 s, 2 (default) at 5.0 s, and 5 has not arrived by 6 s', () => {
  assert.equal(R('dt0').fine.arrivalGoertzel, 3); near(R('dt0').fine.arrivalBandpass, 3, 0.1000001);
  assert.equal(R('dt1').fine.arrivalGoertzel, 4); assert.equal(R('dt1').fine.arrivalBandpass, 4);
  assert.equal(R('default').fine.arrivalGoertzel, 5);
  assert.equal(R('dt5').fine.arrivalGoertzel, null); assert.equal(R('dt5').fine.arrivalBandpass, null);
  const last = R('dt5').windows[440].goertzel[11];
  assert.ok(last > -12.02 && last < -9.0, `dt5 last window ${last}`);
  bothNear('dt0', 440, 5, -12.02); near(R('dt0').windows[440].goertzel[6], -6.0, 0.01); near(R('dt0').windows[440].bandpass[6], -6.0, 0.15);
});

t('normalize=0: each tone keeps its own level (-6.00 dBFS), there is no jump when the short input ends, and the two-tone peak is -0.40 dB', () => {
  for (const k of ['norm0', 'dt0_n0']) {
    for (let i = 1; i <= 11; i++) bothNear(k, 440, i, -6.0);
    for (let i = 1; i <= 5; i++) bothNear(k, 660, i, -6.0);
    assert.equal(R(k).astatsPeakDb, -0.4); assert.equal(R(k).peakDbReader2, -0.4);
  }
});

t('weights: "2 1" with the default normalize gives -9.52 dB and -15.54 dB, and the long tone is back at -6.00 from 4.3 s. With normalize=0, "1 0.5" gives -6.00 and -12.02 with no jump', () => {
  for (let i = 1; i <= 5; i++) { bothNear('weights21', 440, i, -9.52); bothNear('weights21', 660, i, -15.54); }
  assert.equal(R('weights21').fine.arrivalGoertzel, 4.3); assert.equal(R('weights21').fine.arrivalBandpass, 4.3);
  for (let i = 1; i <= 5; i++) { bothNear('weights_n0', 440, i, -6.0); bothNear('weights_n0', 660, i, -12.02); }
  for (let i = 6; i <= 11; i++) bothNear('weights_n0', 440, i, -6.0);
});

t('duration: longest (default) and first-when-the-long-input-is-first are 6 s; shortest and first-when-the-short-input-is-first are 3 s (ffprobe and sample count agree)', () => {
  const secs = (k) => [R(k).seconds, R(k).samples / ev.rate];
  for (const [k, s] of [['default', 6], ['dur_first', 6], ['dur_shortest', 3], ['dur_first_b', 3]]) assert.deepEqual(secs(k), [s, s], k);
  // when the output stops at 3 s, nothing is left to jump
  R('dur_shortest').windows[440].goertzel.forEach((v) => near(v, -12.02, 0.01));
});

t('hot pair (440 and 660 Hz, each -3 dBFS): default amix peaks at -3.42 dB with no clipping; normalize=0 reaches +2.60 dBFS in float and clips in 16-bit (18.4% of samples at full scale)', () => {
  const H = ev.hot;
  assert.equal(H.hot_default_f32.astats.peakDb, -3.42); assert.equal(H.hot_default_f32.peakDbReader2, -3.42);
  assert.equal(H.hot_default_s16.samplesAtFullScale, 0);
  assert.equal(H.hot_norm0_f32.astats.peakDb, 2.6); assert.equal(H.hot_norm0_f32.peakDbReader2, 2.6);
  assert.ok(H.hot_norm0_f32.samplesAboveFullScale > 0);
  const s = H.hot_norm0_s16;
  assert.equal(s.astats.peakDb, 0); assert.ok(s.astats.flat > 0);
  assert.equal(s.samplesAtFullScale, s.astats.peakCount);   // reader 1 (astats peak count) and reader 2 (raw samples) agree
  near(s.share, 0.184, 0.005);
});

t('the two readers agree: bandpass+astats and Goertzel give the same level (within 0.15 dB) in every window where a tone is present', () => {
  let n = 0;
  for (const r of Object.values(ev.runs)) for (const f of [440, 660, 880]) {
    const g = r.windows[f].goertzel, b = r.windows[f].bandpass;
    for (let i = 1; i < g.length; i++) if (g[i] > -40) { near(g[i], b[i], 0.15, `${f} Hz window ${i}`); n++; }
  }
  assert.ok(n > 150, `compared ${n} windows`);
});
