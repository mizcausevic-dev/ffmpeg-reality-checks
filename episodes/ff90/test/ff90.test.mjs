import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, makeSource, idsOf, contiguous, lumaOf, buildOf, N, FPS, FSZ, SS, SWEEP, CONTAINERS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff90-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const cell = (c, pos, flags, mode = 'enc') => { const r = ev.cells[`${c}|${pos}|${flags}|${mode}`]; assert.ok(r, `${c}|${pos}|${flags}|${mode} missing`); assert.equal(r.status, 0, `${c}|${pos}|${flags}|${mode}: ${r.err}`); return r; };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg ?? ''} ${a} vs ${b}`);
const SSFRAME = Math.round(SS * FPS); // 35

t('the helpers behave: a frame names itself by its luma, contiguity, the raw reader, build detection', () => {
  const src = makeSource(); assert.equal(src.length, FSZ * N);
  assert.deepEqual(idsOf(src), Array.from({length: N}, (_, i) => i)); assert.equal(lumaOf(0), 16); assert.equal(lumaOf(99), 214);
  assert.equal(contiguous([4, 5, 6]), true); assert.equal(contiguous([4, 6]), false); assert.equal(contiguous([]), true);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8'); assert.equal(SSFRAME, 35);
});

t('ffmpeg -version is recorded, and the source clips are what the fixture promises: 100 frames named 0 to 99, one packet each, 0.1 s apart, start_time 0 for mp4, mkv and ts0, 1.4 for mkv14, and above 0 for ts', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  for (const c of CONTAINERS) {
    const k = ev.clip[c]; assert.equal(k.n, N, c); assert.equal(k.ids, N, c); assert.equal(k.firstId, 0, c); assert.equal(k.contiguous, true, c);
    near(k.last - k.first, 9.9, `${c} span`); near(k.shownFirst, k.first, `${c} reader 2 first`);
  }
  for (const c of ['mp4', 'mkv', 'ts0']) near(ev.clip[c].fmtStart, 0, c);
  near(ev.clip.mkv14.fmtStart, 1.4, 'mkv14'); assert.ok(ev.clip.ts.fmtStart > 0, 'the mpegts muxer starts the clock above 0');
  if (isV6()) near(ev.clip.ts.fmtStart, 1.4, 'ts');
});

t('two readers agree: the first packet pts from ffprobe equals the first decoded frame pts from showinfo in every transcoding cell, and the packet count equals the picture count', () => {
  let n = 0;
  for (const [k, r] of Object.entries(ev.cells)) {
    if (r.status !== 0 || r.copy) continue; n++;
    near(r.pkts.first, r.shownFirst, k); assert.equal(r.pkts.n, r.frames.n, k); assert.equal(r.frames.contiguous, true, k); near(r.fmtStart, r.pkts.first, `${k} start_time`);
  }
  assert.ok(n >= 30, `${n} transcoding cells`);
});

t('two readers disagree only where a hidden packet exists: stream copy into mp4 with -ss before -i has 70 packets but 65 pictures and a first packet at -0.5, while ffprobe start_time says 0 (6.1.1 exact, relation on every build)', () => {
  const r = cell('mp4', 'in', 'none', 'copy');
  assert.ok(r.pkts.n > r.frames.n, `${r.pkts.n} packets, ${r.frames.n} pictures`); assert.ok(r.pkts.first < r.shownFirst);
  assert.equal(r.frames.first, SSFRAME); // the first picture is the requested one, not the keyframe the packets start at
  if (isV6()) { assert.equal(r.pkts.n, 70); assert.equal(r.frames.n, 65); near(r.pkts.first, -0.5); near(r.fmtStart, 0); near(r.shownFirst, 0); }
});

t('no -copyts: -ss restarts the clock whatever the position of the option: mp4 and mkv start at 0 and at frame 35, 65 pictures, before and after -i', () => {
  for (const c of ['mp4', 'mkv']) for (const pos of ['in', 'out']) {
    const r = cell(c, pos, 'none'); near(r.fmtStart, 0, `${c} ${pos}`); near(r.pkts.first, 0); assert.equal(r.frames.first, SSFRAME); assert.equal(r.frames.n, N - SSFRAME); assert.equal(r.frames.contiguous, true);
    near(r.shift, -SS, `${c} ${pos} shift`);
  }
  // the ts muxer adds its own 1.4 s start to the restarted clock
  const ts = cell('ts', 'out', 'none'); near(ts.fmtStart, ev.clip.ts.fmtStart); assert.equal(ts.frames.first, SSFRAME);
});

t('-copyts with -ss before -i keeps the source clock: mp4 and mkv start at 3.5 s, the pts of frame 35 in the source (shift 0); a copy cut starts at the keyframe before, 3.0 s, still on the source clock', () => {
  for (const c of ['mp4', 'mkv']) {
    const r = cell(c, 'in', 'copyts'); near(r.fmtStart, SS); near(r.pkts.first, ev.inPts[c][SSFRAME]); near(r.shift, 0); assert.equal(r.frames.first, SSFRAME);
    const k = cell(c, 'in', 'copyts', 'copy'); near(k.fmtStart, 3); near(k.shift, 0); assert.equal(k.frames.first, 30); assert.equal(k.frames.n, N - 30);
  }
  // for a file that starts at 1.4 the kept clock is the file's: mkv14 starts at 4.9 = 1.4 + 3.5
  const m = cell('mkv14', 'in', 'copyts'); near(m.fmtStart, 4.9); near(m.shift, 0); assert.equal(m.frames.first, SSFRAME);
});

t('ts adds 1.4 s on top: -copyts with -ss before -i writes frame 40 at 6.8 s, 1.4 s later than the 5.4 s it had in the source; -start_at_zero gives 5.4 s; the muxer, not the input start, is the cause (ts0 shows the same +1.4)', () => {
  const a = cell('ts', 'in', 'copyts'), b = cell('ts', 'in', 'saz'), z = cell('ts0', 'in', 'copyts');
  assert.ok(a.shift > 0, 'copyts shifts the clock forward'); near(a.shift - b.shift, ev.clip.ts.fmtStart, 'start_at_zero removes exactly the input start_time'); near(z.shift, ev.clip.ts.fmtStart, 'ts0 has no input offset and still shifts');
  if (isV6()) { near(a.fmtStart, 6.8); near(b.fmtStart, 5.4); near(a.shift, 1.4); near(b.shift, 0); assert.equal(a.frames.first, 40); }
  // start_at_zero subtracts the input start_time: mkv14 goes from 4.9 to 3.5
  near(cell('mkv14', 'in', 'copyts').fmtStart - cell('mkv14', 'in', 'saz').fmtStart, 1.4);
});

t('-copyts with -ss after -i measures the cut on the file clock: a file that starts at 1.4 s (ts and mkv14) is cut 14 frames early, 79 pictures from frame 21 instead of 65 from frame 35; a file that starts at 0 is not affected; -start_at_zero brings frame 35 back', () => {
  for (const c of ['ts', 'mkv14']) {
    const off = cell(c, 'out', 'none'), on = cell(c, 'out', 'copyts'), saz = cell(c, 'out', 'saz');
    assert.equal(off.frames.first, SSFRAME); assert.ok(on.frames.first < SSFRAME, `${c}: first ${on.frames.first}`); assert.ok(on.frames.n > off.frames.n);
    assert.equal(SSFRAME - on.frames.first, Math.round(ev.clip[c].fmtStart * FPS), `${c}: frames lost to the start offset`); assert.equal(saz.frames.first, SSFRAME); assert.equal(saz.frames.n, off.frames.n);
  }
  for (const c of ['mp4', 'mkv', 'ts0']) { const on = cell(c, 'out', 'copyts'); assert.equal(on.frames.first, SSFRAME, c); assert.equal(on.frames.n, N - SSFRAME, c); }
  if (isV6()) { const on = cell('ts', 'out', 'copyts'); assert.equal(on.frames.first, 21); assert.equal(on.frames.n, 79); }
});

t('with -ss after -i the output clock is restarted even with -copyts (mp4 and mkv start at 0, shift -3.5), and a copy cut waits for a keyframe: frame 40 for a requested 35', () => {
  for (const c of ['mp4', 'mkv']) { const r = cell(c, 'out', 'copyts'); near(r.fmtStart, 0, c); near(r.shift, -SS, c); const k = cell(c, 'out', 'none', 'copy'); assert.equal(k.frames.first, 40, c); near(k.fmtStart, 0.5, c); }
});

t('where the first picture lands for -ss before -i: mp4 and mkv re-encode exactly (frame = 10 x ss); the ts demuxer lands on a keyframe at or after the request, so 3.2 s starts at frame 40 even when re-encoding; stream copy in mkv starts on the keyframe before, in mp4 an edit list hides the packets before the request', () => {
  const want = SWEEP.map((T) => Math.round(T * FPS));
  for (const c of ['mp4', 'mkv']) assert.deepEqual(ev.sweep[`${c}|enc`].map((x) => x.firstId), want, c);
  assert.deepEqual(ev.sweep['mp4|copy'].map((x) => x.firstId), want);
  for (const c of ['ts', 'ts0']) ev.sweep[`${c}|enc`].forEach((x, i) => assert.ok(x.firstId >= want[i], `${c} ${x.T}`));
  assert.ok(ev.sweep['mkv|copy'].every((x, i) => x.firstId <= want[i] && x.firstId % 10 === 0), 'mkv copy starts on a keyframe at or before the request');
  if (isV6()) {
    assert.deepEqual(ev.sweep['ts|enc'].map((x) => x.firstId), [30, 40, 40, 40, 40, 50]); assert.deepEqual(ev.sweep['ts0|enc'].map((x) => x.firstId), [30, 40, 40, 40, 40, 50]);
    assert.deepEqual(ev.sweep['mkv|copy'].map((x) => x.firstId), [30, 30, 30, 30, 40, 40]);
  }
});

t('known negatives: B frames (negative dts), audio, other containers and real footage are not in this fixture; the clip has a keyframe every 1.0 s and no reordering, so pts equals dts', () => {
  for (const c of CONTAINERS) assert.equal(ev.clip[c].n, N);
  assert.equal(Object.keys(ev.cells).length, 3 * 2 * 3 * 2 + 2 * 2 * 3);
});
