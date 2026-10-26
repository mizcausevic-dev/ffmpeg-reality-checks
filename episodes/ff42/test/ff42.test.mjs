import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, rowDiff, rowEnergy, combRatio, psnr, buildOf, W, H, FRAMES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff42-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const G = (k, region) => R(k).regions[region];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const same = (a, b) => assert.deepEqual(a, b);

t('the metric helpers behave: alternating rows have adjacent-row difference 180 and two-apart difference 0, flat rows have none, identical frames are 99 dB', () => {
  const stripes = Buffer.alloc(W * H); for (let y = 0; y < H; y++) stripes.fill(y % 2 ? 220 : 40, y * W, (y + 1) * W);
  near(rowEnergy(stripes, 'whole'), 180, 0.01); near(rowDiff(stripes, 'whole', 2), 0, 0.001);
  assert.ok(combRatio(stripes, 'whole') > 1000, 'one-pixel rows are all comb to this metric');
  const flat = Buffer.alloc(W * H, 100); near(rowEnergy(flat, 'whole'), 0, 0.001);
  assert.equal(psnr(flat, flat, 'whole'), 99);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and every clip has the frame count the fixture promises', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  for (const k of ['fineNone', 'plainNone', 'interNone', 'mislabelNone']) { assert.equal(R(k).frames, FRAMES, k); assert.equal(R(k).framesMd5, FRAMES, k); }
});

t('flags: the fine clip is stored progressive; the woven clip and the encoder-flagged copy claim to be interlaced, and the flagged copy has exactly the same pixels as fine', () => {
  assert.equal(ev.flags.fine.fieldOrder, 'progressive'); assert.equal(ev.flags.plain.fieldOrder, 'progressive');
  for (const k of ['inter', 'mislabel']) { assert.ok(ev.flags[k].fieldOrder && ev.flags[k].fieldOrder !== 'progressive' && ev.flags[k].fieldOrder !== 'unknown', `${k} field_order ${ev.flags[k].fieldOrder}`); }
  // the per-frame flag, when ffprobe reports it, agrees with the stream-level field order
  if (ev.flags.fine.frameFlag) assert.ok(ev.flags.fine.frameFlag.every((v) => v === 0));
  if (ev.flags.mislabel.frameFlag) assert.ok(ev.flags.mislabel.frameFlag.every((v) => v === 1));
  assert.equal(ev.mislabelSamePixels, true);
});

t('known-positive control: the woven clip combs (node adjacent/two-apart ratio above 3, idet calls it interlaced), the smooth progressive clip does not (ratio below 1, idet calls it progressive)', () => {
  assert.ok(G('interNone', 'box').comb > 3, `inter comb ${G('interNone', 'box').comb}`);
  assert.ok(G('plainNone', 'box').comb < 1, `plain comb ${G('plainNone', 'box').comb}`);
  const i = R('interNone').idet.multi, p = R('plainNone').idet.multi;
  assert.ok(i.interlaced >= 45 && i.progressive <= 5, JSON.stringify(i));
  assert.ok(p.progressive >= 45 && p.interlaced === 0, JSON.stringify(p));
});

t('known-positive control, fixed: yadif removes the combing from the woven clip (ratio under 1, idet progressive in at least 45 of 50, interlaced 0), and it changes all 50 frames', () => {
  assert.ok(G('interYadif', 'box').comb < 1, `after ${G('interYadif', 'box').comb}`);
  assert.ok(G('interYadif', 'box').comb < G('interNone', 'box').comb / 3);
  const a = R('interYadif').idet.multi;
  assert.ok(a.progressive >= 45 && a.interlaced === 0, JSON.stringify(a));
  assert.equal(R('interYadif').changedLuma, FRAMES); assert.equal(R('interYadif').changedMd5, FRAMES);
  assert.equal(R('interYadif').frames, FRAMES);
});

t('yadif with no options on the progressive fine clip changes every frame: 50 of 50 by raw luma and 50 of 50 by frame md5; frame count and timestamps stay the same', () => {
  const r = R('fineYadif');
  assert.equal(r.changedLuma, FRAMES); assert.equal(r.changedMd5, FRAMES);
  assert.equal(r.frames, FRAMES); assert.equal(r.framesMd5, FRAMES);
  near(r.pts.step, R('fineNone').pts.step, 0.0005); near(r.pts.first, 0, 0.0005); near(r.pts.last, R('fineNone').pts.last, 0.0005);
  assert.ok(r.diffPx > 5000, `mean changed pixels per frame ${r.diffPx}`);
});

t('one-pixel row detail is destroyed: in the stripe patch adjacent-row difference falls from 180 to under 10 and PSNR against the source is under 15 dB; the moving striped box loses its detail too', () => {
  near(G('fineNone', 'stripes').rowEnergy, 180, 0.5);
  assert.ok(G('fineYadif', 'stripes').rowEnergy < 10, `${G('fineYadif', 'stripes').rowEnergy}`);
  assert.ok(G('fineYadif', 'stripes').psnrMin < 15, `${G('fineYadif', 'stripes').psnrMin}`);
  assert.ok(G('fineNone', 'move').rowEnergy > 30);
  assert.ok(G('fineYadif', 'move').rowEnergy < 5, `${G('fineYadif', 'move').rowEnergy}`);
  assert.ok(G('fineYadif', 'move').psnrMin < 20);
  assert.ok(G('fineYadif', 'whole').psnrMin < 20, 'whole frame');
});

