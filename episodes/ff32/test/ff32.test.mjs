import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff32-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);

t('source: 300 unique frames, 10 s; the x264 files are lossless (same frame md5 as FFV1) with keyframes at 0, 100, 200 (-g 100) and every 10 frames (-g 10)', () => {
  assert.equal(ev.source.frames, 300); assert.equal(ev.source.unique, 300);
  assert.deepEqual(ev.source.md5Same, {g100: true, g10: true});
  assert.deepEqual(ev.source.keyframes.g100, [0, 100, 200]);
  assert.deepEqual(ev.source.keyframes.g10, range(0, 29).map((i) => i * 10));
});

t('re-encode, -sseof -3: exactly 90 frames, source frames 210..299, 3 s, on FFV1, -g 100 and -g 10 input alike', () => {
  for (const k of ['ffv1_enc', 'g100_enc', 'g10_enc']) {
    const r = R(k);
    assert.equal(r.frames, 90, k); assert.deepEqual(r.byMd5, range(210, 299), k);
    near(r.packetSeconds, 3, 0.02, k); near(r.decodedSeconds, 3, 0.02, k); near(r.container, 3, 0.02, k);
  }
});

t('known-positive control: -ss 7 (10 s minus 3 s, computed from the known duration) gives the same 90 frames as -sseof -3 on a re-encode', () => {
  assert.deepEqual(R('g100_ss').byMd5, R('g100_enc').byMd5);
  assert.deepEqual(R('g100_ss').byMd5, range(210, 299));
});

t('stream copy, -g 100: -sseof -3 gives 100 frames (3.33 s), starting at keyframe 200, not the 90 asked for', () => {
  const r = R('g100_copy');
  assert.equal(r.frames, 100); assert.deepEqual(r.byMd5, range(200, 299));
  near(r.packetSeconds, 3.333, 0.03); near(r.decodedSeconds, 3.333, 0.03);
  assert.ok(ev.source.keyframes.g100.includes(r.first), 'starts on a keyframe');
  assert.ok(r.frames > R('g100_enc').frames, 'more than the re-encode');
});

t('stream copy contains everything the re-encode has: the 90 asked-for frames are the tail of the 100', () => {
  assert.deepEqual(R('g100_copy').byMd5.slice(-90), R('g100_enc').byMd5);
});

t('stream copy, -g 10, -sseof -3: keyframe 210 is exactly 3 s from the end, so copy and re-encode agree (90 frames)', () => {
  assert.deepEqual(R('g10_copy').byMd5, range(210, 299)); assert.deepEqual(R('g10_copy').byMd5, R('g10_enc').byMd5);
});

t('stream copy, -g 10, -sseof -2.9: re-encode gives 87 frames (213..299), copy gives 90 (210..299): the start moves back to the previous keyframe', () => {
  assert.deepEqual(R('g10_enc29').byMd5, range(213, 299));
  assert.deepEqual(R('g10_copy29').byMd5, range(210, 299));
});

t('explicit -ss 7 with stream copy lands on the same frames as -sseof -3 with stream copy (keyframe 200)', () => {
  assert.deepEqual(R('g100_ss_copy').byMd5, R('g100_copy').byMd5);
});

t('stream copy of the all-keyframe FFV1 file: ends at 299, is contiguous and starts at or before frame 210 (the start depends on the container index, not on keyframes)', () => {
  const r = R('ffv1_copy');
  assert.equal(r.last, 299); assert.ok(r.contiguous);
  assert.ok(r.first <= 210, `first ${r.first}`); assert.ok(r.frames >= 90 && r.frames < 150, `frames ${r.frames}`);
});

t('an offset longer than the file is not an error: -sseof -30 on a 10 s file returns all 300 frames, re-encoded or copied', () => {
  for (const k of ['big_enc', 'big_copy']) { assert.deepEqual(R(k).byMd5, range(0, 299), k); near(R(k).packetSeconds, 10, 0.05, k); }
});

t('-sseof counts back from the container duration: with a 10 s picture and a 12 s audio track, -sseof -3 keeps 3 s of audio but only 1 s (30 frames, 270..299) of picture', () => {
  near(ev.source.av.container, 12, 0.05); near(ev.source.av.picture, 10, 0.05); near(ev.source.av.audio, 12, 0.05);
  const r = R('av');
  assert.deepEqual(r.byMd5, range(270, 299));
  near(r.packetSeconds, 1, 0.05); near(r.decodedSeconds, 1, 0.05); near(r.audioSeconds, 3, 0.05); near(r.container, 3, 0.05);
});

t('the two readers agree on every output: frame md5 and decoded frame code name the same source frames, packet and decoded picture lengths agree within 0.02 s', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.deepEqual(r.byCode, r.byMd5, k);
    near(r.packetSeconds, r.decodedSeconds, 0.02, `${k} picture seconds`);
    assert.equal(r.packets, r.decodedFrames, k); assert.equal(r.frames, r.decodedFrames, k);
  }
});
