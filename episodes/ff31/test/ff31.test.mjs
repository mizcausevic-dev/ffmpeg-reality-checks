import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, buildOf, locate} from '../fixture/experiment.mjs';

const hasX265 = () => (spawnSync('ffmpeg', ['-hide_banner', '-encoders'], {encoding: 'utf8'}).stdout ?? '').includes('libx265');
const ok = have('ffmpeg') && have('ffprobe') && hasX265();
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff31-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg, ffprobe or libx265 not available'}, fn);
const F = (k) => ev.files[k];
// The tag, the stream identity and the sample entry hold on every build. The exact number of bytes that change is a property of the muxer, so it is asserted per build
// (measured on 6.1.1 here and on 8.1.2 on the PC). On any other build only the build-independent facts are asserted.
const B = () => ev.build;
const MP4 = ['def', 'hev', 'hvc', 'remux', 'back', 'copy', 'mov', 'mkv2mp4', 'rep', 'repvc'];

t('every file decodes to the same 50 frames (same frame hash), so no file below differs in its picture', () => {
  for (const k of Object.keys(ev.files)) { assert.equal(F(k).decoded.frames, 50, k); assert.equal(F(k).decoded.sha, F('def').decoded.sha, k); }
});

t('default libx265 to mp4: ffprobe says hev1 and the raw stsd entry says hev1, with an hvcC box inside it', () => {
  const f = F('def');
  assert.equal(f.probe.codec, 'hevc'); assert.equal(f.probe.tagString, 'hev1');
  assert.equal(f.box.fourcc, 'hev1'); assert.ok(f.box.hvcC); assert.ok(f.box.children.includes('hvcC'));
  assert.equal(f.box.tracks, 1); assert.equal(f.box.samples, 50);
});

t('the hev1 default is not an accident of mp4 alone: stream copy to mp4, to mov and from mkv to mp4 all give hev1, and -tag:v hev1 is the same as no tag', () => {
  for (const k of ['hev', 'copy', 'mov', 'mkv2mp4']) { assert.equal(F(k).probe.tagString, 'hev1', k); assert.equal(F(k).box.fourcc, 'hev1', k); }
  assert.equal(F('hev').packetMd5, F('def').packetMd5);
  assert.equal(F('hev').box.sampleSha, F('def').box.sampleSha);
  assert.equal(ev.diffs['def:hev'].count, 0);
});

t('-tag:v hvc1 while encoding: ffprobe says hvc1 and the raw stsd entry says hvc1, with an hvcC box', () => {
  const f = F('hvc');
  assert.equal(f.probe.tagString, 'hvc1'); assert.equal(f.box.fourcc, 'hvc1'); assert.ok(f.box.hvcC);
});

t('known-positive control: both readers see both values, in both directions (hev1 to hvc1 by remux, hvc1 back to hev1 by remux)', () => {
  const seenProbe = new Set(MP4.map((k) => F(k).probe.tagString)), seenBox = new Set(MP4.map((k) => F(k).box.fourcc));
  assert.deepEqual([...seenProbe].sort(), ['hev1', 'hvc1']); assert.deepEqual([...seenBox].sort(), ['hev1', 'hvc1']);
  assert.equal(F('remux').box.fourcc, 'hvc1'); assert.equal(F('back').box.fourcc, 'hev1');
  assert.equal(F('remux').probe.tagString, 'hvc1'); assert.equal(F('back').probe.tagString, 'hev1');
});

t('the two tag readers agree on every mp4 and mov file, and the ffprobe numeric tag is the little-endian FourCC', () => {
  for (const k of MP4) {
    assert.equal(F(k).probe.tagString, F(k).box.fourcc, k);
    const hex = String(F(k).probe.tagHex).toLowerCase();
    const want = Buffer.from(F(k).box.fourcc, 'latin1').readUInt32LE(0).toString(16);
    assert.equal(parseInt(hex, 16).toString(16), want, k);
  }
});

t('build label comes from the version line (v6, v8 or other)', () => {
  assert.equal(buildOf(ev.ffmpeg), ev.build);
});

t('-c copy -tag:v hvc1 never touches the picture, on every build: same 50 packets (packet md5), same raw samples (hash read from mdat), same decoded frames, same file length', () => {
  const r = F('remux'), d = F('def');
  assert.equal(r.packetMd5, d.packetMd5); assert.equal(r.box.sampleSha, d.box.sampleSha); assert.equal(r.decoded.sha, d.decoded.sha);
  assert.equal(r.box.samples, 50); assert.equal(r.bytes, d.bytes);
  assert.equal(F('copy').packetMd5, d.packetMd5); assert.equal(F('copy').box.sampleSha, d.box.sampleSha);
});

t('compared with a plain stream copy, the retagged copy differs only inside the sample entry (stsd), on every build, and the FourCC bytes are among them', () => {
  const w = ev.diffs['copy:remux'];
  assert.ok(w.sameLength); assert.ok(w.count >= 2); assert.ok(w.insideSampleEntry);
  assert.ok(w.where.some((x) => x.from.field.startsWith('sample entry FourCC')));
  assert.ok(w.where.every((x) => /stsd\/hev1/.test(x.from.path)));
});

