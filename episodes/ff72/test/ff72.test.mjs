import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, parseFlac, frameHeaderAt, crc8, wavData, buildOf, LEVELS, RAW_BYTES, FRAMES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff72-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const SIG = ['noise', 'tones', 'music', 'silence'];
const B = (s, l) => ev.signals[s].levels[l].bytes;
const pct = (a, b) => (a - b) / a * 100;

t('the flac header reader works on bytes we write ourselves: crc-8, frame number and block size must all match', () => {
  assert.equal(crc8(Buffer.from('123456789')), 0xf4, 'the standard check value of crc-8 with polynomial 0x07');
  const head = Buffer.from([0xff, 0xf8, 0xc9, 0x18, 0x00]); // fixed block, 4096 samples (code 12), 44.1 kHz (code 9), stereo, 16 bit, frame number 0
  const good = Buffer.concat([head, Buffer.from([crc8(head)]), Buffer.alloc(8)]);
  assert.deepEqual(frameHeaderAt(good, 0, 0), {pos: 0, blockSize: 4096, headerLen: 6});
  assert.equal(frameHeaderAt(good, 0, 1), null, 'wrong frame number');
  const bad = Buffer.from(good); bad[5] ^= 1; assert.equal(frameHeaderAt(bad, 0, 0), null, 'wrong crc');
  assert.equal(frameHeaderAt(Buffer.alloc(16, 0x55), 0, 0), null);
  const wav = Buffer.concat([Buffer.from('RIFF\0\0\0\0WAVE', 'latin1'), Buffer.from('LIST', 'latin1'), Buffer.from([2, 0, 0, 0, 9, 9]), Buffer.from('data', 'latin1'), Buffer.from([3, 0, 0, 0, 7, 8, 9])]);
  assert.deepEqual([...wavData(wav)], [7, 8, 9]);
});

t('the sound is identical at every level: 52 files, and three md5 readers all equal the md5 of the source samples', () => {
  let n = 0;
  for (const s of SIG) {
    const sig = ev.signals[s]; assert.equal(sig.sourceBytes, RAW_BYTES);
    for (const l of LEVELS) { const r = sig.levels[l]; assert.equal(r.md5Ffmpeg, sig.sourceMd5, `${s} ${l} ffmpeg md5`); assert.equal(r.md5Raw, sig.sourceMd5, `${s} ${l} node md5`); assert.equal(r.info.md5, sig.sourceMd5, `${s} ${l} streaminfo md5`); assert.equal(r.info.totalSamples, FRAMES); n++; }
  }
  assert.equal(n, 52);
  assert.equal(new Set(SIG.map((s) => ev.signals[s].sourceMd5)).size, 4, 'the four signals are four different sounds');
});

t('known positive: the same tones shifted by one sample give a different md5 in all three readers', () => {
  const c = ev.controls.shift;
  assert.equal(c.differsFfmpeg, true); assert.equal(c.differsRaw, true); assert.equal(c.differsInfo, true);
  assert.equal(c.md5Ffmpeg, c.md5Raw); assert.equal(c.md5Ffmpeg, c.md5Info);
});

t('control: no compression_level is exactly the same file as level 5', () => { assert.equal(ev.controls.defaultEqualsLevel5, true); });

t('levels 13 and 99 are rejected by the encoder and no file is written', () => {
  for (const l of [13, 99]) { const r = ev.controls.reject[l]; assert.notEqual(r.status, 0); assert.equal(r.message, true); assert.equal(r.exists, false); }
});

t('size readers agree: Node file size equals ffprobe size, and the frame bytes plus the header add up to the file', () => {
  for (const s of SIG) for (const l of LEVELS) {
    const r = ev.signals[s].levels[l];
    assert.equal(r.bytes, r.probeBytes);
    assert.equal(r.frameBytes.reduce((a, b) => a + b, 0) + r.headerBytes, r.bytes);
  }
  const hb = ev.headerBlocks; assert.equal(hb.length, 3); assert.deepEqual(hb.map((b) => b.type), [0, 4, 1]);
  assert.equal(hb[2].len, 8192, 'the muxer writes 8192 bytes of padding');
});

