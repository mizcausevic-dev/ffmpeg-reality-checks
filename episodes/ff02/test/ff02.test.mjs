import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff02-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);

t('fixture: the source really is RGB (PNG frames, rgb24) and has 50 frames', () => {
  assert.equal(ev.source.pngPixFmt, 'rgb24');
  assert.equal(ev.source.pngFrames, 50);
});

t('RGB input with no -pix_fmt: x264 keeps full chroma, giving yuv444p and a 4:4:4 profile', () => {
  const v = ev.variants.default_rgb_input;
  assert.equal(v.pixFmt, 'yuv444p');
  assert.match(v.profile, /4:4:4/);
  assert.equal(v.frames, 50);
});

t('known-positive control: asking for yuv444p explicitly gives the same pixel format and profile as the default', () => {
  assert.equal(ev.variants.forced_yuv444p.pixFmt, ev.variants.default_rgb_input.pixFmt);
  assert.equal(ev.variants.forced_yuv444p.profile, ev.variants.default_rgb_input.profile);
});

t('-pix_fmt yuv420p gives yuv420p and a profile that is not 4:4:4, with all frames kept', () => {
  const v = ev.variants.pix_fmt_yuv420p;
  assert.equal(v.pixFmt, 'yuv420p');
  assert.doesNotMatch(v.profile, /4:4:4/);
  assert.equal(v.frames, 50);
});

t('control: a yuv420p source stays yuv420p, so the surprise is specific to RGB input', () => {
  assert.equal(ev.variants.control_yuv420p_input.pixFmt, 'yuv420p');
  assert.doesNotMatch(ev.variants.control_yuv420p_input.profile, /4:4:4/);
});

t('the fix has a measurable cost on this test pattern: 4:2:0 is further from the RGB original than 4:4:4', () => {
  const a = ev.variants.default_rgb_input.psnrVsOriginal, b = ev.variants.pix_fmt_yuv420p.psnrVsOriginal;
  assert.ok(Number.isFinite(a) && Number.isFinite(b) && a > 25 && b > 25, `PSNR values ${a}, ${b}`);
  assert.ok(a > b, `expected 4:4:4 (${a} dB) above 4:2:0 (${b} dB)`);
});
