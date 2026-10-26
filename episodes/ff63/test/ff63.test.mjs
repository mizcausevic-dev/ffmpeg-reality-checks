import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, runsOf, summarize, classifyByHash, classifyByPlanes, baseNumbers, buildOf, CASES, BASE_FRAMES, OV_FRAMES, FPS, CB_BASE, CB_OV} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff63-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (n) => ev.runs[n];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const seq = (a, b, msg) => assert.deepEqual(a, b, msg);
const counter = (r) => r.byPlanes.map((l) => (l.startsWith('O:') ? Number(l.slice(2)) : null));

t('the helpers behave: runsOf groups labels, summarize finds the freeze, classifyByHash and classifyByPlanes name what the rectangle shows, build detection', () => {
  seq(runsOf(['O:0', 'O:1', 'O:1', 'B:2']), [{label: 'O:0', from: 0, to: 0}, {label: 'O:1', from: 1, to: 2}, {label: 'B:2', from: 3, to: 3}]);
  const s = summarize(['O:0', 'O:1', 'O:1', 'O:1', 'B:4']);
  assert.equal(s.lastId, 1); assert.equal(s.lastIdCount, 3); assert.equal(s.firstBaseOnly, 4); assert.equal(s.nOv, 4); assert.equal(s.unknown, 0);
  seq(classifyByHash(['a', 'z', 'b'], ['a'], ['b']), ['O:0', '?', 'B:0']);
  seq(classifyByPlanes([{ovFlat: true, ovCb: CB_OV, ovY: 190}, {ovFlat: true, ovCb: CB_BASE, ovY: 36}, {ovFlat: false, ovCb: CB_OV, ovY: 190}]), ['O:4', 'B:20', '?']);
  seq(baseNumbers([{outFlat: true, outY: 20}, {outFlat: false, outY: 20}]), [4, -1]);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the clips are what the fixture promises: base 125 frames (5 s) with luma 16+n, overlay 50 frames (2 s) with luma 186+m, every frame flat, no frame hash shared', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  const c = ev.clips;
  assert.equal(c.baseFrames, BASE_FRAMES); assert.equal(c.baseSeconds, 5); assert.equal(c.overlayFrames, OV_FRAMES); assert.equal(c.overlaySeconds, 2);
  assert.equal(c.baseRule, true); assert.equal(c.overlayRule, true);
  assert.equal(c.distinctOverlay, OV_FRAMES); assert.equal(c.distinctBase, BASE_FRAMES); assert.equal(c.shared, 0);
  assert.equal(Object.keys(ev.runs).length, Object.keys(CASES).length); assert.equal(Object.keys(ev.runs).length, 10);
});

t('control: with a base the same length as the overlay (2 s) nothing freezes: 50 frames, the counter runs 0 to 49 once each, and the last counter value is on exactly 1 frame', () => {
  const r = R('same');
  assert.equal(r.framesRaw, OV_FRAMES); assert.equal(r.seconds, 2);
  seq(counter(r), Array.from({length: OV_FRAMES}, (_, i) => i));
  assert.equal(r.s.lastId, 49); assert.equal(r.s.lastIdCount, 1); assert.equal(r.s.nBaseOnly, 0);
});

t('known positive: the default (no eof_action) freezes the overlay: 125 frames (5 s), the counter rises to 49 at output 49 and stays on 49 for 76 frames to the end, so 75 frames (3 s) are a frozen overlay, and the base keeps playing under it', () => {
  const r = R('default');
  assert.equal(r.framesRaw, BASE_FRAMES); assert.equal(r.framesProbe, BASE_FRAMES); assert.equal(r.seconds, 5);
  assert.equal(r.s.nOv, BASE_FRAMES); assert.equal(r.s.nBaseOnly, 0); assert.equal(r.s.lastId, 49); assert.equal(r.s.lastIdCount, 76);
  const c = counter(r); seq(c.slice(0, 50), Array.from({length: 50}, (_, i) => i)); assert.ok(c.slice(49).every((m) => m === 49));
  assert.equal(r.s.lastIdCount - 1, 3 * FPS, 'frozen frames beyond its own 2 s');
  assert.equal(r.baseKeepsPlaying, true); assert.equal(r.outsideOk, true); assert.equal(r.baseLast, 124);
});

t('eof_action=repeat is the default: the output with the option spelled out is frame for frame the output with no option', () => {
  seq(R('repeat').byPlanes, R('default').byPlanes); seq(R('repeat').byHash, R('default').byHash);
  assert.equal(R('repeat').framesRaw, R('default').framesRaw);
});

