import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, mp4Tracks, mkvFirst, onsetIndex, buildOf, CASES, CONTAINERS, WANT, SR, SAMPLES, FRAMES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff46-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (c, v) => ev.runs[`${c}.${v}`];
// ffmpeg 8.1.2 decodes the mp4 'aMinus' file 24 ms further than its edit list says (see the build-dependent branches below)
const v8mp4Minus = (c, name) => buildOf(ev.ffmpeg) === 'v8' && c === 'mp4' && name === 'aMinus';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const ms = 0.0015;

// a hand-made mp4 with one audio track: ftyp, moov(mvhd, trak(edts(elst: empty 1000 ms, then 3000 ms from media 48000), mdia(mdhd 48000, hdlr soun, minf(stbl(stts)))))
const box = (type, ...kids) => { const body = Buffer.concat(kids); const h = Buffer.alloc(8); h.writeUInt32BE(8 + body.length, 0); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]); };
const u32 = (...v) => { const b = Buffer.alloc(4 * v.length); v.forEach((x, i) => b.writeInt32BE(x, 4 * i)); return b; };
const fake = () => Buffer.concat([box('ftyp', Buffer.from('isom0000', 'latin1')), box('moov',
  box('mvhd', Buffer.concat([u32(0, 0, 0), u32(1000, 0)])),
  box('trak', box('edts', box('elst', Buffer.concat([u32(0, 2), u32(1000, -1, 0x10000), u32(3000, 48000, 0x10000)]))),
    box('mdia', box('mdhd', Buffer.concat([u32(0, 0, 0), u32(48000, 0)])), box('hdlr', Buffer.concat([u32(0, 0), Buffer.from('soun', 'latin1'), u32(0, 0, 0)])), box('minf', box('stbl', box('stts', u32(0, 1, 4, 1024)))))))]);

t('the byte readers are right on files they did not read from ffmpeg: a hand-built mp4 with an empty edit of 1000 ms and an edit that starts at media sample 48000 reads as lead 1.000 s and skip 1.000 s; a hand-built mkv with two blocks reads its first block times; the onset finder; build detection', () => {
  const [a] = mp4Tracks(fake());
  assert.equal(a.type, 'audio'); assert.equal(a.edits.length, 2); near(a.leadSeconds, 1, 1e-9); near(a.skipSeconds, 1, 1e-9); assert.equal(a.emptyEdits, 1); assert.equal(a.nonEmptyEdits, 1);
  const el = (id, body) => Buffer.concat([Buffer.from(id), Buffer.from([0x80 | body.length]), body]);
  const track = (n, ty) => el([0xae], Buffer.concat([el([0xd7], Buffer.from([n])), el([0x83], Buffer.from([ty]))]));
  const blk = (n, rel) => { const b = Buffer.alloc(4); b[0] = 0x80 | n; b.writeInt16BE(rel, 1); return el([0xa3], b); };
  const cluster = el([0x1f, 0x43, 0xb6, 0x75], Buffer.concat([el([0xe7], Buffer.from([0x02, 0x58])), blk(1, 0), blk(2, 400)]));
  const seg = el([0x18, 0x53, 0x80, 0x67], Buffer.concat([el([0x16, 0x54, 0xae, 0x6b], Buffer.concat([track(1, 1), track(2, 2)])), cluster]));
  const f = mkvFirst(seg); near(f.video, 0.6, 1e-9); near(f.audio, 1.0, 1e-9);
  assert.equal(onsetIndex(Int16Array.from([0, 5, 999, 1001, 3])), 3);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the sources are what the fixture promises: 100 different video frames, 192000 audio samples, a tone that starts at 1.5 s (sample 72000 to 72002), 10 output files', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.source.frames, FRAMES); assert.equal(ev.source.distinctFrames, FRAMES); assert.equal(ev.source.audioSamples, SAMPLES);
  near(ev.source.onsetIndex, 72000, 3); assert.equal(Object.keys(ev.runs).length, CONTAINERS.length * Object.keys(CASES).length);
});

