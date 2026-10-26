import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff22-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const between = (v, lo, hi, msg) => assert.ok(v >= lo && v <= hi, `${msg}: ${v} not in ${lo}..${hi}`);
const pureRed = (p, m) => { between(p[0], 245, 255, m + ' R'); between(p[1], 0, 6, m + ' G'); between(p[2], 0, 6, m + ' B'); };
const pureBlue = (p, m) => { between(p[0], 0, 6, m + ' R'); between(p[1], 0, 6, m + ' G'); between(p[2], 245, 255, m + ' B'); };

t('control: each file really is the pixel format we asked for', () => {
  for (const [k, r] of Object.entries(ev.runs)) assert.equal(r.pixFmt, k.split('_')[1], k);
});

t('control, yuv444p: the 1-pixel line stays pure red and the pixels beside it stay pure blue, for both lines, and the chroma at the line is red (U 90, V 240)', () => {
  for (const s of ['vline', 'hline']) {
    const r = R(`${s}_yuv444p`); pureRed(r.rgb[0], s + ' line');
    for (const d of [-2, -1, 1, 2]) pureBlue(r.rgb[d], `${s} ${d}`);
    between(r.chroma.u, 88, 92, s + ' U'); between(r.chroma.v, 238, 242, s + ' V');
  }
});

t('yuv420p and yuv422p, vertical line: the red line turns purple (about 150,21,149) and the pixel to its right picks up red (about 104,0,103)', () => {
  for (const pf of ['yuv422p', 'yuv420p']) {
    const r = R(`vline_${pf}`);
    between(r.rgb[0][0], 120, 180, pf + ' R at line'); between(r.rgb[0][2], 120, 180, pf + ' B at line');
    between(r.rgb[1][0], 80, 130, pf + ' R at +1'); between(r.rgb[1][2], 80, 130, pf + ' B at +1');
    pureBlue(r.rgb[-1], pf + ' -1'); pureBlue(r.rgb[2], pf + ' +2');
  }
});

t('yuv422p keeps a horizontal line clean (4:2:2 only halves chroma across), but yuv420p smears it up and down', () => {
  pureRed(R('hline_yuv422p').rgb[0], '422 line'); pureBlue(R('hline_yuv422p').rgb[1], '422 +1'); pureBlue(R('hline_yuv422p').rgb[-1], '422 -1');
  const r = R('hline_yuv420p');
  between(r.rgb[0][0], 100, 180, '420 R at line'); between(r.rgb[0][2], 120, 200, '420 B at line');
  between(r.rgb[1][0], 60, 130, '420 R below'); between(r.rgb[-1][0], 10, 60, '420 R above');
});

t('reader 2 agrees: the chroma at the line moves toward the blue neighbors in every subsampled case that reader 1 saw smeared (U about 175, V about 167)', () => {
  for (const k of ['vline_yuv422p', 'vline_yuv420p', 'hline_yuv420p']) { between(R(k).chroma.u, 165, 185, k + ' U'); between(R(k).chroma.v, 158, 172, k + ' V'); }
  for (const k of ['hline_yuv422p']) { between(R(k).chroma.u, 88, 92, k + ' U'); between(R(k).chroma.v, 238, 242, k + ' V'); }
});

t('the brightness at the line does not change: Y stays about 81 in all six files, so what is lost is color, not light', () => {
  for (const [k, r] of Object.entries(ev.runs)) between(r.chroma.y, 78, 84, k + ' Y');
});
