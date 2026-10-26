import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, psnrNode, Q_RANGE, W, H} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff41-')); ev = runExperiment(dir); } });
after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const Q = (n) => R(`q${n}`);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const same = (a, b, msg) => { assert.equal(R(a).fileMd5, R(b).fileMd5, `${msg ?? ''} ${a} and ${b}: files differ`); };

t('the psnr helper is sane: identical buffers give infinity, a one-level shift on every byte gives 20 log10(255) dB', () => {
  const a = Buffer.alloc(W * H * 3, 100), b = Buffer.alloc(W * H * 3, 101);
  assert.equal(psnrNode(a, a), Infinity);
  near(psnrNode(a, b), 20 * Math.log10(255), 1e-9);
});

t('source: a 640x360 PNG, and both PSNR readers see the source as identical to itself (infinity)', () => {
  assert.equal(ev.source.size, '640x360');
  assert.ok(ev.source.pngBytes > 100000, 'a detailed, noisy card does not compress well');
  assert.equal(ev.source.selfPsnrFfmpeg, Infinity);
  assert.equal(ev.source.selfPsnrNode, Infinity);
});

t('every output is a 640x360 mjpeg JPEG with 4:4:4 chroma, so subsampling does not hide the effect', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.codec, 'mjpeg', k); assert.equal(r.width, W, k); assert.equal(r.height, H, k);
    assert.match(String(r.pixFmt), /444/, k);
  }
});

t('known-positive control: -q:v 2 and -q:v 31 clearly differ in both quality readers and in both size readers', () => {
  const a = Q(2), b = Q(31);
  assert.notEqual(a.fileMd5, b.fileMd5); assert.notEqual(a.pixMd5, b.pixMd5); assert.notEqual(a.frameMd5, b.frameMd5);
  assert.ok(a.sizeFs / b.sizeFs > 8, `filesystem size ratio ${a.sizeFs / b.sizeFs}`);
  assert.ok(a.sizeProbe / b.sizeProbe > 8, `ffprobe size ratio ${a.sizeProbe / b.sizeProbe}`);
  assert.ok(a.psnrFfmpeg - b.psnrFfmpeg > 6, `ffmpeg psnr gap ${a.psnrFfmpeg - b.psnrFfmpeg}`);
  assert.ok(a.psnrNode - b.psnrNode > 6, `node psnr gap ${a.psnrNode - b.psnrNode}`);
});

t('reader agreement: filesystem size equals ffprobe size, and the ffmpeg psnr filter agrees with the Node PSNR within 0.1 dB, on every output', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.sizeFs, r.sizeProbe, `${k} size`);
    near(r.psnrFfmpeg, r.psnrNode, 0.1, `${k} psnr`);
  }
});

t('reader agreement: two outputs have the same raw pixel md5 exactly when they have the same ffmpeg frame md5', () => {
  const keys = Object.keys(ev.runs);
  for (const a of keys) for (const b of keys) {
    assert.equal(R(a).pixMd5 === R(b).pixMd5, R(a).frameMd5 === R(b).frameMd5, `${a} vs ${b}`);
  }
});

t('a lower q:v number is higher quality: sizes never grow and PSNR never rises as q:v goes from 2 to 31, in both readers', () => {
  for (let q = 3; q <= 31; q++) {
    assert.ok(Q(q).sizeFs <= Q(q - 1).sizeFs, `size grew at q:v ${q}`);
    assert.ok(Q(q).psnrFfmpeg <= Q(q - 1).psnrFfmpeg + 0.05, `ffmpeg psnr rose at q:v ${q}`);
    assert.ok(Q(q).psnrNode <= Q(q - 1).psnrNode + 0.05, `node psnr rose at q:v ${q}`);
  }
  assert.ok(Q(31).sizeFs < Q(2).sizeFs / 8);
});

t('q:v is the quantizer step, not a quality: the first AC entry of the DQT table in the file is about 2 x q:v (2 gives 4, 5 gives 10, 10 gives 20, 31 gives 62), and the DC step stays the same', () => {
  for (let q = 2; q <= 31; q++) {
    assert.ok(Q(q).dqt, `q:v ${q} has a DQT table`);
    near(Q(q).dqt.ac1, 2 * q, 2, `q:v ${q} first AC step`);
  }
  assert.equal(new Set(Q_RANGE.map((q) => Q(q).dqt.dc)).size, 1, 'DC step is constant');
  assert.ok(Q(31).dqt.sum > 10 * Q(2).dqt.sum * 0.6, 'whole table gets coarser');
});

