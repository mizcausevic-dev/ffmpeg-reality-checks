import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, buildOf, FRAMES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe') && /libvpx-vp9/.test(spawnSync('ffmpeg', ['-hide_banner', '-encoders'], {encoding: 'utf8'}).stdout ?? '');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff30-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg, ffprobe or libvpx-vp9 not available'}, fn);
const C = (k) => ev.cases[k];
const same = (a, b) => C(a).packetMd5Ffmpeg === C(b).packetMd5Ffmpeg;
// Assertions here were measured on ffmpeg 6.1.1. The claim "-b:v 0 changes nothing" is the one most likely to differ on another build (older ffmpeg defaulted libvpx to a bitrate target); if it fails there, that is a finding.

t('control: the source is 50 frames of 320x180 lossless video, and the build is a known one', () => {
  assert.equal(ev.source.frames, FRAMES);
  assert.equal(ev.source.size, '320x180');
  assert.equal(buildOf(ev.ffmpeg), ev.build);
});

t('reader agreement, bitrate: ffprobe packet sizes and the IVF frame sizes parsed in Node give the same byte total and packet count for every encode; the ffmpeg packet md5 equals the Node md5 of the IVF payloads', () => {
  for (const [k, c] of Object.entries(ev.cases)) {
    assert.equal(c.bytesProbe, c.bytesIvf, `${k} bytes`);
    assert.equal(c.packets, c.packetsIvf, `${k} packets`);
    assert.equal(c.packetMd5Ffmpeg, c.packetMd5Node, `${k} md5`);
    assert.ok(c.fileBytes > c.bytesProbe, `${k} container adds header bytes, so packet sizes are the honest rate`);
  }
});

t('reader agreement, quality: the ffmpeg psnr filter and our own PSNR from decoded raw frames in Node agree within 0.02 dB, for the Y plane and for all planes, on every encode', () => {
  for (const [k, c] of Object.entries(ev.cases)) {
    assert.ok(Math.abs(c.ffmpegPsnrAvg - c.nodePsnrAvg) < 0.02, `${k} avg ${c.ffmpegPsnrAvg} vs ${c.nodePsnrAvg}`);
    assert.ok(Math.abs(c.ffmpegPsnrY - c.nodePsnrY) < 0.02, `${k} y ${c.ffmpegPsnrY} vs ${c.nodePsnrY}`);
  }
});

t('known-positive control, no cap: crf does move the file. crf 20, 30 and 40 give falling bitrate and falling PSNR, crf 20 is more than 3 times the bitrate of crf 40 and more than 8 dB better, by both readers', () => {
  const [a, b, c] = [C('crf20'), C('crf30'), C('crf40')];
  for (const r of ['kbpsProbe', 'kbpsIvf']) { assert.ok(a[r] > b[r] && b[r] > c[r]); assert.ok(a[r] > 3 * c[r]); }
  for (const r of ['ffmpegPsnrAvg', 'nodePsnrAvg']) { assert.ok(a[r] > b[r] && b[r] > c[r]); assert.ok(a[r] - c[r] > 8); }
});

t('-crf alone and -crf with -b:v 0 are the same file on this build: identical packets (ffmpeg md5 and Node md5), identical decoded frames, identical byte count, at crf 20, 30 and 40', () => {
  for (const n of [20, 30, 40]) {
    const a = C(n === 30 ? 'crf30' : `crf${n}`), b = C(`crf${n}_b0`);
    assert.equal(a.packetMd5Ffmpeg, b.packetMd5Ffmpeg, `crf ${n}`);
    assert.equal(a.packetMd5Node, b.packetMd5Node, `crf ${n}`);
    assert.equal(a.decodedMd5, b.decodedMd5, `crf ${n}`);
    assert.equal(a.bytesProbe, b.bytesProbe, `crf ${n}`);
  }
});

t('there is no hidden cap on this build: -crf 30 alone runs at more than 2000 kbps, far above the 256 kbps people expect, and an explicit -b:v 256k really does cap it (lower bitrate, lower PSNR, lower SSIM)', () => {
  const d = C('crf30'), c = C('crf30_b256k');
  assert.ok(d.kbpsProbe > 2000 && d.kbpsIvf > 2000);
  assert.ok(c.kbpsProbe < d.kbpsProbe / 3 && c.kbpsIvf < d.kbpsIvf / 3);
  assert.ok(d.ffmpegPsnrAvg - c.ffmpegPsnrAvg > 5 && d.nodePsnrAvg - c.nodePsnrAvg > 5);
  assert.ok(d.ffmpegSsimAll - c.ffmpegSsimAll > 0.2);
  assert.ok(!same('crf30', 'crf30_b256k'));
});

t('an explicit -b:v 500k is what makes the file capped and blocky: at crf 30 the PSNR drops by more than 5 dB and at crf 20 by more than 10 dB (both readers), and SSIM falls by more than 0.2', () => {
  for (const [free, cap, db] of [['crf30', 'crf30_b500k', 5], ['crf20', 'crf20_b500k', 10]]) {
    for (const r of ['ffmpegPsnrAvg', 'nodePsnrAvg']) assert.ok(C(free)[r] - C(cap)[r] > db, `${cap} ${r}`);
    assert.ok(C(free).ffmpegSsimAll - C(cap).ffmpegSsimAll > 0.2, `${cap} ssim`);
    assert.ok(C(cap).kbpsProbe < C(free).kbpsProbe / 2 && C(cap).kbpsIvf < C(free).kbpsIvf / 2);
  }
});

t('under the cap crf barely matters: with -b:v 500k, crf 20 and crf 40 land within 15 percent in bitrate and 0.5 dB in PSNR (both readers), while without the cap the same two crf values are more than 3 times apart and more than 8 dB apart. They are not byte-identical files', () => {
  const [a, b] = [C('crf20_b500k'), C('crf40_b500k')];
  assert.ok(Math.max(a.kbpsProbe, b.kbpsProbe) / Math.min(a.kbpsProbe, b.kbpsProbe) < 1.15);
  assert.ok(Math.abs(a.ffmpegPsnrAvg - b.ffmpegPsnrAvg) < 0.5 && Math.abs(a.nodePsnrAvg - b.nodePsnrAvg) < 0.5);
  assert.ok(C('crf20').kbpsProbe / C('crf40').kbpsProbe > 3 && C('crf20').nodePsnrAvg - C('crf40').nodePsnrAvg > 8);
  assert.notEqual(a.packetMd5Ffmpeg, b.packetMd5Ffmpeg);
});

t('control: the same crf values with -b:v 0 give different files, and each one matches its uncapped twin (crf 20, 30 and 40 are three different packet streams)', () => {
  const m = ['crf20_b0', 'crf30_b0', 'crf40_b0'].map((k) => C(k).packetMd5Ffmpeg);
  assert.equal(new Set(m).size, 3);
});

t('the cap is a target, not a hard wall: every -b:v 500k encode comes out above 500 kbps on this noisy source (ffprobe and IVF), and still far below the uncapped file', () => {
  for (const k of ['crf20_b500k', 'crf30_b500k', 'crf40_b500k']) { assert.ok(C(k).kbpsProbe > 500 && C(k).kbpsIvf > 500, k); assert.ok(C(k).kbpsProbe < 1000, k); }
});
