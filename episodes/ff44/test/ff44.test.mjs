import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, pq, pqCode10, expected8, screenNits, buildOf, NITS, MID, HIGH, TAGS_HDR, TAGS_SDR} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir, build;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff44-')); ev = runExperiment(dir); build = buildOf(ev.ffmpeg); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
// a test that needs the optional zscale (and tonemap) filters: skips cleanly, the evidence records unsupported: true
const tz = (name, fn, needs = ['zscale']) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, (ctx) => {
  const missing = needs.filter((f) => !ev[f]);
  if (missing.length) { ctx.skip(`${missing.join(', ')} not in this ffmpeg build`); return; }
  fn();
});
const H = (k) => ev.hdr[k], S = (k) => ev.sdr[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const tagsOf = (r) => ({color_primaries: r.tags.color_primaries, color_transfer: r.tags.color_transfer, color_space: r.tags.color_space, color_range: r.tags.color_range});

t('the helpers behave: PQ of 100 nits is 0.508 (10-bit code 509), 10000 nits is signal 1.0 (code 940), expected SDR codes clip at 235, and a 235 code on a 100 nit gamma 2.4 screen emits 100 nits', () => {
  near(pq(100), 0.508, 0.001); assert.equal(pqCode10(100), 509); near(pq(10000), 1, 1e-9); assert.equal(pqCode10(10000), 940); assert.equal(pqCode10(0), 64);
  assert.deepEqual(NITS.map(expected8), [16, 48, 100, 180, 235, 235, 235, 235, 235, 235]);
  near(screenNits(235), 100, 1e-9);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded; the sources read back as 10-bit, HDR clip tagged bt2020 / smpte2084 / bt2020nc / tv, control clip tagged bt709 / bt709 / bt709 / tv', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.srcTags.hdr.pixFmt, 'yuv420p10le'); assert.equal(ev.srcTags.sdr.pixFmt, 'yuv420p10le');
  for (const [k, v] of Object.entries(TAGS_HDR)) assert.equal(ev.srcTags.hdr[k], v, k);
  for (const [k, v] of Object.entries(TAGS_SDR)) assert.equal(ev.srcTags.sdr[k], v, k);
  assert.equal(ev.pqCodes10[4], 509);
});

t('known-positive control: an ordinary SDR clip through the same naive commands (-pix_fmt yuv420p, and scale=out_color_matrix=bt709) keeps every one of the 10 patches within 1 code value of the expected SDR value, with its bt709 tags', () => {
  for (const k of ['pix', 'scale']) {
    const r = S(k);
    assert.equal(r.failed, false, k);
    assert.ok(r.sum.err.every((e) => Math.abs(e) <= 1), `${k}: ${r.sum.err}`);
    assert.deepEqual(tagsOf(r), TAGS_SDR, k);
  }
  assert.equal(S('pix').y[4], 235); near(S('pix').y[3], 180, 1);
});

t('the naive path only rescales: -pix_fmt yuv420p turns each 10-bit PQ code into its 8-bit equivalent (every patch within 1.5 of 16 + 219 * (code - 64) / 876), so 100 nit white lands at Y 127, not the 235 an SDR white has', () => {
  const r = H('pix');
  assert.equal(r.failed, false);
  NITS.forEach((n, i) => near(r.y[i], 16 + 219 * (ev.pqCodes10[i] - 64) / 876, 1.5, `${n} nits`));
  near(r.y[4], 127.3, 1.5); assert.equal(ev.expected[4], 235);
  assert.ok(ev.expected[4] - r.y[4] > 100, `gap ${ev.expected[4] - r.y[4]}`);
});

t('mid-tones are far from the expected BT.709 values: the 10, 50 and 100 nit patches are each at least 15 codes too dark and the mean error is above 50 codes; a 100 nit gamma 2.4 screen would show well under a third of the light', () => {
  const r = H('pix');
  for (const i of MID) assert.ok(r.sum.err[i] < -15, `${NITS[i]} nits: ${r.sum.err[i]}`);
  assert.ok(r.sum.maeMid > 50, `mid mae ${r.sum.maeMid}`);
  assert.ok(r.sum.maeLow > 25, `low mae ${r.sum.maeLow}`);
  assert.ok(ev.screen100.naiveNits < 30 && ev.screen100.expectedNits === 100, JSON.stringify(ev.screen100));
});

t('the tags survive the naive path: after -pix_fmt yuv420p ffprobe still says bt2020 / smpte2084 / bt2020nc / tv, so a player that reads them has what it needs', () => {
  assert.deepEqual(tagsOf(H('pix')), TAGS_HDR);
  assert.equal(H('pix').tags.pixFmt, 'yuv420p');
});

t('highlights are not clipped by the naive path (the five patches from 203 to 10000 nits stay five distinct, increasing values, 10000 nits at 235): they are just in the wrong place', () => {
  const r = H('pix');
  assert.equal(r.sum.highDistinct, 5);
  for (let i = 6; i < NITS.length; i++) assert.ok(r.y[i] > r.y[i - 1], `patch ${i}`);
  near(r.y[9], 235, 1.5);
});

t('scale=out_color_matrix=bt709 is not a fix: mid-tones are still more than 50 codes off, values stay within 4 codes of the plain -pix_fmt result, and on ffmpeg 6.x the file still says bt2020nc / smpte2084', () => {
  const r = H('scale');
  assert.equal(r.failed, false);
  assert.ok(r.sum.maeMid > 50, `mid mae ${r.sum.maeMid}`);
  r.y.forEach((v, i) => near(v, H('pix').y[i], 4, `patch ${i}`));
  if (build === 'v6') { assert.equal(r.tags.color_space, 'bt2020nc'); assert.equal(r.tags.color_transfer, 'smpte2084'); assert.equal(r.tags.color_primaries, 'bt2020'); }
});

t('the colorspace filter refuses a PQ input on its own (ffmpeg 6.x: exit non-zero, "Unsupported input transfer characteristics 16")', () => {
  const r = H('csPlain');
  if (build === 'v6') { assert.equal(r.failed, true); assert.match(r.error, /Unsupported input transfer characteristics 16/); }
  else assert.ok(r.failed === true || r.failed === false, 'recorded for this build');
});

t('forcing it with iall=bt2020 "works" and lies: the pixels are exactly the naive ones (every patch within 0.5 of the plain result, 100 nit white still at Y 127) but ffprobe now says bt709 / bt709 / bt709', () => {
  const r = H('csIall');
  if (r.failed) { assert.notEqual(build, 'v6', 'this must work on ffmpeg 6.x'); return; }
  r.y.forEach((v, i) => near(v, H('pix').y[i], 0.5, `patch ${i}`));
  near(r.y[4], 127.3, 1.5);
  assert.equal(r.tags.color_primaries, 'bt709'); assert.equal(r.tags.color_transfer, 'bt709'); assert.equal(r.tags.color_space, 'bt709');
});

tz('a reader that trusts the surviving tags recovers the picture: zscale on the naive output brings the 0 to 100 nit patches within 1.5 of the expected values, but the relabelled file stays grey (mid-tone error above 50)', () => {
  const a = ev.recover, b = ev.recoverRelabel;
  assert.equal(a.failed, false);
  assert.ok(a.sum.maxLowErr <= 1.5, `recovered max error ${a.sum.maxLowErr}`);
  if (!b.failed && b.y) assert.ok(b.sum.maeMid > 50, `relabelled mid mae ${b.sum.maeMid}`);
});

tz('zscale with explicit targets reads the tags and converts the 0 to 100 nit patches exactly (within 1 of expected, bt709 tags) but clips everything above: the five patches from 203 to 10000 nits all land on one value', () => {
  const r = H('zsPlain');
  assert.equal(r.failed, false);
  assert.ok(r.sum.maxLowErr <= 1, `low err ${r.sum.maxLowErr}`);
  assert.deepEqual(tagsOf(r), TAGS_SDR);
  assert.equal(r.sum.highDistinct, 1, JSON.stringify(r.y));
  assert.ok(r.sum.highMax >= 235, `high ${r.sum.highMax}`);
  // the control clip is left alone by the same command
  assert.ok(S('zsPlain').sum.err.every((e) => Math.abs(e) <= 1), String(S('zsPlain').sum.err));
});

tz('zscale plus tonemap=hable keeps highlights apart: the five patches from 203 to 10000 nits are five distinct increasing values, 203 nit white lands between 170 and 195, 1000 nits and above at 225 or more, bt709 tags', () => {
  const r = H('zsHable');
  assert.equal(r.failed, false);
  assert.equal(r.sum.highDistinct, 5, JSON.stringify(r.y));
  for (let i = 6; i < NITS.length; i++) assert.ok(r.y[i] > r.y[i - 1], `patch ${i}`);
  assert.ok(r.y[5] >= 170 && r.y[5] <= 195, `203 nits at ${r.y[5]}`);
  assert.ok(r.y[7] >= 225 && r.y[8] >= 225 && r.y[9] >= 225, JSON.stringify(r.y));
  assert.deepEqual(tagsOf(r), TAGS_SDR);
}, ['zscale', 'tonemap']);

t('unsupported filters are recorded, not faked: when zscale or tonemap is missing the evidence says unsupported: true for those cases', () => {
  assert.equal(H('zsPlain').unsupported, !ev.zscale);
  assert.equal(H('zsHable').unsupported, !(ev.zscale && ev.tonemap));
  assert.equal(S('zsPlain').unsupported, !ev.zscale);
});

t('reader agreement: for every converted file, Node\'s mean of the raw decoded luma and ffmpeg signalstats YAVG agree on every patch within 1 code, and every grey patch has neutral chroma (within 1 of 128)', () => {
  let n = 0;
  for (const kind of ['hdr', 'sdr']) for (const [k, r] of Object.entries(ev[kind])) {
    if (!r.y) continue;
    n++;
    assert.ok(r.readerGap <= 1, `${kind}.${k} gap ${r.readerGap}`);
    assert.ok(r.cbMaxDev <= 1, `${kind}.${k} chroma ${r.cbMaxDev}`);
    assert.equal(r.node.frames, 10, `${kind}.${k} frames`);
  }
  assert.ok(n >= 5, `${n} measured files`);
});
