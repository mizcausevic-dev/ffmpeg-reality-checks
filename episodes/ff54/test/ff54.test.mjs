import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, runsOf, monotone, isFull, isBlack, buildOf, FULL, FPS, CUT_FRAMES, FADE_FRAMES, SRC_SECONDS, CASES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff54-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (n) => ev.runs[n];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const seq = (a, b, msg) => assert.deepEqual(a, b, msg);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';

t('the helpers behave: runsOf groups full, ramp and black frames, monotone reads a direction, isFull and isBlack have the right edges, build detection', () => {
  seq(runsOf([200, 200, 100, 150, 16, 16]), [{kind: 'full', from: 0, to: 1}, {kind: 'ramp', from: 2, to: 3}, {kind: 'black', from: 4, to: 5}]);
  assert.ok(monotone([1, 2, 2, 3], 1)); assert.ok(!monotone([1, 3, 2], 1)); assert.ok(monotone([9, 5, 5, 1], -1));
  assert.ok(isFull(200) && !isFull(193) && isBlack(16) && !isBlack(23));
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the source is what the fixture promises: 150 frames (6 s), every one a flat card of luma 200', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.source.frames, SRC_SECONDS * FPS); assert.equal(ev.source.allFull, true); assert.equal(ev.source.flat, true);
  assert.equal(Object.keys(ev.runs).length, Object.keys(CASES).length); assert.equal(Object.keys(ev.runs).length, 8);
});

t('control: -ss 2 -t 3 with no fade gives 75 frames, all luma 200, all the same frame hash, starting at time 0 with a 0.04 s step', () => {
  const r = R('ctl');
  assert.equal(r.framesMd5, CUT_FRAMES); assert.equal(r.frames, CUT_FRAMES); assert.equal(r.packets, CUT_FRAMES);
  assert.equal(r.flat, true); assert.equal(r.notFull, 0); assert.equal(r.uniqueMd5, 1); seq(r.runs, [{kind: 'full', from: 0, to: 74}]);
  near(r.firstPtsProbe, 0, 0.001); near(r.stepMin, 1 / FPS, 0.001); near(r.stepMax, 1 / FPS, 0.001);
});

t('every output has the same 75 frames at the same times: frame count by framemd5, raw decode, signalstats and ffprobe packets agree, first frame at 0.000 s, 0.04 s step, whichever side of -i the -ss sits on', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.framesMd5, CUT_FRAMES, k); assert.equal(r.frames, CUT_FRAMES, k); assert.equal(r.framesStats, CUT_FRAMES, k); assert.equal(r.packets, CUT_FRAMES, k);
    near(r.firstPtsProbe, 0, 0.001, k); near(r.firstPtsMd5, 0, 0.001, k); near(r.stepMin, 0.04, 0.001, k); near(r.stepMax, 0.04, 0.001, k);
  }
});

t('known-positive control: -ss 2 before -i with fade in st=0 d=1 fades 25 frames: the first frame is black (luma 16), the luma rises step by step, frame 25 (1.00 s) and every later frame is back at 200', () => {
  const r = R('beforeIn0');
  assert.equal(r.notFull, FADE_FRAMES); assert.equal(r.firstNotFull, 0); assert.equal(r.lastNotFull, FADE_FRAMES - 1);
  assert.ok(monotone(r.luma, 1), 'luma never falls'); assert.equal(r.luma[0], 16); assert.ok(r.luma[1] > 16 && r.luma[FADE_FRAMES - 1] < FULL);
  assert.ok(r.luma.slice(FADE_FRAMES).every(isFull)); assert.equal(r.uniqueMd5, FADE_FRAMES + 1, '25 different faded frames plus one full-luma hash');
  if (isV6()) { seq(r.runs, [{kind: 'black', from: 0, to: 0}, {kind: 'ramp', from: 1, to: 24}, {kind: 'full', from: 25, to: 74}]); }
});

t('the known positive is visible to both readers: for every frame of every output, raw decoded luma and the signalstats mean luma agree within 1, and equal luma means equal frame hash', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    r.luma.forEach((y, i) => near(y, r.lumaStats[i], 1, `${k} frame ${i}`));
    const byLuma = new Map(); r.luma.forEach((y, i) => { if (byLuma.has(y)) assert.equal(byLuma.get(y), r.md5[i], `${k} same luma, different hash`); byLuma.set(y, r.md5[i]); });
    const byHash = new Map(); r.md5.forEach((h, i) => { if (byHash.has(h)) assert.equal(byHash.get(h), r.luma[i], `${k} same hash, different luma`); byHash.set(h, r.luma[i]); });
    assert.equal(r.flat, true, `${k} frames are flat cards`);
  }
});

