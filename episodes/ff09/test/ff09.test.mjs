import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff09-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const dims = (s) => s.split('x').map(Number);
const wrote = (c) => c.disk.exists && c.disk.video !== null;

t('control: 1920x1080 scaled to height 720 gives 1280x720, exit 0, 10 frames on disk', () => {
  const c = ev.cases.clean_16x9;
  assert.equal(c.scaleTo, '1280x720');
  assert.equal(c.exit, 0);
  assert.deepEqual(c.disk.video, {size: '1280x720', frames: 10});
});

t('the crash: scale=-1:333 on 1000x562 produces 593x333 and libx264 refuses it, exit non-zero, nothing usable written', () => {
  const c = ev.cases.odd_both;
  assert.equal(c.scaleTo, '593x333');
  assert.notEqual(c.exit, 0);
  assert.equal(wrote(c), false);
});

t('two readers agree on the size that broke it: the scale filter (ffprobe) and the encoder message name the same width and height', () => {
  const c = ev.cases.odd_both;
  assert.ok(c.encoderLine, 'no encoder complaint found');
  assert.match(c.encoderLine, /\(593x333\)/);
});

t('width alone is enough: a 16:9 source scaled to height 240 gives an odd width 427 and fails with a width complaint', () => {
  const c = ev.cases.odd_width;
  const [cw, ch] = dims(c.scaleTo);
  assert.equal(cw % 2, 1);
  assert.equal(ch % 2, 0);
  assert.notEqual(c.exit, 0);
  assert.match(c.encoderLine, /width not divisible by 2/);
});

t('height alone is enough: -2 makes the width even but an odd target height still fails with a height complaint', () => {
  const c = ev.cases.odd_height;
  const [cw, ch] = dims(c.scaleTo);
  assert.equal(cw % 2, 0);
  assert.equal(ch % 2, 1);
  assert.notEqual(c.exit, 0);
  assert.match(c.encoderLine, /height not divisible by 2/);
});

t('the fix: scale=-2:334 gives 594x334 (both even), exit 0, 10 frames on disk', () => {
  const c = ev.cases.fixed;
  assert.equal(c.scaleTo, '594x334');
  assert.equal(c.exit, 0);
  assert.deepEqual(c.disk.video, {size: '594x334', frames: 10});
});

t('the cause is 4:2:0 chroma, not odd sizes in general: the same 593x333 frame encodes with yuv444p', () => {
  const c = ev.cases.odd_444;
  assert.equal(c.scaleTo, '593x333');
  assert.equal(c.exit, 0);
  assert.deepEqual(c.disk.video, {size: '593x333', frames: 10});
});

t('the failing runs fail the same way: same non-zero exit code across all three, and the passing runs exit 0', () => {
  const bad = ['odd_both', 'odd_width', 'odd_height'].map((k) => ev.cases[k].exit);
  assert.equal(new Set(bad).size, 1);
  assert.notEqual(bad[0], 0);
  for (const k of ['clean_16x9', 'fixed', 'odd_444']) assert.equal(ev.cases[k].exit, 0);
});
