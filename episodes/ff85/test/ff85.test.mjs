import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, analyze8, blockMeans, classesOf, idealOf, vfOf, MODES, W, H, LO, buildOf} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff85-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg not available'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const M = (n) => ev.modes[n];
const SPELLINGS = ['auto', 'bayer', 'ed', 'a_dither', 'x_dither', 'flag_ed'];
const frame = (name) => fs.readFileSync(path.join(dir, name));

t('the helpers behave: analyze8 reads runs, distinct values and error of a known 8 bit plane, block means average 2 x 2 pixels, classesOf groups equal md5s, vfOf builds the filter text, build detection', () => {
  const buf = Buffer.alloc(W * H * 3 / 2);
  for (let r = 0; r < H; r++) for (let x = 0; x < W; x++) buf[r * W + x] = 96 + (x >> 4);          // 64 flat bands of 16 pixels
  const a = analyze8(buf, idealOf('narrow'));
  assert.equal(a.distinct, 64); assert.equal(a.meanRun, 16); assert.equal(a.maxRun, 16); assert.equal(a.changesRow0, 63);
  assert.ok(Math.abs(a.bias + 0.375) < 1e-9, `${a.bias}`);                                       // truncation leaves 0.375 on average
  assert.equal(a.rowsDiffer01, 0);
  const bm = blockMeans(Uint8Array.from([1, 3, 5, 7, 2, 4, 6, 8]), 4, 2); assert.deepEqual([...bm], [2.5, 6.5]);
  assert.deepEqual(classesOf({a: 'x', b: 'y', c: 'x'}), [['a', 'c'], ['b']]);
  assert.equal(vfOf('default', 'yuv420p'), 'format=yuv420p'); assert.equal(vfOf('none', 'rgb8'), `scale=${W}:${H}:sws_dither=none,format=rgb8`);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded and the stimulus is what the fixture promises: a 1024 x 16 ten bit ramp, luma 384 + (x >> 2) (256 levels of 4 pixels), chroma flat at 512', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  const b = frame('ramp.yuv'); assert.equal(b.length, W * H * 2 * 1.5);
  const y = (r, x) => b.readUInt16LE((r * W + x) * 2);
  for (const r of [0, 7, 15]) for (let x = 0; x < W; x++) assert.equal(y(r, x), LO + (x >> 2));
  for (let i = W * H; i < W * H * 1.5; i++) assert.equal(b.readUInt16LE(i * 2), 512);
  assert.equal(new Set(Array.from({length: W}, (_, x) => y(0, x))).size, 256);
});

t('control, 10 bit to 10 bit: nothing changes, 256 distinct levels, 0 pixels differ from the stimulus, and both readers give the same md5', () => {
  assert.equal(ev.control.distinct, 256); assert.equal(ev.control.mismatches, 0);
  assert.equal(ev.control.md5Node, ev.control.md5Ffmpeg);
});

t('reader agreement: for every spelling, on yuv420p and on rgb8, the md5 that ffmpeg gives for the output frame equals the md5 Node computes from the same bytes, so both readers cut the outputs into the same equality classes', () => {
  for (const m of Object.keys(MODES)) { assert.equal(M(m).md5, M(m).md5Ffmpeg, m); }
  assert.deepEqual(ev.classes.map((c) => c.slice().sort()).sort(), ev.classesFfmpeg.map((c) => c.slice().sort()).sort());
  assert.deepEqual(ev.rgb8Classes.map((c) => c.slice().sort()).sort(), ev.rgb8ClassesFfmpeg.map((c) => c.slice().sort()).sort());
});

t('reader agreement on the level: ffmpeg area-averaging every 2 x 2 block of the output gives the same block means as Node (within 0.02 of a level on 6.1.1, within one level on other builds), and so the same error against the ideal', () => {
  for (const m of Object.keys(MODES)) {
    assert.ok(M(m).blockDiffReaders <= (isV6() ? 0.02 : 1), `${m}: ${M(m).blockDiffReaders}`);
    assert.ok(Math.abs(M(m).blockMaxErr - M(m).blockMaxErrFfmpeg) <= (isV6() ? 0.02 : 1), m);
  }
});

t('format=yuv420p does not truncate: on a 10 bit ramp it dithers, the output uses 65 values instead of 64, the mean error is 0 and the mean of every 2 x 2 block is the ideal value/4 exactly, and rows 0 and 1 differ in 512 pixels (on 6.1.1)', () => {
  const d = M('default');
  assert.ok(d.distinct <= 65 && d.distinct >= 64);
  assert.ok(d.maxErr < 1 && d.rms < 0.5);                                                         // never a whole level off
  if (isV6()) {
    assert.equal(d.distinct, 65); assert.ok(Math.abs(d.bias) < 1e-9); assert.ok(d.blockMaxErr < 1e-9); assert.equal(d.rowsDiffer01, 512);
    assert.ok(d.meanRun < 6 && d.maxRun === 14, `${d.meanRun} ${d.maxRun}`);
  }
});

