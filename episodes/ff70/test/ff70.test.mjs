import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, analyse, buildOf, ANGLES, MARKERS, MARKER_AREA, W, H} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff70-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (mode, deg, size) => ev.runs[`${mode}${deg}_${size}`];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const names = MARKERS.map((m) => m.name);
const sum = (r) => names.reduce((a, n) => a + r.markers[n], 0);
const RAW = names.length * MARKER_AREA;

t('the pixel reader works on a buffer we write ourselves: fill, gray, and marker pixels in known places', () => {
  const w = 6, h = 2, b = Buffer.alloc(w * h * 3); // all fill (black)
  const put = (x, y, c) => { b[(y * w + x) * 3] = c[0]; b[(y * w + x) * 3 + 1] = c[1]; b[(y * w + x) * 3 + 2] = c[2]; };
  put(1, 0, [128, 128, 128]); put(2, 0, [255, 0, 0]); put(3, 1, [255, 255, 0]); put(4, 1, [0, 255, 0]);
  const r = analyse(b, w, h);
  assert.equal(r.nonfill, 4); assert.deepEqual(r.bbox, {x0: 1, y0: 0, x1: 4, y1: 1, w: 4, h: 2});
  assert.deepEqual(r.markers, {red: 1, lime: 1, blue: 0, yellow: 1}); assert.deepEqual(r.touches, {left: false, top: true, right: false, bottom: true});
  assert.equal(analyse(Buffer.alloc(12), 2, 2).nonfill, 0);
});

t('control: rotating by 0 keeps all 76800 pixels and all 4 markers (576 pixels each), in both readers', () => {
  const c = ev.controls.identity;
  assert.deepEqual(c.out, [W, H]); assert.equal(c.nonfill, W * H); assert.equal(c.ff.area, W * H);
  for (const n of names) assert.equal(c.markers[n], MARKER_AREA, n);
  assert.deepEqual(c.bbox, {x0: 0, y0: 0, x1: W - 1, y1: H - 1, w: W, h: H});
});

t('known positives: padding with black adds exactly 43200 black pixels (both area readers see it), and a crop that removes the sides removes all 4 markers', () => {
  const {pad, crop, padBlack} = ev.controls;
  assert.equal(padBlack, 43200); assert.equal(pad.out[0] * pad.out[1] - pad.nonfill, padBlack); assert.equal(pad.nonfill, W * H); assert.ok(Math.abs(pad.ff.area - W * H) <= 2);
  for (const n of names) assert.equal(crop.markers[n], 0, n);
});

t('the default output size is the input size (320x240) at every angle, in both sampling modes', () => {
  for (const mode of ['n', 'b']) for (const deg of ANGLES) assert.deepEqual(R(mode, deg, 'default').out, [W, H], `${mode}${deg}`);
});

t('rotate by 45 degrees at the default size cuts all 4 corner markers completely and about a fifth of the card', () => {
  for (const mode of ['n', 'b']) {
    const r = R(mode, 45, 'default');
    for (const n of names) assert.equal(r.markers[n], 0, `${mode} ${n}`);
    const big = R(mode, 45, 'big');
    const frac = r.lost / big.nonfill;
    assert.ok(frac > 0.15 && frac < 0.25, `lost fraction ${frac}`);
  }
  if (isV6()) { const r = R('n', 45, 'default'); assert.equal(r.nonfill, 62162); assert.equal(r.lost, 15643); assert.equal(R('n', 45, 'big').nonfill, 77805); }
});

t('at 15 and 60 degrees two markers are cut completely and the other two are mostly cut; at 30 degrees all four are gone', () => {
  for (const [deg, gone] of [[15, ['red', 'yellow']], [60, ['red', 'yellow']]]) for (const mode of ['n', 'b']) {
    const r = R(mode, deg, 'default');
    for (const n of gone) assert.equal(r.markers[n], 0, `${mode}${deg} ${n}`);
    for (const n of names.filter((x) => !gone.includes(x))) assert.ok(r.markers[n] < 0.2 * MARKER_AREA, `${mode}${deg} ${n} ${r.markers[n]}`);
  }
  for (const mode of ['n', 'b']) for (const n of names) assert.equal(R(mode, 30, 'default').markers[n], 0);
});

t('rotw and roth return the rotated bounding box of the card, rounded: 371x315, 397x368, 396x396, 368x397, 240x320', () => {
  for (const mode of ['n', 'b']) for (const deg of ANGLES) {
    const r = R(mode, deg, 'rotw');
    assert.deepEqual(r.out, [Math.round(r.formula.w), Math.round(r.formula.h)], `${mode}${deg}`);
  }
  assert.deepEqual([15, 30, 45, 60, 90].map((d) => R('n', d, 'rotw').out), [[371, 315], [397, 368], [396, 396], [368, 397], [240, 320]]);
});

