import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, mafdList, modelScores, modelSelect, buildOf, W, H, N, FS, CUT_AT, FADES, THRESHOLDS, rawClip, pictureA, pictureB} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff81-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg not on PATH'}, fn);
const Cl = (k) => ev.clips[k];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
// the scale between ffmpeg's score and the documented model (1 on 6.x): constant over every frame of every clip, read from the hard cut
const K = () => Cl('fade1').peak / Cl('fade1').model[CUT_AT];
const ALL = ['fade1', 'fade2', 'fade4', 'fade8', 'fade16', 'fade32', 'slow', 'noise', 'flash', 'double', 'cutH264', 'noiseH264'];

t('the helpers behave: mafd of two frames, the model min(mafd, change in mafd) / 100, strict selection, the pictures differ, build detection', () => {
  const a = Buffer.alloc(FS, 0), b = Buffer.alloc(FS, 0), c = Buffer.alloc(FS, 0);
  b.fill(10, 0, W * H); c.fill(10, 0, W * H); c.fill(40, 0, W * H / 2);
  const m = mafdList([a, b, c]);
  assert.deepEqual(m, [0, 10, 15]);
  assert.deepEqual(modelScores(m), [0, 0.1, 0.05]); // second jump: min(15, |15 - 10|) / 100
  assert.deepEqual(modelSelect([0, 0.1, 0.05, 0.3], 0.1), [3]); // strictly greater
  assert.equal(rawClip('fade4').length, N);
  let d = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d += Math.abs(pictureA(x, y) - pictureB(x, y));
  assert.ok(d / (W * H) > 70, 'the two pictures are far apart');
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6');
  assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('control: frame 0 scores 0 in every clip (nothing before it), and the slow drift, flat frames and identical frames score 0 where nothing jumps', () => {
  for (const k of ALL) { assert.equal(Cl(k).frames, N, k); assert.equal(Cl(k).scores[0], 0, k); }
  const f = Cl('flash').scores;
  for (const i of [1, 15, 29, 32, 50]) assert.ok(f[i] < 1e-6, `flash frame ${i}: ${f[i]}`);
});

t('reader 2 agrees with reader 1: the score is min(mafd, |mafd - previous mafd|) / 100 on every frame of all 12 clips (a constant scale of 1 on 6.x)', () => {
  const k = K();
  if (isV6()) near(k, 1, 1e-5, 'scale on 6.x');
  assert.ok(k > 0.2 && k < 5, `scale ${k}`);
  for (const name of ALL) {
    const c = Cl(name);
    for (let i = 0; i < N; i++) near(c.scores[i], Math.min(1, k * c.model[i]), 2e-6, `${name} frame ${i}`);
  }
});

t('the hard cut: the peak is at frame 30 and is the mean luma difference of the two pictures over 100 (0.773 on 6.x); it passes every threshold 0.05 to 0.5 on 6.x', () => {
  const c = Cl('fade1');
  assert.equal(c.peakAt, CUT_AT);
  near(c.peak, c.mafd[CUT_AT] / 100 * K(), 2e-6);
  if (isV6()) {
    near(c.peak, 0.773139, 1e-6);
    for (const T of THRESHOLDS.filter((x) => x > 0)) assert.deepEqual(c.selected[T].ffmpeg, [CUT_AT], `T=${T}`);
  }
});

t('cross-fades: the score of the first fade frame is the cut score divided by the length of the fade (within 6 percent), and no later frame scores above 0.01 of the cut', () => {
  const cut = Cl('fade1').peak;
  for (const L of FADES.filter((x) => x > 1)) {
    const c = Cl(`fade${L}`);
    assert.equal(c.peakAt, CUT_AT, `fade${L}`);
    near(c.peak * L / cut, 1, 0.06, `fade${L} peak x L / cut`);
    for (let i = CUT_AT + 1; i < N; i++) assert.ok(c.scores[i] < cut * 0.01, `fade${L} frame ${i}: ${c.scores[i]}`);
  }
  const peaks = FADES.map((L) => Cl(`fade${L}`).peak);
  for (let i = 1; i < peaks.length; i++) assert.ok(peaks[i] < peaks[i - 1] * 0.6, 'each doubling of the length halves the score');
});

t('threshold sweep: what select passes is what the model passes, for all 12 clips and all 7 thresholds (strictly greater than T)', () => {
  const k = K();
  for (const name of ALL) for (const T of THRESHOLDS) {
    const expect = modelSelect(Cl(name).model.map((x) => Math.min(1, k * x)), T);
    // frames whose score sits within 2e-6 of T would be ties: there are none in this fixture
    for (const s of Cl(name).scores) assert.ok(Math.abs(s - T) > 2e-6 || s === 0 || T === 0, `${name} a score sits on T=${T}`);
    assert.deepEqual(Cl(name).selected[T].ffmpeg, expect, `${name} T=${T}`);
  }
});

t('fades of 8 or more frames are never selected at T = 0.1 to 0.5 (6.x), and a 16 frame fade scores under a tenth of the cut on every build', () => {
  const cut = Cl('fade1').peak;
  for (const L of [16, 32]) assert.ok(Cl(`fade${L}`).peak < cut * 0.1, `fade${L}`);
  if (isV6()) {
    for (const L of [8, 16, 32]) for (const T of [0.1, 0.2, 0.3, 0.4, 0.5]) assert.deepEqual(Cl(`fade${L}`).selected[T].ffmpeg, [], `fade${L} T=${T}`);
    assert.deepEqual(Cl('fade2').selected[0.3].ffmpeg, [CUT_AT]);
    assert.deepEqual(Cl('fade2').selected[0.4].ffmpeg, []);
    assert.deepEqual(Cl('fade4').selected[0.1].ffmpeg, [CUT_AT]);
    assert.deepEqual(Cl('fade4').selected[0.2].ffmpeg, []);
  }
});

t('slow drift: 2 levels a frame scores 0.02 on frame 1, nothing higher after, and it is not selected at 0.1 or above', () => {
  const c = Cl('slow');
  assert.equal(c.peakAt, 1);
  assert.ok(c.peak < Cl('fade1').peak / 10);
  for (const T of [0.1, 0.2, 0.3, 0.4, 0.5]) assert.deepEqual(c.selected[T].ffmpeg, []);
  if (isV6()) near(c.peak, 0.02, 1e-6);
});

t('noisy frames: the first noisy frame scores (0.198 on 6.x), the next less, and the rest near 0 although the noise differs by more between two noisy frames than between flat and noisy', () => {
  const c = Cl('noise');
  assert.equal(c.peakAt, CUT_AT);
  assert.ok(c.scores[CUT_AT + 1] < c.peak / 2 && c.scores[CUT_AT + 1] > 0.001, 'second noisy frame scores less');
  for (let i = CUT_AT + 2; i < N; i++) assert.ok(c.scores[i] < c.peak / 10, `frame ${i}`);
  assert.ok(c.mafd[CUT_AT + 5] > c.mafd[CUT_AT] * 1.2, 'noise vs noise differs more than flat vs noise');
  assert.ok(c.scores[CUT_AT + 5] < c.scores[CUT_AT] / 10, 'and still scores far lower');
  if (isV6()) { near(c.peak, 0.198008, 1e-6); assert.deepEqual(c.selected[0.1].ffmpeg, [CUT_AT]); assert.deepEqual(c.selected[0.2].ffmpeg, []); }
});

t('a one frame flash: the jump into the flash is selected, the jump back scores 0 although the pictures differ by the same amount; two cuts four frames apart are both selected', () => {
  const f = Cl('flash');
  near(f.mafd[CUT_AT], f.mafd[CUT_AT + 1], 1e-9, 'the jump back is as big');
  assert.ok(f.scores[CUT_AT] > 0.1 * K() && f.scores[CUT_AT + 1] < 1e-6, `${f.scores[CUT_AT]} then ${f.scores[CUT_AT + 1]}`);
  const d = Cl('double');
  assert.ok(d.scores[20] > 0.1 * K() && d.scores[24] > 0.1 * K());
  near(d.scores[20], d.scores[24], 2e-6);
  if (isV6()) { assert.deepEqual(f.selected[0.3].ffmpeg, [CUT_AT]); assert.deepEqual(d.selected[0.3].ffmpeg, [20, 24]); }
});

t('through libx264 at crf 23: the cut still scores the same within 1 percent; the noise first frame scores lower than the raw noise', () => {
  near(Cl('cutH264').peak / Cl('fade1').peak, 1, 0.01);
  assert.equal(Cl('cutH264').peakAt, CUT_AT);
  assert.ok(Cl('noiseH264').peak < Cl('noise').peak * (isV6() ? 0.95 : 1), `${Cl('noiseH264').peak} vs ${Cl('noise').peak}`);
  assert.equal(Cl('noiseH264').peakAt, CUT_AT);
});

t("the idiom select='eq(n,0)+gt(scene,0.4)' keeps frame 0 and the cut (6.x)", () => {
  assert.equal(ev.idiom[0], 0);
  if (isV6()) assert.deepEqual(ev.idiom, [0, CUT_AT]);
  else assert.deepEqual(ev.idiom.includes(CUT_AT), Cl('fade1').peak > 0.4);
});