t('the damage is not everywhere: static isolated one-pixel lines come through yadif unchanged (identical pixels, PSNR 99)', () => {
  assert.equal(G('fineYadif', 'lines').psnrMin, 99);
  near(G('fineYadif', 'lines').rowEnergy, G('fineNone', 'lines').rowEnergy, 0.2);
});

t('why: to a field-mismatch metric one-pixel rows look like combing (adjacent difference 180, two-apart difference 0), and idet cannot call the fine clip progressive (smooth clip: it can)', () => {
  assert.ok(G('fineNone', 'stripes').comb > 1000);
  assert.ok(R('fineNone').idet.multi.progressive <= 5, JSON.stringify(R('fineNone').idet.multi));
  assert.equal(R('fineNone').idet.multi.interlaced, 0);
  assert.ok(R('plainNone').idet.multi.progressive >= 45);
});

t('on smooth progressive footage yadif still rewrites every frame (50 of 50 md5s differ) but only a handful of pixels: under 200 per frame, whole-frame PSNR above 40 dB', () => {
  const r = R('plainYadif');
  assert.equal(r.changedMd5, FRAMES); assert.equal(r.changedLuma, FRAMES);
  assert.ok(r.diffPx > 0 && r.diffPx < 200, `changed pixels ${r.diffPx}`);
  assert.ok(G('plainYadif', 'whole').psnrMin > 40, `${G('plainYadif', 'whole').psnrMin}`);
  assert.equal(R('plainYadif').frames, FRAMES);
});

t('deint=interlaced on a file flagged progressive leaves it byte-identical: 0 of 50 frames change (luma and md5), same frame count, same timestamps, on the fine clip and the smooth clip', () => {
  for (const k of ['fineIlOnly', 'plainIlOnly']) {
    const r = R(k);
    assert.equal(r.changedLuma, 0, k); assert.equal(r.changedMd5, 0, k);
    assert.equal(r.frames, FRAMES); same(r.md5s, R(k.replace('IlOnly', 'None')).md5s);
    near(r.pts.step, R(k.replace('IlOnly', 'None')).pts.step, 0.0005);
  }
  near(G('fineIlOnly', 'stripes').rowEnergy, 180, 0.5);
});

t('mode=1 (send_field) doubles the frame rate: 100 frames from 50 by raw count and by framemd5, timestamps every 0.02 s instead of 0.04, on progressive and interlaced input; the doubled output is still wiped of fine detail', () => {
  for (const k of ['fineField', 'interField']) {
    const r = R(k);
    assert.equal(r.frames, 2 * FRAMES, k); assert.equal(r.framesMd5, 2 * FRAMES, k);
    near(r.pts.step, 0.02, 0.0005, k); near(r.pts.first, 0, 0.0005, k);
  }
  assert.ok(G('fineField', 'stripes').rowEnergy < 10);
  assert.ok(G('interField', 'box').comb < 1);
});

t('the flag decides, not the picture: forcing the interlaced flag with setfield=tff makes deint=interlaced process the progressive clip exactly like the default (50 of 50, same frame md5s)', () => {
  const r = R('fineSetfield');
  assert.equal(r.changedMd5, FRAMES); assert.equal(r.changedLuma, FRAMES);
  same(r.md5s, R('fineYadif').md5s);
});

t('the flag decides, not the picture: a progressive clip that was encoded with ilme+ildct (file says interlaced) is processed by deint=interlaced, 50 of 50 frames, while the same pixels with an honest flag change 0 of 50', () => {
  assert.equal(R('mislabelIlOnly').changedMd5, FRAMES); assert.equal(R('mislabelIlOnly').changedLuma, FRAMES);
  assert.equal(R('fineIlOnly').changedMd5, 0);
  assert.equal(R('mislabelNone').changedMd5, 0);
  same(R('mislabelNone').md5s, R('fineNone').md5s);
  assert.ok(G('mislabelIlOnly', 'stripes').rowEnergy < 10 && G('mislabelIlOnly', 'stripes').psnrMin < 15);
});

t('deint=interlaced on truly interlaced input does the same work as the default: 50 of 50 changed, identical frame md5s, combing gone', () => {
  assert.equal(R('interIlOnly').changedMd5, FRAMES);
  same(R('interIlOnly').md5s, R('interYadif').md5s);
  assert.ok(G('interIlOnly', 'box').comb < 1);
});

t('reader agreement: raw luma and framemd5 give the same changed-frame count and the same frame count in every case; idet and the node comb metric agree on which clips comb', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    assert.equal(r.frames, r.framesMd5, k);
    if (r.changedLuma !== null) assert.equal(r.changedLuma, r.changedMd5, k);
  }
  // idet says interlaced exactly where the node metric says comb (ratio above 3)
  for (const [k, r] of Object.entries(ev.runs)) {
    const combs = G(k, 'box').comb > 3 && r.src === 'inter', idetSays = r.idet.multi.interlaced >= 45;
    if (r.src === 'inter' || r.src === 'plain') assert.equal(combs, idetSays, `${k}: node ${G(k, 'box').comb}, idet ${JSON.stringify(r.idet.multi)}`);
  }
});
