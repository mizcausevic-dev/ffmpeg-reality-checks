import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, lumaOfFrames, parseStats, buildOf, S} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff71-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const B = (b) => ev.bright[b];

t('the Node reader and the signalstats parser work on data we write ourselves', () => {
  const fsz = S * S * 3 / 2; const buf = Buffer.alloc(fsz * 3);
  buf[0] = 7; buf[fsz] = 200; buf[2 * fsz] = 255; buf[fsz + 5] = 9; // only the first Y byte of each frame is read
  assert.deepEqual(lumaOfFrames(buf), [7, 200, 255]);
  const txt = 'frame:0 pts:0\nlavfi.signalstats.YMIN=3\nlavfi.signalstats.YAVG=127.5\nlavfi.signalstats.YMAX=250\nframe:1\nlavfi.signalstats.YAVG=9\n';
  assert.deepEqual(parseStats(txt), {yavg: [127.5, 9], ymin: [3], ymax: [250]});
});

t('control: with no filter every one of the 256 levels maps to itself in both readers, and the range tags read back as tv and pc', () => {
  assert.equal(ev.levels, 256);
  assert.deepEqual(ev.control, {nodeIdentity: true, statsIdentity: true});
  assert.deepEqual(ev.tags, {tv: 'tv', pc: 'pc'});
  assert.equal(ev.ramp.inIsRamp, true);
  assert.deepEqual([ev.ramp.inYmin, ev.ramp.inYmax, ev.ramp.inYavg], [0, 255, 127.5]);
});

t('known positive: lutyuv val+25 is a shift we wrote ourselves, and both readers see +25 and the clip at 230', () => {
  const p = ev.positive;
  assert.equal(p.shift100, 25); assert.equal(p.at0, 25); assert.equal(p.first255, 230); assert.equal(p.mergedHigh, 26);
  assert.equal(p.statsEqualsNode, true);
});

t('eq=brightness=0.1 is exactly the same mapping as val+25 clipped at 255, level for level, in both readers', () => {
  assert.equal(ev.positive.nodeEqualsEq, true);
  assert.equal(ev.head.agreeTv, true); assert.equal(ev.head.agreePc, true);
  assert.ok(ev.head.shift100 > 0);
  if (isV6()) {
    assert.equal(ev.head.shift100, 25); assert.equal(ev.head.at0, 25); assert.equal(ev.head.at128, 153);
    assert.equal(ev.head.first255, 230); assert.equal(ev.head.mergedHigh, 26); assert.equal(ev.head.distinct, 231); assert.equal(ev.head.min, 25);
  }
});

t('brightness is a flat shift with a clip: levels below the clip all move by the same amount, levels from the clip up all end at 255', () => {
  const m = ev.head.tv; const sh = m[0];
  for (let i = 0; i < ev.head.first255; i++) assert.equal(m[i], i + sh);
  for (let i = ev.head.first255; i < 256; i++) assert.equal(m[i], 255);
  assert.equal(ev.head.first255, 255 - sh);
  assert.equal(ev.head.mergedHigh, sh + 1); // sh + 1 input levels share the output 255
  assert.equal(ev.ramp.flatRun, ev.head.mergedHigh);
});

t('eq ignores the range tag: a limited range file and a full range file give the identical mapping', () => {
  assert.equal(ev.head.sameTvPc, true);
  assert.deepEqual(ev.head.tv, ev.head.pc); assert.deepEqual(ev.head.statsTv, ev.head.statsPc);
});

t('on limited range video legal white 235 is pushed to 255, above the legal ceiling, and legal black 16 is lifted by the same shift', () => {
  const L = ev.limited;
  assert.equal(L.whiteIn, 235); assert.ok(L.whiteOut > 235); assert.equal(L.blackOut - L.blackIn, ev.head.shift100);
  assert.ok(L.legalAbove235 > 0); assert.ok(L.legalLevelsAt255 > 1); // several legal levels collapse onto 255
  assert.ok(L.firstLegalAt255 <= 235);
  if (isV6()) { assert.equal(L.whiteOut, 255); assert.equal(L.blackOut, 41); assert.equal(L.legalAbove235, 25); assert.equal(L.legalLevelsAt255, 6); assert.equal(L.firstLegalAt255, 230); assert.equal(L.pctOfLegal, 11.4); }
});

