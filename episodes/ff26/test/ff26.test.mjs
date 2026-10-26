import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, asFull, asLimited} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff26-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const C = (k) => ev.cases[k];
const Y = (k, p) => C(k).patches[p].rawY;
const SHOWN = (k, p) => C(k).patches[p].shownByTag;
// Assertions marked 6.1.1 were measured on this build only. Newer builds may convert pixels for -color_range or write other tags
// (episode 17 found the same split for -colorspace), so on other builds the test checks the rule that must hold anyway.
const is61 = () => /version 6\.1/.test(ev.ffmpeg);

t('control: the source is lossless RGB with full range, and the four patches are pure black (0), pure white (255), 8 and 247', () => {
  assert.equal(ev.source.pix_fmt, 'bgr0');
  assert.equal(ev.source.color_range, 'pc');
  assert.deepEqual(Object.values(ev.source.patches).map((p) => p.rgb), [0, 255, 8, 247]);
});

t('control: both readers can see a range difference. A limited encode puts black at 16 and white at 235, a full encode puts them at 0 and 255, by signalstats and by the raw luma byte', () => {
  for (const [k, lo, hi] of [['default', 16, 235], ['yuvj', 0, 255]]) {
    assert.equal(C(k).patches.black.signalstatsMin, lo); assert.equal(C(k).patches.black.rawY, lo);
    assert.equal(C(k).patches.white.signalstatsMax, hi); assert.equal(C(k).patches.white.rawY, hi);
  }
});

t('the default yuv420p encode puts black at Y 16 and white at Y 235, and writes NO range tag; a player that follows that shows black 0 and white 255', () => {
  const c = C('default');
  assert.equal(c.pix_fmt, 'yuv420p'); assert.equal(c.color_range, 'unknown');
  assert.equal(Y('default', 'black'), 16); assert.equal(Y('default', 'white'), 235);
  assert.equal(SHOWN('default', 'black'), 0); assert.equal(SHOWN('default', 'white'), 255);
});

t('-color_range tv adds nothing: same pixels as the default (identical raw frame), same absent tag', () => {
  assert.equal(C('tv').rawMd5, C('default').rawMd5);
  assert.equal(C('tv').color_range, C('default').color_range);
  if (is61()) assert.equal(C('tv').color_range, 'unknown');
});

t('-color_range pc on RGB input: the pixels are the SAME limited-range bytes as the default (black 16, white 235, identical raw frame) and only the label flips to full (6.1.1)', () => {
  const c = C('pc_tag');
  if (is61()) {
    assert.equal(c.color_range, 'pc'); assert.equal(c.pix_fmt, 'yuvj420p');
    assert.equal(c.rawMd5, C('default').rawMd5);
    assert.equal(Y('pc_tag', 'black'), 16); assert.equal(Y('pc_tag', 'white'), 235);
  } else {
    // other builds: either label-only like 6.1.1, or the pixels are converted to full range so label and pixels agree
    assert.ok(c.rawMd5 === C('default').rawMd5 ? c.color_range === 'pc' : Y('pc_tag', 'black') === 0);
  }
});

t('washed out: with the pc label on limited pixels a tag-following player shows black as 16 and white as 235 (6.1.1); the same pixels with no label show 0 and 255', () => {
  if (is61()) {
    assert.equal(SHOWN('pc_tag', 'black'), 16); assert.equal(SHOWN('pc_tag', 'white'), 235);
    assert.equal(SHOWN('pc_tag', 'shadow'), 23);
  }
  assert.equal(SHOWN('default', 'black'), 0);
});

t('real full range: -pix_fmt yuvj420p and scale=out_range=full both give Y 0 and 255, tag pc, identical raw frame, shown 0 and 255; scale=out_range=full turned the requested yuv420p into yuvj420p (6.1.1)', () => {
  for (const k of ['yuvj', 'scale_full']) {
    assert.equal(Y(k, 'black'), 0); assert.equal(Y(k, 'white'), 255); assert.equal(Y(k, 'shadow'), 8); assert.equal(Y(k, 'highlight'), 247);
    assert.equal(C(k).color_range, 'pc');
    assert.equal(SHOWN(k, 'black'), 0); assert.equal(SHOWN(k, 'white'), 255);
  }
  assert.equal(C('yuvj').rawMd5, C('scale_full').rawMd5);
  if (is61()) assert.equal(C('scale_full').pix_fmt, 'yuvj420p');
});

t('scale=out_range=limited is the same file content as the default (raw frame identical, black 16, white 235, no tag)', () => {
  assert.equal(C('scale_limited').rawMd5, C('default').rawMd5);
  assert.equal(C('scale_limited').color_range, C('default').color_range);
});

t('control, the label is missing from full range pixels: patches 8 and 247 are in the file, but a tag-following player shows 0 and 255 (crushed and clipped)', () => {
  const c = C('wrong_tv');
  assert.equal(c.color_range, 'unknown');
  assert.equal(Y('wrong_tv', 'shadow'), 8); assert.equal(Y('wrong_tv', 'highlight'), 247);
  assert.equal(SHOWN('wrong_tv', 'shadow'), 0); assert.equal(SHOWN('wrong_tv', 'highlight'), 255);
});

t('a player that assumes the other range: limited bytes read as full give 16 and 235; full bytes read as limited give 0 and 255 and lose 8 and 247', () => {
  const d = C('default').patches, f = C('yuvj').patches;
  assert.equal(d.black.ifPlayerAssumesFull, 16); assert.equal(d.white.ifPlayerAssumesFull, 235);
  assert.equal(d.black.ifPlayerAssumesLimited, 0); assert.equal(d.white.ifPlayerAssumesLimited, 255);
  assert.equal(f.shadow.ifPlayerAssumesLimited, 0); assert.equal(f.highlight.ifPlayerAssumesLimited, 255);
  assert.equal(f.shadow.ifPlayerAssumesFull, 8); assert.equal(f.highlight.ifPlayerAssumesFull, 247);
  assert.equal(asLimited(16), 0); assert.equal(asLimited(235), 255); assert.equal(asFull(16), 16);
});

t('the readers agree on every case and patch: signalstats min and max equal the raw luma byte, and the ffmpeg gray conversion equals the tag rule in Node', () => {
  for (const [k, c] of Object.entries(ev.cases)) for (const [p, v] of Object.entries(c.patches)) {
    assert.equal(v.signalstatsMin, v.rawY, `${k} ${p} min`); assert.equal(v.signalstatsMax, v.rawY, `${k} ${p} max`);
    assert.equal(v.shownByFfmpegGray, v.shownByTag, `${k} ${p} display`);
  }
});