t('the same filter with -ss after -i fades nothing: fade in st=0 d=1 gives 75 full frames with the control hash, 0 frames faded (the fade ran over the seconds that were thrown away)', () => {
  const r = R('afterIn0');
  assert.equal(r.notFull, 0); assert.equal(r.ramp, 0); assert.equal(r.black, 0); seq(r.md5, R('ctl').md5); seq(r.luma, R('ctl').luma);
});

t('after -i the clock is the source clock: st=2 after -i fades the first second of the output, frame for frame the same as st=0 before -i (same 75 frame hashes)', () => {
  const a = R('afterIn2'), b = R('beforeIn0');
  seq(a.md5, b.md5); seq(a.luma, b.luma); assert.equal(a.notFull, FADE_FRAMES); assert.equal(a.firstNotFull, 0);
});

t('the other way round it lands late: st=2 before -i starts the fade at output second 2, so the output is black for about 51 frames, then rises for 24 frames and the clip ends below luma 200: the fade never finishes', () => {
  const r = R('beforeIn2');
  assert.ok(r.luma.slice(0, 50).every(isBlack), 'black until the fade starts at 2.00 s');
  assert.ok(r.black >= 50 && r.black <= 52); assert.ok(r.lastLuma < FULL); assert.equal(r.luma.filter(isFull).length, 0, 'no frame ever reaches full luma');
  assert.ok(monotone(r.luma, 1));
  if (isV6()) { assert.equal(r.black, 51); assert.equal(r.ramp, 24); assert.equal(r.lastLuma, 193); }
});

t('fade out follows the same rule: st=4 after -i equals st=2 before -i, frame for frame (full for 51 frames, then a 24 frame ramp down to 2.96 s)', () => {
  const a = R('afterOut4'), b = R('beforeOut2');
  seq(a.md5, b.md5); seq(a.luma, b.luma);
  assert.ok(monotone(b.luma, -1)); assert.ok(b.luma.slice(0, 50).every(isFull)); assert.equal(b.firstNotFull, 51); assert.equal(b.lastNotFull, 74); assert.equal(b.black, 0);
  assert.ok(b.lastLuma > 16 && b.lastLuma < FULL);
  if (isV6()) { assert.equal(b.ramp, 24); assert.equal(b.lastLuma, 23); }
});

t('the same number after -i is a different time: fade out st=2 after -i starts at output 0.00 s, is black within 25 frames and the clip stays black for 50 frames, 2 of its 3 seconds', () => {
  const r = R('afterOut2');
  assert.ok(monotone(r.luma, -1)); assert.ok(isFull(r.luma[0])); assert.ok(r.luma[1] < FULL);
  assert.ok(r.luma.slice(FADE_FRAMES).every(isBlack)); assert.equal(r.black, CUT_FRAMES - FADE_FRAMES); assert.ok(isBlack(r.lastLuma));
  assert.notDeepEqual(r.md5, R('beforeOut2').md5);
});

t('one rule predicts every case: the fade ends at output frame 25 for the two correct fade ins, never ends for the two wrong ones, and the fade out starts at frame 51 for the two correct fade outs', () => {
  const endOf = (r) => r.luma.findIndex((y, k) => k > 0 && isFull(y) && !isFull(r.luma[k - 1]));
  assert.equal(endOf(R('beforeIn0')), FADE_FRAMES); assert.equal(endOf(R('afterIn2')), FADE_FRAMES);
  assert.equal(endOf(R('afterIn0')), -1); assert.equal(endOf(R('beforeIn2')), -1);
  const startOut = (r) => r.luma.findIndex((y) => !isFull(y));
  assert.equal(startOut(R('beforeOut2')), 51); assert.equal(startOut(R('afterOut4')), 51); assert.equal(startOut(R('afterOut2')), 1);
});

t('the frame hashes carry the story without luma: the faded outputs have 26 different hashes, the no-op fade has 1, and the unfaded frames share the control hash', () => {
  const ctlHash = R('ctl').md5[0];
  for (const n of ['beforeIn0', 'afterIn2']) { assert.equal(R(n).uniqueMd5, FADE_FRAMES + 1, n); assert.equal(R(n).md5[40], ctlHash, `${n} frame 40 is an unfaded frame`); }
  assert.equal(R('afterIn0').uniqueMd5, 1); assert.equal(R('afterIn0').md5[0], ctlHash);
  assert.ok(R('beforeIn2').md5.every((h) => h !== ctlHash), 'a fade that never finishes never shows the control frame');
});
