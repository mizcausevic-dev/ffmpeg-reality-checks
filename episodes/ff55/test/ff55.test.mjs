import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, parseMp4, sttsTicks, boxes, modelTick, isTie, idealSec, buildOf, CASES, NTSC, FRAMES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff55-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (n) => ev.runs[n];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const EPS = 1e-6;
const NTSC_CASES = ['default', 't30000', 't90000', 't24000', 't15360', 't1000', 't600'];
const TS = {t30000: 30000, t90000: 90000, t24000: 24000, t15360: 15360, t1000: 1000, t600: 600};

// a tiny hand-made mp4: moov(mvhd, trak(mdia(mdhd, minf(stbl(stts)))))
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const box = (type, ...kids) => { const body = Buffer.concat(kids); return Buffer.concat([u32(8 + body.length), Buffer.from(type, 'latin1'), body]); };
const full = (type, fields) => box(type, Buffer.concat([u32(0), ...fields.map(u32)]));

t('the helpers behave: the rounding model gives 501 for frame 15 at timescale 1000 (500.5 rounds up), exact ticks at 30000, ties are found, and the mp4 parser reads a hand-made file', () => {
  assert.equal(modelTick(15, 1000, NTSC), 501); assert.equal(modelTick(1, 1000, NTSC), 33); assert.equal(modelTick(2, 1000, NTSC), 67);
  assert.equal(modelTick(7, 30000, NTSC), 7007); assert.equal(modelTick(7, 90000, NTSC), 21021);
  assert.ok(isTie(15, 1000, NTSC) && isTie(45, 1000, NTSC) && !isTie(1, 1000, NTSC) && !isTie(15, 30000, NTSC));
  near(idealSec(30, NTSC), 1.001, 1e-12); near(idealSec(25, [25, 1]), 1, 1e-12);
  const stts = box('stts', u32(0), u32(2), u32(3), u32(40), u32(1), u32(41));
  const file = path.join(dir, 'tiny.mp4');
  fs.writeFileSync(file, box('moov', full('mvhd', [0, 0, 1000, 5000]), box('trak', box('mdia', full('mdhd', [0, 0, 1000, 160]), box('minf', box('stbl', stts))))));
  const p = parseMp4(file);
  assert.deepEqual(p.stts, [[3, 40], [1, 41]]); assert.equal(p.mdhd.timescale, 1000); assert.equal(p.mdhd.duration, 160); assert.equal(p.mvhd.duration, 5000); assert.equal(p.hasCtts, false);
  assert.deepEqual(sttsTicks(p.stts).starts, [0, 40, 80, 120]); assert.equal(sttsTicks(p.stts).total, 161);
  assert.equal(boxes(Buffer.from('not an mp4 at all, just text')).length, 0);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and all 9 files are one video track of 300 frames (250 for the 25 fps control) with no ctts table, so a frame timestamp is its decode time: stts sum, ffprobe packets, ffprobe decoded frames and framemd5 frames all count the same', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /); assert.equal(Object.keys(ev.runs).length, 9);
  for (const [k, r] of Object.entries(ev.runs)) {
    const n = CASES[k].frames;
    assert.equal(r.tracks, 1, k); assert.equal(r.samples, n, k); assert.equal(r.packets, n, k); assert.equal(r.decoded, n, k); assert.equal(r.framesMd5, n, k); assert.equal(r.probe.nbFrames, n, k);
    assert.equal(r.hasCtts, false, `${k}: no B-frames`);
  }
  near(ev.grid.frameMs, 33.366667, 1e-5); assert.equal(ev.grid.exactDurationSec, 10.01);
});

t('control, known positive for "exact": timescale 30000 and 90000 (multiples of 30000) store 1001 and 3003 ticks for every frame, all 300, zero error on every frame, duration exactly 10.010000 s', () => {
  for (const k of ['t30000', 't90000']) {
    const r = R(k), d = TS[k] / 30000 * 1001;
    assert.equal(r.timescale, TS[k], k); assert.deepEqual(r.deltas, {[d]: 300}, k); assert.equal(r.maxErrMs, 0, k); assert.equal(r.errMin, 0, k); assert.equal(r.errMax, 0, k);
    assert.equal(r.mdhdDurationSec, 10.01, k); near(r.durationErrUs, 0, 0.001, k);
  }
});