t('the size curve is steep at the low end: 2 to 5 costs more than 2.5x the bytes, 5 to 10 and 10 to 31 each cost 1.5x to 2.5x, and a dB costs over 3x more bytes between 2 and 5 than between 10 and 31', () => {
  const r25 = Q(2).sizeFs / Q(5).sizeFs, r510 = Q(5).sizeFs / Q(10).sizeFs, r1031 = Q(10).sizeFs / Q(31).sizeFs;
  assert.ok(r25 > 2.5, `2 vs 5 ratio ${r25}`);
  assert.ok(r510 > 1.5 && r510 < 2.5, `5 vs 10 ratio ${r510}`);
  assert.ok(r1031 > 1.5 && r1031 < 2.5, `10 vs 31 ratio ${r1031}`);
  const gain25 = Q(2).psnrFfmpeg - Q(5).psnrFfmpeg, gain1031 = Q(10).psnrFfmpeg - Q(31).psnrFfmpeg;
  assert.ok(gain25 > 3 && gain25 < 6, `2 vs 5 gain ${gain25}`);
  const perDbLow = (Q(2).sizeFs - Q(5).sizeFs) / gain25, perDbHigh = (Q(10).sizeFs - Q(31).sizeFs) / gain1031;
  assert.ok(perDbLow > 3 * perDbHigh, `bytes per dB ${perDbLow} vs ${perDbHigh}`);
});

t('-q:v 1 is the same file as -q:v 2 (clamped by the default qmin of 2): same bytes, same pixels, same quantizer table', () => {
  same('q1', 'q2');
  assert.equal(Q(1).pixMd5, Q(2).pixMd5); assert.equal(Q(1).frameMd5, Q(2).frameMd5);
  assert.deepEqual(Q(1).dqt, Q(2).dqt);
});

t('explicit -qmin 1 -q:v 1 lets the finer step through: first AC step 2, more than 1.3x the bytes of q:v 2, and over 2 dB higher in both readers', () => {
  const a = R('qmin1'), b = Q(2);
  assert.ok(a.dqt.ac1 < b.dqt.ac1, 'finer step');
  assert.ok(a.sizeFs > 1.3 * b.sizeFs, `${a.sizeFs} vs ${b.sizeFs}`);
  assert.ok(a.psnrFfmpeg - b.psnrFfmpeg > 2); assert.ok(a.psnrNode - b.psnrNode > 2);
  assert.notEqual(a.pixMd5, b.pixMd5);
});

t('-qmin and -qmax win over -q:v: -q:v 5 -qmin 10 is the -q:v 10 file, and -q:v 5 -qmax 3 is the -q:v 3 file', () => {
  same('q5qmin10', 'q10'); same('q5qmax3', 'q3');
});

t('-qscale:v 5 is the same file as -q:v 5, and a repeated -q:v 5 is the same file again (the encode is deterministic)', () => {
  same('qscale5', 'q5'); same('q5again', 'q5');
});

t('no quality option at all lands on some quantizer in the middle of the range (between the q:v 2 and q:v 10 files), not on the best one', () => {
  const d = R('dflt');
  assert.ok(d.sizeFs < Q(2).sizeFs && d.sizeFs > Q(10).sizeFs, `default size ${d.sizeFs}`);
  assert.ok(d.psnrNode < Q(2).psnrNode && d.psnrNode > Q(10).psnrNode);
});

t('-huffman changes bytes but not pixels: default tables are at least 5% bigger than optimal at q:v 5 and q:v 2, with identical decoded pixels in both readers; omitting -huffman is the optimal file', () => {
  for (const [d, o] of [['h5def', 'h5opt'], ['h2def', 'h2opt']]) {
    assert.ok(R(d).sizeFs > 1.05 * R(o).sizeFs, `${d} ${R(d).sizeFs} vs ${R(o).sizeFs}`);
    assert.notEqual(R(d).fileMd5, R(o).fileMd5);
    assert.equal(R(d).pixMd5, R(o).pixMd5); assert.equal(R(d).frameMd5, R(o).frameMd5);
    assert.deepEqual(R(d).dqt, R(o).dqt, 'same quantizer table');
    assert.equal(R(d).psnrNode, R(o).psnrNode);
  }
  same('h5opt', 'q5'); same('h2opt', 'q2');
});

t('the huffman saving is small next to the quantizer: optimal tables at q:v 2 still cost more than 2.5x the bytes of q:v 5 with default tables', () => {
  assert.ok(R('h2opt').sizeFs > 2.5 * R('h5def').sizeFs, `${R('h2opt').sizeFs} vs ${R('h5def').sizeFs}`);
});