t('at the rotw size every marker is kept (at least 95 % of its pixels, nearest; 90 % with the default bilinear) and the card keeps its shape', () => {
  for (const deg of ANGLES) {
    for (const n of names) {
      assert.ok(R('n', deg, 'rotw').markers[n] >= 0.95 * MARKER_AREA, `n${deg} ${n} ${R('n', deg, 'rotw').markers[n]}`);
      assert.ok(R('b', deg, 'rotw').markers[n] >= 0.9 * MARKER_AREA, `b${deg} ${n} ${R('b', deg, 'rotw').markers[n]}`);
    }
  }
  const big = R('n', 45, 'big'); assert.equal(big.out[0], 600); assert.ok(big.bbox.w < 400 && big.bbox.h < 400);
});

t('the rotw size loses only a handful of tip pixels (at most 12 of about 77800), the default size loses 8000 to 20000', () => {
  for (const mode of ['n', 'b']) for (const deg of ANGLES) {
    const a = R(mode, deg, 'rotw'), d = R(mode, deg, 'default');
    if (deg !== 90) assert.ok(a.lost <= 12, `${mode}${deg} lost ${a.lost}`);
    assert.ok(d.lost > 8000, `${mode}${deg} default lost ${d.lost}`);
  }
  if (isV6()) assert.deepEqual([15, 30, 45, 60].map((d) => R('n', d, 'rotw').lost), [11, 8, 7, 9]);
});

t('a sweep of square canvases at 45 degrees: the loss only falls as the canvas grows and reaches zero by 400 px; rotw (396) still clips a few pixels', () => {
  const s = ev.sweep45;
  for (let i = 1; i < s.length; i++) assert.ok(s[i].lost <= s[i - 1].lost, `${s[i].n}`);
  assert.equal(s[s.length - 1].n, 400); assert.equal(s[s.length - 1].lost, 0);
  const at396 = s.find((x) => x.n === 396); assert.ok(at396.lost > 0 && at396.lost < 20);
  if (isV6()) { assert.equal(at396.lost, 7); assert.equal(s.find((x) => x.n === 398).lost, 1); assert.equal(s.find((x) => x.n === 399).lost, 0); }
});

t('90 degrees: the default keeps a 240 wide strip and no marker, rotw and roth give 240x320 and keep all four', () => {
  const d = R('n', 90, 'default'), a = R('n', 90, 'rotw');
  assert.equal(sum(d), 0); assert.ok(d.bbox.w <= 242); assert.deepEqual(a.out, [240, 320]); assert.equal(a.nonfill, W * H); assert.equal(sum(a), RAW);
});

t('the two readers agree: signalstats area on the gray card equals the Node count of non fill pixels, within 2 pixels, in every nearest run and in the controls', () => {
  for (const [k, r] of Object.entries(ev.runs)) if (r.mode === 'n') assert.ok(Math.abs(r.ff.area - r.nonfill) <= 2, `${k} ${r.ff.area} vs ${r.nonfill}`);
  assert.ok(Math.abs(ev.controls.identity.ff.area - ev.controls.identity.nonfill) <= 2);
});

t('nearest and bilinear sample the same geometry: same output sizes and same number of non fill pixels', () => {
  for (const deg of ANGLES) for (const size of ['default', 'rotw', 'big']) {
    assert.deepEqual(R('n', deg, size).out, R('b', deg, size).out); assert.equal(R('n', deg, size).nonfill, R('b', deg, size).nonfill, `${deg} ${size}`);
  }
});

t('fillcolor: the corners take the color given, and the number of filled pixels equals the black fill count (76800 minus the card pixels that survive)', () => {
  const f = ev.fill, filled = W * H - R('n', 45, 'default').nonfill;
  assert.deepEqual(f.black.corner, [0, 0, 0, 255]); assert.deepEqual(f.white.corner, [255, 255, 255, 255]); assert.deepEqual(f.orange.corner, [255, 128, 0, 255]);
  assert.equal(f.white.count, filled); assert.equal(f.orange.count, filled);
});

t('transparent fill needs an alpha format: rgba with fillcolor=none gives alpha 0, rgba default is opaque black, yuv420p with none gives green', () => {
  const f = ev.fill;
  assert.deepEqual(f.rgba_none.corner, [0, 0, 0, 0]); assert.deepEqual(f.rgba_default.corner, [0, 0, 0, 255]);
  const g = f.yuv420p_none.corner; assert.ok(g[1] > 100 && g[0] < 20 && g[2] < 20, `corner ${g}`);
});

t('rotw can return an odd size and x264 with yuv420p refuses it; rounding up to even fixes it and keeps the markers', () => {
  const o = ev.encode.odd, e = ev.encode.even;
  assert.deepEqual(o.size, [397, 368]); assert.notEqual(o.status, 0); assert.ok(o.stderr.some((l) => /not divisible by 2/.test(l)), o.stderr.join('\n'));
  assert.equal(e.status, 0); assert.deepEqual(e.size, [398, 368]);
  for (const n of names) assert.ok(e.measure.markers[n] >= 0.9 * MARKER_AREA, `${n} ${e.measure.markers[n]}`);
});

t('records which build was measured (6.x here; exact pixel counts are asserted on 6.x only)', () => {
  assert.ok(/version/.test(ev.ffmpeg)); assert.ok(['v6', 'v8', 'other'].includes(buildOf(ev.ffmpeg)));
});