t('the shift is not 0.1 times anything simple: it moves in steps, equal for neighbouring brightness values, and 0.01 is even darker by 1', () => {
  const sh = Object.fromEntries(ev.stair.map((s) => [s.b, s.shift100]));
  assert.ok(ev.stair.every((s) => s.agree), 'both readers agree on every level of every brightness value');
  assert.ok(ev.stair.every((s) => s.shift100 === s.stats100));
  for (let k = 1; k < ev.stair.length - 1; k++) assert.ok(ev.stair[k + 1].shift100 >= ev.stair[k].shift100 || ev.stair[k].b === 0.01, `non decreasing at ${ev.stair[k].b}`);
  assert.equal(sh[0], 0);
  assert.ok(sh[0.01] < 0, 'a small positive brightness darkens');
  assert.ok(sh[0.3] > sh[0.1] && sh[0.1] > sh[0.02]);
  if (isV6()) {
    assert.equal(sh[0.1], sh[0.11]); assert.equal(sh[0.05], sh[0.06]); assert.equal(sh[0.01], -1);
    assert.deepEqual([0.02, 0.05, 0.09, 0.1, 0.12, 0.2, 0.3].map((b) => sh[b]), [2, 12, 22, 25, 27, 50, 76]);
  }
});

t('the staircase is the same with SIMD switched off, so it belongs to the filter and not to one CPU path', () => {
  assert.ok(ev.cpu0.every((c) => c.same));
});

t('brightness does not touch chroma: every U and V byte stays 128', () => { assert.deepEqual(ev.chromaAfter, [128]); });

t('larger brightness moves the clip point down and merges more levels; brightness 1.0 turns every level white', () => {
  assert.ok(B(0.2).first255 < B(0.1).first255 && B(0.3).first255 < B(0.2).first255);
  assert.ok(B(0.3).mergedHigh > B(0.2).mergedHigh);
  assert.equal(B(1).distinct, 1); assert.equal(B(1).at0, 255);
  assert.ok(B(-0.1).shift100 < 0); assert.equal(B(-0.1).at0, 0);
});

t('contrast and gamma are range blind too: contrast 1.5 crushes legal black to 0, gamma 2.2 lifts legal black far above 16', () => {
  const c = ev.other.contrast15, g = ev.other.gamma22;
  assert.equal(c.statsAgree, true); assert.equal(g.statsAgree, true);
  assert.ok(c.at16 < 16); assert.ok(c.floorEnd > 16, 'levels up to and past 16 all end at 0');
  assert.ok(g.at16 > 16 + 20);
  assert.ok(ev.other.both.at16 === 0 && ev.other.both.first255 < ev.head.first255);
  if (isV6()) { assert.equal(c.at16, 0); assert.equal(c.floorEnd, 43); assert.equal(c.first255, 214); assert.equal(g.at16, 72); assert.equal(ev.other.both.first255, 196); }
});

t('a lutyuv that respects the legal range ends at 235, and it still has to merge the top levels', () => {
  assert.equal(ev.fix.statsAgree, true);
  assert.ok(ev.fix.max <= 235); assert.ok(ev.fix.at16 > 16);
  assert.ok(ev.fix.first235 < 235);
  if (isV6()) { assert.equal(ev.fix.at16, 38); assert.equal(ev.fix.first235, 213); }
});

t('reader agreement on a full 0..255 ramp frame: Node mean of the output row equals the signalstats YAVG, and min and max agree', () => {
  const R = ev.ramp;
  assert.ok(Math.abs(R.nodeMean - R.statsYavg) < 0.01);
  assert.equal(R.nodeMin, R.statsYmin); assert.equal(R.nodeMax, R.statsYmax);
  assert.deepEqual(R.out.slice(0, 5), ev.head.tv.slice(0, 5));
  assert.equal(R.statsYmax, 255);
  assert.ok(R.statsYavg > R.inYavg, 'the brightened ramp has the higher average');
  if (isV6()) { assert.equal(R.statsYmin, 25); assert.equal(R.statsYavg, 151.23); }
});
