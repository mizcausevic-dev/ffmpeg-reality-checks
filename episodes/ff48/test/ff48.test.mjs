import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, pick, rawFrames, framemd5, histogram, modelPicks, entropyOf, meanOf, buildOf, SHOT_A, FRAMES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir, clips;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff48-')); ev = runExperiment(dir); clips = {main: path.join(dir, 'main.mkv')}; } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const C = (k) => ev.cases[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const all3 = (c) => { assert.deepEqual(c.byPts, c.byMd5); assert.deepEqual(c.byPts, c.byRaw); assert.deepEqual(c.byPts, c.model); return c.byPts; };
const CASES = ['default', 'n100', 'n50', 'n25', 'n10', 'n30', 'short', 'fix', 'ramp', 'odd'];

t('the helpers behave: the entropy of a flat frame is 0 and of a 256 level ramp is 8 bits, the mean of a ramp is 127.5, the model picks the middle one of five histograms that are a symmetric spread and the first of five identical ones, a partial last batch still picks; build detection', () => {
  assert.equal(entropyOf(new Uint8Array(64).fill(9)), 0);
  const ramp = Uint8Array.from({length: 256}, (_, i) => i); near(entropyOf(ramp), 8, 1e-12); near(meanOf(ramp), 127.5, 1e-12);
  const mk = (n) => { const b = new Uint8Array(30).fill(0); b.fill(255, 0, n * 3); return histogram(b); };
  assert.deepEqual(modelPicks([mk(1), mk(3), mk(5), mk(7), mk(9)], 5), [2]);
  assert.deepEqual(modelPicks([mk(4), mk(4), mk(4), mk(4), mk(4)], 5), [0]);
  assert.deepEqual(modelPicks([mk(1), mk(3), mk(5), mk(7), mk(9), mk(2), mk(8)], 5), [2, 5 + 0]);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the clip is what the fixture promises: 100 frames that are all different, a dark title card for frames 0 to 54 (mean luma under 45) and a bright scene for 55 to 99 (mean luma over 90), read by Node and by ffmpeg signalstats', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.frames, FRAMES); assert.equal(ev.distinctFrames, FRAMES);
  for (const m of [ev.frameStats.meanNode, ev.frameStats.meanFfmpeg]) {
    assert.equal(m.length, FRAMES);
    assert.ok(Math.max(...m.slice(0, SHOT_A)) < 45 && Math.min(...m.slice(SHOT_A)) > 90, 'the two shots are far apart in brightness');
  }
});

t('two readers of "how much is in the picture": luma entropy from Node (on the decoded gray plane) and from the ffmpeg entropy filter agree on all 100 frames within 0.002 bits, and mean luma from Node and signalstats within 0.05', () => {
  for (let i = 0; i < FRAMES; i++) {
    near(ev.frameStats.entropyNode[i], ev.frameStats.entropyFfmpeg[i], 0.002, `entropy ${i}`);
    near(ev.frameStats.meanNode[i], ev.frameStats.meanFfmpeg[i], 0.05, `mean ${i}`);
  }
  assert.ok(ev.shotEntropy.aMax < ev.shotEntropy.bMin, 'every scene frame has more luma entropy than every title card frame');
});

t('control, known positive: a ramp of 99 frames (a white bar one pixel wider each frame) has the average histogram of frame 49, so thumbnail=n=99 must pick 49: pts, framemd5, raw pixels and the Node model all say 49', () => {
  const c = C('ramp'); assert.equal(c.frames, 99); assert.equal(c.distinct, 99);
  assert.deepEqual(all3(c), [49]);
});

t('control, known positive: 100 identical dark frames except a white frame 37: thumbnail never picks the odd one out; it picks frame 0, the first of the identical frames (ties go to the first), and all four readers agree', () => {
  const c = C('odd'); assert.equal(c.frames, 100); assert.equal(c.distinct, 2);
  const p = all3(c); assert.equal(p.length, 1); assert.notEqual(p[0], 37); assert.equal(p[0], 0);
});

t('the default is n=100, one frame out: thumbnail with no options equals thumbnail=n=100 (same frame by all four readers), and it is frame 54, the last frame of the dark title card, not a frame of the scene', () => {
  assert.deepEqual(all3(C('default')), all3(C('n100'))); assert.equal(all3(C('n100')).length, 1);
  const p = all3(C('default'))[0];
  assert.ok(p < SHOT_A, `picked ${p}`); near(C('default').mean[0], ev.frameStats.meanNode[p], 0.1); assert.ok(C('default').mean[0] < 45);
});

