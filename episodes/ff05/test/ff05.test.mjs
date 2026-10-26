import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff05-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);

t('fixture: the source really is variable frame rate: several distinct gaps between frames, and the average rate is far below the base rate', () => {
  const s = ev.source;
  assert.ok(s.distinctGapsMs.length > 1, `gaps ${s.distinctGapsMs}`);
  assert.equal(s.rFrameRate, '30/1');
  assert.ok(s.avgFps < 25, `avg ${s.avgFps}`);
  assert.ok(Math.abs(s.duration - 5) < 0.1);
});

t('known-positive control: -fps_mode passthrough keeps every source frame and the uneven gaps', () => {
  const v = ev.variants.passthrough;
  assert.equal(v.frames, ev.source.frames);
  assert.ok(v.distinctGapsMs.length > 1);
  assert.equal(v.duplicatesByCounter, 0);
});

t('-fps_mode cfr -r 30 makes constant frame rate: one gap size, more frames than the source, about 30 per second', () => {
  const v = ev.variants.cfr_30;
  assert.equal(v.distinctGapsMs.length, 1);
  assert.ok(v.frames > ev.source.frames);
  assert.ok(Math.abs(v.frames - 150) <= 2, `${v.frames}`);
});

t('with no frame rate option the result is one of two documented behaviours, and which one depends on the build: constant (like cfr) or variable (like passthrough)', () => {
  const d = ev.variants.default, like = (o) => d.frames === o.frames && d.distinctGapsMs.length === o.distinctGapsMs.length;
  assert.ok(like(ev.variants.passthrough) || like(ev.variants.cfr_30), `default: ${d.frames} frames, ${d.distinctGapsMs.length} gap sizes`);
});

t('the extra frames are duplicates, not new pictures: unique frames equal the source frame count in every variant, and two counters agree', () => {
  for (const [k, v] of Object.entries(ev.variants)) {
    assert.equal(v.uniqueFrames, ev.source.uniqueFrames, k);
    assert.equal(v.duplicatesByCounter, v.duplicatesByMd5, k);
  }
});

t('the length of the film does not change: every variant is about 5 s', () => {
  for (const [k, v] of Object.entries(ev.variants)) assert.ok(Math.abs(v.duration - 5) < 0.1, `${k}: ${v.duration}`);
});

t('a higher constant rate means more duplicates: 60 fps has more than 30 fps, which has more than 25 fps', () => {
  const d = (k) => ev.variants[k].duplicatesByCounter;
  assert.ok(d('cfr_60') > d('cfr_30') && d('cfr_30') > d('cfr_25'));
  assert.ok(Math.abs(ev.variants.cfr_60.frames - 300) <= 2); assert.ok(Math.abs(ev.variants.cfr_25.frames - 125) <= 2);
});