t('sws_dither=none truncates: 64 flat bands of 16 pixels (every output level is floor(value / 4)), a mean error of -0.375 and a 2 x 2 block error of 0.75, worse than the default on both readers (on 6.1.1; on every build the default is no worse than none)', () => {
  const n = M('none'), d = M('default');
  assert.ok(d.blockMaxErr <= n.blockMaxErr && d.blockMaxErrFfmpeg <= n.blockMaxErrFfmpeg && d.rms <= n.rms + 1e-9);
  if (isV6()) {
    assert.equal(n.distinct, 64); assert.equal(n.meanRun, 16); assert.equal(n.maxRun, 16); assert.ok(Math.abs(n.bias + 0.375) < 1e-9); assert.equal(n.blockMaxErr, 0.75); assert.equal(n.blockMaxErrFfmpeg, 0.75);
    const b = frame('o_none.raw'); for (let r = 0; r < H; r++) for (let x = 0; x < W; x++) assert.equal(b[r * W + x], (LO + (x >> 2)) >> 2, `r${r} x${x}`);
    assert.ok(n.distinct < d.distinct && n.meanRun > d.meanRun);
  }
});

t('the dither cell is 2 x 2: on flat 10 bit tiles worth 100.0, 100.25, 100.5 and 100.75 in 8 bit the default turns 0, 1, 2 and 3 of every 4 pixels up to 101 with one single pattern repeated, and sws_dither=none turns none up (on 6.1.1); on every build the share of pixels turned up never falls as the fraction grows', () => {
  const d = ev.tiles.default, n = ev.tiles.none;
  for (let i = 1; i < 4; i++) assert.ok(d[i].upOf256 >= d[i - 1].upOf256);
  for (let i = 0; i < 4; i++) { assert.ok(n[i].upOf256 <= d[i].upOf256); assert.equal(d[i].other, 0); }
  if (isV6()) {
    assert.deepEqual(d.map((x) => x.upOf256), [0, 64, 128, 192]); assert.deepEqual(n.map((x) => x.upOf256), [0, 0, 0, 0]);
    for (const x of d) assert.equal(x.cellPatterns, 1);
    assert.deepEqual(d.map((x) => x.cell.reduce((a, b) => a + b, 0)), [0, 1, 2, 3]);
  }
});

t('the dither options do nothing for yuv420p output: sws_dither=auto, bayer, ed, a_dither, x_dither and flags=+error_diffusion give the same bytes as plain format=yuv420p, and only none differs (on 6.1.1); every spelling stays within one level of the ideal on every build', () => {
  for (const m of SPELLINGS) assert.ok(M(m).maxErr < 1, m);
  if (isV6()) {
    for (const m of SPELLINGS) assert.equal(M(m).md5, M('default').md5, m);
    assert.notEqual(M('none').md5, M('default').md5);
    assert.equal(ev.classes.length, 2); assert.equal(ev.classes.find((c) => c.includes('none')).length, 1);
  }
});

t('known positive: the same options do change the bytes for rgb8 output, so a reader that sees identical yuv420p bytes is not blind; five different outputs from eight spellings (default = auto = bayer, none, ed = flags=+error_diffusion, a_dither, x_dither) on 6.1.1, at least two on every build, in both readers', () => {
  assert.ok(ev.rgb8Classes.length >= 2 && ev.rgb8ClassesFfmpeg.length >= 2);
  if (isV6()) {
    assert.equal(ev.rgb8Classes.length, 5);
    const has = (a, b) => ev.rgb8Classes.some((c) => c.includes(a) && c.includes(b));
    assert.ok(has('default', 'auto') && has('default', 'bayer') && has('ed', 'flag_ed'));
    assert.ok(ev.rgb8Classes.some((c) => c.length === 1 && c[0] === 'none') && ev.rgb8Classes.some((c) => c.length === 1 && c[0] === 'a_dither') && ev.rgb8Classes.some((c) => c.length === 1 && c[0] === 'x_dither'));
  }
});

t('dither does not add levels, it mixes two neighbours: a full 1024 level ramp ends with 256 distinct 8 bit values with the default, with none and with ed (on 6.1.1), never more than 256 on any build, and 255 is the ceiling', () => {
  for (const m of ['default', 'none', 'ed']) { assert.ok(ev.full[m].distinct <= 256 && ev.full[m].highest <= 255, m); }
  if (isV6()) for (const m of ['default', 'none', 'ed']) { assert.equal(ev.full[m].distinct, 256); assert.equal(ev.full[m].lowest, 0); assert.equal(ev.full[m].highest, 255); }
});

t('chroma is untouched by any spelling: the U and V planes of a flat 512 (10 bit) input are 128 in every yuv420p output (exactly on 6.1.1, within one level on other builds)', () => {
  for (const m of Object.keys(MODES)) {
    const b = frame(`o_${m}.raw`); const tol = isV6() ? 0 : 1;
    for (let i = W * H; i < W * H * 1.5; i++) assert.ok(Math.abs(b[i] - 128) <= tol, `${m} byte ${i}: ${b[i]}`);
  }
});

t('the evidence is self-consistent: 8 spellings measured on the ramp, rgb8 measured for the same 8, and every yuv420p output has the size of one 1024 x 16 frame', () => {
  assert.equal(Object.keys(ev.modes).length, 8); assert.equal(Object.keys(ev.rgb8).length, 8);
  for (const m of Object.keys(MODES)) { assert.equal(frame(`o_${m}.raw`).length, W * H * 1.5); assert.equal(frame(`r_${m}.raw`).length, W * H); }
  for (const m of Object.keys(MODES)) assert.ok(ev.rgb8[m].distinct >= 2);
});