t('it is not the best frame: the picked title card frame has under 15 percent of the highest luma entropy of the clip, and 45 or more frames have more entropy than it (rank 46 or worse of 100), while the highest entropy frame is in the scene', () => {
  const c = C('default');
  assert.ok(ev.best >= SHOT_A, `best frame ${ev.best}`);
  assert.ok(c.entropy[0] < 0.15 * ev.bestEntropy, `${c.entropy[0]} vs ${ev.bestEntropy}`);
  assert.ok(c.rank[0] >= FRAMES - SHOT_A + 1, `rank ${c.rank[0]}`);
});

t('the batch decides: n=50 gives two frames (24, in the title card, and 93, in the scene), n=25 gives four, n=10 gives ten, and n=30 gives four (the last batch is a partial 10): one pick per batch, each inside its own batch, all readers agreeing', () => {
  const rows = [['n50', 50, 2], ['n25', 25, 4], ['n10', 10, 10], ['n30', 30, 4]];
  for (const [k, n, count] of rows) {
    const p = all3(C(k)); assert.equal(p.length, count, k);
    p.forEach((x, i) => assert.ok(x >= i * n && x < Math.min(FRAMES, (i + 1) * n), `${k} pick ${x} outside batch ${i}`));
  }
  const p50 = all3(C('n50')); assert.ok(p50[0] < SHOT_A && p50[1] >= SHOT_A);
});

t('which shot wins follows the batch: with n=25 and n=10 the picks from batches inside the title card are title card frames (mean luma under 45) and the picks from batches inside the scene are scene frames (over 90); with n=100 the dark majority wins', () => {
  for (const k of ['n25', 'n10']) {
    const n = k === 'n25' ? 25 : 10, p = all3(C(k));
    p.forEach((x, i) => {
      const lo = i * n, hi = Math.min(FRAMES, lo + n);
      if (hi <= SHOT_A) assert.ok(ev.frameStats.meanNode[x] < 45, `${k} ${x}`);
      if (lo >= SHOT_A) assert.ok(ev.frameStats.meanNode[x] > 90, `${k} ${x}`);
    });
  }
  assert.ok(SHOT_A > FRAMES / 2, 'the title card is the larger share');
});

t('a short clip still gets a frame: the first 60 frames with the default n=100 give exactly one frame at the end of the stream, inside the 60 frames, the same as the model run on those 60 histograms', () => {
  const p = all3(C('short')); assert.equal(p.length, 1); assert.ok(p[0] >= 0 && p[0] < 60);
});

t('restricting the batch to the scene (trim=start_frame=55 then thumbnail=n=45) picks a scene frame by all four readers: mean luma over 90, entropy within 5 percent of the clip best, but not the highest entropy frame itself', () => {
  const c = C('fix'), p = all3(c)[0];
  assert.ok(p >= SHOT_A && p < FRAMES); assert.ok(c.mean[0] > 90);
  assert.ok(c.entropy[0] >= 0.95 * ev.bestEntropy, `${c.entropy[0]} vs ${ev.bestEntropy}`);
  assert.notEqual(p, ev.best); assert.ok(c.rank[0] > 1);
});

t('reader agreement on all 10 cases: ffmpeg framemd5 pts, framemd5 hash lookup, raw pixels in Node and the reimplemented algorithm give the same list of frames, and every picked frame is a real source frame (index 0 or more)', () => {
  assert.equal(Object.keys(ev.cases).length, CASES.length);
  for (const k of CASES) { const p = all3(C(k)); assert.ok(p.every((x) => x >= 0), k); assert.deepEqual([...p].sort((a, b) => a - b), p, `${k} in order`); }
});

t('the pick is repeatable: running the same thumbnail=n=100 and thumbnail=n=25 again gives the same frames, and the picked frame is byte for byte a source frame (raw pixels equal)', () => {
  const main = clips.main, frames = rawFrames(main);
  const src = {md5: framemd5(main, 'format=rgb24').map((x) => x.md5), rawMd5: frames.map((b) => crypto.createHash('md5').update(b).digest('hex'))};
  assert.deepEqual(pick(main, 'thumbnail=n=100', src).byRaw, C('n100').byRaw);
  assert.deepEqual(pick(main, 'thumbnail=n=25', src).byRaw, C('n25').byRaw);
});
