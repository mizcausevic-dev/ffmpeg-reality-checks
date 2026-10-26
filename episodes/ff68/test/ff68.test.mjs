import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, readTs, readMp4, buildOf, CASES, RATE, FPS, VIDEO_FRAMES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff68-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (n) => ev.runs[n];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
// ffmpeg 8.1.2 rounds some mkv packet spans down by up to 1 ms (3.999 s for a 4.000 s clip) and its mkv demuxer reports packet durations that fall short by about 16 ms instead of 40 ms or more
const SPAN_TOL = 1.1e-3;
const MKV = ['mkv_same', 'mkv_long', 'mkv_late'], MOV = ['mov_same', 'mov_long', 'mov_late'], MP4 = ['mp4_same', 'mp4_long', 'mp4_late'], TS = ['ts_same', 'ts_long', 'ts_late'];
const PCM = [...MKV, ...MOV];
const AF = 1024 / RATE;
const kb = (b) => b.keys.map((k) => b.bytes.slice(k.from, k.from + k.len).join(' '));

t('the readers behave on bytes we write ourselves: readTs finds the PTS of a hand made PES packet, readMp4 finds mvhd, tkhd, mdhd, elst and stts in a hand made moov', () => {
  // transport packet: sync, payload start, pid 0x101, payload only; PES for audio (stream id 0xc0) with pts 90000 ticks (1.000 s)
  const pkt = Buffer.alloc(188, 0xff); pkt[0] = 0x47; pkt[1] = 0x41; pkt[2] = 0x01; pkt[3] = 0x10;
  const pesHead = [0, 0, 1, 0xc0, 0, 8, 0x80, 0x80, 5, 0x21, 0x00, 0x05, 0xbf, 0x21]; // pts = 90000 = 0x15f90
  pesHead.forEach((b, i) => { pkt[4 + i] = b; });
  const r = readTs(pkt);
  near(r.audio.first, 1.0, 1e-9); assert.equal(r.audio.count, 1); assert.equal(r.audio.lastPtsTicks, 90000);
  const box = (type, ...kids) => { const body = Buffer.concat(kids); const h = Buffer.alloc(8); h.writeUInt32BE(8 + body.length, 0); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]); };
  const u32 = (...v) => { const b = Buffer.alloc(4 * v.length); v.forEach((x, i) => b.writeInt32BE(x, 4 * i)); return b; };
  const mvhd = box('mvhd', u32(0, 0, 0, 1000, 4000, 0x10000));
  const tkhd = box('tkhd', u32(0, 0, 0, 1, 0, 4000));
  const elst = box('elst', u32(0, 2, 1000, -1, 0x10000, 3000, 0, 0x10000));
  const mdhd = box('mdhd', u32(0, 0, 0, 25, 100));
  const hdlr = box('hdlr', u32(0, 0), Buffer.from('vide'));
  const stts = box('stts', u32(0, 1, 100, 1));
  const moov = box('moov', mvhd, box('trak', tkhd, box('edts', elst), box('mdia', mdhd, hdlr, box('minf', box('stbl', stts)))));
  const m = readMp4(moov);
  near(m.movieSeconds, 4, 1e-9); near(m.tracks[0].tkhdSeconds, 4, 1e-9); near(m.tracks[0].mediaSeconds, 4, 1e-9); near(m.tracks[0].sttsSeconds, 4, 1e-9);
  assert.equal(m.tracks[0].handler, 'vide'); assert.deepEqual(m.tracks[0].elst.map((e) => [e.segment, e.mediaTime]), [[1000, -1], [3000, 0]]); near(m.tracks[0].emptyEditSeconds, 1, 1e-9);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the 12 files are what the fixture promises: video is 100 frames (4 s) in every file, pcm audio is exactly 4 or 5 s of samples, aac audio is the nominal length plus at most three frames of codec padding', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(Object.keys(ev.runs).length, 12); assert.equal(Object.keys(CASES).length, 12);
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.decoded.frames, VIDEO_FRAMES, `${k} video frames`); assert.equal(r.decoded.videoSeconds, 4, k);
    if (PCM.includes(k)) assert.equal(r.decoded.samples, r.decoded.expectedSamples, `${k} pcm samples`);
    else { const extra = r.decoded.samples - r.decoded.expectedSamples; assert.ok(extra >= 0 && extra <= 3 * 1024, `${k} aac padding ${extra}`); }
  }
});

