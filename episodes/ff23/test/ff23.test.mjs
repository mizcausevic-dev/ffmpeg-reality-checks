import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff23-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];

t('control: the source has 500 frames and every frame is unique, so a frame md5 identifies a frame', () => {
  assert.equal(ev.source.frames, 500); assert.equal(ev.source.uniqueFrames, 500);
});

t('-ss 5 -to 10 -i (both before the input): a 5 s clip, source 5 s to 10 s (125 frames)', () => {
  const r = R('to_before_ss'); assert.equal(r.declared.frames, 125); assert.equal(r.content.first, 125); assert.equal(r.content.last, 249); assert.ok(r.content.contiguous);
});

t('-ss 5 -i ... -to 10 (-to after the input): a 10 s clip, source 5 s to 15 s (250 frames), not the 5 s people expect', () => {
  const r = R('to_after_ss'); assert.equal(r.declared.frames, 250); assert.equal(r.content.first, 125); assert.equal(r.content.last, 374); assert.ok(r.content.contiguous);
});

t('-i ... -ss 5 -to 10 (both after the input): a 5 s clip, source 5 s to 10 s', () => {
  const r = R('both_after'); assert.equal(r.declared.frames, 125); assert.equal(r.content.first, 125); assert.equal(r.content.last, 249);
});

t('-ss 5 -i ... -t 5: a 5 s clip, source 5 s to 10 s: -t after a seek is a length, -to after a seek is a timestamp on the new timeline', () => {
  const r = R('t_after_ss'); assert.equal(r.declared.frames, 125); assert.equal(r.content.first, 125); assert.equal(r.content.last, 249);
});

t('-to 10 -i alone: the first 10 s of the source (250 frames)', () => {
  const r = R('to_only_input'); assert.equal(r.declared.frames, 250); assert.equal(r.content.first, 0); assert.equal(r.content.last, 249);
});

t('the two readers agree on the length of every cut: frames from ffprobe equal the frames matched by md5, and seconds equal frames over 25', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.declared.frames, r.content.last - r.content.first + 1, k);
    assert.ok(Math.abs(r.declared.seconds - r.declared.frames / 25) < 0.05, `${k}: ${r.declared.seconds}s`);
    assert.ok(r.content.contiguous, k);
  }
});
