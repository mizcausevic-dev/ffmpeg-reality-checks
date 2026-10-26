import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, parseSrt, srtText, buildOf, CUES, CASES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff51-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const V6 = () => buildOf(ev.ffmpeg) === 'v6';
const ALL3 = ['video:h264', 'audio:pcm_s16le'];
const intact = (r, subCodec, ids, k) => {
  assert.equal(r.status, 0, k);
  assert.deepEqual(r.probe.streams, [...ALL3, `subtitle:${subCodec}`], k);
  assert.equal(r.probe.cues.length, 3, k); assert.ok(r.probe.timesMatch, `${k} ffprobe packet times`); assert.ok(r.decoded.timesMatch, `${k} srt export times`);
  assert.equal(r.decoded.cues, 3, k); assert.equal(r.bytesRead.words, 4, `${k} all four cue strings are in the raw bytes`);
  assert.deepEqual([r.bytesRead.tx3g, r.bytesRead.srtId, r.bytesRead.assId], ids, `${k} container codec ids in the bytes`);
  assert.ok(r.decoded.italic, `${k} italic survives`);
};

t('the helpers behave: srt text and parseSrt round-trip the three cues, times to the millisecond, and build detection', () => {
  const back = parseSrt(srtText());
  assert.equal(back.length, 3);
  back.forEach((c, i) => { near(c.start, CUES[i].start, 0.0005); near(c.end, CUES[i].end, 0.0005); assert.equal(c.text, CUES[i].text); });
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the two sources are what the fixture promises: h264 + pcm + mov_text in an mp4 (tx3g in the bytes) and the same cues as subrip in an mkv (S_TEXT/UTF8 in the bytes), 3 cues with the source times, all 4 cue strings in the raw bytes', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.deepEqual(ev.srcmp4.probe.streams, [...ALL3, 'subtitle:mov_text']); assert.deepEqual(ev.srcmkv.probe.streams, [...ALL3, 'subtitle:subrip']);
  assert.ok(ev.srcmp4.bytesRead.tx3g && !ev.srcmp4.bytesRead.srtId); assert.ok(ev.srcmkv.bytesRead.srtId && !ev.srcmkv.bytesRead.tx3g);
  for (const s of [ev.srcmp4, ev.srcmkv]) { assert.equal(s.probe.cues.length, 3); assert.ok(s.probe.timesMatch); assert.ok(s.decoded.timesMatch); assert.equal(s.bytesRead.words, 4); assert.ok(s.decoded.italic); }
});

t('control: the same subtitle family maps one to one: mov_text copied into .mov stays mov_text with the same 3 cues, the same times and italics; subrip remuxed into .mkv stays subrip', () => {
  intact(R('mov'), 'mov_text', [true, false, false], 'mov');
  intact(R('remux'), 'subrip', [false, true, false], 'remux');
});

t('the question: -c copy of the mp4 with mov_text into .mkv does not give a file with the subtitle in it. On 6.1.1 ffmpeg exits non-zero, and the output has no readable stream', () => {
  const r = R('copy');
  if (V6()) {
    assert.notEqual(r.status, 0); assert.equal(r.probe.nStreams, 0); assert.equal(r.probe.subCodec, null);
  }
  // on any build: if it did write a file, the subtitle is not mov_text in a matroska file (there is no tx3g in a matroska file) and the readers agree
  assert.equal(r.bytesRead.tx3g, false);
  assert.equal(r.probe.subCodec === null, r.bytesRead.words === 0);
});

t('the failure takes the picture and the sound with it: on 6.1.1 the failed copy leaves 0 of the 3 streams and none of the cue text, although only the subtitle is the problem', () => {
  const r = R('copy');
  if (!V6()) return;
  assert.equal(r.probe.nStreams, 0); assert.equal(r.bytesRead.words, 0); assert.equal(r.decoded.cues, 0); assert.equal(r.probe.cues.length, 0);
  assert.ok(r.bytes < 5000, `${r.bytes} bytes is a stub, not a 5 s video`);
  assert.ok(ev.srcmp4.bytes > 100000);
});

t('known-positive for absence: leaving the subtitle out (-map 0:v -map 0:a -c copy) works, writes video and audio only, and both readers see no subtitle: no subtitle stream, 0 cues, 0 of the 4 cue strings in the bytes', () => {
  const r = R('drop');
  assert.equal(r.status, 0); assert.deepEqual(r.probe.streams, ALL3); assert.equal(r.probe.cues.length, 0); assert.equal(r.decoded.cues, 0); assert.equal(r.bytesRead.words, 0);
  assert.deepEqual([r.bytesRead.tx3g, r.bytesRead.srtId, r.bytesRead.assId], [false, false, false]);
  assert.ok(r.bytes > 100000, 'video and audio survived');
});