t('control: with audio and video both 4 s from time 0 in a mov, every number says 4.0 s: ffprobe format and both stream durations, packet spans, the decoder, and the bytes (mvhd, tkhd, mdhd and stts; mvhd holds 4000 ticks at timescale 1000)', () => {
  const r = R('mov_same'), p = r.probe;
  near(p.format.duration, 4, 1e-3); near(p.video.duration, 4, 1e-3); near(p.audio.duration, 4, 1e-3);
  near(r.packets.video.span, 4, 1e-3); near(r.packets.audio.span, 4, 1e-3); near(r.decoded.videoSeconds, 4, 1e-9); near(r.decoded.audioSeconds, 4, 1e-9);
  const c = r.container; near(c.movieSeconds, 4, 1e-9); assert.equal(c.mvhd.duration, 4000); assert.equal(c.mvhd.timescale, 1000);
  for (const tr of c.tracks) { near(tr.tkhdSeconds, 4, 1e-9); near(tr.mediaSeconds, 4, 1e-9); near(tr.sttsSeconds, 4, 1e-9); }
  assert.deepEqual(kb(ev.hex.movMvhd), ['00 00 03 e8', '00 00 0f a0']);
  assert.equal(Buffer.from(ev.hex.movMvhd.bytes.slice(0, 48).map((x) => parseInt(x, 16))).toString('latin1').includes('mvhd'), true, 'the dump shows the box name');
});

t('the two readers agree on the file duration: ffprobe format.duration equals the number stored in the bytes (mvhd for mov and mp4, the Info Duration element for mkv) within 1 ms, in all 9 non-ts files', () => {
  for (const k of [...MOV, ...MP4]) near(R(k).probe.format.duration, R(k).container.movieSeconds, 1e-3, k);
  for (const k of MKV) near(R(k).probe.format.duration, R(k).container.durationSeconds, 1e-3, k);
});

t('format.duration is the latest stream end minus the earliest stream start: built from ffprobe stream starts and durations it matches within 2 ms for every mov, mp4 and ts file, and for mkv it equals the Info Duration', () => {
  for (const k of [...MOV, ...MP4, ...TS]) { assert.notEqual(R(k).formatModel, null, k); near(R(k).formatModel, R(k).probe.format.duration, 2e-3, k); }
  for (const k of MKV) near(R(k).container.durationSeconds, R(k).probe.format.duration, 1e-3, k);
});

t('audio longer than video: the format says 5.0 s while the video stream says 4.0 s, and both are true (mov, mp4): the format is the longest stream, the decoder yields 100 frames and 5 s of audio', () => {
  for (const k of ['mov_long', 'mp4_long']) { const r = R(k); near(r.probe.format.duration, 5, 1e-3, k); near(r.probe.video.duration, 4, 1e-3, k); near(r.probe.audio.duration, 5, 1e-3, k); near(r.decoded.videoSeconds, 4, 1e-9, k); assert.ok(r.decoded.audioSeconds >= 5 && r.decoded.audioSeconds < 5.05, k); }
  near(R('mkv_long').probe.format.duration, 5, 1e-3); near(R('mkv_long').decoded.audioSeconds, 5, 1e-9); near(R('mkv_long').decoded.videoSeconds, 4, 1e-9);
  assert.equal(R('mkv_long').probe.video.duration, null);
  const c = R('mov_long').container; near(c.movieSeconds, 5, 1e-9); near(c.tracks[0].tkhdSeconds, 4, 1e-9); near(c.tracks[1].tkhdSeconds, 5, 1e-9);
});

t('a late start counts: audio of 4 s that starts at 1 s makes a 5.0 s format in mkv and mov, with no stream holding more than 4 s of content; the mov edit list says it with an empty edit of 1000 ticks (media time -1), the mkv block times say it with a first audio block at 1.000 s', () => {
  for (const k of ['mkv_late', 'mov_late']) {
    const r = R(k); near(r.probe.format.duration, 5, 1e-3, k); near(r.probe.audio.start, 1, 1e-3, k); near(r.probe.video.start, 0, 1e-3, k);
    near(r.decoded.audioSeconds, 4, 1e-9, k); near(r.decoded.videoSeconds, 4, 1e-9, k); near(r.timeline.length, 5, 1e-3, k);
    near(r.packets.audio.first, 1, 1e-3, k); near(r.packets.audio.span, 4, SPAN_TOL, k);
  }
  near(R('mov_late').probe.audio.duration, 4, 1e-3);
  const e = R('mov_late').container.tracks[1].elst; assert.deepEqual(e.map((x) => [x.segment, x.mediaTime]), [[1000, -1], [4000, 0]]); near(R('mov_late').container.tracks[1].emptyEditSeconds, 1, 1e-9);
  assert.deepEqual(kb(ev.hex.movElst), ['00 00 03 e8', 'ff ff ff ff']);
  near(R('mkv_late').container.blocks[2][0].t, 1, 1e-3); near(R('mkv_late').container.blocks[1][0].t, 0, 1e-3);
  // known contrast: the same late audio in the mov with no offset is not late
  near(R('mov_same').probe.audio.start, 0, 1e-3);
});

