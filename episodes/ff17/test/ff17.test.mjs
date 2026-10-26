import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff17-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const worst = (e, r) => e.read[r].worstError;
const SMALL = 3;   // round trip through 8-bit 4:2:0 costs a level or two
const BIG = 15;    // a wrong matrix costs far more

t('control: the source patches are pure red, green, blue and mid gray, and a matching reading brings every one back within a level or two', () => {
  assert.deepEqual(ev.source.green, [0, 255, 0]);
  assert.ok(worst(ev.encodes.default, 'bt601') <= SMALL);
  assert.ok(worst(ev.encodes.tagged709, 'bt709') <= SMALL);
});

t('the default output carries no color matrix tag, and its pixels were made with BT.601 (read as BT.601: right; read as BT.709: wrong by 30 or more)', () => {
  const e = ev.encodes.default;
  assert.equal(e.tag.colorSpace, null);
  assert.ok(worst(e, 'auto') <= SMALL && worst(e, 'bt601') <= SMALL);
  assert.ok(worst(e, 'bt709') >= 30, `bt709 reading error ${worst(e, 'bt709')}`);
});

t('read as BT.709, the default output turns pure green into a duller green (the green channel falls to about 215) and adds red and blue haze elsewhere', () => {
  const g = ev.encodes.default.read.bt709.patches.green[1];
  assert.ok(g >= 205 && g <= 225, `green channel ${g}`);
  assert.ok(ev.encodes.default.read.bt709.patches.red[1] >= 15, 'red patch gains green');
});

t('gray does not move under any reading of any file (the matrices differ only in how they weigh color)', () => {
  for (const e of Object.values(ev.encodes)) for (const r of Object.values(e.read)) for (const v of r.patches.gray) assert.ok(Math.abs(v - 128) <= 1);
});

t('a file made with BT.709 and tagged BT.709 reads right when the tag is followed, and wrong when read as BT.601', () => {
  const e = ev.encodes.tagged709;
  assert.equal(e.tag.colorSpace, 'bt709');
  assert.ok(worst(e, 'auto') <= SMALL && worst(e, 'bt709') <= SMALL);
  assert.ok(worst(e, 'bt601') >= BIG);
});

t('the reader that follows the file (auto) gives the same result as the BT.709 reading when the file says bt709, and as the BT.601 reading when the file says nothing', () => {
  for (const [k, e] of Object.entries(ev.encodes)) {
    const same = e.tag.colorSpace === 'bt709' ? 'bt709' : 'bt601';
    assert.deepEqual(e.read.auto.patches, e.read[same].patches, k);
  }
});

t('scale=out_color_matrix=bt709 makes BT.709 pixels in every build, but only some builds also write the tag: where it is missing, the file is misread (error 15 or more); where it is written, it reads right', () => {
  const e = ev.encodes.untagged709;
  assert.ok(worst(e, 'bt709') <= SMALL, 'the pixels are BT.709');
  if (e.tag.colorSpace === 'bt709') assert.ok(worst(e, 'auto') <= SMALL);
  else { assert.equal(e.tag.colorSpace, null); assert.ok(worst(e, 'auto') >= BIG); }
});

t('-colorspace bt709 on a plain RGB source: in some builds it only writes the label (pixels stay BT.601, the file lies, error 30 or more), in others it also changes the conversion (reads right)', () => {
  const e = ev.encodes.liar;
  assert.equal(e.tag.colorSpace, 'bt709');
  if (worst(e, 'auto') <= SMALL) assert.ok(worst(e, 'bt709') <= SMALL, 'conversion followed the tag');
  else { assert.ok(worst(e, 'auto') >= 30); assert.ok(worst(e, 'bt601') <= SMALL, 'pixels are still BT.601'); }
});
