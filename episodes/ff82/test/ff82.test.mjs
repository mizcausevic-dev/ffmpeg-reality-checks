import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, lumaTh, blackShare, nodeIntervals, buildOf, flat, rawClip, fadeLuma, W, H, FS, FPS, GRAY, BLACK, FADE_AT, FADE_LEN, LEVELS, PARTIAL_ROWS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff82-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg not on PATH'}, fn);
const Cl = (k) => ev.clips[k];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const run = (clip, o) => Cl(clip).runs.find((r) => Object.entries(o).every(([k, v]) => r.opts[k] === v));
const one = (r) => { assert.equal(r.ffmpeg.length, 1, JSON.stringify(r)); return r.ffmpeg[0]; };
const FADE_START = FADE_AT / FPS; // 1.0 s

t('the helpers behave: the luma bound 16 + 219 * pix_th, the black share, runs and the d filter, the ramp, build detection', () => {
  assert.deepEqual([0, 0.05, 0.1, 0.2, 0.5, 1].map(lumaTh), [16, 26, 37, 59, 125, 235]);
  const half = Buffer.alloc(FS, 128); half.fill(20, 0, (W * H) / 2); half.fill(200, (W * H) / 2, W * H);
  assert.equal(blackShare(half, 0.1), 0.5);
  assert.equal(blackShare(flat(37), 0.1), 1);
  assert.equal(blackShare(flat(38), 0.1), 0);
  const frames = [flat(200), flat(10), flat(10), flat(200), flat(10)];
  assert.deepEqual(nodeIntervals(frames, {pix_th: 0.1, pic_th: 0.98, d: 0}).map((i) => [i.start, i.end]), [[0.04, 0.12], [0.16, 0.2]]);
  assert.deepEqual(nodeIntervals(frames, {pix_th: 0.1, pic_th: 0.98, d: 0.08}).map((i) => [i.start, i.end]), [[0.04, 0.12]]);
  assert.equal(fadeLuma(24), GRAY); assert.equal(fadeLuma(FADE_AT + FADE_LEN - 1), BLACK); assert.equal(fadeLuma(FADE_AT + FADE_LEN), BLACK);
  assert.equal(rawClip('fadeOut').length, 125); assert.equal(rawClip('partial').length, 200); assert.equal(rawClip('levels').length, 170);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6');
  assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('control: the luma Node reads back from every clip is the luma it wrote, the fade is a strictly falling ramp and the flat frames have a black share of exactly 0 or 1', () => {
  for (const k of ['fadeOut', 'fadeEnd', 'partial', 'levels']) assert.equal(Cl(k).lumaDiff, 0, k);
  assert.equal(Cl('fadeOut').frames, 125); assert.equal(Cl('fadeEnd').frames, 100);
  const l = Cl('fadeOut').luma;
  assert.equal(l[0], GRAY); assert.equal(l[FADE_AT - 1], GRAY);
  for (let k = FADE_AT; k < FADE_AT + FADE_LEN - 1; k++) assert.ok(l[k] > l[k + 1], `fade frame ${k}: ${l[k]} then ${l[k + 1]}`);
  assert.equal(l[FADE_AT + FADE_LEN - 1], BLACK); assert.equal(l[99], BLACK); assert.equal(l[100], GRAY);
  for (const k of [0, 30, 50, 74, 80, 110]) { const s = blackShare(rawClip('fadeOut')[k], 0.1); assert.ok(s === 0 || s === 1, `frame ${k}: ${s}`); }
});

t('the default run (no options) prints nothing for a fade to black that leaves 1.28 s of black, and it is the same as pix_th 0.1, pic_th 0.98, d 2', () => {
  const d = run('fadeOut', {defaults: true}), e = run('fadeOut', {pix_th: 0.1, pic_th: 0.98, d: 2});
  assert.deepEqual(d.ffmpeg, []); assert.deepEqual(e.ffmpeg, []);
  const lenient = one(run('fadeOut', {pix_th: 0.1, pic_th: 0.98, d: 0}));
  near(lenient.duration, 1.28, 0.0001, 'the black that the default settings miss'); // 1.28 s of black, below the 2 s default
  assert.ok(lenient.duration < 2);
});

t('d: a black stretch is reported when its length reaches d (1.28 s passes d 1.2, fails d 1.5), and the three numbers add up', () => {
  for (const d of [0, 0.5, 1, 1.2]) { const r = one(run('fadeOut', {pix_th: 0.1, d})); near(r.end - r.start, r.duration, 0.0051, `d ${d}`); near(r.duration, 1.28, 0.0001); }
  for (const d of [1.5, 2]) assert.deepEqual(run('fadeOut', {pix_th: 0.1, d}).ffmpeg, [], `d ${d}`);
  const r = one(run('fadeOut', {pix_th: 0.1, d: 0.5}));
  if (isV6()) { assert.equal(r.start, 2.72); assert.equal(r.end, 4); assert.equal(r.duration, 1.28); }
});

t('pix_th: a pixel is black at or below luma 16 + 219 * pix_th (not 10 percent of 255), so black_start is the first fade frame at or below that level', () => {
  const rows = [0, 0.05, 0.1, 0.2, 0.3, 0.5].map((pix_th) => ({pix_th, th: lumaTh(pix_th), r: one(run('fadeOut', {pix_th, d: 0.5}))}));
  for (const {pix_th, th, r} of rows) {
    const first = rawClip('fadeOut').map((_, k) => fadeLuma(k)).findIndex((v) => v <= th);
    near(r.start, first / FPS, 0.0001, `pix_th ${pix_th}`);
    assert.ok(fadeLuma(first - 1) > th, `frame before ${first} is above ${th}`);
    near(r.end, 4, 0.0001, `pix_th ${pix_th} end`); // the first gray frame after the black
  }
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].r.start < rows[i - 1].r.start, 'a higher pix_th starts the black earlier');
  assert.equal(lumaTh(0.1), 37); assert.notEqual(lumaTh(0.1), Math.floor(0.1 * 255));
  if (isV6()) assert.deepEqual(rows.map((x) => x.r.start), [2.96, 2.84, 2.72, 2.44, 2.2, 1.64]);
});

