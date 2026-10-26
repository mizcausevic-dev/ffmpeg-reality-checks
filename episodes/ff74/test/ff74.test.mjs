import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, caseOf, modelIds, beginOf, playsOf, runsOfIds, filterOf, buildOf, summary, TOTAL} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff74-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg and ffprobe are needed'}, fn);
const G = (l, s, st) => caseOf(ev, l, s, st);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);

t('the helpers behave: the model, the play counter and the run splitter, build detection', () => {
  assert.deepEqual(modelIds({loop: 1, size: 3, start: 10}), [...range(0, 11), 9, 10, 11, ...range(12, 49)]);
  assert.equal(modelIds({loop: 2, size: 5, start: 10}).length, 60);
  assert.equal(beginOf({start: 0}), 0); assert.equal(beginOf({start: 1}), 0); assert.equal(beginOf({start: 10}), 9);
  assert.equal(beginOf({start: -1}), null); assert.equal(beginOf({start: 60}), null); assert.equal(beginOf({start: 30, timeFrame: 10}), 10);
  assert.deepEqual(playsOf([0, 1, 2, 1, 2, 3]), [{id: 1, plays: 2}, {id: 2, plays: 2}]);
  assert.deepEqual(runsOfIds([0, 1, 2, 1, 2, 3]), [{from: 0, to: 2, len: 3}, {from: 1, to: 3, len: 3}]);
  assert.equal(filterOf({loop: 2, size: 5, start: 10}), 'loop=loop=2:size=5:start=10');
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the counter clip names itself: 50 flat frames, 50 distinct hashes, id = luma - 16', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.source.frames, 50); assert.equal(ev.source.distinct, 50); assert.equal(ev.source.flat, true); assert.equal(ev.source.rule, true);
});

t('known positive: sequences built without the loop filter, with repeats we chose, are read back exactly by both readers, and told apart by one frame', () => {
  for (const c of Object.values(ev.controls)) { assert.equal(c.readerOk, true, c.name); assert.equal(c.reader2Ok, true, c.name); }
  assert.deepEqual(ev.controls.from9.repeated.map((x) => x.id), [9, 10, 11]);
  assert.deepEqual(ev.controls.from10.repeated.map((x) => x.id), [10, 11, 12]);
  assert.deepEqual(ev.controls.twice.repeated.map((x) => x.plays), [3, 3, 3]);
  assert.deepEqual(ev.controls.plain.repeated, []); assert.equal(ev.controls.plain.ids.length, 50);
});

t('the two readers agree on every one of the 80 grid cases and every extra case, and every output frame is a flat source card', () => {
  assert.equal(ev.grid.length, 80);
  for (const c of [...ev.grid, ...ev.time, ...ev.fromFile]) { assert.equal(c.agree, true, c.command); assert.equal(c.flat, true, c.command); assert.equal(c.exit, 0, c.command); }
  for (const c of ev.grid) assert.ok(c.ids.every((v) => v >= 0 && v < 50), 'no frame outside the source');
});

t('loop=N is N extra plays: the looped frames play N + 1 times in total, and the output has 50 + N * 5 frames (size 5, start 10)', () => {
  for (const n of [0, 1, 2, 3]) {
    const c = G(n, 5, 10);
    assert.equal(c.frames, 50 + n * 5); assert.equal(c.extra, n * 5);
    if (n === 0) assert.equal(c.maxPlays, 1); else { assert.equal(c.maxPlays, n + 1); assert.equal(c.segLen, 5); }
  }
  assert.equal(G(2, 5, 10).maxPlays, 3, 'loop=2 plays the frames three times');
  assert.deepEqual(G(0, 5, 10).ids, range(0, 49), 'loop=0 is a pass-through');
});

t('size is a number of frames, not seconds: the same five frames repeat at 10, 25 and 50 frames per second, and only the duration changes', () => {
  for (const f of ev.fps) { assert.equal(f.frames, 55); assert.deepEqual(f.repeated.map((x) => x.id), [9, 10, 11, 12, 13]); assert.equal(f.agree, true); assert.equal(f.ptsContiguous, true); }
  assert.deepEqual(ev.fps.map((f) => f.seconds), [5.5, 2.2, 1.1]);
  assert.deepEqual(ev.fps.map((f) => f.sourceSeconds), [5, 2, 1]);
  for (const f of ev.fps) { assert.equal(f.probe.frames, 55); assert.ok(Math.abs(f.probe.duration - f.seconds) < 0.01, 'ffprobe says the same duration'); }
});

