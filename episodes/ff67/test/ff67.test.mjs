import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, cases, commandOf, buildOf, bytesAtPsnr, psnrNode, flatSpread, FRAMES, FRAME_BYTES, PATCH, THREADS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff67-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (id) => { assert.ok(ev.runs[id], `no case ${id}`); return ev.runs[id]; };
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const ratio = (a, b) => R(a).bytes / R(b).bytes;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const DEF_CRFS = [18, 20, 22, 23, 26, 28, 30, 32, 35];
const ZL_CRFS = [18, 20, 23, 26, 28, 30, 32];

t('the helpers behave: build detection, PSNR of identical data and of a constant error, the flat-patch spread, and every command carries a hard -frames:v 100 and -t 10', () => {
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
  const a = Buffer.alloc(FRAMES * FRAME_BYTES, 100), b = Buffer.alloc(FRAMES * FRAME_BYTES, 100);
  assert.equal(psnrNode(a, b), Infinity);
  b.fill(110); near(psnrNode(a, b), 10 * Math.log10((255 * 255) / 100), 1e-9, 'a constant error of 10 levels');
  assert.ok(Number.isNaN(psnrNode(a, Buffer.alloc(5))));
  assert.deepEqual(flatSpread([[5, 5], [5, 7]]), {min: 5, max: 7, distinct: 2});
  assert.equal(cases().length, 28);
  for (const c of cases()) assert.match(commandOf(c), / -frames:v 100 -t 10 /, `time bounded: ${c.id}`);
  assert.equal(THREADS, 1); assert.deepEqual([PATCH.w, PATCH.h], [24, 18]);
});

t('ffmpeg -version is recorded, and the clips are what the fixture promises: 100 frames each, and the noise is temporal (a flat patch is constant in the clean clip and changes from frame to frame in the noisy one)', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.sources.clean.frames, 100); assert.equal(ev.sources.noisy.frames, 100);
  assert.equal(ev.sources.clean.patchSpread.distinct, 1); assert.equal(ev.sources.clean.patchMad, 0);
  assert.ok(ev.sources.noisy.patchSpread.distinct >= 6, 'the noisy patch takes many values');
  assert.ok(ev.sources.noisy.patchMad > 1, 'the noisy patch changes between two frames');
  assert.ok(ev.sources.noisy.mad > ev.sources.clean.mad * 1.5, 'the noisy clip changes more from frame to frame');
});

t('control: a repeat encode of the same command gives the same file, so the differences below are not run to run noise', () => {
  for (const id of ['n_def23', 'n_zl23']) { assert.equal(ev.repeat[id].same, true, id); assert.equal(ev.repeat[id].bytes, R(id).bytes); }
});

t('B frames, two readers: ffprobe frame types and the x264 statistics line agree for every case; the default has B frames, -bf 0 and zerolatency have none, and every encode is one I frame and 99 others', () => {
  for (const r of Object.values(ev.runs)) {
    assert.equal(r.frames, 100, r.id); assert.equal(r.types.I, 1, r.id);
    assert.deepEqual(r.types, {I: r.x264.I, P: r.x264.P, B: r.x264.B}, `${r.id}: ffprobe against x264`);
    assert.equal(r.seq.length, 100, r.id);
  }
  assert.ok(R('n_def23').types.B > 30, 'default has many B frames');
  for (const id of ['n_bf0', 'n_zl23', 'c_zl23', ...[18, 20, 26, 28, 30, 32].map((c) => `n_zl${c}`)]) assert.equal(R(id).types.B, 0, id);
  if (isV6()) { assert.equal(R('n_def23').types.B, 74); assert.equal(R('c_def23').types.B, 72); }
});

t('bytes, two readers: the file size and the sum of the ffprobe packet sizes agree to within 8 percent for every case (the file carries the container tables), and give the same zerolatency to default ratio within 3 percent', () => {
  for (const r of Object.values(ev.runs)) { assert.ok(r.packetBytes < r.bytes, r.id); near(r.packetBytes / r.bytes, 1, 0.08, r.id); }
  near(R('n_zl23').packetBytes / R('n_def23').packetBytes, ratio('n_zl23', 'n_def23'), ratio('n_zl23', 'n_def23') * 0.03, 'noisy ratio from both readers');
  near(R('c_zl23').packetBytes / R('c_def23').packetBytes, ratio('c_zl23', 'c_def23'), ratio('c_zl23', 'c_def23') * 0.03, 'clean ratio from both readers');
});