t('the black starts well after the fade does: at the default pix_th the start is 1.72 s into a 2 s fade, but at the fade end only if pix_th is 0', () => {
  const def = one(run('fadeOut', {pix_th: 0.1, d: 0.5})), zero = one(run('fadeOut', {pix_th: 0, d: 0.5}));
  const fadeEnd = (FADE_AT + FADE_LEN - 1) / FPS;
  assert.ok(def.start > FADE_START && def.start < fadeEnd);
  assert.ok(def.start - FADE_START > 1.5, `${def.start - FADE_START}`);
  near(zero.start, fadeEnd, 0.0001); // pix_th 0: only luma 16 itself, the very last fade frame
  if (isV6()) near(def.start - FADE_START, 1.72, 0.0001);
});

t('Node and ffmpeg agree on every run of the fade, partial and levels clips: same stretches, same start, end and duration', () => {
  let n = 0;
  for (const k of ['fadeOut', 'partial', 'levels', 'fadeX264']) {
    for (const r of Cl(k).runs) {
      assert.equal(r.ffmpeg.length, r.node.length, `${k} ${JSON.stringify(r.opts)}`);
      r.ffmpeg.forEach((a, i) => { near(a.start, r.node[i].start, 0.0001); near(a.end, r.node[i].end, 0.0001); near(a.duration, r.node[i].duration, 0.0001); n++; });
    }
  }
  assert.ok(n >= 40, `only ${n} stretches compared`);
});

