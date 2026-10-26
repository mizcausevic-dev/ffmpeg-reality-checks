import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, srcIndexByHash, reqStart, nameOf, buildOf, SS, CONTAINERS, POS, CASES, FRAMES, FPS, GOP} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff58-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (pos, ss, c) => ev.runs[nameOf(pos, ss, c)];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const prevKey = (r) => Math.floor(r / GOP) * GOP, nextKey = (r) => Math.ceil(r / GOP) * GOP;
const all = () => Object.values(ev.runs);

t('the helpers behave: the requested start frame, the hash lookup, build detection', () => {
  assert.equal(reqStart(1.52), 38); assert.equal(reqStart(1.0), 25); assert.equal(reqStart(0.48), 12); assert.equal(reqStart(1.96), 49);
  assert.deepEqual(srcIndexByHash(['b', 'z', 'a'], ['a', 'b']), [1, -1, 0]);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
  assert.equal(nameOf('before', 1.52, 'mp4'), 'before_1p52_mp4');
});

t('ffmpeg -version is recorded, and the source is what the fixture promises: 100 distinct frames (4 s), keyframes at 0, 1, 2, 3 s, frame N has luma 16 + 2 N', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  const s = ev.source;
  assert.equal(s.frames, FRAMES); assert.equal(s.distinct, FRAMES); assert.deepEqual(s.keyframes, [0, 1, 2, 3]); assert.equal(s.lumaRule, true);
  assert.equal(all().length, SS.length * POS.length * CONTAINERS.length + 2);
});

t('control: a cut on a keyframe (-ss 1) is exact in all four copies: 75 frames, source frames 25 to 99, nothing extra at the start, nothing missing, first frame at 0.00 s; the whole clip and the re-encoded cut are the other controls', () => {
  for (const pos of POS) for (const c of CONTAINERS) {
    const r = R(pos, 1, c);
    assert.equal(r.frames, 75, `${pos} ${c}`); assert.equal(r.firstSrc, 25); assert.equal(r.lastSrc, 99); assert.equal(r.leading, 0); assert.equal(r.missing, 0); assert.equal(r.firstFrame, 0); assert.ok(r.contiguous);
  }
  const w = ev.runs.whole_mkv; assert.equal(w.frames, 100); assert.equal(w.firstSrc, 0); assert.equal(w.lastSrc, 99); assert.equal(w.leading, 0); assert.equal(w.missing, 0);
  const re = ev.runs.reenc_1p52_mkv; // accurate seek: decodes up to the requested frame and encodes from there
  assert.equal(re.firstSrc, 38); assert.equal(re.frames, 62); assert.equal(re.leading, 0); assert.equal(re.missing, 0); assert.equal(re.firstFrame, 0);
});

t('the two readers agree on every output frame of every file: framemd5 matched against the source hashes and raw luma decoded in Node name the same source frame, and no frame is unknown', () => {
  for (const r of all()) {
    assert.deepEqual(r.bySrcHash, r.bySrcRaw, r.name); assert.equal(r.unknownHashes, 0, r.name); assert.equal(r.frames, r.framesRaw, r.name); assert.ok(r.contiguous, r.name);
  }
});

t('known positive for the readers: -ss 1.52 before -i into mkv carries 13 frames the cut did not ask for (source frames 25 to 37, 0.52 s), the first frame is at 0.00 s, and both readers and the mkv first block see it', () => {
  const r = R('before', 1.52, 'mkv');
  assert.equal(r.requestedFrom, 38); assert.equal(r.firstSrc, 25); assert.equal(r.leading, 13); assert.equal(r.missing, 0); assert.equal(r.frames, 75);
  assert.equal(r.mkvFirst, 0); assert.equal(r.firstFrame, 0); assert.equal(r.packets, 75);
  assert.deepEqual(r.bySrcRaw.slice(0, 14), r.bySrcHash.slice(0, 14)); assert.equal(r.bySrcRaw[0], 25);
});

t('-ss before -i: the cut starts at the keyframe before the time asked, so the extra at the start is (asked frame minus previous keyframe) frames, in mkv: 12, 13 and 24 frames for -ss 0.48, 1.52 and 1.96, never a gap', () => {
  for (const ss of SS) {
    const r = R('before', ss, 'mkv'), q = reqStart(ss);
    assert.equal(r.firstSrc, prevKey(q), `ss ${ss}`); assert.equal(r.leading, q - prevKey(q)); assert.equal(r.missing, 0); assert.equal(r.firstFrame, 0); assert.equal(r.mkvFirst, 0);
  }
  assert.deepEqual([0.48, 1.52, 1.96].map((ss) => R('before', ss, 'mkv').leading), [12, 13, 24]);
});

