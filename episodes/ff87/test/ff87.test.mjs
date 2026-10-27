import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, boxes, bare, buildOf, countBlack, SRC, GEO, ERR, LENS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff87-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg or ffprobe not available'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const G = (k) => ev.geo[k], L = (k) => ev.len[k];
const posix = process.platform !== 'win32';
const sameBox = (a, b) => a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

t('the helpers behave: boxes finds connected bright pixels sorted top then left, bare strips the filter prefix of an error line, countBlack counts pad pixels, build detection', () => {
  const w = 8, h = 4, buf = new Uint8Array(w * h).fill(100);
  for (const [x, y] of [[1, 1], [2, 1], [1, 2], [2, 2], [6, 0]]) buf[y * w + x] = 235;
  assert.deepEqual(boxes(buf, w, h), [{x: 6, y: 0, w: 1, h: 1, n: 1}, {x: 1, y: 1, w: 2, h: 2, n: 4}]);
  assert.deepEqual(boxes(buf, w, h, 240), []);
  assert.equal(bare('[Parsed_vstack_0 @ 0x55b1f287aac0] Input 1 width 160 does not match input 0 width 320.'), 'Input 1 width 160 does not match input 0 width 320.');
  assert.equal(countBlack(Uint8Array.from([16, 17, 18, 100]), 4, 1), 2);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded and the stimulus is what the fixture promises: A 320 x 240, B 160 x 90, C 320 x 90, D 160 x 240, each with one 40 x 40 white marker (Y 235) on a flat picture', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.deepEqual(Object.fromEntries(Object.entries(SRC).map(([k, v]) => [k, [v.w, v.h]])), {A: [320, 240], B: [160, 90], C: [320, 90], D: [160, 240]});
  assert.deepEqual(Object.keys(ev.err).sort(), [...Object.keys(ERR), 'v_s2r_main'].sort());
  assert.deepEqual(Object.keys(ev.geo), Object.keys(GEO)); assert.deepEqual(Object.keys(ev.len), Object.keys(LENS));
});

t('control: stacking inputs whose sizes already match works: A over C (same width, heights 240 and 90) is 320 x 330 and A beside D (same height, widths 320 and 160) is 480 x 240, both markers where the stacking puts them, in both readers', () => {
  const v = G('v_ok'), h = G('h_ok');
  assert.equal(v.status, 0); assert.equal(h.status, 0);
  assert.deepEqual([v.probe.w, v.probe.h, h.probe.w, h.probe.h], [320, 330, 480, 240]);
  assert.equal(v.boxes.length, 2); assert.equal(h.boxes.length, 2);
  assert.ok(sameBox(v.boxes[0], {x: 140, y: 100, w: 40, h: 40})); assert.ok(sameBox(h.boxes[0], {x: 140, y: 100, w: 40, h: 40}));
  assert.ok(sameBox(v.second, {x: 140, y: 240 + 25, w: 40, h: 40})); assert.ok(sameBox(h.second, {x: 320 + 60, y: 100, w: 40, h: 40}));
  assert.ok(sameBox(v.crop, v.second) && sameBox(h.crop, h.second));
});

t('vstack with inputs of width 320 and 160 fails: a non zero exit status, no output file, and the line "Input 1 width 160 does not match input 0 width 320." (exact text and status 234 on 6.1.1; on every build the status is not 0 and the line names both widths); the null run says the same', () => {
  const e = ev.err.v_w;
  assert.notEqual(e.status, 0); assert.notEqual(e.status2, 0); assert.equal(e.outputExists, false);
  assert.ok(e.line && /width/.test(e.line) && /160/.test(e.line) && /320/.test(e.line), String(e.line));
  assert.equal(e.line2, e.line);
  if (isV6()) { assert.equal(e.line, 'Input 1 width 160 does not match input 0 width 320.'); if (posix) assert.equal(e.status, 234); }
});

