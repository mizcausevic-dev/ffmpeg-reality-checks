import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, tmp;
after(() => { try { if (tmp) fs.rmSync(tmp, {recursive: true, force: true}); } catch { /* only the temp dir was written */ } });
before(() => { if (ok) { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff37-')); ev = runExperiment(tmp); } });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const K = (k) => ev.cases[k];
const evenDown = (n) => Math.floor(n / 2) * 2;
// the pad rule, derived from what the first reader measured (not typed in): with 4:2:0 the offset is the integer part of what the expression asks, rounded down to even,
// and the input is cropped to an even width and height.
const rule = (c) => ({top: evenDown(Math.floor(c.ask.y)), left: evenDown(Math.floor(c.ask.x)), rows: evenDown(c.scaled.height), cols: evenDown(c.scaled.width)});

t('control: a 4:3 source scaled into 1920x1080 is 1440x1080 (ffprobe), and the decode shows symmetric bars: 240 columns left, 240 right, none above or below', () => {
  const c = K('ctrl');
  assert.deepEqual([c.scaled.width, c.scaled.height], [1440, 1080]);
  assert.deepEqual([c.probed.width, c.probed.height], [1920, 1080]);
  assert.deepEqual([c.bars.left, c.bars.right, c.bars.top, c.bars.bottom], [240, 240, 0, 0]);
  assert.deepEqual([c.bars.contentCols, c.bars.contentRows], [1440, 1080]);
  assert.deepEqual(c.match, {rows: 1080, cols: 1440});
  assert.equal(c.bars.chromaLeft * 2, c.bars.left);
});

t('control: both readers can see an edge. The first and the last row of every unpadded render are not black, so a black row in a padded frame is bar, not picture', () => {
  for (const [k, c] of Object.entries(ev.cases)) { if (!c.scaled) continue; assert.equal(c.scaled.firstRowBlack, false, k); assert.equal(c.scaled.lastRowBlack, false, k); }
});

t('odd height: 1280x690 scaled with force_original_aspect_ratio=decrease is 1920x1035 by ffprobe, so the pad expression asks for y=22.5', () => {
  const c = K('oddH');
  assert.deepEqual([c.scaled.width, c.scaled.height], [1920, 1035]);
  assert.equal(c.ask.y, 22.5); assert.equal(c.ask.x, 0);
});

t('odd height: the padded frame is 1920x1080 by ffprobe, but only 1034 of the 1035 picture rows are in it. Bars are 22 above and 24 below, not 22.5 and 22.5', () => {
  const c = K('oddH');
  assert.deepEqual([c.probed.width, c.probed.height], [1920, 1080]);
  assert.deepEqual([c.bars.top, c.bars.bottom, c.bars.left, c.bars.right], [22, 24, 0, 0]);
  assert.equal(c.bars.contentRows, 1034);
  assert.equal(c.scaled.height - c.bars.contentRows, 1);
});

t('odd height: the 1034 rows that are there are identical to rows 0 to 1033 of the unpadded render, so the row that is missing is the last one', () => {
  const c = K('oddH');
  assert.deepEqual(c.match, {rows: 1034, cols: 1920});
});

t('the pad rule predicts every 4:2:0 case from the scaled size: offset rounded down to even, input cropped to even width and height', () => {
  for (const k of ['ctrl', 'oddH', 'oddHfix', 'oddW', 'oddWfix', 'port', 'portOdd']) {
    const c = K(k), r = rule(c);
    assert.equal(c.bars.top, r.top, `${k} top`); assert.equal(c.bars.left, r.left, `${k} left`);
    assert.equal(c.bars.contentRows, r.rows, `${k} rows`); assert.equal(c.bars.contentCols, r.cols, `${k} cols`);
    assert.equal(c.bars.top + c.bars.contentRows + c.bars.bottom, c.box[1], `${k} height adds up`);
    assert.equal(c.bars.left + c.bars.contentCols + c.bars.right, c.box[0], `${k} width adds up`);
  }
});

t('odd width: 1278x720 scales to 1917x1080, the pad asks for x=1.5, and the frame has 0 columns of bar on the left and 4 on the right, with 1916 picture columns', () => {
  const c = K('oddW');
  assert.deepEqual([c.scaled.width, c.scaled.height], [1917, 1080]);
  assert.equal(c.ask.x, 1.5);
  assert.deepEqual([c.bars.left, c.bars.right, c.bars.top, c.bars.bottom], [0, 4, 0, 0]);
  assert.equal(c.bars.contentCols, 1916);
  assert.deepEqual(c.match, {rows: 1080, cols: 1916});
});

t('even size, odd offset: a 4:3 source in a 1080x1920 frame is 1080x810 and asks for y=555, nothing is cropped, but the bars are 554 above and 556 below', () => {
  const c = K('port');
  assert.deepEqual([c.scaled.width, c.scaled.height], [1080, 810]);
  assert.equal(c.ask.y, 555);
  assert.deepEqual([c.bars.top, c.bars.bottom], [554, 556]);
  assert.equal(c.bars.contentRows, 810);
  assert.deepEqual(c.match, {rows: 810, cols: 1080});
});

t('portrait frame, odd height: 720x390 scales to 1080x585, asks for y=667.5, and gets bars of 666 above and 670 below with 584 picture rows', () => {
  const c = K('portOdd');
  assert.deepEqual([c.scaled.width, c.scaled.height], [1080, 585]);
  assert.equal(c.ask.y, 667.5);
  assert.deepEqual([c.bars.top, c.bars.bottom, c.bars.contentRows], [666, 670, 584]);
});

t('4:2:0 chroma: the picture always starts on an even luma row and column, so chroma starts at exactly half that. The picture is never shifted by half a chroma sample', () => {
  for (const [k, c] of Object.entries(ev.cases)) {
    if (c.pix !== 'yuv420p' || k === 'padOdd') continue;
    assert.equal(c.bars.top % 2, 0, `${k} top`); assert.equal(c.bars.left % 2, 0, `${k} left`);
    assert.equal(c.bars.chromaTop * 2, c.bars.top, `${k} chroma row`); assert.equal(c.bars.chromaLeft * 2, c.bars.left, `${k} chroma col`);
  }
});

t('explicit offsets are rounded too: pad=1920:1080:0:21 in 4:2:0 puts the picture at row 20, not 21 (chroma starts at row 10)', () => {
  const c = K('explicit21');
  assert.equal(c.bars.top, 20); assert.equal(c.bars.chromaTop, 10);
  assert.equal(c.bars.contentRows, 1034); assert.equal(c.bars.bottom, 26);
});

t('known-positive for the 4:2:0 cause: the same filters in 4:4:4 keep every row and honour the offset. oddH444 has bars 22 and 23 with 1035 rows, and y=21 gives 21 and 24', () => {
  const a = K('oddH444'), b = K('explicit21_444');
  assert.equal(a.pix, 'yuv444p'); assert.equal(a.probed.pix_fmt, 'yuv444p');
  assert.deepEqual([a.bars.top, a.bars.bottom, a.bars.contentRows], [22, 23, 1035]);
  assert.deepEqual(a.match, {rows: 1035, cols: 1920});
  assert.deepEqual([b.bars.top, b.bars.bottom, b.bars.contentRows], [21, 24, 1035]);
  assert.equal(b.bars.chromaTop, 21);
});

t('pad also rounds its own output size: asked for an odd 1917 wide frame, ffprobe says 1916', () => {
  const c = K('padOdd');
  assert.equal(c.probed.width, 1916); assert.equal(c.probed.height, 1080);
  assert.equal(c.bars.left + c.bars.contentCols + c.bars.right, 1916);
});

t('force_divisible_by=2 makes the scaled size even (1920x1036, 1918x1080), nothing is cropped, and the odd-height case becomes symmetric: 22 above, 22 below', () => {
  const h = K('oddHfix'), w = K('oddWfix');
  assert.deepEqual([h.scaled.width, h.scaled.height], [1920, 1036]);
  assert.deepEqual([h.bars.top, h.bars.bottom, h.bars.contentRows], [22, 22, 1036]);
  assert.deepEqual(h.match, {rows: 1036, cols: 1920});
  assert.deepEqual([w.scaled.width, w.scaled.height], [1918, 1080]);
  assert.equal(w.bars.contentCols, 1918);
});

t('force_divisible_by=2 does not centre when the offset is odd: 1918 wide asks for x=1, so the bars are 0 left and 2 right', () => {
  const w = K('oddWfix');
  assert.equal(w.ask.x, 1);
  assert.deepEqual([w.bars.left, w.bars.right], [0, 2]);
});

t('force_divisible_by=2 changes the pixel aspect ratio only slightly: the sample aspect ratio stays within 0.1 percent of 1:1', () => {
  for (const k of ['oddHfix', 'oddWfix']) {
    const [n, d] = K(k).scaled.sar.split(':').map(Number);
    assert.ok(Math.abs(n / d - 1) < 0.001, `${k} sar ${K(k).scaled.sar}`);
  }
});

t('reader agreement: for every case, ffprobe width and height (reader 1) equal the decoded frame size that reader 2 had to read (the byte count matched), and bars plus picture add up to that size', () => {
  for (const [k, c] of Object.entries(ev.cases)) {
    assert.equal(c.bars.top + c.bars.contentRows + c.bars.bottom, c.probed.height, `${k} height`);
    assert.equal(c.bars.left + c.bars.contentCols + c.bars.right, c.probed.width, `${k} width`);
    if (c.scaled) {
      assert.ok(c.scaled.height - c.bars.contentRows >= 0 && c.scaled.height - c.bars.contentRows <= 1, `${k} rows lost`);
      assert.ok(c.scaled.width - c.bars.contentCols >= 0 && c.scaled.width - c.bars.contentCols <= 1, `${k} cols lost`);
      assert.equal(c.match.rows, c.bars.contentRows, `${k} rows equal`); assert.equal(c.match.cols, c.bars.contentCols, `${k} cols equal`);
    }
  }
});

const x = (name) => ev.x264[name];
const x264 = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, (tc) => { if (!ev.x264) return tc.skip('libx264 not in this build'); return fn(); });
x264('libx264 yuv420p refuses the odd scaled size: scale alone to 1920x1035 fails and names the height, 1917x1080 fails and names the width', () => {
  assert.notEqual(x('odd').status, 0); assert.equal(x('odd').which, 'height'); assert.deepEqual(x('odd').size, [1920, 1035]); assert.equal(x('odd').wrote, null);
  assert.notEqual(x('oddW').status, 0); assert.equal(x('oddW').which, 'width'); assert.deepEqual(x('oddW').size, [1917, 1080]);
});

x264('libx264 accepts the padded frame (1920x1080, even) and the force_divisible_by=2 size (1920x1036)', () => {
  assert.equal(x('padded').status, 0); assert.deepEqual([x('padded').wrote.width, x('padded').wrote.height], [1920, 1080]);
  assert.equal(x('fixed').status, 0); assert.deepEqual([x('fixed').wrote.width, x('fixed').wrote.height], [1920, 1036]);
});
