import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff16-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

t('control: the source is 60 frames at 30 fps over 2.0 seconds, read by both readers', () => {
  const s = ev.source.mp4;
  near(s.declared.duration, 2, 0.01, 'duration'); assert.equal(s.declared.fps, 30);
  assert.equal(s.inside.packets, 60); assert.equal(s.inside.framesDecoded, 60);
});

t('-r after the input drops frames and keeps the length: about 20 frames at 10 fps over about 2 seconds (22 frames and 2.2 s here)', () => {
  const r = ev.runs.after;
  assert.equal(r.declared.fps, 10); assert.equal(r.inside.framesDecoded, 22); assert.equal(r.inside.packets, 22);
  near(r.declared.duration, 2.2, 0.01, 'duration');
});

t('the fps filter is the exact way to drop frames: 20 frames, 2.0 seconds', () => {
  const r = ev.runs.fps_filter;
  assert.equal(r.inside.framesDecoded, 20); near(r.declared.duration, 2, 0.01, 'duration');
});

t('-r before the input keeps every frame and stretches time: 60 frames, 6.0 seconds, 10 fps (slow motion at one third speed)', () => {
  const r = ev.runs.before;
  assert.equal(r.inside.framesDecoded, 60); assert.equal(r.declared.fps, 10); near(r.declared.duration, 6, 0.01, 'duration');
  near(r.inside.packetGap, 0.1, 0.005, 'gap');
});

t('-r before the input has no effect with -c copy: still 30 fps, 2 seconds', () => {
  const r = ev.runs.before_copy;
  assert.equal(r.declared.fps, 30); near(r.declared.duration, 2, 0.01, 'duration'); assert.equal(r.inside.framesDecoded, 60);
});

t('-r on both sides gives the same as -r before alone: nothing is dropped, the clip is 6 seconds', () => {
  const r = ev.runs.both;
  assert.equal(r.inside.framesDecoded, 60); near(r.declared.duration, 6, 0.01, 'duration');
});

t('on a raw H.264 stream, which stores no timing, -r before the input is the way to say the rate: 30 fps by default, 10 fps (6 seconds) with -r 10', () => {
  assert.equal(ev.runs.raw_default.declared.fps, 30); near(ev.runs.raw_default.declared.duration, 2, 0.01, 'default');
  assert.equal(ev.runs.raw_before.declared.fps, 10); near(ev.runs.raw_before.declared.duration, 6, 0.01, 'with -r 10');
  assert.equal(ev.runs.raw_before.inside.framesDecoded, 60);
});