t('hstack with heights 240 and 90 fails the same way, on the height: "Input 1 height 90 does not match input 0 height 240." (6.1.1); a vstack of A and B in the other order names the widths the other way round', () => {
  const e = ev.err.h_h, f = ev.err.v_h;
  for (const x of [e, f]) { assert.notEqual(x.status, 0); assert.equal(x.outputExists, false); assert.equal(x.line2, x.line); }
  assert.ok(e.line && /height/.test(e.line) && /90/.test(e.line) && /240/.test(e.line), String(e.line));
  assert.ok(f.line && /width/.test(f.line) && /160/.test(f.line) && /320/.test(f.line), String(f.line));
  if (isV6()) { assert.equal(e.line, 'Input 1 height 90 does not match input 0 height 240.'); assert.equal(f.line, 'Input 1 width 320 does not match input 0 width 160.'); if (posix) assert.equal(e.status, 234); }
});

t('the check is on the width for vstack and on the height for hstack only: the other side may differ (A over C has heights 240 and 90, A beside D has widths 320 and 160) and it works, so a failure is never about the sum', () => {
  assert.equal(G('v_ok').status, 0); assert.equal(G('h_ok').status, 0);
  assert.notEqual(ev.err.v_w.status, 0); assert.notEqual(ev.err.h_h.status, 0);
});

t('fix 1, scale=320:-2 on B: 160 x 90 becomes 320 x 180 and the stack is 320 x 420; the marker stays a square, twice as big (80 x 80), and sits under the A marker column', () => {
  const g = G('v_scale');
  assert.equal(g.status, 0);
  assert.deepEqual([g.probe.w, g.probe.h], [320, 420]);
  assert.equal(g.second.w, g.second.h); assert.ok(Math.abs(g.second.w - 80) <= 1, String(g.second.w)); assert.ok(g.second.y >= 240);
  if (isV6()) assert.ok(sameBox(g.second, {x: 120, y: 290, w: 80, h: 80}));
  assert.ok(sameBox(g.crop, g.second));
});

t('fix 2, scale2ref (6.1.1 spelling: the reference is the second input, iw is the reference width, mdar the aspect of the input being scaled) gives the same frames as scale=320:-2, md5 for md5; the trap is w=main_w, where main is the input being scaled, which keeps 160 and fails with the same width error as no fix at all', () => {
  const a = G('v_scale'), b = G('v_scale2ref'), trap = ev.err.v_s2r_main;
  if (isV6()) {
    assert.equal(b.status, 0); assert.deepEqual(b.md5Node, a.md5Node); assert.deepEqual([b.probe.w, b.probe.h], [320, 420]);
    assert.equal(trap.line, 'Input 1 width 160 does not match input 0 width 320.'); assert.notEqual(trap.status, 0);
  } else if (b.status === 0) {
    assert.equal(b.probe.w, 320);   // a newer build may spell scale2ref differently or not have it; if it runs, the width must be that of A
  }
});

t('fix 3, scale=320:240 on B stretches it to the shape of A: stack 320 x 480, and the marker is no longer a square: about 80 wide and 106 tall (the aspect changed by 4:3); this is the known positive for the box readers', () => {
  const g = G('v_stretch');
  assert.equal(g.status, 0); assert.deepEqual([g.probe.w, g.probe.h], [320, 480]);
  assert.ok(Math.abs(g.second.w - 80) <= 1); assert.ok(Math.abs(g.second.h - 106.7) <= 1.5, String(g.second.h));
  assert.ok(g.second.h / g.second.w > 1.25 && g.second.h / g.second.w < 1.4);
  assert.ok(sameBox(g.crop, g.second));
});

t('fix 4, pad=320:90:80:0 on B: no scaling, B sits in the middle of a 320 x 90 black strip: stack 320 x 330, the marker keeps 40 x 40 and lines up with the A marker (x 140), and 160 x 90 = 14400 pixels are pad black', () => {
  const g = G('v_pad');
  assert.equal(g.status, 0); assert.deepEqual([g.probe.w, g.probe.h], [320, 330]);
  assert.ok(sameBox(g.second, {x: 140, y: 265, w: 40, h: 40})); assert.equal(g.black, 14400); assert.ok(sameBox(g.crop, g.second));
  assert.equal(g.second.x, g.boxes[0].x);
});

