import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, CASES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff36-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.cases[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const CAP = 2000;
// every relation below is asserted with a margin on both readers; x264 rate control differs between builds, so no exact kbps is asserted

t('records the ffmpeg and x264 versions it ran on', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.match(ev.x264 ?? '', /^x264 - core \d+/);
  assert.ok(['v6', 'v8', 'other'].includes(ev.build));
});

t('source and control: 200 frames in 8 s, every encode keeps 200 packets and 200 frames, and the crf 18 baseline is far above the 2000 kbps cap on both readers', () => {
  assert.equal(ev.source.frames, 200);
  for (const [k, r] of Object.entries(ev.cases)) { assert.equal(r.packets, 200, k); assert.equal(r.frames, 200, k); }
  const c = R('crf');
  for (const v of [c.kbpsProbe, c.kbpsAnnexB]) assert.ok(v > CAP * 1.4, `baseline ${v} kbps`);
  for (const v of [c.worstProbe, c.worstAnnexB]) assert.ok(v > c.kbpsProbe, 'busiest second above the average');
  assert.equal(c.rcInStream, 'crf'); assert.equal(c.vbvInStream, null);
});

t('maxrate alone: ffmpeg warns that it is ignored, and the output is the same bitstream as crf only (packet md5 and stream md5 both equal)', () => {
  const m = R('maxrate_only'), c = R('crf');
  assert.match(m.warning, /VBV/i); assert.match(m.warning, /bufsize/i); assert.match(m.warning, /ignored/i);
  assert.equal(c.warning, '');
  assert.equal(m.packetMd5Ffmpeg, c.packetMd5Ffmpeg);
  assert.equal(m.streamMd5Node, c.streamMd5Node);
});

t('maxrate alone changes nothing the readers can measure: same average, same busiest second, same PSNR, and no vbv entry in the stream', () => {
  const m = R('maxrate_only'), c = R('crf');
  assert.equal(m.kbpsProbe, c.kbpsProbe); assert.equal(m.kbpsAnnexB, c.kbpsAnnexB);
  assert.equal(m.worstProbe, c.worstProbe); assert.equal(m.worstAnnexB, c.worstAnnexB);
  assert.equal(m.psnrNode, c.psnrNode);
  assert.equal(m.vbvInStream, null); assert.equal(m.bufInStream, null); assert.equal(m.rcInStream, 'crf');
  assert.ok(m.kbpsProbe > CAP * 1.4 && m.worstProbe > CAP * 1.4, 'still far above the cap');
});

t('explicit spellings behave the same: maxrate 2000k and x264-params vbv-maxrate=2000 are also ignored, and bufsize without maxrate is ignored too (same bitstream as crf only)', () => {
  for (const k of ['maxrate_2000k', 'params_only', 'bufsize_only']) {
    assert.match(R(k).warning, /ignored/i, k);
    assert.equal(R(k).packetMd5Ffmpeg, R('crf').packetMd5Ffmpeg, k);
    assert.equal(R(k).streamMd5Node, R('crf').streamMd5Node, k);
  }
});

t('maxrate plus bufsize equal to maxrate: no warning, vbv recorded in the stream, the average and the busiest second both drop clearly', () => {
  const b = R('buf1x'), c = R('crf');
  assert.equal(b.warning, '');
  assert.equal(b.vbvInStream, '2000'); assert.equal(b.bufInStream, '2000');
  assert.notEqual(b.packetMd5Ffmpeg, c.packetMd5Ffmpeg);
  assert.ok(b.kbpsProbe < c.kbpsProbe * 0.75, `avg ${b.kbpsProbe} vs ${c.kbpsProbe}`);
  assert.ok(b.kbpsAnnexB < c.kbpsAnnexB * 0.75);
  assert.ok(b.worstProbe < c.worstProbe * 0.85, `worst ${b.worstProbe} vs ${c.worstProbe}`);
  assert.ok(b.worstAnnexB < c.worstAnnexB * 0.85);
});

t('the buffer is not a per second limit: with bufsize equal to maxrate the busiest second is still above the cap (build specific, measured on 6.1.1)', () => {
  const b = R('buf1x');
  assert.ok(b.worstProbe > CAP && b.worstAnnexB > CAP, `${b.worstProbe} / ${b.worstAnnexB}`);
});

t('bufsize changes the result: 2x maxrate gives a different stream and a busier worst second than bufsize equal to maxrate', () => {
  const a = R('buf1x'), b = R('buf2x');
  assert.equal(b.vbvInStream, '2000'); assert.equal(b.bufInStream, '4000');
  assert.notEqual(a.packetMd5Ffmpeg, b.packetMd5Ffmpeg);
  assert.ok(b.worstProbe > a.worstProbe * 1.05, `${b.worstProbe} vs ${a.worstProbe}`);
  assert.ok(b.worstAnnexB > a.worstAnnexB * 1.05);
  assert.ok(b.worstProbe < R('crf').worstProbe, 'still below the uncapped baseline');
});

t('known-positive control: a tiny bufsize (200k) makes the window readers see the cap, the busiest second lands within 15 percent of 2000 kbps', () => {
  const k = R('tiny'), b = R('buf1x'), c = R('crf');
  assert.equal(k.bufInStream, '200');
  for (const w of [k.worstProbe, k.worstAnnexB]) assert.ok(w < CAP * 1.15, `worst ${w}`);
  assert.ok(k.worstProbe < b.worstProbe * 0.9 && k.worstProbe < c.worstProbe * 0.65);
  assert.ok(k.kbpsProbe < b.kbpsProbe);
});

t('abr b:v 2M alone: the average is honored (within 15 percent of 2000 kbps) but the busiest second is well above the average and above the cap', () => {
  const a = R('abr');
  assert.equal(a.rcInStream, 'abr');
  for (const v of [a.kbpsProbe, a.kbpsAnnexB]) near(v, CAP, CAP * 0.15, 'average');
  for (const w of [a.worstProbe, a.worstAnnexB]) { assert.ok(w > a.kbpsProbe * 1.1, `worst ${w}`); assert.ok(w > CAP * 1.05); }
});

t('the cap costs quality: PSNR against the lossless source falls by more than 3 dB from crf only to maxrate with bufsize, on both PSNR readers', () => {
  const c = R('crf'), b = R('buf1x');
  assert.ok(c.psnrFfmpeg - b.psnrFfmpeg > 3, `${c.psnrFfmpeg} vs ${b.psnrFfmpeg}`);
  assert.ok(c.psnrNode - b.psnrNode > 3);
  assert.ok(c.psnrFfmpeg > 35 && c.psnrFfmpeg < 45);
});

t('the two rate readers agree on every encode: average within 1 percent, busiest second within 1 percent', () => {
  for (const [k, r] of Object.entries(ev.cases)) {
    near(r.kbpsProbe, r.kbpsAnnexB, r.kbpsProbe * 0.01, `${k} average`);
    near(r.worstProbe, r.worstAnnexB, r.worstProbe * 0.01, `${k} worst second`);
  }
});

t('the identity readers agree: two encodes share a packet md5 exactly when they share a stream md5, and the two PSNR readers agree within 0.05 dB', () => {
  const names = Object.keys(CASES);
  for (const a of names) for (const b of names) assert.equal(R(a).packetMd5Ffmpeg === R(b).packetMd5Ffmpeg, R(a).streamMd5Node === R(b).streamMd5Node, `${a} ${b}`);
  for (const [k, r] of Object.entries(ev.cases)) near(r.psnrFfmpeg, r.psnrNode, 0.05, k);
});
