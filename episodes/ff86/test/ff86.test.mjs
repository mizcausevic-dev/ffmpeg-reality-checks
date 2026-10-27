import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, boxOf, centroidOf, planesOf, filterOf, classesOf, SETUPS, OFFS, BW, BH, MW, MH, BASE, MARK, buildOf} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff86-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg not available'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const R = (s, x, y) => ev.setups[s][`${x},${y}`];
const ALL = OFFS.flatMap((y) => OFFS.map((x) => [x, y]));
const even = (v) => v & ~1;

t('the helpers behave: boxOf finds a box and counts, centroidOf weights by distance from the background in luma pixel units, planesOf cuts 4:2:0 and 4:4:4 frames, filterOf spells the overlay, classesOf groups, build detection', () => {
  const p = {w: 6, h: 4, data: Uint8Array.from({length: 24}, (_, i) => ((i % 6) >= 2 && (i % 6) <= 3 && i >= 6 && i < 18 ? 50 : 128))};
  assert.deepEqual(boxOf(p, (v) => v === 50), {x0: 2, y0: 1, w: 2, h: 2, n: 4});
  assert.deepEqual(boxOf(p, (v) => v === 7), {x0: -1, y0: -1, w: 0, h: 0, n: 0});
  const c = centroidOf({w: 2, h: 1, data: Uint8Array.from([130, 128])}, 128, 2); assert.equal(c.x, 0.5);   // a chroma sample 0 covers luma 0 and 1: centre 0.5
  assert.equal(planesOf(Buffer.alloc(BW * BH * 1.5), 'yuv420p').U.w, BW / 2); assert.equal(planesOf(Buffer.alloc(BW * BH * 3), 'yuv444p').U.w, BW);
  assert.equal(filterOf('d420', 1, 3), '[0:v][1:v]overlay=x=1:y=3'); assert.equal(filterOf('f444', 1, 3), '[0:v][1:v]overlay=x=1:y=3:format=yuv444');
  assert.deepEqual(classesOf({a: 'x', b: 'y', c: 'x'}), [['a', 'c'], ['b']]);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded and the stimulus is what the fixture promises: a 64 x 32 flat gray base (Y 128, U 128, V 128) and an 8 x 8 marker card (Y 50, U 200, V 60), 16 offsets from 0 to 3 in each of four setups', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  const b = fs.readFileSync(path.join(dir, 'base.yuv')), m = fs.readFileSync(path.join(dir, 'mark.yuv'));
  assert.equal(b.length, BW * BH * 1.5); assert.equal(m.length, MW * MH * 1.5);
  assert.deepEqual([b[0], b[BW * BH], b[BW * BH * 1.25]], BASE); assert.deepEqual([m[0], m[MW * MH], m[MW * MH * 1.25]], MARK);
  assert.deepEqual(Object.keys(ev.setups), Object.keys(SETUPS));
  for (const s of Object.keys(SETUPS)) assert.equal(Object.keys(ev.setups[s]).length, 16);
});

t('control: even offsets are honored exactly by plain overlay on yuv420p: the luma box starts at (x, y), the chroma box at (x/2, y/2), 8 x 8 luma and 4 x 4 chroma, every marker pixel has the marker chroma and no background pixel does, in both readers', () => {
  for (const [x, y] of [[0, 0], [2, 0], [0, 2], [2, 2]]) {
    const r = R('d420', x, y);
    assert.deepEqual([r.Y.x0, r.Y.y0, r.Y.w, r.Y.h], [x, y, 8, 8]); assert.deepEqual([r.U.x0, r.U.y0, r.U.w, r.U.h], [x / 2, y / 2, 4, 4]); assert.deepEqual([r.V.x0, r.V.y0], [x / 2, y / 2]);
    assert.equal(r.wrongChroma, 0); assert.equal(r.bgBleed, 0); assert.equal(r.Y.n, 64);
    assert.deepEqual([r.ffmpeg.Y.x0, r.ffmpeg.Y.y0, r.ffmpeg.Y.w, r.ffmpeg.Y.h], [x, y, 8, 8]); assert.deepEqual([r.ffmpeg.U.x0, r.ffmpeg.U.y0, r.ffmpeg.U.w, r.ffmpeg.U.h], [x / 2, y / 2, 4, 4]);
  }
});