t('control, rounding is not a quirk of 1000: a 25 fps clip at timescale 1000 stores 40 ticks for each of its 250 frames and no error, so 33.37 ms is the reason for the rounding, not the timescale', () => {
  const r = R('ctl25');
  assert.equal(r.timescale, 1000); assert.deepEqual(r.deltas, {40: 250}); assert.equal(r.maxErrMs, 0); assert.equal(r.durationErrUs, 0); assert.equal(r.probe.rFrameRate, '25/1');
});

t('known positive for rounding: at timescale 1000 the 29.97 fps frames are 33 or 34 ms long, never 33.37: both lengths occur, together they are all 300 frames, and the first stored times are 0, 33, 67, 100, 133, 167', () => {
  const r = R('t1000');
  assert.deepEqual(Object.keys(r.deltas).sort(), ['33', '34']); assert.equal(r.deltas[33] + r.deltas[34], FRAMES); assert.ok(r.deltas[33] > 0 && r.deltas[34] > 0);
  assert.deepEqual(r.firstTicks.slice(0, 6), [0, 33, 67, 100, 133, 167]);
  if (isV6()) { assert.equal(r.deltas[33], 190); assert.equal(r.deltas[34], 110); assert.equal(r.stts.length > 1, true); }
});

t('both readers see the rounding the same way: for every one of the 9 files, ffprobe packet pts equal the stts decode times (the bytes) tick for tick, and ffprobe decoded frame pts equal them too; ffprobe time_base is 1 over the mdhd timescale', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.probeEqualsBox, true, `${k} packets`); assert.equal(r.decodeEqualsBox, true, `${k} decoded frames`); assert.equal(r.probe.timeBase, `1/${r.timescale}`, k);
    near(r.probe.streamDuration, r.mdhdDurationSec, 2e-6, `${k} duration`);
  }
});

t('the rounding never drifts: every frame is within half a tick of its exact time n x 1001 / 30000 (0.5 ms at 1000, 0.83 ms at 600, 0.033 ms at 15360, 0.021 ms at 24000), the last frame included, and the total duration is within one tick of 10.01 s', () => {
  for (const k of NTSC_CASES) {
    const r = R(k), half = 500 / r.timescale;
    assert.ok(r.maxErrMs <= (isV6() ? half : 2 * half) + EPS, `${k} max error ${r.maxErrMs} ms vs half tick ${half} ms`);
    assert.ok(Math.abs(r.lastErrNtscMs) <= (isV6() ? half : 2 * half) + EPS, `${k} last frame`);
    assert.ok(Math.abs(r.durationErrUs) <= 1e6 / r.timescale + 0.001, `${k} duration error ${r.durationErrUs} us`);
  }
  near(R('t1000').maxErrMs, 0.5, 1e-6); near(R('t600').maxErrMs, 0.833333, 1e-5);
});

t('exact if and only if the timescale is a multiple of 30000: 30000 and 90000 have zero error, 24000, 15360, 1000 and 600 all have a nonzero error and more than one frame length', () => {
  for (const k of ['t30000', 't90000']) { assert.equal(R(k).maxErrMs, 0, k); assert.equal(R(k).deltaKinds, 1, k); }
  for (const k of ['t24000', 't15360', 't1000', 't600']) { assert.ok(R(k).maxErrMs > 0, k); assert.ok(R(k).deltaKinds >= 2, `${k} frame lengths`); }
});

