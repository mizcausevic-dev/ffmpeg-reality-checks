import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, modelAdded, buildOf, lumaOf, idOfLuma, TOTAL, AUDIO_SAMPLES, AUDIO_LEVEL} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff75-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg and ffprobe are needed'}, fn);
const V = (id) => ev.video[id];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const BLACK = {y: 16, u: 128, v: 128};

t('the helpers behave: the rounding model, the card numbering, build detection', () => {
  assert.equal(modelAdded(1, 25), 25); assert.equal(modelAdded(0.5, 25), 13); assert.equal(modelAdded(0.02, 25), 1); assert.equal(modelAdded(0.01, 25), 0); assert.equal(modelAdded(0.06, 25), 2);
  assert.equal(lumaOf(0), 60); assert.equal(lumaOf(49), 207); assert.equal(idOfLuma(207), 49);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the counter clip names itself: 50 flat cards, 50 distinct hashes, luma 60 + 3n, and neither black nor white is among them', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.source.frames, 50); assert.equal(ev.source.distinct, 50); assert.equal(ev.source.allFlat, true); assert.equal(ev.source.rule, true);
  assert.equal(ev.source.refBlackDistinct, true); assert.equal(ev.source.refWhiteDistinct, true);
  const h = ev.source.hashes; assert.equal(new Set([h.first, h.last, h.black]).size, 3); for (const x of Object.values(h)) assert.match(x, /^[0-9a-f]{8}$/);
});

t('known positive: 25 black frames and 25 copies of the last card, both built without tpad (concat), are read back as exactly that by both readers', () => {
  const b = ev.controls.blackCat, c = ev.controls.cloneCat;
  for (const x of [b, c]) { assert.equal(x.frames, 75); assert.equal(x.addedCount, 25); assert.equal(x.reader1, true, x.name); assert.equal(x.reader2, true, x.name); }
  assert.deepEqual(b.addedKinds, ['black']); assert.equal(b.tailEqualLast, false, 'black is not the last card');
  assert.deepEqual(c.addedKinds, ['real:49']); assert.equal(c.tailEqualLast, true);
});

t('the two readers agree on every tpad case, the 50 cards are intact and in order, and the timestamps run on without a gap', () => {
  for (const v of Object.values(ev.video)) {
    assert.equal(v.exit, 0, v.vf); assert.equal(v.agree, true, v.vf); assert.equal(v.frames, v.framesMd5, v.vf);
    assert.equal(v.coreIntact, true, v.vf); assert.equal(v.ptsContiguous, true, v.vf);
  }
});

t('the default adds colour, not content: 25 frames of black, luma 16, chroma 128, and the same frame as a plain lavfi black frame', () => {
  const v = V('add1');
  assert.equal(v.frames, 75); assert.equal(v.addedAfter, 25); assert.equal(v.addedBefore, 0);
  assert.equal(v.tailKind, 'black'); assert.deepEqual(v.tailValues, BLACK);
  assert.equal(v.byHash.slice(TOTAL).every((x) => x === 'black'), true, 'reader 2 matched a black frame built by the color source');
  assert.equal(V('stop10add').addedAfter, 10); assert.equal(V('stop10add').tailKind, 'black');
});

t('stop_mode=clone with a length repeats the last card: every added frame has the hash of card 49, so the freeze is real (stop and stop_duration alike)', () => {
  for (const id of ['clone1', 'stop10clone']) {
    const v = V(id); assert.equal(v.tailKind, 'clone', id); assert.equal(v.tailHashEqualsLast, true, id); assert.deepEqual(v.tailValues, {y: lumaOf(49), u: 100, v: 150}, id);
  }
  assert.equal(V('clone1').addedAfter, 25); assert.equal(V('stop10clone').addedAfter, 10);
  assert.deepEqual(V('clone1').ids.slice(TOTAL - 1), Array(26).fill(49), 'card 49 shows 26 times in all, once real and 25 held');
});

t('stop_mode=clone on its own adds nothing: no length, no frames (50 out, identical to the input)', () => {
  const v = V('cloneOnly'); assert.equal(v.frames, 50); assert.equal(v.addedAfter, 0); assert.equal(v.tailKind, 'none'); assert.equal(v.coreIntact, true);
});

t('the colour option only matters in add mode: white and red are painted, and a clone ignores the colour it was given', () => {
  assert.deepEqual(V('white').tailValues, {y: 235, u: 128, v: 128}); assert.equal(V('white').tailKind, 'white');
  assert.deepEqual(V('red').tailValues, {y: 81, u: 90, v: 240}); assert.equal(V('red').tailKind, 'red');
  assert.equal(V('cloneColor').tailKind, 'clone'); assert.equal(V('cloneColor').tailHashEqualsLast, true);
});

t('stop is a number of frames, stop_duration is seconds, and when both are given stop_duration wins: stop=10 with stop_duration=1 adds 25, not 10', () => {
  assert.equal(V('both').addedAfter, 25); assert.equal(V('both').frames, 75);
  assert.equal(V('stop10add').frames, 60);
  for (const f of ev.fps) assert.ok(Math.abs(f.add1 - f.fps) <= 1, `one second at ${f.fps} fps adds ${f.add1}`);
});

