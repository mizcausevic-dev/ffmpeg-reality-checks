import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, boxMean, cardLines, FLAGS, BG, LINE, NLINES, LW, LH, lineX} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff39-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const L = (fl) => ev.lines[fl];
const peaks = (fl) => [0, 1, 2].flatMap((p) => L(fl).byPhase[p].peaks);
const THIRD = BG + (LINE - BG) / 3;            // 106.67: what an exact 3x average of a 1 px line gives

t('the card is what we say it is: 12 lines of luma 200 on 60, one every 25 columns, four per phase of a 3x downscale, mean 65.38', () => {
  const b = cardLines();
  assert.equal(b.length, LW * LH);
  let n = 0; for (let x = 0; x < LW; x++) if (b[x] === LINE) n++;
  assert.equal(n, NLINES);
  const phases = [0, 1, 2].map((p) => Array.from({length: NLINES}, (_, k) => lineX(k) % 3).filter((v) => v === p).length);
  assert.deepEqual(phases, [4, 4, 4]);
  near(ev.inputMean, BG + (LINE - BG) * NLINES / LW, 1e-9);
  assert.match(ev.ffmpeg, /^ffmpeg version /);
});

t('the box-mean helper computes block averages by hand', () => {
  const w = 6, h = 3, a = Buffer.from([1, 2, 3, 10, 10, 10, 4, 5, 6, 20, 20, 20, 7, 8, 9, 30, 30, 30]);
  assert.deepEqual([...boxMean(a, w, h, 3)], [5, 20]);
});

t('known-positive control: flags=area at an integer factor gives the block averages computed in Node (within 1 level, psnr above 55 dB) on a pseudo-random card, and on the line card', () => {
  for (const f of [2, 3, 4]) {
    const c = ev.control.factors[f];
    assert.ok(c.maxdiff <= 1, `${f}x max difference ${c.maxdiff}`);
    assert.ok(c.psnr > 55, `${f}x psnr ${c.psnr}`);
    near(c.signalstatsYavg, c.refYavg, 0.1, `${f}x signalstats YAVG vs Node mean`);
  }
  assert.ok(ev.areaBoxMaxDiff <= 1, `line card: ${ev.areaBoxMaxDiff}`);
  assert.ok(ev.psnrVsBox.area > 55);
});

t('the control can see a difference: every other flag is far from the block averages on the same card (psnr below 30 dB, largest difference above 10 levels), neighbor furthest', () => {
  for (const fl of FLAGS.filter((f) => f !== 'area')) {
    assert.ok(ev.control.others[fl].maxdiff > 10, `${fl} ${ev.control.others[fl].maxdiff}`);
    assert.ok(ev.control.others[fl].psnr < 30, `${fl} ${ev.control.others[fl].psnr}`);
  }
  for (const fl of FLAGS.filter((f) => f !== 'neighbor' && f !== 'area')) assert.ok(ev.control.others.neighbor.psnr < ev.control.others[fl].psnr, fl);
});

t('the scale filter default equals flags=bicubic explicitly (identical output bytes), and the other explicit flags are not the default', () => {
  assert.equal(ev.defaults.lines.sameBytes, true);
  for (const fl of ['neighbor', 'bilinear', 'lanczos', 'area', 'spline']) assert.equal(ev.defaults.others[fl], false, `${fl} should differ from the default`);
});

t('neighbor: each 1 px line either survives untouched (peak 200) or is gone (peak equal to the background 60); one phase in three survives, so 4 lines survive and 8 vanish', () => {
  const pk = peaks('neighbor');
  for (const v of pk) assert.ok(v === BG || v === LINE, `peak ${v}`);
  assert.equal(L('neighbor').vanished, 8);
  assert.equal(pk.filter((v) => v === LINE).length, 4);
  const surviving = [0, 1, 2].filter((p) => L('neighbor').byPhase[p].peaks.every((v) => v === LINE));
  const gone = [0, 1, 2].filter((p) => L('neighbor').byPhase[p].peaks.every((v) => v === BG));
  assert.equal(surviving.length, 1); assert.equal(gone.length, 2);
  // the survivor is one output pixel wide and nothing else changed
  const row = L('neighbor').byPhase[surviving[0]].row;
  assert.equal(row.filter((v) => v === LINE).length, 1); assert.equal(row.filter((v) => v === BG).length, 4);
  assert.equal(L('neighbor').minOfAll, BG);
});

t('neighbor and a shift of one pixel: alternating 0/255 columns at 2x become flat black or flat white, and the shifted card gives the opposite; area gives flat 128 for both', () => {
  const a = ev.stripes[0].neighbor, b = ev.stripes[1].neighbor;
  assert.equal(a.min, a.max); assert.equal(b.min, b.max);
  assert.equal(Math.abs(a.min - b.min), 255);
  assert.deepEqual([a.min, b.min].sort((x, y) => x - y), [0, 255]);
  for (const ph of [0, 1]) { const s = ev.stripes[ph].area; assert.ok(s.min >= 127 && s.max <= 128, `area ${s.min}..${s.max}`); }
});

t('every other flag keeps every line (none vanishes) but at a fraction of its contrast: peak well below 200, between 0.2 and 0.4 of the contrast', () => {
  for (const fl of FLAGS.filter((f) => f !== 'neighbor')) {
    assert.equal(L(fl).vanished, 0, fl);
    for (const v of peaks(fl)) { assert.ok(v > BG + 20 && v <= LINE - 80, `${fl} peak ${v}`); const r = (v - BG) / (LINE - BG); assert.ok(r > 0.2 && r < 0.4, `${fl} retained ${r}`); }
  }
});

