import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, asFull, asLimited, buildOf} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff26-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const C = (k) => ev.cases[k];
const Y = (k, p) => C(k).patches[p].rawY;
const SHOWN = (k, p) => C(k).patches[p].shownByTag;
// The build matters for exactly two cases (measured on 6.1.1 here and on 8.1.2 on the PC): -color_range pc on RGB input, and the control that ends in -color_range tv.
// 6.x only writes the label; 8.x also converts the pixels. Every other case is the same on both builds. On any other build the tests check the rule that must hold anyway.
const B = () => ev.build;
const LIMITED = {black: 16, white: 235, shadow: 23, highlight: 228}, FULL = {black: 0, white: 255, shadow: 8, highlight: 247};
const ys = (k) => Object.fromEntries(Object.keys(FULL).map((p) => [p, Y(k, p)]));
const known = () => B() === 'v6' || B() === 'v8';

t('control: the source is lossless RGB with full range, and the four patches are pure black (0), pure white (255), 8 and 247', () => {
  assert.equal(buildOf(ev.ffmpeg), ev.build);
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

t('the default yuv420p encode puts black at Y 16 and white at Y 235 (shadow 23, highlight 228), and writes NO range tag; a player that follows that shows black 0 and white 255 (both builds)', () => {
  const c = C('default');
  assert.equal(c.pix_fmt, 'yuv420p'); assert.equal(c.color_range, 'unknown');
  assert.deepEqual(ys('default'), LIMITED);
  assert.equal(SHOWN('default', 'black'), 0); assert.equal(SHOWN('default', 'white'), 255);
});

t('-color_range tv adds nothing: same pixels as the default (identical raw frame), same absent tag (both builds)', () => {
  assert.equal(C('tv').rawMd5, C('default').rawMd5);
  assert.equal(C('tv').color_range, C('default').color_range);
  if (known()) assert.equal(C('tv').color_range, 'unknown');
});

t('-color_range pc on RGB input differs by build. 6.x: the SAME limited bytes as the default (identical raw frame, black 16, white 235) with the tag flipped to pc. 8.x: the pixels are converted to full range (0, 255, 8, 247), identical to -pix_fmt yuvj420p', () => {
  const c = C('pc_tag');
  assert.equal(c.color_range, 'pc');
  if (B() === 'v6') {
    assert.equal(c.pix_fmt, 'yuvj420p');
    assert.equal(c.rawMd5, C('default').rawMd5);
    assert.deepEqual(ys('pc_tag'), LIMITED);
  } else if (B() === 'v8') {
    assert.equal(c.rawMd5, C('yuvj').rawMd5);
    assert.deepEqual(ys('pc_tag'), FULL);
  } else {
    // unknown build: either label-only or converted, but never a pc label on pixels that disagree in a third way
    assert.ok(c.rawMd5 === C('default').rawMd5 || c.rawMd5 === C('yuvj').rawMd5);
  }
});

t('what a tag-following player shows for -color_range pc: 6.x black 16 and white 235 (washed out); 8.x black 0 and white 255 (right)', () => {
  const [b, w] = [SHOWN('pc_tag', 'black'), SHOWN('pc_tag', 'white')];
  if (B() === 'v6') { assert.equal(b, 16); assert.equal(w, 235); assert.equal(SHOWN('pc_tag', 'shadow'), 23); }
  else if (B() === 'v8') { assert.equal(b, 0); assert.equal(w, 255); assert.equal(SHOWN('pc_tag', 'shadow'), 8); }
  assert.equal(SHOWN('default', 'black'), 0);
});

t('washed out on EVERY build: copy the default stream and rewrite only the full_range flag to 1 (bitstream filter) and the bytes are the default bytes (identical raw frame), tag pc, a tag-following player shows black 16 and white 235', () => {
  const c = C('relabel_pc');
  assert.equal(c.color_range, 'pc');
  assert.equal(c.rawMd5, C('default').rawMd5);
  assert.deepEqual(ys('relabel_pc'), LIMITED);
  assert.deepEqual(['black', 'white', 'shadow', 'highlight'].map((p) => SHOWN('relabel_pc', p)), [16, 235, 23, 228]);
});

t('real full range (both builds): -pix_fmt yuvj420p and scale=out_range=full both give Y 0, 255, 8, 247, tag pc, identical raw frame, shown right; scale=out_range=full turned the requested yuv420p into yuvj420p', () => {
  for (const k of ['yuvj', 'scale_full']) {
    assert.deepEqual(ys(k), FULL);
    assert.equal(C(k).color_range, 'pc');
    assert.equal(SHOWN(k, 'black'), 0); assert.equal(SHOWN(k, 'white'), 255);
  }
  assert.equal(C('yuvj').rawMd5, C('scale_full').rawMd5);
  if (known()) assert.equal(C('scale_full').pix_fmt, 'yuvj420p');
});

t('scale=out_range=limited is the same file content as the default (raw frame identical, black 16, white 235, no tag) on both builds', () => {
  assert.equal(C('scale_limited').rawMd5, C('default').rawMd5);
  assert.equal(C('scale_limited').color_range, C('default').color_range);
});

t('control, on EVERY build: copy the full range stream and rewrite only the full_range flag to 0. The bytes stay full (0, 255, 8, 247, identical raw frame), the tag is no longer pc, and a tag-following player shows 8 as 0 and 247 as 255 (crushed and clipped)', () => {
  const c = C('relabel_tv');
  assert.notEqual(c.color_range, 'pc');
  assert.equal(c.rawMd5, C('yuvj').rawMd5);
  assert.deepEqual(ys('relabel_tv'), FULL);
  assert.equal(SHOWN('relabel_tv', 'shadow'), 0); assert.equal(SHOWN('relabel_tv', 'highlight'), 255);
});

t('the encode that ends in -color_range tv after scale=out_range=full differs by build. 6.x: full pixels (8 and 247) with no label, shown 0 and 255. 8.x: the pixels are converted back to limited (23, 228), identical to the default, shown 8 and 247', () => {
  const c = C('wrong_tv');
  assert.equal(c.color_range, 'unknown');
  if (B() === 'v6') {
    assert.deepEqual(ys('wrong_tv'), FULL);
    assert.equal(SHOWN('wrong_tv', 'shadow'), 0); assert.equal(SHOWN('wrong_tv', 'highlight'), 255);
  } else if (B() === 'v8') {
    assert.equal(c.rawMd5, C('default').rawMd5);
    assert.deepEqual(ys('wrong_tv'), LIMITED);
    assert.equal(SHOWN('wrong_tv', 'shadow'), 8); assert.equal(SHOWN('wrong_tv', 'highlight'), 247);
  }
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
