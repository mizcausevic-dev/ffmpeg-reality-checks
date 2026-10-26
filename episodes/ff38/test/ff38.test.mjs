import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, sameRatio, ratioValue, parseRatio, asRatio} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff38-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const sar = (k) => R(k).probe.sar;              // ffprobe reader
const pasp = (k) => R(k).pasp;                   // container reader (absent box = 1:1)
const dims = (k) => [R(k).probe.width, R(k).probe.height];
const eq = (r, n, d, msg) => assert.ok(sameRatio(r, {n, d}), `${msg ?? ''} ${JSON.stringify(r)} is not ${n}:${d}`);
const shapeW = (k) => R(k).pixels.w, shapeH = (k) => R(k).pixels.h;

t('the ratio helper compares by cross-multiplication and treats unset as 1:1', () => {
  assert.ok(sameRatio({n: 64, d: 45}, {n: 128, d: 90})); assert.ok(!sameRatio({n: 64, d: 45}, {n: 1, d: 1}));
  assert.ok(sameRatio(parseRatio('N/A'), {n: 1, d: 1})); assert.ok(sameRatio(parseRatio('0:1'), {n: 1, d: 1}));
  assert.deepEqual(parseRatio('16:9'), {n: 16, d: 9}); assert.deepEqual(parseRatio('16/9'), {n: 16, d: 9});
});

t('known-positive control, square pixels: a 640x360 source with SAR 1:1 scaled to 1280x720 stays SAR 1:1, DAR 16:9, and the circle stays round in the pixels', () => {
  eq(sar('sqSrc'), 1, 1); eq(pasp('sqSrc'), 1, 1); near(shapeW('sqSrc') / shapeH('sqSrc'), 1, 0.02);
  assert.deepEqual(dims('sqSame'), [1280, 720]);
  eq(sar('sqSame'), 1, 1); eq(pasp('sqSame'), 1, 1); eq(R('sqSame').probe.dar, 16, 9);
  near(shapeW('sqSame'), 2 * shapeW('sqSrc'), 3); near(shapeH('sqSame'), 2 * shapeH('sqSrc'), 3);
  near(shapeW('sqSame') / shapeH('sqSame'), 1, 0.02);
});

t('the anamorphic source is 720x576 with SAR 64:45 (ffprobe and the pasp box), ffprobe DAR 16:9, and its stored shape is an ellipse about 0.70 wide', () => {
  assert.deepEqual(dims('anamSrc'), [720, 576]);
  eq(sar('anamSrc'), 64, 45); eq(pasp('anamSrc'), 64, 45); eq(R('anamSrc').probe.dar, 16, 9);
  near(shapeW('anamSrc') / shapeH('anamSrc'), 45 / 64, 0.02);
});

t('displayed width = width x SAR: 720 x 64/45 = 1024, so a player that honors SAR shows 1024x576 (16:9) and the stored ellipse is a circle again (shown w/h about 1)', () => {
  near(R('anamSrc').shown.width, 1024, 0.5); near(R('anamSrc').shown.dar, 16 / 9, 0.005);
  near(R('anamSrc').shown.shapeRatio, 1, 0.02);
  // and ffprobe's DAR agrees with width x SAR / height by cross-multiplication
  const p = R('anamSrc').probe, s = asRatio(p.sar);
  assert.equal(p.width * s.n * p.dar.d, p.height * s.d * p.dar.n);
});

t('-vf scale=1280:720 does not carry the SAR over: the output is SAR 1:1 (ffprobe and pasp), DAR 16:9, and the ellipse became a circle in the pixels', () => {
  assert.deepEqual(dims('scale'), [1280, 720]);
  eq(sar('scale'), 1, 1); eq(pasp('scale'), 1, 1); eq(R('scale').probe.dar, 16, 9);
  near(shapeW('scale') / shapeH('scale'), 1, 0.02);
  assert.ok(!sameRatio(sar('scale'), sar('anamSrc')), 'the SAR changed');
  near(R('scale').shown.shapeRatio, 1, 0.02);
});

t('explicit -s 1280x720 behaves the same as -vf scale=1280:720: same size, SAR 1:1, same decoded pixels', () => {
  assert.deepEqual(dims('sOpt'), [1280, 720]);
  eq(sar('sOpt'), 1, 1); eq(pasp('sOpt'), 1, 1);
  assert.equal(R('sOpt').pixels.md5, R('scale').pixels.md5);
});