t('frame readers agree: Node counts the same frames and the same frame sizes as the ffprobe packets, and STREAMINFO min and max frame size match', () => {
  for (const s of SIG) for (const l of LEVELS) {
    const r = ev.signals[s].levels[l];
    assert.equal(r.frames, r.probePackets, `${s} ${l} count`);
    assert.deepEqual(r.frameBytes, r.probeSizes, `${s} ${l} sizes`);
    assert.equal(r.info.minFrame, Math.min(...r.frameBytes)); assert.equal(r.info.maxFrame, Math.max(...r.frameBytes));
    assert.equal(r.frames, Math.ceil(FRAMES / r.info.maxBlock));
  }
});

t('smaller depends on the signal: level 12 is smaller than level 0 for every signal, by a lot for tones and not at all for noise from 3 up', () => {
  for (const s of SIG) assert.ok(B(s, 12) < B(s, 0), `${s} 12 < 0`);
  assert.ok(pct(B('tones', 0), B('tones', 12)) > 30);
  assert.ok(pct(B('music', 0), B('music', 12)) > 5);
  assert.ok(pct(B('noise', 3), B('noise', 12)) < 0.5, 'noise gains under half a percent from level 3 to 12');
  assert.ok(pct(B('tones', 5), B('tones', 12)) > pct(B('music', 5), B('music', 12)), 'tones gain more than music from 5 to 12');
  assert.ok(pct(B('music', 5), B('music', 12)) > pct(B('noise', 5), B('noise', 12)));
  for (const s of SIG) assert.ok(B(s, 12) < RAW_BYTES, 'smaller than the raw pcm, even noise');
  if (isV6()) {
    assert.deepEqual(['noise', 'tones', 'music', 'silence'].map((s) => B(s, 0)), [277543, 183488, 232226, 9900]);
    assert.deepEqual(['noise', 'tones', 'music', 'silence'].map((s) => B(s, 12)), [255844, 95377, 204463, 8696]);
    assert.deepEqual(['noise', 'tones', 'music'].map((s) => +pct(B(s, 5), B(s, 12)).toFixed(1)), [0, 11.8, 2.3]);
  }
});

t('a higher level is not always smaller: at least one signal has a level that is larger than the level before it', () => {
  let ups = 0;
  for (const s of ['noise', 'tones', 'music']) for (const l of LEVELS.slice(1)) if (B(s, l) > B(s, l - 1)) ups++;
  if (isV6()) {
    assert.ok(B('noise', 6) > B('noise', 5)); assert.equal(B('noise', 6) - B('noise', 5), 127);
    assert.ok(B('noise', 8) > B('noise', 7)); assert.ok(B('music', 10) > B('music', 9)); assert.equal(B('music', 10) - B('music', 9), 5);
    assert.equal(B('tones', 6), B('tones', 7)); assert.equal(ups, 3);
  }
  assert.ok(ups > 0 || !isV6() , 'on 6.x some level is larger than the one before');
});

t('frame size: the block size is set by the level in two steps: low levels use short frames, higher levels long frames, and the byte jump at the step is large for tones', () => {
  const bs = (s, l) => ev.signals[s].levels[l].info.maxBlock;
  for (const s of SIG) { for (let l = 1; l <= 12; l++) assert.ok(bs(s, l) >= bs(s, l - 1), 'block size never shrinks with the level'); assert.ok(bs(s, 12) > bs(s, 0)); }
  assert.ok(ev.signals.tones.levels[0].frames > ev.signals.tones.levels[12].frames);
  assert.ok(pct(B('tones', 2), B('tones', 3)) > 10);
  if (isV6()) {
    for (const s of SIG) { assert.deepEqual([0, 1, 2].map((l) => bs(s, l)), [1152, 1152, 1152]); assert.deepEqual([3, 12].map((l) => bs(s, l)), [4608, 4608]); assert.deepEqual([0, 2, 3, 12].map((l) => ev.signals[s].levels[l].frames), [115, 115, 29, 29]); }
    assert.equal(+pct(B('tones', 2), B('tones', 3)).toFixed(1), 15.2);
  }
});

t('silence is almost only header: every silent file is the 8288 byte header plus a few hundred bytes of frames', () => {
  for (const l of LEVELS) { const r = ev.signals.silence.levels[l]; assert.ok(r.headerBytes === 8288 || !isV6()); assert.ok(r.bytes - r.headerBytes < 2000); assert.ok(Math.max(...r.frameBytes) < 32); }
  if (isV6()) { assert.equal(ev.signals.silence.levels[5].bytes - 8288, 408); assert.equal(ev.signals.silence.levels[0].bytes - 8288, 1612); }
});
