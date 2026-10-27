import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, makeSource, idsOf, contiguous, lumaOf, buildOf, N, FPS, FSZ, KEYS, REQUESTS, CONTAINERS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff91-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const cell = (k) => { const r = ev.cells[k]; assert.ok(r, `${k} missing`); assert.equal(r.status, 0, `${k}: ${r.err}`); return r; };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg ?? ''} ${a} vs ${b}`);
const ALL = () => Object.keys(ev.cells);
// the cut rule as a model: after a cut, the next target is request x (segments so far + 1); the cut happens on the first keyframe at or after it
const model = (keys, T) => { const cuts = [0]; let target = T; for (const k of keys.slice(1)) { if (k / FPS >= target - 1e-9) { cuts.push(k); target = T * cuts.length; } } return cuts; };
const modelList = (keys, times) => { const cuts = [0]; for (const tm of times) { const k = keys.find((x) => x / FPS >= tm - 1e-9 && x > cuts.at(-1)); if (k !== undefined) cuts.push(k); } return cuts; };

t('the helpers behave: a frame names itself by its luma, contiguity, the model of the cut rule, build detection', () => {
  const src = makeSource(); assert.equal(src.length, FSZ * N);
  assert.deepEqual(idsOf(src), Array.from({length: N}, (_, i) => i)); assert.equal(lumaOf(0), 16); assert.equal(lumaOf(99), 214);
  assert.equal(contiguous([4, 5, 6]), true); assert.equal(contiguous([4, 6]), false);
  assert.deepEqual(model([0, 10, 20, 30, 40, 50, 60, 70, 80, 90], 2), [0, 20, 40, 60, 80]);
  assert.deepEqual(model(KEYS, 2), [0, 21, 46, 79]); assert.deepEqual(modelList(KEYS, [2, 3, 5]), [0, 21, 46, 58]);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the source clips are what the fixture promises: 100 frames, keyframes forced at frames 0, 17, 21, 46, 58 and 79 (irregular) and every 10th frame (regular control)', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.clips.irregular.pkts, N); assert.equal(ev.clips.irregular.ids, N); assert.equal(ev.clips.irregular.contiguous, true);
  assert.deepEqual(ev.clips.irregular.keyFrames, KEYS);
  assert.deepEqual(ev.clips.regular.keyFrames, Array.from({length: 10}, (_, i) => i * 10));
});

t('nothing is lost or repeated, in every cell: the decoded frames of the segments, joined in order by Node, are frames 0 to 99 (the 100 packets are split across the segments with every segment starting on a keyframe)', () => {
  assert.equal(ALL().length, 3 * 2 * 4 + 3);
  for (const k of ALL()) {
    const r = cell(k);
    assert.equal(r.concatOk, true, k); assert.equal(r.total, N, k); assert.equal(r.allKeyStart, true, k);
    assert.equal(r.segs.reduce((a, s) => a + s.pkts, 0), N, `${k} packets`); assert.ok(r.segs.every((s) => s.contiguous && s.pkts === s.n), `${k} packets equal pictures`);
    assert.deepEqual(r.firsts, r.segs.reduce((a, s, i) => (i === 0 ? [0] : [...a, a.at(-1) + r.segs[i - 1].n]), []), `${k} each segment starts where the previous one ended`);
  }
});

t('-segment_time N cuts only on keyframes: with keyframes at 1.7, 2.1, 4.6, 5.8 and 7.9 s every segment starts on one of them, no length is the requested length, and for 2 and 3 s there are fewer segments than the request promised (4 and 3 instead of 5 and 4); 6.1.1 matches the model of the rule exactly', () => {
  for (const c of CONTAINERS) for (const T of REQUESTS) {
    const r = cell(`irregular|${c}|time${T}|r1`);
    assert.ok(r.firsts.every((f) => KEYS.includes(f)), `${c} ${T}: ${r.firsts}`);
    assert.ok(r.nseg <= Math.ceil(N / FPS / T)); assert.ok(r.nseg < Math.ceil(N / FPS / T) || T === 5, `${c} ${T}: ${r.nseg} segments`);
    assert.ok(r.lengths.every((l) => Math.abs(l - T) > 1e-6), `${c} ${T}: ${r.lengths}`);
    if (isV6()) assert.deepEqual(r.firsts, model(KEYS, T), `${c} ${T}`);
  }
  if (isV6()) {
    assert.deepEqual(cell('irregular|mkv|time2|r1').lengths, [2.1, 2.5, 3.3, 2.1]); assert.deepEqual(cell('irregular|mkv|time3|r1').lengths, [4.6, 3.3, 2.1]); assert.deepEqual(cell('irregular|mkv|time5|r1').lengths, [5.8, 4.2]);
  }
});

t('control: with a keyframe every 1.0 s the same command gives the requested lengths: 2 s in 5 segments of 2.0, 5 s in 2 of 5.0, and 3 s in 3.0, 3.0, 3.0 and a last segment of 1.0', () => {
  for (const T of REQUESTS) { const r = cell(`regular|mkv|time${T}|r1`); assert.ok(r.firsts.every((f) => f % (T * FPS) === 0), `${T}: ${r.firsts}`); assert.equal(r.firsts[0], 0); }
  if (isV6()) { assert.deepEqual(cell('regular|mkv|time2|r1').lengths, [2, 2, 2, 2, 2]); assert.deepEqual(cell('regular|mkv|time3|r1').lengths, [3, 3, 3, 1]); assert.deepEqual(cell('regular|mkv|time5|r1').lengths, [5, 5]); }
});

t('-segment_times 2,3,5 cuts at the first keyframe at or after each listed time: 2 gives 2.1, 3 gives 4.6 (not 3.0), 5 gives 5.8, so four segments of 2.1, 2.5, 1.2 and 4.2 s', () => {
  for (const c of CONTAINERS) {
    const r = cell(`irregular|${c}|times|r1`);
    assert.ok(r.firsts.every((f) => KEYS.includes(f)), `${c}: ${r.firsts}`); assert.ok(r.firsts.slice(1).every((f, i) => f / FPS >= [2, 3, 5][i] - 1e-9), `${c}: each cut at or after its time`);
    if (isV6()) { assert.deepEqual(r.firsts, modelList(KEYS, [2, 3, 5]), c); assert.deepEqual(r.lengths, [2.1, 2.5, 1.2, 4.2], c); }
  }
});

t('the muxer\'s own segment list agrees with the files: its start column is the time of the first frame on the source clock (also with -reset_timestamps 1), its end column is an end time, not a length (each end is the next start, the last is 10.0)', () => {
  for (const k of ALL()) {
    const r = cell(k);
    r.listStarts.forEach((v, i) => near(v, r.firsts[i] / FPS, `${k} start ${i}`));
    r.listEnds.forEach((v, i) => near(v, i + 1 < r.nseg ? r.listStarts[i + 1] : N / FPS, `${k} end ${i}`));
  }
});

t('-reset_timestamps 1 restarts the clock of every segment: start_time 0 in mkv and mp4 (the first segment is 0 either way); in ts every segment starts at the same time as the muxer start of the clip (1.4 s on 6.1.1); without it a segment keeps its place on the source clock', () => {
  for (const c of ['mkv', 'mp4']) for (const k of [`irregular|${c}|time2|`, `irregular|${c}|time3|`, `irregular|${c}|times|`]) {
    const on = cell(`${k}r1`), off = cell(`${k}r0`);
    assert.ok(on.starts.every((v) => Math.abs(v) < 1e-6), `${k} reset: ${on.starts}`);
    off.starts.forEach((v, i) => near(v, off.firsts[i] / FPS, `${k} no reset ${i}`));
  }
  for (const k of ['irregular|ts|time2|', 'irregular|ts|time3|', 'irregular|ts|times|']) {
    const on = cell(`${k}r1`), off = cell(`${k}r0`);
    assert.ok(on.starts.every((v) => Math.abs(v - on.starts[0]) < 1e-6), `${k} reset: ${on.starts}`); assert.ok(on.starts[0] > 0, 'the mpegts muxer starts above 0');
    off.starts.forEach((v, i) => near(v, on.starts[0] + off.firsts[i] / FPS, `${k} no reset ${i}`));
    if (isV6()) near(on.starts[0], 1.4);
  }
});

t('joined again: every mkv and mp4 set that was reset joins on the concat demuxer into one continuous clock, 0 to 9.9 s in 99 steps of 0.1; the ts files joined as bytes are continuous without a reset and jump back at every boundary with one (one jump per boundary on 6.1.1)', () => {
  for (const c of ['mkv', 'mp4']) for (const k of ['time2', 'time3', 'time5', 'times']) {
    const j = cell(`irregular|${c}|${k}|r1`).join; assert.equal(j.pkts, N); assert.equal(j.steps, N - 1, `${c} ${k}`); assert.equal(j.backwards, 0); near(j.last, 9.9); assert.equal(j.idsOk, true);
  }
  for (const k of ['time2', 'time3', 'time5', 'times']) {
    const off = cell(`irregular|ts|${k}|r0`), on = cell(`irregular|ts|${k}|r1`);
    assert.equal(off.join.steps, N - 1, k); assert.equal(off.join.backwards, 0, k); assert.ok(on.join.backwards >= 1, `${k}: ${on.join.backwards} jumps back`); assert.ok(on.join.steps < N - 1);
    if (isV6()) assert.equal(on.join.backwards, on.nseg - 1, k);
    assert.equal(on.join.idsOk, true, `${k}: the pictures are all there, in order, only the clock jumps`);
  }
});

t('without a reset, mkv segments hide a trap for the concat demuxer: the format duration of a segment is its end time (2.1, 4.6, 7.9, 10.0), not its length, so the joined clock is stretched to 16.6 s with a gap of 4.7 s while all 100 pictures are still there; mp4 and ts report the length and join continuous (6.1.1 exact)', () => {
  const m = cell('irregular|mkv|time2|r0'), p = cell('irregular|mp4|time2|r0');
  assert.equal(m.join.idsOk, true); assert.equal(m.join.pkts, N); assert.equal(p.join.idsOk, true);
  if (isV6()) {
    assert.deepEqual(m.durs.map((v) => Math.round(v * 10) / 10), [2.1, 4.6, 7.9, 10]); assert.deepEqual(p.durs.map((v) => Math.round(v * 10) / 10), [2.1, 2.5, 3.3, 2.1]);
    near(m.join.last, 16.6); near(m.join.maxGap, 4.7); assert.equal(m.join.steps, 97); assert.equal(p.join.steps, N - 1); near(p.join.last, 9.9);
  }
});

t('known negatives: B frames, audio, a keyframe interval a muxer rounds, live segmenting and the other segment options (segment_frames, segment_atclocktime, segment_time_delta) are not in this fixture; the clip has no reordering, so pts equals dts', () => {
  for (const k of ALL()) assert.ok(cell(k).segs.every((s) => s.keys >= 1));
});