t('control, base: with no offset both containers start the picture and the sound at 0.000 s, the tone is at 1.500 s on both readers, the 192000 decoded samples and the 100 frames equal the sources, and nothing in the mp4 edit lists is shifted', () => {
  for (const c of CONTAINERS) {
    const b = R(c, 'base');
    near(b.probe.videoStart, 0, ms); near(b.probe.audioStart, 0, ms); near(b.bytes.videoStart, 0, ms); near(b.bytes.audioStart, 0, ms);
    near(b.audio.onsetTime, 1.5, ms + 0.001); near(b.bytes.onsetTime, 1.5, ms);
    assert.equal(b.audio.samples, SAMPLES); assert.equal(b.audio.equalsSource, true); assert.equal(b.video.frames, FRAMES); assert.equal(b.video.equalsSource, true);
  }
  assert.equal(R('mp4', 'base').bytes.audioEmpty, 0); assert.equal(R('mp4', 'base').bytes.audioSkip, 0);
});

t('control, known positive: delaying the samples themselves (adelay=1000, ALAC) moves the tone by exactly 1.000 s on the decoded reader (2.500 s, 240000 samples) while the container start stays 0.000 s on both container readers, in both files: the decoded reader sees what the stamps cannot', () => {
  for (const c of CONTAINERS) {
    const d = R(c, 'delay');
    near(d.shift.decoded, 1, ms + 0.001); near(d.audio.onsetTime, 2.5, ms + 0.001); assert.equal(d.audio.samples, 240000);
    near(d.probe.audioStart, 0, ms); near(d.bytes.audioStart, 0, ms); near(d.shift.container, 0, ms); near(d.shift.bytes, 0, ms);
  }
});

t('audio +1 s with stream copy: the audio moves by 1.000 s relative to the picture in both containers, read three ways (ffprobe start plus decoded tone, container bytes, container stamps), the tone is at 2.500 s, the picture stays at 0.000 s, and the samples are identical to the source', () => {
  for (const c of CONTAINERS) {
    const r = R(c, 'aPlus');
    for (const k of ['decoded', 'bytes', 'container']) near(r.shift[k], 1, ms + 0.001, `${c} ${k}`);
    near(r.probe.audioStart, 1, ms); near(r.bytes.audioStart, 1, ms); near(r.probe.videoStart, 0, ms); near(r.audio.onsetTime, 2.5, ms + 0.001); near(r.bytes.onsetTime, 2.5, ms);
    assert.equal(r.audio.equalsSource, true); assert.equal(r.audio.samples, SAMPLES); assert.equal(r.video.equalsSource, true);
  }
});

t('where the +1 s lives: in the mp4 it is an empty edit of 1000 ms in front of the audio track (the picture track has none), in the mkv it is the time of the first audio block (1.000 s) against the first picture block (0.000 s)', () => {
  const m = R('mp4', 'aPlus').bytes;
  assert.equal(m.audioEmpty, 1); assert.equal(m.videoEmpty, 0); assert.equal(m.audioEdits[0].dur, 1000); assert.equal(m.audioEdits[0].media, -1); assert.equal(m.audioEdits[1].media, 0);
  const k = R('mkv', 'aPlus').bytes; near(k.audioStart, 1, 1e-9); near(k.videoStart, 0, 1e-9);
});

t('what a reader that skips the mp4 edit lists sees (ffmpeg -ignore_editlist 1): the +1 s audio is back at 0.000 s with the tone at 1.500 s and all 192000 samples, exactly like the base file: in the mp4 the stored audio and picture never moved, only the edit list did', () => {
  const i = R('mp4', 'aPlus').ignored, b = R('mp4', 'base').ignored;
  near(i.audioStart, 0, ms); near(i.audioOnsetTime, 1.5, ms + 0.001); assert.equal(i.audioSamples, SAMPLES); assert.equal(i.audioMd5, b.audioMd5);
  near(R('mp4', 'aPlus').probe.audioStart, 1, ms);
});

t('picture +1 s (the offset on the video input) is a relative shift of -1.000 s for the audio in both containers on all three readers: the picture starts at 1.000 s (an empty edit in the mp4, a first block time in the mkv), the audio at 0.000 s with the tone at 1.500 s', () => {
  for (const c of CONTAINERS) {
    const r = R(c, 'vPlus');
    for (const k of ['decoded', 'bytes', 'container']) near(r.shift[k], -1, ms + 0.001, `${c} ${k}`);
    near(r.probe.videoStart, 1, ms); near(r.bytes.videoStart, 1, ms); near(r.probe.audioStart, 0, ms); near(r.audio.onsetTime, 1.5, ms + 0.001);
  }
  assert.equal(R('mp4', 'vPlus').bytes.videoEmpty, 1);
});

