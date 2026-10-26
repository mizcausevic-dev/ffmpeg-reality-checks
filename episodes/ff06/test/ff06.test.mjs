import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff06-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const sizes = (j) => Object.keys(j.frameSizes).sort();

t('control: two clips of the same size join with -c copy, one frame size throughout, 100 frames, 4 s', () => {
  const j = ev.joins.same_copy;
  assert.equal(j.exit, 0);
  assert.deepEqual(sizes(j), ['320x180']);
  assert.equal(j.frames, 100);
  assert.ok(Math.abs(j.duration - 4) < 0.05, `${j.duration}`);
});

t('clips of different sizes: -c copy exits 0 and writes a 100 frame, 4 s file', () => {
  const j = ev.joins.mixed_copy;
  assert.equal(j.exit, 0);
  assert.equal(j.produced, true);
  assert.equal(j.frames, 100);
  assert.ok(Math.abs(j.duration - 4) < 0.05);
});

t('the header names one size, the first clip\'s, though the stream holds two: the mismatch is invisible to the exit code and header', () => {
  const j = ev.joins.mixed_copy;
  assert.equal(j.header, '320x180');
  assert.deepEqual(sizes(j), ['320x180', '640x360']);
});

t('two independent readers see the same frame mix: frame counts per size are 50 and 50', () => {
  const j = ev.joins.mixed_copy;
  assert.equal(j.frameSizes['320x180'], 50);
  assert.equal(j.frameSizes['640x360'], 50);
  assert.equal(Object.values(j.frameSizes).reduce((a, b) => a + b, 0), j.frames);
});

t('re-encoding with scale and pad puts every frame at one size, with the same frame count and length', () => {
  const j = ev.joins.mixed_reencode;
  assert.equal(j.exit, 0);
  assert.deepEqual(sizes(j), ['640x360']);
  assert.equal(j.frames, 100);
  assert.ok(Math.abs(j.duration - 4) < 0.05);
});

t('the detector can tell: the matched join and the re-encode have one frame size, the mismatched copy has two', () => {
  assert.equal(sizes(ev.joins.same_copy).length, 1);
  assert.equal(sizes(ev.joins.mixed_reencode).length, 1);
  assert.equal(sizes(ev.joins.mixed_copy).length, 2);
});