t('known-positive for the readers: raising the CRF lowers the bytes and the PSNR in a strictly ordered way, for the no-tune curve and for the zerolatency curve, on both byte readers and both PSNR readers', () => {
  const walk = (prefix, crfs) => {
    for (let i = 0; i + 1 < crfs.length; i++) {
      const a = R(`${prefix}${crfs[i]}`), b = R(`${prefix}${crfs[i + 1]}`);
      assert.ok(a.bytes > b.bytes && a.packetBytes > b.packetBytes, `${prefix}${crfs[i]} to ${crfs[i + 1]}: bytes`);
      assert.ok(a.psnr.nodeY > b.psnr.nodeY && a.psnr.filterY > b.psnr.filterY, `${prefix}${crfs[i]} to ${crfs[i + 1]}: psnr`);
    }
  };
  walk('n_def', DEF_CRFS); walk('n_zl', ZL_CRFS);
});

t('PSNR, two readers: the ffmpeg psnr filter and the Node reader agree on the y plane to within 0.001 dB for every case', () => {
  for (const r of Object.values(ev.runs)) { assert.ok(Number.isFinite(r.psnr.filterY) && Number.isFinite(r.psnr.nodeY), r.id); near(r.psnr.filterY, r.psnr.nodeY, 0.001, r.id); }
});

t('the finding: at the same CRF 23 the zerolatency tune makes the noisy clip much bigger (more than 1.5 times; 2.39 times on 6.1.1) and the clean clip bigger too (more than 1.2 times; 1.40 times on 6.1.1)', () => {
  assert.ok(ratio('n_zl23', 'n_def23') > 1.5, `noisy ratio ${ratio('n_zl23', 'n_def23')}`);
  assert.ok(ratio('c_zl23', 'c_def23') > 1.2, `clean ratio ${ratio('c_zl23', 'c_def23')}`);
  if (isV6()) { assert.equal(R('n_def23').bytes, 179174); assert.equal(R('n_zl23').bytes, 428245); assert.equal(R('c_def23').bytes, 141353); assert.equal(R('c_zl23').bytes, 197221); }
});

t('the cost is above 1 at every CRF tested and the CRF 23 point is the largest (the default curve has a cliff there); at CRF 32 it is small (under 1.2; 1.03 on 6.1.1)', () => {
  const r = (c) => ratio(`n_zl${c}`, `n_def${c}`);
  for (const c of [18, 20, 26, 28, 30, 32]) { assert.ok(r(c) > 1, `crf ${c}: ${r(c)}`); assert.ok(r(c) < ratio('n_zl23', 'n_def23'), `crf ${c} below crf 23`); }
  assert.ok(r(32) < 1.2, 'at CRF 32 the cost is small');
  if (isV6()) { near(r(18), 1.265, 0.001); near(r(20), 1.592, 0.001); near(r(26), 1.331, 0.001); near(r(28), 1.268, 0.001); near(r(30), 1.085, 0.001); near(r(32), 1.034, 0.001); }
});

t('B frames are not the main cause: -bf 0 alone costs under 1.25 times, while switching the lookahead off (mbtree=0, or rc-lookahead=0 which switches mbtree off) costs over 1.5 times with the B frames kept, and zerolatency with -bf 3 put back is still over 1.5 times and within 10 percent of mbtree=0', () => {
  assert.ok(ratio('n_bf0', 'n_def23') < 1.25, `bf0 ${ratio('n_bf0', 'n_def23')}`);
  assert.ok(ratio('n_bf0', 'n_def23') > 1.0, 'dropping B frames costs a little');
  assert.ok(ratio('n_mbtree0', 'n_def23') > 1.5, `mbtree0 ${ratio('n_mbtree0', 'n_def23')}`);
  assert.ok(R('n_mbtree0').types.B > 30, 'mbtree=0 keeps the B frames');
  near(R('n_rcla0').bytes / R('n_mbtree0').bytes, 1, 0.01, 'rc-lookahead=0 acts as mbtree=0');
  assert.ok(R('n_zlbf3').types.B > 30, 'zerolatency with -bf 3 has B frames again');
  assert.ok(ratio('n_zlbf3', 'n_def23') > 1.5, `zlbf3 ${ratio('n_zlbf3', 'n_def23')}`);
  near(R('n_zlbf3').bytes / R('n_mbtree0').bytes, 1, 0.1, 'zerolatency with B frames back behaves like mbtree=0');
  assert.ok(R('n_zl23').bytes > R('n_zlbf3').bytes, 'the B frames were worth a little');
  if (isV6()) { assert.equal(R('n_bf0').bytes, 197671); assert.equal(R('n_mbtree0').bytes, 389555); assert.equal(R('n_zlbf3').bytes, 389555); }
});