t('scale changes the SAR flag so the display aspect is kept: square source scaled to 640x720 is SAR 2:1, DAR still 16:9, pixels stretched (w/h about 0.5) but shown round', () => {
  assert.deepEqual(dims('sqTall'), [640, 720]);
  eq(sar('sqTall'), 2, 1); eq(pasp('sqTall'), 2, 1); eq(R('sqTall').probe.dar, 16, 9);
  near(shapeW('sqTall') / shapeH('sqTall'), 0.5, 0.02, 'pixel reader sees the stretch');
  near(R('sqTall').shown.shapeRatio, 1, 0.02, 'SAR undoes it when honored');
  near(R('sqTall').shown.width, 1280, 0.5);
});

t('-vf setsar=1 changes only the flag: same size, SAR 1:1, DAR 5:4, decoded pixels identical to the source, the shape is still 0.70 wide', () => {
  assert.deepEqual(dims('setsar'), [720, 576]);
  eq(sar('setsar'), 1, 1); eq(pasp('setsar'), 1, 1); eq(R('setsar').probe.dar, 5, 4);
  assert.equal(R('setsar').pixels.md5, R('anamSrc').pixels.md5);
  assert.deepEqual([shapeW('setsar'), shapeH('setsar')], [shapeW('anamSrc'), shapeH('anamSrc')]);
  near(R('setsar').shown.shapeRatio, 45 / 64, 0.02);
});

t('scale=iw*sar:ih,setsar=1 bakes the aspect into the pixels: 1024x576, SAR 1:1, DAR 16:9, circle round in the stored pixels; scale=iw*sar:ih alone already gives the same pixels and SAR 1:1', () => {
  for (const k of ['bake', 'bakeOnly']) {
    assert.deepEqual(dims(k), [1024, 576]);
    eq(sar(k), 1, 1, k); eq(pasp(k), 1, 1, k); eq(R(k).probe.dar, 16, 9, k);
    near(shapeW(k) / shapeH(k), 1, 0.02, k); near(shapeH(k), 383, 3, k);
  }
  assert.equal(R('bake').pixels.md5, R('bakeOnly').pixels.md5);
});

t('order matters: setsar=1,scale=1280:720 has the same pixels as scale=1280:720 but the flag is SAR 45:64, DAR 5:4, so a SAR-honoring player shows the circle about 0.70 wide', () => {
  assert.deepEqual(dims('wrong'), [1280, 720]);
  assert.equal(R('wrong').pixels.md5, R('scale').pixels.md5);
  eq(sar('wrong'), 45, 64); eq(pasp('wrong'), 45, 64); eq(R('wrong').probe.dar, 5, 4);
  near(shapeW('wrong') / shapeH('wrong'), 1, 0.02, 'the pixels are fine');
  near(R('wrong').shown.shapeRatio, 45 / 64, 0.02);
  near(R('wrong').shown.width, 900, 0.5);
});

t('the readers agree on every output: ffprobe SAR equals the pasp box by cross-multiplication, ffprobe DAR equals width x SAR / height, and the DAR the pixels imply (shape w/h x SAR) is 1 wherever the flag is honest', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.ok(sameRatio(r.probe.sar, {n: r.pasp.n, d: r.pasp.d}), `${k}: ffprobe SAR ${r.probe.sarText} vs pasp ${r.pasp.n}:${r.pasp.d}`);
    const s = asRatio(r.probe.sar);
    if (r.probe.dar) assert.equal(r.probe.width * s.n * r.probe.dar.d, r.probe.height * s.d * r.probe.dar.n, `${k}: DAR`);
    near(r.pixels.w / r.pixels.h * ratioValue(r.probe.sar), r.shown.shapeRatio, 0.01, `${k}: shown shape ratio`);
  }
  for (const k of ['anamSrc', 'scale', 'sOpt', 'bake', 'bakeOnly', 'sqSrc', 'sqSame', 'sqTall']) near(R(k).shown.shapeRatio, 1, 0.02, `${k} shown round`);
  for (const k of ['setsar', 'wrong']) near(R(k).shown.shapeRatio, 45 / 64, 0.02, `${k} shown squished`);
});