t('fix 5, scale decrease then pad into the same 320 x 240 cell: B is 320 x 180 inside a 320 x 240 cell with 30 black rows above and below (19200 pad pixels); the stack is 320 x 480, the marker 80 x 80 at y 320', () => {
  const g = G('v_box');
  assert.equal(g.status, 0); assert.deepEqual([g.probe.w, g.probe.h], [320, 480]);
  assert.equal(g.black, 19200); assert.equal(g.second.w, g.second.h); assert.ok(Math.abs(g.second.w - 80) <= 1);
  if (isV6()) assert.ok(sameBox(g.second, {x: 120, y: 320, w: 80, h: 80}));
  assert.ok(sameBox(g.crop, g.second));
});

t('hstack of A and B needs equal heights: scale=-2:240 on B makes it 426 x 240, the stack is 746 x 240 and the marker about 106 x 106 (square again, 2.67 times as big)', () => {
  const g = G('h_scale');
  assert.equal(g.status, 0); assert.equal(g.probe.h, 240); assert.ok(g.probe.w >= 745 && g.probe.w <= 747, String(g.probe.w));
  assert.equal(g.second.w, g.second.h); assert.ok(Math.abs(g.second.w - 106.7) <= 1.5); assert.ok(sameBox(g.crop, g.second));
  if (isV6()) assert.equal(g.probe.w, 746);
});

t('reader agreement: for every geometry and length run the decoded bytes are frames x width x height x 1.5 with the frame count ffprobe gives, the md5 of every decoded frame in Node equals ffmpeg framemd5, and the box ffmpeg cropdetect finds for B equals the one Node finds', () => {
  let n = 0;
  for (const g of [...Object.values(ev.geo), ...Object.values(ev.len)]) {
    if (g.status !== 0) continue;
    n++;
    assert.equal(g.bytes, g.probe.frames * g.probe.w * g.probe.h * 1.5, g.say);
    assert.equal(g.nodeFrames, g.probe.frames, g.say);
    assert.deepEqual(g.md5Node, g.md5Ffmpeg, g.say);
  }
  for (const g of Object.values(ev.geo)) if (g.status === 0) assert.ok(sameBox(g.crop, g.second), g.say);
  assert.ok(n >= 12);
});

t('lengths: with a 2 s and a 3 s input the default stack runs 75 frames, 3 s: the shorter input is held on its last frame (luma 114) for the extra 25 frames', () => {
  const d = L('v_default'), h = L('h_default');
  for (const x of [d, h]) { assert.equal(x.status, 0); assert.equal(x.probe.frames, 75); assert.ok(Math.abs(x.probe.duration - 3) < 0.05); }
  assert.deepEqual(d.lumaA.slice(0, 3), [16, 18, 20]); assert.equal(d.lumaA[49], 114);
  assert.ok(d.lumaA.slice(49).every((v) => v === 114), 'A is held on frame 49'); assert.equal(d.lumaB[74], 235 - 2 * 74);
  assert.ok(h.lumaA.slice(49).every((v) => v === 114));
});

t('shortest=1 ends the stack with the shortest input: 50 frames, 2 s, the same first 50 frames as the default, for vstack and hstack and in either input order; the command line option -shortest changes nothing for one video output: 75 frames, the same bytes as the default', () => {
  const d = L('v_default'), s = L('v_shortest'), w = L('v_swapped'), c = L('v_cli'), hs = L('h_shortest'), hd = L('h_default');
  for (const x of [s, w, hs]) { assert.equal(x.status, 0); assert.equal(x.probe.frames, 50); assert.ok(Math.abs(x.probe.duration - 2) < 0.05); }
  assert.deepEqual(s.md5Node, d.md5Node.slice(0, 50)); assert.deepEqual(hs.md5Node, hd.md5Node.slice(0, 50));
  assert.equal(w.lumaA.length, 50); assert.equal(w.lumaA[49], 114); assert.equal(w.lumaB[49], 235 - 2 * 49);
  assert.equal(c.status, 0); assert.equal(c.probe.frames, 75); assert.deepEqual(c.md5Node, d.md5Node);
});