t('-ss after -i: the cut starts at the first keyframe after the time asked, shifted so it starts late: the first frame is at (keyframe time minus ss) seconds, empty before it, and the asked frames in between are missing (13, 12 and 1 frames), in both containers', () => {
  for (const ss of SS) for (const c of CONTAINERS) {
    const r = R('after', ss, c), q = reqStart(ss);
    assert.equal(r.firstSrc, nextKey(q), `ss ${ss} ${c}`); assert.equal(r.missing, nextKey(q) - q); assert.equal(r.leading, 0);
    near(r.firstFrame, (nextKey(q) - q) / FPS, 0.001, `first frame ${ss} ${c}`); near(r.firstPacket, r.firstFrame, 0.001);
  }
  assert.deepEqual([0.48, 1.52, 1.96].map((ss) => R('after', ss, 'mkv').missing), [13, 12, 1]);
});

t('second reader on the container bytes agrees with ffprobe: the mkv first block time is the first frame time, and the mp4 edit list has an empty edit of the same length (after -i) with the media starting at 0', () => {
  for (const ss of SS) {
    const m = R('after', ss, 'mkv'), p = R('after', ss, 'mp4');
    near(m.mkvFirst, m.firstFrame, 0.001, `mkv ${ss}`);
    if (p.firstFrame > 0) { near(p.mp4.leadSeconds, p.firstFrame, 0.001, `mp4 ${ss}`); assert.equal(p.mp4.edits[0].media, -1); assert.equal(p.mp4.edits[1].media, 0); }
    else assert.equal(p.mp4.hasEdit && p.mp4.leadSeconds, 0);
  }
});

t('mp4 before -i hides the extra with an edit list: the file stores the same 75 packets as the mkv (keyframe 25 on) but the edit list skips the first (asked minus keyframe) frames, so ffmpeg decodes exactly the asked frames; the skip equals the mkv extra in seconds', () => {
  for (const ss of [0.48, 1.52, 1.96]) {
    const p = R('before', ss, 'mp4'), m = R('before', ss, 'mkv'), q = reqStart(ss);
    assert.equal(p.firstSrc, q, `ss ${ss}`); assert.equal(p.leading, 0); assert.equal(p.missing, 0); assert.equal(p.frames, FRAMES - q);
    assert.equal(p.packets, m.packets, `mp4 stores as many packets as mkv, ss ${ss}`); assert.ok(p.packets > p.frames, 'some stored packets are hidden');
    near(p.mp4.skipSeconds, m.leading / FPS, 0.001, `edit list skip ${ss}`); assert.equal(p.mp4.edits[0].media > 0, true);
  }
  assert.equal(R('before', 1, 'mp4').mp4.skipSeconds, 0);
});

t('the rule: before -i extra = asked frame minus the previous keyframe, after -i missing = next keyframe minus asked frame, so the two always add up to 25 frames (1 s) unless the time is on a keyframe, where both are 0', () => {
  for (const ss of SS) {
    const q = reqStart(ss), b = R('before', ss, 'mkv'), a = R('after', ss, 'mkv');
    if (q % GOP === 0) { assert.equal(b.leading, 0); assert.equal(a.missing, 0); } else assert.equal(b.leading + a.missing, GOP, `ss ${ss}`);
  }
});

t('ffmpeg does not fill the late start itself: decoding an after -i cut at a constant 25 fps gives no repeats of its first frame (the gap lives in the timestamps only), and the frame counts equal the passthrough counts', () => {
  if (!isV6()) return assert.ok(true, 'build specific: asserted on 6.1.1 only');
  for (const r of all()) { assert.equal(r.frozenOnCfr, 0, r.name); assert.equal(r.cfrFrames, r.frames, r.name); }
});

t('on 6.1.1 the exact numbers hold for every file (frames, first source frame, first frame time)', () => {
  if (!isV6()) return assert.ok(true, 'exact table asserted on 6.1.1 only');
  const want = {before_0p48_mp4: [88, 12, 0], before_0p48_mkv: [100, 0, 0], before_1_mp4: [75, 25, 0], before_1_mkv: [75, 25, 0], before_1p52_mp4: [62, 38, 0], before_1p52_mkv: [75, 25, 0], before_1p96_mp4: [51, 49, 0], before_1p96_mkv: [75, 25, 0],
    after_0p48_mp4: [75, 25, 0.52], after_0p48_mkv: [75, 25, 0.52], after_1_mp4: [75, 25, 0], after_1_mkv: [75, 25, 0], after_1p52_mp4: [50, 50, 0.48], after_1p52_mkv: [50, 50, 0.48], after_1p96_mp4: [50, 50, 0.04], after_1p96_mkv: [50, 50, 0.04]};
  for (const [k, [n, first, ft]] of Object.entries(want)) { const r = ev.runs[k]; assert.equal(r.frames, n, k); assert.equal(r.firstSrc, first, k); near(r.firstFrame, ft, 0.001, k); }
});