t('the same late audio gets two meanings of stream duration: the mov says 4.0 s (its length), the mkv has no duration field in ffprobe and a DURATION tag of 5.0 s (its end time), and ffprobe and the bytes read the same tag', () => {
  near(R('mov_late').probe.audio.duration, 4, 1e-3);
  for (const k of MKV) { assert.equal(R(k).probe.video.duration, null, k); assert.equal(R(k).probe.audio.duration, null, k); }
  near(R('mkv_late').probe.audio.tagDuration, 5, 1e-3); near(R('mkv_late').probe.video.tagDuration, 4, 1e-3);
  near(R('mkv_same').probe.audio.tagDuration, 4, 1e-3); near(R('mkv_long').probe.audio.tagDuration, 5, 1e-3);
  for (const k of MKV) { const tags = R(k).container.durationTags.map((x) => x.seconds); near(tags[0], R(k).probe.video.tagDuration, 1e-3, k); near(tags[1], R(k).probe.audio.tagDuration, 1e-3, k); }
  assert.ok(R('mkv_late').probe.audio.tagDuration - R('mkv_late').decoded.audioSeconds > 0.99, 'the tag is 1 s longer than the audio it describes');
});

t('summed packet durations are the weakest number: in mkv they fall short of the audio by 40 ms or more (all block times are whole milliseconds, steps of 42 or 43 ms), while last pts + duration - first pts equals the decoded length within 1 ms; mov packets sum within 0.2 ms; video packets sum to exactly 4 s everywhere', () => {
  for (const k of MKV) {
    const r = R(k); assert.ok(r.decoded.audioSeconds - r.packets.audio.sumDur >= (isV6() ? 0.04 : 0.005), `${k} short by ${r.decoded.audioSeconds - r.packets.audio.sumDur}`);
    near(r.packets.audio.span, r.decoded.audioSeconds, SPAN_TOL, k); assert.equal(r.container.wholeMs, true, k); assert.deepEqual(r.container.audioStepsMs, [42, 43], k);
  }
  for (const k of MOV) near(R(k).packets.audio.sumDur, R(k).decoded.audioSeconds, 2e-4, k);
  for (const k of Object.keys(CASES)) near(R(k).packets.video.sumDur, 4, 1e-6, k);
  // the mechanism: 2048 sample packets last 42.667 ms and are reported as 42 ms (build specific)
  if (isV6()) for (const k of MKV) { const r = R(k); const n = r.packets.audio.n; near(r.decoded.audioSeconds - r.packets.audio.sumDur, (n - 1) * (2048 / RATE - 0.042), 2e-3, k); }
});