t('the locator is itself proven by the known bytes: the FourCC offsets resolve to moov/trak/mdia/minf/stbl/stsd/hev1 and the retag back resolves to .../hvc1', () => {
  const a = ev.diffs['def:remux'].where[0], b = ev.diffs['hvc:back'].where[0];
  assert.equal(a.from.path, 'moov/trak/mdia/minf/stbl/stsd/hev1'); assert.match(a.from.field, /FourCC/);
  assert.equal(b.from.path, 'moov/trak/mdia/minf/stbl/stsd/hvc1');
});

t('how many bytes the retag rewrites depends on the build. 6.x: 2 (the FourCC), plain copy 0. 8.x: a plain copy already differs from the encode in 3 bytes, the retag adds 5 (FourCC and 3 flags) on top, 8 in all. Other builds: only that some bytes differ. On every build all of them are inside the sample entry', () => {
  const d = ev.diffs;
  assert.ok(d['def:remux'].count > 0);
  for (const k of ['def:remux', 'def:copy', 'copy:remux', 'hvc:back']) assert.ok(d[k].insideSampleEntry, k);
  if (B() === 'v6') {
    assert.equal(d['def:remux'].count, 2); assert.equal(d['hvc:back'].count, 2); assert.equal(d['def:copy'].count, 0); assert.equal(d['copy:remux'].count, 2);
    const [a, b] = d['def:remux'].offsets; assert.equal(b - a, 1);
  } else if (B() === 'v8') {
    assert.equal(d['def:copy'].count, 3); assert.equal(d['def:remux'].count, 8); assert.equal(d['hvc:back'].count, 8); assert.equal(d['copy:remux'].count, 5);
  }
});

t('on 8.x the 3 bytes of a plain copy are the low bytes of avgBitrate in the btrt (bitrate) box of the sample entry: the encode wrote 0 there, the copy fills in the average bitrate (samples x 8 / 2 s, within 2 percent). On 6.x the encode already holds that value and the copy repeats it', () => {
  const e = F('def').box.btrt, c = F('copy').box.btrt, calc = F('def').box.sampleBytes * 8 / 2;
  assert.ok(e && c);
  if (B() === 'v6') { assert.deepEqual(c, e); assert.ok(Math.abs(e.avgBitrate - calc) / calc < 0.02); }
  else if (B() === 'v8') {
    assert.notEqual(c.avgBitrate, e.avgBitrate); assert.ok(Math.abs(c.avgBitrate - calc) / calc < 0.02, `${c.avgBitrate} vs ${calc}`);
    for (const w of ev.diffs['def:copy'].where) { assert.match(w.from.path, /stsd\/hev1\/btrt$/); assert.match(w.from.field, /avgBitrate/); }
  }
});

t('the hvcC box lists the VPS, SPS and PPS (nal types 32, 33, 34) and the samples carry none of them in band', () => {
  for (const k of ['def', 'hvc', 'remux']) {
    const types = F(k).box.arrays.map((a) => a.type);
    for (const need of [32, 33, 34]) assert.ok(types.includes(need), `${k} hvcC has ${need}`);
    assert.equal(F(k).box.samplesWithParamSets, 0, k);
    assert.deepEqual(F(k).box.firstSampleNals.filter((x) => x >= 32 && x <= 34), []);
  }
});

t('a native hvc1 encode marks the VPS, SPS and PPS arrays complete (flag 1) and the default hev1 leaves them 0, on every build; whether a retag by copy sets them depends on the build (6.x: stays 0, 8.x: 1)', () => {
  const flag = (k, type) => F(k).box.arrays.find((a) => a.type === type).complete;
  for (const type of [32, 33, 34]) {
    assert.equal(flag('hvc', type), 1); assert.equal(flag('def', type), 0); assert.equal(flag('hev', type), 0);
    if (B() === 'v6') assert.equal(flag('remux', type), 0);
    if (B() === 'v8') assert.equal(flag('remux', type), 1);
  }
  assert.equal(ev.diffs['def:hvc'].count, 5);
});

t('a stream that carries parameter sets in band keeps them under a hvc1 retag: the label changes, the samples do not', () => {
  const r = F('rep'), v = F('repvc');
  assert.equal(r.box.fourcc, 'hev1'); assert.ok(r.box.samplesWithParamSets >= 1);
  assert.deepEqual(r.box.firstSampleNals.filter((x) => x >= 32 && x <= 34), [32, 33, 34]);
  assert.equal(v.box.fourcc, 'hvc1'); assert.equal(v.box.samplesWithParamSets, r.box.samplesWithParamSets);
  assert.equal(v.box.sampleSha, r.box.sampleSha); assert.equal(v.packetMd5, r.packetMd5);
  assert.ok(ev.diffs['rep:repvc'].where.some((x) => /FourCC/.test(x.from.field)));
});

t('matroska has no such tag: ffprobe reports neither hev1 nor hvc1, the header holds the CodecID V_MPEGH/ISO/HEVC and neither FourCC', () => {
  const m = F('mkv');
  assert.equal(m.probe.codec, 'hevc'); assert.ok(!['hev1', 'hvc1'].includes(m.probe.tagString));
  assert.ok(m.mkv.codecId); assert.ok(!m.mkv.hasHev1); assert.ok(!m.mkv.hasHvc1);
});