t('plain overlay on yuv420p does not place the card at an odd x or y: the luma box starts at the odd value rounded down to even (x=1 gives 0, x=3 gives 2), the chroma box with it, so luma and chroma stay together and no chroma bleeds (on 6.1.1); on every build the card is at most one pixel from the request and the chroma centre is within 0.6 luma pixels of the luma centre', () => {
  for (const [x, y] of ALL) {
    const r = R('d420', x, y);
    assert.ok(Math.abs(r.Y.x0 - x) <= 1 && Math.abs(r.Y.y0 - y) <= 1, `${x},${y}`); assert.equal(r.Y.w, 8); assert.equal(r.Y.h, 8);
    assert.ok(Math.abs(r.cU.x - r.cY.x) <= 0.6 && Math.abs(r.cU.y - r.cY.y) <= 0.6, `${x},${y}`);
    if (isV6()) {
      assert.deepEqual([r.Y.x0, r.Y.y0], [even(x), even(y)]); assert.deepEqual([r.U.x0, r.U.y0, r.U.w, r.U.h], [even(x) / 2, even(y) / 2, 4, 4]); assert.deepEqual([r.V.x0, r.V.y0], [even(x) / 2, even(y) / 2]);
      assert.equal(r.wrongChroma, 0); assert.equal(r.bgBleed, 0); assert.equal(r.cU.x, r.cY.x); assert.equal(r.cU.y, r.cY.y);
    }
  }
});

t('the 16 offsets from 0 to 3 give only 4 different frames with plain overlay on yuv420p: (0,0), (1,0), (0,1) and (1,1) are the same bytes, so are the other three groups (on 6.1.1), identical in both readers; at least two offsets always collapse on every build', () => {
  assert.ok(ev.classes.d420.length < 16);
  if (isV6()) {
    assert.equal(ev.classes.d420.length, 4);
    const has = (cls, ...keys) => cls.some((c) => keys.every((k) => c.includes(k)));
    assert.ok(has(ev.classes.d420, '0,0', '1,0', '0,1', '1,1')); assert.ok(has(ev.classes.d420, '2,0', '3,0', '2,1', '3,1')); assert.ok(has(ev.classes.d420, '0,2', '1,2', '0,3', '1,3')); assert.ok(has(ev.classes.d420, '2,2', '3,2', '2,3', '3,3'));
    assert.equal(R('d420', 1, 0).md5, R('d420', 0, 0).md5);
  }
});

t('overlay=format=yuv444 puts the luma exactly at every odd offset (all 16, all builds) and gives 16 different frames (on 6.1.1), but converting back to yuv420p blurs the chroma: no marker pixel keeps exactly the marker chroma and the background around the card picks some up; the chroma centre stays within 0.25 luma pixels of the luma centre on every build', () => {
  for (const [x, y] of ALL) {
    const r = R('f444', x, y);
    assert.deepEqual([r.Y.x0, r.Y.y0, r.Y.w, r.Y.h], [x, y, 8, 8], `${x},${y}`);
    assert.ok(Math.abs(r.cU.x - r.cY.x) <= 0.25 && Math.abs(r.cU.y - r.cY.y) <= 0.25, `${x},${y}: ${r.cU.x} ${r.cY.x}`);
    if (isV6()) { assert.ok(r.wrongChroma > 0 && r.bgBleed > 0 && r.blendedU > 0, `${x},${y}`); assert.ok(r.U.w > 4 && r.U.h > 4, `${x},${y}`); }
  }
  if (isV6()) assert.equal(ev.classes.f444.length, 16);
});

t('with format=yuv422 only x is rounded down: x=1 gives 0 and x=3 gives 2 but y=1 and y=3 are honored (on 6.1.1), eight different frames from the 16 offsets', () => {
  if (isV6()) {
    for (const [x, y] of ALL) assert.deepEqual([R('f422', x, y).Y.x0, R('f422', x, y).Y.y0], [even(x), y], `${x},${y}`);
    assert.equal(ev.classes.f422.length, 8);
  }
  for (const [x, y] of ALL) assert.ok(Math.abs(R('f422', x, y).Y.y0 - y) <= 1);
});