t('size is a maximum: it never loops frames that the clip does not have, and size=0 (the default) loops nothing', () => {
  assert.equal(G(1, 100, 10).segLen, 41); assert.equal(G(1, 100, 10).frames, 91);
  assert.equal(G(1, 5, 48).segLen, 3); assert.equal(G(1, 5, 48).frames, 53); assert.deepEqual(G(1, 5, 48).repeated.map((x) => x.id), [47, 48, 49]);
  assert.equal(G(1, 25, 10).segLen, 25); assert.equal(G(1, 1, 10).segLen, 1); assert.equal(G(3, 1, 10).maxPlays, 4);
  const z = ev.time.find((c) => c.size === 0); assert.equal(z.frames, 50); assert.deepEqual(z.ids, range(0, 49));
});

t('the measured model fits all 80 grid cases and every edge case: frames from start - 1, size of them or fewer, N extra plays, the rest of the clip after', () => {
  for (const c of ev.grid) assert.equal(c.modelOk, true, c.command);
  for (const c of [...ev.time, ...ev.fromFile]) assert.equal(c.modelOk, true, c.command);
});

t('start counts from 1 on this build: start=0 and start=1 are the same loop, and start=10 repeats frame 9 first (a file source gives the same)', () => {
  if (isV6()) {
    assert.equal(G(1, 5, 0).repeatedFrom, 0); assert.equal(G(1, 5, 1).repeatedFrom, 0); assert.equal(G(1, 5, 2).repeatedFrom, 1);
    assert.equal(G(1, 5, 10).repeatedFrom, 9); assert.deepEqual(G(1, 5, 10).ids, modelIds({loop: 1, size: 5, start: 10}));
    assert.deepEqual(ev.fromFile.map((c) => c.repeatedFrom), [9, 0, 29]);
  } else {
    // on another build only the shape is asserted: the loop is size frames long, contiguous, and starts at start or start - 1
    const c = G(1, 5, 10); assert.equal(c.segLen, 5); assert.ok([9, 10].includes(c.repeatedFrom), `first repeated frame ${c.repeatedFrom}`);
  }
});

t('time is compared with the frame pts, so time=0.4 at 25 fps starts at frame 10 exactly; but start defaults to 0, so time alone changes nothing', () => {
  const by = (cmd) => ev.time.find((c) => c.command.includes(cmd));
  assert.equal(by('size=3:time=0.4').repeatedFrom, 0, 'time alone: the default start=0 wins');
  assert.equal(by('start=30:time=0.4').repeatedFrom, 10);
  assert.equal(by('start=-1:time=0.4').repeatedFrom, 10);
  assert.equal(by('start=-1:time=0"').repeatedFrom, 0);
});

t('start=-1 switches the loop off, and a start past the end of the clip loops nothing: 50 frames out', () => {
  const off = ev.time.find((c) => c.command.endsWith('size=3:start=-1" out.mkv')); assert.equal(off.frames, 50); assert.deepEqual(off.ids, range(0, 49));
  const past = ev.time.find((c) => c.command.includes('start=60')); assert.equal(past.frames, 50); assert.deepEqual(past.ids, range(0, 49));
});

t('timestamps stay contiguous across the loop: the output is frames / fps long, and ffprobe agrees (50 frames 2 s, 60 frames 2.4 s, 100 frames 4 s)', () => {
  assert.deepEqual(ev.probe.map((p) => [p.frames, p.duration]), [[50, 2], [60, 2.4], [100, 4]]);
  for (const c of ev.grid) assert.equal(c.ptsContiguous, true, c.command);
});

t('loop=-1 never ends: guarded by -frames:v 120 it gives exactly 120 frames of the same segment, unguarded it was still running when killed after 3 s', () => {
  const g = ev.infinite.guarded;
  assert.equal(g.frames, 120); assert.equal(g.agree, true);
  assert.deepEqual(g.ids, modelIds({loop: -1, size: 5, start: 10, cap: 120}));
  assert.deepEqual(runsOfIds(g.ids).slice(0, 3).map((r) => [r.from, r.to]), [[0, 13], [9, 13], [9, 13]]);
  assert.equal(ev.infinite.unguarded.killed, true);
  assert.ok(ev.infinite.unguarded.lastFrame > 1000, `the unguarded run reached frame ${ev.infinite.unguarded.lastFrame}, far past the 50 frames of the clip`);
});

t('the summary table the film quotes: frames per N, and the first repeated frame per start', () => {
  const s = summary(ev);
  assert.deepEqual(s.plays.map((p) => p.frames), [50, 55, 60, 65]);
  assert.deepEqual(s.plays.map((p) => p.maxPlays), [1, 2, 3, 4]);
  assert.equal(ev.grid.filter((c) => c.loop === 0).every((c) => c.frames === TOTAL), true);
});
