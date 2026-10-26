import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff21-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];

t('control: the source is 250 frames (10 s at 25 fps) with hard cuts at 3.2 s and 6.8 s', () => {
  assert.equal(ev.source.frames, 250); assert.deepEqual(ev.source.cuts, [3.2, 6.8]);
});

t('-g 100 alone: keyframes land on the two cuts (0, 3.2, 6.8), not on a 4 s grid', () => {
  assert.deepEqual(R('g100').keyframes, [0, 3.2, 6.8]);
});

t('-g 100 with -sc_threshold 0: a strict 4 s grid (0, 4, 8) and the cuts get no keyframe', () => {
  assert.deepEqual(R('g100_nosc').keyframes, [0, 4, 8]);
});

t('-force_key_frames 3.2,6.8 with scenecut off: keyframes exactly where we said', () => {
  assert.deepEqual(R('g100_forced').keyframes, [0, 3.2, 6.8]);
});

t('-force_key_frames 2 with scenecut on: the forced keyframe is added to the scene cuts (0, 2, 3.2, 6.8)', () => {
  assert.deepEqual(R('g100_force_2s').keyframes, [0, 2, 3.2, 6.8]);
});

t('the two readers agree on every encode: keyframe packets and decoded I frames are at the same times', () => {
  for (const [k, r] of Object.entries(ev.runs)) assert.deepEqual(r.iFrames, r.keyframes, k);
});

t('the largest gap between keyframes is never more than the 4 s that -g 100 sets (it is a maximum)', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    const k2 = [...r.keyframes, 10]; let max = 0;
    for (let i = 1; i < k2.length; i++) max = Math.max(max, k2[i] - k2[i - 1]);
    assert.ok(max <= 4.0 + 0.01, `${k}: largest gap ${max}`);
  }
});