t('audio -1 s is -1.000 s in both containers on the decoded and the byte reader, but it is stored differently on ffmpeg 6.x: the mp4 keeps the picture at 0 and an edit list skips the first 48000 audio samples (144000 decoded, equal to the source tail), the mkv keeps all 192000 samples and starts the picture at 1.000 s', () => {
  for (const c of CONTAINERS) { const r = R(c, 'aMinus'); near(r.shift.decoded, v8mp4Minus(c, 'aMinus') ? -1.024 : -1, ms + 0.001, c); near(r.shift.bytes, -1, ms, c); }
  if (buildOf(ev.ffmpeg) === 'v8') { const m = R('mp4', 'aMinus'); near(m.bytes.audioSkip, 1, 1e-9); assert.equal(m.bytes.audioSkipUnits, SR); assert.ok(m.audio.samples < SAMPLES - SR, 'the 8.1.2 decoder returns fewer than the 144000 samples the edit list leaves'); assert.equal(m.audio.equalsSourceTail, false); }
  if (buildOf(ev.ffmpeg) === 'v6') {
    const m = R('mp4', 'aMinus'), k = R('mkv', 'aMinus');
    near(m.probe.videoStart, 0, ms); near(m.bytes.audioSkip, 1, 1e-9); assert.equal(m.bytes.audioSkipUnits, SR); assert.equal(m.audio.samples, SAMPLES - SR); assert.equal(m.audio.equalsSourceTail, true); near(m.audio.onsetTime, 0.5, ms + 0.001);
    near(k.probe.videoStart, 1, ms); near(k.bytes.videoStart, 1, ms); near(k.probe.audioStart, 0, ms); assert.equal(k.audio.samples, SAMPLES); assert.equal(k.audio.equalsSource, true); near(k.audio.onsetTime, 1.5, ms + 0.001);
  }
});

t('stream copy changes no frame and no sample: in all 10 files the 100 decoded frames are the source frames, and the audio is the source audio byte for byte (the mp4 -1 s file is its source tail, the delay control is longer by 48000 zeros)', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.video.frames, FRAMES, k); assert.equal(r.video.equalsSource, true, k);
    if (r.variant === 'delay') assert.equal(r.audio.samples, SAMPLES + SR, k);
    else if (k === 'mp4.aMinus' && buildOf(ev.ffmpeg) === 'v6') assert.equal(r.audio.equalsSourceTail, true, k);
    else if (k === 'mp4.aMinus') { /* v8: the decoder drops extra samples, asserted in the -1 s test */ }
    else assert.equal(r.audio.equalsSource, true, k);
  }
});

t('reader agreement on all 10 files: ffprobe start times and the byte readers agree within 1.5 ms for the picture and the sound, and the decoded reader and the byte reader agree on the tone position (relative to the picture) within 2.5 ms in every case that moves stamps, edit lists or both', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    near(r.probe.videoStart, r.bytes.videoStart, ms, `${k} video`); near(r.probe.audioStart, r.bytes.audioStart, ms, `${k} audio`);
    if (r.variant !== 'delay') near(r.shift.decoded, r.shift.bytes + (k === 'mp4.aMinus' && buildOf(ev.ffmpeg) === 'v8' ? -0.024 : 0), 0.0025, k);
  }
});

t('the relative shift is what you asked for on any build: for every case and both containers the decoded reader and the byte reader report the requested audio-against-picture shift (0, +1, -1, -1) within 2.5 ms, and the control delay reports +1 on the decoded reader only', () => {
  for (const c of CONTAINERS) for (const name of Object.keys(CASES)) {
    const r = R(c, name);
    near(r.shift.decoded, WANT[name] + (v8mp4Minus(c, name) ? -0.024 : 0), 0.0025, `${c}.${name} decoded`);
    if (name !== 'delay') near(r.shift.bytes, WANT[name], 0.0025, `${c}.${name} bytes`); else near(r.shift.bytes, 0, 0.0025, `${c}.delay bytes`);
  }
});
