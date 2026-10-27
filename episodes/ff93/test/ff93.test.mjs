import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, readMp4, readMkv, buildOf, N, FPS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff93-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (n) => ev.runs[n];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const FR = 1 / FPS;

t('the byte readers behave on bytes we write ourselves: readMp4 expands a hand made stts, signed ctts and elst into stored decode times and shown times; readMkv finds block times in a hand made cluster', () => {
  const box = (type, ...kids) => { const body = Buffer.concat(kids); const h = Buffer.alloc(8); h.writeUInt32BE(8 + body.length, 0); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]); };
  const u32 = (...v) => { const b = Buffer.alloc(4 * v.length); v.forEach((x, i) => b.writeInt32BE(x, 4 * i)); return b; };
  // 4 samples, delta 512, time scale 12800. ctts version 1: offsets 0, 1024, -512, -512. edit list media time 0.
  const moov = box('moov', box('mvhd', u32(0, 0, 0, 1000, 160, 0x10000)), box('trak', box('edts', box('elst', u32(0, 1, 160, 0, 0x10000))),
    box('mdia', box('mdhd', u32(0, 0, 0, 12800, 2048)), box('minf', box('stbl', box('stts', u32(0, 1, 4, 512)), box('ctts', u32(0x01000000, 3, 1, 0, 1, 1024, 2, -512)))))));
  const m = readMp4(moov);
  assert.deepEqual(m.storedDts, [0, 512, 1024, 1536]); assert.deepEqual(m.cts, [0, 1024, -512, -512]); assert.equal(m.ctts.version, 1);
  assert.deepEqual(m.shownPts, [0, 1536, 512, 1024]); assert.deepEqual(m.shownDts, [-512, 0, 512, 1024]);
  const el = (id, body) => Buffer.concat([Buffer.from(id), Buffer.from([0x80 | body.length]), body]);
  const sb = (rel) => el([0xa3], Buffer.from([0x81, rel >> 8, rel & 255, 0x80, 0xaa]));
  const cluster = el([0x1f, 0x43, 0xb6, 0x75], Buffer.concat([el([0xe7], Buffer.from([100])), sb(0), sb(120), sb(40)]));
  const seg = Buffer.concat([Buffer.from([0x18, 0x53, 0x80, 0x67, 0x80 | cluster.length]), cluster]);
  const mkv = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x80]), seg]);
  assert.deepEqual(readMkv(mkv).blocks.map((b) => b.ms), [100, 220, 140]);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the 5 files hold the same 50 pictures: the frame hashes of every remux equal the hashes of the mp4 they came from', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(Object.keys(ev.runs).length, 5);
  assert.deepEqual(ev.sameFramesAsMp4, {bf2_mkv: true, bf2neg_mp4: true, bf0_mkv: true});
  for (const r of Object.values(ev.runs)) { assert.equal(r.pk.n, N); assert.equal(r.fr.n, N); assert.equal(r.si.n, N); }
});

t('control, -bf 0: dts equals pts on all 50 packets in mp4 and mkv, nothing is negative, pts is monotonic in file order, and frames, packets and showinfo give the same time for every picture', () => {
  for (const k of ['bf0_mp4', 'bf0_mkv']) {
    const r = R(k);
    assert.equal(r.pk.dtsEqualsPts, N, k); assert.equal(r.pk.dtsNA, 0, k); assert.equal(r.pk.ptsMonotonicInFileOrder, true, k); assert.equal(r.pk.minDts, 0, k);
    assert.equal(r.fr.pktDtsEqualsPts, N, k); assert.equal(r.fr.bestEffortEqualsPts, N, k); assert.equal(r.fr.differsFromOwnPacket, 0, k);
    assert.equal(r.si.ptsEqualsFrames, true, k); assert.ok(!r.types.includes('B'), `${k} has no B-frames`);
  }
});

t('-bf 2 in mp4: the decoder needs 2 frames of reorder (has_b_frames 2), the file has B-frames, the first packet has pts 0 and dts -0.08 s (2 frames), dts rises one frame at a time, pts does not rise in file order, and dts never exceeds pts', () => {
  const r = R('bf2_mp4');
  assert.equal(r.start.hasBFrames, 2); assert.ok(r.types.includes('B'));
  near(r.pk.firstPts, 0, 1e-9); near(r.pk.firstDts, -2 * FR, 1e-9); assert.equal(r.pk.dtsStrictlyIncreasing, true); assert.equal(r.pk.ptsMonotonicInFileOrder, false); assert.equal(r.pk.dtsAbovePts, 0);
  const steps = r.packets.slice(1).map((p, i) => p.dtsT - r.packets[i].dtsT); steps.forEach((s) => near(s, FR, 1e-6));
  near(r.pk.maxLead, 4 * FR, 1e-6); // pts - dts reaches 4 frames with this I P B B pattern
  assert.equal(r.pk.ptsSortedStep, true, 'sorted, the pts values are the 50 frame times');
});

