import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, mp4Tracks, kindOfHandler, hasText, boxes, buildOf, TYPES, AUDIO, SUBS, CUES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff56-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (n) => ev.runs[n];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const codecs = (s) => s.map((x) => x.codec);
const PASS = ['aac', 'opus', 'flac', 'pcm', 'vorbis', 'cover'], FAIL = ['subrip', 'ass', 'webvtt', 'ttf'];

const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const box = (type, ...kids) => { const body = Buffer.concat(kids); return Buffer.concat([u32(8 + body.length), Buffer.from(type, 'latin1'), body]); };

t('the helpers behave: a hand-made mp4 gives its tracks (handler and sample entry), a file with no moov box reports none, handler names map to stream kinds, the byte search finds text, build detection', () => {
  const hdlr = (h) => box('hdlr', u32(0), u32(0), Buffer.from(h, 'latin1'), Buffer.alloc(12));
  const trak = (h, fcc) => box('trak', box('mdia', hdlr(h), box('minf', box('stbl', box('stsd', u32(0), u32(1), box(fcc))))));
  const file = path.join(dir, 'tiny.mp4');
  fs.writeFileSync(file, Buffer.concat([box('ftyp', Buffer.from('isom')), box('moov', trak('vide', 'avc1'), trak('soun', 'mp4a'), trak('sbtl', 'tx3g')), box('mdat', Buffer.from('hello one'))]));
  const m = mp4Tracks(file);
  assert.equal(m.moov, true); assert.deepEqual(m.tracks, [{handler: 'vide', fourcc: 'avc1'}, {handler: 'soun', fourcc: 'mp4a'}, {handler: 'sbtl', fourcc: 'tx3g'}]);
  assert.ok(hasText(m.buf, 'hello one') && !hasText(m.buf, 'hello two'));
  const empty = path.join(dir, 'empty.mp4'); fs.writeFileSync(empty, '');
  assert.deepEqual(mp4Tracks(empty), {exists: true, size: 0, moov: false, tracks: []}); assert.equal(mp4Tracks(path.join(dir, 'nope.mp4')).exists, false);
  assert.deepEqual(['vide', 'soun', 'sbtl', 'text'].map(kindOfHandler), ['video', 'audio', 'subtitle', 'subtitle']); assert.equal(boxes(Buffer.from('plain text, not a box')).length, 0);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the sources are what the fixture promises: 10 single-type files of 2 streams (h264 plus one), the control with 7 streams, the mix with 8, all read by ffprobe', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  for (const ty of TYPES) { const s = ev.sources[ty.id]; assert.equal(s.length, 2, ty.id); assert.equal(s[0].codec, 'h264', ty.id); assert.equal(s[1].codec, ty.codec, ty.id); assert.equal(s[1].type, ty.kind, ty.id); }
  assert.deepEqual(codecs(ev.sources.good), ['h264', 'aac', 'opus', 'flac', 'pcm_s16le', 'vorbis', 'mjpeg']);
  assert.deepEqual(codecs(ev.sources.mix), ['h264', 'aac', 'opus', 'flac', 'pcm_s16le', 'vorbis', 'subrip', 'ttf']);
  assert.equal(ev.baseFrames, 50);
});

t('known-positive control: -map 0 -c copy on a file with video, five audio codecs and cover art (7 streams) succeeds, and the output has the same 7 streams in the same order, read by ffprobe and by the mp4 track boxes, with the video frames unchanged (ffmpeg 6.1.1)', () => {
  const r = R('good');
  if (isV6()) {
    assert.equal(r.ok, true); assert.deepEqual(r.probeStreams, ev.sources.good); assert.equal(r.boxCount, 7);
    assert.deepEqual(r.boxTracks.map((x) => x.kind), ['video', 'audio', 'audio', 'audio', 'audio', 'audio', 'video']); assert.equal(r.videoSame, true);
  } else assert.equal(r.ok ? r.boxCount === r.probeCount : r.moov === false, true);
});

t('both readers agree on every one of the 24 attempts: a successful run opens in ffprobe, has a moov box, and the same number and kinds of streams in both; a failed run does not open in ffprobe and has no moov box (no file, an empty file or a headerless one)', () => {
  assert.equal(Object.keys(ev.runs).length, 24);
  for (const [k, r] of Object.entries(ev.runs)) {
    if (r.ok) { assert.equal(r.probeOpens, true, k); assert.equal(r.moov, true, k); assert.equal(r.probeCount, r.boxCount, k); assert.deepEqual(r.probeKinds, r.boxKinds, k); }
    else { assert.equal(r.probeOpens, false, k); assert.equal(r.moov, false, k); assert.equal(r.probeCount, 0, k); assert.equal(r.boxCount, 0, k); }
  }
});

t('which single stream types make -map 0 -c copy into mp4 fail: 6 of 10 pass (aac, opus, flac, pcm_s16le, vorbis, mjpeg cover art), 4 of 10 fail (subrip, ass, webvtt, the ttf attachment) on ffmpeg 6.1.1; on every build subrip and the attachment fail and aac passes', () => {
  assert.equal(R('one.aac').ok, true); assert.equal(R('one.subrip').ok, false); assert.equal(R('one.ttf').ok, false);
  if (isV6()) {
    for (const id of PASS) assert.equal(R(`one.${id}`).ok, true, id);
    for (const id of FAIL) assert.equal(R(`one.${id}`).ok, false, id);
    assert.equal(PASS.length + FAIL.length, TYPES.length); assert.equal(TYPES.filter((ty) => R(`one.${ty.id}`).ok).length, 6);
  }
});

