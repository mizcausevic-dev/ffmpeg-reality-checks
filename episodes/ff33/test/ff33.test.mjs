import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff33-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const C = (k) => ev.controls[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const range = (n) => [...Array(n).keys()];
const loopOf = (n, plays) => Array.from({length: plays}, () => range(n)).flat();
const sum = (a) => a.reduce((x, y) => x + y, 0);
const noAdjacentRepeat = (a) => a.every((v, i) => i === 0 || v !== a[i - 1]);

t('sources: 120 unique frames and 4.0 s of picture in all four clips; the audio ramps are 4.0, 3.97, 3.9 and 4.1 s long, sample exact', () => {
  assert.equal(ev.source.unique, 120);
  for (const [k, sec] of Object.entries(ev.source.audioSeconds)) {
    const r = ev.reads[k];
    assert.equal(r.video.framesDecoded, 120); near(r.video.endPackets, 4, 0.02, k + ' picture');
    near(r.audio.samples, sec * 44100, 1, k + ' samples'); assert.equal(r.audio.runsCount, 1);
    assert.deepEqual(r.byMd5, range(120)); assert.deepEqual(r.byCode, range(120));
  }
});

t('control, equal lengths: -stream_loop 2 gives 3 plays, 360 frames in source order, 12.0 s, 3 x 176400 samples, plays start at 0, 4 and 8 s, with and without -c copy', () => {
  for (const k of ['eq-enc', 'eq-copy']) {
    const r = R(k);
    assert.equal(r.video.framesDecoded, 360, k); assert.deepEqual(r.byMd5, loopOf(120, 3), k);
    assert.equal(r.audio.samples, 529200, k); assert.equal(r.audio.runsCount, 3, k);
    assert.deepEqual(r.audio.runs.map((x) => [x.srcSample, x.len]), [[0, 176400], [0, 176400], [0, 176400]], k);
    near(r.video.endPackets, 12, 0.02, k); near(r.audio.endPackets, 12, 0.02, k); near(r.container, 12, 0.02, k);
    r.video.plays.forEach((p, i) => { near(p.pts, 4 * i, 0.02, k + ' play ' + i); assert.equal(p.firstCode, 0, k); });
    assert.deepEqual(r.video.gaps, [], k); assert.deepEqual(r.audio.gaps, [], k);
    r.sync.offsetMs.forEach((o) => near(o, 0, 5, k + ' sound minus picture'));
  }
});

t('known-positive control: the concat demuxer with the clip three times gives the same 360 frames and the same decoded audio as -stream_loop 2', () => {
  const c = C('concatDemux'), r = R('eq-enc');
  assert.deepEqual(c.byMd5, r.byMd5); assert.equal(c.audio.samples, r.audio.samples);
  assert.deepEqual(c.audio.runs.map((x) => [x.srcSample, x.len]), r.audio.runs.map((x) => [x.srcSample, x.len]));
  near(c.video.endPackets, r.video.endPackets, 0.02);
});

t('known-positive control for the frame readers: a hand-made sequence with frames 0 to 119, then 2 to 119, then 3 to 119 is read as 355 frames missing 0,1 and 0,1,2 by both frame readers', () => {
  const h = C('handmadeGaps');
  assert.equal(h.video.framesDecoded, 355);
  const want = [...range(120), ...range(120).slice(2), ...range(120).slice(3)];
  assert.deepEqual(h.byMd5, want); assert.deepEqual(h.byCode, want);
  assert.deepEqual(h.video.missingAtStart, [0, 2, 3]);
});

t('control by the concat filter: the short clip three times gives 360 frames and 12.0 s of picture, so the 355 frames of the re-encoded loop are a stream_loop effect, not a property of the clip', () => {
  const c = C('concatFilterShort');
  assert.equal(c.video.framesDecoded, 360); assert.deepEqual(c.byMd5, loopOf(120, 3)); near(c.video.endPackets, 12, 0.02);
});

t('-stream_loop -1 -t 25 on the equal clip: exactly 25.0 s, 750 frames, 1102500 samples, 7 plays, the last play cut after 1 s (30 frames, 44100 samples)', () => {
  const r = R('eq-t25');
  assert.equal(r.video.framesDecoded, 750); assert.equal(r.audio.samples, 1102500);
  near(r.video.endPackets, 25, 0.05); near(r.audio.endPackets, 25, 0.05); near(r.container, 25, 0.05);
  assert.equal(r.video.plays.length, 7); assert.deepEqual(r.byMd5, [...loopOf(120, 6), ...range(30)]);
  assert.equal(r.audio.runsCount, 7); assert.equal(r.audio.runs[6].len, 44100);
});

t('re-encode, audio 3.9 s and picture 4.0 s: 3 plays last 11.83 s (not 12), only 355 of 360 frames, the second and third play lose their first 2 and 3 frames, audio is 3 x 3.9 = 11.7 s', () => {
  const r = R('short-enc');
  assert.equal(r.video.framesDecoded, 355); assert.deepEqual(r.video.missingAtStart, [0, 2, 3]);
  near(r.video.endPackets, 11.833, 0.05); near(r.video.endDecoded, 11.833, 0.05); near(r.container, 11.833, 0.05);
  assert.equal(r.audio.samples, 3 * 171990); near(r.audio.endPackets, 11.7, 0.02);
  assert.deepEqual(r.audio.runs.map((x) => x.len), [171990, 171990, 171990]);
  assert.deepEqual(r.byMd5, C('handmadeGaps').byMd5, 'same frames as the hand-made control');
  assert.ok(noAdjacentRepeat(r.byMd5), 'no frame is shown twice at a seam');
});

t('re-encode, audio 3.97 s (30 ms short): the loop already loses a frame (fewer than 360, at least 357) and ends before 12 s', () => {
  const r = R('near-enc');
  assert.ok(r.video.framesDecoded < 360 && r.video.framesDecoded >= 357, `frames ${r.video.framesDecoded}`);
  assert.ok(r.video.endPackets < 12 - 0.02); near(r.audio.samples, 3 * 175077, 3);
});

t('re-encode, audio 4.1 s and picture 4.0 s: the loop is as long as the audio (12.3 s), all 360 frames survive, but the picture has a hole of about 0.13 s at each of the 2 seams (the last frame stays on screen)', () => {
  const r = R('long-enc');
  assert.equal(r.video.framesDecoded, 360); assert.deepEqual(r.byMd5, loopOf(120, 3));
  near(r.container, 12.3, 0.05); near(r.audio.endPackets, 12.3, 0.05); assert.equal(r.audio.samples, 3 * 180810);
  near(r.video.endPackets, 12.2, 0.05);
  assert.equal(r.video.gaps.length, 2); r.video.gaps.forEach((g) => near(g.gap, 0.133, 0.03, 'seam hole'));
  r.video.plays.forEach((p, i) => near(p.pts, 4.1 * i, 0.05));
});

t('-c copy, audio 3.9 s: the picture loops at 4.0 s (360 frames, 12.0 s) while the sound is 3 x 3.9 s with a 0.1 s hole at each seam, so the timeline is 11.9 s and only 11.7 s of samples', () => {
  const r = R('short-copy');
  assert.equal(r.video.framesDecoded, 360); assert.deepEqual(r.byMd5, loopOf(120, 3)); near(r.video.endPackets, 12, 0.02);
  assert.equal(r.audio.samples, 3 * 171990); near(r.audio.endDecoded, 11.7, 0.01); near(r.audio.endPackets, 11.9, 0.02);
  assert.equal(r.audio.gaps.length, 2); r.audio.gaps.forEach((g) => near(g.gap, 0.1, 0.01, 'sound hole'));
});

t('-c copy, audio 4.1 s: all 360 frames, but picture 12.17 s and sound timeline 12.28 s, neither is 12.0 or the 12.3 s of samples; the picture has holes of about 0.12 s', () => {
  const r = R('long-copy');
  assert.equal(r.video.framesDecoded, 360); assert.equal(r.audio.samples, 3 * 180810);
  assert.ok(r.video.endPackets > 12.1 && r.video.endPackets < 12.25, `picture ${r.video.endPackets}`);
  assert.ok(r.audio.endPackets > 12.2 && r.audio.endPackets < 12.32, `sound ${r.audio.endPackets}`);
  assert.equal(r.video.gaps.length, 2);
});

t('the picture and the sound do not drift apart: sound minus picture at every play start stays within 40 ms in every loop, and is the same at the 2nd to 7th play of the 25 s run', () => {
  for (const [k, r] of Object.entries(ev.runs)) r.sync.offsetMs.forEach((o, i) => assert.ok(Math.abs(o) <= 40, `${k} play ${i}: ${o} ms`));
  const o = R('short-t25').sync.offsetMs.slice(1);
  assert.equal(o.length, 6); assert.ok(Math.max(...o) - Math.min(...o) <= 5, `spread ${o}`);
});

t('-stream_loop -1 -t 25 with audio 3.9 s: still exactly 25.0 s and 750 frames, but every play after the first starts at frame 2 or 3, so 6 seams each cost the head of the clip', () => {
  const r = R('short-t25');
  assert.equal(r.video.framesDecoded, 750); assert.equal(r.audio.samples, 1102500);
  near(r.video.endPackets, 25, 0.05); near(r.container, 25, 0.05);
  assert.equal(r.video.plays.length, 7); assert.deepEqual(r.video.missingAtStart, [0, 2, 3, 3, 3, 3, 3]);
});

t('timestamps: video and audio packet pts are strictly increasing in every looped output, and no frame is shown twice at a seam', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.ok(r.video.ptsMonotonic, k + ' video pts'); assert.ok(r.audio.ptsMonotonic, k + ' audio pts');
    assert.ok(noAdjacentRepeat(r.byMd5), k + ' duplicated frame'); assert.equal(r.video.firstPts, 0, k);
  }
});

t('the two readers agree on every output: frame md5 and decoded frame code name the same frames, packet pts and decoded pts agree within 20 ms, sound timeline end equals decoded samples plus the holes within 20 ms', () => {
  for (const [k, r] of [...Object.entries(ev.reads), ...Object.entries(ev.runs), ...Object.entries(ev.controls)]) {
    assert.deepEqual(r.byCode, r.byMd5, k);
    assert.equal(r.video.packets, r.video.framesDecoded, k); assert.ok(r.video.ptsDecodedAgree, k + ' pts');
    near(r.video.endPackets, r.video.endDecoded, 0.02, k + ' picture end');
    if (r.audio && k !== 'concatFilterShort') near(r.audio.endPackets, r.audio.samples / 44100 + sum(r.audio.gaps.map((g) => g.gap)), 0.02, k + ' sound end');
  }
});
