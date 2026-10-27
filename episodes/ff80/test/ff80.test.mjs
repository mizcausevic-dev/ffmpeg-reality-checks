import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, gifBytes, readGifDelays, framePixels, onScreen, rate, buildOf, GIFS, FRAMES, W, H} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff80-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const G = (k) => ev.gifs[k];
const O = (k, c) => ev.gifs[k].out[c];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const CONST = {const2: 2, const3: 3, const4: 4, const6: 6, const10: 10};
const ms = (delays) => delays.map((d) => d * 10);
const sum = (a) => a.reduce((x, y) => x + y, 0);

t('the helpers behave: the delay reader returns what was written, the frame code is 6 distinct blocks, onScreen sums repeats and reports missing frames, build detection', () => {
  assert.deepEqual(readGifDelays(gifBytes([2, 3, 4, 65535])), [2, 3, 4, 65535]);
  const a = framePixels(0), b = framePixels(63);
  assert.equal(a.length, W * H);
  let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  assert.equal(diff, 6 * 6 * 8); // six blocks of 6 x 8 pixels
  const o = onScreen([0, 0, 1, 3], [0, 0.02, 0.05, 0.07], 0.1);
  assert.deepEqual(o.ms.slice(0, 4), [50, 20, 0, 30]);
  assert.deepEqual(o.missing.slice(0, 3), [2, 4, 5]); // frame 2 never appears, frames 4 to 19 are not in the list at all
  assert.equal(o.shown, 4);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6');
  assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
  assert.equal(rate('100/3').toFixed(3), '33.333');
});

t('reader 1: the delay bytes in every gif are the delays that were asked for, and the gifs hold 20 frames', () => {
  for (const [name, d] of Object.entries(GIFS)) {
    assert.deepEqual(G(name).delaysInFile, d, name);
    assert.equal(G(name).delaysInFile.length, FRAMES);
  }
  assert.equal(G('mix').sumInFile, 100);
  for (const [k, d] of Object.entries(CONST)) assert.equal(G(k).sumInFile, 20 * d);
});

t('known positive: decoded from the gif itself, every constant delay gif shows frame i for exactly delay i (reader 3 agrees with reader 1), all 20 frames in order', () => {
  for (const [k, d] of Object.entries(CONST)) {
    const a = G(k).asGif;
    assert.deepEqual(a.numbers, [...Array(FRAMES).keys()], k);
    assert.deepEqual(a.onScreen, Array(FRAMES).fill(d * 10), k);
    near(a.duration, 20 * d / 100, 1e-6, k);
  }
  assert.deepEqual(G('mix').asGif.onScreen, ms(GIFS.mix));
});

t('reader 2 on the gif: a constant delay d is probed as 100/d frames per second (3 gives 33.333, 6 gives 16.667); the mix probes as r_frame_rate 100 and average 20', () => {
  for (const [k, d] of Object.entries(CONST)) near(rate(G(k).asGif.rFrameRate), 100 / d, 1e-9, k);
  assert.equal(G('mix').asGif.rFrameRate, '100/1');
  assert.equal(G('mix').asGif.avgFrameRate, '20/1');
  near(G('mix').asGif.duration, 1, 1e-6);
});

t('default conversion of a constant delay gif: every frame kept, each on screen for its delay, duration 20 d hundredths, rate 100/d', () => {
  for (const [k, d] of Object.entries(CONST)) {
    const o = O(k, 'default');
    assert.deepEqual(o.numbers, [...Array(FRAMES).keys()], `${k} frames`);
    assert.deepEqual(o.missing, []);
    near(o.duration, 20 * d / 100, 0.002, `${k} duration`);
    for (const x of o.onScreen) near(x, d * 10, 0.6, k);
    if (isV6()) { near(rate(o.rFrameRate), 100 / d, 1e-9, k); assert.equal(o.packets, 20, k); }
  }
});

t('default conversion of the mixed delay gif: all 20 frames shown, each for its own delay (frames 0 to 18 within a millisecond), total about 1.000 s; on 6.x a 100 frame per second file with 100 frames', () => {
  const o = O('mix', 'default');
  assert.deepEqual(o.missing, []);
  for (let i = 0; i < FRAMES - 1; i++) near(o.onScreen[i], GIFS.mix[i] * 10, 1, `frame ${i}`);
  near(o.duration, 1, 0.1);
  if (isV6()) { assert.equal(o.rFrameRate, '100/1'); assert.equal(o.packets, 100); assert.equal(o.duration, 1); assert.equal(o.onScreen[19], 100); }
});