t('the negative start is not stored: in the mp4 bytes the first stored decode time is 0 and every one is non negative; the edit list media time (1024 ticks of 12800) is 2 frames and ffprobe shows stored dts minus that; ffprobe format start time is 0 although the first dts is negative', () => {
  const b = R('bf2_mp4').bytes_;
  assert.equal(b.timescale, 12800); assert.equal(b.storedFirstDts, 0); assert.equal(b.storedDtsNonNegative, true);
  assert.equal(b.elst.length, 1); assert.equal(b.mediaTime, 2 * 512); assert.equal(b.shownPtsMatchesFfprobe, true);
  if (isV6()) { assert.equal(b.cttsVersion, 0); assert.equal(b.shownDtsMatchesFfprobe, true); }
  near(R('bf2_mp4').start.format, 0, 1e-9); near(R('bf2_mp4').start.stream, 0, 1e-9);
});

t('known positive for the edit list: asking the mov demuxer to ignore it (-ignore_editlist 1) moves the 2 frame shift from the dts to the pts, so the first dts is 0 and the first pts is 0.08 s', () => {
  const g = ev.ignoreEditlist;
  near(g.shift, 2 * FR, 1e-9); near(g.firstDts, 0, 1e-9); near(g.firstPts, 2 * FR, 1e-9); near(g.minDts, 0, 1e-9); assert.equal(g.n, N);
});

t('frames are not packets: best_effort_timestamp equals pts on all 50 frames, but the pkt_dts printed on a frame is not the dts of the packet that carried it (it differs for every frame that has one), and the last 2 frames have no pkt_dts', () => {
  const r = R('bf2_mp4');
  assert.equal(r.fr.bestEffortEqualsPts, N); assert.equal(r.fr.ptsIncreasing, true); near(r.fr.firstPts, 0, 1e-9);
  const withDts = N - r.fr.pktDtsNA;
  assert.ok(r.fr.pktDtsNA <= 3, `pkt_dts N/A on ${r.fr.pktDtsNA}`);
  assert.equal(r.fr.differsFromOwnPacket, withDts, 'all frames that have a pkt_dts differ from their own packet dts');
  if (isV6()) { assert.equal(r.fr.pktDtsNA, 2); assert.equal(r.fr.pktDtsEqualsPts, 48); }
});

t('showinfo and ffprobe agree on the pictures: showinfo prints the pts of each of the 50 frames in presentation order, equal to the frame pts, in all 5 files, and (on 6.1.1) prints no dts', () => {
  for (const [k, r] of Object.entries(ev.runs)) { assert.equal(r.si.ptsEqualsFrames, true, k); assert.equal(r.si.n, N, k); near(r.si.firstPts, 0, 1e-9, k); }
  if (isV6()) for (const r of Object.values(ev.runs)) assert.equal(r.si.anyDts, false);
});

t('mkv stores no decode time: the blocks hold one whole millisecond time each (the pts, in decode order, equal to ffprobe pts), and ffprobe rebuilds a dts; it never shows a dts above the pts', () => {
  const r = R('bf2_mkv'), b = r.bytes_;
  assert.equal(b.blocks, N); assert.equal(b.matchesFfprobePts, true); assert.equal(b.timesAreWholeMs, true); assert.equal(b.hasDtsField, false);
  assert.deepEqual(b.firstMs.slice(0, 4), [0, 120, 40, 80], 'decode order, presentation times');
  assert.equal(r.pk.dtsAbovePts, 0); near(r.start.format, 0, 1e-9);
  if (isV6()) { assert.equal(r.pk.dtsNA, 2); assert.equal(r.pk.dtsStrictlyIncreasing, true); assert.ok(r.packets.slice(0, 2).every((p) => p.dts === null)); }
});

t('the same bitstream, three dts: the first dts is -0.08 s in the mp4, N/A (6.1.1) in the mkv, and -0.04 s in the mp4 written with +negative_cts_offsets (signed ctts, edit list media time 0), and ffprobe format start time is 0 for all three', () => {
  const a = R('bf2_mp4'), m = R('bf2_mkv'), n = R('bf2neg_mp4');
  near(a.pk.firstDts, -0.08, 1e-9); near(n.pk.firstDts, -0.04, 1e-9);
  assert.ok(a.pk.firstDts !== n.pk.firstDts);
  for (const r of [a, m, n]) near(r.start.format, 0, 1e-9);
  assert.equal(n.bytes_.cttsVersion, 1); assert.equal(n.bytes_.minCts, -512); assert.equal(n.bytes_.mediaTime, 0); assert.equal(n.bytes_.shownPtsMatchesFfprobe, true);
  if (isV6()) { assert.equal(n.bytes_.shownDtsMatchesFfprobe, true); assert.equal(n.pk.dtsEqualsPts, 32); assert.equal(n.fr.pktDtsEqualsPts, 0); }
  assert.equal(JSON.stringify(a.packets.map((p) => p.ptsT)), JSON.stringify(n.packets.map((p) => p.ptsT)), 'the pts are the same, only the dts moved');
  assert.equal(JSON.stringify(a.packets.map((p) => p.ptsT)), JSON.stringify(m.packets.map((p) => p.ptsT)));
});
