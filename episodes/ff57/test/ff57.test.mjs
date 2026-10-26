import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, runsOf, classifyByHash, classifyByPlanes, monotone, modelP, modelLuma, buildOf, CASES, CLIP_FRAMES, FADE_FRAMES, FPS, CB_A, CB_B} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff57-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (n) => ev.runs[n];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const seq = (a, b, msg) => assert.deepEqual(a, b, msg);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const XF = ['off4', 'off3', 'off2', 'off1']; // offsets at or below clip length minus the fade

t('the helpers behave: runsOf groups clips, classifyByHash and classifyByPlanes name a frame, the blend model has the right ends, build detection', () => {
  seq(runsOf([{clip: 'A'}, {clip: 'A'}, {clip: 'mix'}, {clip: 'B'}]), [{clip: 'A', from: 0, to: 1}, {clip: 'mix', from: 2, to: 2}, {clip: 'B', from: 3, to: 3}]);
  seq(classifyByHash(['x', 'q', 'y'], ['x'], ['y']), [{clip: 'A', n: 0}, {clip: 'mix', n: null}, {clip: 'B', n: 0}]);
  seq(classifyByPlanes([{y: 30, cb: CB_A, cr: 128, flat: true}, {y: 200, cb: CB_B, cr: 128, flat: true}, {y: 100, cb: 128, cr: 128, flat: true}, {y: 30, cb: CB_A, cr: 128, flat: false}]),
    [{clip: 'A', n: 14}, {clip: 'B', n: 35}, {clip: 'mix', n: null}, {clip: 'mix', n: null}]);
  assert.equal(modelP(100, 4), 0); assert.equal(modelP(125, 4), 1); assert.equal(modelLuma(100, 4), 116); assert.equal(modelLuma(125, 4), 235 - 25);
  assert.ok(monotone([1, 2, 2], 1) && !monotone([2, 1], 1));
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the clips are what the fixture promises: two clips of 125 frames (5 s), every frame flat, A luma 16+n with cb 96, B luma 235-n with cb 160, no frame hash shared', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  const c = ev.clips;
  assert.equal(c.frames, CLIP_FRAMES); assert.equal(c.framesB, CLIP_FRAMES); assert.equal(c.seconds, 5);
  assert.equal(c.allFlat, true); assert.equal(c.lumaRule, true); assert.equal(c.aCb, CB_A); assert.equal(c.bCb, CB_B);
  assert.equal(c.distinctA, CLIP_FRAMES); assert.equal(c.distinctB, CLIP_FRAMES); assert.equal(c.overlap, 0);
  assert.equal(Object.keys(ev.runs).length, Object.keys(CASES).length); assert.equal(Object.keys(ev.runs).length, 6);
});

t('control: concat of A then B has 250 frames (10 s), every frame pure A or pure B, a hard cut at 5.00 s, no blended frame, and each frame is the clip frame it should be', () => {
  const r = R('concat');
  assert.equal(r.framesMd5, 2 * CLIP_FRAMES); assert.equal(r.framesRaw, 2 * CLIP_FRAMES); assert.equal(r.seconds, 10);
  seq(r.runs, [{clip: 'A', from: 0, to: 124}, {clip: 'B', from: 125, to: 249}]); seq(r.runsRaw, r.runs);
  assert.equal(r.nMix, 0); assert.equal(r.nA, 125); assert.equal(r.nB, 125);
  r.byHash.forEach((c, i) => assert.deepEqual(c, {clip: i < 125 ? 'A' : 'B', n: i % 125}, `frame ${i}`));
});

t('the two readers agree: framemd5 against the clip hashes and raw decoded planes in Node name the same clip and the same frame number for every output frame (control on every build, xfade outputs on 6.1.1)', () => {
  seq(R('concat').byHash, R('concat').byPlanes);
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.framesMd5, r.framesRaw, k);
    if (isV6() || k === 'concat') seq(r.byHash, r.byPlanes, k);
    else assert.equal(r.byPlanes.length, r.framesRaw, k);
  }
});

t('known positive: offset 4 (clip A length 5 minus the fade 1) holds clip A until 4.00 s, blends for the next second, and plays clip B from there: 225 frames, 9 s, B starts blended and is pure B from output 5.00 s', () => {
  const r = R('off4');
  near(r.seconds, 9, 1 / FPS); assert.equal(r.framesRaw, 9 * FPS);
  assert.ok(r.nMix >= FADE_FRAMES - 2 && r.nMix <= FADE_FRAMES, 'the blend lasts about the fade: 24 or 25 frames');
  const raw = r.runsRaw; assert.equal(raw[0].clip, 'A'); assert.equal(raw[0].from, 0); assert.equal(raw[1].clip, 'mix'); assert.equal(raw[2].clip, 'B');
  near(raw[1].from / FPS, 4, 0.1); near(raw[1].to / FPS, 5, 0.1); near(raw[2].from / FPS, 5, 0.1);
  assert.equal(r.lastClip, 'B'); assert.equal(r.aLost, 0, 'every frame of clip A reaches the screen, pure or blended');
  if (isV6()) { seq(r.runs, [{clip: 'A', from: 0, to: 100}, {clip: 'mix', from: 101, to: 124}, {clip: 'B', from: 125, to: 224}]); assert.equal(r.firstBn, 25); assert.equal(r.lastN, 124); assert.equal(r.nMix, 24); }
});