t('eof_action=endall and shortest=1 end the whole output when the overlay ends: 50 frames (2 s), no freeze, but 75 frames (3 s) of the base are cut off, so the output is shorter than the base', () => {
  for (const k of ['endall', 'shortest']) {
    const r = R(k);
    assert.equal(r.framesRaw, OV_FRAMES, k); assert.equal(r.framesProbe, OV_FRAMES, k); assert.equal(r.seconds, 2, k);
    seq(counter(r), Array.from({length: OV_FRAMES}, (_, i) => i)); assert.equal(r.s.lastIdCount, 1, k);
    assert.equal(r.baseLast, 49, k); assert.equal(BASE_FRAMES - r.framesRaw, 3 * FPS, k);
  }
  seq(R('endall').byPlanes, R('shortest').byPlanes);
});

t('eof_action=pass, repeatlast=0 and enable=lt(t,2) all end the freeze and keep the base: 125 frames (5 s), the overlay plays frames 0 to 49 then is gone, the 75 frames after are base only, and the three outputs are identical frame for frame', () => {
  for (const k of ['pass', 'norepeat', 'enable']) {
    const r = R(k);
    assert.equal(r.framesRaw, BASE_FRAMES, k); assert.equal(r.seconds, 5, k);
    assert.equal(r.s.nOv, OV_FRAMES, k); assert.equal(r.s.lastOv, 49, k); assert.equal(r.s.lastId, 49, k); assert.equal(r.s.lastIdCount, 1, k);
    assert.equal(r.s.nBaseOnly, 75, k); assert.equal(r.s.firstBaseOnly, 50, k); assert.equal(r.baseKeepsPlaying, true, k); assert.equal(r.outsideOk, true, k);
  }
  seq(R('pass').byPlanes, R('norepeat').byPlanes); seq(R('pass').byPlanes, R('enable').byPlanes);
  seq(R('pass').byHash, R('norepeat').byHash); seq(R('pass').byHash, R('enable').byHash);
});

t('the two ways to end at 2 s give different lengths: endall is 2 s, pass is 5 s, and only the default has a frozen overlay frame on more than one output frame', () => {
  assert.ok(R('endall').seconds < R('pass').seconds);
  for (const [k, r] of Object.entries(ev.runs)) {
    if (k === 'default' || k === 'repeat') assert.ok(r.s.lastIdCount > 1, k);
    else if (k === 'delayrep') assert.ok(r.s.lastIdCount > 1, k);
    else assert.equal(r.s.lastIdCount, 1, k);
  }
});

t('a late overlay (delayed 1 s with setpts): the base plays alone for the first 25 frames, the overlay starts at output 25, and with the default it still freezes on its last frame to the end of the base: 51 frames on counter 49; with pass it plays 2 s and goes away at output 75', () => {
  const a = R('delayrep'), b = R('delaypass');
  for (const r of [a, b]) { assert.equal(r.framesRaw, BASE_FRAMES); assert.equal(r.s.firstOv, 25); assert.equal(r.s.firstBaseOnly, 0); assert.equal(r.s.firstId, 0); }
  assert.equal(a.s.lastId, 49); assert.equal(a.s.lastIdCount, 51); assert.equal(a.s.lastOv, 124); assert.equal(a.s.nBaseOnly, 25);
  assert.equal(b.s.lastIdCount, 1); assert.equal(b.s.lastOv, 74); assert.equal(b.s.nOv, OV_FRAMES); assert.equal(b.s.nBaseOnly, 75);
});

t('the two readers agree: hashes of the crop against the source clips and raw decoded planes in Node name the same thing for every output frame of every case, with no frame unclassified, and the picture outside the rectangle is always base frame i', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.framesMd5, r.framesRaw, k); assert.equal(r.framesProbe, r.framesRaw, k);
    seq(r.byHash, r.byPlanes, k); assert.equal(r.agree, true, k); assert.equal(r.s.unknown, 0, k); assert.equal(r.outsideOk, true, k);
    assert.ok(Math.abs(r.probeDuration - r.seconds) <= 1 / FPS + 1e-6, `${k} ffprobe duration ${r.probeDuration} vs ${r.seconds}`);
  }
});

t('the readers can see both states: the same classifier calls a frame overlay in the default run and base-only in the pass run, so it does not call everything one thing', () => {
  assert.ok(R('default').byPlanes.every((l) => l.startsWith('O:')));
  assert.ok(R('pass').byPlanes.slice(50).every((l) => l.startsWith('B:')));
  assert.ok(R('pass').byPlanes.slice(0, 50).every((l) => l.startsWith('O:')));
  assert.ok(R('pass').byHash.slice(50).every((l) => l.startsWith('B:')));
});

t('build note: on ffmpeg 6.1.1 the exact numbers above hold; on other builds the relations must still hold (the default repeats, endall is no longer than the overlay, pass is as long as the base)', () => {
  assert.ok(R('default').seconds >= R('endall').seconds);
  assert.ok(R('endall').framesRaw <= OV_FRAMES + 1); assert.ok(R('pass').framesRaw >= BASE_FRAMES - 1);
  assert.ok(R('default').s.lastIdCount > 1); assert.equal(R('pass').s.lastIdCount, 1);
  if (isV6()) assert.equal(R('default').s.lastIdCount, 76);
});
