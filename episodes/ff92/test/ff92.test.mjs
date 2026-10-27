import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, makeSource, cutsIn, lumaAt, readH264, buildOf, W, H, N, FPS, FSZ, CUTS, KEYINT, SWEEP} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff92-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const cell = (k) => { const r = ev.cells[k] ?? ev.sweep[k]; assert.ok(r, `${k} missing`); assert.equal(r.status, 0, `${k}: ${r.err}`); return r; };
const CELLS = () => Object.keys(ev.cells);
// the rule as a model: an I frame at a cut is an IDR (a keyframe) only if it is at least min-keyint frames after the last IDR
const model = (min) => { const k = [0]; for (const c of CUTS) if (c - k.at(-1) >= min) k.push(c); return k; };

t('the helpers behave: the picture slides one pixel per frame inside a scene and changes at a cut, the source reader finds the cuts, the bit reader decodes exp-Golomb, build detection', () => {
  assert.equal(lumaAt(5, 7, 10, CUTS), lumaAt(4, 7, 11, CUTS)); assert.notEqual(lumaAt(5, 7, 59, CUTS), lumaAt(4, 7, 60, CUTS)); assert.ok(lumaAt(0, 0, 0, CUTS) >= 16 && lumaAt(0, 0, 0, CUTS) <= 215);
  const src = makeSource(CUTS); assert.equal(src.length, FSZ * N); assert.deepEqual(cutsIn(src), CUTS); assert.deepEqual(cutsIn(makeSource([])), []);
  // an I slice of an IDR NAL: header 0x65, first_mb ue=0 ('1'), slice_type ue=7 ('0001000') -> bits 1 0001000 -> 0x88; a P slice of a non-IDR NAL: header 0x41, first_mb 0, slice_type ue=5 ('00110') -> 1 00110 -> 0x98
  const aus = readH264(Buffer.from([0, 0, 0, 1, 0x65, 0x88, 0x80, 0, 0, 1, 0x41, 0x9a, 0x80, 0, 0, 1, 0x41, 0x9a, 0x80]));
  assert.deepEqual(aus, [{idr: true, sliceType: 'I'}, {idr: false, sliceType: 'P'}, {idr: false, sliceType: 'P'}]);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8'); assert.equal(KEYINT, 250); assert.equal(N / FPS, 12);
});

t('ffmpeg -version is recorded, and the source clips are what the fixture promises: 300 frames, three hard cuts at frames 60, 130 and 210, and a control with none (found from the raw bytes)', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.deepEqual(ev.src.cuts, {frames: N, cuts: CUTS}); assert.deepEqual(ev.src.still, {frames: N, cuts: []});
});

t('four readers of the same file agree in every run: ffprobe packet K flags, ffprobe frame key_frame and the NAL type 5 slices found in Node name the same frames (the keyframes), and ffprobe pict_type I, the slice_type I slices found in Node and x264\'s own count name the same I frames; 300 packets, 300 frames, 300 access units', () => {
  const all = [...CELLS(), ...SWEEP.map(String)];
  assert.equal(all.length, 10 + 5);
  for (const k of all) {
    const r = cell(k);
    assert.equal(r.packets, N, k); assert.equal(r.frames, N, k); assert.equal(r.aus, N, k);
    assert.deepEqual(r.kFlags, r.keyFrameFlag, `${k} K flags vs key_frame`); assert.deepEqual(r.kFlags, r.idr, `${k} K flags vs NAL type 5`);
    assert.deepEqual(r.iFrames, r.sliceI, `${k} pict_type I vs slice_type I`); assert.equal(r.x264I, r.iFrames.length, `${k} x264 summary`);
    assert.equal(r.kFlags[0], 0, k); assert.ok(r.kFlags.every((v) => r.iFrames.includes(v)), `${k} every keyframe is an I frame`);
  }
});

t('control: without a cut every setting gives the same two keyframes, 0 and 250 (-g 250 on a 300 frame clip), so the settings only matter at the cuts', () => {
  for (const c of ['default', 'sc0', 'x264sc0', 'keyintmin', 'x264min']) { const r = cell(`still|${c}`); assert.deepEqual(r.kFlags, [0, KEYINT], c); assert.deepEqual(r.iFrames, [0, KEYINT], c); }
});