t('passthrough and vfr keep one packet per source frame with the delays as timestamps; the last delay is not stored: on 6.x the mix mp4 lasts 0.91 s and the last frame is on screen for 10 ms, not 100', () => {
  for (const c of ['passthrough', 'vfr']) {
    const o = O('mix', c);
    assert.equal(o.packets, 20, c);
    assert.deepEqual(o.missing, []);
    for (let i = 0; i < FRAMES - 1; i++) near(o.onScreen[i], GIFS.mix[i] * 10, 1, `${c} frame ${i}`);
    assert.ok(o.onScreen[19] <= 100.5, `${c}: the last frame is never longer than its delay`);
    assert.ok(o.duration <= 1.0001, c);
    if (isV6()) { assert.equal(o.duration, 0.91); assert.equal(o.onScreen[19], 10); assert.equal(o.avgFrameRate, '2000/91'); }
  }
  assert.equal(O('const3', 'passthrough').duration, 0.6); // constant delays: duration exact
});

t('the old spelling -vsync passthrough gives the same pictures and timestamps as -fps_mode passthrough where the build still accepts it', () => {
  const v = O('mix', 'vsyncPass');
  if (v.failed) { assert.ok(!isV6(), 'on 6.x the old spelling works'); return; }
  const p = O('mix', 'passthrough');
  assert.deepEqual(v.pts, p.pts);
  assert.deepEqual(v.numbers, p.numbers);
  assert.equal(v.duration, p.duration);
});

t('-r 30 on the 3 hundredth gif: no frame dropped, each held 33.3 ms, the clip is 0.667 s instead of 0.6 s (11 percent longer)', () => {
  const o = O('const3', 'r30');
  assert.deepEqual(o.missing, []);
  assert.ok(o.duration > 0.6 * 1.05, `duration ${o.duration}`);
  if (isV6()) { assert.equal(o.packets, 20); near(o.duration, 0.666667, 1e-6); for (const x of o.onScreen) near(x, 33.3, 0.05); }
});

t('-vf fps=30 on the 3 hundredth gif keeps the length and drops frames: on 6.x frames 5 and 15 are never shown', () => {
  const o = O('const3', 'fps30');
  assert.ok(o.missing.length >= 1, 'at least one frame dropped');
  near(o.duration, 0.6, 0.04);
  if (isV6()) { assert.deepEqual(o.missing, [5, 15]); assert.equal(o.packets, 18); }
});

t('-r 30 and fps=30 on the mixed gif: both give 30 frames per second; the delays are lost (2, 3 and 4 hundredths all become 33.3 ms); fps=30 also drops frames 5 and 15 on 6.x', () => {
  for (const c of ['r30', 'fps30']) {
    const o = O('mix', c);
    assert.ok(Math.abs(rate(o.rFrameRate) - 30) < 1e-9, c);
    near(o.duration, 1, 0.04, c);
    assert.notDeepEqual(o.onScreen.map(Math.round), ms(GIFS.mix), c);
  }
  assert.deepEqual(O('mix', 'r30').missing, []);
  if (isV6()) { assert.deepEqual(O('mix', 'fps30').missing, [5, 15]); assert.deepEqual(O('mix', 'r30').onScreen.slice(0, 5), [33.3, 33.3, 33.3, 66.7, 100]); }
});

t('-r 25 on the 10 hundredth gif: 50 frames, each source frame held 80 or 120 ms alternately (judder), duration unchanged', () => {
  const o = O('const10', 'r25');
  near(o.duration, 2, 0.001);
  assert.deepEqual(o.missing, []);
  assert.ok(new Set(o.onScreen).size === 2, `held times ${[...new Set(o.onScreen)]}`);
  if (isV6()) { assert.equal(o.packets, 50); assert.deepEqual([...new Set(o.onScreen)].sort((a, b) => a - b), [80, 120]); }
});

t('delays 0 and 1 hundredth in the file: on 6.x a delay of 0 is read as 10 hundredths (100 ms) and 1 stays 10 ms', () => {
  const l = G('low');
  assert.deepEqual(l.delaysInFile.slice(0, 4), [0, 1, 2, 1]);
  assert.ok(l.asGif.onScreen[2] === 20, 'delay 2 is kept');
  if (isV6()) { assert.deepEqual(l.asGif.onScreen.slice(0, 4), [100, 10, 20, 10]); near(l.asGif.duration, 0.7, 1e-6); }
});

t('the on-screen time of each frame in every conversion adds up to the duration the file reports', () => {
  for (const [name, g] of Object.entries(ev.gifs)) for (const [c, o] of Object.entries(g.out)) {
    if (o.failed) continue;
    near(sum(o.onScreen) / 1000, o.duration, 0.002, `${name} ${c}`);
  }
});
