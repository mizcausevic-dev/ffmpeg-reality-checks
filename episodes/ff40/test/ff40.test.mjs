import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, CASES, SUB, SRC} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, tmp;
after(() => { try { if (tmp) fs.rmSync(tmp, {recursive: true, force: true}); } catch { /* only the temp dir was written */ } });
before(() => { if (ok) { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff40-')); ev = runExperiment(tmp); } });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const K = (k) => ev.cases[k];
const evenDown = (n, s) => Math.floor(n / s) * s;
const size = (k) => [K(k).probed.width, K(k).probed.height];
const start = (k) => [K(k).startX, K(k).startY];
const cstart = (k) => [K(k).chromaStartCol, K(k).chromaStartRow];
// what the filter string asks for: w, h, and x, y (the default expression is (in_w-out_w)/2 and (in_h-out_h)/2), and whether exact=1 is set
function ask(k) {
  const a = CASES[k].vf.replace('crop=', '').split(':');
  const num = a.filter((s) => !s.includes('='));
  const [w, h] = [Number(num[0]), Number(num[1])];
  const x = num.length > 2 ? Number(num[2]) : (SRC.w - w) / 2, y = num.length > 3 ? Number(num[3]) : (SRC.h - h) / 2;
  return {w, h, x, y, exact: a.includes('exact=1')};
}
// the rule, derived from what the readers measured on the 4:2:0 cases (not typed in) and then checked on every case:
//   exact=0 (default): x, y and the size are rounded down to the chroma subsampling; exact=1: luma goes exactly where asked, chroma starts at the asked position divided by the subsampling, rounded down
const rule = (k) => {
  const {w, h, x, y, exact} = ask(k), [sx, sy] = SUB[CASES[k].pix];
  return exact
    ? {w, h, x, y, cx: Math.floor(x / sx), cy: Math.floor(y / sy)}
    : {w: evenDown(w, sx), h: evenDown(h, sy), x: evenDown(x, sx), y: evenDown(y, sy), cx: Math.floor(x / sx), cy: Math.floor(y / sy)};
};

t('control: an even offset in 4:2:0 is honored. crop=96:54:4:6 is 96x54 by ffprobe, luma starts at column 4 row 6, chroma at chroma column 2 row 3, and chroma sits exactly under the luma it belongs to', () => {
  assert.deepEqual(size('evenRef'), [96, 54]);
  assert.deepEqual(start('evenRef'), [4, 6]);
  assert.deepEqual(cstart('evenRef'), [2, 3]);
  assert.deepEqual([K('evenRef').chromaShiftX, K('evenRef').chromaShiftY], [0, 0]);
});

t('control: both readers can see position. In every case the coded luma and chroma values keep counting up by one, so the crop only cut the picture and did not scale it, and ffprobe agrees with the raw decode on both coded cards', () => {
  for (const [k, c] of Object.entries(ev.cases)) {
    assert.equal(c.lumaCounts, true, k); assert.equal(c.chromaCounts, true, k);
    assert.deepEqual([c.probedY.width, c.probedY.height], [c.probed.width, c.probed.height], k);
    assert.equal(c.probed.pix_fmt, CASES[k].pix, k);
    assert.equal(c.lastX, (c.startX + c.probed.width - 1) & 255, `${k}: last column`);
    assert.equal(c.lastY, (c.startY + c.probed.height - 1) & 255, `${k}: last row`);
  }
  // and the readers can tell two positions apart
  assert.notEqual(K('evenRef').md5, K('zeroRef').md5);
});

t('4:2:0 default: crop=96:54:3:5 asks for column 3 row 5, but the picture starts at column 2 row 4 (decoded luma), and the frame is identical to crop=96:54:2:4 (framemd5)', () => {
  assert.deepEqual(size('odd'), [96, 54]);
  assert.deepEqual(start('odd'), [2, 4]);
  assert.deepEqual(cstart('odd'), [1, 2]);
  assert.equal(K('odd').md5, K('oddRef').md5);
  assert.deepEqual(start('oddRef'), [2, 4]);
});

t('exact=0 is the default: writing it out gives the same position and the same frame', () => {
  assert.deepEqual(start('oddExact0'), start('odd'));
  assert.equal(K('oddExact0').md5, K('odd').md5);
});

t('4:2:0 default: an offset of 1,1 does nothing. crop=96:54:1:1 starts at column 0 row 0 and is identical to crop=96:54:0:0', () => {
  assert.deepEqual(start('one'), [0, 0]);
  assert.equal(K('one').md5, K('zeroRef').md5);
});

t('4:2:0 default: odd output size is rounded down too. crop=95:53:3:5 is 94x52 by ffprobe and starts at column 2 row 4', () => {
  assert.deepEqual(size('oddSize'), [94, 52]);
  assert.deepEqual(start('oddSize'), [2, 4]);
});

t('4:2:0 exact=1: luma goes exactly where asked (column 3 row 5) and an odd size is kept (95x53), but the chroma starts at chroma column 1 row 2, one luma pixel off in x and in y', () => {
  assert.deepEqual(size('oddExact1'), [96, 54]);
  assert.deepEqual(start('oddExact1'), [3, 5]);
  assert.deepEqual(cstart('oddExact1'), [1, 2]);
  assert.deepEqual([K('oddExact1').chromaShiftX, K('oddExact1').chromaShiftY], [1, 1]);
  assert.notEqual(K('oddExact1').md5, K('odd').md5);
  assert.deepEqual(size('oddSizeE1'), [95, 53]);
  assert.deepEqual(start('oddSizeE1'), [3, 5]);
  assert.deepEqual([K('oddSizeE1').chromaShiftX, K('oddSizeE1').chromaShiftY], [1, 1]);
});

t('the default keeps luma and chroma aligned in every 4:2:0 case, and exact=1 breaks that alignment exactly when the asked offset is odd', () => {
  for (const k of ['evenRef', 'odd', 'oddRef', 'oddExact0', 'one', 'zeroRef', 'oddSize', 'center']) assert.deepEqual([K(k).chromaShiftX, K(k).chromaShiftY], [0, 0], k);
  assert.deepEqual([K('centerE1').chromaShiftX, K('centerE1').chromaShiftY], [1, 1]);
});

t('centered crop: crop=90:50 asks for x=51 y=29 (the default expression), but the picture starts at column 50 row 28. Margins are 50 and 52 columns, 28 and 30 rows. exact=1 gives 51 and 51, 29 and 29', () => {
  assert.deepEqual(ask('center'), {w: 90, h: 50, x: 51, y: 29, exact: false});
  assert.deepEqual(size('center'), [90, 50]);
  assert.deepEqual(start('center'), [50, 28]);
  const m = (k) => [K(k).startX, SRC.w - size(k)[0] - K(k).startX, K(k).startY, SRC.h - size(k)[1] - K(k).startY];
  assert.deepEqual(m('center'), [50, 52, 28, 30]);
  assert.deepEqual(m('centerE1'), [51, 51, 29, 29]);
});

t('control, 4:4:4 (no chroma subsampling): odd offset 3,5 is honored by default and with exact=1, the frames are identical, an odd size 95x53 is kept, and chroma is aligned', () => {
  assert.deepEqual(size('odd444'), [96, 54]);
  assert.deepEqual(start('odd444'), [3, 5]);
  assert.deepEqual(cstart('odd444'), [3, 5]);
  assert.deepEqual(start('odd444E1'), [3, 5]);
  assert.equal(K('odd444E1').md5, K('odd444').md5);
  assert.deepEqual(size('size444'), [95, 53]);
  assert.deepEqual(start('size444'), [3, 5]);
  for (const k of ['odd444', 'odd444E1', 'size444']) assert.deepEqual([K(k).chromaShiftX, K(k).chromaShiftY], [0, 0], k);
});

t('4:2:2 (half width chroma, full height): the default moves only x (column 2) and keeps row 5; exact=1 keeps both and shifts chroma by one luma pixel in x only', () => {
  assert.deepEqual(start('odd422'), [2, 5]);
  assert.deepEqual(start('odd422E1'), [3, 5]);
  assert.deepEqual([K('odd422E1').chromaShiftX, K('odd422E1').chromaShiftY], [1, 0]);
  assert.deepEqual([K('odd422').chromaShiftX, K('odd422').chromaShiftY], [0, 0]);
});

t('one rule explains all sixteen cases: the default rounds x, y, width and height down to the chroma subsampling; exact=1 keeps them and starts chroma at the asked position divided by the subsampling, rounded down', () => {
  assert.equal(Object.keys(ev.cases).length, 16);
  for (const k of Object.keys(ev.cases)) {
    const r = rule(k), c = K(k);
    assert.deepEqual([c.probed.width, c.probed.height], [r.w, r.h], `${k}: size`);
    assert.deepEqual([c.startX, c.startY], [r.x, r.y], `${k}: luma start`);
    assert.deepEqual([c.chromaStartCol, c.chromaStartRow], [r.cx, r.cy], `${k}: chroma start`);
  }
});
