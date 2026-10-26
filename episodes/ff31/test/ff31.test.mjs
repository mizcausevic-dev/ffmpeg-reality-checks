import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const hasX265 = () => (spawnSync('ffmpeg', ['-hide_banner', '-encoders'], {encoding: 'utf8'}).stdout ?? '').includes('libx265');
const ok = have('ffmpeg') && have('ffprobe') && hasX265();
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff31-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg, ffprobe or libx265 not available'}, fn);
const F = (k) => ev.files[k];
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

t('-c copy -tag:v hvc1 changes only the tag: same 50 packets (packet md5), same raw samples (hash read from mdat), same decoded frames', () => {
  const r = F('remux'), d = F('def');
  assert.equal(r.packetMd5, d.packetMd5); assert.equal(r.box.sampleSha, d.box.sampleSha); assert.equal(r.decoded.sha, d.decoded.sha);
  assert.equal(r.box.samples, 50); assert.equal(r.bytes, d.bytes);
  assert.equal(F('copy').packetMd5, d.packetMd5);
});

t('every byte that differs between the default file and the retagged copy lies inside the sample entry; a copy with no tag differs in none', () => {
  const d = ev.diffs;
  assert.ok(d['def:remux'].sameLength); assert.ok(d['def:remux'].insideSampleEntry); assert.ok(d['def:remux'].count > 0);
  assert.equal(d['def:copy'].count, 0);
  assert.ok(d['def:remux'].offsets.length <= 12);
});

t('on 6.1.1 the retag from hev1 to hvc1 rewrites exactly 2 bytes of the file ("e" to "v" and "v" to "c"), and the retag back also rewrites 2', () => {
  assert.equal(ev.diffs['def:remux'].count, 2); assert.equal(ev.diffs['hvc:back'].count, 2);
  const [a, b] = ev.diffs['def:remux'].offsets; assert.equal(b - a, 1);
});

t('the hvcC box lists the VPS, SPS and PPS (nal types 32, 33, 34) and the samples carry none of them in band', () => {
  for (const k of ['def', 'hvc', 'remux']) {
    const types = F(k).box.arrays.map((a) => a.type);
    for (const need of [32, 33, 34]) assert.ok(types.includes(need), `${k} hvcC has ${need}`);
    assert.equal(F(k).box.samplesWithParamSets, 0, k);
    assert.deepEqual(F(k).box.firstSampleNals.filter((x) => x >= 32 && x <= 34), []);
  }
});

t('a native hvc1 mux marks the VPS, SPS and PPS arrays complete (flag 1), while the default hev1 and the retagged copy leave them 0', () => {
  const flag = (k, type) => F(k).box.arrays.find((a) => a.type === type).complete;
  for (const type of [32, 33, 34]) { assert.equal(flag('hvc', type), 1); assert.equal(flag('def', type), 0); assert.equal(flag('remux', type), 0); }
  assert.equal(ev.diffs['def:hvc'].count, 5);
});

t('a stream that carries parameter sets in band keeps them under a hvc1 retag: the label changes, the samples do not', () => {
  const r = F('rep'), v = F('repvc');
  assert.equal(r.box.fourcc, 'hev1'); assert.ok(r.box.samplesWithParamSets >= 1);
  assert.deepEqual(r.box.firstSampleNals.filter((x) => x >= 32 && x <= 34), [32, 33, 34]);
  assert.equal(v.box.fourcc, 'hvc1'); assert.equal(v.box.samplesWithParamSets, r.box.samplesWithParamSets);
  assert.equal(v.box.sampleSha, r.box.sampleSha); assert.equal(v.packetMd5, r.packetMd5);
  assert.ok(ev.diffs['rep:repvc'].insideSampleEntry);
});

t('matroska has no such tag: ffprobe reports neither hev1 nor hvc1, the header holds the CodecID V_MPEGH/ISO/HEVC and neither FourCC', () => {
  const m = F('mkv');
  assert.equal(m.probe.codec, 'hevc'); assert.ok(!['hev1', 'hvc1'].includes(m.probe.tagString));
  assert.ok(m.mkv.codecId); assert.ok(!m.mkv.hasHev1); assert.ok(!m.mkv.hasHvc1);
});