t('stop_duration is rounded to a whole number of frames, not floored and not exact: 0.01 s adds nothing, 0.02 s adds one frame, 0.06 s adds two (halves go up on this build)', () => {
  const rows = [['dur0_01', 0.01], ['dur0_02', 0.02], ['dur0_05', 0.05], ['dur0_06', 0.06], ['dur0_1', 0.1], ['dur0_3', 0.3], ['dur0_5', 0.5]];
  for (const [id, sec] of rows) {
    const got = V(id).addedAfter;
    assert.ok(Math.abs(got - sec * 25) <= 0.5 + 1e-9, `${id}: ${got} frames for ${sec * 25} asked`);
    if (isV6()) assert.equal(got, modelAdded(sec, 25), id);
  }
  if (isV6()) { assert.deepEqual(rows.map(([id]) => V(id).addedAfter), [0, 1, 1, 2, 3, 8, 13]); for (const f of ev.fps) { assert.equal(f.add1, modelAdded(1, f.fps)); assert.equal(f.add05, modelAdded(0.5, f.fps)); } }
});

t('the start side mirrors the end: start adds black before the clip, start_mode=clone repeats card 0, start_duration is rounded the same way, and the clip begins later on the clock', () => {
  assert.equal(V('start5add').addedBefore, 5); assert.equal(V('start5add').headKind, 'black'); assert.deepEqual(V('start5add').headValues, BLACK);
  assert.equal(V('start5clone').addedBefore, 5); assert.equal(V('start5clone').headKind, 'clone'); assert.equal(V('start5clone').headHashEqualsFirst, true);
  assert.equal(V('startDur').addedBefore, 5); assert.equal(V('startDur').headKind, 'black');
  assert.equal(V('start5add').firstCorePts, 5, 'card 0 is shown at frame 5');
  const m = V('both35'); assert.equal(m.addedBefore, 3); assert.equal(m.headKind, 'black'); assert.equal(m.addedAfter, 3); assert.equal(m.tailKind, 'clone'); assert.equal(m.frames, 56);
});

t('black is a level that depends on the pixel format: 16/128/128 in yuv420p, 0 in full-range yuvj420p, 0/0/0 in rgb24, and 16 in gray; signalstats agrees', () => {
  const f = ev.formats;
  assert.deepEqual({y: f.yuv420p.added.y, u: f.yuv420p.added.u, v: f.yuv420p.added.v}, BLACK);
  assert.deepEqual(f.yuv420p.statsYminAdded, [16, 16, 16]); assert.deepEqual(f.rgb24.added, {r: 0, g: 0, b: 0, flat: true}); assert.deepEqual(f.rgb24.statsYminAdded, [16, 16, 16]);
  for (const k of Object.keys(f)) { assert.equal(f[k].frames, 53, k); assert.equal(f[k].addedAllSame, true, k); assert.equal(f[k].statsFrames, 53, k); }
  if (isV6()) { assert.equal(f.yuvj420p.added.y, 0); assert.deepEqual(f.yuvj420p.statsYminAdded, [0, 0, 0]); assert.equal(f.gray.added.y, 16); assert.deepEqual(f.gray.statsYminAdded, [16, 16, 16]); }
});

t('stop=-1 with clone never ends: guarded by -frames:v 120 it gives 120 frames, all card 49 after the clip; unguarded it was still running when killed after 3 s', () => {
  assert.equal(ev.infinite.guarded.frames, 120); assert.equal(ev.infinite.guarded.tailAllLast, true);
  assert.equal(ev.infinite.unguarded.killed, true); assert.ok(ev.infinite.unguarded.lastFrame > 1000, `reached frame ${ev.infinite.unguarded.lastFrame}`);
});

t('the audio side: apad adds silence, not a hold. Every added sample is 0 (the clip ended at 16384), in all four spellings, and silencedetect puts the start of the silence at 2 s', () => {
  const a = ev.audio;
  assert.equal(a.none.samples, AUDIO_SAMPLES); assert.equal(a.none.realIntact, true); assert.equal(a.none.silenceStart, null);
  for (const k of ['padDur1', 'padLen8000', 'whole24000', 'wholeDur3']) {
    assert.equal(a[k].samples, 24000, k); assert.equal(a[k].addedSamples, 8000, k); assert.equal(a[k].addedAllZero, true, k); assert.equal(a[k].realIntact, true, k);
    assert.equal(a[k].lastRealLevel, AUDIO_LEVEL, k); assert.equal(a[k].firstAdded, 0, k); assert.equal(a[k].silenceStart, 2, k);
  }
});

t('in a file: tpad alone leaves the video 3 s and the audio 2 s; -shortest throws the freeze away (75 frames become 50); apad on the audio keeps all 3 s', () => {
  const m = ev.mux;
  assert.equal(m.tpadOnly.videoFrames, 75); assert.equal(m.tpadOnly.audioSamples, 16000); assert.equal(m.tpadOnly.formatDuration, 3);
  assert.equal(m.tpadShortest.videoFrames, 50); assert.equal(m.tpadShortest.audioSamples, 16000); assert.equal(m.tpadShortest.formatDuration, 2);
  assert.equal(m.tpadApad.videoFrames, 75); assert.equal(m.tpadApad.audioSamples, 24000); assert.equal(m.tpadApad.formatDuration, 3);
  assert.equal(m.tpadApadShortest.videoFrames, 75); assert.equal(m.tpadApadShortest.audioSamples, 24000);
});