t('the quality is not lower: at the same CRF 23 the zerolatency y PSNR is not below the default (36.45 against 36.15 dB on 6.1.1), and on the clean clip it is much higher (46.3 against 42.6 dB)', () => {
  assert.ok(R('n_zl23').psnr.nodeY >= R('n_def23').psnr.nodeY - 0.05, 'noisy');
  assert.ok(R('c_zl23').psnr.nodeY > R('c_def23').psnr.nodeY + 1, 'clean');
  if (isV6()) { near(R('n_zl23').psnr.nodeY, 36.452, 0.001); near(R('n_def23').psnr.nodeY, 36.152, 0.001); near(R('c_zl23').psnr.nodeY, 46.317, 0.001); near(R('c_def23').psnr.nodeY, 42.587, 0.001); }
});

t('at the same quality it still costs: the no-tune CRF 22 has the same y PSNR as zerolatency CRF 23 (within 0.05 dB) and zerolatency is more than 1.5 times bigger (1.75 on 6.1.1); with the default curve interpolated, zerolatency is bigger at every PSNR that both curves reach', () => {
  near(R('n_def22').psnr.nodeY, R('n_zl23').psnr.nodeY, 0.05, 'matched pair');
  assert.ok(ratio('n_zl23', 'n_def22') > 1.5, `matched ratio ${ratio('n_zl23', 'n_def22')}`);
  const eq = ev.equal.filter((e) => e.samePsnrRatio !== null);
  assert.ok(eq.length >= 5, 'at least five points inside the default curve');
  for (const e of eq) assert.ok(e.samePsnrRatio > 1.0, `crf ${e.crf}: ${e.samePsnrRatio}`);
  assert.equal(bytesAtPsnr(ev.runs, R('n_def26').psnr.nodeY), R('n_def26').bytes, 'the interpolation returns a measured point exactly');
  assert.equal(bytesAtPsnr(ev.runs, 50), null);
  if (isV6()) { near(ev.equal.find((e) => e.crf === 23).samePsnrRatio, 1.678, 0.001); near(ev.equal.find((e) => e.crf === 32).samePsnrRatio, 1.041, 0.001); }
});

t('film and animation, for contrast, on the noisy clip: film costs more than the default (1.18 times on 6.1.1), animation costs about the same (within 5 percent), and zerolatency costs far more than film', () => {
  assert.ok(R('n_film23').bytes > R('n_def23').bytes, 'film is bigger');
  near(ratio('n_anim23', 'n_def23'), 1, 0.05, 'animation');
  assert.ok(ratio('n_zl23', 'n_def23') > ratio('n_film23', 'n_def23') + 0.5, 'zerolatency costs far more than film');
  if (isV6()) { assert.equal(R('n_film23').bytes, 211127); assert.equal(R('n_anim23').bytes, 179591); }
});

t('threads: with two threads the cost is the same kind of size (over 2 times), within 5 percent of the one thread numbers either side; the fixture pins one thread because two gave two different sizes for the same command on a loaded machine', () => {
  assert.ok(ratio('n_zl23_t2', 'n_def23_t2') > 2, `two threads ${ratio('n_zl23_t2', 'n_def23_t2')}`);
  near(ratio('n_def23_t2', 'n_def23'), 1, 0.05, 'default, two threads against one');
  near(ratio('n_zl23_t2', 'n_zl23'), 1, 0.05, 'zerolatency, two threads against one');
  assert.equal(R('n_zl23_t2').types.B, 0); assert.ok(R('n_def23_t2').types.B > 30);
});

t('settings, read from the x264 options line: the default runs bframes 3 with mbtree on and a 40 frame lookahead; zerolatency runs bframes 0 with mbtree off; the isolating flags switch exactly one thing each', () => {
  const o = (id) => R(id).opts;
  assert.deepEqual(o('n_def23'), {bframes: 3, mbtree: 1, rc_lookahead: 40});
  assert.equal(o('n_zl23').bframes, 0); assert.equal(o('n_zl23').mbtree, 0);
  assert.equal(o('n_bf0').bframes, 0); assert.equal(o('n_bf0').mbtree, 1);
  assert.equal(o('n_mbtree0').bframes, 3); assert.equal(o('n_mbtree0').mbtree, 0);
  assert.equal(o('n_rcla0').mbtree, 0, 'rc-lookahead=0 switches mbtree off');
  assert.equal(o('n_zlbf3').bframes, 3); assert.equal(o('n_zlbf3').mbtree, 0);
});