t('ts is an estimate: ffprobe ends the audio at the last PES time stamp plus one AAC frame, and that PES holds 11 to 13 frames, so the audio stream and (when audio ends last) the format come out 0.21 to 0.26 s shorter than the packets and the decoder say', () => {
  for (const k of TS) {
    const r = R(k), m = r.tsModel;
    assert.ok(m.audioFramesInLastPes >= 2 && m.audioFramesInLastPes <= 16, `${k} frames in the last PES ${m.audioFramesInLastPes}`);
    assert.ok(r.probe.audio.duration <= r.decoded.audioSeconds, `${k} ffprobe audio stream is not longer than the decoded audio`);
    near(r.packets.audio.span, r.decoded.audioSeconds, 2e-3, k);
    near(r.decoded.audioSeconds - r.probe.audio.duration, (m.audioFramesInLastPes - 1) * AF, 3e-3, `${k} shortfall is the other frames of the last PES`);
    if (isV6()) { near(r.probe.audio.duration, m.audioStream, 1e-3, k); near(r.probe.video.duration, m.videoStream, 1e-3, k); assert.ok(r.decoded.audioSeconds - r.probe.audio.duration > 0.2, k); }
  }
  if (isV6()) {
    const r = R('ts_long'); near(r.probe.format.duration, 4.778667, 1e-3); near(r.timeline.length, 5.034667, 1e-3); near(r.decoded.audioSeconds - r.probe.format.duration, 0.256, 2e-3);
    assert.equal(r.tsModel.audioFramesInLastPes, 13); assert.equal(r.container.audio.lastPtsTicks, 554160);
    assert.deepEqual(kb(ev.hex.tsLastPes), ['00 00 01 c0', '21 00 21 e9 61']);
    assert.equal(ev.tsPes.audioPts.length, 16); near(Math.max(...ev.tsPes.audioPts), 6.157333, 1e-3);
    assert.deepEqual(kb(ev.hex.mkvDuration), ['44 89 88 40 b3 88 00 00 00 00 00']);
  }
});

t('ts video is not affected: one frame per PES, so ffprobe video stream duration equals the 4.0 s the decoder returns, in all three ts files; and ts start_time is not zero (muxer delay) while the other containers start at 0', () => {
  for (const k of TS) { near(R(k).probe.video.duration, 4, 1e-3, k); assert.equal(R(k).container.video.count, VIDEO_FRAMES, k); assert.ok(R(k).probe.format.start > 1, `${k} start ${R(k).probe.format.start}`); }
  for (const k of [...MKV, ...MOV, ...MP4]) near(R(k).probe.format.start, 0, 1e-3, k);
});

t('AAC adds a frame of priming: for the 4 s sine in mp4 the stream says 4.0 s, the summed packets say 4.021 s and the decoder returns 192512 samples (4.011 s), three numbers for one clip, while the mov with pcm has one', () => {
  const r = R('mp4_same');
  near(r.probe.audio.duration, 4, 1e-3); assert.ok(r.packets.audio.sumDur > 4.01); assert.ok(r.decoded.audioSeconds > 4 && r.decoded.audioSeconds < 4.03);
  assert.equal(r.container.tracks[1].elst[0].mediaTime, 1024, 'the edit list skips the first 1024 samples');
  assert.ok(r.container.tracks[1].mediaSeconds > r.probe.audio.duration, 'the media is longer than what the edit list plays');
  if (isV6()) { assert.equal(r.decoded.samples, 192512); near(r.packets.audio.sumDur, 4.021333, 1e-3); }
});

t('known positive for every reader: lengthening the audio by 1 s moves ffprobe format.duration, the audio packet span, the decoder sample count (+48000) and the bytes (mvhd, Info Duration) by 1 s each, so none of them is blind to the effect', () => {
  for (const [a, b] of [['mkv_same', 'mkv_long'], ['mov_same', 'mov_long']]) {
    near(R(b).probe.format.duration - R(a).probe.format.duration, 1, 1e-3, a); near(R(b).packets.audio.span - R(a).packets.audio.span, 1, 1e-3, a);
    assert.equal(R(b).decoded.samples - R(a).decoded.samples, RATE, a);
  }
  near(R('mov_long').container.movieSeconds - R('mov_same').container.movieSeconds, 1, 1e-9); near(R('mkv_long').container.durationSeconds - R('mkv_same').container.durationSeconds, 1, 1e-9);
  assert.equal(FPS, 25);
});

t('the packet span (last pts + duration - first pts) is the number that holds up: it matches the decoder within 1 ms in the 6 pcm files and the 3 ts files and mp4_late, and in the two aac mp4 files it is 8 to 11 ms longer than the decoder', () => {
  let within = 0;
  for (const [k, r] of Object.entries(ev.runs)) { if (Math.abs(r.packets.audio.span - r.decoded.audioSeconds) < SPAN_TOL) within++; }
  for (const k of [...PCM, ...TS]) near(R(k).packets.audio.span, R(k).decoded.audioSeconds, SPAN_TOL, k);
  for (const k of ['mp4_same', 'mp4_long']) { const d = R(k).packets.audio.span - R(k).decoded.audioSeconds; assert.ok(d > 0.007 && d < 0.012, `${k} ${d}`); }
  assert.ok(within >= 10, `${within} of 12 within ~1 ms`);
  if (isV6()) assert.equal(within, 10);
});