t('pic_th: a picture is black when its share of black pixels reaches pic_th, so 88 black rows of 90 (0.978) is not black at the default 0.98', () => {
  const shares = PARTIAL_ROWS.map((rows) => blackShare(rawClip('partial')[25 + PARTIAL_ROWS.indexOf(rows) * 25 + 3], 0.1));
  assert.deepEqual(shares.map((s) => Number(s.toFixed(4))), [1, 0.9778, 0.9556, 0.9, 0.8, 0.6]);
  const ends = [0.5, 0.7, 0.85, 0.92, 0.95, 0.97, 0.98, 0.99, 1].map((pic_th) => { const r = run('partial', {pic_th}); return r.ffmpeg.length ? one(r).end : null; });
  for (let i = 1; i < ends.length; i++) assert.ok(ends[i] <= ends[i - 1], `a stricter pic_th cannot black out more: ${ends}`);
  const def = one(run('partial', {pic_th: 0.98})); near(def.start, 1, 0.0001); near(def.end, 2, 0.0001); // only the all-black run
  const loose = one(run('partial', {pic_th: 0.97})); near(loose.end, 3, 0.0001); // 0.9778 reaches 0.97
  const widest = one(run('partial', {pic_th: 0.5})); near(widest.end, 7, 0.0001); // even 0.6 reaches 0.5
  assert.deepEqual(ends.map((e) => Math.round(e)), [7, 6, 5, 4, 4, 3, 2, 2, 2]);
});

t('pic_th equal to the share counts (a fully black picture is black at pic_th 1), and a stricter pic_th never adds black', () => {
  const r = one(run('partial', {pic_th: 1}));
  near(r.start, 1, 0.0001); near(r.duration, 1, 0.0001);
});

t('levels: at the default pix_th a flat frame at luma 37 is black and luma 38 is not; the number of black stretches follows the bound', () => {
  const count = (pix_th) => run('levels', {pix_th}).ffmpeg.length;
  assert.deepEqual([0, 0.05, 0.1, 0.15, 0.2, 0.3].map(count), [1, 2, 5, 9, 9, 10]);
  const at = (pix_th) => run('levels', {pix_th}).ffmpeg.length;
  assert.equal(LEVELS.filter((v) => v <= lumaTh(0.1)).length, at(0.1)); // 16, 24, 32, 36, 37
  assert.equal(LEVELS[at(0.1) - 1], 37); assert.equal(LEVELS[at(0.1)], 38);
  for (const pix_th of [0, 0.05, 0.1, 0.15, 0.2, 0.3]) assert.equal(at(pix_th), LEVELS.filter((v) => v <= lumaTh(pix_th)).length, `pix_th ${pix_th}`);
});

t('a clip that ends in black: the stretch is closed at the last frame (one frame short of the clip end on 6.x), never later than the clip end, with the same start', () => {
  const r = one(run('fadeEnd', {d: 0.5})), cut = one(run('fadeOut', {pix_th: 0.1, d: 0.5}));
  near(r.start, cut.start, 0.0001);
  const clipEnd = Cl('fadeEnd').frames / FPS;
  assert.ok(r.end >= clipEnd - 1 / FPS - 0.0001 && r.end <= clipEnd + 0.0001, `end ${r.end}, clip end ${clipEnd}`);
  if (isV6()) { assert.equal(r.end, 3.96); assert.equal(r.duration, 1.24); }
  assert.deepEqual(run('fadeEnd', {d: 0}).ffmpeg, [r]);
});

t('a lossy encode of flat frames does not move the black: the libx264 crf 23 fade starts within two frames of the raw one', () => {
  const raw = one(run('fadeOut', {pix_th: 0.1, d: 0.5})), enc = one(run('fadeX264', {pix_th: 0.1, d: 0.5}));
  near(enc.start, raw.start, 2 / FPS); near(enc.end, raw.end, 2 / FPS);
  const model = nodeIntervals(rawClip('fadeOut'), {pix_th: 0.02, pic_th: 0.98, d: 0.5})[0], enc2 = one(run('fadeX264', {pix_th: 0.02, d: 0.5}));
  near(enc2.start, model.start, 2 / FPS); near(enc2.end, model.end, 2 / FPS);
});
