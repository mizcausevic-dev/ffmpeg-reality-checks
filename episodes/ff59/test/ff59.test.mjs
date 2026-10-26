import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, runsOf, lookup, buildOf, CASES, KEYS, FRAMES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff59-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (n) => ev.runs[n];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const seq = (a, b, m) => assert.deepEqual(a, b, m);
const FIXED = ['vfr', 'passthrough', 'vsync0', 'vsyncvfr', 'setpts'];
const DUPED = ['default', 'cfr', 'skipframe'];

t('the helpers behave: runsOf groups equal neighbours, lookup names a hash or -1, build detection', () => {
  seq(runsOf([3, 3, 7, 3]), [{src: 3, count: 2}, {src: 7, count: 1}, {src: 3, count: 1}]);
  seq(lookup(['b', 'q', 'a'], ['a', 'b']), [1, -1, 0]);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the clips are what the fixture promises: 100 distinct frames each, I-frames at 0, 25, 50, 75 (clip A) and at 0, 10, 40, 41 (clip B)', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.clips.frames, FRAMES); assert.equal(ev.clips.A.distinct, FRAMES); assert.equal(ev.clips.B.distinct, FRAMES);
  seq(ev.clips.A.iFrames, KEYS.A); seq(ev.clips.B.iFrames, KEYS.B);
  assert.equal(Object.keys(ev.runs).length, Object.keys(CASES).length);
});

t('control: with no select, the default output has 100 files, 100 different frames and no duplicate, and ffmpeg itself reports dup=0 (so a reader that counts duplicates sees none here)', () => {
  const r = R('all');
  assert.equal(r.frames, FRAMES); assert.equal(r.distinct, FRAMES); assert.equal(r.dupFrames, 0); assert.equal(r.statsDup, 0); assert.equal(r.unknown, 0);
  seq(r.bySrcFiles, Array.from({length: FRAMES}, (_, i) => i));
});

t('known positive: select=eq(pict_type\\,I) at the default frame rate mode writes far more files than keyframes: about 99 files that hold only 4 different frames, 95 duplicates, and every file is one of the 4 keyframes', () => {
  const r = R('default');
  assert.equal(r.distinct, 4); assert.ok(r.onlyKeyframes, 'no non keyframe is written'); assert.ok(r.allKeysShown); assert.equal(r.unknown, 0);
  assert.equal(r.dupFrames, r.frames - 4); assert.ok(r.frames >= 95 && r.frames <= 100, `frames ${r.frames}`);
  if (isV6()) { assert.equal(r.frames, 99); assert.equal(r.dupFrames, 95); seq(r.runs.map((x) => x.count), [24, 25, 25, 25]); }
});

t('select did its job: the files are the keyframes in order, each keyframe forms one unbroken run, the runs follow the keyframes 0, 25, 50, 75 and no frame comes back after another', () => {
  for (const k of DUPED) {
    const r = R(k);
    seq(r.runs.map((x) => x.src), KEYS.A, k); assert.equal(r.runs.reduce((a, x) => a + x.count, 0), r.frames, k);
  }
});

t('the two readers agree on every output frame of every case: the PNG file hashes (or the decoded mp4 frames) and ffmpeg framemd5 name the same source frame, and the counts match', () => {
  for (const r of Object.values(ev.runs)) {
    assert.equal(r.frames, r.framesMd5, r.name); seq(r.bySrcFiles, r.bySrcMd5, r.name); assert.equal(r.unknown, 0, r.name);
  }
});

t('ffmpeg own counters agree with the files: dup= equals files minus different frames in every case, and drop= is 0', () => {
  for (const r of Object.values(ev.runs)) { assert.equal(r.statsFrame, r.frames, r.name); assert.equal(r.statsDup, r.dupFrames, r.name); assert.equal(r.statsDrop, 0, r.name); }
});

t('the fix: -fps_mode vfr, -fps_mode passthrough, the deprecated -vsync 0 and -vsync vfr, and resetting the timestamps with setpts=N/25/TB all write exactly the 4 keyframes: 4 files, 0 duplicates, the same 4 frames in the same order', () => {
  for (const k of FIXED) {
    const r = R(k);
    assert.equal(r.frames, 4, k); assert.equal(r.dupFrames, 0, k); seq(r.bySrcFiles, KEYS.A, k); assert.ok(r.onlyKeyframes, k);
  }
  // not just the same counts: the files name the same 4 source frames in the same order across the fixes
  for (const k of FIXED) seq(R(k).bySrcFiles, R('vfr').bySrcFiles);
});

t('not a fix: an explicit -fps_mode cfr gives exactly the default result, and -skip_frame nokey on the input (no select at all) gives the same duplicates too', () => {
  seq(R('cfr').runs, R('default').runs); assert.equal(R('cfr').frames, R('default').frames);
  assert.equal(R('skipframe').distinct, 4); assert.ok(R('skipframe').frames > 90); seq(R('skipframe').runs, R('default').runs);
});

t('in a video file the same thing happens: mp4 at the default mode holds about 99 frames (3.96 s) of 4 different pictures; with -fps_mode vfr it holds 4 frames and the duration is 3.04 s (3 s plus one frame); both readers (ffprobe count, decoded hashes) agree', () => {
  const a = R('mp4'), b = R('mp4vfr');
  assert.equal(a.distinct, 4); assert.equal(b.distinct, 4); assert.equal(b.frames, 4); assert.ok(a.frames >= 95);
  assert.ok(a.durationS > 3.8 && a.durationS < 4.0, `duration ${a.durationS}`); assert.ok(Math.abs(b.durationS - 3.04) < 0.011, `duration ${b.durationS}`);
  if (isV6()) { assert.equal(a.frames, 99); assert.equal(a.durationS, 3.96); }
});

t('irregular keyframes (clip B: 0, 10, 40, 41): the default mode repeats each keyframe until the next one, so the longest run belongs to the longest gap (keyframe 10, 30 files), and the output stops at the end of the last repeat, not at the end of the clip (50 files, not 100); -fps_mode vfr writes 4', () => {
  const r = R('irregular');
  seq(r.runs.map((x) => x.src), KEYS.B); assert.equal(r.distinct, 4);
  const longest = r.runs.reduce((m, x) => (x.count > m.count ? x : m));
  assert.equal(longest.src, 10); assert.ok(longest.count >= 29 && longest.count <= 31);
  assert.ok(r.frames < FRAMES - 10, 'the output ends well before the clip does');
  assert.equal(R('irregularVfr').frames, 4); seq(R('irregularVfr').bySrcFiles, KEYS.B);
  if (isV6()) { assert.equal(r.frames, 50); seq(r.runs.map((x) => x.count), [9, 30, 2, 9]); }
});
