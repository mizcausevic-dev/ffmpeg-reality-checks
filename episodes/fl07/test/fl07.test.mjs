import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, SEEK_FRAME} from '../fixture/experiment.mjs';

// Relations hold on any build. Exact numbers are asserted only on ffmpeg 6.1.1 (build v6, this container) and only for encodes
// the fixture proved deterministic (two identical runs); on any other build those lines are skipped, so a difference there is a finding, not a failure.
const encoders = have('ffmpeg') ? (spawnSync('ffmpeg', ['-hide_banner', '-encoders'], {encoding: 'utf8'}).stdout ?? '') : '';
// FL07_EVIDENCE=path/to/evidence.json re-checks the same assertions against a saved evidence file (for example the PC run) without encoding anything.
const saved = process.env.FL07_EVIDENCE;
const ok = !!saved || have('ffmpeg') && have('ffprobe') && /libsvtav1/.test(encoders) && /libaom-av1/.test(encoders);
let ev, dir;
before(() => { if (saved) { ev = JSON.parse(fs.readFileSync(saved, 'utf8')); return; } if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl07-')); ev = runExperiment(dir); } });
after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg, ffprobe, libsvtav1 or libaom-av1 not available'}, fn);
const v6 = () => ev.build === 'v6';
const v812 = () => /version 8\.1\.2/.test(ev.ffmpeg); // the PC build the 8.1.2 numbers were measured on
const C = (k) => ev.cases[k] ?? ev.long[k];
const same = (a, b) => C(a).packetMd5 === C(b).packetMd5;
const good = () => Object.entries({...ev.cases, ...ev.long}).filter(([, r]) => !r.failed);

t('control: the sources are what the fixture says (50, 50 and 400 unique frames) and the build and both encoder library versions are recorded', () => {
  assert.equal(ev.sources.clean.frames, 50); assert.equal(ev.sources.clean.uniqueFrames, 50);
  assert.equal(ev.sources.noisy.frames, 50); assert.equal(ev.sources.noisy.uniqueFrames, 50);
  assert.equal(ev.sources.long.frames, 400); assert.equal(ev.sources.long.uniqueFrames, 400);
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.ok(['v6', 'v8', 'other'].includes(ev.build));
  assert.ok(ev.libs.svtav1, `libsvtav1 prints its version: ${JSON.stringify(ev.libs)}`);
  assert.ok(ev.libs.aom === null || /^v\d/.test(ev.libs.aom), 'libaom version is a string or null (ffmpeg 8.1.2 does not print it)');
  if (v6()) { assert.equal(ev.libs.svtav1, '1.7.0'); assert.equal(ev.libs.aom, 'v3.8.2'); }
  if (v812()) assert.equal(ev.libs.svtav1, '4.1.0-259-gec17f8382');
});

t('reader agreement, bytes: ffprobe packet sizes and our own OBU walk over an IVF copy give the same payload total and packet count for every encode; the container adds bytes on top', () => {
  for (const [k, r] of good()) {
    assert.equal(r.bytesProbe, r.bytesObu, `${k} bytes`);
    assert.equal(r.packets, r.packetsObu, `${k} packets`);
    assert.ok(r.fileBytes > r.bytesProbe, `${k} container overhead`);
    assert.equal(r.decodedFrames, r.packets, `${k} every packet decodes to one frame`);
  }
});

t('reader agreement, quality: the ffmpeg psnr filter and our own PSNR from decoded raw frames agree within 0.02 dB (both infinite on lossless), and SSIM and PSNR rank the clean-source encodes the same way', () => {
  for (const [k, r] of good()) {
    if (r.nodePsnrAvg === null || r.ffmpegPsnrAvg === null) { assert.equal(r.nodePsnrAvg, r.ffmpegPsnrAvg, `${k} both infinite`); continue; }
    assert.ok(Math.abs(r.ffmpegPsnrAvg - r.nodePsnrAvg) < 0.02, `${k} avg ${r.ffmpegPsnrAvg} vs ${r.nodePsnrAvg}`);
    assert.ok(Math.abs(r.ffmpegPsnrY - r.nodePsnrY) < 0.02, `${k} y`);
  }
  const clean = Object.entries(ev.cases).filter(([k, r]) => r.src === 'clean' && !r.failed && r.nodePsnrAvg !== null);
  for (const [a, x] of clean) for (const [b, y] of clean) if (x.ffmpegSsimAll - y.ffmpegSsimAll > 0.003) assert.ok(x.nodePsnrAvg > y.nodePsnrAvg, `${a} vs ${b}`);
});

t('known-positive control: libaom -crf 0 is lossless. Decoded frames equal the source (md5), PSNR infinite and SSIM 1 by both quality readers, and it matches libaom lossless=1 packet for packet; a lossy encode (svt -crf 30) is not equal to the source', () => {
  const a = C('aom_clean_u8_crf0'), l = C('aom_clean_u8_lossless'), lossy = C('svt_clean_p8_crf30');
  assert.equal(a.decodedMd5, ev.sources.clean.rawMd5); assert.equal(l.decodedMd5, ev.sources.clean.rawMd5);
  assert.equal(a.ffmpegPsnrAvg, null); assert.equal(a.nodePsnrAvg, null); assert.equal(a.ffmpegSsimAll, 1);
  assert.equal(a.packetMd5, l.packetMd5);
  assert.notEqual(lossy.decodedMd5, ev.sources.clean.rawMd5); assert.ok(lossy.ffmpegSsimAll < 1 && lossy.nodePsnrAvg > 20);
  const noisy = C('aom_noisy_u8_crf30'); assert.ok(lossy.ffmpegSsimAll > noisy.ffmpegSsimAll, 'the readers can tell a better encode from a worse one');
});

t('libsvtav1 -crf 0 is NOT lossless: it is the same file as giving no -crf at all (packet md5 and decoded md5), SVT-AV1 reports a rate factor of 35 for it (30 for -crf 30), the decode differs from the source, and it is smaller than -crf 30 while libaom -crf 0 is more than 5 times its own -crf 30', () => {
  const z = C('svt_clean_p8_crf0'), n = C('svt_clean_p8_nocrf'), c30 = C('svt_clean_p8_crf30');
  assert.equal(z.packetMd5, n.packetMd5); assert.equal(z.decodedMd5, n.decodedMd5); assert.equal(z.bytesProbe, n.bytesProbe);
  assert.notEqual(z.decodedMd5, ev.sources.clean.rawMd5);
  assert.ok(z.ffmpegSsimAll < 1 && z.ffmpegPsnrAvg !== null && z.nodePsnrAvg !== null && z.nodePsnrAvg < 60, 'both quality readers see loss');
  assert.ok(z.bytesProbe < c30.bytesProbe && z.bytesObu < c30.bytesObu);
  assert.ok(C('aom_clean_u8_crf0').bytesProbe > 5 * C('aom_clean_u8_crf30').bytesProbe);
  if (z.svt.rateFactor !== null) { // the library's own stderr block; format may differ on another build
    assert.equal(c30.svt.rateFactor, 30);
    if (v6()) { assert.equal(z.svt.rateFactor, 35); assert.equal(n.svt.rateFactor, 35); assert.equal(z.svt.brcMode, 'CRF'); }
  }
});

t('-crf 64 is refused by both encoders (non-zero exit, no output file, "out of range" on 6.1.1) while -crf 63 works and is far smaller than -crf 30', () => {
  for (const k of ['svt_clean_p8_crf64', 'aom_clean_u8_crf64']) { assert.equal(C(k).failed, true); assert.notEqual(C(k).exit, 0); assert.equal(C(k).fileWritten, false); if (v6()) { assert.equal(C(k).exit, 222); assert.match(C(k).error, /out of range/); } }
  assert.ok(C('svt_clean_p8_crf63').bytesProbe < C('svt_clean_p8_crf30').bytesProbe / 4);
  assert.ok(C('svt_clean_p8_crf63').ffmpegSsimAll < C('svt_clean_p8_crf30').ffmpegSsimAll);
});

t('-b:v 0 changes nothing next to -crf, in either encoder: identical packets (md5) and identical decoded frames for crf 30 alone and crf 30 with -b:v 0', () => {
  for (const [a, b] of [['aom_clean_u8_crf30', 'aom_clean_u8_crf30_b0'], ['svt_clean_p8_crf30', 'svt_clean_p8_crf30_b0']]) {
    assert.equal(C(a).packetMd5, C(b).packetMd5, `${a} vs ${b}`); assert.equal(C(a).decodedMd5, C(b).decodedMd5); assert.equal(C(a).bytesProbe, C(b).bytesProbe);
  }
});

t('a real -b:v next to -crf: libsvtav1 never obeys it (SVT-AV1 1.7.0 on 6.1.1 ignores it, same packets; SVT-AV1 4.1 on 8.1.2 refuses it, no file, "Target Bitrate only supported" error) while libaom obeys it (different packets; on noisy it cuts the file below half and SSIM falls by more than 0.1, on clean it makes the file larger), on every build', () => {
  for (const [crf30, b] of [['svt_clean_p8_crf30', 'svt_clean_p8_crf30_b500k'], ['svt_noisy_p8_crf30', 'svt_noisy_p8_crf30_b500k']]) {
    const r = C(b);
    if (r.failed) { assert.notEqual(r.exit, 0); assert.equal(r.fileWritten, false); assert.match(r.error, /[Bb]itrate|rc/); }
    else { assert.ok(same(crf30, b), `${b} must be the crf-only file if it did not fail`); assert.equal(C(crf30).decodedMd5, r.decodedMd5); }
    if (v6()) assert.equal(r.failed, false, 'SVT-AV1 1.7.0 ignores the bitrate');
    if (v812()) { assert.equal(r.failed, true, 'SVT-AV1 4.1 refuses the bitrate'); assert.match(r.error, /Target Bitrate only supported/); }
  }
  assert.ok(!same('aom_clean_u8_crf30', 'aom_clean_u8_crf30_b500k')); assert.ok(!same('aom_noisy_u8_crf30', 'aom_noisy_u8_crf30_b500k'));
  const n = C('aom_noisy_u8_crf30'), nb = C('aom_noisy_u8_crf30_b500k');
  for (const r of ['bytesProbe', 'bytesObu']) assert.ok(nb[r] < n[r] / 2, r);
  assert.ok(n.ffmpegSsimAll - nb.ffmpegSsimAll > 0.1); assert.ok(n.nodePsnrAvg - nb.nodePsnrAvg > 3 && n.ffmpegPsnrAvg - nb.ffmpegPsnrAvg > 3);
  assert.ok(C('aom_clean_u8_crf30_b500k').bytesProbe > C('aom_clean_u8_crf30').bytesProbe);
});

t('without -crf, -b:v is what drives libsvtav1 and libaom: both files differ from their -crf 30 file and from each other', () => {
  assert.ok(!same('svt_clean_p8_b500k', 'svt_clean_p8_crf30')); assert.ok(!same('svt_clean_p8_b500k', 'svt_clean_p8_nocrf'));
  assert.ok(!same('aom_clean_u8_b500k', 'aom_clean_u8_crf30')); assert.notEqual(C('svt_clean_p8_b500k').packetMd5, C('aom_clean_u8_b500k').packetMd5);
});

t('the same -crf 30 is not the same quality or size across encoders: on the clean source libaom is smaller than libsvtav1 at preset 8 by more than 25 percent, on the noisy source it is smaller by more than 10 percent and its SSIM is lower by more than 0.02 (both PSNR readers agree)', () => {
  const [sc, ac, sn, an] = ['svt_clean_p8_crf30', 'aom_clean_u8_crf30', 'svt_noisy_p8_crf30', 'aom_noisy_u8_crf30'].map(C);
  for (const r of ['bytesProbe', 'bytesObu']) { assert.ok(ac[r] < sc[r] * 0.75, `clean ${r}`); assert.ok(an[r] < sn[r] * 0.9, `noisy ${r}`); }
  assert.ok(sn.ffmpegSsimAll - an.ffmpegSsimAll > 0.02); assert.ok(sn.ffmpegPsnrAvg > an.ffmpegPsnrAvg && sn.nodePsnrAvg > an.nodePsnrAvg);
  assert.notEqual(sc.decodedMd5, ac.decodedMd5);
});

t('libsvtav1 presets: at the same -crf 30 on the clean source the file grows with the preset number (4 < 8 < 12), preset 12 is more than 40 percent bigger than preset 8 and looks worse (SSIM lower by more than 0.004, PSNR lower by more than 3 dB by both readers); on the noisy source preset 12 is bigger and no better (SSIM not higher by more than 0.001)', () => {
  const [p4, p8, p12] = ['svt_clean_p4_crf30', 'svt_clean_p8_crf30', 'svt_clean_p12_crf30'].map(C);
  for (const r of ['bytesProbe', 'bytesObu']) { assert.ok(p4[r] < p8[r] && p8[r] < p12[r], r); assert.ok(p12[r] > 1.4 * p8[r], r); }
  assert.ok(p8.ffmpegSsimAll - p12.ffmpegSsimAll > 0.004);
  assert.ok(p8.ffmpegPsnrAvg - p12.ffmpegPsnrAvg > 3 && p8.nodePsnrAvg - p12.nodePsnrAvg > 3);
  assert.ok(p4.ffmpegSsimAll > p8.ffmpegSsimAll);
  const [n8, n12] = [C('svt_noisy_p8_crf30'), C('svt_noisy_p12_crf30')];
  assert.ok(n12.bytesProbe > n8.bytesProbe && n12.bytesObu > n8.bytesObu); assert.ok(n12.ffmpegSsimAll <= n8.ffmpegSsimAll + 0.001);
});

t('default keyframes: libsvtav1 puts one every 161 frames (0, 6.44 s, 12.88 s in a 16 s clip at 25 fps), libaom only at frame 0; ffprobe packet flags, our OBU walk and the sequence-header positions agree', () => {
  const s = C('svt_long_default'), a = C('aom_long_default');
  for (const r of [s, a]) { assert.deepEqual(r.keyframes, r.keyframesObu); assert.deepEqual(r.keyframesObu, r.seqHeaderTus); assert.equal(r.packets, 400); assert.ok(r.ptsMatchIndex); }
  assert.deepEqual(a.keyframes, [0]); assert.ok(s.keyframes.length > 1 && s.keyframes[0] === 0);
  if (s.svt.gop !== null && (v6() || v812())) assert.equal(s.svt.gop, 161);
  if (v6() || v812()) { assert.deepEqual(s.keyframes, [0, 161, 322]); assert.deepEqual(s.keyframeSeconds, [0, 6.44, 12.88]); }
});

t('known-positive control, -g 25: both encoders then put a keyframe every 25 frames (16 in 400 frames, at 0, 1, 2 ... 15 s), by both readers; -g 100 on libsvtav1 gives 0, 100, 200, 300', () => {
  for (const k of ['svt_long_g25', 'aom_long_g25']) { const r = C(k); assert.equal(r.keyframes.length, 16); assert.deepEqual(r.keyframes, Array.from({length: 16}, (_, i) => i * 25)); assert.deepEqual(r.keyframesObu, r.keyframes); assert.deepEqual(r.keyframeSeconds, Array.from({length: 16}, (_, i) => i)); }
  assert.deepEqual(C('svt_long_g100').keyframes, [0, 100, 200, 300]); assert.deepEqual(C('svt_long_g100').keyframesObu, [0, 100, 200, 300]);
  if (C('svt_long_g25').svt.gop !== null && (v6() || v812())) assert.equal(C('svt_long_g25').svt.gop, 25);
});

t('seeking to frame 300: ffmpeg returns the right frame in every file, but the number of frames the decoder must run from the keyframe it lands on differs (two readers agree): libsvtav1 default 140, libaom default 301, -g 25 only 1; the price of -g 25 on libaom is more than 10 percent more bytes', () => {
  for (const k of ['svt_long_default', 'aom_long_default', 'svt_long_g25', 'aom_long_g25', 'svt_long_g100']) {
    const s = C(k).seek; assert.equal(s.target, SEEK_FRAME); assert.equal(s.landProbe, s.landObu, `${k} landing`); assert.equal(s.framesToDecodeProbe, s.framesToDecodeObu); assert.ok(s.seekMd5Match, `${k} right frame`); assert.ok(s.seekIsNotNeighbour);
  }
  assert.ok(C('aom_long_default').seek.framesToDecodeProbe > 2 * C('svt_long_default').seek.framesToDecodeProbe);
  assert.equal(C('svt_long_g25').seek.framesToDecodeProbe, 1); assert.equal(C('aom_long_g25').seek.framesToDecodeProbe, 1);
  assert.ok(C('aom_long_g25').bytesProbe > 1.1 * C('aom_long_default').bytesProbe);
  if (v6() || v812()) { assert.equal(C('svt_long_default').seek.framesToDecodeProbe, 140); assert.equal(C('aom_long_default').seek.framesToDecodeProbe, 301); }
});

t('determinism: every CRF encode that ran twice produced identical packets (the only exception allowed is SVT-AV1 in bitrate mode, which is recorded but not relied on)', () => {
  let twice = 0;
  for (const [k, r] of good()) { if (!r.ranTwice) continue; twice++; if (k === 'svt_clean_p8_b500k') continue; assert.equal(r.deterministic, true, k); }
  assert.ok(twice >= 12, `ran twice: ${twice}`);
});

t('exact numbers on ffmpeg 6.1.1 (deterministic encodes only): file bytes of the headline encodes', () => {
  if (!v6()) return; // other builds: relations above are the claim
  const exact = {svt_clean_p8_crf30: 61302, svt_clean_p12_crf30: 95105, svt_clean_p8_crf0: 49746, svt_clean_p8_nocrf: 49746, aom_clean_u8_crf30: 41459, aom_clean_u8_crf0: 236102, svt_noisy_p8_crf30: 621923, svt_noisy_p12_crf30: 729503, svt_long_default: 424215, svt_long_g25: 428652, svt_long_g100: 420816};
  for (const [k, n] of Object.entries(exact)) { assert.equal(C(k).deterministic, true, `${k} deterministic`); assert.equal(C(k).fileBytes, n, k); }
});

t('exact numbers on ffmpeg 8.1.2 (the PC build, SVT-AV1 4.1.0-259-gec17f8382; deterministic encodes only): file bytes of the headline encodes', () => {
  if (!v812()) return;
  const exact = {svt_clean_p8_crf30: 82283, svt_clean_p12_crf30: 129910, svt_clean_p8_crf0: 60254, svt_clean_p8_nocrf: 60254, aom_clean_u8_crf30: 41340, aom_clean_u8_crf0: 233918, svt_noisy_p8_crf30: 708469, svt_noisy_p12_crf30: 746977, svt_long_default: 539175, svt_long_g25: 563657, svt_long_g100: 542325};
  for (const [k, n] of Object.entries(exact)) { assert.equal(C(k).deterministic, true, `${k} deterministic`); assert.equal(C(k).fileBytes, n, k); }
});
