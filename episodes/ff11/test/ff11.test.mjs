import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff11-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const V = (k) => ev.variants[k];

t('control: ffv1 gives back every RGB frame bit for bit, and psnr agrees (inf)', () => {
  assert.equal(V('ffv1').identicalRgbFrames, ev.frames);
  assert.equal(V('ffv1').psnrRgb, 'inf');
});

t('libx264rgb -crf 0 is lossless for RGB: every frame identical, psnr inf, stored as gbrp', () => {
  const v = V('x264rgb_crf0');
  assert.equal(v.pixFmt, 'gbrp');
  assert.equal(v.identicalRgbFrames, ev.frames);
  assert.equal(v.psnrRgb, 'inf');
});

t('libx264 -crf 0 with RGB input chooses yuv444p, not RGB', () => {
  assert.equal(V('x264_crf0').pixFmt, 'yuv444p');
});

t('libx264 -crf 0 is NOT lossless against the RGB source: no frame identical, psnr is a finite number', () => {
  const v = V('x264_crf0');
  assert.equal(v.identicalRgbFrames, 0);
  assert.notEqual(v.psnrRgb, 'inf');
  assert.ok(Number.isFinite(Number(v.psnrRgb)), `${v.psnrRgb}`);
});

t('...but it is lossless in its own format: the decoded yuv444p frames equal the source converted to yuv444p, all frames', () => {
  assert.equal(V('x264_crf0').identicalInEncodedFormat, ev.frames);
});

t('with -pix_fmt yuv420p the picture is further from the RGB source than with yuv444p (lower psnr), though still exact in yuv420p', () => {
  assert.equal(V('x264_crf0_420').pixFmt, 'yuv420p');
  assert.equal(V('x264_crf0_420').identicalRgbFrames, 0);
  assert.ok(Number(V('x264_crf0_420').psnrRgb) < Number(V('x264_crf0').psnrRgb));
  assert.equal(V('x264_crf0_420').identicalInEncodedFormat, ev.frames);
});

t('the two comparison methods agree on every variant: frames identical in RGB exactly when psnr is inf', () => {
  for (const v of Object.values(ev.variants)) assert.equal(v.identicalRgbFrames === ev.frames, v.psnrRgb === 'inf');
});
