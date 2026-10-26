import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, CASES, ROUNDS, rkey, pictureOf, lostOf, inter, boxOf, buildOf, W, H, LIMIT} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev;
before(() => { if (ok) ev = runExperiment(); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const R = (id, r) => ev.cases[id].runs[rkey(r)];
const g = (id, r) => { const x = R(id, r).log; return `${x.w}x${x.h}@${x.x},${x.y}`; };
const lcm = (a, b) => { let x = a, y = b; while (y) [x, y] = [y, x % y]; return (a * b) / x; };
const allRuns = () => CASES.flatMap((c) => ROUNDS.map((r) => ({c, r, x: R(c.id, r)})));

t('the helpers behave: picture box, lost rows, intersection, a toy luma scan, build detection', () => {
  assert.deepEqual(pictureOf({T: 1, B: 1, L: 0, R: 0}), {x: 0, y: 1, w: 1920, h: 1078});
  assert.deepEqual(lostOf({x: 0, y: 1, w: 1920, h: 1078}, {x: 0, y: 4, w: 1920, h: 1072}), {top: 3, bottom: 3, left: 0, right: 0});
  assert.deepEqual(lostOf({x: 0, y: 0, w: 4, h: 4}, {x: 0, y: 0, w: 8, h: 8}), {top: 0, bottom: 0, left: 0, right: 0});
  assert.equal(inter({x: 0, y: 1, w: 10, h: 10}, {x: 5, y: 5, w: 10, h: 10}), 5 * 6);
  const toy = new Uint8Array(6 * 4).fill(16); toy[1 * 6 + 2] = 126; toy[2 * 6 + 3] = 126;
  assert.deepEqual(boxOf(toy, 6, 4, 24), {x: 2, y: 1, w: 2, h: 2});
  assert.equal(boxOf(new Uint8Array(24).fill(16), 6, 4, 24), null);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded and the grid is what the fixture promises: 1920x1080, 10 bar layouts x 9 values of round = 90 runs, every run exits 0 and prints a crop line', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(CASES.length, 10); assert.equal(ROUNDS.length, 9); assert.equal(allRuns().length, 90);
  for (const {c, r, x} of allRuns()) { assert.equal(x.status, 0, `${c.id} ${rkey(r)}`); assert.ok(x.log, `${c.id} ${rkey(r)}`); assert.ok(x.logLines >= 1); }
});

t('control for reader 2: the pixel scan finds exactly the picture that was drawn, in all 10 layouts (odd and even bars, none at all, side bars); bars are luma 16 and the picture 126, either side of the limit 24', () => {
  for (const c of CASES) {
    const r = ev.cases[c.id];
    assert.deepEqual(r.scan, pictureOf(c), c.id);
    if (r.barLuma) { assert.ok(r.barLuma[1] <= LIMIT, c.id); assert.deepEqual(r.barLuma, [16, 16]); }
    assert.ok(r.pictureLuma[0] > LIMIT, c.id); assert.deepEqual(r.pictureLuma, [126, 126]);
  }
  assert.equal(ev.limit, 24); assert.equal(ev.w, W); assert.equal(ev.h, H);
});

t('the two readers agree on all 90 runs: the log line equals the frame metadata, and the picture pixels thrown away (counted in the cropped frame decoded in Node) equal the area the crop box misses, with no black pixel kept anywhere', () => {
  for (const {c, r, x} of allRuns()) {
    const id = `${c.id} ${rkey(r)}`;
    assert.deepEqual(x.log, x.meta, id);
    const truth = ev.cases[c.id].truth;
    assert.equal(x.picturePixelsLost, truth.w * truth.h - inter(truth, x.log), id);
    assert.equal(x.blackPixelsKept, 0, id);
    assert.equal(x.applied.area, x.log.w * x.log.h, id);
  }
});

t('known positive: bars of 140 and 140 (an 800 row picture, a multiple of 16) give an exact crop at the default and at every value of round except 3; the readers see 0 rows lost', () => {
  for (const r of ROUNDS) {
    const x = R('exact', r);
    if (r === 3) { assert.equal(x.lostRows, 2); continue; }
    assert.equal(g('exact', r), '1920x800@0,140', rkey(r)); assert.equal(x.lostRows + x.lostCols, 0); assert.equal(x.picturePixelsLost, 0);
  }
});

t('the question: a 1078 row picture (1 row of black above and below) at the default comes back as crop 1920:1072:0:4, 6 rows of picture lost (3 above, 3 below, 11520 pixels), and no black kept', () => {
  assert.equal(ev.cases.one.truth.h, 1078);
  const x = R('one', null);
  assert.equal(g('one', null), '1920x1072@0,4'); assert.deepEqual(x.lost, {top: 3, bottom: 3, left: 0, right: 0}); assert.equal(x.picturePixelsLost, 6 * 1920); assert.equal(x.blackPixelsKept, 0);
  assert.equal(g('one', 16), g('one', null));
});

t('rule 1, down not nearest: at every value of round from 2 up, width and height come out as multiples of round (and of 2), never larger than the picture, and the crop never reaches into the bars', () => {
  for (const {c, r, x} of allRuns()) {
    if (r === null || r < 2) continue;
    const truth = ev.cases[c.id].truth;
    assert.equal(x.log.w % r, 0, `${c.id} ${r}`); assert.equal(x.log.h % r, 0, `${c.id} ${r}`); assert.equal(x.log.w % 2, 0); assert.equal(x.log.h % 2, 0);
    assert.ok(x.log.w <= truth.w && x.log.h <= truth.h, `${c.id} ${r}`);
    assert.ok(x.lostRows <= lcm(2, r) + 1 && x.lostCols <= lcm(2, r) + 1, `${c.id} ${r}`);
  }
  if (!isV6()) return;
  for (const c of CASES) assert.equal(R(c.id, 16).log.h, Math.floor(ev.cases[c.id].truth.h / 16) * 16, c.id);
});

t('a frame with no bars at all loses 8 rows at the default: crop 1920:1072:0:4 from 1080 rows, while round=2 gives the full 1920:1080:0:0', () => {
  assert.equal(ev.cases.none.scan.h, 1080);
  assert.equal(g('none', null), '1920x1072@0,4'); assert.equal(R('none', null).lostRows, 8); assert.equal(R('none', null).picturePixelsLost, 8 * 1920);
  assert.equal(g('none', 2), '1920x1080@0,0'); assert.equal(R('none', 2).lostRows, 0);
});

t('rule 2, round=0 and round=1 are not exact: in all 10 layouts they give the same crop as the default 16 (build 6.1.1; a different build may change this)', () => {
  if (!isV6()) return;
  for (const c of CASES) { assert.equal(g(c.id, 0), g(c.id, null), c.id); assert.equal(g(c.id, 1), g(c.id, null), c.id); assert.equal(g(c.id, 16), g(c.id, null), c.id); }
});

t('rule 3, offsets are even: x and y of every run are even numbers, and with round=2 each odd bar costs exactly one row or column of picture (2 rows at 1 and 1, 1 row at 3 and 10, 2 columns at 141 and 141), each even bar costs none', () => {
  for (const {x} of allRuns()) { assert.equal(x.log.x % 2, 0); assert.equal(x.log.y % 2, 0); }
  if (!isV6()) return;
  for (const c of CASES) {
    const x = R(c.id, 2);
    assert.deepEqual(x.lost, {top: c.T % 2, bottom: c.B % 2, left: c.L % 2, right: c.R % 2}, c.id);
  }
  assert.equal(R('one', 2).lostRows, 2); assert.equal(R('asym', 2).lostRows, 1); assert.equal(R('pillar', 2).lostCols, 2);
  assert.equal(g('one', 2), '1920x1076@0,2');
});

t('the even offset is not about the pixel format: gray, yuv444p and yuv420p frames with a 3 row top bar and a 1 row bottom bar give the same crop at round=2 (1920x1074 at y=4)', () => {
  if (!isV6()) return;
  for (const pf of ['gray', 'yuv444p', 'yuv420p']) assert.deepEqual(ev.pixfmt[pf], {w: 1920, h: 1074, x: 0, y: 4}, pf);
});

t('the numbers in the film: the default throws picture away in 9 of 10 layouts (rows+columns 6, 4, 14, 11, 4, 14, 0, 8, 14, 18), round=2 in 6 of 10 (2, 0, 2, 1, 0, 2, 0, 0, 2, 2), the worst case 14 rows (bars of 5 and 5, and of 141 and 141), and round=32 on the 1078 row picture crops to 1056 (22 rows lost)', () => {
  if (!isV6()) return;
  const lostOf2 = (r) => CASES.map((c) => R(c.id, r).lostRows + R(c.id, r).lostCols);
  assert.deepEqual(lostOf2(null), [6, 4, 14, 11, 4, 14, 0, 8, 14, 18]);
  assert.deepEqual(lostOf2(2), [2, 0, 2, 1, 0, 2, 0, 0, 2, 2]);
  assert.equal(lostOf2(null).filter((n) => n > 0).length, 9); assert.equal(lostOf2(2).filter((n) => n > 0).length, 6);
  assert.equal(R('five', null).lostRows, 14); assert.equal(R('odd141', null).lostRows, 14);
  assert.equal(g('one', 32), '1920x1056@0,12'); assert.equal(R('one', 32).lostRows, 22);
  assert.equal(g('one', 3), '1920x1074@0,4');
});

t('the film shows what was measured: the arrays of numbers in video/Scenes.tsx are the evidence (lost rows and columns by layout at the default and at round=2, by value of round on the 1078 row picture, and the crop heights)', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../video/Scenes.tsx', import.meta.url), 'utf8');
  const arr = (name) => JSON.parse(src.match(new RegExp(`const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
  const sum = (r) => CASES.map((c) => R(c.id, r).lostRows + R(c.id, r).lostCols);
  assert.deepEqual(arr('LOST_DEFAULT'), sum(null)); assert.deepEqual(arr('LOST_ROUND2'), sum(2));
  assert.deepEqual(arr('ROUND_LOST'), ROUNDS.map((r) => R('one', r).lostRows));
  assert.deepEqual(arr('ROUND_H'), ROUNDS.map((r) => R('one', r).log.h));
  assert.deepEqual(arr('ROUND_NAMES'), ROUNDS.map((r) => rkey(r)));
});
