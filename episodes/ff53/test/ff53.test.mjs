import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, parseQuality, psnrFromMse, ssimWindow, nodePsnrY, nodeSsimY, buildOf, W, H, FRAMES, CRFS} from '../fixture/experiment.mjs';

// both encoders must exist in this build, otherwise the tests are skipped
const hasEncoders = () => { const o = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], {encoding: 'utf8'}).stdout ?? ''; return /libx264\b/.test(o) && /libx265\b/.test(o); };
const ok = have('ffmpeg') && have('ffprobe') && hasEncoders();
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff53-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe with libx264 and libx265 not on PATH'}, fn);
const R = (k) => ev.runs[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const V6 = () => buildOf(ev.ffmpeg) === 'v6';
const ENC = ['x264_18', 'x264_23', 'x264_28', 'x264_default', 'x265_18', 'x265_23', 'x265_28', 'x265_default'];
// a quality number read by reader 1 (ffmpeg filters) and reader 2 (Node), as [ffmpeg, node]
const q = (k, what) => [R(k).ffmpeg[what], R(k).node[what]];
const dPsnr = (a, b) => q(b, 'psnrY').map((v, i) => v - q(a, 'psnrY')[i]);
const dSsim = (a, b) => q(b, 'ssimY').map((v, i) => v - q(a, 'ssimY')[i]);

t('the helpers behave: PSNR from an MSE of 1 is 48.13 dB and an MSE of 0 is infinite, the SSIM window of two equal blocks is 1, the ffmpeg psnr/ssim lines are parsed (including inf), Node PSNR and SSIM of a frame against a noisy copy are below those of an identical copy, build detection', () => {
  near(psnrFromMse(1), 48.13, 0.01); assert.equal(psnrFromMse(0), Infinity);
  assert.equal(ssimWindow(64 * 100, 64 * 100, 2 * 64 * 100 * 100, 64 * 100 * 100), 1);
  const p = parseQuality('PSNR y:inf u:inf v:inf average:inf min:inf max:inf\nSSIM Y:1.000000 (inf) U:1.000000 (inf) V:1.000000 (inf) All:1.000000 (inf)');
  assert.equal(p.psnrY, Infinity); assert.equal(p.ssimY, 1);
  const a = Buffer.alloc(W * H * 3 / 2), b = Buffer.alloc(W * H * 3 / 2);
  for (let i = 0; i < W * H; i++) { a[i] = (i * 7) & 255; b[i] = a[i]; }
  assert.equal(nodePsnrY(a, b, 1), Infinity); near(nodeSsimY(a, b, 1), 1, 1e-9);
  for (let i = 0; i < W * H; i += 3) b[i] = (a[i] + 20) & 255;
  assert.ok(nodePsnrY(a, b, 1) < 40 && nodeSsimY(a, b, 1) < 0.99);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the source is what the fixture promises: 75 frames of 320x240 in a lossless ffv1 file, every encode has the same size, format and all 75 frames (ffprobe and the raw decode agree)', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.source.frames, FRAMES); assert.equal(ev.source.width, W); assert.equal(ev.source.height, H); assert.equal(new Set(ev.source.hashes).size, FRAMES);
  for (const k of [...ENC, 'x264_lossless']) { const r = R(k); assert.equal(r.width, W, k); assert.equal(r.height, H, k); assert.equal(r.frames, FRAMES, k); assert.equal(r.rawFrames, FRAMES, k); assert.equal(r.pixFmt, 'yuv420p', k); }
  assert.equal(R('x264_23').codec, 'h264'); assert.equal(R('x265_23').codec, 'hevc');
});

t('known-positive control: x264 -qp 0 is lossless, so both readers must see a perfect copy: PSNR Y infinite and SSIM Y 1.0000 by ffmpeg and by Node, and the 75 frame hashes equal the source hashes', () => {
  const r = R('x264_lossless');
  assert.equal(r.ffmpeg.psnrY, Infinity); assert.equal(r.node.psnrY, Infinity); near(r.ffmpeg.ssimY, 1, 1e-6); near(r.node.ssimY, 1, 1e-6);
  assert.deepEqual(r.hashes, ev.source.hashes);
});

t('control: lower CRF means more bytes and higher quality, in both codecs and both readers: 18 beats 23 beats 28 in file size, PSNR Y and SSIM Y', () => {
  for (const c of ['x264', 'x265']) {
    const [a, b, d] = CRFS.map((n) => R(`${c}_${n}`));
    assert.ok(a.bytes > b.bytes && b.bytes > d.bytes, `${c} bytes`);
    for (const what of ['psnrY', 'ssimY']) for (const rd of ['ffmpeg', 'node']) assert.ok(a[rd][what] > b[rd][what] && b[rd][what] > d[rd][what], `${c} ${what} ${rd}`);
  }
});

t('reader agreement on every encode: PSNR Y by the ffmpeg psnr filter and by Node agree within 0.02 dB, SSIM Y by the ffmpeg ssim filter and by Node within 0.001, and the file size on disk equals the size ffprobe reports', () => {
  for (const k of ENC) {
    near(R(k).ffmpeg.psnrY, R(k).node.psnrY, 0.02, `${k} psnr`); near(R(k).ffmpeg.ssimY, R(k).node.ssimY, 0.001, `${k} ssim`);
    assert.equal(R(k).bytes, R(k).probeBytes, `${k} size`);
  }
});

t('the question: at the same CRF the two encoders are not equal. At each of CRF 18, 23 and 28 the PSNR Y differs by more than 0.1 dB and the SSIM Y by more than 0.001, in both readers', () => {
  for (const n of CRFS) {
    for (const d of dPsnr(`x264_${n}`, `x265_${n}`)) assert.ok(Math.abs(d) > 0.1, `crf ${n} psnr ${d}`);
    for (const d of dSsim(`x264_${n}`, `x265_${n}`)) assert.ok(Math.abs(d) > 0.001, `crf ${n} ssim ${d}`);
  }
});

t('and the gap is not one direction: at CRF 18 the x265 file is more than 25 percent smaller AND has the lower PSNR Y and SSIM Y; at CRF 23 it has the higher PSNR Y and SSIM Y at within 10 percent of the bytes. Exact on 6.1.1 (ratio 0.60 at 18, 1.03 at 23); only the signs are asserted on other builds', () => {
  const r18 = R('x265_18').bytes / R('x264_18').bytes, r23 = R('x265_23').bytes / R('x264_23').bytes;
  if (V6()) { assert.ok(r18 < 0.75 && r18 > 0.5, `ratio 18 ${r18}`); assert.ok(r23 > 0.9 && r23 < 1.1, `ratio 23 ${r23}`); }
  else assert.ok(r18 < 1, `ratio 18 ${r18}`);
  for (const d of dPsnr('x264_18', 'x265_18')) assert.ok(d < 0, `crf 18 psnr ${d}`);
  for (const d of dSsim('x264_18', 'x265_18')) assert.ok(d < 0, `crf 18 ssim ${d}`);
  if (V6()) { for (const d of dPsnr('x264_23', 'x265_23')) assert.ok(d > 0, `crf 23 psnr ${d}`); for (const d of dSsim('x264_23', 'x265_23')) assert.ok(d > 0, `crf 23 ssim ${d}`); }
});

t('at CRF 28 the two files are within 5 percent of each other in bytes on 6.1.1 (62946 against 62813), yet the PSNR Y still differs by about 0.5 dB: same size, not same quality', () => {
  if (!V6()) return;
  const r = R('x265_28').bytes / R('x264_28').bytes;
  assert.ok(r > 0.95 && r < 1.05, `ratio ${r}`);
  for (const d of dPsnr('x264_28', 'x265_28')) assert.ok(d > 0.3 && d < 0.7, `psnr ${d}`);
});

t('the defaults are not the same CRF: leaving -crf out gives exactly the CRF 23 file for libx264 and exactly the CRF 28 file for libx265 (identical bytes, identical quality numbers)', () => {
  assert.equal(R('x264_default').md5, R('x264_23').md5); assert.equal(R('x265_default').md5, R('x265_28').md5);
  assert.equal(R('x264_default').bytes, R('x264_23').bytes); assert.equal(R('x265_default').bytes, R('x265_28').bytes);
  assert.deepEqual(R('x264_default').ffmpeg, R('x264_23').ffmpeg); assert.deepEqual(R('x265_default').ffmpeg, R('x265_28').ffmpeg);
});

t('so out of the box x265 is a smaller and lower quality file than x264: by PSNR Y and SSIM Y in both readers (x265 default lower), with fewer than 80 percent of the bytes; on 6.1.1 about half the bytes (ratio 0.51) and 1.4 dB lower', () => {
  const ratio = R('x265_default').bytes / R('x264_default').bytes;
  assert.ok(ratio < 0.8, `ratio ${ratio}`);
  for (const d of dPsnr('x264_default', 'x265_default')) assert.ok(d < -0.5, `psnr ${d}`);
  for (const d of dSsim('x264_default', 'x265_default')) assert.ok(d < 0, `ssim ${d}`);
  if (V6()) { assert.ok(ratio > 0.45 && ratio < 0.57, `ratio ${ratio}`); for (const d of dPsnr('x264_default', 'x265_default')) near(d, -1.4, 0.2); }
});

t('the all-plane numbers tell the same story as the Y plane (ffmpeg reader): average PSNR and SSIM All have the same sign as PSNR Y and SSIM Y for x265 minus x264 at CRF 18, 23 and 28, so chroma does not hide a reversal', () => {
  for (const n of CRFS) {
    const a = R(`x264_${n}`).ffmpeg, b = R(`x265_${n}`).ffmpeg;
    assert.equal(Math.sign(b.psnrAvg - a.psnrAvg), Math.sign(b.psnrY - a.psnrY), `crf ${n} psnr`);
    assert.equal(Math.sign(b.ssimAll - a.ssimAll), Math.sign(b.ssimY - a.ssimY), `crf ${n} ssim`);
  }
});

t('PSNR and SSIM agree on the order within each codec and across the CRF 18 comparison: the codec with the higher PSNR Y at a CRF also has the higher SSIM Y, at CRF 18, 23 and 28 (the two metrics are not contradicting each other here)', () => {
  for (const n of CRFS) { const dp = dPsnr(`x264_${n}`, `x265_${n}`), ds = dSsim(`x264_${n}`, `x265_${n}`); assert.equal(Math.sign(dp[0]), Math.sign(ds[0]), `crf ${n}`); assert.equal(Math.sign(dp[1]), Math.sign(ds[1]), `crf ${n}`); }
});

t('run-to-run control: encoding the CRF 23 file a second time gives byte for byte the same file for both encoders (single thread settings), so the differences between the codecs are not noise', () => {
  assert.equal(ev.repeat.x264, R('x264_23').md5); assert.equal(ev.repeat.x265, R('x265_23').md5);
});