t('a failure is the whole output: the failing runs exit non-zero and leave no readable mp4, even though the video stream in the same source copies fine on its own (on 6.1.1 the file is 0 bytes, the message names the codec and its stream number, and every failure is a "Could not find tag for codec" error)', () => {
  for (const id of FAIL) {
    const r = R(`one.${id}`);
    assert.notEqual(r.status, 0, id); assert.equal(r.probeOpens, false, id); assert.equal(r.moov, false, id);
    if (isV6()) { assert.equal(r.exists && r.size, 0, `${id} leaves a 0 byte file`); assert.match(r.firstError, new RegExp(`Could not find tag for codec ${id} in stream #1`), id); }
  }
  assert.equal(R('fix.ttf').ok, true); assert.deepEqual(codecs(R('fix.ttf').probeStreams), ['h264']);
});

t('what is stored: on 6.1.1 the five audio codecs keep their codec and get sample entries mp4a (aac, vorbis), Opus, fLaC and ipcm (pcm_s16le), and the cover art becomes a second video track; the stream list after equals the stream list before', () => {
  if (!isV6()) return;
  const fcc = {aac: 'mp4a', opus: 'Opus', flac: 'fLaC', pcm: 'ipcm', vorbis: 'mp4a'};
  for (const ty of AUDIO) { const r = R(`one.${ty.id}`); assert.deepEqual(r.probeStreams, ev.sources[ty.id], ty.id); assert.equal(r.boxTracks[1].fourcc, fcc[ty.id], ty.id); assert.equal(r.boxTracks[1].kind, 'audio', ty.id); }
  const c = R('one.cover'); assert.deepEqual(c.probeStreams, ev.sources.cover); assert.deepEqual(c.boxTracks.map((x) => x.kind), ['video', 'video']);
});

t('copy means copy: in every successful run the first video stream decodes to the same 50 frame hashes as the source, so a successful mp4 is not an empty or re-encoded file', () => {
  const okRuns = Object.entries(ev.runs).filter(([k, r]) => r.ok && !k.startsWith('nocopy'));
  assert.ok(okRuns.length >= 1);
  for (const [k, r] of okRuns) assert.equal(r.videoSame, true, k);
});

t('with all the troublemakers in one file (video, five audio, subrip, attachment) -map 0 -c copy fails, and so does each half fix: -c:s mov_text (the attachment is next), -sn (the attachment is still there) and dropping the attachment (the subtitle is still there)', () => {
  for (const k of ['mix.all', 'mix.movtext', 'mix.nosub', 'mix.notach']) { assert.equal(R(k).ok, false, k); assert.notEqual(R(k).status, 0, k); }
  if (isV6()) {
    assert.match(R('mix.all').firstError, /codec subrip in stream #6/); assert.match(R('mix.movtext').firstError, /codec ttf in stream #7/);
    assert.match(R('mix.nosub').firstError, /codec ttf in stream #6/); assert.match(R('mix.notach').firstError, /codec subrip in stream #6/);
  }
});

t('both halves together work: -map 0 -map -0:t -c copy -c:s mov_text gives 7 streams (h264, five audio, mov_text) with no attachment, and -map 0:v -map 0:a -c copy gives the 6 streams without any subtitle', () => {
  if (!isV6()) return;
  const a = R('mix.fixed'), b = R('mix.explicit');
  assert.equal(a.ok, true); assert.deepEqual(codecs(a.probeStreams), ['h264', 'aac', 'opus', 'flac', 'pcm_s16le', 'vorbis', 'mov_text']); assert.equal(a.boxCount, 7); assert.equal(a.boxTracks[6].handler, 'sbtl'); assert.equal(a.boxTracks[6].fourcc, 'tx3g');
  assert.equal(b.ok, true); assert.deepEqual(codecs(b.probeStreams), ['h264', 'aac', 'opus', 'flac', 'pcm_s16le', 'vorbis']); assert.equal(b.boxCount, 6); assert.equal(b.videoSame, true);
});

t('the converted subtitle keeps its text, read two ways: the cue text "hello one" and "hello two" is found in the bytes of the mp4, and ffmpeg decoding the mov_text track to srt prints both cues', () => {
  if (!isV6()) return;
  const a = R('mix.fixed');
  assert.deepEqual(a.cueBytes, [true, true]); for (const c of CUES) assert.ok(ev.fixedSrt.includes(c), c);
  for (const ty of SUBS) { const r = R(`fix.${ty.id}`); assert.equal(r.ok, true, ty.id); assert.deepEqual(codecs(r.probeStreams), ['h264', 'mov_text'], ty.id); assert.deepEqual(r.cueBytes, [true, true], ty.id); }
});

t('the attachment has its own fix: -map 0 -map -0:t -c copy turns the failing ttf source into an mp4 with the video only, and the same source fails without it', () => {
  assert.equal(R('one.ttf').ok, false); assert.equal(R('fix.ttf').ok, true); assert.equal(R('fix.ttf').boxCount, 1); assert.equal(R('fix.ttf').videoSame, true);
});

t('removing -c copy does not remove the problem: with -map 0 and no -c copy, aac still passes, the attachment still fails, and subrip fails with a different error (on 6.1.1 no file at all, "Automatic encoder selection failed")', () => {
  assert.equal(R('nocopy.aac').ok, true); assert.equal(R('nocopy.ttf').ok, false);
  if (isV6()) { assert.equal(R('nocopy.subrip').ok, false); assert.equal(R('nocopy.subrip').exists, false); assert.notEqual(R('nocopy.subrip').firstError, R('one.subrip').firstError); assert.match(R('nocopy.subrip').firstError, /Automatic encoder selection failed/); }
});
