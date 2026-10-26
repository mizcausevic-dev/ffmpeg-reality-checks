import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, METHODS, SPEEDS, RECIPE, runId, zoomSeq, lensOf, modelPos, idealPos, summarize, centroid, middle, buildOf, W, H, N, MARKS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev;
before(() => { if (ok) ev = runExperiment(); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const R = (m, s = RECIPE) => ev.runs[runId(m, s)];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (tol ${tol})`);

t('the helpers behave: accumulated zoom, integer lens, centroid and edge readers on a toy frame, the step summary, build detection', () => {
  const z = zoomSeq(0.5, 4); assert.deepEqual(z, [1.5, 1.5, 1.5, 1.5]);
  const zz = zoomSeq(0.25, 3); assert.deepEqual(zz, [1.25, 1.5, 1.5]);
  const L = lensOf(1.25, 1, true); assert.deepEqual([L.X, L.Y, L.w, L.h], [96, 54, 768, 432]);
  const L2 = lensOf(1.0015, 1, true); assert.equal(L2.X, 0); assert.equal(L2.w, 958);
  assert.equal(lensOf(1.0105, 1, true).X, 4); assert.equal(lensOf(1.0105, 1, false).X, 4); assert.equal(lensOf(1.0090, 1, true).X, 4); assert.equal(lensOf(1.0090, 1, false).X, 4);
  assert.equal(lensOf(1.0045, 1, false).X, 2); assert.equal(lensOf(1.0030, 1, false).X, 1); assert.equal(lensOf(1.0030, 1, true).X, 0);
  assert.deepEqual(idealPos(480, 270, 1.0).map((v) => v), [480.5, 270.5]);
  const toy = new Uint8Array(20 * 20).fill(98); for (let j = 8; j < 12; j++) for (let i = 5; i < 9; i++) toy[j * 20 + i] = 235;
  const c = centroid(toy, 20, 20, 7, 10, 1, 150); near(c[0], 7.0, 1e-9); near(c[1], 10.0, 1e-9);
  near(middle((i) => toy[10 * 20 + i], 7, 8, 166.5), 7.0, 1e-9);
  const s = summarize([[[0, 0], [1, 0], [0, 0], [1, 0]]]); assert.equal(s.stepRms, 1); assert.equal(s.stutter, 3); assert.equal(s.strayMax, 1);
  assert.equal(summarize([[[0, 0], [0.2, 0], [0.4, 0]]]).stutter, 0);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded and the grid is what the fixture promises: 3 speeds x 5 ways = 15 runs of 120 frames, every run exits 0, the card has three luma levels (ground, grid, markers) in that order', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(Object.keys(ev.runs).length, 15); assert.equal(SPEEDS.length * METHODS.length, 15);
  for (const r of Object.values(ev.runs)) { assert.equal(r.status, 0, runId(r.method, r.speed)); assert.equal(r.frames, N); }
  const l = ev.levels; assert.ok(l.bg < l.grid && l.grid < l.box, JSON.stringify(l)); assert.equal(l.box, l.centreBox);
  assert.equal(ev.w, W); assert.equal(ev.h, H); assert.equal(MARKS.length, 3);
});

t('which format zoompan really ran in (showinfo right after it): yuv420p as is and after a scale, yuv444p only when format=yuv444p comes first', () => {
  if (!isV6()) return;
  assert.deepEqual(ev.formats, {d420: 'yuv420p', d444: 'yuv444p', u2: 'yuv420p', u4: 'yuv420p', u8: 'yuv420p'});
});

t('control for the readers: a known sub pixel pan made without zoompan (0.25 px per frame) is found by both readers to within 0.15 px, with no stutter', () => {
  const c = ev.controls.pan; assert.equal(c.status, 0); assert.equal(c.frames, 60);
  assert.ok(c.maxErr1 <= 0.15, `reader 1 ${c.maxErr1}`); assert.ok(c.maxErr2 <= 0.15, `reader 2 ${c.maxErr2}`);
  assert.equal(c.r1.stutter, 0); assert.equal(c.r2.stutter, 0); assert.ok(c.r1.stepRms <= 0.12 && c.r2.stepRms <= 0.12);
});

t('control for the metric: a known jitter of exactly one pixel (crop alternating 0 and 1) is reported as a step error of 1.00 on every step by both readers', () => {
  const c = ev.controls.jitter; assert.equal(c.status, 0); assert.equal(c.frames, 60);
  for (const r of [c.r1, c.r2]) { near(r.stepRms, 1, 0.1); assert.equal(r.stutter, r.steps); assert.equal(r.steps, 177); near(r.strayMax, 1, 0.1); }
});

t('control for zoompan itself: with no zoom, and with a fixed zoom of 1.25 (whole even numbers), the markers do not move at all from frame to frame and sit where the ideal puts them', () => {
  for (const id of ['still', 'fixed']) {
    const c = ev.controls[id]; assert.equal(c.status, 0); assert.equal(c.frames, 60);
    for (const r of [c.r1, c.r2]) { assert.ok(r.stepRms <= 0.05, `${id} step ${r.stepRms}`); assert.equal(r.stutter, 0); assert.ok(r.strayMax <= 0.15, `${id} stray ${r.strayMax}`); }
  }
  assert.equal(ev.controls.fixed.z, 1.25);
});

t('the two readers agree on all 15 runs: every marker error differs by at most 0.3 px frame by frame, and the step rms of the two differs by at most 0.05', () => {
  for (const r of Object.values(ev.runs)) {
    const id = runId(r.method, r.speed);
    assert.ok(r.agreeMax <= 0.3, `${id} ${r.agreeMax}`); near(r.r1.stepRms, r.r2.stepRms, 0.05, id); assert.equal(r.r1.steps, 357); assert.equal(r.r2.steps, 357);
  }
});

t('the wobble: zoompan as is (yuv420p) at the recipe speed 0.0015 moves the markers 1.23 px rms off the ideal step, in 346 of 357 steps by more than half a pixel, up to 3.5 px from where a perfect zoom puts them', () => {
  if (!isV6()) return;
  const r = R('d420'); near(r.r1.stepRms, 1.23, 0.05); assert.ok(r.r1.stutter >= 340, `${r.r1.stutter}`); near(r.r1.strayMax, 3.52, 0.2); near(r.r1.stepMax, 2.51, 0.15);
  near(r.r2.stepRms, 1.23, 0.05); assert.ok(r.r2.stutter >= 340);
});

t('the centre marker, which a centred zoom should never move, is the clearest case: it steps off the ideal by 1.2 px rms at the recipe speed (the picture itself shakes, not only its edges)', () => {
  if (!isV6()) return;
  const c = R('d420').centre; near(c.r1.stepRms, 1.2, 0.1); assert.ok(c.r1.stutter >= 100); assert.equal(c.err.length, N);
  for (const m of METHODS.slice(2)) assert.ok(R(m.id).centre.r1.stepRms < c.r1.stepRms);
});

t('the mechanism: the lens is an integer rectangle (origin rounded down and to an even number in yuv420p, size rounded down). That model reproduces every measured track of all 15 runs to within 0.2 px, and the wrong alignment does not (off by 0.1 to 1.3 px rms)', () => {
  if (!isV6()) return;
  for (const r of Object.values(ev.runs)) { const id = runId(r.method, r.speed); assert.ok(r.model.max <= 0.2, `${id} max ${r.model.max}`); assert.ok(r.model.rms <= 0.1, `${id} rms ${r.model.rms}`); }
  for (const s of SPEEDS) for (const id of ['d420', 'd444']) assert.ok(R(id, s).model.otherSnapRms >= 0.9, `${id} ${s}`);
  const lens = ev.lens.map((l) => l.X); assert.deepEqual(lens, [0, 0, 2, 2, 2, 4, 4, 4, 6, 6, 6, 8]); assert.deepEqual(ev.lens.map((l) => l.w).slice(0, 4), [958, 957, 955, 954]);
});

t('what helps: at every speed the step rms falls in the order as is > format=yuv444p, scale 2x > scale 4x > scale 8x, and 8x never reaches zero', () => {
  if (!isV6()) return;
  for (const s of SPEEDS) {
    const v = (id) => R(id, s).r1.stepRms;
    assert.ok(v('d420') > v('d444') && v('d420') > v('u2') && v('d444') > v('u4') && v('u2') > v('u4') && v('u4') > v('u8'), `${s}`);
    assert.ok(v('u8') >= 0.1, `${s} u8 ${v('u8')}`); assert.ok(R('u8', s).r1.strayMax >= 0.3);
  }
  const rec = (id) => R(id).r1.stepRms; near(rec('d444'), 0.69, 0.05); near(rec('u2'), 0.72, 0.05); near(rec('u4'), 0.32, 0.05); near(rec('u8'), 0.18, 0.04);
});

t('scaling 2x first buys no more than the one line format=yuv444p: the two are within 0.1 px rms of each other at every speed, and both still stutter in most steps at the recipe speed and above', () => {
  if (!isV6()) return;
  for (const s of SPEEDS) near(R('u2', s).r1.stepRms, R('d444', s).r1.stepRms, 0.12, String(s));
  for (const s of [RECIPE, 0.004]) { assert.ok(R('d444', s).r1.stutter >= 220); assert.ok(R('u2', s).r1.stutter >= 220); }
});

t('only 8x gets the stutter below half a pixel on every step (0 of 357) at all three speeds; 4x leaves 24 to 48 of 357 steps over half a pixel', () => {
  if (!isV6()) return;
  for (const s of SPEEDS) { assert.equal(R('u8', s).r1.stutter, 0); assert.equal(R('u8', s).r2.stutter, 0); assert.ok(R('u4', s).r1.stutter >= 20 && R('u4', s).r1.stutter <= 60, `${s} ${R('u4', s).r1.stutter}`); }
});

t('speed: as is, the faster zoom wobbles more (step rms 0.75, 1.23, 1.61 for 0.0005, 0.0015, 0.004); at 8x the wobble does not depend on speed (0.16 to 0.18)', () => {
  if (!isV6()) return;
  const a = SPEEDS.map((s) => R('d420', s).r1.stepRms); assert.ok(a[0] < a[1] && a[1] < a[2], a.join());
  near(a[0], 0.75, 0.05); near(a[2], 1.61, 0.06);
  for (const s of SPEEDS) near(R('u8', s).r1.stepRms, 0.17, 0.03);
});

t('the cost of the workaround is in the input: 8x makes the card 7680x4320, 64 times the pixels of the 960x540 card that the plain run starts from', () => {
  const k = METHODS.find((m) => m.id === 'u8').k; assert.equal(k, 8); assert.equal((W * k) * (H * k) / (W * H), 64); assert.equal(W * k, 7680); assert.equal(H * k, 4320);
  assert.equal(modelPos(480, 272, 1, 1, true)[0], 480.5);
});

t('the film shows what was measured: every array of numbers in video/Scenes.tsx equals the evidence (speed and method bars, stutter counts, the lens table, the two centre tracks)', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../video/Scenes.tsx', import.meta.url), 'utf8');
  const arr = (name) => JSON.parse(src.match(new RegExp(`const ${name} = (\\[.*?\\]);`))[1].replace(/'/g, '"'));
  assert.deepEqual(arr('SPEEDS'), SPEEDS);
  assert.deepEqual(arr('SPEED_RMS'), SPEEDS.map((s) => R('d420', s).r1.stepRms));
  assert.deepEqual(arr('WAY_RMS'), METHODS.map((m) => R(m.id).r1.stepRms));
  assert.deepEqual(arr('WAY_STUTTER'), METHODS.map((m) => R(m.id).r1.stutter));
  assert.deepEqual(arr('WAY_MP'), METHODS.map((m) => Math.round((W * m.k) * (H * m.k) / 1e4) / 100));
  assert.equal(JSON.stringify(arr('CENTRE_D420')), JSON.stringify(R('d420').centre.err)); // JSON writes -0 as 0
  assert.equal(JSON.stringify(arr('CENTRE_U8')), JSON.stringify(R('u8').centre.err));
  assert.deepEqual(arr('LENS_IDEAL'), ev.lens.map((l) => Math.round(l.xIdeal * 100) / 100));
  assert.deepEqual(arr('LENS_REAL'), ev.lens.map((l) => l.X));
  assert.deepEqual(arr('LENS_W_IDEAL'), ev.lens.map((l) => Math.round(l.wIdeal * 100) / 100));
  assert.deepEqual(arr('LENS_W'), ev.lens.map((l) => l.w));
});