t('600 ticks a second: 20 ticks for most frames and 21 for a few (6 of 300), up to 0.83 ms off, and 15360 gives 512 or 513 ticks (ffprobe still reports the rate 30000/1001, while its average rate and duration read off the rounded ticks)', () => {
  const a = R('t600'), b = R('t15360');
  assert.deepEqual(Object.keys(a.deltas).sort(), ['20', '21']); assert.deepEqual(Object.keys(b.deltas).sort(), ['512', '513']);
  assert.equal(a.deltas[20] + a.deltas[21], FRAMES); assert.equal(b.deltas[512] + b.deltas[513], FRAMES);
  if (isV6()) {
    assert.equal(a.deltas[21], 6); assert.equal(b.deltas[512], 146); assert.equal(b.deltas[513], 154);
    assert.equal(b.probe.rFrameRate, '30000/1001'); assert.equal(b.probe.avgFrameRate, '2304000/76877'); assert.notEqual(b.probe.avgFrameRate, b.probe.rFrameRate);
    near(b.mdhdDurationSec, 10.010026, 1e-6); near(b.durationErrUs, 26.042, 0.01);
    assert.equal(R('t1000').probe.avgFrameRate, '30000/1001', 'at 1000 the average rate still reads exactly');
  }
});

t('the arithmetic predicts every file: each stored tick equals round(n x 1001 x T / 30000), halves up, for all frames of all 9 files (on ffmpeg 6.1.1; other builds must agree within 1 tick)', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    if (isV6()) { assert.equal(r.modelMismatch, 0, k); assert.equal(r.modelMaxOff, 0, k); } else assert.ok(r.modelMaxOff <= 1, `${k} off by ${r.modelMaxOff} tick`);
  }
});

t('half way cases: at timescale 1000 frame 15 is exactly 500.5 ticks (10 such frames in 300) and at 600 there are 6, and each is stored rounded up; frame 15 is 501', () => {
  assert.equal(R('t1000').ties, 10); assert.equal(R('t600').ties, 6); assert.equal(R('t30000').ties, 0);
  assert.equal(R('t1000').tieTicks[0].n, 15); assert.equal(R('t1000').tieTicks[0].up, 501);
  if (isV6()) { assert.equal(R('t1000').tieTicks[0].tick, 501); assert.equal(R('t1000').tiesAllRoundedUp, true); assert.equal(R('t600').tiesAllRoundedUp, true); }
});

t('29.97 is not 30000/1001: a source made with the decimal rate 29.97 is read by ffprobe as 2997/100, has one constant frame length, and is 0.0100 ms behind the 30000/1001 grid at its last frame; the 30000/1001 source has no gap', () => {
  const a = R('r2997'), b = R('default');
  assert.equal(a.probe.rFrameRate, '2997/100'); assert.equal(b.probe.rFrameRate, '30000/1001'); assert.equal(a.deltaKinds, 1); assert.equal(a.maxErrMs, 0, 'exact on its own grid');
  assert.ok(a.maxErrNtscMs > 0 && a.maxErrNtscMs < 0.02, `${a.maxErrNtscMs}`); near(a.lastErrNtscMs, 0.009977, 1e-5); assert.equal(b.maxErrNtscMs, 0);
  near(a.mdhdDurationSec, 10.01001, 2e-6);
  if (isV6()) { assert.equal(a.timescale, 11988); assert.deepEqual(a.deltas, {400: 300}); }
});

t('the default timescale for 30000/1001 on this build: 30000, so the default file has exactly the tick list of the explicit 30000 file (checked on 6.1.1; on other builds only the readers must agree and the error stay within one tick)', () => {
  const d = R('default'), e = R('t30000');
  if (isV6()) { assert.equal(d.timescale, 30000); assert.deepEqual(d.ticks, e.ticks); assert.equal(d.maxErrMs, 0); }
  else { assert.equal(d.probeEqualsBox, true); assert.ok(d.maxErrMs <= 1000 / d.timescale + EPS); }
});

t('a reader that rescales hides it: ffmpeg framemd5 counts the 300 frames of every file but prints their times as frame numbers 0 to 299 (in frame-rate units) whatever the timescale, so it cannot tell 30000 from 1000; the ticks can', () => {
  for (const k of NTSC_CASES) assert.equal(R(k).framesMd5, FRAMES, k);
  if (isV6()) for (const k of NTSC_CASES) assert.equal(R(k).framemd5IsFrameNumber, true, k);
  assert.notDeepEqual(R('t1000').ticks, R('t30000').ticks);
});