t('known positive: with overlay=format=yuv444 kept as yuv444p, every one of the 16 offsets lands exactly at the requested position in Y, U and V in both readers, with no wrong chroma, and gives 16 different frames; so a reader that sees the odd offset rounded in yuv420p is not blind to odd positions', () => {
  for (const [x, y] of ALL) {
    const r = R('e444', x, y);
    for (const P of ['Y', 'U', 'V']) assert.deepEqual([r[P].x0, r[P].y0, r[P].w, r[P].h], [x, y, 8, 8], `${P} ${x},${y}`);
    for (const P of ['Y', 'U', 'V']) assert.deepEqual([r.ffmpeg[P].x0, r.ffmpeg[P].y0, r.ffmpeg[P].w, r.ffmpeg[P].h], [x, y, 8, 8], `ffmpeg ${P} ${x},${y}`);
    assert.equal(r.wrongChroma, 0); assert.equal(r.bgBleed, 0);
  }
  assert.equal(ev.classes.e444.length, 16);
});

t('reader agreement: for all 64 frames the md5 ffmpeg gives equals the md5 Node computes, the equality classes are the same, the ffmpeg profile box of Y equals the Node box everywhere, and of U and V equals it in yuv420p plain overlay and in yuv444p (in the blurred setups the ffmpeg box lies inside the Node box)', () => {
  for (const s of Object.keys(SETUPS)) {
    for (const r of Object.values(ev.setups[s])) {
      assert.equal(r.md5, r.md5Ffmpeg, `${s} ${r.x},${r.y}`);
      assert.deepEqual([r.ffmpeg.Y.x0, r.ffmpeg.Y.y0, r.ffmpeg.Y.w, r.ffmpeg.Y.h], [r.Y.x0, r.Y.y0, r.Y.w, r.Y.h], `Y ${s} ${r.x},${r.y}`);
      for (const P of ['U', 'V']) {
        const a = r[P], b = r.ffmpeg[P];
        if (s === 'd420' || s === 'e444') assert.deepEqual([b.x0, b.y0, b.w, b.h], [a.x0, a.y0, a.w, a.h], `${P} ${s} ${r.x},${r.y}`);
        else assert.ok(b.x0 >= a.x0 && b.y0 >= a.y0 && b.x0 + b.w <= a.x0 + a.w && b.y0 + b.h <= a.y0 + a.h && b.w > 0, `${P} ${s} ${r.x},${r.y}`);
      }
    }
    assert.deepEqual(ev.classes[s].map((c) => c.slice().sort()).sort(), ev.classesFfmpeg[s].map((c) => c.slice().sort()).sort(), s);
  }
});

t('negative offsets are rounded down to even too: x=-1 and x=-2 both show 6 of the 8 luma columns (and 3 of 4 chroma columns), x=-3 shows 4 (and 2) (on 6.1.1); on every build the visible width is between 8 + x - 1 and 8 + x', () => {
  for (const x of [-1, -2, -3]) { const r = ev.neg[x]; assert.ok(r.Y.w >= 8 + x - 1 && r.Y.w <= 8 + x, `${x}: ${r.Y.w}`); assert.equal(r.Y.x0, 0); }
  if (isV6()) { assert.equal(ev.neg[-1].Y.w, 6); assert.equal(ev.neg[-2].Y.w, 6); assert.equal(ev.neg[-3].Y.w, 4); assert.equal(ev.neg[-1].U.w, 3); assert.equal(ev.neg[-3].U.w, 2); }
});

t('the evidence is self-consistent: every setup measured at 16 offsets, every raw frame has the size of its pixel format, the marker always covers 64 luma pixels in the full frame setups', () => {
  for (const [s, cfg] of Object.entries(SETUPS)) {
    for (const [x, y] of ALL) {
      const f = fs.readFileSync(path.join(dir, `o_${s}_${x}_${y}.raw`));
      assert.equal(f.length, cfg.out === 'yuv444p' ? BW * BH * 3 : BW * BH * 1.5);
      assert.equal(R(s, x, y).Y.n, 64);
    }
  }
});