t('asking for the codec works: -c:s srt gives a subrip stream (S_TEXT/UTF8 in the bytes) with video and audio copied, 3 cues, the source times (ffprobe packets and srt export), the italic, and 3 packets for 3 cues', () => {
  const r = R('asSrt');
  intact(r, 'subrip', [false, true, false], 'asSrt');
  assert.equal(r.probe.packets, 3); assert.equal(r.probe.emptyPackets, 0);
});

t('-c:s ass also works: an ass stream (S_TEXT/ASS in the bytes), the same 3 cues, the same times to the millisecond, the italic as an ASS override ({\\i1}) in the bytes instead of <i>', () => {
  const r = R('asAss');
  intact(r, 'ass', [false, false, true], 'asAss');
  assert.equal(r.bytesRead.italicAss, true); assert.equal(r.bytesRead.italicHtml, false);
  assert.equal(R('asSrt').bytesRead.italicHtml, true); assert.equal(R('asSrt').bytesRead.italicAss, false);
});

t('with no codec option at all, the subtitle is still converted (to ass): the mkv has an ass subtitle stream and the audio is no longer pcm (the default matroska audio codec was applied), all 3 cues and their text survive and the times stay within 10 ms of the source', () => {
  const r = R('plain');
  assert.equal(r.status, 0); assert.equal(r.probe.subCodec, 'ass'); assert.equal(r.bytesRead.assId, true);
  assert.equal(r.probe.nStreams, 3); assert.notEqual(r.probe.streams[1], 'audio:pcm_s16le');
  assert.equal(r.probe.cues.length, 3); assert.equal(r.decoded.cues, 3); assert.equal(r.bytesRead.words, 4);
  r.probe.cues.forEach((c, i) => { near(c.start, CUES[i].start, 0.01); near(c.end, CUES[i].end, 0.01); });
});

t('the other direction: subrip from the mkv into .mp4 with -c copy has no home. On 6.1.1 it fails and leaves no readable file; with -c:s mov_text it works and gives mov_text, tx3g, 3 cues with the source times and the italic', () => {
  const bad = R('toMp4');
  if (V6()) { assert.notEqual(bad.status, 0); assert.equal(bad.probe.nStreams, 0); }
  assert.equal(bad.probe.subCodec === null, bad.bytesRead.words === 0);
  intact(R('toMp4Txt'), 'mov_text', [true, false, false], 'toMp4Txt');
});

t('what changes under the hood on 6.1.1: mov_text stores 3 empty gap packets beside the 3 cue packets (6 packets, ffprobe sizes of 2 bytes), while subrip and ass in matroska store exactly 3', () => {
  if (!V6()) return;
  assert.equal(ev.srcmp4.probe.packets, 6); assert.equal(ev.srcmp4.probe.emptyPackets, 3);
  assert.equal(R('mov').probe.packets, 6); assert.equal(R('toMp4Txt').probe.packets, 6);
  for (const k of ['remux', 'asSrt', 'asAss']) { assert.equal(R(k).probe.packets, 3, k); assert.equal(R(k).probe.emptyPackets, 0, k); }
});

t('the video and audio streams are copied, not re-encoded, in every -c copy case that worked: same stream list as the source (h264, pcm_s16le) in all 6 of them', () => {
  for (const k of ['mov', 'remux', 'asSrt', 'asAss', 'toMp4Txt', 'drop']) assert.deepEqual(R(k).probe.streams.slice(0, 2), ALL3, k);
});

t('reader agreement on every output that was written: the subtitle codec ffprobe names matches the codec id found in the raw bytes (mov_text with tx3g, subrip with S_TEXT/UTF8, ass with S_TEXT/ASS, none with none), and the cue count by ffprobe packets equals the cue count of the srt export', () => {
  const idOf = {mov_text: 'tx3g', subrip: 'srtId', ass: 'assId'};
  assert.equal(Object.keys(ev.runs).length, Object.keys(CASES).length);
  for (const [k, r] of Object.entries(ev.runs)) {
    const want = r.probe.subCodec ? idOf[r.probe.subCodec] : null;
    for (const id of ['tx3g', 'srtId', 'assId']) assert.equal(r.bytesRead[id], id === want, `${k} ${id}`);
    assert.equal(r.probe.cues.length, r.decoded.cues, k);
    assert.equal(r.bytesRead.words === 4, r.probe.subCodec !== null, `${k} text in bytes iff a subtitle stream`);
  }
});