t('area is the same at every phase: peak 107 (the exact third, within 1) and a one pixel wide line; bilinear, bicubic and lanczos change with the phase: a weaker, two pixel wide line at phases 0 and 2', () => {
  for (const v of peaks('area')) near(v, THIRD, 1);
  for (const p of [0, 1, 2]) assert.deepEqual(L('area').byPhase[p].wide, [1, 1, 1, 1]);
  for (const fl of ['bilinear', 'bicubic', 'lanczos']) {
    const b = L(fl).byPhase;
    near(b[1].peaks[0], THIRD, 1, `${fl} phase 1`);
    for (const p of [0, 2]) { assert.ok(b[p].peaks[0] < b[1].peaks[0] - 5, `${fl} phase ${p} peak ${b[p].peaks[0]}`); assert.deepEqual(b[p].wide, [2, 2, 2, 2], `${fl} phase ${p} width`); }
    assert.deepEqual(b[0].peaks, [b[0].peaks[0], b[0].peaks[0], b[0].peaks[0], b[0].peaks[0]], 'the four lines of a phase agree');
  }
});

t('ringing: lanczos, spline and bicubic put halo values below the background next to a line (lanczos lowest); bilinear, area and neighbor never go below 60', () => {
  for (const fl of ['bicubic', 'lanczos', 'spline']) assert.ok(L(fl).minOfAll < BG, `${fl} ${L(fl).minOfAll}`);
  assert.ok(L('lanczos').minOfAll <= L('bicubic').minOfAll);
  for (const fl of ['bilinear', 'area', 'neighbor']) assert.equal(L(fl).minOfAll, BG, fl);
});

t('ringing on a step edge: bicubic, lanczos and spline overshoot and undershoot the two levels by a few levels; neighbor, bilinear and area stay inside them', () => {
  for (const fl of ['bicubic', 'lanczos', 'spline']) { assert.ok(ev.step[fl].undershoot > 0 && ev.step[fl].overshoot > 0, fl); assert.ok(ev.step[fl].overshoot <= 12, fl); }
  for (const fl of ['neighbor', 'bilinear', 'area']) { assert.equal(ev.step[fl].undershoot, 0, fl); assert.equal(ev.step[fl].overshoot, 0, fl); }
});

t('sum of luma over a window around a line: area, bilinear and bicubic keep the exact value (within 0.2), lanczos and spline add a little, neighbor is off by 6 or more at every phase (60 or 77.5)', () => {
  const win = BG + (LINE - BG) * 8 / 3 / 64;   // an 8 x 8 output window holds one source column of excess, spread over 3 columns
  near(win, 65.833, 0.001);
  for (const fl of ['area', 'bilinear', 'bicubic']) for (const r of ev.readers[fl]) near(r.node.mean, win, 0.2, `${fl} phase ${r.phase}`);
  for (const fl of ['lanczos', 'spline']) for (const r of ev.readers[fl]) { assert.ok(r.node.mean > win + 0.05 && r.node.mean < win + 0.5, `${fl} phase ${r.phase} ${r.node.mean}`); }
  for (const r of ev.readers.neighbor) assert.ok(Math.abs(r.node.mean - win) > 5, `phase ${r.phase} ${r.node.mean}`);
});

t('reader agreement: signalstats YMIN, YMAX and YAVG on a cropped window match the raw bytes read in Node, for every flag and phase; and psnr against the exact block mean ranks area first, neighbor last', () => {
  for (const fl of FLAGS) for (const r of ev.readers[fl]) {
    near(r.signalstats.ymax, r.node.peak, 1, `${fl} YMAX phase ${r.phase}`);
    near(r.signalstats.ymin, r.node.min, 1, `${fl} YMIN phase ${r.phase}`);
    near(r.signalstats.yavg, r.node.mean, 0.1, `${fl} YAVG phase ${r.phase}`);
  }
  for (const ph of [0, 1]) for (const fl of FLAGS) { const s = ev.stripes[ph][fl]; near(s.signalstats.ymax, s.max, 0.5); near(s.signalstats.ymin, s.min, 0.5); near(s.signalstats.yavg, s.mean, 0.01); }
  for (const fl of FLAGS.filter((f) => f !== 'area')) assert.ok(ev.psnrVsBox.area > ev.psnrVsBox[fl], fl);
  for (const fl of FLAGS.filter((f) => f !== 'neighbor')) assert.ok(ev.psnrVsBox.neighbor < ev.psnrVsBox[fl], fl);
});

t('diagonal 1 px line, 3x: neighbor keeps it only at one phase of three (full value, three times the line luma sum) and drops it at the other two; the other flags keep the line at every phase', () => {
  const kept = [0, 1, 2].filter((d) => ev.diag[d].neighbor.peak === LINE);
  const lost = [0, 1, 2].filter((d) => ev.diag[d].neighbor.peak === BG && ev.diag[d].neighbor.excess === 0);
  assert.equal(kept.length, 1); assert.equal(lost.length, 2);
  near(ev.diag[kept[0]].neighbor.excess, 3 * ev.diag[0].inputExcess, 1);
  for (const fl of FLAGS.filter((f) => f !== 'neighbor')) for (const d of [0, 1, 2]) {
    assert.ok(ev.diag[d][fl].peak > BG + 20, `${fl} d=${d}`);
    near(ev.diag[d][fl].excess, ev.diag[0].inputExcess, 0.25 * ev.diag[0].inputExcess, `${fl} d=${d} excess`);
  }
});