t('defaults with -g 250: every hard cut becomes a keyframe (an IDR), 0, 60, 130 and 210, and frame 250 is not one: the last keyframe is at 210, so the next is due at 460, after the end of the clip', () => {
  const r = cell('cuts|default');
  for (const c of [0, ...CUTS]) assert.ok(r.kFlags.includes(c), `${c} is a keyframe`);
  assert.ok(!r.kFlags.includes(KEYINT)); assert.deepEqual(r.kFlags, [0, ...CUTS]); assert.deepEqual(r.iFrames, [0, ...CUTS]); assert.equal(r.x264I, 4);
});

t('-sc_threshold 0 and -x264-params scenecut=0 are the same file (the same size for every one of the 300 packets): no cut is a keyframe, the only keyframes are 0 and 250, in the middle of the last scene', () => {
  const a = cell('cuts|sc0'), b = cell('cuts|x264sc0');
  assert.equal(a.sizesHash, b.sizesHash); assert.equal(a.total, b.total); assert.deepEqual(a.kFlags, b.kFlags);
  for (const c of CUTS) assert.ok(!a.kFlags.includes(c), `${c}`); assert.ok(a.kFlags.includes(KEYINT)); assert.deepEqual(a.kFlags, [0, KEYINT]); assert.ok(KEYINT > CUTS.at(-1));
});

t('-keyint_min 250 and -x264-params keyint=250:min-keyint=250 are the same file: the cuts are still coded as I frames (4 in all), but only 2 of them are keyframes, so the count of I frames and the count of K flags differ: I at 0, 60, 130, 210; keyframes at 0 and 130 (6.1.1 exact)', () => {
  const a = cell('cuts|keyintmin'), b = cell('cuts|x264min');
  assert.equal(a.sizesHash, b.sizesHash); assert.deepEqual(a.kFlags, b.kFlags);
  assert.ok(a.iFrames.length > a.kFlags.length, `${a.iFrames.length} I frames, ${a.kFlags.length} keyframes`); assert.ok(CUTS.every((c) => a.iFrames.includes(c)), 'every cut is an I frame');
  assert.ok(a.kFlags.length < 1 + CUTS.length, 'not every cut is a keyframe');
  if (isV6()) { assert.deepEqual(a.iFrames, [0, 60, 130, 210]); assert.deepEqual(a.kFlags, [0, 130]); assert.equal(a.x264I, 4); }
});

t('the rule, from the -keyint_min sweep (25, 60, 61, 126, 250): an I frame at a cut is a keyframe only if it is at least min-keyint frames after the last keyframe; the number of keyframes never grows with min-keyint, the I frames stay 0, 60, 130, 210, and 250 gives the same file as 126', () => {
  let prev = Infinity;
  for (const m of SWEEP) {
    const r = cell(String(m)); assert.ok(r.kFlags.length <= prev, `${m}`); prev = r.kFlags.length; assert.deepEqual(r.iFrames, [0, ...CUTS], `${m} I frames`);
    if (isV6()) assert.deepEqual(r.kFlags, model(Math.min(m, 126)), `${m}`);
  }
  assert.equal(cell('126').sizesHash, cell('250').sizesHash);
  if (isV6()) { assert.deepEqual(SWEEP.map((m) => cell(String(m)).kFlags.length), [4, 4, 3, 2, 2]); assert.deepEqual(cell('61').kFlags, [0, 130, 210]); }
});

t('what scenecut costs, 6.1.1 exact: with the cuts coded without a keyframe the file is larger (85876 bytes against 78511); the three types of a default encode are 4 I, 77 P and 219 B', () => {
  const d = cell('cuts|default'), s = cell('cuts|sc0');
  if (isV6()) { assert.equal(d.total, 78511); assert.equal(s.total, 85876); assert.ok(s.total > d.total); assert.deepEqual(d.types, {I: 4, B: 219, P: 77}); }
  if (buildOf(ev.ffmpeg) === 'v8') { assert.equal(d.total, 84844); assert.equal(s.total, 93838); assert.ok(s.total > d.total); assert.deepEqual(d.types, {I: 4, B: 219, P: 77}); }
  assert.equal(d.types.I + (d.types.P ?? 0) + (d.types.B ?? 0), N);
});

t('known negatives: B frames off, other presets, open GOP, other encoders and real footage are not in this fixture (default preset medium with its B frames, a closed GOP)', () => {
  for (const k of CELLS()) assert.ok(cell(k).types.B > 0, `${k}: the default encode has B frames`);
});
