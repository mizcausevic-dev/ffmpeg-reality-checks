import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff35-')); ev = runExperiment(dir); } });
after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const nearAll = (a, b, tol, msg) => { assert.equal(a.length, b.length, msg); a.forEach((x, i) => near(x, b[i], tol, `${msg} #${i}`)); };
const EXACT = ['gop50_t3', 'gop50_t5', 'gop50_t1', 'forced', 'copy', 'ctrl'];   // every case except split_by_time

t('source: 500 frames, 20 s at 25 fps, a keyframe every 2 s (0, 2, ... 18 s) read by ffprobe', () => {
  assert.equal(ev.source.frames, 500);
  assert.deepEqual(ev.source.keyframes, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
});

t('asked -hls_time 3 on a 2 s GOP: the playlist says 4 2 4 2 4 2 2, so no segment is 3 s, the longest is 4 s and TARGETDURATION is 4', () => {
  const r = R('gop50_t3');
  assert.equal(r.segments, 7);
  nearAll(r.extinf, [4, 2, 4, 2, 4, 2, 2], 0.001, 'EXTINF');
  assert.equal(r.extinf.filter((x) => Math.abs(x - 3) < 0.5).length, 0, 'no segment is near 3 s');
  assert.equal(r.target, 4);
  assert.ok(r.ended);
});

t('the same lengths measured on the .ts files: ffprobe packets and decoded frame timestamps agree with the playlist', () => {
  for (const k of EXACT) {
    const r = R(k);
    nearAll(r.packetDur, r.extinf, 0.05, `${k} packets vs EXTINF`);
    nearAll(r.decodedDur, r.extinf, 0.05, `${k} decoded vs EXTINF`);
    assert.equal(r.segments, r.files.length, k);
  }
});

t('no frame is lost: the segments hold 500 packets and decode to 500 frames, and the EXTINF values add up to 20 s, in every case', () => {
  for (const k of EXACT) {
    assert.equal(R(k).packetsTotal, 500, k); assert.equal(R(k).decodedTotal, 500, k);
    near(R(k).extinfTotal, 20, 0.1, `${k} EXTINF total`);
  }
  assert.equal(R('split').packetsTotal, 500);
});

t('the average is right but no segment is: 20 s in 7 segments is 2.86 s each on average, while the segments are 4 and 2', () => {
  const r = R('gop50_t3');
  near(r.extinfTotal / r.segments, 2.857, 0.01);
  assert.equal(r.packetsPer.join(), '100,50,100,50,100,50,50');
});

t('the cuts land on source keyframes only, and the rule "first keyframe after the last cut and at or after n times the ask" predicts every cut for asks of 3, 5 and 1', () => {
  for (const k of ['gop50_t3', 'gop50_t5', 'gop50_t1', 'copy']) {
    const r = R(k);
    for (const c of r.cuts) assert.ok(ev.source.keyframes.includes(c), `${k} cut ${c} is a keyframe`);
    assert.deepEqual(r.cuts, r.predicted, k);
  }
  assert.deepEqual(R('gop50_t3').cuts, [0, 4, 6, 10, 12, 16, 18]);
});

t('asked 5 gives 6 4 6 4 (TARGETDURATION 6); asked 1 gives ten segments of 2 s: a segment can be twice the ask or longer than it', () => {
  nearAll(R('gop50_t5').extinf, [6, 4, 6, 4], 0.001, 't5'); assert.equal(R('gop50_t5').target, 6);
  nearAll(R('gop50_t1').extinf, Array(10).fill(2), 0.001, 't1'); assert.equal(R('gop50_t1').target, 2);
});

t('-c copy inherits the source keyframes: the same 4 2 4 2 4 2 2 as the re-encode, the same cuts, the same packet counts', () => {
  assert.deepEqual(R('copy').extinf, R('gop50_t3').extinf);
  assert.deepEqual(R('copy').cuts, R('gop50_t3').cuts);
  assert.deepEqual(R('copy').packetsPer, R('gop50_t3').packetsPer);
});

t('-force_key_frames "expr:gte(t,n_forced*3)" makes the segments 3 3 3 3 3 3 2, each one starts on a keyframe, TARGETDURATION is 3', () => {
  const r = R('forced');
  nearAll(r.extinf, [3, 3, 3, 3, 3, 3, 2], 0.001, 'EXTINF'); nearAll(r.packetDur, [3, 3, 3, 3, 3, 3, 2], 0.05, 'packets');
  assert.deepEqual(r.cuts, [0, 3, 6, 9, 12, 15, 18]);
  assert.ok(r.keyStart.every(Boolean)); assert.equal(r.target, 3);
});

t('control (known positive): a GOP of 75 frames, equal to the ask in frames, gives exact 3 s segments, so the readers can tell exact from not exact', () => {
  const r = R('ctrl');
  nearAll(r.extinf, [3, 3, 3, 3, 3, 3, 2], 0.001, 'EXTINF'); nearAll(r.packetDur, [3, 3, 3, 3, 3, 3, 2], 0.05, 'packets');
  assert.deepEqual(r.cuts, r.predicted);
  assert.notDeepEqual(R('gop50_t3').extinf, r.extinf);
});

t('every segment of the keyframe-cut cases starts with a keyframe', () => {
  for (const k of EXACT) assert.ok(R(k).keyStart.every(Boolean), k);
});

// split_by_time: build-dependent muxer behavior. Asserted loosely: check these first if a different ffmpeg build disagrees.
t('hls_flags split_by_time (loose): segments come out near 3 s, some start off a keyframe, and the playlist EXTINF differs from the ffprobe packet length for at least one segment', () => {
  const r = R('split');
  assert.equal(r.segments, 7);
  for (const x of r.extinf.slice(0, 6)) near(x, 3, 0.2, 'EXTINF near 3');
  assert.ok(r.keyStart.some((x) => !x), 'at least one segment starts off a keyframe');
  assert.ok(r.decodedTotal < r.packetsTotal, 'a segment decoded alone loses frames');
  assert.ok(r.extinf.some((x, i) => Math.abs(x - r.packetDur[i]) > 0.02), 'playlist and ffprobe disagree on at least one segment');
});

// The number shown in the video. Separate from the loose test above so a failure on another build points straight at it.
t('hls_flags split_by_time (the number in the video): 3 of the 7 segments start off a keyframe on ffmpeg 6.1.1', () => {
  assert.equal(R('split').keyStart.filter((x) => !x).length, 3);
});
