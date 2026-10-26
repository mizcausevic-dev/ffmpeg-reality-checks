import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff25-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];

t('control: the three sources have 125, 150 and 120 frames and every frame is unique, so an md5 identifies a frame', () => {
  assert.deepEqual([ev.sources.s25.frames, ev.sources.s30.frames, ev.sources.s60.frames], [125, 150, 120]);
  for (const s of Object.values(ev.sources)) assert.equal(s.unique, s.frames);
});

t('25 fps, fps=1: keeps source frames 12, 37, 62, 87, 112, the frame at 0.48 s of each second, and NOT frame 0', () => {
  assert.deepEqual(R('s25_near').byMd5, [12, 37, 62, 87, 112]);
});

t('25 fps, fps=1:round=up keeps the FIRST frame of each second (0, 25, 50, 75, 100); round=down keeps the LAST (24, 49, 74, 99, 124)', () => {
  assert.deepEqual(R('s25_up').byMd5, [0, 25, 50, 75, 100]);
  assert.deepEqual(R('s25_down').byMd5, [24, 49, 74, 99, 124]);
});

t("select='not(mod(n,25))' with -fps_mode vfr also keeps the first frame of each second (0, 25, 50, 75, 100)", () => {
  assert.deepEqual(R('s25_select').byMd5, [0, 25, 50, 75, 100]);
});

t('30 fps, fps=1: frames 14, 44, 74, 104, 134 (0.467 s into each second); round=up gives 0, 30, 60, 90, 120', () => {
  assert.deepEqual(R('s30_near').byMd5, [14, 44, 74, 104, 134]);
  assert.deepEqual(R('s30_up').byMd5, [0, 30, 60, 90, 120]);
});

t('60 fps to 24 fps: 48 frames out, the first source frame is never used, and the kept frames step 2, 3, 2, 3 (1, 3, 6, 8, 11, 13, ...)', () => {
  const r = R('s60_to_24');
  assert.equal(r.byMd5.length, 48); assert.deepEqual(r.byMd5.slice(0, 10), [1, 3, 6, 8, 11, 13, 16, 18, 21, 23]);
  assert.ok(!r.byMd5.includes(0));
  const gaps = new Set(r.byMd5.slice(1).map((v, i) => v - r.byMd5[i])); assert.deepEqual([...gaps].sort(), [2, 3]);
});

t('the two readers agree on every output: the frame md5 match and the decoded luma code name the same source frames', () => {
  for (const [k, r] of Object.entries(ev.runs)) assert.deepEqual(r.byLuma, r.byMd5, k);
});