t('the blend is a real blend: weight of B (from chroma) rises frame by frame from near 0 to near 1, and each blended frame holds clip A frame i and clip B frame i minus offset: luma within 1.5 of the model, weight within 0.02', () => {
  for (const k of XF) {
    const r = R(k);
    assert.ok(r.blendRises, `${k} weight never falls`); assert.ok(r.blend[0] < 0.1 && r.blend[r.blend.length - 1] > 0.9, k);
    assert.ok(r.modelDevY <= 1.5, `${k} luma off the model by ${r.modelDevY}`); assert.ok(r.modelDevP <= 0.02, `${k} weight off by ${r.modelDevP}`);
  }
});

t('offset 3 cuts clip A early: the blend runs from 3.00 s to 4.00 s, then clip B takes over; the last second of clip A (25 frames) is never shown, and the output is 8 s, not 9', () => {
  const r = R('off3');
  near(r.seconds, 8, 1 / FPS); assert.equal(r.aLost, 25); assert.equal(r.lastClip, 'B');
  near(r.runsRaw[1].from / FPS, 3, 0.1); near(r.runsRaw[2].from / FPS, 4, 0.1); assert.equal(r.runsRaw[2].clip, 'B');
  assert.ok(r.seconds < R('off4').seconds);
  if (isV6()) seq(r.runs, [{clip: 'A', from: 0, to: 75}, {clip: 'mix', from: 76, to: 99}, {clip: 'B', from: 100, to: 199}]);
});

t('offset 1 starts the blend at 1.00 s and loses 3 s of clip A (75 frames): clip A is pure only for the first second, and the output is 6 s', () => {
  const r = R('off1');
  near(r.seconds, 6, 1 / FPS); assert.equal(r.aLost, 3 * FPS); near(r.runsRaw[1].from / FPS, 1, 0.1); near(r.runsRaw[2].from / FPS, 2, 0.1);
  if (isV6()) seq(r.runs, [{clip: 'A', from: 0, to: 25}, {clip: 'mix', from: 26, to: 49}, {clip: 'B', from: 50, to: 149}]);
});

t('the rule across offsets 1 to 4: the output is offset + 5 s long, clip A loses (5 - 1 - offset) s, the blend always lasts the same 24 frames, and the clip B frames shown pure are always frames 25 to 124 (B ends intact)', () => {
  for (const k of XF) {
    const r = R(k), off = CASES[k].offset;
    near(r.seconds, off + 5, 1 / FPS, k); assert.equal(r.aLost, (CLIP_FRAMES - FADE_FRAMES - off * FPS), `${k} A frames lost`);
    assert.ok(r.nMix >= 23 && r.nMix <= 25, k); assert.equal(r.lastClip, 'B', k);
  }
  if (isV6()) for (const k of XF) { const r = R(k); assert.equal(r.nMix, 24, k); assert.equal(r.nB, 100, k); assert.equal(r.firstBn, 25, k); assert.equal(r.lastN, 124, k); }
});

t('offset 5 (equal to the length of clip A): no blend at all, clip A plays through its 125 frames and clip B is almost absent: at most 1 frame of it, and no blended frame (build specific, so exact numbers are for 6.1.1)', () => {
  const r = R('off5');
  assert.equal(r.nMix, 0); assert.equal(r.nA, 125); assert.ok(r.nB <= 1, 'clip B shows at most one frame');
  assert.ok(r.seconds < 5.5); assert.ok(r.seconds < R('off4').seconds);
  if (isV6()) { assert.equal(r.framesRaw, 126); assert.equal(r.nB, 1); assert.equal(r.firstBn, 124); assert.equal(r.lastN, 124); }
});

t('every output starts with clip A frame 0 at 0.00 s, and clip A frames only ever appear in order (frame number never goes back) before the blend', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.deepEqual(r.byPlanes[0], {clip: 'A', n: 0}, k);
    const a = r.byPlanes.filter((c) => c.clip === 'A').map((c) => c.n);
    assert.ok(monotone(a, 1), k); assert.equal(a[a.length - 1] - a[0] + 1, a.length, `${k} no gaps in the clip A frames shown pure`);
  }
});

t('a known negative for the readers: a hard cut is not a blend. concat has zero blended frames by both readers, so the classifier does not call every frame a blend; and xfade has blended frames by both readers, so it does not call every frame pure', () => {
  assert.equal(R('concat').byPlanes.filter((c) => c.clip === 'mix').length, 0); assert.equal(R('concat').byHash.filter((c) => c.clip === 'mix').length, 0);
  for (const k of XF) { assert.ok(R(k).byPlanes.filter((c) => c.clip === 'mix').length >= 20, k); }
  if (isV6()) for (const k of XF) assert.equal(R(k).byHash.filter((c) => c.clip === 'mix').length, 24, k);
});

t('pure clip B starts at offset plus the fade (5.00 s at offset 4), and it moves one second for every second of offset', () => {
  const start = (k) => R(k).runsRaw.find((x) => x.clip === 'B').from / FPS;
  const pairs = XF.map((k) => [CASES[k].offset, start(k)]);
  for (const [off, s] of pairs) near(s, off + FADE_FRAMES / FPS, 0.1, `offset ${off}`);
  assert.ok(monotone(pairs.map((p) => p[1]).reverse(), 1));
});
